import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadGtfs, readGtfsZip } from '@/sources/gtfs-nap';

/**
 * ⭐ LA DEMOSTRACIÓN QUE PIDIÓ ANTONIO.
 *
 * "NO ME DIGAS QUE EL MODELO ES AGNÓSTICO: DEMUÉSTRAMELO. Carga el TRANVÍA
 *  (agency_id=11) con el mismo código, sin tocar el núcleo, y enséñame que sale.
 *  Si hay que tocar algo, el modelo no es agnóstico y hay que rehacerlo."
 *
 * Esto no es un test de humo: es la prueba de que el 004 multimodal es un hito
 * pequeño y no cirugía.
 */

const files = readGtfsZip('data/gtfs/zaragoza-gtfs.zip');
const now = new Date('2026-07-13T12:00:00Z');

describe('el motor no sabe que es un bus', () => {
  it('la MISMA función carga bus, tranvía, o los dos — solo cambia `modes`', () => {
    const soloBus = loadGtfs(files, { modes: ['bus'], now });
    const soloTranvia = loadGtfs(files, { modes: ['tram'], now });
    const ambos = loadGtfs(files, { modes: ['bus', 'tram'], now });

    // El tranvía SALE, con el mismo código, sin una sola rama especial.
    expect(soloTranvia.lines).toHaveLength(1);
    expect(soloTranvia.lines[0].mode).toBe('tram');
    expect(soloTranvia.lines[0].shortName).toBe('TRA');
    expect(soloTranvia.lines[0].operator).toContain('Tranvías');
    expect(soloTranvia.stops.length).toBeGreaterThan(0);
    expect(soloTranvia.directions.length).toBeGreaterThan(0);

    // Y las entidades son LAS MISMAS: un Stop de tranvía es un Stop.
    const parada = soloTranvia.stops[0];
    expect(parada).toHaveProperty('id');
    expect(parada).toHaveProperty('position.lat');
    expect(parada.modes).toContain('tram');

    // La unión es exactamente la suma. No hay solapes ni pérdidas.
    expect(ambos.lines).toHaveLength(soloBus.lines.length + soloTranvia.lines.length);
    expect(ambos.directions).toHaveLength(
      soloBus.directions.length + soloTranvia.directions.length,
    );
  });

  it('el puente de identidad de Avanza NO se aplica al tranvía, y no revienta', () => {
    const tranvia = loadGtfs(files, { modes: ['tram'], now });
    const bus = loadGtfs(files, { modes: ['bus'], now });

    // El bus: 934 de 934 paradas tienen poste. Cobertura total.
    expect(Object.keys(bus.posteByStopId)).toHaveLength(bus.stops.length);

    // El tranvía: CERO postes, porque sus stop_code no llevan prefijo "PA".
    // No es un error: es la razón por la que el puente vive en sources/ y no en
    // core/. Si estuviera en el núcleo, el tranvía lo rompería el primer día.
    expect(Object.keys(tranvia.posteByStopId)).toHaveLength(0);
    expect(tranvia.warnings.join(' ')).toContain('sin poste');
  });

  it('⛔ el núcleo NO conoce la palabra "bus" ni importa de sources/', () => {
    const dir = 'src/core';
    const offenders: string[] = [];

    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue;
      const src = readFileSync(join(dir, f), 'utf8');

      // 1. El núcleo no puede importar de la capa de ingesta. Nunca.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\*.*$/gm, '');
      if (/from\s+['"](@\/sources|\.\.\/sources)/.test(code)) {
        offenders.push(`${f}: importa de sources/`);
      }

      // 2. Fuera de comentarios, "bus" solo puede aparecer como VALOR del
      //    discriminante Mode ('bus'), nunca como nombre de tipo, campo o
      //    función. Un `interface Bus` o un `esBus()` aquí sería la prueba de
      //    que el modelo miente.
      const sinComentarios = code.replace(/\/\/.*$/gm, '');
      const malos = [...sinComentarios.matchAll(/\b\w*[Bb]us\w*\b/g)]
        .map((m) => m[0])
        .filter((w) => w.toLowerCase() !== 'bus'); // 'bus' como literal es legítimo
      if (malos.length > 0) offenders.push(`${f}: ${[...new Set(malos)].join(', ')}`);
    }

    expect(offenders, `El núcleo se ha contaminado:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });
});
