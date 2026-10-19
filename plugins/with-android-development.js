const fs = require('node:fs');
const path = require('node:path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

// Keep debug installs separate from signed releases, including after prebuild.
module.exports = function withAndroidDevelopment(config) {
  config = withAppBuildGradle(config, mod => {
    if (!mod.modResults.contents.includes("applicationIdSuffix '.dev'")) {
      const debug = /(buildTypes\s*\{\s*debug\s*\{)/;
      if (!debug.test(mod.modResults.contents)) throw new Error('Cannot locate Android debug build type');
      mod.modResults.contents = mod.modResults.contents.replace(debug, "$1\n            applicationIdSuffix '.dev'");
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const file = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'debug', 'AndroidManifest.xml');
    let xml = fs.readFileSync(file, 'utf8');
    xml = xml.replace(/<application\b([^>]*?)(\/?)>/, (_, attributes, closing) => {
      attributes = attributes.replace(/\sandroid:label="[^"]*"/, '');
      if (/tools:replace="/.test(attributes)) {
        attributes = attributes.replace(/tools:replace="([^"]*)"/, (_, values) =>
          `tools:replace="${[...new Set([...values.split(','), 'android:label'])].join(',')}"`);
      } else {
        attributes += ' tools:replace="android:label"';
      }
      return `<application${attributes} android:label="Z-Pantry Dev" ${closing}>`;
    });
    fs.writeFileSync(file, xml);
    return mod;
  }]);
};
