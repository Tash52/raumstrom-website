// Runs the Astro CLI with telemetry disabled (no requests to foreign hosts), cross-platform.
// Usage: node scripts/astro.mjs <astro args> [--staging]
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
// `--staging` is ours, not Astro's: keeps acceptance-only pages (e.g. /styleguide/) in the build.
const args = process.argv.slice(2);
const staging = args.includes('--staging');
const child = spawn(process.execPath, [bin, ...args.filter((a) => a !== '--staging')], {
  stdio: 'inherit',
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', ...(staging ? { RAUMSTROM_STAGING: '1' } : {}) },
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
