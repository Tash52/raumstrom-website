// Build post-step: writes .br and .gz next to static text files in dist/client, so
// server/static.mjs can send them without compressing per request. Only node:zlib.
import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { COMPRESSIBLE, PRECOMPRESSED } from '../../server/static.mjs';

const br = promisify(brotliCompress);
const gz = promisify(gzip);

/** Below this size the compressed variant rarely saves a packet. */
export const MIN_BYTES = 512;

const ENCODERS = {
  br: (buf) => br(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
  gzip: (buf) => gz(buf, { level: 9 }),
};

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile()) yield p;
  }
}

/**
 * @param {string} dir dist/client
 * @returns {Promise<{ files: number, written: number, bytesIn: number, bytesBr: number }>}
 */
export async function precompress(dir) {
  const result = { files: 0, written: 0, bytesIn: 0, bytesBr: 0 };
  for await (const file of walk(dir)) {
    if (PRECOMPRESSED.some((v) => file.endsWith(v.ext))) continue;
    if (!COMPRESSIBLE.includes(path.extname(file).toLowerCase())) continue;
    const { size } = await stat(file);
    // Stale variants from an earlier build must never outlive their source.
    for (const v of PRECOMPRESSED) await rm(file + v.ext, { force: true });
    if (size < MIN_BYTES) continue;
    const buf = await readFile(file);
    result.files++;
    result.bytesIn += buf.length;
    for (const v of PRECOMPRESSED) {
      const out = await ENCODERS[v.encoding](buf);
      if (out.length >= buf.length) continue; // no gain, serve the original
      await writeFile(file + v.ext, out);
      result.written++;
      if (v.encoding === 'br') result.bytesBr += out.length;
    }
  }
  return result;
}
