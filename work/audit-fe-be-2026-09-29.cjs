// Local-only API audit. Uses synthetic accounts; never uses the user's credentials.
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const base = 'http://localhost:8080';
const run = Date.now();
const report = { startedAt: new Date().toISOString(), base, run, checks: [], fixtures: {} };
const ok = r => r.status >= 200 && r.status < 300 && r.body?.success !== false;
const rejected = r => (r.status >= 400 && r.status < 500) || r.body?.success === false;
const denied = r => [401,403].includes(r.status);
function sanitize(v) {
  if (Array.isArray(v)) return v.map(sanitize);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k,x]) => [k, /token|password|otpCode/i.test(k) ? '[REDACTED]' : sanitize(x)]));
  return v;
}
function save() { fs.writeFileSync('work/audit-fe-be-2026-09-29.json', JSON.stringify(report,null,2)); }
async function call(label, method, route, body, token, expect = ok, detail = false) {
  const started = Date.now();
  let r;
  try {
    const form = body instanceof FormData;
    const response = await fetch(base + route, { method, signal: AbortSignal.timeout(25000), headers: { ...(form ? {} : {'Content-Type':'application/json'}), ...(token ? {Authorization:`Bearer ${token}`} : {}) }, ...(body === undefined ? {} : {body:form ? body : JSON.stringify(body)}) });
    const raw = await response.text(); let parsed; try { parsed = JSON.parse(raw); } catch { parsed = raw; }
    r = { status:response.status, body:parsed };
  } catch(e) { r = {status:0,body:{message:e.message}}; }
  const row = {label,method,route,status:r.status,pass:expect(r),ms:Date.now()-started,message:r.body?.message || r.body?.error || '',...(detail ? {response:sanitize(r.body)} : {})};
  report.checks.push(row); console.log(`${row.pass?'PASS':'FAIL'} ${label}: HTTP ${r.status} ${row.message}`); save(); return r;
}
async function account(suffix) {
  const email = `audit-${run}-${suffix}@example.invalid`, password = randomUUID()+'!';
  await call(`register ${suffix}`,'POST','/api/Auth/register',{email,password,fullName:`Audit ${run} ${suffix}`});
  const log = fs.readFileSync('work/backend-account.log','utf8');
  const otp = log.slice(log.lastIndexOf(email)).match(/your otp demo:\s*(\d{6})/)?.[1];
  if (!otp) throw new Error('No dev OTP found for synthetic account');
  await call(`wrong OTP ${suffix}`,'POST','/api/Auth/verify-otp',{email,otpCode:'000000'},undefined,rejected);
  await call(`verify OTP ${suffix}`,'POST','/api/Auth/verify-otp',{email,otpCode:otp});
  const login = await call(`login ${suffix}`,'POST','/api/Auth/login',{email,password});
  if(!ok(login)) throw new Error('Synthetic login failed');
  const token = login.body.data.accessToken;
  const uid = JSON.parse(Buffer.from(token.split('.')[1],'base64url')).userId;
  report.fixtures[suffix] = {email,uid}; save();
  return {email,password,token,uid,refresh:login.body.data.refreshToken};
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9AAAAABJRU5ErkJggg==','base64');
function imageForm(field) { const f = new FormData(); f.append(field,new Blob([png],{type:'image/png'}),'audit.png'); return f; }
(async()=>{
  let a,b,recipe,menu,pantry;
  try {
    await call('pantry requires auth','GET','/api/me/pantry',undefined,undefined,denied);
    a = await account('a'); b = await account('b');
    await call('duplicate registration client error','POST','/api/Auth/register',{email:a.email,password:a.password,fullName:'Duplicate'},undefined,r=>r.status>=400&&r.status<500,true);
    await call('wrong password rejected','POST','/api/Auth/login',{email:a.email,password:'wrong-password'},undefined,denied);
    await call('profile default','GET',`/api/users/${a.uid}/profile`,undefined,a.token,ok,true);
    const profile = {age:28,gender:'Male',height:170,weight:65,goal:'HEALTHY_EATING',dietPreference:'NONE',allergies:['PEANUT']};
    await call('profile save','PUT',`/api/users/${a.uid}/profile`,profile,a.token,ok,true);
    await call('profile readback','GET',`/api/users/${a.uid}/profile`,undefined,a.token,r=>ok(r)&&r.body.data.allergies.includes('PEANUT'),true);
    await call('profile cross-user read denied','GET',`/api/users/${a.uid}/profile`,undefined,b.token,denied);
    await call('profile cross-user write denied','PUT',`/api/users/${a.uid}/profile`,profile,b.token,denied);
    await call('owner account update','PUT',`/api/users/${a.uid}`,{fullName:`Audit ${run} updated`},a.token);
    await call('other account update denied','PUT',`/api/users/${a.uid}`,{fullName:'Unauthorized'},b.token,denied);
    await call('user list requires admin','GET','/api/users',undefined,a.token,denied);
    await call('role change requires admin','PATCH',`/api/admin/users/${a.uid}/role`,{role:'user'},a.token,denied);
    const list = await call('ingredient catalog','GET','/api/ingredients?pageIndex=1&pageSize=100',undefined,a.token);
    let ingredient = list.body?.data?.[0];
    await call('ingredient search','GET','/api/ingredients?search='+encodeURIComponent(ingredient?.name || 'rice'),undefined,a.token);
    const ci = await call('ingredient create','POST','/api/ingredients',{name:`Audit ingredient ${run}`,category:'Vegetable',unit:'g',caloriesPerUnit:1,protenPerUnit:1,fatPerUnit:0,carbPerUnit:1,imageUrl:'',allergens:[]},a.token,ok,true);
    if (ci.body?.data?.id) { report.fixtures.ingredient = ci.body.data.id; await call('ingredient cleanup','DELETE',`/api/ingredients/${ci.body.data.id}`,undefined,a.token); }
    if (!ingredient) {
      const id=randomUUID();
      execFileSync('docker',['exec','-i','zpantry-java-backend-database-1','psql','-U','zpantry_dev','-d','zpantry_dev','-v','ON_ERROR_STOP=1'],{input:`INSERT INTO ingredients (id,created_at,name,normalized_name,category,unit,calories_per_unit,protein_per_unit,fat_per_unit,carb_per_unit,allergens) VALUES ('${id}',now(),'Audit fixture ${run}','audit fixture ${run}','Vegetable','g',1,1,0,1,'');`,encoding:'utf8'});
      ingredient={id,name:`Audit fixture ${run}`,unit:'g'};
      report.fixtures.databaseIngredient=id;
      report.fixtureNote='Ingredient catalog was empty and create API failed. One synthetic ingredient was inserted into local dev DB ONLY to isolate downstream pantry tests. This is NOT a passing ingredient-create test.';
      await call('anonymous ingredient update must be denied','PUT',`/api/ingredients/${id}`,{name:ingredient.name,proteinPerUnit:2,allergens:['EGG']},undefined,denied);
      await call('ingredient update and clear allergens','PUT',`/api/ingredients/${id}`,{name:ingredient.name,proteinPerUnit:1,allergens:[]},a.token,r=>ok(r)&&r.body.data.allergens.length===0);
    }
    await call('recipe catalog','GET','/api/recipes?pageIndex=1&pageSize=10',undefined,a.token);
    const recipeBody = {name:`Audit recipe ${run}`,description:'Synthetic audit fixture',cookingTimeMinutes:10,difficulty:'Easy',servingSize:1,instructionText:'1. Cook',imageUrl:'',sourceType:'Manual',allergens:['EGG'],ingredients:ingredient?[{ingredientId:ingredient.id,quantity:10,unit:ingredient.unit||'g',isRequired:true,note:''}]:[]};
    const cr = await call('anonymous recipe create must be denied','POST','/api/recipes',recipeBody,undefined,denied,true);
    recipe = cr.body?.data?.id;
    if (!recipe) recipe = (await call('recipe create authenticated','POST','/api/recipes',recipeBody,a.token)).body?.data?.id;
    if (recipe) {
      report.fixtures.recipe = recipe;
      await call('recipe detail','GET',`/api/recipes/${recipe}`,undefined,a.token,ok,true);
      await call('anonymous recipe update must be denied','PUT',`/api/recipes/${recipe}`,{...recipeBody,description:'Unauthorized fixture edit'},undefined,denied);
      await call('recipe allergens clear','PUT',`/api/recipes/${recipe}`,{...recipeBody,allergens:[]},a.token,r=>ok(r)&&r.body.data.allergens.length===0);
    }
    if (ingredient) {
      const p = {ingredientId:ingredient.id,quantity:100,unit:ingredient.unit||'g',expiredAt:'2026-10-30T00:00:00Z',storageLocation:'Fridge',note:'Audit fixture'};
      pantry = (await call('pantry create','POST','/api/me/pantry/items',p,a.token,ok,true)).body?.data?.id;
      if(pantry){
        await call('pantry update','PUT',`/api/me/pantry/items/${pantry}`,{...p,quantity:150},a.token,r=>ok(r)&&r.body.data.quantity===150);
        await call('pantry clear expiry','PUT',`/api/me/pantry/items/${pantry}`,{...p,quantity:150,expiredAt:null},a.token,r=>ok(r)&&r.body.data.expiredAt===null,true);
        await call('pantry negative quantity rejected','PUT',`/api/me/pantry/items/${pantry}`,{...p,quantity:-1},a.token,rejected,true);
        await call('pantry restore fixture','PUT',`/api/me/pantry/items/${pantry}`,p,a.token);
        await call('pantry other user write rejected','PUT',`/api/me/pantry/items/${pantry}`,p,b.token,rejected);
      }
      await call('pantry import confirm','POST','/api/me/pantry-import/confirm',{items:[{ingredientId:ingredient.id,quantity:120,unit:p.unit}]},a.token);
      await call('pantry import readback','GET','/api/me/pantry',undefined,a.token,r=>ok(r)&&r.body.data.some(i=>i.ingredientId===ingredient.id&&i.quantity===120),true);
      await call('pantry import invalid quantity','POST','/api/me/pantry-import/confirm',{items:[{ingredientId:ingredient.id,quantity:-1,unit:p.unit}]},a.token,rejected);
    }
    await call('recommendations V2','POST','/api/recommendations/v2/meals',{topK:5},a.token,ok,true);
    await call('recommendations V1','POST','/api/recommendations/meals',{inputIngredientText:ingredient?.name||'rice',topK:3},a.token,ok,true);
    await call('natural language pantry','POST','/api/me/pantry/parse',{text:'2 carrots'},a.token,ok,true);
    const date = new Date().toISOString().slice(0,10);
    const cm = await call('today menu create','POST','/api/me/today-menu/items',{recipeId:recipe,mealName:`Audit meal ${run}`,mealType:'Lunch',servingSize:2,plannedDate:date,note:'Audit fixture'},a.token,ok,true);
    menu = cm.body?.data?.id;
    await call('today menu list','GET',`/api/me/today-menu?date=${date}`,undefined,a.token);
    if(menu){
      report.fixtures.menu=menu;
      await call('today menu detail includes cooking data','GET',`/api/me/today-menu/items/${menu}`,undefined,a.token,r=>ok(r)&&!!r.body.data.recipe&&Array.isArray(r.body.data.requiredIngredients)&&Array.isArray(r.body.data.pantryItems),true);
      await call('today menu other user rejected','GET',`/api/me/today-menu/items/${menu}`,undefined,b.token,rejected);
      const form=imageForm('imageFile');form.append('cookedAt',new Date().toISOString());form.append('rating','5');
      await call('complete meal with image','POST',`/api/me/today-menu/items/${menu}/complete`,form,a.token,ok,true);
    }
    await call('cooking logs','GET','/api/me/cooking-logs',undefined,a.token,ok,true);
    await call('media upload','POST','/api/media/upload',imageForm('file'),a.token,ok,true);
    await call('food image analysis','POST','/api/me/pantry-import/food-image/analyze',imageForm('image'),a.token,ok,true);
    await call('receipt analysis','POST','/api/me/pantry-import/receipt/analyze',imageForm('image'),a.token,ok,true);
    if(menu) await call('today menu cleanup','DELETE',`/api/me/today-menu/items/${menu}`,undefined,a.token);
    if(pantry) await call('pantry cleanup','DELETE',`/api/me/pantry/items/${pantry}`,undefined,a.token);
    if(recipe) await call('anonymous recipe delete must be denied','DELETE',`/api/recipes/${recipe}`,undefined,undefined,denied);
    if(recipe) await call('recipe absent after cleanup','GET',`/api/recipes/${recipe}`,undefined,a.token,rejected);
    if(report.fixtures.databaseIngredient) await call('anonymous ingredient delete must be denied','DELETE',`/api/ingredients/${report.fixtures.databaseIngredient}`,undefined,undefined,denied);
    const refreshed=await call('refresh session','POST','/api/Auth/refresh-token',{refreshToken:a.refresh});
    if(ok(refreshed)) {
      await call('old refresh rejected','POST','/api/Auth/refresh-token',{refreshToken:a.refresh},undefined,denied);
      a.token=refreshed.body.data.accessToken;
    }
    await call('logout','POST','/api/Auth/logout',undefined,a.token);
    await call('logged out access rejected','GET','/api/me/pantry',undefined,a.token,denied);
    if(b) await call('logout second fixture','POST','/api/Auth/logout',undefined,b.token);
  } finally {
    // Deactivate only the synthetic accounts created by this run; preserve audit rows.
    for(const acc of [a,b].filter(Boolean)) {
      execFileSync('docker',['exec','-i','zpantry-java-backend-database-1','psql','-U','zpantry_dev','-d','zpantry_dev','-v','ON_ERROR_STOP=1'],{input:`UPDATE users SET is_active=false, is_deleted=true, deleted_at=now(), refresh_token_hash=null WHERE id='${acc.uid}' AND email='${acc.email}';`,encoding:'utf8'});
    }
    report.finishedAt=new Date().toISOString();save();
  }
})().catch(e=>{report.fatal=e.message;save();console.error(e.message);process.exitCode=1;});
