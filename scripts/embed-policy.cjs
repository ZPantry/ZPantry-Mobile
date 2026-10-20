const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const privacyFilename = 'chinh_sach_quyen_rieng_tu_z_pantry.html';
const privacySource = path.join(root, privacyFilename);
fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(privacySource, path.join(root, 'policy.html'));
fs.copyFileSync(privacySource, path.join(publicDir, 'policy.html'));
fs.copyFileSync(privacySource, path.join(publicDir, privacyFilename));
for (const name of ['policy', 'terms']) {
  const html = fs.readFileSync(path.join(root, `${name}.html`), 'utf8');
  const target = path.join(root, 'src', 'generated', `${name}Html.ts`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `// Generated from ${name}.html by npm run policy:embed.\nexport const ${name}Html = ${JSON.stringify(html)};\n`, 'utf8');
}
