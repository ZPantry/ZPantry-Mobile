// Isolated local QA preview. Synthetic API responses never reach a real backend.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist/visual-qa');
const uid = '55f2f378-692a-4268-924e-e8c648190e32';
const image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80';
const ingredients = ['Trứng gà', 'Cà chua bi', 'Thịt bò', 'Rau cải xanh'].map((name, i) => ({ id: `ingredient-${i}`, name, normalizedName: name, category: 'Rau', unit: 'g', imageUrl: image, allergens: [] }));
let pantry = ingredients.map((item, i) => ({ id: `pantry-${i}`, ingredientId: item.id, ingredientName: item.name, quantity: 200, unit: 'g', storageLocation: 'fridge', expiredAt: '2099-10-08', note: '' }));
const recipes = ['Salad rau củ tươi ngon', 'Canh rau thanh mát', 'Bò xào rau củ', 'Trứng cuộn rau xanh'].map((name, i) => ({ id: `recipe-${i}`, name, imageUrl: image, cookingTimeMinutes: 15 + i * 5, difficulty: 'Easy', description: 'Bữa ăn từ nguyên liệu tươi ngon.', instructionText: '1. Rửa sạch nguyên liệu.\n2. Chế biến và thưởng thức.', servingSize: 2, ingredients: [{ ingredientId: ingredients[0].id, ingredientName: ingredients[0].name, quantity: 100, unit: 'g', isRequired: true }], allergens: [] }));
let profile = { id: uid, userId: uid, age: 25, height: 168, weight: 58, gender: 'Male', goal: 'HEALTHY_EATING', dietPreference: 'NONE', allergies: [] };
const accounts = new Map();
let accountName = 'Minh Anh';
let menu = [{ id: 'menu-1', recipeId: recipes[0].id, mealName: recipes[0].name, imageUrl: image, servingSize: 2, status: 'planned', plannedDate: new Date().toISOString().slice(0, 10), mealType: 'LUNCH' }];
http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    let raw = ''; for await (const chunk of req) raw += chunk;
    let body = {}; try { body = JSON.parse(raw); } catch {}
    const ok = data => res.end(JSON.stringify({ success: true, data, message: 'Đã lưu' }));
    const page = data => res.end(JSON.stringify({ success: true, data, pageIndex: 1, pageSize: 100, totalItems: data.length, hasNextPage: false }));
    const p = pathname;
    const fail = (status, message) => { res.writeHead(status); res.end(JSON.stringify({ success: false, message, data: null })); };
    if (p === '/api/Auth/register') {
      if (accounts.has(body.email)) return fail(409, 'Email already exists.');
      accounts.set(body.email, { verified: false });
      console.log('QA register', body.email);
      return ok(null);
    }
    if (p === '/api/Auth/verify-otp') {
      console.log('QA verify', body.email);
      if (!accounts.has(body.email) || body.otpCode !== '123456') return fail(400, 'Mã OTP không chính xác hoặc đã hết hạn.');
      accounts.get(body.email).verified = true;
      return ok(null);
    }
    if (p === '/api/Auth/resend-otp') return fail(404, 'Unsupported fixture endpoint');
    if (p === '/api/Auth/login') {
      if (body.password !== 'preview123') { res.writeHead(401); return res.end(JSON.stringify({ message: 'Sai email hoặc mật khẩu.' })); }
      return ok({ userId: uid, fullName: accountName, email: 'preview@example.invalid', role: body.email === 'admin@example.invalid' ? 'ADMIN' : 'USER', accessToken: 'fixture-preview', refreshToken: 'fixture-refresh', expiresAt: '2099-01-01T00:00:00Z' });
    }
    if (p === '/api/Auth/logout') return ok(null);
    if (p.endsWith('/profile')) { if (req.method === 'PUT') profile = { ...profile, ...body }; return ok(profile); }
    if (p === '/api/users') return page([{ id: uid, fullName: accountName, email: 'preview@example.invalid', role: 'USER' }]);
    if (p === '/api/users/' + uid && req.method === 'PUT') { accountName = body.fullName || accountName; return ok({ id: uid, fullName: accountName, email: 'preview@example.invalid', role: 'USER' }); }
    if (p === '/api/users/' + uid) return ok({ id: uid, fullName: accountName, email: 'preview@example.invalid', role: 'USER' });
    if (p === '/api/ingredients') return page(ingredients);
    if (p === '/api/recipes') return page(recipes);
    if (p.startsWith('/api/recipes/')) return ok(recipes.find(r => p.endsWith(r.id)) || recipes[0]);
    if (p === '/api/me/pantry') return page(pantry);
    if (p === '/api/me/pantry/items' && req.method === 'POST') {
      let item = pantry.find(item => item.ingredientId === body.ingredientId);
      if (!item) { item = { id: 'pantry-' + Date.now() }; pantry.push(item); }
      Object.assign(item, body, { ingredientName: ingredients.find(i => i.id === body.ingredientId)?.name });
      return ok(item);
    }
    if (p.startsWith('/api/me/pantry/items/')) {
      const id = p.split('/').at(-1), item = pantry.find(item => item.id === id);
      if (!item) return fail(404, 'Missing pantry item');
      if (req.method === 'DELETE') { pantry = pantry.filter(item => item.id !== id); return ok(null); }
      Object.assign(item, body); return ok(item);
    }
    if (p === '/api/me/today-menu') return page(menu.filter(item => item.plannedDate === new URL(req.url, 'http://localhost').searchParams.get('date')));
    if (p === '/api/me/today-menu/items' && req.method === 'POST') {
      const item = { id: 'menu-' + Date.now(), status: 'planned', ...body }; menu.push(item); return ok(item);
    }
    if (p.startsWith('/api/me/today-menu/items/')) {
      const id = p.split('/').at(-1), item = menu.find(item => item.id === id);
      if (req.method === 'DELETE') { menu = menu.filter(item => item.id !== id); return ok(null); }
      return item ? ok(item) : fail(404, 'Today menu item not found');
    }
    if (p === '/api/me/pantry/parse') return ok({ items: [{ name: 'Trứng gà', quantity: 2, unit: 'g', ingredientId: ingredients[0].id, ingredientName: ingredients[0].name, matched: true }] });
    if (p === '/api/recommendations/v2/meals') return ok({ items: recipes.map(r => ({ recipeId: r.id, recipeName: r.name, imageUrl: image, score: 0.85 })) });
    if (p === '/api/me/cooking-logs') return page([]);
    return fail(503, 'Dịch vụ hiện chưa khả dụng.');
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ttf': 'font/ttf' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(4179, '127.0.0.1', () => console.log('Static preview: http://127.0.0.1:4179'));
