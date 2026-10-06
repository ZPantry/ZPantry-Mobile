const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

// Transpile the actual app modules without booting React Native. Responses below
// are synthetic contract cases, not captured backend parity fixtures.
function loader(mocks = {}) {
  const cache = new Map();
  function load(name, parent = path.resolve('src')) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    const tsFile = name.startsWith('@/') ? path.resolve('src', name.slice(2) + '.ts') : path.resolve(parent, name + '.ts');
    const file = fs.existsSync(tsFile) ? tsFile : tsFile.replace(/\.ts$/, '.tsx');
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
    });
    new Function('require', 'module', 'exports', outputText)((dependency) => load(dependency, path.dirname(file)), module, module.exports);
    return module.exports;
  }
  return load;
}

const load = loader();
const { unwrapEnvelope, getMessage, ApiError } = load('@/api/response');
const { resolveApiBaseUrl } = load('@/api/baseUrl');
const { canUpdateUser, buildUserUpdate } = load('@/utils/userProfile');
const id = '55f2f378-692a-4268-924e-e8c648190e32';

test('password recovery sends the deployed schema and rejects invalid reset before writing', async () => {
  const calls = [];
  const { authApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return { message: 'OK' }; } } })('@/api/auth');
  await authApi.forgotPassword(' fixture@example.invalid ');
  const reset = { email: 'fixture@example.invalid', otpCode: '123456', newPassword: 'new-password', confirmPassword: 'new-password' };
  await authApi.resetPassword(reset);
  assert.deepEqual(calls.map(([route]) => route), ['/api/Auth/forgot-password', '/api/Auth/reset-password']);
  assert.deepEqual(JSON.parse(calls[0][1].body), { email: reset.email });
  assert.deepEqual(JSON.parse(calls[1][1].body), reset);
  assert.throws(() => authApi.resetPassword({ ...reset, otpCode: '123' }));
  assert.throws(() => authApi.resetPassword({ ...reset, confirmPassword: 'different' }));
  assert.equal(calls.length, 2);
});

test('reset OTP verification never uses registration verification and propagates rejection', async () => {
  const previous = process.env.EXPO_PUBLIC_RESET_OTP_VERIFY_PATH;
  const calls = [];
  try {
    delete process.env.EXPO_PUBLIC_RESET_OTP_VERIFY_PATH;
    const unsupported = loader({ '@/api/client': { apiRequest: async (...args) => calls.push(args) } })('@/api/auth').authApi;
    assert.equal(await unsupported.verifyPasswordResetOtp({ email: 'fixture@example.invalid', otpCode: '123456' }), false);
    assert.equal(calls.length, 0);
    process.env.EXPO_PUBLIC_RESET_OTP_VERIFY_PATH = '/api/Auth/verify-reset-otp';
    const configured = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); throw new ApiError('Invalid OTP', 400); } } })('@/api/auth').authApi;
    assert.equal(configured.canVerifyPasswordResetOtp, true);
    await assert.rejects(configured.verifyPasswordResetOtp({ email: 'fixture@example.invalid', otpCode: '000000' }), /Invalid OTP/);
    assert.equal(calls[0][0], '/api/Auth/verify-reset-otp');
    assert.deepEqual(JSON.parse(calls[0][1].body), { email: 'fixture@example.invalid', otpCode: '000000' });
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_RESET_OTP_VERIFY_PATH;
    else process.env.EXPO_PUBLIC_RESET_OTP_VERIFY_PATH = previous;
  }
});

test('role assignment respects the backend hierarchy and uses PATCH', async () => {
  const { assignableRoles } = load('@/utils/roles');
  assert.deepEqual(assignableRoles('ADMIN', 'USER'), ['USER', 'MANAGER']);
  assert.deepEqual(assignableRoles('ADMIN', 'ADMIN'), []);
  assert.deepEqual(assignableRoles('MANAGER', 'USER'), []);
  assert.ok(assignableRoles('SUPER_ADMIN', 'ADMIN').includes('SUPER_ADMIN'));
  const calls = [];
  const { usersApi } = loader({ '@/api/client': { apiRequest: async (...args) => calls.push(args) } })('@/api/users');
  await usersApi.changeRole(id, 'MANAGER');
  assert.equal(calls[0][0], `/api/admin/users/${id}/role`);
  assert.equal(calls[0][1].method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0][1].body), { role: 'MANAGER' });
});

test('ingredient aliases encode paths and reject empty or overlong names', async () => {
  const calls = [];
  const { ingredientsApi } = loader({ '@/api/client': { apiRequest: async (...args) => calls.push(args) } })('@/api/ingredients');
  await ingredientsApi.aliases(id); await ingredientsApi.addAlias(id, '  cà rốt Đà Lạt  '); await ingredientsApi.removeAlias(id, 'alias/id');
  assert.equal(calls[0][0], `/api/ingredients/${id}/aliases`);
  assert.deepEqual(JSON.parse(calls[1][1].body), { aliasName: 'cà rốt Đà Lạt' });
  assert.equal(calls[2][0], `/api/ingredients/${id}/aliases/alias%2Fid`);
  assert.throws(() => ingredientsApi.addAlias(id, ' '));
  assert.throws(() => ingredientsApi.addAlias(id, 'a'.repeat(201)));
});

test('unified image analysis adapts ingredients and refuses unknown images without pantry mutation', async () => {
  const calls = []; let result = { imageType: 'RECEIPT', ingredients: [{ rawName: 'carrot', quantity: 1, unit: 'g', reviewRequired: true }], warnings: ['check'] };
  const { pantryImportApi } = loader({ '@/api/client': { ApiError, apiRequest: async (...args) => { calls.push(args); return result; } } })('@/api/pantryImport');
  const file = new File(['synthetic'], 'test.png', { type: 'image/png' });
  const preview = await pantryImportApi.analyze('AUTO', file);
  assert.equal(calls[0][0], '/api/v2/ingredients/analyze-image');
  assert.equal(calls[0][1].body.get('image').name, 'test.png');
  assert.equal(preview.sourceType, 'RECEIPT'); assert.equal(preview.items[0].reviewRequired, true);
  result = { imageType: 'UNKNOWN', ingredients: [], warnings: [] };
  assert.deepEqual((await pantryImportApi.analyze('AUTO', file)).items, []);
  assert.equal(calls.length, 2);
});

test('recipe pantry comparison scales portions, converts known units, excludes expired food and preserves shortages', () => {
  const { compareRecipePantry } = load('@/utils/recipePantry');
  const recipe = { servingSize: 2, ingredients: [{ ingredientId: id, ingredientName: 'Carrot', quantity: 200, unit: 'g' }] };
  const pantry = [
    { ingredientId: id, quantity: 0.1, unit: 'kg', expiredAt: '' },
    { ingredientId: id, quantity: 100, unit: 'g', expiredAt: '' },
    { ingredientId: id, quantity: 1000, unit: 'g', expiredAt: '2000-01-01' },
    { ingredientId: id, quantity: 20, unit: 'piece', expiredAt: '' }
  ];
  const check = compareRecipePantry(recipe, pantry, 4);
  assert.equal(check.availableIngredients[0].quantity, 200);
  assert.equal(check.missingIngredients[0].requiredQuantity, 200);
  assert.match(check.note, /hết hạn/); assert.match(check.note, /đơn vị/);
  assert.equal(compareRecipePantry(recipe, pantry, 2).missingIngredients.length, 0);
});

