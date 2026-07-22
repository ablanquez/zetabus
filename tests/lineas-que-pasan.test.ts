/**
 * ⭐ EL LECTOR DEL ÍNDICE DE CORRESPONDENCIAS — el que arma "las líneas que pasan".
 *
 * Se prueba el NÚCLEO PURO (`...Desde(indice, …)`), sin tocar disco: el fichero real es
 * raspado y gitignorado, así que en CI no existe. Se le pasa:
 *   · `null` → MODO DEGRADADO: normales de la ruta oficial del GTFS, sin provisionales;
 *   · un índice de fixture → clasificación normal/provisional, con el sentido conservado.
 * La topología es la REAL (el GTFS horneado): los postes de ejemplo son de verdad.
 */
import { describe, it, expect } from 'vitest';
import {
  correspondenciasDeParadaDesde,
  otrasLineasEnPosteDesde,
  estadoIndiceDesde,
  type ArtefactoIndice,
} from '@/engine/correspondencias';
import { paradaDelPoste, idParada, idLinea, lineaDeEtiqueta } from '@/engine/topologia';

/** Un índice de fixture: se rellenan los postes; el barrido va a cero (no se mira aquí). */
function indiceCon(
  postes: ArtefactoIndice['postes'],
  generadoEn = '2026-07-22T02:00:00.000Z',
): ArtefactoIndice {
  return {
    generadoEn,
    barrido: {
      sentidosEsperados: 74, sentidosRespondidos: 74, sentidosFallidos: 0, sentidosSospechosos: 0,
      postesGtfs: Object.keys(postes).length, postesSoloBarrido: 0, postesSinCoordenadas: 0,
      postesConProvisional: 0, lineasDesviadas: 0, incidencias: 0,
    },
    postes,
  };
}

describe('⭐ lector de correspondencias · MODO DEGRADADO (sin índice)', () => {
  it('normales de la ruta oficial del GTFS, con sentido, y degradado=true', () => {
    // poste 15 (Camino de Juslibol): la 36 pasa en los dos sentidos.
    const id = paradaDelPoste(15)!;
    const r = correspondenciasDeParadaDesde(null, id);
    expect(r.degradado).toBe(true);
    expect(r.provisionales).toEqual([]); // el GTFS no conoce provisionales
    const del36 = r.normales.filter((e) => e.linea.shortName === '36');
    expect(del36).toHaveLength(2);
    const dirs = del36.map((e) => (e.rumbo.tipo === 'sentido' ? e.rumbo.directionId : null));
    expect(new Set(dirs)).toEqual(new Set([0, 1]));
    const destinos = del36.map((e) => (e.rumbo.tipo === 'sentido' ? e.rumbo.destino : ''));
    expect(destinos[0]).not.toBe(destinos[1]);
  });

  it('una CIRCULAR da una entrada pelada, sin inventar sentido', () => {
    const id = paradaDelPoste(20)!; // poste 20: la 30 es circular
    const del30 = correspondenciasDeParadaDesde(null, id).normales.filter((e) => e.linea.shortName === '30');
    expect(del30).toHaveLength(1);
    expect(del30[0].rumbo.tipo).toBe('circular');
  });

  it('un poste sin dato en el GTFS da vacío (el vacío se dice, no se pinta)', () => {
    const r = correspondenciasDeParadaDesde(null, idParada('___no-existe___'));
    expect(r.normales).toEqual([]);
    expect(r.provisionales).toEqual([]);
  });
});

describe('⭐ lector de correspondencias · CON ÍNDICE', () => {
  it('reparte normal vs provisional y conserva el sentido, degradado=false', () => {
    const id = paradaDelPoste(15)!; // poste real → posteDe = 15
    const indice = indiceCon({
      '15': {
        normales: [{ linea: '36', sentido: 0 }],
        provisionales: [{ linea: '21', sentido: 1 }],
      },
    });
    const r = correspondenciasDeParadaDesde(indice, id);
    expect(r.degradado).toBe(false);
    expect(r.normales.map((e) => e.linea.shortName)).toEqual(['36']);
    expect(r.normales[0].rumbo).toMatchObject({ tipo: 'sentido', directionId: 0 });
    // la provisional TAMBIÉN lleva su sentido (irrecuperable tras el barrido, se guardó)
    expect(r.provisionales.map((e) => e.linea.shortName)).toEqual(['21']);
    expect(r.provisionales[0].rumbo).toMatchObject({ tipo: 'sentido', directionId: 1 });
  });

  it('un poste presente en el índice pero sin correspondencias hoy → vacío, NO degradado', () => {
    const id = paradaDelPoste(15)!;
    const r = correspondenciasDeParadaDesde(indiceCon({ '999999': { normales: [{ linea: '36', sentido: 0 }], provisionales: [] } }), id);
    // el índice existe pero el 15 no está → hoy no pasa nada por aquí (no es degradado)
    expect(r.degradado).toBe(false);
    expect(r.normales).toEqual([]);
    expect(r.provisionales).toEqual([]);
  });

  it('una línea del índice que el GTFS ya no conoce se salta (reconciliación)', () => {
    const id = paradaDelPoste(15)!;
    const r = correspondenciasDeParadaDesde(
      indiceCon({ '15': { normales: [{ linea: 'ZZ-inventada', sentido: 0 }, { linea: '36', sentido: 0 }], provisionales: [] } }),
      id,
    );
    expect(r.normales.map((e) => e.linea.shortName)).toEqual(['36']); // la inventada, fuera
  });
});

describe('⭐ otrasLineasEnPoste (transbordos del itinerario, todos seguidos)', () => {
  it('del índice: colapsa a la línea, incluye provisionales, y quita la actual', () => {
    const id = paradaDelPoste(15)!;
    const indice = indiceCon({
      '15': {
        normales: [{ linea: '36', sentido: 0 }, { linea: '36', sentido: 1 }, { linea: '35', sentido: 0 }],
        provisionales: [{ linea: '21', sentido: 1 }],
      },
    });
    // Se excluye la línea 35 (la "actual"): no debe salir como transbordo de sí misma.
    const except = lineaDeEtiqueta('35')!.id;
    const nombres = otrasLineasEnPosteDesde(indice, 15, id, except).map((l) => l.shortName).sort();
    expect(nombres).not.toContain('35'); // la actual, fuera
    expect(nombres).toContain('21'); // provisional incluida (van todas seguidas)
    expect(nombres).toContain('36');
    expect(nombres.filter((n) => n === '36')).toHaveLength(1); // los dos sentidos colapsan a una
  });

  it('degradado (sin índice): sale de la ruta oficial del GTFS por sid', () => {
    const id = paradaDelPoste(744)!;
    const otras = otrasLineasEnPosteDesde(null, 744, id, idLinea('0'));
    expect(otras.length).toBeGreaterThan(0);
  });
});

describe('⭐ estadoIndice', () => {
  it('sin índice → presente=false, degradado=true', () => {
    expect(estadoIndiceDesde(null, Date.now())).toMatchObject({ presente: false, degradado: true });
  });

  it('con índice → edad calculada desde generadoEn', () => {
    const gen = '2026-07-22T02:00:00.000Z';
    const e = estadoIndiceDesde(indiceCon({}, gen), Date.parse(gen) + 3600_000);
    expect(e.presente).toBe(true);
    expect(e.edadSegundos).toBe(3600);
  });
});
