#!/usr/bin/env node
/**
 * Lint YAML frontmatter in MDX files.
 * Catches unquoted colons and other YAML parsing errors that break Next.js builds.
 *
 * Usage: node scripts/lint-frontmatter.mjs [files...]
 *   If no files given, globs site/pages/**\/*.mdx
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { parse as parseYaml } from 'yaml';

function globMdx(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name); // nosemgrep: path-join-resolve-traversal
    if (entry.isDirectory()) {
      results.push(...globMdx(full));
    } else if (entry.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
}

function extractFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('---', 3);
  if (end === -1) return null;
  return content.slice(3, end).trim();
}

const files = process.argv.length > 2
  ? process.argv.slice(2)
  : globMdx('site/pages');

let errors = 0;

for (const file of files) {
  try {
    statSync(file);
  } catch {
    console.error(`File not found: ${file}`);
    errors++;
    continue;
  }

  const content = readFileSync(file, 'utf8');
  const fm = extractFrontmatter(content);
  if (fm === null) continue; // No frontmatter, skip

  try {
    parseYaml(fm);
  } catch (err) {
    const rel = relative(process.cwd(), file);
    console.error(`${rel}: ${err.message}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} frontmatter error(s) found.`);
  process.exit(1);
} else {
  console.log(`${files.length} file(s) checked, no frontmatter errors.`);
}
