// npm run audit – `npm audit` that fails on High/Critical, except for advisories that are
// listed in scripts/audit-allowlist.json with reason and expiry date (reviewed by the architect).
// An expired entry fails again, so every exception is re-checked.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const allowlist = JSON.parse(readFileSync(path.join(root, 'scripts/audit-allowlist.json'), 'utf8'));
const omitDev = process.argv.includes('--omit=dev');

let raw;
try {
  raw = execFileSync('npm', ['audit', '--json', ...(omitDev ? ['--omit=dev'] : [])], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  raw = e.stdout; // npm audit exits 1 when it finds anything
}
const report = JSON.parse(raw);
if (report.error) {
  console.error('npm audit fehlgeschlagen:', report.error.summary ?? report.error);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const advisories = new Map();
for (const v of Object.values(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via === 'object') advisories.set(via.url, { ...via, pkg: v.name });
  }
}

let failed = false;
for (const a of advisories.values()) {
  if (!['high', 'critical'].includes(a.severity)) {
    console.log(`  (${a.severity}) ${a.pkg}: ${a.title} ${a.url}`);
    continue;
  }
  const ghsa = a.url.split('/').pop();
  const entry = allowlist.find((e) => e.id === ghsa);
  if (entry && entry.bis >= today) {
    console.warn(`  akzeptiert bis ${entry.bis}: ${ghsa} ${a.pkg} (${a.severity}) – ${entry.grund}`);
  } else {
    failed = true;
    console.error(`  OFFEN: ${ghsa} ${a.pkg} (${a.severity}) ${a.title}${entry ? ` – Ausnahme abgelaufen am ${entry.bis}` : ''}`);
  }
}
const m = report.metadata.vulnerabilities;
console.log(`npm audit: critical ${m.critical}, high ${m.high}, moderate ${m.moderate}, low ${m.low}.`);
if (failed) process.exit(1);
console.log('Audit ok (keine High/Critical außer dokumentierten Ausnahmen).');
