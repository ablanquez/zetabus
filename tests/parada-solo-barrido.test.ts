/**
 * ⭐⭐ UNA PARADA SOLO-BARRIDO, DE PUNTA A PUNTA — SIN FINGIR UN StopId.
 *
 * Las 9 no están en el GTFS. Su página sale igual: nombre (del feed), mapa (coord del
 * fichero) y llegadas en vivo. Aquí se prueba el motor; la pantalla, en Playwright.
 *
 *   · el parser saca el NOMBRE del marcador (`maquinas[0].info`) — antes se tiraba;
 *   · `llegadasDePoste(617)` NO peta (no llama a `parada()!`): da `paradaId: null`,
 *     nombre del feed, posición del marcador/fichero;
 *   · SIN índice (degradado) sigue siendo visitable, y su caja de líneas cae a la nota;
 *   · su procedencia de nombre es `avanza-web`, NUNCA `gtfs-marcado` (contraprueba 5).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { llegadasDePoste } from '@/engine/llegadas';
import { parsearPoste } from '@/sources/avanza/parse-poste';
import { correspondenciasDePosteDesde, type ArtefactoIndice } from '@/engine/correspondencias';
import { nombreSoloBarrido, resolverParada } from '@/engine/paradas';
import { POSTE_MUDO, respuestaPoste, siempre } from './motor-vivo/dobles';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-sb-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
const cache = () => new CacheDosPisos({ dir });

/** Un poste solo-barrido REAL (Parque de Atracciones), del fichero versionado. */
const P = 617;

describe('⭐ el parser saca el nombre del marcador (antes se tiraba)', () => {
  it('maquinas[0].info → nombreParada', () => {
    const cuerpo = JSON.stringify({
      maquinas: {
        '0': {
          coordenadas: { '0': { LAT: 41.62227, LON: -0.90033 } },
          icon: 'https://gps.avanzabus.com/img/bus_rojo.png',
          info: 'Parque de Atracciones',
          title: 'Parque de Atracciones',
        },
      },
      tablatiempos: '',
    });
    const r = parsearPoste(cuerpo);
    expect(r.nombreParada).toBe('Parque de Atracciones');
    expect(r.marcadorParada).toEqual({ lat: 41.62227, lon: -0.90033 });
  });

  it('sin marcador en el feed, nombreParada es undefined (no se inventa)', () => {
    expect(parsearPoste(POSTE_MUDO).nombreParada).toBeUndefined();
  });
});

describe('⭐ llegadasDePoste de una solo-barrido: no peta, y es honesta', () => {
  it('paradaId null (no finge StopId), nombre del feed, posición del marcador', async () => {
    const t = siempre(respuestaPoste({ poste: P, parada: { lat: 41.62227, lon: -0.90033 }, buses: [] }));
    const r = await llegadasDePoste(P, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok'); // ← NO 'desconocido': la 617 EXISTE
    if (r.estado === 'ok') {
      expect(r.datos.paradaId).toBeNull(); // ⭐ sin StopId de mentira
      expect(r.datos.poste).toBe(P);
      expect(r.datos.nombreParada).toBe('Parada de prueba'); // el del marcador del doble
      expect(r.datos.posicionParada).toEqual({ lat: 41.62227, lon: -0.90033 });
    }
    expect(t.llamadas).toBe(1); // sí se pregunta a Avanza: el feed responde por código de poste
  });

  it('sin marcador en el feed, la posición cae al FICHERO estático (no a (0,0))', async () => {
    // Poste mudo: sin `maquinas`, así que el feed no trae marcador ni nombre.
    const t = siempre(POSTE_MUDO);
    const r = await llegadasDePoste(P, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      // La coord del fichero versionado del 617.
      expect(r.datos.posicionParada).toEqual({ lat: 41.62227, lon: -0.90033 });
      expect(r.datos.nombreParada.length).toBeGreaterThan(0); // fallback: índice o "poste 617"
    }
  });

  it('feed vacío (sin bus ahora) = ok con lista vacía, NO error', async () => {
    const t = siempre(POSTE_MUDO);
    const r = await llegadasDePoste(P, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') expect(r.datos.llegadas).toEqual([]);
  });
});

describe('⭐ degradado: la 617 sigue visitable sin índice', () => {
  it('resolverParada NO mira el índice: la 617 resuelve pase lo que pase con el barrido', () => {
    // resolverParada lee el FICHERO estático, no el índice → visitable SIEMPRE.
    expect(resolverParada('617')?.clase).toBe('solo-barrido');
  });

  it('correspondenciasDePoste(null, 617): degradado, sin normales ni provisionales → la nota', () => {
    const r = correspondenciasDePosteDesde(null, P);
    expect(r.degradado).toBe(true);
    expect(r.normales).toEqual([]); // solo-barrido: NUNCA tiene normales (no está en el oficial)
    expect(r.provisionales).toEqual([]); // sin índice no se sabe el desvío de hoy
  });

  it('con índice, la provisional del 617 SÍ sale (y solo provisionales)', () => {
    const indice = indiceCon({ '617': { normales: [], provisionales: [{ linea: '34', sentido: 0 }] } });
    const r = correspondenciasDePosteDesde(indice, P);
    expect(r.degradado).toBe(false);
    expect(r.normales).toEqual([]);
    expect(r.provisionales.map((e) => e.linea.shortName)).toEqual(['34']);
  });
});

describe('⭐ honestidad del nombre (contraprueba 5)', () => {
  it('el nombre de una solo-barrido sale del feed (prioridad), y nunca es vacío', () => {
    // La página etiqueta `fuente = 'avanza-web'` para las solo-barrido (nunca
    // 'gtfs-marcado'), así que el aviso "nombre sin confirmar" NO se pinta: el nombre
    // lo da Avanza, no es el del GTFS roto. La prueba de la pantalla, en Playwright.
    // ⭐ Un nombre de feed DISTINTO del índice, para probar que el feed MANDA (si usara
    //    "Parque de Atracciones" —que es también el del índice— no probaría la prioridad).
    expect(nombreSoloBarrido(P, 'NOMBRE-DE-FEED-DISTINTO')).toBe('NOMBRE-DE-FEED-DISTINTO');
    // Sin feed: cae al índice o a "poste N", pero SIEMPRE una cadena, nunca vacío.
    expect(nombreSoloBarrido(P, null).length).toBeGreaterThan(0);
    expect(nombreSoloBarrido(P, '   ')).toBe(nombreSoloBarrido(P, null)); // el vacío no cuenta
  });
});

// Un índice de fixture mínimo (el barrido va a cero: no se mira aquí).
function indiceCon(postes: ArtefactoIndice['postes']): ArtefactoIndice {
  return {
    generadoEn: '2026-07-25T02:00:00.000Z',
    barrido: {
      sentidosEsperados: 74, sentidosRespondidos: 74, sentidosFallidos: 0, sentidosSospechosos: 0,
      postesGtfs: 0, postesSoloBarrido: Object.keys(postes).length, postesSinCoordenadas: 0,
      postesConProvisional: 0, lineasDesviadas: 0, incidencias: 0,
    },
    postes,
  };
}
