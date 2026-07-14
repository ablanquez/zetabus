/**
 * ⛔ LAS LLEGADAS VAN ORDENADAS POR TIEMPO. NO AGRUPADAS POR LÍNEA.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * Avanza agrupa su HTML por (línea, destino), y nosotros conservábamos ese orden.
 * La pantalla decía: TODOS los de la 39 — a 12 y a 25 minutos — y DESPUÉS la 29
 * a 1 minuto.
 *
 * El que está en la marquesina no quiere saber "qué hay de la línea 39". Quiere
 * saber **QUÉ LLEGA ANTES**. Y la respuesta a la única pregunta que se hace
 * estaba enterrada en mitad de la lista.
 *
 * ⚠️ ESTO NO ES ESTÉTICA: ES COMPORTAMIENTO. Y es el fallo de USO más grave que
 * ha tenido esta pantalla, porque no se ve. La lista está completa, los datos son
 * correctos, no hay ningún error... y no sirve.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { llegadasDePoste } from '@/engine/llegadas';
import { parsearPoste } from '@/sources/avanza/parse-poste';
import { respuestaPoste, siempre } from './dobles';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-o-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

/** Como los manda Avanza: AGRUPADOS por línea, no por tiempo. */
const COMO_LLEGAN = [
  { coche: '4650', linea: '039', destino: 'VADORREY', eta: 12 },
  { coche: '4651', linea: '039', destino: 'VADORREY', eta: 25 },
  { coche: '4132', linea: '029', destino: 'SAN GREGORIO', eta: 1 },
  { coche: '4133', linea: '029', destino: 'SAN GREGORIO', eta: 6 },
  { coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 0 },
  { coche: '4890', linea: '035', destino: 'PARQUE GOYA', eta: 10 },
];

describe('⛔ ORDEN POR TIEMPO, NO POR LÍNEA', () => {
  it('⚠️ EL ROJO PRIMERO: Avanza los manda AGRUPADOS, y el parser lo respeta', () => {
    // El parser NO ordena, y hace bien: su trabajo es leer, no opinar. Pero eso
    // significa que si nadie ordena después, la pantalla enseña el orden de Avanza.
    const lectura = parsearPoste(respuestaPoste({ buses: COMO_LLEGAN }));
    const etas = lectura.llegadas.map((l) => l.etaMinutos);

    console.log(`\n  como los manda Avanza: ${etas.join(' · ')}`);
    expect(etas, 'agrupados por línea: 39, 39, 29, 29, 35, 35').toEqual([12, 25, 1, 6, 0, 10]);

    // ⛔ Y ASÍ ES COMO SE PINTABAN. El bus que llega YA (0 min) el QUINTO.
    expect(etas[0]).toBeGreaterThan(etas[4]);
  });

  it('⭐ EL VERDE: el motor los devuelve ORDENADOS POR TIEMPO', async () => {
    const t = siempre(respuestaPoste({ buses: COMO_LLEGAN }));
    const r = await llegadasDePoste(744, { cache: new CacheDosPisos({ dir }), transporte: t.transporte });

    expect(r.estado).toBe('ok');
    if (r.estado !== 'ok') return;

    const etas = r.datos.llegadas.map((l) => l.etaMinutos);
    console.log(`  como los enseñamos:    ${etas.join(' · ')}`);

    expect(etas).toEqual([0, 1, 6, 10, 12, 25]);
    // Y la propiedad, dicha como propiedad y no como una lista concreta:
    for (let i = 1; i < etas.length; i++) expect(etas[i]).toBeGreaterThanOrEqual(etas[i - 1]);

    // El primero de la lista ES el primero que llega. Que es toda la pantalla.
    expect(r.datos.llegadas[0].coche).toBe('4889');
  });

  it('⚠️ el orden es ESTABLE: dos buses al mismo minuto no bailan entre refrescos', async () => {
    // Una lista que se reordena sola cada 15 segundos es ilegible aunque cada foto
    // suya sea correcta. El desempate por coche lo evita.
    const empate = [
      { coche: '4300', linea: '039', destino: 'V', eta: 5 },
      { coche: '4100', linea: '029', destino: 'S', eta: 5 },
      { coche: '4200', linea: '035', destino: 'P', eta: 5 },
    ];
    const t = siempre(respuestaPoste({ buses: empate }));
    const dep = { cache: new CacheDosPisos({ dir }), transporte: t.transporte };

    const a = await llegadasDePoste(744, dep);
    const b = await llegadasDePoste(744, dep);
    if (a.estado !== 'ok' || b.estado !== 'ok') throw new Error('no ok');

    const coches = (o: typeof a) => (o.estado === 'ok' ? o.datos.llegadas.map((l) => String(l.coche)) : []);
    expect(coches(a)).toEqual(['4100', '4200', '4300']);
    expect(coches(b)).toEqual(coches(a));
  });

  it('el orden NO depende de qué línea sea: un búho a 2 min va antes que una diurna a 3', async () => {
    const t = siempre(
      respuestaPoste({
        buses: [
          { coche: '4001', linea: '021', destino: 'OLIVER', eta: 3 },
          { coche: '4002', linea: 'N1', destino: 'SANTA ISABEL', eta: 2 },
        ],
      }),
    );
    const r = await llegadasDePoste(744, { cache: new CacheDosPisos({ dir }), transporte: t.transporte });
    if (r.estado !== 'ok') throw new Error('no ok');
    expect(r.datos.llegadas.map((l) => l.linea)).toEqual(['N1', '21']);
  });
});
