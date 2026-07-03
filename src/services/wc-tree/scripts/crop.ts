import sharp from 'sharp';
const img = process.argv[2];
const crops: [string, number, number, number, number][] = [
  ['ref-r32-left', 10, 185, 190, 130],   // pre-printed R32 reference cell (Germany/Paraguay)
  ['mine-r16-left', 205, 205, 165, 130],  // my R16 box (Paraguay/France)
  ['ref-r32-right', 1090, 185, 190, 130], // pre-printed R32 reference (Brazil/Japan)
  ['mine-r16-right', 900, 205, 170, 130], // my R16 box (Brazil/Norway)
];
(async () => {
  for (const [name, left, top, width, height] of crops) {
    await sharp(img).extract({ left, top, width, height }).resize({ width: width * 3 }).toFile(`/tmp/${name}.png`);
    console.log('wrote', name);
  }
})();
