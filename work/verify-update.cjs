const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/ontri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.join(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  const ext = path.extname(file);
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ttf': 'font/ttf' })[ext] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(18991, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const uid = '55f2f378-692a-4268-924e-e8c648190e32';
    const iid = '11f2f378-692a-4268-924e-e8c648190e32';
    let profile = { id: uid, userId: uid, age: 25, gender: 'Female', height: 165, weight: 55, goal: 'HEALTHY_EATING', dietPreference: 'NONE', allergies: [] };
    let failSave = true, confirmed = 0, analyzed = 0, profileWrites = 0, v2Calls = 0;
    const ingredient = { id: iid, name: 'Cà rốt', unit: 'g', normalizedName: 'ca rot', category: 'Vegetable', allergens: [] };
    const pantry = [{ id: iid, ingredientId: iid, ingredientName: 'Cà rốt', quantity: 200, unit: 'g', expiredAt: null, storageLocation: null }];
    await page.route('**/api/**', async route => {
      const req = route.request(), u = new URL(req.url());
      const ok = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      const paged = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, pageIndex: 1, pageSize: 100, totalItems: data.length }) });
      if (u.pathname.endsWith('/profile')) {
        if (req.method() === 'PUT') {
          profileWrites++;
          if (failSave) { failSave = false; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic failure' }) }); }
          profile = { ...profile, ...req.postDataJSON() };
        }
        return ok(profile);
      }
      if (u.pathname.endsWith('/analyze')) {
        analyzed++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sourceType: 'FOOD_IMAGE', warnings: [], items: [{ rawName: 'Cà rốt', ingredientId: null, canonicalIngredientName: null, quantity: 2, unit: 'g', confidence: 0.8, resolverStatus: 'UNRESOLVED' }] }) });
      }
      if (u.pathname.endsWith('/pantry-import/confirm')) { confirmed++; assert.equal(req.postDataJSON().items[0].ingredientId, iid); return ok(null); }
      if (u.pathname.endsWith('/v2/meals')) { v2Calls++; assert.deepEqual(req.postDataJSON(), { topK: 5 }); return ok({ success: true, data: { items: [{ recipeId: uid, recipeName: 'Canh cà rốt', matchScore: 0.8, missingIngredientNames: [], reason: 'Món đơn giản', rank: 1 }] } }); }
      if (u.pathname === '/api/ingredients') return paged([ingredient]);
      if (u.pathname === '/api/me/pantry') return paged(pantry);
      if (u.pathname === '/api/recipes/' + uid) return ok({ id: uid, name: 'Canh cà rốt', description: 'Canh rau', cookingTimeMinutes: 15, difficulty: 'Easy', servingSize: 2, instructionText: '1. Rửa rau\n2. Nấu canh', ingredients: [{ ingredientId: iid, ingredientName: 'Cà rốt', quantity: 200, unit: 'g' }], allergens: [] });
      return paged([]);
    });
    await page.addInitScript(({ uid }) => {
      localStorage.setItem('zpantry.accessToken', 'synthetic-not-a-real-token');
      localStorage.setItem('zpantry.refreshToken', 'synthetic-refresh');
      localStorage.setItem('zpantry.user', JSON.stringify({ userId: uid, fullName: 'Người kiểm thử', email: 'test@example.invalid', role: 'user', expiresAt: '2099-01-01T00:00:00Z' }));
    }, { uid });
    await page.goto('http://127.0.0.1:18991');
    await page.getByText('Hồ sơ ăn uống', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Đậu phộng', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.getByText('Máy chủ đang gặp sự cố.', { exact: false }).waitFor();
    assert.match(await page.getByRole('checkbox', { name: /Đậu phộng/ }).innerText(), /✓/);
    await page.screenshot({ path: 'work/profile-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.getByText('Hôm nay', { exact: true }).last().waitFor();
    assert.equal(profileWrites, 2);
    assert.deepEqual(profile.allergies, ['PEANUT']);
    await page.getByText('Công thức', { exact: true }).last().click();
    await page.getByText('Hôm nay ăn gì?', { exact: true }).waitFor();
    await page.screenshot({ path: 'work/recommendations-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Tìm món cho tôi', exact: true }).click();
    await page.getByText('Canh cà rốt', { exact: true }).waitFor();
    assert.equal(v2Calls, 1);
    await page.getByText('Canh cà rốt', { exact: true }).click();
    await page.getByText('Thành phần công thức', { exact: true }).waitFor();
    await page.screenshot({ path: 'work/recipe-mobile.png', fullPage: true });
    // Reload with completed onboarding to exercise a clean return to the pantry.
    await page.evaluate(uid => localStorage.setItem('onboarding_step_' + uid, 'done'), uid);
    await page.reload();
    await page.getByText('Tủ', { exact: true }).last().click();
    await page.getByText('Nhập nhanh từ ảnh', { exact: true }).click();
    await page.getByText('Thêm nguyên liệu từ ảnh', { exact: true }).waitFor();
    const picker = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Chọn ảnh từ thư viện', exact: true }).click();
    await (await picker).setFiles('assets/images/z-pantry-logo.png');
    await page.getByRole('button', { name: 'Phân tích ảnh', exact: true }).click();
    await page.getByText('Cần chọn nguyên liệu tương ứng', { exact: true }).waitFor();
    assert.equal(analyzed, 1); assert.equal(confirmed, 0);
    await page.getByRole('button', { name: 'Xác nhận lưu 1 nguyên liệu', exact: true }).click();
    await page.getByText('Mỗi dòng cần nguyên liệu', { exact: false }).waitFor();
    assert.equal(confirmed, 0);
    await page.getByRole('button', { name: 'Chọn nguyên liệu', exact: true }).click();
    await page.getByText('Cà rốt · đơn vị danh mục: g', { exact: true }).click();
    await page.getByLabel('Số lượng Cà rốt', { exact: true }).fill('250');
    await page.screenshot({ path: 'work/import-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: 'work/import-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Xác nhận lưu 1 nguyên liệu', exact: true }).click();
    await page.getByText('Nhập nhanh từ ảnh', { exact: true }).last().waitFor();
    assert.equal(confirmed, 1);
    assert.deepEqual(errors, []);
    console.log('PASS: profile failed-save/retry; V2 request/result/detail; image preview/manual match/validation/explicit confirm; mobile and desktop screenshots; no page errors.');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
