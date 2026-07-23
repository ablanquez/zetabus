/**
 * ⭐⭐ INTENTAR REVENTAR LA FUSIÓN DE CORRESPONDENCIAS (el motor nuevo de la semana).
 *
 * La clasificación normal/provisional, el sentido y los contadores ya se prueban en
 * `correspondencias-fusion.test.ts`. Esto NO repite aquello: ataca los BORDES y los
 * ESTADOS RAROS que el cierre de la Tanda 7 pide reventar, y que no estaban cubiertos:
 *
 *   · el FRENO DE MANO en su borde EXACTO (0,5 justo pasa; 0,6 no) — no "cerca del borde";
 *   · la lista de respuestas VACÍA, y TODAS caídas — dos silencios que no deben reventar;
 *   · un poste REPETIDO en el mismo recorrido — que no se cuente dos veces;
 *   · un sentido con UN SOLO poste, y una LÍNEA ENTERA con el recorrido vacío;
 *   · ⭐ LA COHERENCIA GLOBAL (L1): fundir en OTRO ORDEN da un índice IDÉNTICO — si el
 *     resultado dependiera del orden de llegada, habría un no-determinismo escondido.
 *
 * Regla de la casa: si nada se rompe al primer intento, sospecha del test. Por eso cada
 * borde se prueba por sus DOS lados (el que pasa y el que no), que es la contraprueba
 * incorporada: un umbral que solo se prueba por un lado no se ha probado.
 */
import { describe, it, expect } from 'vitest';
import {
  fundirCorrespondencias,
  type OficialParaFusion,
} from '@/sources/avanza/correspondencias';
import { alcanzaElSuelo, RATIO_SUELO } from '@/sources/avanza/correspondencias';
import { estadoIndiceDesde, type ArtefactoIndice } from '@/engine/correspondencias';
import type { RespuestaDeSentido } from '@/sources/avanza/nombres';
import type { SentidoAvanza } from '@/sources/avanza/recorrido';
import { UMBRAL_ABSURDO } from '@/engine/desvios';

// ── Constructores de fixtures (iguales a los de correspondencias-fusion) ──────
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

