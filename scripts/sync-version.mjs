#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;

const files = [
  join(__dirname, '..', 'docs', 'index.html'),
  join(__dirname, '..', 'docs', 'ko', 'index.html'),
];

let updated = 0;
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const next = content.replace(
    /(<div class="hero-badge">v)[\d.]+( &mdash;)/,
    `$1${version}$2`,
  );
  if (content !== next) {
    writeFileSync(file, next);
    updated++;
  }
}

console.log(`Synced landing pages to v${version} (${updated} file(s) updated)`);