test('menu detail scales recipe amounts to the saved serving size', async () => {
  const { todayMenuApi } = loader({
    '@/api/client': { apiRequest: async () => ({ id, recipeId: 'recipe', servingSize: 4 }) },
    '@/api/recipes': { recipesApi: { get: async () => ({ servingSize: 2, ingredients: [{ ingredientId: id, quantity: 200, unit: 'g' }] }) } },
    '@/api/pantry': { pantryApi: { all: async () => [] } }
  })('@/api/todayMenu');
  assert.equal((await todayMenuApi.get(id)).requiredIngredients[0].quantity, 400);
});

test('recommendation metadata preserves only actual persisted IDs and validates feedback', async () => {
  const calls = [];
  const { recommendationsApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return { recommendationId: id, items: [{ recipeId: id, mealId: 'stored-meal', recipeName: 'Soup' }] }; } } })('@/api/recommendations');
  const [item] = (await recommendationsApi.personalized()).recommendations;
  assert.equal(item.recommendationId, id); assert.equal(item.persistedMeal, true);
  const feedback = { mealRecommendationId: id, recipeId: id, rating: 5, feedbackType: 'RATING', comment: 'Good' };
  await recommendationsApi.feedback(id, feedback);
  assert.equal(calls[1][0], `/api/recommendations/${id}/feedback`);
  assert.deepEqual(JSON.parse(calls[1][1].body), feedback);
  assert.throws(() => recommendationsApi.feedback(id, { ...feedback, rating: 6 }));
});

test('text pantry parsing sends only JSON text and requires explicit confirmation', async () => {
  const calls = [];
  const { pantryImportApi } = loader({ '@/api/client': { ApiError, apiRequest: async (...args) => {
    calls.push(args);
    return [{ name: 'Cà rốt', quantity: 2, unit: 'piece', ingredientId: id, ingredientName: 'Cà rốt', matched: true },
      { name: 'rau lạ', quantity: null, unit: null, ingredientId: null, ingredientName: null, matched: false }];
  } } })('@/api/pantryImport');
  await assert.rejects(pantryImportApi.parseText('  '));
  assert.equal(calls.length, 0);
  const result = await pantryImportApi.parseText('  2 củ cà rốt, rau lạ  ');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/me/pantry/parse');
  assert.deepEqual(JSON.parse(calls[0][1].body), { text: '2 củ cà rốt, rau lạ' });
  assert.equal(calls[0][1].auth, true);
  assert.equal(result.items[0].resolverStatus, 'RESOLVED');
  assert.equal(result.items[1].ingredientId, null);
  assert.equal(result.items[1].quantity, null);
});

test('menu pantry preview scales portions and merges ingredients without mixing units or guessing quantities', () => {
  const { buildMenuPreview } = loader({ '@/api/client': { ApiError }, '@/api/recipes': { recipesApi: {} } })('@/api/pantryImport');
  const recipe = { name: 'Canh rau', servingSize: 2, ingredients: [{ ingredientId: id, ingredientName: 'Cà rốt', quantity: 100, unit: 'g' }] };
  const result = buildMenuPreview([{ recipe, servingSize: 4 }, { recipe, servingSize: 1 }]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 250);
  assert.equal(result.items[0].unit, 'g');
  assert.throws(() => buildMenuPreview([{ recipe, servingSize: 0 }]), /khẩu phần/);
  assert.throws(() => buildMenuPreview([{ recipe: { ...recipe, ingredients: [] }, servingSize: 2 }]), /chưa có nguyên liệu/);
  assert.throws(() => buildMenuPreview([{ recipe, servingSize: 2 }, { recipe: { ...recipe, ingredients: [{ ...recipe.ingredients[0], unit: 'kg' }] }, servingSize: 2 }]), /đơn vị khác nhau/);
});

test('menu preview reads each recipe once and never writes pantry before confirmation', async () => {
  const readIds = [], writes = [];
  const { pantryImportApi } = loader({
    '@/api/client': { ApiError, apiRequest: async (...args) => writes.push(args) },
    '@/api/recipes': { recipesApi: { get: async recipeId => { readIds.push(recipeId); return { name: 'Canh', servingSize: 1, ingredients: [{ ingredientId: id, ingredientName: 'Rau', quantity: 50, unit: 'g' }] }; } } }
  })('@/api/pantryImport');
  const preview = await pantryImportApi.fromMenu([{ recipeId: 'r', servingSize: 2 }, { recipeId: 'r', servingSize: 3 }]);
  assert.deepEqual(readIds, ['r']); assert.equal(preview.items[0].quantity, 250); assert.deepEqual(writes, []);
  await assert.rejects(pantryImportApi.fromMenu([{ recipeId: null, servingSize: 1 }]), /chưa liên kết/);
});

test('manual recommendations send Java candidate objects, keep text and selections, and unwrap AI results', async () => {
  const calls = [];
  const { recommendationsApi } = loader({
    '@/api/client': { apiRequest: async (...args) => {
      calls.push(args);
      return { success: true, data: { items: [{ recipeId: id, recipeName: 'Canh rau', matchScore: 0.8 }] } };
    } }
  })('@/api/recommendations');
  const payload = {
    inputIngredientText: 'rau, nấm', ingredients: ['Cà rốt', 'rau', 'nấm'],
    selectedIngredients: [{ ingredientId: id, name: 'Cà rốt', quantity: 200, unit: 'g' }],
    candidateRecipes: [{ recipeId: id, recipeName: 'Canh rau', ingredientNames: ['Cà rốt'], instructionText: 'Nấu canh' }], topK: 5
  };
  const result = await recommendationsApi.suggestMeals(payload);
  assert.equal(calls[0][0], '/api/recommendations/meals');
  assert.equal(calls[0][1].auth, true);
  assert.deepEqual(JSON.parse(calls[0][1].body), payload);
  assert.equal(result.recommendations[0].recipeId, id);
  assert.equal(result.recommendations[0].score, 80);
  assert.equal(result.recommendations[0].persistedMeal, false);
});

test('manual recommendations reject failed or malformed nested AI responses instead of showing empty success', async () => {
  let response = { success: false, message: 'AI unavailable', data: null };
  const { recommendationsApi } = loader({ '@/api/client': { apiRequest: async () => response } })('@/api/recommendations');
  const payload = { inputIngredientText: 'nấm', selectedIngredients: [], candidateRecipes: [], topK: 5 };
  await assert.rejects(recommendationsApi.suggestMeals(payload), /AI unavailable/);
  response = { success: true, data: {} };
  await assert.rejects(recommendationsApi.suggestMeals(payload), error => error.status === 502);
  response = { success: true, data: { items: [] } };
  assert.deepEqual(await recommendationsApi.suggestMeals(payload), { recommendations: [] });
});

