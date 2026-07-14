/**
 * Sacar un fichero de un ZIP sin dependencias. El GTFS del NAP viene en zip y el
 * proyecto ya tenía un lector; esto es el mismo, expuesto para los scripts de
 * exploración (que corren en el build, nunca en runtime).
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

export function ficheroDelZip(rutaZip: string, nombre: string): string {
  const b = readFileSync(rutaZip);
  let i = b.length - 22;
  while (i > 0 && b.readUInt32LE(i) !== 0x06054b50) i--;
  let off = b.readUInt32LE(i + 16);
  const n = b.readUInt16LE(i + 10);
  for (let k = 0; k < n; k++) {
    const len = b.readUInt16LE(off + 28);
    const name = b.toString('utf8', off + 46, off + 46 + len);
    const lho = b.readUInt32LE(off + 42);
    const method = b.readUInt16LE(off + 10);
    const csize = b.readUInt32LE(off + 20);
    if (name === nombre) {
      const nlen = b.readUInt16LE(lho + 26);
      const elen = b.readUInt16LE(lho + 28);
      const data = b.subarray(lho + 30 + nlen + elen, lho + 30 + nlen + elen + csize);
      return (method === 0 ? data : inflateRawSync(data)).toString('utf8');
    }
    off += 46 + len + b.readUInt16LE(off + 30) + b.readUInt16LE(off + 32);
  }
  throw new Error(`el zip no contiene ${nombre}`);
}
