// A free TCP port on 127.0.0.1, synchronously (Playwright config and Vitest setup are synchronous
// at the point where the port is needed). Small race until the server binds it; the E2E run ID
// check on /healthz (server/server.mjs) catches a foreign server on the same port.
import { execFileSync } from 'node:child_process';

const SKRIPT =
  "const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close();});";

export function freierPort(): number {
  const port = Number(execFileSync(process.execPath, ['-e', SKRIPT], { encoding: 'utf8', timeout: 10_000 }).trim());
  if (!Number.isInteger(port) || port <= 0) throw new Error('Kein freier Port gefunden');
  return port;
}
