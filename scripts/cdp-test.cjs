const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const userDataDir = path.join(__dirname, '..', 'scratch', 'chrome-profile');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

async function run() {
  console.log('Starting headless Chrome on port 9222...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:8085'
  ]);

  chrome.on('error', (err) => console.error('Chrome spawn error:', err));

  // Wait for remote debugging to be ready
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error('Could not connect to Chrome debugging port.');
    chrome.kill();
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log('Connecting to page WebSocket:', pageTarget.webSocketDebuggerUrl);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 1;
  const pending = new Map();
  const consoleMessages = [];
  const exceptions = [];

  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      consoleMessages.push({ type: data.params.type, text });
      console.log(`[Browser Console ${data.params.type}]`, text);
    } else if (data.method === 'Runtime.exceptionThrown') {
      const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
      exceptions.push(desc);
      console.error('[Browser Exception]', desc);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 780,
    deviceScaleFactor: 2,
    mobile: true
  });

  console.log('Navigating to http://127.0.0.1:8085...');
  await send('Page.navigate', { url: 'http://127.0.0.1:8085' });

  // Wait 4 seconds for app initialization
  await new Promise(r => setTimeout(r, 4000));

  // Take initial screenshot
  const ss1 = await send('Page.captureScreenshot', { format: 'png' });
  const outPath1 = path.join(__dirname, '..', 'scratch', 'screen_initial_360.png');
  fs.writeFileSync(outPath1, Buffer.from(ss1.data, 'base64'));
  console.log('Saved screenshot to:', outPath1);

  // Evaluate document title and visible text
  const domResult = await send('Runtime.evaluate', {
    expression: 'document.body.innerText'
  });
  console.log('Visible text snippet:', (domResult.result?.value || '').slice(0, 300));

  // Test tablet viewport 800x1200
  console.log('Testing tablet viewport 800x1200...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 800,
    height: 1200,
    deviceScaleFactor: 2,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 1500));
  const ss2 = await send('Page.captureScreenshot', { format: 'png' });
  const outPath2 = path.join(__dirname, '..', 'scratch', 'screen_tablet_800.png');
  fs.writeFileSync(outPath2, Buffer.from(ss2.data, 'base64'));
  console.log('Saved tablet screenshot to:', outPath2);

  // Test landscape viewport 900x500
  console.log('Testing landscape viewport 900x500...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 500,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 1500));
  const ss3 = await send('Page.captureScreenshot', { format: 'png' });
  const outPath3 = path.join(__dirname, '..', 'scratch', 'screen_landscape_900.png');
  fs.writeFileSync(outPath3, Buffer.from(ss3.data, 'base64'));
  console.log('Saved landscape screenshot to:', outPath3);

  console.log('--- SUMMARY ---');
  console.log('Console messages count:', consoleMessages.length);
  console.log('Exceptions count:', exceptions.length);
  if (exceptions.length > 0) {
    console.error('Exceptions encountered:');
    exceptions.forEach(e => console.error('-', e));
  } else {
    console.log('SUCCESS: No runtime exceptions encountered!');
  }

  ws.close();
  chrome.kill();
  process.exit(exceptions.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
