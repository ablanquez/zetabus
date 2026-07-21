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
import { rumboDe, destinoDeSentido, corregirDestino, corregirNombreLargo, destinoDeCampo, dosDestinos, type SentidoParaRumbo } from '@/engine/rumbo';
import { lineas, idLinea, esBuho, giroDe, grupoDe, sentidosParaRumbo } from '@/engine/topologia';

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
      // otro numeral, deletreado en el headsign; la parada final ya dice "Carlos V"
      expect(corregirDestino('Plaza Emperador Carlos Quinto')).toBe('Plaza Emperador Carlos V');
      expect(corregirDestino('San Jose')).toBe('San José');
      expect(corregirDestino('Aljaferia')).toBe('Aljafería');
      expect(corregirDestino('Camino Las Torres')).toBe('Camino de Las Torres'); // + preposición
      expect(corregirDestino('Actur - Rey Fernando')).toBe('Actur-Rey Fernando'); // unifica
      // preposición/artículo capitalizados por el ucwords (forma buena en el longName)
      expect(corregirDestino('Puerta Del Carmen')).toBe('Puerta del Carmen');
      expect(corregirDestino('Pinares De Venecia')).toBe('Pinares de Venecia');
      expect(corregirDestino('Paseo De La Ribera')).toBe('Paseo de la Ribera'); // Ci4
      expect(corregirDestino('Miralbueno')).toBe('Miralbueno'); // no es un roto: intacto
    });

    it('se aplica DENTRO de destinoDeSentido → la botonera y el h1 ya dan "Siglo XXI"', () => {
      const l = lineas().find((x) => x.shortName === '23')!;
      const sents = sentidosParaRumbo(idLinea(String(l.id)));
      const etiquetas = sents.map((s) => destinoDeSentido(s, sents));
      expect(etiquetas).toContain('Siglo XXI');
      expect(etiquetas).not.toContain('Siglo Xxi'); // el roto NO se cuela en pantalla
    });

    // ── DESTINOS DE CIRCULAR rotos por el ucwords (58, 59, Ci4) ────────────────
    it('el "Circular por X" sale con el barrio bien escrito (58, 59, Ci4)', () => {
      // 58: "Fuente Junquera" (sin "de La"); 59: "Tranvia-Arcosur"; Ci4: "Paseo De La Ribera".
      expect(rumboReal('58')).toEqual({ tipo: 'circular', por: 'Fuente de La Junquera' });
      expect(rumboReal('59')).toEqual({ tipo: 'circular', por: 'Arcosur' });
      expect(rumboReal('Ci4')).toEqual({ tipo: 'circular', por: 'Paseo de la Ribera' });
    });
  });

  // ── EL NOMBRE LARGO (route_long_name), corregido ───────────────────────────
  describe('corregirNombreLargo · los 8 rotos del longName, y solo esos', () => {
    it('arregla los conocidos (acento, romano, guion, barra, abreviatura)', () => {
      expect(corregirNombreLargo('Estacion Delicias - Cementerio')).toBe('Estación Delicias - Cementerio');
      expect(corregirNombreLargo('Plaza Emperador Carlos Quinto - Miralbueno')).toBe('Plaza Emperador Carlos V - Miralbueno');
      expect(corregirNombreLargo('Estación Miraflores - Actur Rey Fernando')).toBe('Estación Miraflores - Actur-Rey Fernando');
      expect(corregirNombreLargo('Avda Estudiantes -  Actur Rey Fernando')).toBe('Avenida Estudiantes - Actur-Rey Fernando');
      expect(corregirNombreLargo('Coso - Montañana/Peñaflor')).toBe('Coso - Montañana / Peñaflor');
      expect(corregirNombreLargo('Barrio Jesús - Oliver - Miralbueno')).toBe('Barrio Jesús - Oliver / Miralbueno');
    });
    it('deja intactos los que ya estaban bien (incl. C1/C4 con "Las" mayúscula, y los búhos)', () => {
      expect(corregirNombreLargo('Plaza de Las Canteras - Complejo Funerario')).toBe('Plaza de Las Canteras - Complejo Funerario');
      expect(corregirNombreLargo('Parque Venecia - Siglo XXI')).toBe('Parque Venecia - Siglo XXI');
      expect(corregirNombreLargo('Pza. Aragón - La Almozara - Actur Rey F. - P. Goya - Arrabal'))
        .toBe('Pza. Aragón - La Almozara - Actur Rey F. - P. Goya - Arrabal'); // N2: no se toca
    });
    it('lo que expone la topología YA viene corregido (la 53 real)', () => {
      const l = lineas().find((x) => x.shortName === '53')!;
      expect(l.longName).toBe('Plaza Emperador Carlos V - Miralbueno');
    });
  });

  // ── ⭐ DE 10 CONTRADICCIONES A 0 · el longName casa con sus destinos ─────────
  // La auditoría contó 10 líneas donde el longName y los destinos NO coincidían.
  // Tras la corrección, NINGUNA debe contradecirse: cada destino (o el "por" de la
  // circular) tiene que aparecer, ya corregido, dentro de su longName corregido.
  it('⭐ ninguna línea contradice hoy su longName (folded, ignora acentos)', () => {
    const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const contradicen: string[] = [];
    for (const l of lineas()) {
      const g = grupoDe(l);
      const long = fold(l.longName);
      const sents = sentidosParaRumbo(idLinea(String(l.id)));
      if (esBuho(l)) continue; // los búhos son rondas: su longName es la lista, no A-B
      if (g === 'circular') continue; // Ci1-4 se llaman "Circular N": el longName no nombra el destino
      if (g === 'diurna' || g === 'lanzadera') {
        const par = dosDestinos(sents, l.longName);
        if (par) {
          for (const d of par) if (!long.includes(fold(d))) contradicen.push(`${l.shortName}: "${d}" ∉ "${l.longName}"`);
          continue;
        }
      }
      // circular / sentido único: el "por" (o el destino) debe estar en el longName
      const activo = sents[0];
      if (!activo) continue;
      const r = rumboDe(activo, sents, { esBuho: esBuho(l), nombreLargo: l.longName });
      const clave = r.tipo === 'circular' ? r.por : r.tipo === 'trayecto' ? r.destino : '';
      if (clave && !long.includes(fold(clave))) contradicen.push(`${l.shortName}: "${clave}" ∉ "${l.longName}"`);
    }
    expect(contradicen, `líneas que se contradicen: ${contradicen.join(' ; ')}`).toEqual([]);
  });

  // ── EL DESTINO DE CAMPO (Antonio manda sobre el GTFS) ──────────────────────
  describe('destinoDeCampo · conocimiento de campo por (línea, headsign)', () => {
    it('la barra nombra una ZONA: la 21 "Miralbueno" → "Oliver / Miralbueno"', () => {
      expect(destinoDeCampo('21', 'Miralbueno')).toBe('Oliver / Miralbueno');
      expect(destinoDeCampo('28', 'Peñaflor')).toBe('Montañana / Peñaflor');
    });
    it('las lanzaderas C1/C4 traen el par mal: se pone a mano ("Las" en mayúscula)', () => {
      expect(destinoDeCampo('C1', 'Complejo')).toBe('Complejo Funerario');
      expect(destinoDeCampo('C1', 'Plaza Canteras')).toBe('Plaza de Las Canteras');
      expect(destinoDeCampo('C4', 'Plaza De Las Canteras')).toBe('Plaza de Las Canteras');
    });
    it('no toca "Miralbueno" de OTRA línea (52, 53): está indexado por línea', () => {
      expect(destinoDeCampo('52', 'Miralbueno')).toBeUndefined();
      expect(destinoDeCampo('53', 'Miralbueno')).toBeUndefined();
    });
    it('viaja hasta destinoDeSentido a través de la topología (la 21 real)', () => {
      const l = lineas().find((x) => x.shortName === '21')!;
      const sents = sentidosParaRumbo(idLinea(String(l.id)));
      const etiquetas = sents.map((s) => destinoDeSentido(s, sents));
      expect(etiquetas).toContain('Oliver / Miralbueno');
      expect(etiquetas).not.toContain('Miralbueno'); // el crudo NO se cuela
    });
  });

  // ── LOS DOS DESTINOS DE LA HOME ────────────────────────────────────────────
  describe('dosDestinos · las diurnas de doble sentido dan dos destinos ordenados', () => {
    const dd = (sn: string) => {
      const l = lineas().find((x) => x.shortName === sn)!;
      return dosDestinos(sentidosParaRumbo(idLinea(String(l.id))), l.longName);
    };
    it('la 21: la zona con barra NO se parte ("Barrio Jesús" / "Oliver / Miralbueno")', () => {
      expect(dd('21')).toEqual(['Barrio Jesús', 'Oliver / Miralbueno']);
    });
    it('la 28: "Coso" / "Montañana / Peñaflor", la barra intacta', () => {
      expect(dd('28')).toEqual(['Coso', 'Montañana / Peñaflor']);
    });
    it('la 23: el destino CORREGIDO ("Siglo XXI") sale en su renglón', () => {
      expect(dd('23')).toEqual(['Parque Venecia', 'Siglo XXI']);
    });
    it('la 34: "Estación Delicias" arriba, casando con el longName ya corregido', () => {
      expect(dd('34')).toEqual(['Estación Delicias', 'Cementerio']);
    });
    it('la 53: al corregir el longName, "Carlos V" sube al primer renglón', () => {
      expect(dd('53')).toEqual(['Plaza Emperador Carlos V', 'Miralbueno']);
    });
    it('la 60: "Avenida Estudiantes" arriba (antes "Avda" no casaba y caía)', () => {
      expect(dd('60')).toEqual(['Avenida Estudiantes', 'Actur-Rey Fernando']);
    });
    it('las lanzaderas C1/C4 también van a dos renglones, con el par de Antonio', () => {
      expect(dd('C1')).toEqual(['Plaza de Las Canteras', 'Complejo Funerario']);
      expect(dd('C4')).toEqual(['Plaza de Las Canteras', 'Puerto Venecia']);
    });
    it('una circular de bucle (Ci3) → null: no tiene dos extremos', () => {
      expect(dd('Ci3')).toBeNull();
    });
    it('una diurna de SENTIDO ÚNICO (30) → null: solo un destino', () => {
      expect(dd('30')).toBeNull();
    });
  });

  // ── EL SENTIDO DE GIRO (Antonio) ───────────────────────────────────────────
  describe('giroDe · el icono ↻/↺ de las circulares, dato de campo', () => {
    const por = (sn: string) => lineas().find((l) => l.shortName === sn)!;
    it('las circulares al tranvía y Ci1/Ci3 giran en horario', () => {
      for (const sn of ['30', '54', '55', '56', '57', '58', '59', 'Ci1', 'Ci3']) {
        expect(giroDe(por(sn)), `${sn} debería ser horario`).toBe('horario');
      }
    });
    it('Ci2 y Ci4 giran al revés (antihorario)', () => {
      expect(giroDe(por('Ci2'))).toBe('antihorario');
      expect(giroDe(por('Ci4'))).toBe('antihorario');
    });
    it('una línea de ida y vuelta NO gira (null): la 21, la 35', () => {
      expect(giroDe(por('21'))).toBeNull();
      expect(giroDe(por('35'))).toBeNull();
    });
  });

  // ── ⭐⭐ COHERENCIA · LAS TRES PANTALLAS DICEN EL MISMO TEXTO ────────────────
  // La home (dosDestinos), el <h1> y la botonera ("Hacia X") salen TODAS de
  // `destinoDeSentido`. Se afirma que, para cada línea de dos renglones, el par de
  // la home es EXACTAMENTE el conjunto de etiquetas de sus sentidos. Si un día
  // alguien bifurca el cálculo, esto se pone rojo — es "la ley de las 26 copias".
  it('⭐ el par de la home == el conjunto de destinos de los sentidos (botonera/h1)', () => {
    const discrepan: string[] = [];
    for (const l of lineas()) {
      const g = grupoDe(l);
      if (g !== 'diurna' && g !== 'lanzadera') continue;
      const sents = sentidosParaRumbo(idLinea(String(l.id)));
      const par = dosDestinos(sents, l.longName);
      if (!par) continue;
      const botonera = sents.map((s) => destinoDeSentido(s, sents)).sort();
      if ([...par].sort().join('|') !== botonera.join('|')) {
        discrepan.push(`${l.shortName}: home=[${par}] botonera=[${botonera}]`);
      }
    }
    expect(discrepan, `desajuste home↔botonera: ${discrepan.join(' ; ')}`).toEqual([]);
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
