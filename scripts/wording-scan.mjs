// npm run scan:wording – fails if website texts contain forbidden wording.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listFiles, rel } from './lib/files.mjs';
import { SCAN_DIRS, SCAN_EXTS, scanText } from './lib/wording.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

export function scanProject(dir = root) {
  const results = [];
  for (const d of SCAN_DIRS) {
    for (const file of listFiles(path.join(dir, d), SCAN_EXTS)) {
      for (const f of scanText(readFileSync(file, 'utf8'))) results.push({ file: rel(dir, file), ...f });
    }
  }
  return results;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const results = scanProject();
  if (results.length === 0) {
    console.log('Wording-Scan: keine verbotenen Begriffe gefunden.');
  } else {
    console.error(`Wording-Scan: ${results.length} Fund(e):`);
    for (const r of results) console.error(`  ${r.file}:${r.line}:${r.column}  „${r.match}"  → ${r.hint}`);
    process.exit(1);
  }
}
