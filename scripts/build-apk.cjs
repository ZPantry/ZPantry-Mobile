// Local signed release build. Secrets stay in the ignored credentials.json file
// downloaded with `eas credentials -p android`, and in child-process environment.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const local = JSON.parse(fs.readFileSync(path.join(root, '.android.local.json'), 'utf8'));
const credentials = JSON.parse(fs.readFileSync(path.join(root, 'credentials.json'), 'utf8')).android.keystore;
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const env = { ...process.env, CI: '1', JAVA_HOME: local.javaHome, ANDROID_HOME: local.androidHome, NODE_ENV: 'production' };
const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
env[pathKey] = [path.join(local.javaHome, 'bin'), path.join(local.androidHome, 'platform-tools'), env[pathKey]].join(path.delimiter);
env.ZPANTRY_RELEASE_KEYSTORE = path.resolve(root, credentials.keystorePath);
env.ZPANTRY_RELEASE_STORE_PASSWORD = credentials.keystorePassword;
env.ZPANTRY_RELEASE_KEY_ALIAS = credentials.keyAlias;
env.ZPANTRY_RELEASE_KEY_PASSWORD = credentials.keyPassword;
for (const key of ['ZPANTRY_RELEASE_KEYSTORE', 'ZPANTRY_RELEASE_STORE_PASSWORD', 'ZPANTRY_RELEASE_KEY_ALIAS', 'ZPANTRY_RELEASE_KEY_PASSWORD']) {
  if (!env[key]) throw new Error(`Missing signing configuration: ${key}`);
}
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const expo = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
run(process.execPath, [expo, 'prebuild', '--platform', 'android', '--no-install', '--template', 'expo-template-bare-minimum@56.0.37']);
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
// Generated native files are ignored. Regenerate them on every invocation so
// app.json supplies the version, orientation, plugins and permissions.
if (!gradle.includes('ZPANTRY_RELEASE_KEYSTORE')) {
  if (!/signingConfigs\s*\{/.test(gradle)) throw new Error('Missing signingConfigs in generated Android project');
  gradle = gradle.replace(/signingConfigs\s*\{/, `signingConfigs {
        zpantryRelease {
            storeFile file(System.getenv('ZPANTRY_RELEASE_KEYSTORE'))
            storePassword System.getenv('ZPANTRY_RELEASE_STORE_PASSWORD')
            keyAlias System.getenv('ZPANTRY_RELEASE_KEY_ALIAS')
            keyPassword System.getenv('ZPANTRY_RELEASE_KEY_PASSWORD')
        }`);
}
const release = /(release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.(?:debug|zpantryRelease)/;
if (!release.test(gradle)) throw new Error('Missing release signing assignment');
gradle = gradle.replace(release, '$1signingConfigs.zpantryRelease');
fs.writeFileSync(gradlePath, gradle);
const propertiesPath = path.join(root, 'android', 'gradle.properties');
const properties = fs.readFileSync(propertiesPath, 'utf8');
fs.writeFileSync(propertiesPath, properties.replace(/^org\.gradle\.jvmargs=.*$/m, 'org.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m'));
run('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat :app:assembleRelease --console=plain --no-daemon --max-workers=4 -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64'], path.join(root, 'android'));
const output = path.join(root, 'outputs', 'apk', app.version);
fs.mkdirSync(output, { recursive: true });
const name = `Z-Pantry-${app.version}.apk`;
const apk = path.join(output, name);
fs.copyFileSync(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), apk);
const hash = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex');
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), `${hash}  ${name}\n`);
console.log(`Signed release APK: ${apk}\nSHA-256: ${hash}`);
