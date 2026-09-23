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
});

test('transport handles empty 401/403 and HTTP 200 logical failures', async () => {
  const previousFetch = global.fetch;
  const previousUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://synthetic.example';
  const mockLoad = loader({
    'react-native': { Platform: { OS: 'web' } },
    '@/utils/authStorage': { authStorage: { getAccessToken: async () => 'synthetic-token' } }
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
