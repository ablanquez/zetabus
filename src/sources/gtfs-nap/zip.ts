import { readFileSync, existsSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { IngestError } from '@/core';

/** Ficheros del GTFS que ZetaBus necesita. Si falta uno, no hay ingesta. */
export const REQUIRED_FILES = [
  'agency.txt',
  'routes.txt',
  'trips.txt',
  'stops.txt',
  'stop_times.txt',
  'shapes.txt',
  'feed_info.txt',
] as const;

export type GtfsFiles = Record<string, string>;

/**
 * Abre el ZIP y devuelve el texto de cada fichero.
 *
 * Falla RUIDOSAMENTE, y con una pista accionable, en los tres casos que
 * realmente pasan: no está, está corrupto, o le falta un fichero.
 */
export function readGtfsZip(path: string): GtfsFiles {
  if (!existsSync(path)) {
    throw new IngestError(
      `El GTFS no está en ${path}.`,
      'No se construye con datos vacíos: un mapa sin paradas que no se queja es peor que un error. ' +
        'Descárgalo con `npm run gtfs:fetch` (necesitas NAP_API_KEY en .env.local). Ver data/gtfs/README.md.',
    );
  }

  const bytes = readFileSync(path);
  if (bytes.length === 0) {
    throw new IngestError(`El GTFS está vacío (0 bytes): ${path}`, 'Vuelve a descargarlo.');
  }
  // Firma local de ZIP: "PK\x03\x04". Si no está, no es un ZIP —suele ser una
  // página de error HTML guardada con extensión .zip cuando la ApiKey falla.
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    const head = bytes.subarray(0, 120).toString('utf8').replace(/\s+/g, ' ');
    throw new IngestError(
      `El fichero no es un ZIP (no empieza por "PK"): ${path}\n  Empieza por: ${head}`,
      'Lo más probable: la descarga devolvió una página de error (ApiKey inválida o caducada) ' +
        'y se guardó con extensión .zip. Revisa NAP_API_KEY y vuelve a descargar.',
    );
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(bytes));
  } catch (e) {
    throw new IngestError(
      `El ZIP está corrupto o incompleto: ${path}\n  ${(e as Error).message}`,
      'Bórralo y vuelve a descargarlo. Una descarga cortada produce exactamente esto.',
    );
  }

  const files: GtfsFiles = {};
  const dec = new TextDecoder('utf-8');
  for (const [name, data] of Object.entries(entries)) {
    files[name.split('/').pop()!] = dec.decode(data);
  }

  const missing = REQUIRED_FILES.filter((f) => !(f in files));
  if (missing.length > 0) {
    throw new IngestError(
      `Al ZIP le faltan ficheros obligatorios: ${missing.join(', ')}\n` +
        `  Contiene: ${Object.keys(files).sort().join(', ')}`,
      'No es un GTFS válido para ZetaBus. Puede ser un feed de otra ciudad o una versión recortada.',
    );
  }
  return files;
}
