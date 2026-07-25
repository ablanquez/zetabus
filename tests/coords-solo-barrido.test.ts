/**
 * ⭐ LA FORMA DEL FICHERO DE COORDENADAS SOLO-BARRIDO.
 *
 * Verifica que `data/postes-solo-barrido-coordenadas.json` tiene coordenadas
 * plausibles de Zaragoza y su procedencia. Lo escribe `scripts/coords-solo-barrido.ts`.
 *
 * ⚠️ L47: un test que pasa con el fichero VACÍO no prueba nada. Aquí se exige un
 *    número CONCRETO (> 0) de entradas y se valida cada una; con 0 resueltos (el
 *    estado anterior) este test está en ROJO —demostrado en bitácora—.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const RUTA = 'data/postes-solo-barrido-coordenadas.json';

interface EntradaCoord {
  lat: number;
  lon: number;
  fuente: string;
  fecha: string;
  comoSeSupo?: string;
  quien?: string;
  comoLoSupe?: string;
}

const fichero = JSON.parse(readFileSync(RUTA, 'utf8')) as {
  _meta?: unknown;
  postes: Record<string, EntradaCoord>;
};
const entradas = Object.entries(fichero.postes);

// La caja de cordura de Zaragoza (la misma que usa el script).
const enZaragoza = (lat: number, lon: number): boolean =>
  lat >= 41.5 && lat <= 41.8 && lon >= -1.05 && lon <= -0.75;

const PROCEDENCIAS_VALIDAS = new Set(['avanza-web', 'observacion_propia']);

describe('data/postes-solo-barrido-coordenadas.json', () => {
  it('⭐ tiene los 9 postes resueltos (NO vacío — L47)', () => {
    // Con el fichero vacío (0 resueltos) este expect está en rojo.
    expect(entradas.length).toBe(9);
  });

  it('cada entrada tiene lat/lon numéricos y plausibles de Zaragoza', () => {
    for (const [poste, e] of entradas) {
      expect(typeof e.lat, `poste ${poste} lat`).toBe('number');
      expect(typeof e.lon, `poste ${poste} lon`).toBe('number');
      expect(Number.isFinite(e.lat) && Number.isFinite(e.lon), `poste ${poste} finito`).toBe(true);
      expect(enZaragoza(e.lat, e.lon), `poste ${poste} en Zaragoza (${e.lat}, ${e.lon})`).toBe(true);
    }
  });

  it('cada entrada declara una procedencia VÁLIDA (avanza-web u observacion_propia)', () => {
    for (const [poste, e] of entradas) {
      expect(PROCEDENCIAS_VALIDAS.has(e.fuente), `poste ${poste} fuente="${e.fuente}"`).toBe(true);
    }
  });

  it('⭐ los 9 de hoy son avanza-web (del feed), NO observacion_propia', () => {
    for (const [poste, e] of entradas) {
      expect(e.fuente, `poste ${poste}`).toBe('avanza-web');
      // avanza-web NO lleva los campos de observación humana: no la vio una persona.
      expect(e.quien, `poste ${poste} sin quien`).toBeUndefined();
      expect(e.comoLoSupe, `poste ${poste} sin comoLoSupe`).toBeUndefined();
    }
  });

  it('los 9 postes esperados están presentes', () => {
    const esperados = ['617', '646', '647', '648', '649', '650', '736', '1283', '8138'];
    expect(Object.keys(fichero.postes).sort()).toEqual(esperados.sort());
  });
});
