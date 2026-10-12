const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const userDataDir = path.join(__dirname, 'chrome-profile-sub');

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:8081/subscription'
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:9224/json/list');
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (e) {}
  }

  if (!targets) {
    console.log('No targets found');
    chrome.kill();
    return;
  }

  const page = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const calls = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && calls.has(m.id)) {
      calls.get(m.id)(m);
      calls.delete(m.id);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      console.log('Console:', m.params.args.map(a => a.value || a.description).join(' '));
    }
  };
  await new Promise(r => ws.onopen = r);
  const send = (method, params = {}) => new Promise(r => {
    const cur = id++;
    calls.set(cur, r);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:8081/subscription' });
  await new Promise(r => setTimeout(r, 3000));

  const urlRes = await send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Current URL:', urlRes.result?.value);

  const textRes = await send('Runtime.evaluate', { expression: 'document.body.innerText' });
  console.log('Body Text:\n', textRes.result?.value);

  const ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(__dirname, 'sub_screen.png'), Buffer.from(ss.result.data, 'base64'));
  console.log('Screenshot saved.');

  ws.close();
  chrome.kill();
}
main();
