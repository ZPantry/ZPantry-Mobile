const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const configFile = path.join(root, '.android.local.json');
let config = {};
try {
  if (fs.existsSync(configFile)) config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (error) {
  console.error(`Cannot read ${configFile}: ${error.message}`);
  process.exit(1);
}

// Machine-specific paths stay out of Git and do not change system Java settings.
const env = { ...process.env };
if (config.javaHome) env.JAVA_HOME = config.javaHome;
if (config.androidHome) env.ANDROID_HOME = config.androidHome;
const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'PATH';
env[pathKey] = [
  env.JAVA_HOME && path.join(env.JAVA_HOME, 'bin'),
  env.ANDROID_HOME && path.join(env.ANDROID_HOME, 'platform-tools'),
  env[pathKey]
].filter(Boolean).join(path.delimiter);

const suffix = process.platform === 'win32' ? '.exe' : '';
const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', `java${suffix}`) : 'java';
const javac = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', `javac${suffix}`) : 'javac';
const runtime = spawnSync(java, ['-version'], { env, encoding: 'utf8' });
const compiler = spawnSync(javac, ['-version'], { env, encoding: 'utf8' });
const versionText = `${runtime.stdout || ''}${runtime.stderr || ''}`;
const version = versionText.match(/version "(?:1\.)?(\d+)/);
if (runtime.status !== 0 || compiler.status !== 0 || !version || Number(version[1]) < 17) {
  console.error('Android build requires a working JDK 17 or newer (java AND javac).');
  console.error('Set JAVA_HOME, or add javaHome and androidHome to .android.local.json.');
  console.error(versionText.trim() || runtime.error?.message || 'Java was not found.');
  process.exit(1);
}

console.log(`Android build: ${versionText.split(/\r?\n/)[0]}`);
const expoCli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'run:android', ...process.argv.slice(2)], {
  cwd: root, env, stdio: 'inherit'
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