test('pagination loads beyond the first server page', async () => {
  const { collectPages } = loader()('@/api/pagination');
  const calls = [];
  const rows = await collectPages(async page => { calls.push(page); return {data:[page],hasNextPage:page<3}; });
  assert.deepEqual(rows,[1,2,3]); assert.deepEqual(calls,[1,2,3]);
});

test('role capabilities match Java admin and catalog roles', () => {
  const {canManageCatalog,canManageUsers}=loader()('@/utils/roles');
  assert.equal(canManageCatalog('MANAGER'),true); assert.equal(canManageUsers('MANAGER'),false);
  assert.equal(canManageUsers('SUPER_ADMIN'),true); assert.equal(canManageCatalog('user'),false);
});

test('concurrent expired requests rotate refresh token once and retry with the new token', async () => {
  const previous = global.fetch; const oldUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL='http://synthetic.test';
  let token='old', refreshCalls=0;
  const storage={getRevision:()=>0,getAccessToken:async()=>token,getRefreshToken:async()=>'refresh',updateTokens:async value=>{token=value.accessToken;return true;},clearSession:async()=>{throw Error('Unexpected clear');}};
  const {apiRequest}=loader({'react-native':{Platform:{OS:'web'}},'@/utils/authStorage':{authStorage:storage}})('@/api/client');
  global.fetch=async (url,options)=>{
    if(url.endsWith('/refresh-token')) {refreshCalls++;await new Promise(r=>setTimeout(r,15));return Response.json({success:true,data:{accessToken:'new',refreshToken:'rotated',expiresAt:'2099-01-01'}});}
    return options.headers.get('Authorization')==='Bearer new' ? Response.json({success:true,data:{ok:true}}) : new Response(null,{status:401});
  };
  try { const results=await Promise.all([apiRequest('/one',{auth:true}),apiRequest('/two',{auth:true})]);assert.equal(refreshCalls,1);assert.ok(results.every(x=>x.ok)); }
  finally {global.fetch=previous;if(oldUrl===undefined)delete process.env.EXPO_PUBLIC_API_BASE_URL;else process.env.EXPO_PUBLIC_API_BASE_URL=oldUrl;}
});

test('late refresh cannot resurrect a signed-out session; network failure preserves credentials', async () => {
  const previous=global.fetch, oldUrl=process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL='http://synthetic.test';
  let revision=0,clearCount=0,writes=0,release;
  const gate=new Promise(r=>release=r);
  const storage={getRevision:()=>revision,getRefreshToken:async()=>'refresh',updateTokens:async(v,expected)=>{if(expected!==revision)return false;writes++;return true;},clearSession:async()=>{revision++;clearCount++;}};
  const {refreshAccessToken}=loader({'react-native':{Platform:{OS:'web'}},'@/utils/authStorage':{authStorage:storage}})('@/api/client');
  try {
    global.fetch=async()=>{await gate;return Response.json({success:true,data:{accessToken:'late',refreshToken:'late-refresh'}});};
    const pending=refreshAccessToken();revision++;release();await assert.rejects(pending);assert.equal(writes,0);assert.equal(clearCount,0);
    global.fetch=async()=>{throw Error('offline');};await assert.rejects(refreshAccessToken(),e=>e.status===0);assert.equal(clearCount,0);
  } finally {global.fetch=previous;if(oldUrl===undefined)delete process.env.EXPO_PUBLIC_API_BASE_URL;else process.env.EXPO_PUBLIC_API_BASE_URL=oldUrl;}
});

test('native secure storage persists remembered sessions and forgets non-remembered sessions', async () => {
  const persisted=new Map();
  const mocks={'react-native':{Platform:{OS:'android'}},'expo-secure-store':{getItemAsync:async k=>persisted.get(k)??null,setItemAsync:async(k,v)=>{persisted.set(k,v);},deleteItemAsync:async k=>{persisted.delete(k);}}};
  const session={accessToken:'x.'+Buffer.from(JSON.stringify({userId:id,email:'fixture@example.invalid'})).toString('base64url')+'.x',refreshToken:'fixture-refresh',fullName:'Fixture',email:'fixture@example.invalid',role:'user',expiresAt:'2099-01-01'};
  const storage=loader(mocks)('@/utils/authStorage').authStorage;
  await storage.saveSession(session,true);
  assert.ok(await loader(mocks)('@/utils/authStorage').authStorage.getSession());
  await storage.saveSession(session,false);
  assert.ok(await storage.getSession());
  assert.equal(await loader(mocks)('@/utils/authStorage').authStorage.getSession(),null);
  await storage.clearSession();assert.equal(await storage.getSession(),null);
});

test('survey is reserved for verified new accounts and does not repeat after its first display', async () => {
  const persisted = new Map();
  const mocks = { 'react-native': { Platform: { OS: 'android' } }, 'expo-secure-store': {
    getItemAsync: async k => persisted.get(k) ?? null, setItemAsync: async (k, v) => { persisted.set(k, v); }, deleteItemAsync: async k => { persisted.delete(k); }
  } };
  const storage = loader(mocks)('@/utils/authStorage').authStorage;
  const session = { accessToken: 'x.' + Buffer.from(JSON.stringify({ userId: id, email: 'fixture@example.invalid' })).toString('base64url') + '.x', refreshToken: 'fixture-refresh', fullName: 'Fixture', email: 'fixture@example.invalid', role: 'USER', expiresAt: '2099-01-01' };
  assert.equal(await storage.getOnboardingStep(id), 'done'); // Existing account / new device.
  await storage.markNewAccount(' Fixture@Example.Invalid ');
  await storage.saveSession(session, false);
  assert.equal(await storage.getOnboardingStep(id), 'profile_setup');
  await storage.setOnboardingStep(id, 'done'); // Marked when the first survey is displayed.
  await storage.clearSession();
  const reopened = loader(mocks)('@/utils/authStorage').authStorage;
  await reopened.saveSession(session, true);
  assert.equal(await reopened.getOnboardingStep(id), 'done');
  persisted.set(`onboarding_step_${id}`, 'interactive_guide');
  assert.equal(await reopened.getOnboardingStep(id), 'done'); // Migrate obsolete guide state.
  await reopened.markNewAccount(session.email);
  await reopened.saveSession(session);
  assert.equal(await reopened.getOnboardingStep(id), 'done'); // Never re-open a completed survey.
});

test('menu detail composes recipe and matching pantry, excluding unrelated ingredients', async () => {
  const mockLoad=loader({'@/api/client':{apiRequest:async()=>({id,recipeId:'recipe'})},'@/api/recipes':{recipesApi:{get:async()=>({id:'recipe',ingredients:[{ingredientId:'a',ingredientName:'Carrot',quantity:2,unit:'g'}]})}},'@/api/pantry':{pantryApi:{all:async()=>[{id:'row',ingredientId:'a',quantity:3,unit:'g'},{id:'other',ingredientId:'b',quantity:4,unit:'g'}]}}});
  const detail=await mockLoad('@/api/todayMenu').todayMenuApi.get(id);
  assert.equal(detail.recipe.id,'recipe');assert.equal(detail.requiredIngredients.length,1);assert.equal(detail.pantryItems.length,1);assert.equal(detail.pantryItems[0].ingredientName,'Carrot');
});

