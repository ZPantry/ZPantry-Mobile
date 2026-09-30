// Chrome UI regression tests for ZPantry-Frontend issues #1–3.
// APIs are synthetic and isolated: this never writes to a real backend.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist');
const uid = '55f2f378-692a-4268-924e-e8c648190e32';
const iid = '11f2f378-692a-4268-924e-e8c648190e32';
const rid = '22f2f378-692a-4268-924e-e8c648190e32';
const nid = '33f2f378-692a-4268-924e-e8c648190e32';
const ingredient = { id: iid, name: 'Cà rốt', normalizedName: 'ca rot', category: 'Rau', unit: 'g', allergens: [] };
const noodle = { ...ingredient, id: nid, name: 'Bún tươi', normalizedName: 'bun tuoi' };
const recipe = { id: rid, name: 'Canh cà rốt', cookingTimeMinutes: 20, servingSize: 2, difficulty: 'Easy', instructionText: '1. Nấu canh', ingredients: [{ ingredientId: iid, ingredientName: 'Cà rốt', quantity: 200, unit: 'g' }] };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 640 } });
  page.setDefaultTimeout(12000);
  const errors = [], calls = { parse: [], confirm: [], pantry: [], otp: [] };
  let failConfirm = true;
  const pantry = [{ id: nid, ingredientId: nid, ingredientName: 'Bún tươi', quantity: 200, unit: 'g', expiredAt: new Date(Date.now() + 3 * 86400000).toISOString(), storageLocation: 'fridge' }];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname;
    const ok = data => route.fulfill({ json: { success: true, data, message: 'OK' } });
    const paged = data => route.fulfill({ json: { success: true, data, pageIndex: 1, pageSize: 100, hasNextPage: false, totalItems: data.length } });
    if (p === '/api/me/pantry/parse') {
      calls.parse.push(req.postDataJSON());
      return ok([{ name: 'Cà rốt', quantity: 200, unit: 'g', ingredientId: iid, ingredientName: 'Cà rốt', matched: true }]);
    }
    if (p === '/api/me/pantry-import/confirm') {
      const body = req.postDataJSON(); calls.confirm.push(body);
      if (failConfirm) { failConfirm = false; return route.fulfill({ status: 500, json: { message: 'Synthetic failure' } }); }
      for (const item of body.items) {
        const previous = pantry.find(row => row.ingredientId === item.ingredientId);
        if (previous) Object.assign(previous, item);
        else pantry.push({ ...item, id: item.ingredientId, ingredientName: 'Cà rốt', expiredAt: null, storageLocation: 'fridge' });
      }
      return ok(null);
    }
    if (p === '/api/me/pantry/items' && req.method() === 'POST') {
      const body = req.postDataJSON(); calls.pantry.push(body);
      const previous = pantry.find(row => row.ingredientId === body.ingredientId);
      Object.assign(previous || {}, body);
      return ok({ ...body, id: iid, ingredientName: 'Cà rốt' });
    }
    if (p === '/api/Auth/logout') return ok(null);
    if (p === '/api/Auth/verify-otp') {
      calls.otp.push({ body: req.postDataJSON(), url: req.url(), headers: req.headers() });
      return ok(null);
    }
    if (p === '/api/recipes') return paged([recipe]);
    if (p === '/api/recipes/' + rid) return ok(recipe);
    if (p === '/api/me/today-menu') return paged([{ id: rid, recipeId: rid, mealName: recipe.name, servingSize: 4, status: 'planned', plannedDate: url.searchParams.get('date') || '', mealType: 'LUNCH' }]);
    if (p.startsWith('/api/ingredients')) return paged([ingredient, noodle]);
    if (p === '/api/me/pantry') return paged(pantry);
    return paged([]);
  });
  await page.addInitScript(({ uid }) => {
    localStorage.setItem('zpantry.accessToken', 'synthetic-token');
    localStorage.setItem('zpantry.refreshToken', 'synthetic-refresh');
    localStorage.setItem('zpantry.user', JSON.stringify({ userId: uid, fullName: 'Test', email: 'fixture@example.invalid', role: 'USER', expiresAt: '2099-01-01T00:00:00Z' }));
    localStorage.setItem('onboarding_step_' + uid, 'done');
  }, { uid });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByText('Cá nhân', { exact: true }).last().click();
    const logout = page.getByRole('button', { name: 'Đăng xuất', exact: true });
    for (const size of [{ width: 320, height: 568 }, { width: 390, height: 640 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(size);
      await logout.scrollIntoViewIfNeeded();
      const button = await logout.boundingBox(), tab = await page.getByTestId('bottom-tab-bar').boundingBox();
      assert.ok(button.y + button.height <= tab.y + 1, 'Logout must be above the tab bar');
      assert.equal(await logout.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), true);
      await page.screenshot({ path: `dist/profile-${size.width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 640 });
    await logout.click();
    await page.getByRole('button', { name: 'Ở lại', exact: true }).click();
    await page.getByRole('button', { name: 'Hướng dẫn sử dụng Z-Pantry', exact: true }).click();
    await page.getByRole('button', { name: 'Bước tiếp', exact: true }).click();
    assert.equal(await page.getByLabel('Nhập thử nguyên liệu (không bắt buộc)').inputValue(), '');
    await page.getByRole('button', { name: 'Bước tiếp', exact: true }).click();
    await page.getByText('Kiểm tra trước khi lưu', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Bước 7: Sẵn sàng sử dụng', exact: true }).click();
    await page.getByRole('button', { name: 'Bước trước', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ qua hướng dẫn', exact: true }).click();
    assert.equal(calls.pantry.length, 0);
    await page.getByText('Tủ', { exact: true }).last().click();
    await page.getByText('Hạn dùng cần chú ý', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng thông báo', exact: true }).click();
    assert.equal(await page.getByText('Ưu tiên dùng sớm', { exact: false }).count(), 0);
    const add = page.getByRole('button', { name: 'Thêm thực phẩm', exact: true });
    assert.ok((await add.boundingBox()).height <= 64);
    await page.getByRole('button', { name: 'Thêm nhanh', exact: true }).click();
    for (const name of ['Thêm thủ công', 'Thêm bằng thực đơn', 'Thêm bằng văn bản', 'Ảnh thực phẩm / hóa đơn']) assert.equal(await page.getByRole('button', { name, exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Thêm bằng văn bản', exact: true }).click();
    await page.getByLabel('Danh sách thực phẩm').fill('200 g cà rốt');
    await page.getByRole('button', { name: 'Phân tích văn bản', exact: true }).click();
    await page.getByLabel('Số lượng Cà rốt').fill('300');
    assert.deepEqual(calls.parse, [{ text: '200 g cà rốt' }]);
    assert.equal(calls.confirm.length, 0);
    await page.getByRole('button', { name: 'Xác nhận lưu 1 nguyên liệu', exact: true }).click();
    await page.getByText('Máy chủ đang gặp sự cố.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Số lượng Cà rốt').inputValue(), '300');
    await page.getByRole('button', { name: 'Xác nhận lưu 1 nguyên liệu', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm bằng thực đơn', exact: true }).click();
    await page.getByRole('checkbox', { name: recipe.name, exact: true }).click();
    await page.getByRole('button', { name: 'Xem nguyên liệu cần thêm', exact: true }).click();
    assert.equal(await page.getByLabel('Số lượng Cà rốt').inputValue(), '400');
    assert.equal(calls.confirm.length, 2);
    await page.screenshot({ path: 'dist/menu-preview.png' });
    await page.getByRole('button', { name: 'Xác nhận lưu 1 nguyên liệu', exact: true }).click();
    assert.equal(calls.confirm[2].items[0].quantity, 400);
    await page.getByRole('button', { name: 'Thêm thực phẩm', exact: true }).click();
    await page.getByRole('button', { name: 'Bước tiếp', exact: true }).click();
    await page.getByRole('button', { name: 'Bước tiếp', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ qua hướng dẫn', exact: true }).click();
    await page.getByRole('button', { name: 'Chọn Cà rốt', exact: true }).click();
    await page.getByLabel('Hạn dùng (không bắt buộc)').fill('2026-02-31');
    await page.getByRole('button', { name: 'Xác nhận lưu vào tủ', exact: true }).click();
    await page.getByText('Hạn dùng cần là ngày hợp lệ', { exact: false }).waitFor();
    assert.equal(calls.pantry.length, 0);
    await page.getByLabel('Hạn dùng (không bắt buộc)').fill('');
    await page.getByText('Ngăn đông', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Xác nhận lưu vào tủ', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm nhanh', exact: true }).waitFor();
    assert.equal(calls.pantry[0].storageLocation, 'freezer');
    assert.equal(calls.pantry[0].expiredAt, null);
    await page.getByText('Ngăn đông', { exact: true }).first().click();
    await page.getByText('Cà rốt', { exact: true }).last().waitFor();

    await page.getByText('Cá nhân', { exact: true }).last().click();
    await logout.click();
    await page.getByRole('button', { name: 'Xác nhận đăng xuất', exact: true }).click();
    await page.getByText('Đã đăng ký? Nhập mã xác thực', { exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
    await page.getByLabel('Mã OTP', { exact: true }).fill('123456');
    assert.equal(await page.getByLabel('Email', { exact: true }).evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    assert.match(await page.locator('#zpantry-form-styles').textContent(), /-webkit-autofill/);
    await page.screenshot({ path: 'dist/otp-form.png' });
    await page.getByRole('button', { name: 'Xác thực OTP', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor();
    assert.deepEqual(calls.otp[0].body, { email: 'fixture@example.invalid', otpCode: '123456' });
    assert.equal(new URL(calls.otp[0].url).search, '');
    assert.equal(calls.otp[0].headers.email, undefined);
    assert.deepEqual(errors, []);
    console.log('PASS: logout geometry 320/390/1280px, optional guides, expiry popup, all quick-add methods, text failure/retry, menu portion scaling, manual validation/freezer, OTP JSON body and themed inputs.');
  } catch (error) { await page.screenshot({ path: 'dist/ui-issues-failure.png' }); throw error; }
  finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
