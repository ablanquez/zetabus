/**
 * ⭐ EL RUMBO: origen → destino del sentido activo, sin mentir en los bucles.
 *
 * Se prueba en dos capas:
 *   1) la función PURA `rumboDe`, con sentidos fabricados (rápido, sin artefacto);
 *   2) contra los DATOS REALES del feed (`sentidosParaRumbo`), que es donde viven
 *      los casos raros de verdad: la N2 (headsign compartido) y los bucles.
 *
 * ⚠️ CONTRAPRUEBAS: no basta con que salga bien; se enseña que el atajo ingenuo
 *    (usar el headsign del otro sentido a pelo) MENTIRÍA en la N2, y que ningún
 *    sentido de ninguna línea produce jamás una flecha "X → X".
 */

import { describe, it, expect } from 'vitest';
import { rumboDe, destinoDeSentido, corregirDestino, dosDestinos, type SentidoParaRumbo } from '@/engine/rumbo';
import { lineas, idLinea, esBuho, sentidosParaRumbo } from '@/engine/topologia';

const CTX_DIURNA = { esBuho: false, nombreLargo: 'x' };
const CTX_BUHO = { esBuho: true, nombreLargo: 'Ronda de barrios' };

/** Una línea normal de ida y vuelta, tipo 35 (Parque Goya ⇄ Seminario). */
const IDA: SentidoParaRumbo = {
  directionId: 1, headsign: 'Parque Goya',
  primeraParada: 'Sainz de Varanda', ultimaParada: 'La Fragua', esBucle: false,
};
const VUELTA: SentidoParaRumbo = {
  directionId: 0, headsign: 'Seminario',
  primeraParada: 'La Fragua', ultimaParada: 'Sainz de Varanda', esBucle: false,
};