test('pantry update sends explicit null expiry and rejects negative quantities before writing', async () => {
  const calls=[];
  const {pantryApi}=loader({'@/api/client':{apiRequest:async(...args)=>{calls.push(args);}}})('@/api/pantry');
  const payload={ingredientId:id,quantity:2,unit:'g',expiredAt:null,storageLocation:'',note:''};
  await pantryApi.updateItem(id,payload);
  assert.equal(JSON.parse(calls[0][1].body).expiredAt,null);
  assert.throws(()=>pantryApi.updateItem(id,{...payload,quantity:-2}));assert.equal(calls.length,1);
});

test('HTTP 200 failure envelopes reject missing users and repeated deletes', () => {
  assert.throws(() => unwrapEnvelope({ success: false, message: 'User not found.', data: null }),
    (error) => error instanceof ApiError && error.status === 200 && error.message === 'User not found.');
});

test('nullable user fields are preserved', () => {
  const user = { id, fullName: null, avatarUrl: null, updatedAt: null, email: 'Mixed@Example.dev' };
  assert.deepEqual(unwrapEnvelope({ success: true, data: user }), user);
});

test('empty page has zero totalPages; out-of-range page preserves metadata', () => {
  const empty = unwrapEnvelope({ success: true, data: [], pageIndex: 1, pageSize: 10, totalItems: 0 });
  assert.equal(empty.totalPages, 0);
  assert.equal(empty.hasNextPage, false);
  assert.equal(empty.hasPreviousPage, false);
  const beyond = unwrapEnvelope({ success: true, data: [], pageIndex: 8, pageSize: 10, totalItems: 3, totalPages: 1, hasNextPage: false, hasPreviousPage: true });
  assert.equal(beyond.pageIndex, 8);
  assert.equal(beyond.totalItems, 3);
  assert.equal(beyond.hasPreviousPage, true);
  assert.deepEqual(beyond.data, []);
});

test('null-data command success keeps message, empty HTTP response remains null', () => {
  assert.deepEqual(unwrapEnvelope({ success: true, data: null, message: 'User deleted successfully.' }), { message: 'User deleted successfully.' });
  assert.equal(unwrapEnvelope(null), null);
});

test('empty challenges and framework validation errors have usable messages', () => {
  assert.equal(getMessage(null, 'fallback'), 'fallback');
  assert.equal(getMessage('', 'fallback'), 'fallback');
  assert.equal(getMessage({ errors: [{ field: 'email', code: 'invalid', message: 'Invalid email' }] }, 'fallback'), 'Invalid email');
  assert.equal(getMessage({ title: 'Invalid request', errors: { email: ['Required'] } }, 'fallback'), 'Required');
});

test('Android localhost retains scheme and supports a normalized override', () => {
  assert.equal(resolveApiBaseUrl('localhost:8080/', undefined, 'android'), 'http://10.0.2.2:8080');
  assert.equal(resolveApiBaseUrl('http://localhost:8080', '192.168.1.2:9090/', 'android'), 'http://192.168.1.2:9090');
  assert.equal(resolveApiBaseUrl('https://example.dev/', undefined, 'web'), 'https://example.dev');
  assert.throws(() => resolveApiBaseUrl('ftp://example.dev', undefined, 'web'));
});

test('owner UI guard does not grant an admin-other bypass', () => {
  assert.equal(canUpdateUser(id.toUpperCase(), id), true);
  assert.equal(canUpdateUser('other-user-id', id), false);
  assert.equal(canUpdateUser(undefined, id), false);
});

test('partial profile update omits untouched nullable fields and preserves exact strings', () => {
  assert.deepEqual(buildUserUpdate({ fullName: null, avatarUrl: null }, { fullName: '', avatarUrl: '', password: '' }), {});
  assert.deepEqual(buildUserUpdate({ fullName: 'Before', avatarUrl: 'url' }, { fullName: '  ', avatarUrl: '', password: ' secret ' }), { fullName: '  ', avatarUrl: '', password: ' secret ' });
});

test('users keep UUID routes, PUT method and only the documented request fields', async () => {
  const calls = [];
  const mockLoad = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return {}; } } });
  const { usersApi } = mockLoad('@/api/users');
  await usersApi.list();
  await usersApi.get(id);
  await usersApi.update(id, { fullName: null, avatarUrl: ' ', password: ' pass ', role: 'admin', email: 'ignored' });
  await usersApi.remove(id);
  assert.equal(calls[0][0], '/api/users?pageIndex=1&pageSize=10');
  assert.equal(calls[1][0], `/api/users/${id}`);
  assert.equal(calls[2][1].method, 'PUT');
  assert.deepEqual(JSON.parse(calls[2][1].body), { fullName: null, avatarUrl: ' ', password: ' pass ' });
  assert.equal(calls[3][1].method, 'DELETE');
  assert.equal(calls.every(([, options]) => options.auth), true);
});

test('Auth routes retain casing and logout requires authentication', async () => {
  const calls = [];
  const mockLoad = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return {}; } } });
  const { authApi } = mockLoad('@/api/auth');
  await authApi.register({ fullName: 'Name', email: 'test@example.dev', password: 'pass' });
  await authApi.verifyOtp({ email: 'test@example.dev', otpCode: '123456' });
  await authApi.login({ email: 'test@example.dev', password: 'pass' });
  await authApi.refreshToken('synthetic-refresh-token');
  await authApi.logout();
  assert.deepEqual(calls.map(([route]) => route), ['register', 'verify-otp', 'login', 'refresh-token', 'logout'].map((suffix) => `/api/Auth/${suffix}`));
  assert.equal(calls.every(([, options]) => options.method === 'POST'), true);
  assert.equal(calls[4][1].auth, true);
  assert.deepEqual(JSON.parse(calls[0][1].body), { fullName: 'Name', email: 'test@example.dev', password: 'pass' });
  assert.deepEqual(JSON.parse(calls[1][1].body), { email: 'test@example.dev', otpCode: '123456' });
  assert.equal(calls[0][1].auth, undefined);
});

test('Google ID tokens are exchanged with Java, without treating provider credentials as app sessions', async () => {
  const calls = [];
  const session = { accessToken: 'zpantry-access', refreshToken: 'zpantry-refresh', email: 'fixture@example.invalid' };
  const { authApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return session; } } })('@/api/auth');
  assert.equal(await authApi.google('google-id-token'), session);
  assert.equal(calls[0][0], '/api/Auth/google');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].auth, undefined);
  assert.deepEqual(JSON.parse(calls[0][1].body), { idToken: 'google-id-token' });
});

