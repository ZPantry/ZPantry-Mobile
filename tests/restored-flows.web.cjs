// Run after npm run build. Set PLAYWRIGHT_MODULE to a Playwright installation if
// it is not on NODE_PATH. All API responses are synthetic; no backend is mutated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist');
const uid = '55f2f378-692a-4268-924e-e8c648190e32';
const iid = '11f2f378-692a-4268-924e-e8c648190e32';
const rid = '22f2f378-692a-4268-924e-e8c648190e32';
const ingredient = { id: iid, name: 'Cà rốt', normalizedName: 'ca rot', category: 'Rau', unit: 'g', allergens: [] };
const recipe = { id: rid, name: 'Canh cà rốt', cookingTimeMinutes: 20, servingSize: 2, difficulty: 'Easy', instructionText: '1. Rửa rau\n2. Nấu canh', ingredients: [{ ingredientId: iid, ingredientName: 'Cà rốt', quantity: 200, unit: 'g' }], allergens: [] };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end();
  }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const pageErrors = [];
  const calls = { manual: [], v2: 0, created: [] };
  let failManual = true, failCreate = true, catalogPages = [];
  async function open(role) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      const paged = (data, hasNextPage = false) => route.fulfill({ json: { success: true, data, pageIndex: Number(url.searchParams.get('pageIndex') || 1), pageSize: 100, hasNextPage, totalItems: data.length } });
      if (p === '/api/recommendations/meals') {
        calls.manual.push(req.postDataJSON());
        if (failManual) { failManual = false; return route.fulfill({ status: 503, json: { message: 'AI unavailable' } }); }
        return ok({ success: true, data: { items: [{ recipeId: rid, recipeName: recipe.name, score: 0.8 }] } });
      }
      if (p === '/api/recommendations/v2/meals') { calls.v2++; assert.deepEqual(req.postDataJSON(), { topK: 5 }); return ok({ items: [{ recipeId: rid, recipeName: recipe.name }] }); }
      if (p === '/api/recipes' && req.method() === 'POST') {
        calls.created.push(req.postDataJSON());
        if (failCreate) { failCreate = false; return route.fulfill({ status: 500, json: { message: 'Synthetic save failure' } }); }
        return ok({ ...recipe, ...req.postDataJSON() });
      }
      if (p === '/api/recipes') {
        const index = Number(url.searchParams.get('pageIndex') || 1);
        catalogPages.push(index);
        return paged(index === 1 ? [recipe] : [{ ...recipe, id: uid, name: 'Canh rau' }], index === 1);
      }
      if (p === '/api/recipes/' + rid) return ok(recipe);
      if (p.startsWith('/api/ingredients')) return paged([ingredient]);
      if (p === '/api/me/pantry') return paged([{ id: iid, ingredientId: iid, ingredientName: ingredient.name, quantity: 200, unit: 'g' }]);
      return paged([]);
    });
    await page.addInitScript(({ uid, role }) => {
      localStorage.setItem('zpantry.accessToken', 'synthetic-token');
      localStorage.setItem('zpantry.refreshToken', 'synthetic-refresh');
      localStorage.setItem('zpantry.user', JSON.stringify({ userId: uid, fullName: 'Test', email: 'fixture@example.invalid', role, expiresAt: '2099-01-01T00:00:00Z' }));
      localStorage.setItem('onboarding_step_' + uid, 'done');
    }, { uid, role });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    return page;
  }
  try {
    const page = await open('USER');
    await page.getByText('Công thức', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Tự chọn / nhập nguyên liệu', exact: true }).click();
    await page.getByPlaceholder('Tìm nguyên liệu, ví dụ: trứng').fill('ca');
    await page.getByRole('button', { name: 'Thêm Cà rốt', exact: true }).click();
    await page.getByPlaceholder('Số lượng', { exact: true }).fill('200');
    await page.getByPlaceholder('Nhập tên nguyên liệu, cách nhau bằng dấu phẩy').fill('nấm, rau');
    await page.getByRole('button', { name: 'Tìm món từ nguyên liệu', exact: true }).click();
    await page.getByText('Máy chủ đang gặp sự cố.', { exact: false }).waitFor();
    assert.equal(await page.getByPlaceholder('Nhập tên nguyên liệu, cách nhau bằng dấu phẩy').inputValue(), 'nấm, rau');
    await page.getByRole('button', { name: 'Tìm món từ nguyên liệu', exact: true }).click();
    await page.getByRole('button', { name: 'Xem Canh cà rốt', exact: true }).waitFor();
    assert.equal(calls.manual.length, 2);
    assert.equal(calls.manual[1].selectedIngredients[0].quantity, 200);
    assert.equal(calls.manual[1].inputIngredientText, 'nấm, rau');
    assert.equal(calls.manual[1].candidateRecipes.length, 2);
    assert.deepEqual(calls.manual[1].candidateRecipes[0].ingredientNames, ['Cà rốt']);
    assert.ok(catalogPages.includes(2));
    await page.screenshot({ path: 'dist/manual-restored.png' });
    await page.getByRole('button', { name: 'Xem Canh cà rốt', exact: true }).click();
    await page.getByText('Thành phần công thức', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Công thức', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Tạo công thức', exact: true }).click();
    await page.getByText('Tài khoản của bạn chưa có quyền lưu công thức.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Tạo công thức', exact: true }).isDisabled(), true);
    assert.equal(calls.created.length, 0);
    await page.reload();
    await page.getByText('Công thức', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Tìm món cho tôi', exact: true }).click();
    await page.getByText('Canh cà rốt', { exact: true }).last().waitFor();
    assert.equal(calls.v2, 1);
    await page.close();

    const admin = await open('ADMIN');
    await admin.getByText('Công thức', { exact: true }).click();
    await admin.getByText('Tạo mới', { exact: true }).click();
    await admin.getByRole('button', { name: 'Tạo bằng tìm kiếm nguyên liệu ›', exact: true }).click();
    await admin.getByPlaceholder('Cơm chiên trứng').fill('Canh thử nghiệm');
    await admin.getByPlaceholder('Tìm nguyên liệu để thêm').fill('ca');
    await admin.getByRole('button', { name: 'Thêm Cà rốt', exact: true }).click();
    await admin.getByPlaceholder('Nhập từng bước nấu món ăn').fill('1. Nấu rau');
    await admin.getByRole('checkbox', { name: 'Đậu phộng', exact: true }).click();
    await admin.getByRole('button', { name: 'Tạo công thức', exact: true }).click();
    await admin.getByText('Máy chủ đang gặp sự cố.', { exact: false }).waitFor();
    assert.equal(await admin.getByPlaceholder('Cơm chiên trứng').inputValue(), 'Canh thử nghiệm');
    await admin.screenshot({ path: 'dist/create-restored.png' });
    await admin.getByRole('button', { name: 'Tạo công thức', exact: true }).click();
    await admin.getByText('Danh sách công thức', { exact: true }).waitFor();
    assert.equal(calls.created.length, 2);
    assert.deepEqual(calls.created[1].allergens, ['PEANUT']);
    assert.equal(calls.created[1].ingredients[0].ingredientId, iid);
    assert.deepEqual(pageErrors, []);
    console.log('PASS: manual selection/text, catalog pagination, AI failure/retry/detail, user create permission, admin create failure/retry/allergens, V2 retained; no page errors.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
