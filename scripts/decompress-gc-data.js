/**
 * Decompress .json.gz GC data files to .json during build.
 * Run via: node scripts/decompress-gc-data.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data', 'gc');

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json.gz'));
console.log(`Decompressing ${files.length} GC data files...`);

let totalIn = 0;
let totalOut = 0;

for (const file of files) {
  const gzPath = path.join(DATA_DIR, file);
  const jsonPath = gzPath.replace(/\.gz$/, '');

  const compressed = fs.readFileSync(gzPath);
  const decompressed = zlib.gunzipSync(compressed);

  fs.writeFileSync(jsonPath, decompressed);

  totalIn += compressed.length;
  totalOut += decompressed.length;

  if (files.length <= 10 || files.indexOf(file) % 20 === 0) {
    console.log(`  ${file} → ${(compressed.length/1024).toFixed(0)}K → ${(decompressed.length/1024).toFixed(0)}K`);
  }
}

console.log(`Done. ${files.length} files, ${(totalIn/1024/1024).toFixed(0)}MB → ${(totalOut/1024/1024).toFixed(0)}MB`);
