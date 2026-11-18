import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', 'test-results', 'playwright-report']);

/** Recursively lists files below dir whose extension is in exts. Missing dirs yield []. */
export function listFiles(dir, exts) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) out.push(...listFiles(p, exts));
    } else if (exts.includes(path.extname(e.name).toLowerCase()) && statSync(p).isFile()) {
      out.push(p);
    }
  }
  return out.sort();
}

export const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');