async function withGoogleConfig(action) {
  const keys = ['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_AUTH_REDIRECT_URI'];
  const previous = keys.map(key => process.env[key]);
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'fixture.apps.googleusercontent.com';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-fixture.apps.googleusercontent.com';
  delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;
  try { await action(); } finally {
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
  }
}

test('native Google flow requires configuration, distinguishes cancellation and rejects missing ID tokens', async () => {
  await withGoogleConfig(async () => {
    let response = { type: 'success', data: { idToken: 'provider-id-token' } };
    const configurations = [];
    const provider = {
      GoogleSignin: { configure: value => configurations.push(value), hasPlayServices: async () => true, signIn: async () => response },
      statusCodes: {}, isErrorWithCode: () => false
    };
    const mocks = { 'react-native': { Platform: { OS: 'android' } }, '@react-native-google-signin/google-signin': provider };
    const google = loader(mocks)('@/hooks/useGoogleSignIn').useGoogleSignIn();
    assert.equal(google.ready, true);
    assert.equal(await google.getIdToken(), 'provider-id-token');
    assert.equal(configurations[0].webClientId, process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
    assert.equal(configurations[0].offlineAccess, false);
    response = { type: 'cancelled' };
    assert.equal(await google.getIdToken(), null);
    response = { type: 'success', data: { idToken: null } };
    await assert.rejects(google.getIdToken(), /chưa trả về/);
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const unconfigured = loader(mocks)('@/hooks/useGoogleSignIn').useGoogleSignIn();
    assert.equal(unconfigured.ready, false);
    await assert.rejects(unconfigured.getIdToken(), /chưa sẵn sàng/);
  });
});

test('native Google SDK reports Android configuration and Play Services failures without exchanging a token', async () => {
  await withGoogleConfig(async () => {
    let code = '10';
    const provider = {
      GoogleSignin: { configure: () => {}, hasPlayServices: async () => true, signIn: async () => { throw { code }; } },
      statusCodes: { SIGN_IN_CANCELLED: 'cancelled', PLAY_SERVICES_NOT_AVAILABLE: 'play-unavailable', IN_PROGRESS: 'in-progress' },
      isErrorWithCode: error => typeof error?.code === 'string'
    };
    const google = loader({ 'react-native': { Platform: { OS: 'android' } }, '@react-native-google-signin/google-signin': provider })('@/hooks/useGoogleSignIn').useGoogleSignIn();
    await assert.rejects(google.getIdToken(), /com.zpantry.app.*SHA-1.*Web Client ID/);
    code = 'play-unavailable';
    await assert.rejects(google.getIdToken(), /Google Play Services/);
    code = 'in-progress';
    await assert.rejects(google.getIdToken(), /đang được xử lý/);
    code = 'cancelled';
    assert.equal(await google.getIdToken(), null);
  });
});

test('web Google flow accepts only successful ID-token responses and handles close/error without a token', async () => {
  await withGoogleConfig(async () => {
    let response = { type: 'success', params: { id_token: 'web-provider-token' } };
    let config;
    const mocks = {
      'expo-auth-session/providers/google': { useIdTokenAuthRequest: value => { config = value; return [{}, null, async () => response]; } },
      'expo-web-browser': { maybeCompleteAuthSession() {} }
    };
    const google = loader(mocks)('@/hooks/useGoogleSignIn.web').useGoogleSignIn();
    assert.equal(google.ready, true);
    assert.equal(await google.getIdToken(), 'web-provider-token');
    assert.equal(config.selectAccount, true);
    response = { type: 'dismiss' };
    assert.equal(await google.getIdToken(), null);
    response = { type: 'error', params: { error: 'access_denied' } };
    await assert.rejects(google.getIdToken(), /Chưa xác thực/);
    response = { type: 'success', params: { access_token: 'not-an-id-token' } };
    await assert.rejects(google.getIdToken(), /Chưa xác thực/);
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const unconfigured = loader(mocks)('@/hooks/useGoogleSignIn.web').useGoogleSignIn();
    assert.equal(unconfigured.ready, false);
    await assert.rejects(unconfigured.getIdToken(), /chưa sẵn sàng/);
  });
});

test('V2 profile uses the self route and preserves birthday, multiple goals and server nutrition targets', async () => {
  const calls = [];
  const payload = { birthDate: '2000-02-29', gender: 'FEMALE', heightCm: 165.5, weightKg: 55,
    activityLevel: 'MODERATE', goals: ['QUICK_COOKING', 'WASTE_REDUCTION'], dietPreference: 'EAT_CLEAN', allergies: ['NO_ALLERGIES'] };
  const saved = { ...payload, dailyCalorieTarget: 1850, dailyProteinTarget: 70, weightLossAllowed: false, healthWarning: 'Server warning' };
  const { profileApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return saved; } } })('@/api/profile');
  assert.equal(await profileApi.getCurrent(), saved);
  assert.equal(await profileApi.saveCurrent(payload), saved);
  assert.equal(calls.every(([route, options]) => route === '/api/me/profile/v2' && options.auth), true);
  assert.equal(calls[1][1].method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1][1].body), payload);
});

test('birth dates reject calendar rollover/future dates and keep date-only values without UTC drift', () => {
  const { parseBirthDate, formatBirthDate } = load('@/utils/userProfile');
  const today = new Date(2024, 2, 1, 0, 0);
  for (const value of ['', '2024-2-1', '2023-02-29', '2024-02-30', '2024-03-02', '2024-13-01']) {
    assert.equal(parseBirthDate(value, today), null, value);
  }
  assert.equal(formatBirthDate(parseBirthDate('2024-02-29', today)), '2024-02-29');
  assert.equal(formatBirthDate(parseBirthDate('2024-03-01', today)), '2024-03-01');
});

test('personalized suggestions send documented profile-only filters and preserve empty results', async () => {
  const calls = [];
  const { recommendationsApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return { items: [] }; } } })('@/api/recommendations');
  assert.deepEqual(await recommendationsApi.personalized(5, { mode: 'PROFILE_BASED', mealType: 'DINNER', servings: 2, maxCookTimeMinutes: 30 }), { recommendations: [] });
  assert.deepEqual(JSON.parse(calls[0][1].body), { topK: 5, mode: 'PROFILE_BASED', mealType: 'DINNER', servings: 2, maxCookTimeMinutes: 30 });
  assert.equal(calls[0][0], '/api/recommendations/v2/meals');
  assert.equal(calls[0][1].auth, true);
});

test('image upload distinguishes unavailable services, oversized images and network errors', () => {
  const { getFriendlyErrorMessage } = load('@/utils/localize');
  const message = (status, text) => getFriendlyErrorMessage(Object.assign(new Error(text), { status }), 'fallback', 'imageUpload');
  assert.match(message(500, 'Media storage is not configured'), /Dịch vụ tải ảnh/);
  assert.match(message(413, 'Payload too large'), /quá lớn/);
  assert.match(message(415, 'Unsupported media type'), /định dạng/);
  assert.match(message(0, 'Failed to fetch'), /Không thể kết nối/);
});

