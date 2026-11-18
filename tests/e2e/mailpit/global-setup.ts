// Starts Mailpit (Docker, compose.test.yml) for the contact form E2E tests and stops it afterwards.
// E2E_MAILPIT=extern: use an already running Mailpit on 127.0.0.1:1025/8025 (nothing is started).
import { execFileSync } from 'node:child_process';
import { COMPOSE_DATEI, MAILPIT_API, mailpitZertifikat } from './umgebung.ts';

function compose(...args: string[]) {
  execFileSync('docker', ['compose', '-f', COMPOSE_DATEI, ...args], {
    stdio: 'inherit',
    env: { ...process.env, MAILPIT_CERT_DIR: mailpitZertifikat().dir },
  });
}

export default async function globalSetup() {
  const extern = process.env.E2E_MAILPIT === 'extern';
  if (!extern) {
    try {
      compose('up', '-d', '--wait', '--quiet-pull');
    } catch {
      throw new Error('Mailpit konnte nicht gestartet werden (Docker nötig, siehe CLAUDE.md). Alternativ E2E_MAILPIT=extern mit laufendem Mailpit.');
    }
  }
  const ende = Date.now() + 20_000;
  for (;;) {
    try {
      const r = await fetch(`${MAILPIT_API}/api/v1/info`);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > ende) throw new Error(`Mailpit unter ${MAILPIT_API} nicht erreichbar`);
    await new Promise((r) => setTimeout(r, 300));
  }
  return async () => {
    if (!extern) compose('down', '--volumes', '--timeout', '2');
  };
}
