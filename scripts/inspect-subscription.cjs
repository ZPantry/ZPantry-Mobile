const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const userDataDir = path.join(__dirname, '..', 'scratch', 'chrome-profile-sub');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

async function run() {
  console.log('Connecting to Chrome...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:8081/subscription'
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9223/json/list');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error('Could not connect to Chrome port 9223');
    chrome.kill();
    process.exit(1);
  }

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 1;
  const pending = new Map();
  const consoleMessages = [];

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
      console.log(`[Browser Console ${data.params.type}]`, text);
    } else if (data.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', data.params.exceptionDetails);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  console.log('Navigating to http://localhost:8081/subscription...');
  await send('Page.navigate', { url: 'http://localhost:8081/subscription' });

  await new Promise(r => setTimeout(r, 4000));

  const textRes = await send('Runtime.evaluate', {
    expression: 'document.body.innerText'
  });
  console.log('BODY TEXT:\n', textRes.result?.value);

  const ss = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'scratch', 'subscription_page.png');
  fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
  console.log('Saved screenshot to:', outPath);

  ws.close();
  chrome.kill();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