test('registration failures explain duplicate email and unavailable OTP delivery', () => {
  const { getFriendlyErrorMessage } = load('@/utils/localize');
  assert.match(getFriendlyErrorMessage(new ApiError('Email already exists.', 500), 'fallback', 'auth'), /đã được đăng ký/);
  assert.match(getFriendlyErrorMessage(new ApiError('Email delivery is not configured', 500), 'fallback', 'auth'), /chưa cấu hình gửi mã OTP/);
  assert.match(getFriendlyErrorMessage(new ApiError('Failed to fetch', 0), 'fallback', 'auth'), /Không thể kết nối tới máy chủ/);
  assert.equal(getFriendlyErrorMessage(new ApiError('Internal secret detail', 500), 'fallback', 'auth'), 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.');
});

test('ingredients client does not expose the unsupported Java GET detail route', () => {
  const { ingredientsApi } = loader({ '@/api/client': { apiRequest: async () => ({}) } })('@/api/ingredients');
  assert.equal(ingredientsApi.get, undefined);
});

test('admin multipart forms use the Java API camelCase field names', () => {
  const formLoad = loader({ '@/api/client': { apiRequest: async () => ({}) } });
  const { createIngredientFormData } = formLoad('@/api/ingredients');
  const { createRecipeFormData } = formLoad('@/api/recipes');
  const ingredient = Object.fromEntries(createIngredientFormData({
    name: 'Pork', category: 'Meat', unit: 'g', caloriesPerUnit: 2,
    proteinPerUnit: 1, fatPerUnit: 1, carbPerUnit: 0, imageUrl: '',
    gradientFrom: '#000000', gradientTo: '#ffffff'
  }).entries());
  assert.deepEqual(Object.keys(ingredient), [
    'name', 'category', 'unit', 'caloriesPerUnit', 'proteinPerUnit',
    'fatPerUnit', 'carbPerUnit', 'gradientFrom', 'gradientTo', 'imageUrl'
  ]);
  assert.equal(ingredient.name, 'Pork');
  assert.equal(Object.hasOwn(ingredient, 'Name'), false);

  const recipe = Object.fromEntries(createRecipeFormData({
    name: 'Carrot with pork', description: '', cookingTimeMinutes: 20,
    difficulty: 'Easy', servingSize: 2, instructionText: '', imageUrl: '',
    sourceType: 'Manual', ingredients: [{ ingredientId: id, quantity: 100, unit: 'g', isRequired: true, note: '' }]
  }).entries());
  assert.equal(recipe.name, 'Carrot with pork');
  assert.equal(Object.hasOwn(recipe, 'Name'), false);
  assert.deepEqual(JSON.parse(recipe.ingredientsJson), [
    { ingredientId: id, quantity: 100, unit: 'g', isRequired: true, note: '' }
  ]);
});

test('today-menu completion form uses Spring model attribute field names', () => {
  const source = fs.readFileSync(path.resolve('src/api/todayMenu.ts'), 'utf8');
  for (const field of ['cookedAt', 'rating', 'note', 'imageFile']) {
    assert.match(source, new RegExp(`"${field}"`));
  }
  for (const staleField of ['CookedAt', 'Rating', 'Note', 'ImageFile']) {
    assert.doesNotMatch(source, new RegExp(`"${staleField}"`));
  }
});

test('frontend catalog includes the new profile route and never calls AI directly', () => {
  const source = fs.readFileSync(path.resolve('src/api/endpoints.ts'), 'utf8');
  assert.equal(load('@/api/endpoints').endpoints.profile(id), `/api/users/${id}/profile`);
  assert.doesNotMatch(source, /["']\/ai\//);
});

test('transport handles empty 401/403 and HTTP 200 logical failures', async () => {
  const previousFetch = global.fetch;
  const previousUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://synthetic.example';
  const mockLoad = loader({
    'react-native': { Platform: { OS: 'web' } },
    '@/utils/authStorage': { authStorage: { getAccessToken: async () => 'synthetic-token', getRevision: () => 0, getRefreshToken: async () => null, clearSession: async () => {} } }
  });
  const { apiRequest } = mockLoad('@/api/client');
  try {
    for (const status of [401, 403]) {
      global.fetch = async () => new Response(null, { status });
      await assert.rejects(apiRequest('/api/users', { auth: true }), (error) => error.status === status && error.message.length > 0);
    }
    global.fetch = async () => new Response(JSON.stringify({ success: false, message: 'User not found.', data: null }), { status: 200 });
    await assert.rejects(apiRequest(`/api/users/${id}`), (error) => error.status === 200 && error.message === 'User not found.');
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://synthetic.example/api/users');
      assert.equal(options.headers.get('Authorization'), 'Bearer synthetic-token');
      return new Response(null, { status: 204 });
    };
    assert.equal(await apiRequest('/api/users', { auth: true }), null);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previousUrl;
  }
});

test('health profile uses owner path, canonical enums and an explicit allergen array', async () => {
  const calls = [];
  const { profileApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return {}; } } })('@/api/profile');
  const payload = { age: 25, gender: 'Female', height: 165.5, weight: 55, goal: 'HEALTHY_EATING', dietPreference: 'VEGAN', allergies: ['PEANUT', 'MILK'] };
  await profileApi.get(id);
  await profileApi.save(id, payload);
  await profileApi.save(id, { ...payload, allergies: [] });
  assert.equal(calls[0][0], `/api/users/${id}/profile`);
  assert.equal(calls[1][1].method, 'PUT');
  assert.equal(calls.every(([, options]) => options.auth), true);
  assert.deepEqual(JSON.parse(calls[1][1].body), payload);
  assert.deepEqual(JSON.parse(calls[2][1].body).allergies, []);
});

test('V2 sends only topK, unwraps nested AI results, and does not invent persisted meals', async () => {
  const calls = [];
  let response = { success: true, data: { items: [{ recipeId: id, recipeName: 'Soup', matchScore: 0.85, missingIngredientNames: ['Carrot'] }] } };
  const { recommendationsApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return response; } } })('@/api/recommendations');
  const result = await recommendationsApi.personalized(10);
  assert.equal(calls[0][0], '/api/recommendations/v2/meals');
  assert.deepEqual(JSON.parse(calls[0][1].body), { topK: 10 });
  assert.equal(calls[0][1].auth, true);
  assert.equal(result.recommendations[0].recipeId, id);
  assert.equal(result.recommendations[0].persistedMeal, false);
  assert.equal(result.recommendations[0].score, 85);
  response = { success: false, message: 'AI unavailable', data: null };
  await assert.rejects(recommendationsApi.personalized(), /AI unavailable/);
  response = { success: true, data: {} };
  await assert.rejects(recommendationsApi.personalized(), /chưa đầy đủ/);
  response = { success: true, data: { items: [] } };
  assert.deepEqual(await recommendationsApi.personalized(), { recommendations: [] });
});

