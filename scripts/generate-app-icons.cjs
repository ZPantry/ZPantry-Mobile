// Package the existing Z-Pantry brand mark as launcher icons without redrawing it.
const path = require('node:path');
const Jimp = require('jimp-compact');

async function main() {
  const images = path.resolve(__dirname, '../assets/images');
  const app = require('../app.json').expo;
  const background = Jimp.cssColorToHex(app.android.adaptiveIcon.backgroundColor);
  const logo = await Jimp.read(path.join(images, 'z-pantry-logo.png'));
  // The left-hand Z and chef's hat are the compact mark from the wordmark.
  const mark = logo.clone().crop(16, 12, 126, 106).autocrop();
  const centered = (width, background) => {
    const symbol = mark.clone().resize(width, Jimp.AUTO, Jimp.RESIZE_BICUBIC);
    return new Jimp(1024, 1024, background).composite(symbol,
      Math.round((1024 - symbol.bitmap.width) / 2),
      Math.round((1024 - symbol.bitmap.height) / 2));
  };
  const icon = centered(720, background);
  await icon.clone().colorType(2).writeAsync(path.join(images, 'icon.png'));
  // Keep the symbol inside the adaptive icon safe zone for all launcher masks.
  const foreground = centered(480, 0x00000000);
  await foreground.writeAsync(path.join(images, 'android-icon-foreground.png'));
  const monochrome = foreground.clone();
  monochrome.scan(0, 0, 1024, 1024, function (x, y, index) {
    this.bitmap.data[index] = 255;
    this.bitmap.data[index + 1] = 255;
    this.bitmap.data[index + 2] = 255;
  });
  await monochrome.writeAsync(path.join(images, 'android-icon-monochrome.png'));
  await icon.clone().resize(64, 64).writeAsync(path.join(images, 'favicon.png'));
  console.log('Generated Z-Pantry launcher icons from the existing brand logo.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
