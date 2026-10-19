// Run after npm run build. Synthetic API data only; no real account is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist');
const output = path.resolve('scratch/mobile-ui');
fs.mkdirSync(output, { recursive: true });
const uid = '55f2f378-692a-4268-924e-e8c648190e32';
const ingredients = Array.from({ length: 4 }, (_, i) => ({ id: `ingredient-${i}`, name: `Rau củ hữu cơ dùng để nấu canh cho cả gia đình ${i + 1}`, unit: 'g', category: 'Rau', allergens: [] }));
const pantry = ingredients.map((item, i) => ({ id: `pantry-${i}`, ingredientId: item.id, ingredientName: item.name, quantity: 1500, unit: 'g', expiredAt: '2099-12-01', storageLocation: 'fridge' }));
const recipes = [{ id: 'recipe-1', name: 'Canh rau củ với thịt bằm và các loại nấm cho bữa tối gia đình', cookingTimeMinutes: 20, servingSize: 2, difficulty: 'Easy', instructionText: '1. Rửa rau\n2. Nấu chín', ingredients: [] }];
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + (new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const p = new URL(route.request().url()).pathname;
    let data = [];
    if (p.startsWith('/api/ingredients')) data = ingredients;
    if (p === '/api/me/pantry') data = pantry;
    if (p === '/api/recipes') data = recipes;
    if (p === '/api/recipes/recipe-1') data = recipes[0];
    if (p.includes('profile')) data = { birthDate: '1995-05-12', heightCm: 168, weightKg: 58, gender: 'FEMALE', activityLevel: 'LIGHT', goals: [], dietPreference: 'NONE', allergies: [] };
    if (p === '/api/me/subscription') data = { planCode: 'Z_FREE', status: 'ACTIVE', quotas: [] };
    if (p.includes('nutrition')) data = { targetCalories: 2000, consumedCalories: 800, remainingCalories: 1200 };
    await route.fulfill({ json: { success: true, data, pageIndex: 1, pageSize: 100, totalItems: Array.isArray(data) ? data.length : 1, hasNextPage: false } });
  });
  await page.addInitScript(({ uid }) => {
    localStorage.setItem('zpantry.accessToken', 'layout-fixture');
    localStorage.setItem('zpantry.refreshToken', 'layout-fixture');
    localStorage.setItem('zpantry.user', JSON.stringify({ userId: uid, fullName: 'Nguyễn Thị Thùy Linh với tên hiển thị rất dài', email: 'very.long.account.name.for.layout@example.invalid', role: 'USER', expiresAt: '2099-01-01T00:00:00Z' }));
    localStorage.setItem('onboarding_step_' + uid, 'done');
  }, { uid });
  async function navigate(name, params) {
    await page.evaluate(({ name, params }) => window.__navigate(name, params), { name, params });
    await page.waitForTimeout(400);
  }
  async function check(label) {
    const overflow = await page.evaluate(() => [...document.querySelectorAll('input,select,[role="button"],[role="tab"]')].flatMap(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || !el.checkVisibility()) return [];
      // Horizontal carousels intentionally extend beyond their clipping viewport.
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const s = getComputedStyle(parent);
        if (parent.getAttribute('aria-hidden') === 'true') return [];
        if (['auto', 'scroll'].includes(s.overflowX) && parent.scrollWidth > parent.clientWidth + 1) return [];
      }
      return r.left < -1 || r.right > innerWidth + 1 ? [{ label: el.getAttribute('aria-label') || el.textContent.slice(0, 60), left: r.left, right: r.right }] : [];
    }));
    assert.deepEqual(overflow, [], `${label}: controls must stay inside viewport`);
    await page.screenshot({ path: path.join(output, `${label}.png`) });
  }
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole('tab', { name: 'Kho thực phẩm' }).waitFor();
    for (const size of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 740, height: 360 }, { width: 1024, height: 768 }]) {
      await page.setViewportSize(size);
      for (const tab of ['Home', 'Pantry', 'MealSuggestion', 'Profile']) {
        await navigate('Tabs', { screen: tab });
        await check(`${tab}-${size.width}`);
      }
      await navigate('Tabs', { screen: 'Pantry' });
      const cards = page.getByRole('button', { name: /^Thực phẩm / });
      await cards.first().waitFor();
      const boxes = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
      if (size.width >= 740) assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 1, 'Grid must fit two columns including the gap');
      else assert.ok(boxes[1].y > boxes[0].y, 'Phone cards must use one column');
      const increase = page.getByRole('button', { name: /^Tăng số lượng / }).first();
      assert.ok((await increase.boundingBox()).width >= 48, 'Quantity target must be at least 48px');
      await navigate('Tabs', { screen: 'Profile' });
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
      const stay = page.getByRole('button', { name: 'Ở lại', exact: true });
      await stay.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const stayBox = await stay.boundingBox();
      assert.ok(stayBox.y >= 0 && stayBox.y + stayBox.height <= size.height, 'Dialog cancel action must be reachable');
      await check(`logout-${size.width}`);
      await stay.click();
    }
    await page.setViewportSize({ width: 320, height: 568 });
    for (const [name, params] of [['AccountSettings'], ['ProfileSetup', { editing: true }], ['AddIngredient'], ['PantryImport', { method: 'TEXT' }], ['ManualMealSuggestion'], ['RecipeDetail', { recipeId: 'recipe-1' }], ['Plan'], ['Subscription']]) {
      await navigate(name, params);
      await check(`${name}-320`);
    }
    // Exercise the native picker web fallback and fixed save action.
    await navigate('ProfileSetup', { editing: true });
    await page.getByLabel('Ngày sinh · Tháng', { exact: true }).last().selectOption('02');
    await check('birthday-picker-320');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    // Remove the authenticated initialization script by using a fresh context.
    const guest = await browser.newPage({ viewport: { width: 320, height: 568 } });
    await guest.goto(`http://127.0.0.1:${server.address().port}`);
    await guest.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    const password = guest.getByLabel('Mật khẩu', { exact: true });
    await password.waitFor();
    assert.ok((await password.boundingBox()).width >= 140, 'Password field needs usable typing width on a 320px phone');
    await guest.screenshot({ path: path.join(output, 'login-320.png') });
    await guest.getByText('Đăng ký ngay', { exact: true }).click();
    await guest.getByLabel('Xác nhận mật khẩu', { exact: true }).scrollIntoViewIfNeeded();
    await guest.screenshot({ path: path.join(output, 'register-320.png') });
    await guest.close();
    assert.deepEqual(errors, [], 'No runtime errors');
    console.log('PASS: mobile layout 320/390/430/740/1024, long content, grid columns, 48px quantity controls, scrollable dialogs, eight secondary screens and date picker.');
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png') });
    throw error;
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