test('image analysis sends multipart image to Java and never confirms automatically', async () => {
  const calls = [];
  const { pantryImportApi } = loader({ '@/api/client': { ApiError, apiRequest: async (...args) => { calls.push(args); return { items: [] }; } } })('@/api/pantryImport');
  const file = new File(['synthetic'], 'food.png', { type: 'image/png' });
  await pantryImportApi.analyze('RECEIPT', file);
  await pantryImportApi.analyze('FOOD_IMAGE', file);
  assert.deepEqual(calls.map(([route]) => route), ['/api/me/pantry-import/receipt/analyze', '/api/me/pantry-import/food-image/analyze']);
  assert.equal(calls[0][1].body.get('image').name, 'food.png');
  assert.equal(calls.every(([, options]) => options.auth && options.method === 'POST'), true);
  const items = [{ ingredientId: id, quantity: 2.5, unit: 'kg' }];
  await pantryImportApi.confirm(items);
  assert.deepEqual(JSON.parse(calls[2][1].body), { items });
  assert.equal(calls[2][0], '/api/me/pantry-import/confirm');
});

test('import refuses unresolved, duplicate and invalid quantities before any pantry write', () => {
  const { validateImportItems } = loader({ '@/api/client': { ApiError } })('@/api/pantryImport');
  const row = { ingredientId: id, quantity: 1, unit: 'g' };
  for (const items of [[], [{ ...row, ingredientId: '' }], [row, row], [{ ...row, quantity: NaN }], [{ ...row, quantity: 0 }], [{ ...row, quantity: -1 }], [{ ...row, unit: ' ' }]]) {
    assert.throws(() => validateImportItems(items));
  }
  assert.doesNotThrow(() => validateImportItems([row]));
});

test('catalog JSON writes preserve and clear allergens; create matches the Java protein spelling', async () => {
  const calls = [];
  const api = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return {}; } } });
  const { ingredientsApi } = api('@/api/ingredients');
  const { recipesApi } = api('@/api/recipes');
  const ingredient = { name: 'Milk', imageUrl: '', proteinPerUnit: 3.5, allergens: ['MILK'] };
  await ingredientsApi.create(ingredient);
  await ingredientsApi.update(id, { ...ingredient, allergens: [] });
  await recipesApi.update(id, { name: 'Soup', imageUrl: '', allergens: [] });
  assert.equal(calls[0][0], '/api/ingredients');
  assert.equal(JSON.parse(calls[0][1].body).protenPerUnit, 3.5);
  assert.equal(JSON.parse(calls[1][1].body).proteinPerUnit, 3.5);
  assert.deepEqual(JSON.parse(calls[1][1].body).allergens, []);
  assert.equal(calls[2][0], `/api/recipes/${id}`);
  assert.deepEqual(JSON.parse(calls[2][1].body).allergens, []);
});

test('catalog image upload precedes one write and upload failure prevents catalog mutation', async () => {
  const calls = [];
  let failUpload = false;
  const { ingredientsApi } = loader({ '@/api/client': { apiRequest: async (...args) => {
    calls.push(args);
    if (args[0] === '/api/media/upload') {
      if (failUpload) throw new Error('upload failed');
      return 'https://images.example/synthetic.png';
    }
    return {};
  } } })('@/api/ingredients');
  const payload = { name: 'Milk', imageUrl: '', imageFile: new File(['fake'], 'test.png', { type: 'image/png' }), allergens: ['MILK'] };
  await ingredientsApi.create(payload);
  assert.deepEqual(calls.map(([route]) => route), ['/api/media/upload', '/api/ingredients']);
  const sent = JSON.parse(calls[1][1].body);
  assert.equal(sent.imageUrl, 'https://images.example/synthetic.png');
  assert.equal(Object.hasOwn(sent, 'imageFile'), false);
  assert.deepEqual(sent.allergens, ['MILK']);
  calls.length = 0; failUpload = true;
  await assert.rejects(ingredientsApi.create(payload), /upload failed/);
  assert.equal(calls.length, 1);
});

test('imported pantry items without expiry do not become expired today', async () => {
  const { pantryApi } = loader({ '@/api/client': { apiRequest: async () => [{ id, ingredientId: id, expiredAt: null, quantity: 1 }] } })('@/api/pantry');
  const [item] = await pantryApi.list();
  assert.equal(item.expiredAt, '');
});


test('expiry days cross months and leap years and reject invalid input', () => {
  const { expiryDateFromDays, remainingExpiryDays } = loader()('@/utils/expiryDays');
  const today = new Date(2026, 11, 29, 23, 45);
  assert.equal(expiryDateFromDays('7', today), '2027-01-05');
  assert.equal(expiryDateFromDays('0', today), '2026-12-29');
  assert.equal(expiryDateFromDays('', today), null);
  assert.equal(expiryDateFromDays('2', new Date(2028, 1, 28)), '2028-03-01');
  assert.equal(remainingExpiryDays('2027-01-05T00:00:00Z', today), '7');
  assert.equal(remainingExpiryDays('2026-12-28', today), '-1');
  assert.equal(remainingExpiryDays(null, today), '');
  for (const invalid of ['-1', '1.5', 'abc', '36501']) assert.throws(() => expiryDateFromDays(invalid, today));
});

test('display name uses FullName and never email fallback', () => {
  const { userDisplayName } = loader()('@/utils/userProfile');
  assert.equal(userDisplayName({ fullName: '  Nguyễn Minh Khang  ', email: 'khang@example.invalid' }), 'Nguyễn Minh Khang');
  assert.equal(userDisplayName({ fullName: 'khang@example.invalid', email: 'khang@example.invalid' }), 'bạn');
  assert.equal(userDisplayName({ email: 'khang@example.invalid' }), 'bạn');
});


