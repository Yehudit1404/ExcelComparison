// Turns the Angular build into one HTML file that opens by double-click,
// with no web server and no internet connection.
// Run after `ng build`: node scripts/build-offline.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = 'dist/excel-comparison/browser';
const outDir = 'dist/offline';
const outFile = join(outDir, 'excel-comparison.html');

const read = (name) => readFileSync(join(buildDir, name), 'utf8');
// Keep "</script>" inside the code from closing the inline <script> tag.
const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script');

const chunks = readdirSync(buildDir).filter((name) => name.startsWith('chunk-'));
if (chunks.length) {
  throw new Error(`Lazy chunks cannot be inlined: ${chunks.join(', ')}`);
}

let html = read('index.html')
  .replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`)
  .replace(/<link rel="modulepreload"[^>]*>/g, '')
  .replace(/<noscript>.*?<\/noscript>/g, '')
  .replace(/<script src="([^"]+)" type="module"><\/script>/g, (_, src) =>
    `<script type="module">${safeScript(read(src))}</script>`,
  );

if (/<(script|link)[^>]+(src|href)="(?!data:)/.test(html)) {
  throw new Error('Some files were not inlined into the offline HTML file.');
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html);
console.log(`Offline file: ${outFile}`);
