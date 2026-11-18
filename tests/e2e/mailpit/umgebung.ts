// Shared settings for the Mailpit E2E tests (backend-api). Used by playwright.config.ts (synchronously,
// before the web server starts) and by the global setup.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const MAILPIT_API = 'http://127.0.0.1:8025';
export const MAILPIT_SMTP_PORT = 1025;
/** Recipient while firma.kontakt.anfragen_empfaenger is a placeholder (MAIL_TO_STAGING). */
export const TEST_EMPFAENGER = 'eingang@raumstrom.test';
export const COMPOSE_DATEI = path.join(ROOT, 'compose.test.yml');
export const CERT_DIR = path.join(ROOT, 'node_modules', '.cache', 'raumstrom-mailpit');

/**
 * Throwaway self-signed certificate for 127.0.0.1/localhost (test only, regenerated when missing).
 * The server trusts it through NODE_EXTRA_CA_CERTS; certificate checks in the app stay on.
 */
export function mailpitZertifikat(): { dir: string; cert: string } {
  const cert = path.join(CERT_DIR, 'cert.pem');
  const key = path.join(CERT_DIR, 'key.pem');
  if (!existsSync(cert) || !existsSync(key)) {
    mkdirSync(CERT_DIR, { recursive: true });
    execFileSync(
      'openssl',
      ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost', '-keyout', key, '-out', cert],
      { stdio: 'ignore' },
    );
    // Readable for the container user (throwaway test key).
    execFileSync('chmod', ['644', key, cert]);
  }
  return { dir: CERT_DIR, cert };
}