test('batch pantry sends one items request with canonical units and normalized dates', async () => {
  const calls = [];
  const { pantryApi } = loader({ '@/api/client': { apiRequest: async (...args) => { calls.push(args); return JSON.parse(args[1].body).items; } } })('@/api/pantry');
  const first = { ingredientId: 'a', quantity: 200, unit: 'g', expiredAt: '2027-01-05', storageLocation: 'fridge', note: '' };
  const second = { ...first, ingredientId: 'b', quantity: 300, unit: 'ml', expiredAt: null };
  const saved = await pantryApi.saveItems([first, second]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/me/pantry/items/batch');
  assert.equal(calls[0][1].auth, true);
  assert.deepEqual(JSON.parse(calls[0][1].body), { items: [{ ...first, expiredAt: '2027-01-05T00:00:00.000Z' }, second] });
  assert.equal(saved.length, 2);
  for (const invalid of [[], [first, first], [{ ...first, unit: '' }], [{ ...first, quantity: 0 }]]) {
    await assert.rejects(pantryApi.saveItems(invalid));
  }
  assert.equal(calls.length, 1);
});

test('ingredient quantity formats base quantities and uses unit or API steps', () => {
  const { formatIngredientQuantity, normalizeIngredientUnit, getQuantityStep, getIngredientQuantityStep } = load('@/utils/ingredientQuantity');
  for (const [unit, cases] of [
    ['g', [[100, '100 g'], [900, '900 g'], [1000, '1 kg'], [1100, '1.1 kg'], [1200, '1.2 kg'], [1500, '1.5 kg'], [2000, '2 kg'], [2500, '2.5 kg']]],
    ['ml', [[100, '100 ml'], [900, '900 ml'], [1000, '1 L'], [1200, '1.2 L'], [1500, '1.5 L'], [2000, '2 L']]],
    ['piece', [[1, '1 quả'], [2, '2 quả'], [10, '10 quả']]],
    ['quả', [[1, '1 quả'], [2, '2 quả'], [10, '10 quả']]]
  ]) for (const [quantity, expected] of cases) assert.equal(formatIngredientQuantity(quantity, unit), expected);
  for (const [aliases, canonical, step] of [
    [['g', 'gram', 'GRAM'], 'g', 100],
    [['ml', 'milliliter', 'ML'], 'ml', 100],
    [['piece', 'pieces', 'quả'], 'piece', 1]
  ]) for (const alias of aliases) {
    assert.equal(normalizeIngredientUnit(` ${alias} `), canonical);
    assert.equal(getQuantityStep(alias), step);
    assert.equal(getIngredientQuantityStep({}, alias), step);
  }
  assert.equal(getIngredientQuantityStep({ quantityStep: 10 }, 'g'), 10);
  for (const quantityStep of [null, undefined, 0, -1, NaN, Infinity]) {
    assert.equal(getIngredientQuantityStep({ quantityStep }, 'g'), 100);
  }
  assert.equal(formatIngredientQuantity(2, 'bó'), '2 bó');
});

test('Add Ingredient controls keep independent base quantities and save only on submit', async () => {
  // Exercise the actual screen handlers with a small hook/element host, without native views.
  const state = []; let cursor = 0; let effect; let initialized = false;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return state[index] ||= { current: initial };
    },
    useMemo: fn => fn(), useCallback: fn => fn,
    useEffect: fn => { if (!initialized) effect = fn; }
  };
  const jsx = (type, props) => ({ type, props });
  const items = [
    { id: 'g', name: 'Bún', unit: 'g' }, { id: 'ml', name: 'Sữa', unit: 'ml' },
    { id: 'piece', name: 'Trứng', unit: 'quả' }, { id: 'custom', name: 'Muối', unit: 'g', quantityStep: 10 }
  ];
  const writes = []; const navigations = []; let failSave = true;
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': Object.fromEntries(['ActivityIndicator', 'Pressable', 'RefreshControl', 'ScrollView', 'View'].map(name => [name, name])),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    '@react-navigation/native': { useNavigation: () => ({ popTo: (...args) => navigations.push(args) }) },
    '@/context/ToastContext': { useToast: () => ({ show() {} }) },
    '@/api/ingredients': { ingredientsApi: { all: async () => items } },
    '@/api/pantry': { pantryApi: { saveItems: async items => { writes.push(items); if (failSave) throw new Error('Network unavailable'); } } }
  };
  for (const name of ['AppInput', 'ExpiryDaysField', 'AppText', 'ScreenScrollView', 'CategoryChip', 'PrimaryButton', 'SearchBar']) mocks[`@/components/${name}`] = { __esModule: true, default: name };
  const Screen = loader(mocks)('@/screens/AddIngredientScreen').default;
  function render() { cursor = 0; const tree = Screen(); initialized = true; return tree; }
  function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (typeof tree.type === 'function') return nodes(tree.type(tree.props));
    return [tree, ...nodes(tree.props?.children)];
  }
  function find(predicate) { const found = nodes(render()).find(predicate); assert.ok(found, 'Control exists'); return found; }
  function button(label) { return find(node => node.props?.accessibilityLabel === label); }
  function quantity(id) {
    const card = find(node => node.props?.testID === `selected-ingredient-${id}`);
    return nodes(card).find(node => node.props?.accessibilityLabel === `Số lượng ${items.find(item => item.id === id).name}`).props.children;
  }
  render(); effect(); await new Promise(resolve => setImmediate(resolve));
  for (const item of items) button(`Chọn ${item.name}`).props.onPress();
  assert.equal(quantity('g'), '100 g'); assert.equal(quantity('ml'), '100 ml');
  assert.equal(quantity('piece'), '1 quả'); assert.equal(quantity('custom'), '10 g');
  assert.equal(button('Giảm 1 quả Trứng').props.disabled, true);
  for (let i = 0; i < 14; i++) button('Thêm 100 g Bún').props.onPress();
  button('Thêm 1 quả Trứng').props.onPress(); button('Thêm 10 g Muối').props.onPress();
  assert.equal(quantity('g'), '1.5 kg'); assert.equal(quantity('ml'), '100 ml');
  assert.equal(quantity('piece'), '2 quả'); assert.equal(quantity('custom'), '20 g');
  assert.ok(nodes(render()).some(node => node.props?.children?.join?.('') === 'Mỗi lần thêm 100 g'));
  button('Giảm 1 quả Trứng').props.onPress(); button('Giảm 1 quả Trứng').props.onPress();
  assert.equal(quantity('piece'), '1 quả'); assert.equal(button('Giảm 1 quả Trứng').props.accessibilityState.disabled, true);
  let expiry = find(node => node.type === 'ExpiryDaysField');
  for (const invalid of ['-1', '1.5', 'abc']) { expiry.props.onChange(invalid); assert.equal(find(node => node.type === 'ExpiryDaysField').props.value, ''); }
  expiry.props.onChange('0');
  find(node => node.type === 'CategoryChip' && node.props.label === 'Ngăn đông').props.onPress();
  assert.equal(find(node => node.type === 'CategoryChip' && node.props.label === 'Ngăn đông').props.active, true);
  assert.equal(find(node => node.type === 'CategoryChip' && node.props.label === 'Ngăn mát').props.active, false);
  assert.equal(writes.length, 0);
  await find(node => node.type === 'PrimaryButton' && node.props.title === 'Lưu 4 nguyên liệu vào tủ').props.onPress();
  assert.equal(writes.length, 1);
  assert.equal(navigations.length, 0);
  assert.equal(quantity('g'), '1.5 kg');
  assert.ok(find(node => node.props?.accessibilityRole === 'alert'));
  failSave = false;
  await find(node => node.type === 'PrimaryButton' && node.props.title === 'Lưu 4 nguyên liệu vào tủ').props.onPress();
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].map(({ ingredientId, quantity, unit }) => ({ ingredientId, quantity, unit })), [
    { ingredientId: 'g', quantity: 1500, unit: 'g' }, { ingredientId: 'ml', quantity: 100, unit: 'ml' },
    { ingredientId: 'piece', quantity: 1, unit: 'quả' }, { ingredientId: 'custom', quantity: 20, unit: 'g' }
  ]);
  assert.equal(writes[0][0].expiredAt, load('@/utils/expiryDays').expiryDateFromDays('0'));
  assert.equal(writes[0][1].expiredAt, null);
  assert.equal(writes[0][0].storageLocation, 'freezer');
  assert.ok(writes[0].slice(1).every(item => item.storageLocation === 'fridge'));
  assert.equal(navigations.length, 1);
});