describe('rumboDe · función pura', () => {
  it('ida y vuelta: pinta origen → destino, tomando el origen del OTRO sentido', () => {
    const r = rumboDe(IDA, [IDA, VUELTA], CTX_DIURNA);
    expect(r).toEqual({ tipo: 'trayecto', origen: 'Seminario', destino: 'Parque Goya' });
    // El sentido contrario invierte la flecha.
    const r2 = rumboDe(VUELTA, [IDA, VUELTA], CTX_DIURNA);
    expect(r2).toEqual({ tipo: 'trayecto', origen: 'Parque Goya', destino: 'Seminario' });
  });

  it('un BUCLE diurno/circular → "Circular por {headsign}", NUNCA una flecha', () => {
    const bucle: SentidoParaRumbo = {
      directionId: 0, headsign: 'Las Fuentes',
      primeraParada: 'Echegaray', ultimaParada: 'Echegaray', esBucle: true,
    };
    expect(rumboDe(bucle, [bucle], CTX_DIURNA)).toEqual({ tipo: 'circular', por: 'Las Fuentes' });
  });

  it('un BUCLE de BÚHO → su nombre oficial (no es "una circular")', () => {
    const bucle: SentidoParaRumbo = {
      directionId: 0, headsign: 'P.Aragón - La Jota - Vadorrey',
      primeraParada: 'Plaza Aragón', ultimaParada: 'Plaza Aragón', esBucle: true,
    };
    expect(rumboDe(bucle, [bucle], CTX_BUHO)).toEqual({ tipo: 'nombre', texto: 'Ronda de barrios' });
  });

  it('headsign VACÍO degrada a la última parada real (no deja el destino en blanco)', () => {
    const sinHead: SentidoParaRumbo = { ...IDA, headsign: '  ' };
    expect(destinoDeSentido(sinHead, [sinHead, VUELTA])).toBe('La Fragua');
  });

  // ── CONTRAPRUEBA · LA N2 ──────────────────────────────────────────────────
  // Dos sentidos DE VERDAD, pero con el MISMO headsign (una lista de barrios).
  describe('headsign COMPARTIDO entre sentidos (la N2)', () => {
    const RONDA = 'Pza. Aragón - La Almozara - Actur - P. Goya';
    const N2_IDA: SentidoParaRumbo = {
      directionId: 0, headsign: RONDA,
      primeraParada: 'Plaza Aragón', ultimaParada: 'La Fragua', esBucle: false,
    };
    const N2_VUELTA: SentidoParaRumbo = {
      directionId: 1, headsign: RONDA,
      primeraParada: 'La Fragua', ultimaParada: 'Plaza Aragón', esBucle: false,
    };
    const sentidos = [N2_IDA, N2_VUELTA];

    it('⛔ el atajo INGENUO (headsign del otro sentido) daría "X → X": mentiría', () => {
      // Esto es lo que se rompería si no se detectara el colapso. Se afirma que
      // el colapso EXISTE (los dos headsign son idénticos) para justificar el guardia.
      expect(N2_IDA.headsign).toBe(N2_VUELTA.headsign);
    });

    it('destinoDeSentido cae a la parada real, y DISTINGUE los dos sentidos', () => {
      const dIda = destinoDeSentido(N2_IDA, sentidos);
      const dVuelta = destinoDeSentido(N2_VUELTA, sentidos);
      expect(dIda).toBe('La Fragua'); // no la ronda repetida
      expect(dVuelta).toBe('Plaza Aragón');
      expect(dIda).not.toBe(dVuelta); // los botones "Hacia X" no se confunden
    });

    it('rumboDe nunca produce "X → X": origen ≠ destino', () => {
      const r = rumboDe(N2_IDA, sentidos, CTX_BUHO);
      expect(r.tipo).toBe('trayecto');
      if (r.tipo === 'trayecto') expect(r.origen).not.toBe(r.destino);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('rumboDe · contra los datos REALES del feed', () => {
  const por = (sn: string) => lineas().find((l) => l.shortName === sn)!;
  const rumboReal = (sn: string, dir?: 0 | 1) => {
    const l = por(sn);
    const sents = sentidosParaRumbo(idLinea(String(l.id)));
    const activo = dir === undefined ? sents[0] : sents.find((s) => s.directionId === dir)!;
    return rumboDe(activo, sents, { esBuho: esBuho(l), nombreLargo: l.longName });
  };

  it('la 35 es un trayecto entre Parque Goya y Seminario, con flecha', () => {
    const r = rumboReal('35');
    expect(r.tipo).toBe('trayecto');
    if (r.tipo === 'trayecto') {
      expect([r.origen, r.destino].sort()).toEqual(['Parque Goya', 'Seminario']);
    }
  });

  it('la N2 (headsign compartido) SÍ distingue sus dos botones "Hacia X"', () => {
    const l = por('N2');
    const sents = sentidosParaRumbo(idLinea(String(l.id)));
    expect(sents.length).toBe(2);
    const etiquetas = sents.map((s) => destinoDeSentido(s, sents));
    expect(etiquetas[0]).not.toBe(etiquetas[1]); // ⛔ si el headsign colapsara, serían iguales
  });

  it('Ci3 es circular de bucle → "Circular por Las Fuentes"', () => {
    expect(rumboReal('Ci3')).toEqual({ tipo: 'circular', por: 'Las Fuentes' });
  });

  it('N1 es un búho de bucle → su nombre oficial, sin flecha ni "Circular"', () => {
    const l = por('N1');
    const r = rumboReal('N1');
    expect(r).toEqual({ tipo: 'nombre', texto: l.longName });
  });

  // ── CORRECCIÓN ORTOGRÁFICA DE LOS DESTINOS (el ucwords del GTFS) ────────────
  describe('corregirDestino · el ucwords roto del GTFS se arregla EN LA FUENTE', () => {
    it('arregla los rotos conocidos; deja igual lo que ya está bien', () => {
      expect(corregirDestino('Siglo Xxi')).toBe('Siglo XXI'); // el peor: el numeral romano
      expect(corregirDestino('San Jose')).toBe('San José');
      expect(corregirDestino('Aljaferia')).toBe('Aljafería');
      expect(corregirDestino('Camino Las Torres')).toBe('Camino de Las Torres'); // + preposición
      expect(corregirDestino('Actur - Rey Fernando')).toBe('Actur-Rey Fernando'); // unifica
      // preposición/artículo capitalizados por el ucwords (forma buena en el longName)
      expect(corregirDestino('Puerta Del Carmen')).toBe('Puerta del Carmen');
      expect(corregirDestino('Pinares De Venecia')).toBe('Pinares de Venecia');
      expect(corregirDestino('Miralbueno')).toBe('Miralbueno'); // no es un roto: intacto
    });

    it('se aplica DENTRO de destinoDeSentido → la botonera y el h1 ya dan "Siglo XXI"', () => {
      const l = lineas().find((x) => x.shortName === '23')!;
      const sents = sentidosParaRumbo(idLinea(String(l.id)));
      const etiquetas = sents.map((s) => destinoDeSentido(s, sents));
      expect(etiquetas).toContain('Siglo XXI');
      expect(etiquetas).not.toContain('Siglo Xxi'); // el roto NO se cuela en pantalla
    });
  });

  // ── LOS DOS DESTINOS DE LA HOME ────────────────────────────────────────────
  describe('dosDestinos · las diurnas de doble sentido dan dos destinos ordenados', () => {
    const dd = (sn: string) => {
      const l = lineas().find((x) => x.shortName === sn)!;
      return dosDestinos(sentidosParaRumbo(idLinea(String(l.id))), l.longName);
    };
    it('la 21: dos destinos, en el orden del nombre ("Barrio Jesús - … - Miralbueno")', () => {
      expect(dd('21')).toEqual(['Barrio Jesús', 'Miralbueno']);
    });
    it('la 23: el destino CORREGIDO ("Siglo XXI") sale en su renglón', () => {
      expect(dd('23')).toEqual(['Parque Venecia', 'Siglo XXI']);
    });
    it('una circular de bucle (Ci3) → null: no tiene dos extremos', () => {
      expect(dd('Ci3')).toBeNull();
    });
    it('una diurna de SENTIDO ÚNICO (30) → null: solo un destino', () => {
      expect(dd('30')).toBeNull();
    });
  });

  // ── INVARIANTE · NINGUNA línea, en NINGÚN sentido, pinta una flecha "X → X" ──
  it('⛔ ningún sentido de ninguna línea produce origen === destino', () => {
    const culpables: string[] = [];
    for (const l of lineas()) {
      const sents = sentidosParaRumbo(idLinea(String(l.id)));
      for (const activo of sents) {
        const r = rumboDe(activo, sents, { esBuho: esBuho(l), nombreLargo: l.longName });
        if (r.tipo === 'trayecto' && r.origen === r.destino) {
          culpables.push(`${l.shortName}/dir${activo.directionId}`);
        }
      }
    }
    expect(culpables, `flechas "X → X": ${culpables.join(', ')}`).toEqual([]);
  });
});