function oficialDe(rutas: Record<string, number[]>, gtfs: number[]): OficialParaFusion {
  const m = new Map(Object.entries(rutas).map(([k, v]) => [k, new Set(v)]));
  return { postesDeSentido: (linea, dir) => m.get(`${linea}|${dir}`), postesGtfs: new Set(gtfs) };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EL FRENO DE MANO · el borde EXACTO del umbral, por sus dos lados', () => {
  // Oficial de 10 postes. El umbral es 0,5 ESTRICTO: `ausentes/oficial > 0,5`.
  const oficial = oficialDe({ '21|0': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  it('el umbral es 0,5 (si esto cambia, los dos tests de abajo mienten)', () => {
    expect(UMBRAL_ABSURDO).toBe(0.5);
  });

  it('exactamente 5 de 10 ausentes (0,50) NO es truncado: la provisional SÍ se marca', () => {
    // Hoy vienen 1..5 (oficiales) + el 99 (fuera del oficial). Faltan 5 → 0,50, que NO
    // es > 0,50. La lectura se da por buena y el 99 es provisional.
    const r = fundirCorrespondencias([ok('21', -1, [p(1), p(2), p(3), p(4), p(5), p(99)])], oficial);
    expect(r.contadores.sospechosos).toBe(0);
    expect(r.postes[99].provisionales).toEqual([{ linea: '21', sentido: 0 }]);
    expect(r.postes[1].normales).toEqual([{ linea: '21', sentido: 0 }]);
  });

  it('un ausente más (6 de 10 = 0,60) SÍ es truncado: la provisional se descarta', () => {
    // El MISMO caso con un oficial menos hoy (1..4). Faltan 6 → 0,60 > 0,50 → sospechoso.
    const r = fundirCorrespondencias([ok('21', -1, [p(1), p(2), p(3), p(4), p(99)])], oficial);
    expect(r.contadores.sospechosos).toBe(1);
    expect(r.postes[99]).toBeUndefined(); // el dudoso, fuera
    // pero las normales que SÍ estaban en el oficial se conservan (el freno no las tira)
    expect(r.postes[1].normales).toEqual([{ linea: '21', sentido: 0 }]);
    expect(r.avisos).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ LOS SILENCIOS · una lista vacía y todo caído no deben reventar', () => {
  it('respuestas = [] → índice vacío, cero de todo, SIN excepción', () => {
    const r = fundirCorrespondencias([], oficialDe({}, []));
    expect(r.postes).toEqual({});
    expect(r.contadores).toMatchObject({
      esperadas: 0, respondidas: 0, fallidas: 0, incidencias: 0,
      postesGtfs: 0, postesSoloBarrido: 0, postesConProvisional: 0, lineasDesviadas: 0,
    });
    expect(r.avisos).toEqual([]);
  });

  it('TODAS caídas → esperadas cuenta, respondidas 0, índice vacío (no se inventa nada)', () => {
    const r = fundirCorrespondencias(
      [fallo('21', -1), fallo('21', -2), fallo('36', -1)],
      oficialDe({ '21|0': [1] }, [1]),
    );
    expect(r.contadores.esperadas).toBe(3);
    expect(r.contadores.respondidas).toBe(0);
    expect(r.contadores.fallidas).toBe(3);
    expect(r.contadores.incidencias).toBe(0);
    expect(r.postes).toEqual({});
  });

  it('⚠️ una LÍNEA ENTERA con el recorrido vacío (ok pero 0 postes) → sospechosa, no normales fantasma', () => {
    // ok:true con postes:[] y un oficial no vacío: faltan el 100% → 1,0 > 0,5 → truncado.
    // No se fabrica NADA (ni siquiera las normales, porque hoy no vino ninguna).
    const r = fundirCorrespondencias([ok('21', -1, [])], oficialDe({ '21|0': [1, 2, 3] }, [1, 2, 3]));
    expect(r.contadores.respondidas).toBe(1);
    expect(r.contadores.sospechosos).toBe(1);
    expect(r.postes).toEqual({});
    expect(r.avisos[0]).toMatch(/100% de las paradas oficiales/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ ESTADOS RAROS DEL RECORRIDO', () => {
  it('un poste REPETIDO en el mismo recorrido cuenta UNA vez, no dos', () => {
    // Avanza podría devolver el mismo poste dos veces (ida y vuelta de una lanzadera,
    // o basura). El par (línea,sentido) se deduplica: una sola incidencia.
    const r = fundirCorrespondencias([ok('36', -1, [p(1), p(1), p(1)])], oficialDe({ '36|0': [1] }, [1]));
    expect(r.postes[1].normales).toEqual([{ linea: '36', sentido: 0 }]);
    expect(r.contadores.incidencias).toBe(1); // no 3
  });

  it('un poste PROVISIONAL repetido también cuenta una vez', () => {
    const r = fundirCorrespondencias([ok('36', -1, [p(1), p(99), p(99)])], oficialDe({ '36|0': [1] }, [1]));
    expect(r.postes[99].provisionales).toEqual([{ linea: '36', sentido: 0 }]);
    expect(r.contadores.incidencias).toBe(2); // el 1 (normal) y el 99 (provisional), una vez cada uno
  });

  it('un sentido con UN SOLO poste (y ese poste es su único oficial) → una normal, sin freno', () => {
    // 1 de 1 presente → 0 ausentes → 0/1 = 0 → no truncado. El caso mínimo válido.
    const r = fundirCorrespondencias([ok('36', -1, [p(1)])], oficialDe({ '36|0': [1] }, [1]));
    expect(r.contadores.sospechosos).toBe(0);
    expect(r.postes[1].normales).toEqual([{ linea: '36', sentido: 0 }]);
  });

  it('una línea SIN oficial (el GTFS no da su ruta) → todo lo de hoy es provisional, sin freno', () => {
    // oficialDeEste.size === 0 → el freno NO aplica (no hay con qué comparar). Todo lo
    // que se ve hoy es provisional: no se puede afirmar que sea "de siempre".
    const r = fundirCorrespondencias([ok('99', -1, [p(1), p(2)])], oficialDe({}, [1, 2]));
    expect(r.contadores.sospechosos).toBe(0);
    expect(r.postes[1].provisionales).toEqual([{ linea: '99', sentido: 0 }]);
    expect(r.postes[1].normales).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⭐ LA COHERENCIA GLOBAL (L1) · el índice NO depende del orden de llegada', () => {
  // Un lote realista: dos líneas, dos sentidos, normales + provisionales + solo-barrido.
  const oficial = oficialDe(
    { '36|0': [1, 2, 3], '36|1': [1, 2, 3], '35|0': [2, 4] },
    [1, 2, 3, 4], // el 500 NO está → solo-barrido
  );
  const lote: RespuestaDeSentido[] = [
    ok('36', -1, [p(1), p(2), p(3), p(99)]),
    ok('36', -2, [p(3), p(2), p(1)]),
    ok('35', -1, [p(2), p(4), { poste: 500, nombre: 'Provisional' }]),
    fallo('35', -2),
  ];

  /** El índice normalizado a algo comparable byte a byte: postes + contadores. */
  const huella = (rs: readonly RespuestaDeSentido[]) => {
    const { postes, contadores } = fundirCorrespondencias(rs, oficial);
    return JSON.stringify({ postes, contadores });
  };

  it('reverso, e interleavado → la MISMA huella exacta que el orden original', () => {
    const original = huella(lote);
    const reverso = huella([...lote].reverse());
    // una permutación cualquiera (no el reverso), para no probar una sola reordenación
    const barajado = huella([lote[2], lote[0], lote[3], lote[1]]);

    expect(reverso).toBe(original);
    expect(barajado).toBe(original);
  });

  it('CONTRAPRUEBA · la huella NO es una constante trivial (cambia si el dato cambia)', () => {
    // Si `huella` devolviera siempre lo mismo, el test de arriba pasaría por vil azar.
    const conUnPosteMenos = huella([
      ok('36', -1, [p(1), p(2), p(3)]), // sin el 99 provisional
      ok('36', -2, [p(3), p(2), p(1)]),
      ok('35', -1, [p(2), p(4), { poste: 500, nombre: 'Provisional' }]),
      fallo('35', -2),
    ]);
    expect(conUnPosteMenos).not.toBe(huella(lote));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⭐⭐ EL SUELO · "NUNCA un fichero parcial" · lo que decide si el barrido publica', () => {
  // Ésta es la garantía cabecera del BLOQUE 1: un barrido a medias (Avanza respondiendo
  // 40 de 74) NO debe sobrescribir el índice bueno. La decisión la toma `alcanzaElSuelo`,
  // que es la MISMA función en la que delega `build-correspondencias.ts` (no una copia).

  it('el suelo es el 80% (si esto cambia, el barrido publicaría con menos)', () => {
    expect(RATIO_SUELO).toBe(0.8);
  });

  it('el borde EXACTO, por sus dos lados: 8 de 10 (0,80) publica; 7 de 10 (0,70) NO', () => {
    expect(alcanzaElSuelo({ esperadas: 10, respondidas: 8 })).toBe(true);
    expect(alcanzaElSuelo({ esperadas: 10, respondidas: 7 })).toBe(false);
  });

  it('justo por debajo: 79 de 100 (0,79) NO alcanza', () => {
    expect(alcanzaElSuelo({ esperadas: 100, respondidas: 79 })).toBe(false);
    expect(alcanzaElSuelo({ esperadas: 100, respondidas: 80 })).toBe(true);
  });

  it('⭐ el caso del enunciado: Avanza responde 40 de 74 → NO se publica (0,54 < 0,80)', () => {
    // Un fichero con 40 sentidos parece completo y no lo es. El suelo lo para.
    expect(alcanzaElSuelo({ esperadas: 74, respondidas: 40 })).toBe(false);
    // 74 de 74 sí, claro.
    expect(alcanzaElSuelo({ esperadas: 74, respondidas: 74 })).toBe(true);
  });

  it('esperadas = 0 NO alcanza (no se cuela un 0/0 como si fuera "todo respondió")', () => {
    expect(alcanzaElSuelo({ esperadas: 0, respondidas: 0 })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ estadoIndice · el sello de tiempo del barrido, con fechas rotas', () => {
  const conSello = (generadoEn: string): ArtefactoIndice => ({
    generadoEn,
    barrido: {
      sentidosEsperados: 74, sentidosRespondidos: 74, sentidosFallidos: 0, sentidosSospechosos: 0,
      postesGtfs: 0, postesSoloBarrido: 0, postesSinCoordenadas: 0,
      postesConProvisional: 0, lineasDesviadas: 0, incidencias: 0,
    },
    postes: {},
  });

  it('un generadoEn ILEGIBLE no revienta ni miente una edad: edadSegundos queda sin definir', () => {
    const e = estadoIndiceDesde(conSello('no-es-una-fecha'), Date.now());
    expect(e.presente).toBe(true);
    expect(e.edadSegundos).toBeUndefined(); // NaN → undefined, NO 0 ni un número inventado
  });

  it('un generadoEn en el FUTURO (reloj torcido) da edad 0, nunca negativa', () => {
    const gen = '2026-07-22T02:00:00.000Z';
    const e = estadoIndiceDesde(conSello(gen), Date.parse(gen) - 3600_000); // "ahora" una hora ANTES
    expect(e.edadSegundos).toBe(0); // Math.max(0, negativo) → 0
  });
});
