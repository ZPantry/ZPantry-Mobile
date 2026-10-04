// Browser integration tests use synthetic responses and never mutate Render.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist');
const uid = '55f2f378-692a-4268-924e-e8c648190e32';
const iid = '11f2f378-692a-4268-924e-e8c648190e32';
const iid2 = '66f2f378-692a-4268-924e-e8c648190e32';
const rid = '22f2f378-692a-4268-924e-e8c648190e32';
const recid = '33f2f378-692a-4268-924e-e8c648190e32';
const targetid = '44f2f378-692a-4268-924e-e8c648190e32';
const ingredient = { id: iid, name: 'Cà rốt', normalizedName: 'ca rot', category: 'Vegetable', unit: 'g', allergens: [] };
const recipe = { id: rid, name: 'Canh cà rốt', servingSize: 2, cookingTimeMinutes: 20, difficulty: 'Easy', instructionText: '1. Rửa rau\n2. Nấu canh', ingredients: [{ ingredientId: iid, ingredientName: 'Cà rốt', quantity: 200, unit: 'g' }], allergens: [] };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [], calls = [], aliases = [];
  let failBatch = true;
  let failReset = true, failAlias = true, failMenu = true, failComplete = true, completed = false;
  const out = path.resolve('work/swagger-review-2026-10-04'); fs.mkdirSync(out, { recursive: true });
  async function open(role, width = 390, step) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname, method = req.method();
      const body = req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : undefined;
      calls.push({ p, method, body });
      const ok = data => route.fulfill({ json: { success: true, data, message: 'OK' } });
      const paged = data => route.fulfill({ json: { success: true, data, pageIndex: 1, pageSize: 100, totalItems: data.length, hasNextPage: false } });
      if (p === '/api/Auth/forgot-password') return ok(null);
      if (p === '/api/Auth/reset-password') {
        if (failReset) { failReset = false; return route.fulfill({ status: 400, json: { message: 'Invalid OTP' } }); }
        return ok(null);
      }
      if (p === '/api/ingredients') return paged([ingredient, { ...ingredient, id: iid2, name: 'Sữa tươi', normalizedName: 'sua tuoi', unit: 'ml' }, { ...ingredient, id: 'no-unit', name: 'Chưa có đơn vị', unit: '' }]);
      if (p === `/api/ingredients/${iid}/aliases`) {
        if (method === 'GET') return ok(aliases);
        if (failAlias) { failAlias = false; return route.fulfill({ status: 500, json: { message: 'Synthetic failure' } }); }
        const alias = { id: 'alias-1', ingredientId: iid, aliasName: body.aliasName }; aliases.push(alias); return ok(alias);
      }
      if (p === `/api/ingredients/${iid}/aliases/alias-1`) { aliases.length = 0; return ok(null); }
      if (p === '/api/recipes') return paged([recipe]);
      if (p === `/api/recipes/${rid}`) return ok(recipe);
      if (p === '/api/me/pantry') return paged([{ id: iid, ingredientId: iid, ingredientName: ingredient.name, quantity: 0.1, unit: 'kg', expiredAt: null }]);
      if (p === '/api/recommendations/meals') return ok({ items: [{ recipeId: rid, recipeName: recipe.name, score: 0.8 }] });
      if (p === '/api/recommendations/v2/meals') return ok({ recommendationId: recid, items: [{ recipeId: rid, recipeName: recipe.name, score: 0.8 }] });
      if (p === `/api/recommendations/${recid}/feedback`) return ok(null);
      if (p === '/api/recommendations/missing-ingredients') return ok({ missingIngredients: [] });
      if (p === '/api/v2/ingredients/analyze-image') return route.fulfill({ json: { imageType: 'FOOD_IMAGE', confidence: 0.8, ingredients: [{ rawName: 'Cà rốt', canonicalIngredientName: 'Cà rốt', ingredientId: iid, quantity: 200, unit: 'g', resolverStatus: 'RESOLVED', reviewRequired: true }], warnings: [] } });
      if (p === '/api/me/pantry-import/confirm') return ok(null);
      if (p === '/api/me/today-menu/items' && method === 'POST') {
        if (failMenu) { failMenu = false; return route.fulfill({ status: 500, json: { message: 'Synthetic failure' } }); }
        return ok({ id: 'menu-1', ...body, status: 'PLANNED' });
      }
      if (p === '/api/me/today-menu/items/menu-1') return ok({ id: 'menu-1', recipeId: rid, mealName: recipe.name, servingSize: 4, status: completed ? 'COOKED' : 'PLANNED', plannedDate: '2026-10-05' });
      if (p === '/api/me/today-menu/items/menu-1/complete') {
        assert.match(req.headers()['content-type'], /multipart\/form-data/);
        assert.match(req.postData(), /name="imageFile"/);
        if (failComplete) { failComplete = false; return route.fulfill({ status: 500, json: { message: 'Synthetic save failure' } }); }
        completed = true;
        return ok({ cookingLog: { id: 'log-1', mealName: recipe.name, cookedAt: '2026-10-04T10:00:00Z' }, consumedIngredients: [], updatedPantryItems: [], warnings: [] });
      }
      if (p === `/api/users/${uid}`) return ok({ id: uid, fullName: 'Nguyễn Minh Khang', email: 'fixture@example.invalid', role });
      if (p === '/api/me/pantry/items/batch') {
        if (failBatch) { failBatch = false; return route.fulfill({ status: 500, json: { message: 'Synthetic batch failure' } }); }
        return ok(body.items.map(item => ({ id: item.ingredientId, ...item })));
      }
      if (p === '/api/me/pantry/items' && method === 'POST') return ok({ id: iid, ...body });
      if (p === `/api/me/pantry/items/${iid}` && method === 'PUT') return ok({ id: iid, ...body });
      if (p === '/api/users') return paged([{ id: targetid, fullName: 'Người dùng thử', email: 'target@example.invalid', role: 'USER', createdAt: '2026-10-01', isActive: true }]);
      if (p === `/api/admin/users/${targetid}/role`) return ok(null);
      if (p === '/api/me/profile/v2' && method === 'PUT') return ok(body);
      if (p === '/api/me/profile/v2') return ok({ birthDate: '2000-01-01', gender: 'FEMALE', heightCm: 165, weightKg: 55, activityLevel: 'MODERATE', goals: [], dietPreference: 'NONE', allergies: [] });
      return paged([]);
    });
    if (role) await page.addInitScript(({ uid, role, step }) => {
      localStorage.setItem('zpantry.accessToken', 'synthetic-token'); localStorage.setItem('zpantry.refreshToken', 'synthetic-refresh');
      localStorage.setItem('zpantry.user', JSON.stringify({ userId: uid, fullName: 'fixture@example.invalid', email: 'fixture@example.invalid', role, expiresAt: '2099-01-01T00:00:00Z' }));
      if (step && !sessionStorage.getItem('fixture-step-initialized')) { localStorage.setItem('onboarding_step_' + uid, step); sessionStorage.setItem('fixture-step-initialized', 'true'); }
    }, { uid, role, step });
    await page.goto(`http://127.0.0.1:${server.address().port}`); return page;
  }
  try {
    const guest = await open();
    await guest.getByText('BẮT ĐẦU', { exact: true }).click();
    await guest.getByRole('button', { name: 'Quên mật khẩu', exact: true }).click();
    await guest.getByLabel('Email đăng ký', { exact: true }).fill('fixture@example.invalid');
    await guest.getByRole('button', { name: 'Gửi mã OTP', exact: true }).click();
    assert.equal(await guest.getByLabel('Mật khẩu mới', { exact: true }).count(), 0);
    await guest.getByLabel('Mã OTP', { exact: true }).fill('123');
    await guest.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await guest.getByText('Mã OTP phải gồm 6 chữ số.', { exact: true }).waitFor();
    assert.equal(await guest.getByLabel('Mật khẩu mới', { exact: true }).count(), 0);
    await guest.screenshot({ path: path.join(out, 'otp-mobile.png') });
    await guest.getByLabel('Mã OTP', { exact: true }).fill('123456');
    await guest.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    assert.equal(await guest.getByLabel('Mã OTP', { exact: true }).count(), 0);
    await guest.getByLabel('Mật khẩu mới', { exact: true }).fill('new-password');
    await guest.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill('new-password');
    await guest.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await guest.getByText('Mã OTP không đúng hoặc đã hết hạn.', { exact: false }).waitFor();
    assert.equal(await guest.getByLabel('Mật khẩu mới', { exact: true }).inputValue(), 'new-password');
    await guest.screenshot({ path: path.join(out, 'reset-mobile.png') });
    await guest.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    await guest.getByText('Mật khẩu đã được đổi', { exact: true }).waitFor(); await guest.close();

    const user = await open('USER');
    await user.getByText('Khám phá', { exact: true }).last().click();
    await user.getByRole('button', { name: 'Tìm món cho tôi', exact: true }).click();
    await user.getByRole('button', { name: 'Xem Canh cà rốt', exact: true }).click();
    await user.getByText('Cà rốt - cần 100 g', { exact: true }).waitFor();
    await user.getByRole('button', { name: 'Đánh giá 5 sao', exact: true }).click();
    await user.getByLabel('Nhận xét gợi ý', { exact: true }).fill('Rất phù hợp');
    await user.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
    await user.getByText('Cảm ơn bạn! Đánh giá đã được lưu.', { exact: true }).waitFor();
    await user.getByRole('button', { name: 'Gợi ý nguyên liệu cần mua', exact: true }).click();
    // Universal Picker renders a native HTML select on web.
    await user.getByLabel('Bữa ăn', { exact: true }).last().selectOption('DINNER');
    await user.getByLabel('Khẩu phần', { exact: true }).last().selectOption('4');
    await user.getByText('Cà rốt - cần 300 g', { exact: true }).waitFor();
    await user.getByLabel('Ngày lên thực đơn · Năm', { exact: true }).selectOption('2026');
    await user.getByLabel('Ngày lên thực đơn · Tháng', { exact: true }).selectOption('10');
    await user.getByLabel('Ngày lên thực đơn · Ngày', { exact: true }).selectOption('05');
    const fixedHeader = await user.getByTestId('fixed-back-header').last().boundingBox();
    await user.getByLabel('Ghi chú thực đơn', { exact: true }).fill('Ít muối');
    const scrolledHeader = await user.getByTestId('fixed-back-header').last().boundingBox();
    assert.equal(scrolledHeader.y, fixedHeader.y); assert.equal(scrolledHeader.x, fixedHeader.x);
    assert.equal(await user.getByRole('button', { name: 'Quay lại', exact: true }).count(), 1);
    await user.screenshot({ path: path.join(out, 'recipe-mobile.png'), fullPage: true });
    await user.getByRole('button', { name: 'Thêm vào thực đơn', exact: true }).click();
    assert.equal(await user.getByLabel('Ghi chú thực đơn', { exact: true }).inputValue(), 'Ít muối');
    await user.getByRole('button', { name: 'Thêm vào thực đơn', exact: true }).click();
    await user.getByText('Hoàn thành món', { exact: true }).waitFor();
    await user.getByText('Cà rốt: 400 g', { exact: true }).waitFor();
    const completionChooser = user.waitForEvent('filechooser');
    await user.getByRole('button', { name: 'Chọn ảnh thành phẩm', exact: true }).click();
    await (await completionChooser).setFiles({ name: 'cooked.png', mimeType: 'image/png', buffer: fs.readFileSync(path.join(out, 'reset-mobile.png')) });
    await user.getByLabel('Ghi chú sau khi nấu', { exact: true }).fill('Đã nấu xong');
    await user.getByRole('button', { name: 'Hoàn thành và lưu nhật ký', exact: true }).click();
    await user.getByText('Dịch vụ tải ảnh đang gặp sự cố.', { exact: false }).waitFor();
    assert.equal(await user.getByLabel('Ghi chú sau khi nấu', { exact: true }).inputValue(), 'Đã nấu xong');
    await user.getByRole('button', { name: 'Đổi ảnh thành phẩm', exact: true }).waitFor();
    await user.getByRole('button', { name: 'Hoàn thành và lưu nhật ký', exact: true }).click();
    await user.getByText('Nhật ký đã lưu', { exact: true }).waitFor();
    assert.equal(calls.filter(c => c.p.endsWith('/complete')).length, 2);
    const menuCalls = calls.filter(c => c.p === '/api/me/today-menu/items' && c.method === 'POST');
    assert.equal(menuCalls.length, 2); assert.equal(menuCalls[1].body.servingSize, 4); assert.equal(menuCalls[1].body.mealType, 'DINNER'); assert.equal(menuCalls[1].body.note, 'Ít muối');
    await user.close();

    const importer = await open('USER');
    await importer.getByText('Kho thực phẩm', { exact: true }).last().click();
    await importer.getByRole('button', { name: 'Thêm nhanh', exact: true }).click();
    await importer.screenshot({ path: path.join(out, 'quick-add-mobile.png') });
    await importer.getByRole('button', { name: 'Ảnh thực phẩm / hóa đơn', exact: true }).click();
    const chooser = importer.waitForEvent('filechooser');
    await importer.getByRole('button', { name: 'Chọn ảnh từ thư viện', exact: true }).click();
    await (await chooser).setFiles({ name: 'food.png', mimeType: 'image/png', buffer: fs.readFileSync(path.join(out, 'reset-mobile.png')) });
    await importer.getByRole('button', { name: 'Phân tích ảnh', exact: true }).click();
    await importer.getByText('Cần kiểm tra lại kết quả nhận diện', { exact: true }).waitFor();
    assert.equal(calls.filter(c => c.p === '/api/me/pantry-import/confirm').length, 0);
    await importer.getByRole('button', { name: 'Xác nhận lưu 1 nguyên liệu', exact: true }).click();
    await importer.getByRole('button', { name: 'Thêm nhanh', exact: true }).waitFor();
    assert.equal(calls.filter(c => c.p === '/api/me/pantry-import/confirm').length, 1); await importer.close();

    const ux = await open('USER', 375);
    const aiBefore = await ux.getByTestId('draggable-ai').boundingBox();
    assert.equal(aiBefore.width, 56);
    await ux.mouse.move(aiBefore.x + 28, aiBefore.y + 27); await ux.mouse.down();
    await ux.mouse.move(40, 280, { steps: 15 }); await ux.mouse.up();
    const aiAfter = await ux.getByTestId('draggable-ai').boundingBox();
    assert.ok(Math.abs(aiAfter.x - aiBefore.x) > 40 && Math.abs(aiAfter.y - aiBefore.y) > 40, JSON.stringify({ aiBefore, aiAfter, style: await ux.getByTestId("draggable-ai").getAttribute("style"), errors }));
    assert.equal(await ux.getByText('Đầu bếp Z-Pantry', { exact: true }).count(), 0);
    await ux.getByRole('button', { name: 'Mở chat đầu bếp AI', exact: true }).click();
    await ux.getByLabel('Tin nhắn cho đầu bếp AI').fill('Tôi có cà rốt, hãy gợi ý món');
    await ux.getByRole('button', { name: 'Gửi tin nhắn AI', exact: true }).click();
    await ux.getByRole('button', { name: 'Xem công thức Canh cà rốt', exact: true }).waitFor();
    assert.equal(calls.filter(c => c.p === '/api/recommendations/meals').at(-1).body.inputIngredientText, 'Tôi có cà rốt, hãy gợi ý món');
    await ux.screenshot({ path: path.join(out, 'chat-mobile.png'), animations: 'disabled' });
    await ux.getByRole('button', { name: 'Đóng chat AI', exact: true }).click();
    await ux.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await ux.getByText('Cài đặt khẩu vị & Dị ứng', { exact: true }).click();
    await ux.getByLabel('Ngày sinh · Năm').selectOption('2000');
    await ux.getByLabel('Ngày sinh · Tháng').selectOption('01');
    await ux.getByLabel('Ngày sinh · Ngày').selectOption('31');
    await ux.getByLabel('Ngày sinh · Tháng').selectOption('02');
    assert.equal(await ux.getByLabel('Ngày sinh · Ngày').inputValue(), '29');
    await ux.getByLabel('Ngày sinh · Năm').selectOption('2001');
    assert.equal(await ux.getByLabel('Ngày sinh · Ngày').inputValue(), '28');
    await ux.getByRole('button', { name: 'Tăng Chiều cao', exact: true }).click();
    await ux.getByRole('button', { name: 'Tăng Cân nặng', exact: true }).click();
    const selectedColor = await ux.getByLabel('Mức vận động').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.equal(selectedColor, 'rgb(255, 240, 216)');
    await ux.getByRole('checkbox', { name: 'Không dị ứng', exact: true }).scrollIntoViewIfNeeded();
    await ux.waitForFunction(() => Array.from(document.querySelectorAll('img')).every(i => i.complete && i.naturalWidth > 0));
    await ux.screenshot({ path: path.join(out, 'survey-icons-mobile.png'), animations: 'disabled' });
    await ux.getByText('Khẩu vị & Thể trạng của bạn', { exact: true }).scrollIntoViewIfNeeded();
    await ux.screenshot({ path: path.join(out, 'survey-mobile.png'), animations: 'disabled' });
    const brokenImages = await ux.locator('img').evaluateAll(imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
    assert.deepEqual(brokenImages, []);
    await ux.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await ux.getByText('Cài đặt khẩu vị & Dị ứng', { exact: true }).waitFor();
    const saved = calls.filter(c => c.p === '/api/me/profile/v2' && c.method === 'PUT').at(-1).body;
    assert.equal(saved.birthDate, '2001-02-28'); assert.equal(saved.heightCm, 166); assert.equal(saved.weightKg, 55.1);
    await ux.close();

    const firstVisit = await open('USER', 375, 'profile_setup');
    await firstVisit.getByText('Khẩu vị & Thể trạng của bạn', { exact: true }).waitFor();
    assert.equal(await firstVisit.evaluate(() => localStorage.getItem('onboarding_step_55f2f378-692a-4268-924e-e8c648190e32')), 'done');
    await firstVisit.getByRole('button', { name: 'Để sau', exact: true }).click();
    await firstVisit.getByRole('tab', { name: 'Trang chủ', exact: true }).waitFor();
    assert.equal(await firstVisit.getByText('Bỏ qua hướng dẫn', { exact: true }).count(), 0);
    await firstVisit.reload(); await firstVisit.getByRole('tab', { name: 'Trang chủ', exact: true }).waitFor();
    assert.equal(await firstVisit.getByText('Khẩu vị & Thể trạng của bạn', { exact: true }).count(), 0);
    await firstVisit.getByText('Kho nguyên liệu của Nguyễn Minh Khang', { exact: true }).waitFor();
    await firstVisit.getByText('Chào Nguyễn Minh Khang! ✨', { exact: true }).waitFor();
    await firstVisit.getByRole('button', { name: 'Thêm nguyên liệu', exact: true }).click();
    await firstVisit.setViewportSize({ width: 375, height: 667 });
    await firstVisit.getByRole('button', { name: 'Nhập tay nguyên liệu', exact: true }).click();
    assert.equal(await firstVisit.getByRole('button', { name: 'Thêm bằng văn bản', exact: true }).count(), 0);
    const quickBack = await firstVisit.getByTestId('fixed-back-header').last().boundingBox();
    await firstVisit.getByRole('button', { name: 'Thêm bằng thực đơn', exact: true }).scrollIntoViewIfNeeded();
    assert.equal((await firstVisit.getByTestId('fixed-back-header').last().boundingBox()).y, quickBack.y);
    await firstVisit.screenshot({ path: path.join(out, 'quick-add-fixed-back-mobile.png'), animations: 'disabled' });
    await firstVisit.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Chọn nguyên liệu thủ công', exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Chọn Cà rốt', exact: true }).click();
    const carrot = firstVisit.getByTestId('selected-ingredient-' + iid);
    assert.equal(await firstVisit.getByRole('button', { name: 'Giảm 100 g Cà rốt', exact: true }).isDisabled(), true);
    await firstVisit.getByRole('button', { name: 'Thêm 100 g Cà rốt', exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Thêm 100 g Cà rốt', exact: true }).click();
    await carrot.getByText('300 g', { exact: true }).waitFor();
    await firstVisit.getByRole('button', { name: 'Giảm 100 g Cà rốt', exact: true }).click();
    await carrot.getByText('200 g', { exact: true }).waitFor();
    await firstVisit.getByLabel('Tìm nguyên liệu', { exact: true }).fill('sua');
    await firstVisit.getByRole('button', { name: 'Chọn Sữa tươi', exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Bỏ Sữa tươi', exact: true }).click();
    assert.equal(await firstVisit.getByTestId('selected-ingredient-' + iid2).count(), 0);
    await firstVisit.getByRole('button', { name: 'Chọn Sữa tươi', exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Thêm 100 ml Sữa tươi', exact: true }).click();
    const milk = firstVisit.getByTestId('selected-ingredient-' + iid2);
    await milk.getByText('200 ml', { exact: true }).waitFor();
    await firstVisit.getByLabel('Tìm nguyên liệu', { exact: true }).fill('');
    assert.equal(await firstVisit.getByRole('button', { name: 'Chọn Chưa có đơn vị', exact: true }).isDisabled(), true);
    assert.equal(await firstVisit.getByLabel('Đơn vị', { exact: true }).count(), 0);
    const expiry = carrot.getByLabel('Hạn dùng (số ngày còn lại)', { exact: true });
    await expiry.fill('7');
    assert.equal(await firstVisit.locator('select:visible').count(), 0);
    const date = await firstVisit.evaluate(() => {
      const d = new Date(); d.setDate(d.getDate() + 7);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
    await carrot.getByText('Hết hạn ngày ' + date.split('-').reverse().join('/'), { exact: true }).waitFor();
    await firstVisit.screenshot({ path: path.join(out, 'ingredient-inputs-mobile.png'), animations: 'disabled' });
    await firstVisit.setViewportSize({ width: 1280, height: 900 });
    await firstVisit.getByText('Thêm thực phẩm', { exact: true }).scrollIntoViewIfNeeded();
    await firstVisit.screenshot({ path: path.join(out, 'batch-ingredients-desktop.png'), animations: 'disabled' });
    await firstVisit.setViewportSize({ width: 375, height: 667 });
    await firstVisit.getByRole('button', { name: 'Lưu 2 nguyên liệu vào tủ', exact: true }).click();
    await firstVisit.getByRole('alert').waitFor();
    await carrot.getByText('200 g', { exact: true }).waitFor();
    assert.equal(await expiry.inputValue(), '7');
    await firstVisit.getByRole('button', { name: 'Lưu 2 nguyên liệu vào tủ', exact: true }).click();
    await firstVisit.getByRole('tab', { name: 'Kho thực phẩm', exact: true }).waitFor();
    const pantrySave = calls.filter(c => c.p === '/api/me/pantry/items/batch' && c.method === 'POST').at(-1);
    assert.equal(pantrySave.body.items.length, 2);
    assert.equal(pantrySave.body.items[0].expiredAt, new Date(date).toISOString());
    assert.equal(pantrySave.body.items[0].quantity, 200);
    assert.equal(pantrySave.body.items[0].unit, 'g');
    assert.equal(pantrySave.body.items[1].quantity, 200);
    assert.equal(pantrySave.body.items[1].unit, 'ml');
    assert.equal(pantrySave.body.items[1].expiredAt, null);
    assert.equal(calls.filter(c => c.p === '/api/me/pantry/items' && c.method === 'POST').length, 0);
    assert.equal(calls.filter(c => c.p === '/api/me/pantry/parse').length, 0);
    await firstVisit.getByRole('tab', { name: 'Kho thực phẩm', exact: true }).click();
    assert.equal(await firstVisit.getByRole('button', { name: 'Thêm bằng văn bản', exact: true }).count(), 0);
    await firstVisit.getByText('Cà rốt', { exact: true }).last().click();
    await firstVisit.getByText('Chỉnh sửa', { exact: true }).click();
    const editExpiry = firstVisit.getByLabel('Hạn dùng (số ngày còn lại)', { exact: true });
    await editExpiry.fill('7');
    await firstVisit.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await firstVisit.getByText('Đã cập nhật Cà rốt.', { exact: true }).waitFor();
    assert.equal(calls.filter(c => c.p === `/api/me/pantry/items/${iid}` && c.method === 'PUT').at(-1).body.expiredAt, new Date(date).toISOString());
    await firstVisit.getByText('Chỉnh sửa', { exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Xóa hạn dùng', exact: true }).click();
    await firstVisit.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await firstVisit.getByText('Chưa cung cấp', { exact: true }).waitFor();
    assert.equal(calls.filter(c => c.p === `/api/me/pantry/items/${iid}` && c.method === 'PUT').at(-1).body.expiredAt, null);
    await firstVisit.close();

    const admin = await open('ADMIN', 1280);
    await admin.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
    await admin.getByText('Vai trò và quyền truy cập', { exact: true }).waitFor();
    await admin.locator('select:visible').selectOption('MANAGER');
    await admin.getByRole('button', { name: 'Lưu vai trò', exact: true }).click();
    assert.equal(calls.filter(c => c.p === `/api/admin/users/${targetid}/role`)[0].body.role, 'MANAGER');
    await admin.screenshot({ path: path.join(out, 'role-desktop.png') });
    await admin.close();
    const catalog = await open('MANAGER');
    await catalog.getByText('Nguyên liệu', { exact: true }).last().click();
    await catalog.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
    await catalog.getByLabel('Tên gọi khác', { exact: true }).fill('Cà rốt Đà Lạt');
    await catalog.getByRole('button', { name: 'Thêm tên gọi', exact: true }).click();
    await catalog.getByRole('alert').waitFor();
    assert.equal(await catalog.getByLabel('Tên gọi khác', { exact: true }).inputValue(), 'Cà rốt Đà Lạt');
    await catalog.getByRole('button', { name: 'Thêm tên gọi', exact: true }).click();
    await catalog.getByRole('button', { name: 'Xóa tên Cà rốt Đà Lạt', exact: true }).click();
    await catalog.getByRole('button', { name: 'Xác nhận xóa tên gọi', exact: true }).click();
    await catalog.getByText('Chưa có tên gọi khác.', { exact: false }).waitFor();
    await catalog.screenshot({ path: path.join(out, 'aliases-mobile.png'), fullPage: true }); await catalog.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ status: 'passed', calls: calls.filter(c => c.method !== 'GET'), errors }, null, 2));
    console.log('PASS: batch ingredient selection, search, canonical units, +100/-100, remove/reselect, missing-unit disabled, batch failure/retry, fixed back header, clear quantity inputs, one-time survey, draggable AI without accidental chat, no automatic guides, separate OTP/password forms, leap-year date selectors, slider values saved, survey icons, orange selects, AI chat, reset failure/retry, pantry quantities, feedback, menu and completion failure/retry, role hierarchy, aliases, image confirmation; no browser runtime errors.');
  } catch (e) {
    for (const page of browser.contexts().flatMap(c => c.pages())) { await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }); console.error((await page.locator('body').innerText()).slice(-6000)); }
    throw e;
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
