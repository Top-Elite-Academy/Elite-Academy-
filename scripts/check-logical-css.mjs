#!/usr/bin/env node
/**
 * RTL guard (spec §10): the web app must use logical directions (start/end),
 * never physical ones (left/right), so Arabic and Hebrew mirror correctly.
 *   Tailwind: ms-4 / me-4 / ps-4 / pe-4 / start-0 / end-0 / text-start / border-s / rounded-s
 *   CSS:      margin-inline-start / padding-inline-end / inset-inline-start / text-align: start
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../apps/web/src');
const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

const TAILWIND_PHYSICAL =
  /(?<![\w-])-?(?:ml|mr|pl|pr|left|right|border-[lr]|rounded-(?:[lr]|tl|tr|bl|br)|scroll-m[lr]|scroll-p[lr])-[\w./[\]-]+|(?<![\w-])(?:text|float|clear)-(?:left|right)(?![\w-])/g;
const CSS_PHYSICAL =
  /(?:margin|padding|border)-(?:left|right)\s*:|(?<![\w-])(?:left|right)\s*:|text-align\s*:\s*(?:left|right)/g;

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(full))) yield full;
  }
}

const problems = [];
for (const file of walk(ROOT)) {
  const pattern = file.endsWith('.css') ? CSS_PHYSICAL : TAILWIND_PHYSICAL;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (COMMENT_LINE.test(line)) return; // comments may mention "left-to-right"
      for (const match of line.matchAll(pattern)) {
        problems.push(`${path.relative(process.cwd(), file)}:${index + 1}  "${match[0]}"`);
      }
    });
}

if (problems.length > 0) {
  console.error('Use logical CSS (start/end) instead of left/right:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('Logical CSS check passed.');
