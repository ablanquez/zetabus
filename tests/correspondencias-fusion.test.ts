/**
 * ⭐ LA FUSIÓN DEL ÍNDICE DE CORRESPONDENCIAS. Pura: recorridos de hoy × oficial.
 *
 * Se prueba SIN Avanza y SIN GTFS: se le pasan recorridos ya leídos (fixtures) y una
 * ruta oficial de mentira. Lo que se ata es la clasificación, que es donde está el valor:
 *   · un poste del recorrido de hoy QUE ESTÁ en el oficial → correspondencia NORMAL;
 *   · un poste QUE NO está en el oficial → PROVISIONAL (lo trajo el desvío);
 *   · el SENTIDO se conserva (dos sentidos → dos pares distintos), que es irreversible;
 *   · un poste que el GTFS no conoce → solo-barrido, con su nombre y sin coordenadas;
 *   · el FRENO DE MANO: una lectura truncada NO fabrica provisionales;
 *   · los contadores cuadran por dos caminos (L1), o revienta.
 */
import { describe, it, expect } from 'vitest';
import {
  fundirCorrespondencias,
  type OficialParaFusion,
} from '@/sources/avanza/correspondencias';
import type { RespuestaDeSentido } from '@/sources/avanza/nombres';
import type { SentidoAvanza } from '@/sources/avanza/recorrido';

// ── Constructores de fixtures ────────────────────────────────────────────────
const ok = (
  linea: string,
  sentido: SentidoAvanza,
  postes: readonly { poste: number; nombre: string }[],
): RespuestaDeSentido => ({ peticion: { lineaEtiqueta: linea, sentido }, ok: true, postes });

const fallo = (linea: string, sentido: SentidoAvanza): RespuestaDeSentido => ({
  peticion: { lineaEtiqueta: linea, sentido },
  ok: false,
  motivo: 'timeout de prueba',
});

const p = (n: number) => ({ poste: n, nombre: `Parada ${n}` });

/** Una ruta oficial de mentira: mapa `${linea}|${dir}` → postes, + qué postes son del GTFS. */
function oficialDe(
  rutas: Record<string, number[]>,
  gtfs: number[],
): OficialParaFusion {
  const m = new Map(Object.entries(rutas).map(([k, v]) => [k, new Set(v)]));
  return {
    postesDeSentido: (linea, dir) => m.get(`${linea}|${dir}`),
    postesGtfs: new Set(gtfs),
  };
}

describe('⭐ fusión de correspondencias', () => {
  it('clasifica normal vs provisional, y conserva el sentido', () => {
    // La 36, sentido -1 (= dir 0). Oficial: postes 1,2,3. Hoy pasa además por el 99.
    const oficial = oficialDe({ '36|0': [1, 2, 3] }, [1, 2, 3]);
    const { postes } = fundirCorrespondencias([ok('36', -1, [p(1), p(2), p(3), p(99)])], oficial);

    // 1,2,3 son NORMALES de (36, sentido 0); el 99 es PROVISIONAL de (36, sentido 0).
    expect(postes[1].normales).toEqual([{ linea: '36', sentido: 0 }]);
    expect(postes[1].provisionales).toEqual([]);
    expect(postes[99].normales).toEqual([]);
    expect(postes[99].provisionales).toEqual([{ linea: '36', sentido: 0 }]);
  });

  it('dos sentidos de la misma línea dan DOS pares distintos en el mismo poste', () => {
    // El poste 1 está en el oficial de los dos sentidos de la 36.
    const oficial = oficialDe({ '36|0': [1], '36|1': [1] }, [1]);
    const { postes } = fundirCorrespondencias(
      [ok('36', -1, [p(1)]), ok('36', -2, [p(1)])],
      oficial,
    );
    expect(postes[1].normales).toEqual([
      { linea: '36', sentido: 0 },
      { linea: '36', sentido: 1 },
    ]);
  });

  it('un poste que el GTFS no conoce es solo-barrido: lleva nombre y sinCoordenadas', () => {
    const oficial = oficialDe({ '35|0': [1, 2] }, [1, 2]); // el 500 NO está en el GTFS
    const { postes, contadores } = fundirCorrespondencias(
      [ok('35', -1, [p(1), p(2), { poste: 500, nombre: 'Paseo Provisional' }])],
      oficial,
    );
    expect(postes[500].nombre).toBe('Paseo Provisional');
    expect(postes[500].sinCoordenadas).toBe(true);
    expect(postes[500].provisionales).toEqual([{ linea: '35', sentido: 0 }]);
    // el 1 y el 2 NO son solo-barrido: no llevan nombre ni sinCoordenadas
    expect(postes[1].nombre).toBeUndefined();
    expect(postes[1].sinCoordenadas).toBeUndefined();
    expect(contadores.postesSoloBarrido).toBe(1);
    expect(contadores.postesGtfs).toBe(2);
  });

  it('el FRENO DE MANO: una lectura truncada conserva las normales pero NO fabrica provisionales', () => {
    // Oficial de 10 postes; hoy vuelve solo 1 (falta el 90% > umbral 0.5): lectura rota.
    const oficial = oficialDe({ '21|0': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const res = fundirCorrespondencias(
      [ok('21', -1, [p(1), { poste: 777, nombre: 'Dudoso' }])],
      oficial,
    );
    // el 1 está en el oficial → NORMAL, aunque la lectura sea sospechosa
    expect(res.postes[1].normales).toEqual([{ linea: '21', sentido: 0 }]);
    // el 777 NO se marca provisional (no se sabe si es desvío o respuesta rota)
    expect(res.postes[777]).toBeUndefined();
    expect(res.contadores.sospechosos).toBe(1);
    expect(res.avisos).toHaveLength(1);
    expect(res.contadores.postesConProvisional).toBe(0);
  });

  it('cuenta esperadas/respondidas/fallidas y no cuenta postes de una respuesta caída', () => {
    const oficial = oficialDe({ '36|0': [1] }, [1]);
    const { contadores } = fundirCorrespondencias(
      [ok('36', -1, [p(1)]), fallo('36', -2)],
      oficial,
    );
    expect(contadores.esperadas).toBe(2);
    expect(contadores.respondidas).toBe(1);
    expect(contadores.fallidas).toBe(1);
    // incidencias = 1 (solo el par del sentido que respondió)
    expect(contadores.incidencias).toBe(1);
  });

  it('cuenta las líneas desviadas y los postes con provisional', () => {
    const oficial = oficialDe({ '35|0': [1], '40|0': [1] }, [1]);
    const { contadores } = fundirCorrespondencias(
      [ok('35', -1, [p(1), p(2)]), ok('40', -1, [p(1), p(3)])],
      oficial,
    );
    // el 2 (provisional de 35) y el 3 (provisional de 40) → 2 postes con provisional,
    // 2 líneas desviadas.
    expect(contadores.postesConProvisional).toBe(2);
    expect(contadores.lineasDesviadas).toBe(2);
  });
});
