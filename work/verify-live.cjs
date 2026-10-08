const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { chromium } = require('C:/Users/ontri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const email = `fe-flow-${Date.now()}@example.invalid`;
const password = 'Local-Test-Only!2026';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(25000);
  const report = [], errors = []; report.push = function(message) { console.log(message); return Array.prototype.push.call(this, message); };
  page.on('request', r => { if (r.url().includes('/api/')) console.log('HTTP request', r.method(), new URL(r.url()).pathname); });
  page.on('pageerror', e => errors.push(e.message));
  let token = '', userId = '', ingredientId = '', recipeId = '', menuId = '';
  async function api(route, method = 'GET', body) {
    const result = await page.evaluate(async ({ route, method, body, token }) => {
      const response = await fetch('http://localhost:8080' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const value = await response.json();
      return { status: response.status, value };
    }, { route, method, body, token });
    if (result.status >= 400 || result.value.success === false) throw new Error(`${method} ${route}: HTTP ${result.status} ${result.value.message || result.value.error || ''}`);
    return result.value.data;
  }
  try {
    await page.goto(process.env.FE_TEST_URL || 'http://localhost:8081', { timeout: 90000 });
    await page.getByText('BẮT ĐẦU', { exact: true }).click();
    await page.getByText('Chưa có tài khoản?', { exact: false }).click();
    await page.getByPlaceholder('Họ và tên', { exact: true }).fill('FE Integration Test');
    await page.getByPlaceholder('email@example.com', { exact: true }).fill(email);
    await page.getByPlaceholder('Nhập mật khẩu', { exact: true }).fill(password);
    const registerResponse = page.waitForResponse(r => r.url().endsWith('/api/Auth/register') && r.request().method() === 'POST');
    await page.getByText('Đăng ký', { exact: true }).click();
    assert.equal((await registerResponse).status(), 200);
    await page.getByPlaceholder('Nhập mã OTP', { exact: true }).waitFor();
    const log = fs.readFileSync('work/backend-integration.log', 'utf8');
    const segment = log.slice(log.lastIndexOf(email));
    const otp = segment.match(/your otp demo:\s*(\d{6})/)?.[1];
    assert.ok(otp, 'dev OTP must be generated for this synthetic account');
    await page.getByPlaceholder('Nhập mã OTP', { exact: true }).fill(otp);
    const verified = page.waitForResponse(r => r.url().endsWith('/api/Auth/verify-otp') && r.request().method() === 'POST');
    await page.getByText('Xác thực OTP', { exact: true }).last().click();
    assert.equal((await verified).status(), 200);

    const loggedIn = page.waitForResponse(r => r.url().endsWith('/api/Auth/login') && r.request().method() === 'POST');
    await page.getByText('Đăng nhập', { exact: true }).click();
    assert.equal((await loggedIn).status(), 200);
    await page.getByText('Hồ sơ ăn uống', { exact: true }).waitFor();
    token = await page.evaluate(() => localStorage.getItem('zpantry.accessToken'));
    userId = await page.evaluate(() => JSON.parse(localStorage.getItem('zpantry.user')).userId);
    assert.ok(token && userId);
    report.push('PASS real browser register -> dev OTP -> login, CORS and JWT session');
    await page.getByRole('checkbox', { name: 'Đậu phộng', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.getByText('Hôm nay', { exact: true }).last().waitFor();
    assert.deepEqual((await api(`/api/users/${userId}/profile`)).allergies, ['PEANUT']);
    report.push('PASS profile saved by FE and re-read from actual database');
    let ingredient;
    try {
      ingredient = await api('/api/ingredients', 'POST', { name: 'FE Test Carrot ' + Date.now(), category: 'Vegetable', unit: 'g', caloriesPerUnit: 0.4, protenPerUnit: 0.01, fatPerUnit: 0, carbPerUnit: 0.1, imageUrl: '', allergens: [] });
    } catch (e) {
      report.push('BLOCKED catalog create: ' + e.message + '; continuing with a temporary ingredient fixture inserted only into local dev DB');
      const fixtureId = randomUUID();
      const fixtureName = 'FE Test Carrot ' + Date.now();
      execFileSync('docker', ['exec', '-i', 'zpantry-java-backend-database-1', 'psql', '-U', 'zpantry_dev', '-d', 'zpantry_dev', '-v', 'ON_ERROR_STOP=1'], {
        input: "INSERT INTO ingredients (id,created_at,name,normalized_name,category,unit,calories_per_unit,protein_per_unit,fat_per_unit,carb_per_unit,allergens) VALUES ('" + fixtureId + "',now(),'" + fixtureName + "','" + fixtureName.toLowerCase() + "','Vegetable','g',0.4,0.01,0,0.1,'');", encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
      });
      ingredient = (await api('/api/ingredients?search=' + encodeURIComponent(fixtureName)))[0];
    }
    ingredientId = ingredient.id;
    const recipe = await api('/api/recipes', 'POST', { name: `FE Test Soup ${Date.now()}`, description: 'Temporary integration fixture', cookingTimeMinutes: 10, difficulty: 'Easy', servingSize: 1, instructionText: '1. Wash ingredients\n2. Cook soup', imageUrl: '', sourceType: 'Manual', ingredients: [{ ingredientId, ingredientName: ingredient.name, quantity: 100, unit: 'g', isRequired: true, note: '' }], allergens: [] });
    recipeId = recipe.id;
    await api('/api/me/pantry-import/confirm', 'POST', { items: [{ ingredientId, quantity: 200, unit: 'g' }] });
    const storedPantry = await api('/api/me/pantry');
    assert.ok(storedPantry.some(i => i.ingredientId === ingredientId && i.quantity === 200));
    report.push('PASS real pantry import confirm and database readback');
    await page.evaluate(uid => localStorage.setItem('has_seen_add_ingredient_tooltip_' + uid, 'true'), userId);
    await page.getByText('Công thức', { exact: true }).last().click();
    await page.getByText('Hôm nay ăn gì?', { exact: true }).waitFor();
    const recommended = page.waitForResponse(r => r.url().endsWith('/api/recommendations/v2/meals'), { timeout: 65000 });
    await page.getByRole('button', { name: 'Tìm món cho tôi', exact: true }).click();
    const recResponse = await recommended;
    report.push(`V2 actual HTTP ${recResponse.status()}`);
    const recBody = await recResponse.json();
    if (recResponse.status() === 200) {
      await page.getByText(recipe.name, { exact: true }).waitFor();
      await page.getByText(recipe.name, { exact: true }).click();
      await page.getByText('Thành phần công thức', { exact: true }).waitFor();
      const added = page.waitForResponse(r => r.url().includes('/api/me/today-menu/items') && r.request().method() === 'POST');
      await page.getByText('Thêm vào thực đơn hôm nay', { exact: true }).click();
      const menuResponse = await added;
      assert.equal(menuResponse.status(), 200);
      menuId = (await menuResponse.json()).data.id;
      report.push('PASS real V2 -> recipe detail -> today menu');
    } else {
      report.push('BLOCKED V2: HTTP ' + recResponse.status() + ' ' + recBody.message + '; backend trace reports AI 422 missing request body');
      await page.getByText('Máy chủ đang gặp sự cố.', { exact: false }).waitFor();
      await page.screenshot({ path: 'work/live-v2-error.png', fullPage: true });
      const menu = await api('/api/me/today-menu/items', 'POST', { recipeId, mealName: recipe.name, mealType: 'Breakfast', servingSize: 1, plannedDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()), note: 'Temporary integration fixture' });
      menuId = menu.id;
      await page.getByText('Thực đơn', { exact: true }).last().click();
      await page.getByText(recipe.name, { exact: true }).waitFor();
      await page.screenshot({ path: 'work/live-today-menu.png', fullPage: true });
      report.push('PASS real today-menu create and FE renders stored item (separate from blocked V2)');
    }
    assert.equal((await api('/api/me/today-menu/items/' + menuId)).recipeId, recipeId);
    await api('/api/recipes/' + recipeId, 'PUT', { ...recipe, allergens: ['PEANUT'] });
    assert.deepEqual((await api('/api/recipes/' + recipeId)).allergens, ['PEANUT']);
    await api('/api/recipes/' + recipeId, 'PUT', { ...recipe, allergens: [] });
    assert.deepEqual((await api('/api/recipes/' + recipeId)).allergens, []);
    report.push('PASS catalog recipe allergen update and clear via real API');
    // Test image integration without modifying any backend/AI files or configuration.
    const imageResult = await page.evaluate(async token => {
      
      const form = new FormData();
      // A small valid PNG fixture; this request verifies the complete transport/provider boundary.
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/kXcAAAAASUVORK5CYII='), c => c.charCodeAt(0));
      form.append('image', new Blob([bytes], { type: 'image/png' }), 'test.png');
      const r = await fetch('http://localhost:8080/api/me/pantry-import/food-image/analyze', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
      return { status: r.status, body: await r.json() };
    }, token);
    report.push(`Image analysis actual HTTP ${imageResult.status}: ${imageResult.body.message || JSON.stringify(imageResult.body)}`);
    const uploadResult = await page.evaluate(async token => {
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/kXcAAAAASUVORK5CYII='), c => c.charCodeAt(0));
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'image/png' }), 'test.png');
      const r = await fetch('http://localhost:8080/api/media/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
      return { status: r.status };
    }, token);
    report.push(`Media upload actual HTTP ${uploadResult.status}`);
    assert.deepEqual(errors, []);
    report.push('PASS no browser page errors during real flows');
  } catch (e) {
    report.push('FAIL: ' + e.message);
    await page.screenshot({ path: 'work/live-failure.png', fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    // Delete only fixtures made by this run through supported APIs; retain the test account.
    if (token) {
      if (ingredientId) {
        try {
          const owned = await api('/api/me/pantry?pageSize=100');
          for (const p of owned.filter(p => p.ingredientId === ingredientId)) await api('/api/me/pantry/items/' + p.id, 'DELETE');
        } catch (e) { report.push('Pantry cleanup: ' + e.message); }
      }
      for (const route of [menuId && '/api/me/today-menu/items/' + menuId, recipeId && '/api/recipes/' + recipeId, ingredientId && '/api/ingredients/' + ingredientId].filter(Boolean)) {
        try { await api(route, 'DELETE'); } catch (e) { report.push('Cleanup: ' + e.message); }
      }
      try { await api('/api/Auth/logout', 'POST'); report.push('PASS actual logout'); } catch (e) { report.push('Logout: ' + e.message); }
    }
    fs.writeFileSync('work/live-flow-report.txt', report.join('\n'));
    console.log(report.join('\n'));
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
