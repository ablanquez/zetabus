/**
 * ⭐⭐ EL BARRIDO PROPAGA LA PROCEDENCIA DE LA COORDENADA, NO LA PISA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL CORAZÓN DE LA TANDA A. Las 9 coordenadas solo-barrido salen del feed de
 *  Avanza → son `avanza-web`, NO `observacion_propia` (nadie las observó a mano).
 *
 *  El barrido CABLEABA `confidence: 'observacion_propia'` encima de cada coord al
 *  fundirla en el índice. Con las 9 nuevas eso habría escrito una MENTIRA de
 *  procedencia: "una persona lo vio" sobre un dato que dio un feed. La procedencia
 *  es sagrada en este proyecto (`el día que un aficionado y un pliego valgan lo
 *  mismo, hemos perdido el proyecto`), así que esto se prueba directamente.
 *
 *  `fijarCoordenada` es la función pura extraída para poder probarlo sin red ni
 *  disco. Si alguien vuelve a cablear un literal encima, este test se pone rojo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';
import { fijarCoordenada } from '@/engine/barrido';

const BASE = {
  normales: [] as const,
  provisionales: [{ linea: '34', sentido: 0 as const }],
  nombre: 'Parque de Atracciones',
};

describe('fijarCoordenada · propaga la procedencia', () => {
  it('⭐ una coord avanza-web SALE avanza-web (no se pisa con observacion_propia)', () => {
    const r = fijarCoordenada(BASE, {
      lat: 41.62227,
      lon: -0.90033,
      fuente: 'avanza-web',
      fecha: '2026-07-25',
      comoSeSupo: 'marcadorParada del feed',
    });
    // El corazón: la fuente sobrevive tal cual.
    expect(r.coordProc?.fuente).toBe('avanza-web');
    // Y la coord se copia bien.
    expect(r.lat).toBe(41.62227);
    expect(r.lon).toBe(-0.90033);
    // Y NO se le cuela un campo de observación manual.
    expect((r.coordProc as { quien?: string }).quien).toBeUndefined();
  });

  it('una coord observacion_propia SALE observacion_propia (el modelo admite ambas)', () => {
    const r = fijarCoordenada(BASE, {
      lat: 41.65,
      lon: -0.88,
      fuente: 'observacion_propia',
      quien: 'Alguien',
      fecha: '2026-07-25',
      comoLoSupe: 'lo vi en la calle',
    });
    expect(r.coordProc?.fuente).toBe('observacion_propia');
  });

  it('conserva normales/provisionales/nombre del poste', () => {
    const r = fijarCoordenada(BASE, { lat: 41.6, lon: -0.9, fuente: 'avanza-web', fecha: '2026-07-25' });
    expect(r.nombre).toBe('Parque de Atracciones');
    expect(r.provisionales).toEqual([{ linea: '34', sentido: 0 }]);
    expect(r.sinCoordenadas).toBeUndefined();
  });
});
