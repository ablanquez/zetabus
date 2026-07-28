/**
 * ⭐ HORNEA LA VERSIÓN, DESDE package.json, A `src/generated/version.ts`.
 *
 *     Va DE PRIMERO en `npm run build`, antes que ningún otro paso.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ ES UN PASO PROPIO, Y EL PRIMERO.
 *
 *  `transporte.ts` importa `@/generated/version` (el número vive en UN sitio —
 *  package.json— y de ahí sale el User-Agent). Y `nombres:ensure` —que corre
 *  ANTES de `data:build`, y con razón: `data:build` LEE la tabla que aquél
 *  genera— lanza `build-nombres`, que arrastra `transporte.ts`.
 *
 *  ⇒ En un clon limpio, si `version.ts` lo generase `data:build` (más tarde),
 *    `build-nombres` NO compilaría: `Cannot find module '@/generated/version'`.
 *    Y el fail-safe de `ensure-nombres` lo tomaría por «Avanza caída»: la app
 *    arrancaría con TODAS las paradas «sin confirmar». Pasó en producción; en
 *    local NO se vio porque `version.ts` ya existía de builds anteriores —la ley
 *    del proyecto: un verde que depende de si alguien compiló antes no prueba
 *    nada—. Ver docs/BITACORA.md.
 *
 *  Generarlo LO PRIMERO garantiza que existe antes de que nadie lo importe. Y
 *  solo depende de `package.json`, que siempre está: no necesita red ni orden
 *  con los demás artefactos.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Se HORNEA a un fichero propio —no se importa `package.json` en el código— para
 *    que la lista de dependencias NO viaje a ningún bundle del cliente. Los
 *    DOCUMENTOS (badge del README, THIRD-PARTY) no pueden beber de aquí; los vigila
 *    `readme-no-miente`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'src/generated';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// El directorio puede no existir aún (clon limpio): este paso es el primero.
mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/version.ts`,
  `// GENERADO POR scripts/build-version.ts. NO EDITAR A MANO.\nexport const VERSION = ${JSON.stringify(pkg.version)};\n`,
);

console.log(`\n✅ Versión horneada: ${pkg.version}  →  ${OUT}/version.ts\n`);
