const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
function loadChat(request) {
  const { outputText } = ts.transpileModule(fs.readFileSync('src/api/recommendations.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  class ApiError extends Error {}
  new Function('require', 'module', 'exports', outputText)(name => {
    if (name.endsWith('/client')) return { apiRequest: request };
    if (name.endsWith('/response')) return { ApiError, unwrapEnvelope: value => value };
    if (name.endsWith('/localize')) return { translateRecommendationText: value => value };
    return { endpoints: { recommendations: { meals: '/api/recommendations/meals' } } };
  }, module, module.exports);
  return module.exports.recommendationsApi;
}
test('chef suggestions use the existing Java meals contract and normalize server recipe context', async () => {
  const calls = [];
  const api = loadChat(async (...args) => { calls.push(args); return { recommendations: [{ recipeId: 'recipe-1', recipeName: 'Canh', score: 90, matchingIngredients: ['Rau'] }] }; });
  const response = await api.chat(' Gợi ý món ');
  assert.equal(calls[0][0], '/api/recommendations/meals');
  assert.equal(calls[0][1].auth, true);
  assert.deepEqual(JSON.parse(calls[0][1].body), { inputIngredientText: 'Gợi ý món', topK: 3 });
  assert.deepEqual(response.recommendations[0].matchedIngredients, ['Rau']);
  assert.match(response.answer, /Tìm thấy 1 món/);
  await assert.rejects(api.chat(' '));
  assert.equal(calls.length, 1);
});
test('chef suggestions reject unavailable or incomplete results and handle empty results', async () => {
  await assert.rejects(loadChat(async () => ({ answer: '' })).chat('Hello'));
  await assert.rejects(loadChat(async () => { throw new Error('Unavailable'); }).chat('Hello'), /Unavailable/);
  const empty = await loadChat(async () => ({ recommendations: [] })).chat('cà rốt');
  assert.match(empty.answer, /Chưa tìm thấy món/);
  assert.deepEqual(empty.recommendations, []);
});
