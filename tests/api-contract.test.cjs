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
    const file = name.startsWith('@/') ? path.resolve('src', name.slice(2) + '.ts') : path.resolve(parent, name + '.ts');
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
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
