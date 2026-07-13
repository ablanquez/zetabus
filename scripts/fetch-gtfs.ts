/**
 * Descarga el GTFS del NAP (fichero 1176, «Transporte urbano de Zaragoza»).
 *
 * No se versiona en el repositorio: caduca, cambia cada pocos meses y pesa
 * 6,6 MB. Ver data/gtfs/README.md.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const FILE_ID = '1176';
const URL_ = `https://nap.transportes.gob.es/api/Fichero/download/${FILE_ID}`;
const OUT = 'data/gtfs/zaragoza-gtfs.zip';

const key = process.env.NAP_API_KEY?.trim();
if (!key) {
  console.error(
    '\n⛔ Falta NAP_API_KEY.\n\n' +
      '   1. Regístrate (gratis) en https://nap.transportes.gob.es\n' +
      '   2. Copia la ApiKey de tu perfil\n' +
      '   3. Ponla en .env.local:  NAP_API_KEY=...\n\n' +
      '   Ver data/gtfs/README.md\n',
  );
  process.exit(1);
}

const res = await fetch(URL_, { headers: { ApiKey: key } });

if (!res.ok) {
  console.error(
    `\n⛔ El NAP respondió ${res.status} ${res.statusText}.\n` +
      (res.status === 401 || res.status === 403
        ? '   La ApiKey es inválida o ha caducado. Renuévala en tu perfil del NAP.\n'
        : '   Puede ser un problema temporal del NAP. Reintenta.\n'),
  );
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());

// El NAP devuelve 200 con una página de error cuando algo va mal. Un ZIP
// empieza por "PK". Si no, NO lo guardamos: guardarlo produciría un fichero
// llamado .zip que no es un zip, y el error aparecería tres pasos más tarde.
if (!(buf[0] === 0x50 && buf[1] === 0x4b)) {
  console.error(
    `\n⛔ La respuesta no es un ZIP (${buf.length} bytes, empieza por "${buf.subarray(0, 40).toString('utf8')}").\n` +
      '   No se guarda. Revisa NAP_API_KEY.\n',
  );
  process.exit(1);
}

mkdirSync('data/gtfs', { recursive: true });
writeFileSync(OUT, buf);
console.log(`✅ GTFS descargado: ${OUT} (${(buf.length / 1e6).toFixed(1)} MB)`);
