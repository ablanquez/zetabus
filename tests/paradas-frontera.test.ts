/**
 * ⭐⭐ LA FRONTERA DE LAS PARADAS VISITABLES — Y QUE NO SE ABRIÓ DE MÁS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  `resolverParada` reconoce DOS clases: las del GTFS y las 9 solo-barrido del
 *  fichero estático. El peligro no es que las 9 no entren: es que entre CUALQUIERA.
 *  Un 99999 (o `0x2E8`, o el vacío) tiene que seguir dando 404. La frontera se abre
 *  a 9 CLAVES NOMBRADAS y a ninguna más.
 *
 *  ⚠️ CONTRAPRUEBA (demostrada en bitácora, con su rojo): metiendo "99999" en el
 *     fichero de coordenadas, `resolverParada('99999')` deja de ser null y este test
 *     se pone ROJO. Es la prueba de que la frontera la manda el fichero, no el azar.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';
import { coordSoloBarrido, resolverParada } from '@/engine/paradas';

const NUEVE = ['617', '646', '647', '648', '649', '650', '736', '1283', '8138'] as const;

describe('⭐ resolverParada · la frontera', () => {
  it('las 9 solo-barrido resuelven, con su coordenada de Zaragoza', () => {
    for (const p of NUEVE) {
      const pv = resolverParada(p);
      // `pv?.clase` cae a undefined si es null → falla aquí, no pasa en vacío (L47).
      expect(pv?.clase, `poste ${p}`).toBe('solo-barrido');
      if (pv?.clase === 'solo-barrido') {
        expect(pv.poste).toBe(Number(p));
        // La caja de cordura de Zaragoza (la misma que fija el script y valida el fichero).
        expect(pv.coord.lat, `poste ${p} lat`).toBeGreaterThanOrEqual(41.5);
        expect(pv.coord.lat, `poste ${p} lat`).toBeLessThanOrEqual(41.8);
        expect(pv.coord.lon, `poste ${p} lon`).toBeGreaterThanOrEqual(-1.05);
        expect(pv.coord.lon, `poste ${p} lon`).toBeLessThanOrEqual(-0.75);
      }
    }
  });

  it('⭐ REGRESIÓN: una parada GTFS normal sigue siendo clase "gtfs"', () => {
    // 744 = Plaza San Miguel, un poste REAL del GTFS. No cambia de naturaleza.
    const pv = resolverParada('744');
    expect(pv?.clase).toBe('gtfs');
    if (pv?.clase === 'gtfs') expect(pv.poste).toBe(744);
  });

  it('⛔ un 99999 NO es de nadie → null (la frontera no se abrió de más)', () => {
    expect(resolverParada('99999')).toBeNull();
    expect(resolverParada(999999)).toBeNull();
  });

  it('⛔ la basura de la URL se rechaza IGUAL en la puerta nueva (el agujero no vuelve)', () => {
    // Los mismos venenos que caza `paradaDelPoste`: la puerta solo-barrido usa la
    // misma `numeroDePoste`, así que `0x2E8` (=744) tampoco se cuela por aquí.
    for (const b of ['0x2E8', '1e3', '', '  ', '744.5', 'abc', '-1', '0', 'null', '<script>', '+744', '744abc']) {
      expect(resolverParada(b), `basura "${b}"`).toBeNull();
    }
  });

  it('coordSoloBarrido: da la coord de los 9, null de todo lo demás', () => {
    expect(coordSoloBarrido(617)).not.toBeNull();
    expect(coordSoloBarrido(99999)).toBeNull();
    expect(coordSoloBarrido(744)).toBeNull(); // un GTFS real: NO está en el fichero
  });
});
