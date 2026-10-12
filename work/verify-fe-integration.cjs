// Executes the actual TypeScript API clients against local Java. Synthetic data only.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),ts=require('typescript');
const {execFileSync}=require('child_process');
const {randomUUID}=require('crypto');
process.env.EXPO_PUBLIC_API_BASE_URL='http://localhost:8080';
const values=new Map();
const webStorage=()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)});
global.localStorage=webStorage();
const temporary=new Map();global.sessionStorage={getItem:k=>temporary.get(k)??null,setItem:(k,v)=>temporary.set(k,v),removeItem:k=>temporary.delete(k)};
const mocks={'react-native':{Platform:{OS:'web'}},'expo-secure-store':{}};
const cache=new Map();
function load(name,parent=path.resolve('src')) {
  if(mocks[name])return mocks[name];
  const file=name.startsWith('@/')?path.resolve('src',name.slice(2)+'.ts'):path.resolve(parent,name+'.ts');
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',js)(dep=>load(dep,path.dirname(file)),module,module.exports);return module.exports;
}
const {authApi}=load('@/api/auth'),{authStorage}=load('@/utils/authStorage'),{ingredientsApi}=load('@/api/ingredients'),{recipesApi}=load('@/api/recipes'),{pantryApi}=load('@/api/pantry'),{todayMenuApi}=load('@/api/todayMenu'),{profileApi}=load('@/api/profile'),{pantryImportApi}=load('@/api/pantryImport'),{recommendationsApi}=load('@/api/recommendations'),{usersApi}=load('@/api/users');
const run=Date.now(),report={run,startedAt:new Date().toISOString(),checks:[]},accounts=[];
function sql(input){return execFileSync('docker',['exec','-i','zpantry-java-backend-database-1','psql','-U','zpantry_dev','-d','zpantry_dev','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8'});}
async function check(label,fn){try{const result=await fn();report.checks.push({label,pass:true});console.log('PASS '+label);return result;}catch(e){report.checks.push({label,pass:false,status:e.status,message:e.message});console.log('FAIL '+label+': '+e.message);}finally{fs.writeFileSync('work/fe-integration-results.json',JSON.stringify(report,null,2));}}
async function account(kind){
  const email=`fe-update-${run}-${kind}@example.invalid`,password='Synthetic-FE-Test!2026';
  await authApi.register({fullName:'FE Integration '+kind,email,password});
  const log=fs.readFileSync('work/backend-fe-update.log','utf8'),otp=log.slice(log.lastIndexOf(email)).match(/your otp demo:\s*(\d{6})/)?.[1];assert.ok(otp);
  await authApi.verifyOtp({email,otpCode:otp});let session=await authApi.login({email,password});
  const uid=JSON.parse(Buffer.from(session.accessToken.split('.')[1],'base64url')).userId;
  const a={email,password,uid};accounts.push(a);
  if(kind==='manager'){sql(`UPDATE users SET role='MANAGER' WHERE id='${uid}' AND email='${email}';`);session=await authApi.login({email,password});}
  await authStorage.saveSession(session,true);return a;
}
(async()=>{
 let ingredient,recipe,pantry,menu,manager,user;
 try{
  manager=await check('Register / OTP / manager test fixture',()=>account('manager'));if(!manager)throw Error('Cannot create test fixture');
  ingredient=await check('Manager creates ingredient through FE JSON adapter',()=>ingredientsApi.create({name:`FE carrot ${run}`,category:'Vegetable',unit:'g',caloriesPerUnit:0.4,proteinPerUnit:0.01,fatPerUnit:0,carbPerUnit:0.1,imageUrl:'',allergens:[]}));
  if(!ingredient)throw Error('Ingredient prerequisite failed');
  await check('Ingredient update and allergen persistence',async()=>{const x=await ingredientsApi.update(ingredient.id,{...ingredient,proteinPerUnit:0.02,allergens:['EGG']});assert.equal(x.proteinPerUnit,0.02);assert.deepEqual(x.allergens,['EGG']);await ingredientsApi.update(ingredient.id,{...ingredient,allergens:[]});});
  recipe=await check('Manager creates recipe with ingredients',()=>recipesApi.create({name:`FE soup ${run}`,description:'Synthetic fixture',cookingTimeMinutes:10,difficulty:'Easy',servingSize:1,instructionText:'1. Wash\n2. Cook',imageUrl:'',sourceType:'Manual',allergens:[],ingredients:[{ingredientId:ingredient.id,quantity:10,unit:'g',isRequired:true,note:''}]}));
  await check('Manager can load catalogs without users API',async()=>{assert.ok((await ingredientsApi.all()).some(x=>x.id===ingredient.id));assert.ok((await recipesApi.all()).some(x=>x.id===recipe.id));await assert.rejects(usersApi.list(),e=>e.status===403);});
  user=await check('Register / OTP / user session',()=>account('user'));if(!user)throw Error('User prerequisite failed');
  await check('User catalog writes denied',()=>assert.rejects(recipesApi.update(recipe.id,{...recipe,allergens:[]}),e=>e.status===403));
  await check('Save and reload nutrition profile',async()=>{await profileApi.save(user.uid,{age:28,gender:'Male',height:170,weight:65,goal:'HEALTHY_EATING',dietPreference:'NONE',allergies:[]});assert.equal((await profileApi.get(user.uid)).age,28);});
  pantry=await check('Add pantry item',()=>pantryApi.saveItem({ingredientId:ingredient.id,quantity:100,unit:'g',expiredAt:'2026-10-30',storageLocation:'Fridge',note:'Synthetic fixture'}));
  await check('Clear expiry through FE and read persisted result',async()=>{await pantryApi.updateItem(pantry.id,{...pantry,expiredAt:null});assert.equal((await pantryApi.all()).find(x=>x.id===pantry.id).expiredAt,'');});
  await check('Import confirmation and readback',async()=>{await pantryImportApi.confirm([{ingredientId:ingredient.id,quantity:120,unit:'g'}]);assert.equal((await pantryApi.all()).find(x=>x.id===pantry.id).quantity,120);});
  await check('Automatic refresh after rejected access token',async()=>{await authStorage.updateTokens({accessToken:'intentionally-invalid-test-token'});assert.ok((await pantryApi.all()).length);assert.notEqual(await authStorage.getAccessToken(),'intentionally-invalid-test-token');});
  await check('Save own account name',async()=>{const x=await usersApi.update(user.uid,{fullName:'FE User Updated'});await authStorage.updateUser({fullName:x.fullName});assert.equal((await authStorage.getUser()).fullName,'FE User Updated');});
  await check('Personalized recommendations via actual FE normalizer',async()=>{const x=await recommendationsApi.personalized(5);assert.ok(x.recommendations.length);});
  menu=await check('Add menu on selected date',()=>todayMenuApi.add({recipeId:recipe.id,mealName:recipe.name,mealType:'Lunch',servingSize:1,plannedDate:'2026-10-01',note:'Synthetic fixture'}));
  await check('Menu detail contains recipe instructions and pantry',async()=>{const x=await todayMenuApi.get(menu.id);assert.ok(x.recipe.instructionText.includes('Cook'));assert.equal(x.requiredIngredients.length,1);assert.equal(x.pantryItems.length,1);});
  await check('Selected-date menu and history listing',async()=>{assert.ok((await todayMenuApi.all('2026-10-01')).some(x=>x.id===menu.id));assert.ok(Array.isArray((await todayMenuApi.cookingLogs()).data));});
  const image=new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9AAAAABJRU5ErkJggg==','base64')],'test.png',{type:'image/png'});
  await check('Complete meal with uploaded image',()=>todayMenuApi.complete(menu.id,{imageFile:image,cookedAt:new Date().toISOString(),rating:5,note:'test'}));
  await check('Food image analysis',()=>pantryImportApi.analyze('FOOD_IMAGE',image));
  await check('Receipt image analysis',()=>pantryImportApi.analyze('RECEIPT',image));
  await check('Delete planned menu',()=>todayMenuApi.remove(menu.id));
  await check('Delete pantry item',()=>pantryApi.removeItem(pantry.id));
  const oldToken=await authStorage.getAccessToken();await load('@/utils/authSession').logoutStoredSession();
  await check('Logout clears storage and revokes token',async()=>{assert.equal(await authStorage.getSession(),null);const r=await fetch('http://localhost:8080/api/me/pantry',{headers:{Authorization:`Bearer ${oldToken}`}});assert.equal(r.status,401);});
 }finally{
  if(manager){await authStorage.saveSession(await authApi.login(manager),false);if(recipe)await check('Cleanup recipe',()=>recipesApi.remove(recipe.id));if(ingredient)await check('Cleanup ingredient',()=>ingredientsApi.remove(ingredient.id));await load('@/utils/authSession').logoutStoredSession();}
  for(const a of accounts)sql(`UPDATE users SET is_active=false,is_deleted=true,deleted_at=now(),refresh_token_hash=null WHERE id='${a.uid}' AND email='${a.email}';`);
  report.finishedAt=new Date().toISOString();fs.writeFileSync('work/fe-integration-results.json',JSON.stringify(report,null,2));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
