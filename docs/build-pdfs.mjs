#!/usr/bin/env node
/**
 * Headless PDF builder for the ATLANTIS docs.
 * Requires puppeteer as a devDependency:  npm i -D puppeteer
 *
 * Renders docs/*.html → docs/*.pdf at A4 portrait, preserving backgrounds.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const targets = ['USER_MANUAL.html', 'ARCHITECTURE.html'];

let puppeteer;
try {
  puppeteer = (await import('puppeteer')).default;
} catch {
  console.error('Puppeteer not installed. Run: npm i -D puppeteer');
  process.exit(1);
}

const browser = await puppeteer.launch();
for (const file of targets) {
  const src = path.join(here, file);
  if (!fs.existsSync(src)) {
    console.warn(`skip ${file} — not found`);
    continue;
  }
  const out = src.replace(/\.html$/, '.pdf');
  const page = await browser.newPage();
  await page.goto(pathToFileURL(src).toString(), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  console.log(`✓ ${path.basename(out)}`);
  await page.close();
}
await browser.close();
