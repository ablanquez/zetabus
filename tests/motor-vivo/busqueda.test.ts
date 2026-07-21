/**
 * ⭐ EL BUSCADOR ENCUENTRA LO QUE LA GENTE TECLEA (pasada 2).
 *
 * Se prueba contra el ÍNDICE REAL (las 44 líneas + todas las paradas del GTFS),
 * armado igual que en `page.tsx`. Y con CONTRAPRUEBAS (rojo antes del verde): se
 * enseña que sin el alias "quinto" no se encuentra la 53, y que sin el desempate
 * "línea antes que parada" la 60 se hunde bajo las 335 paradas "Av. …".
 */

import { describe, it, expect } from 'vitest';
import { normalizar, indexar, buscar, ALIAS_LINEA, type Entrada } from '@/engine/busqueda';
import { lineas, paradas, posteDe, idParada, idLinea, sentidosParaRumbo } from '@/engine/topologia';
import { destinoDeSentido } from '@/engine/rumbo';

const destinosDe = (id: string) => {
  const s = sentidosParaRumbo(idLinea(id));
  return [...new Set(s.map((x) => destinoDeSentido(x, s)))].join(' ');
};

/** Las entradas como las arma la home. Flags para las contrapruebas. */
function entradasReales(conAlias = true, conDestinos = true): Entrada[] {
  const deLineas = lineas().map<Entrada>((l) => ({
    tipo: 'linea',
    clave: l.shortName.toLowerCase(),
    titulo: l.longName,
    sub: `línea ${l.shortName}`,
    alias: conAlias ? ALIAS_LINEA[l.shortName] : undefined,
    destinos: conDestinos ? destinosDe(String(l.id)) : undefined,
    href: '',
  }));
  const deParadas = paradas().flatMap<Entrada>((p) => {
    const poste = posteDe(idParada(String(p.id)));
    return poste === null ? [] : [{ tipo: 'parada', clave: String(poste), titulo: p.name, sub: `poste ${poste}`, href: '' }];
  });
  return [...deLineas, ...deParadas];
}

const indice = indexar(entradasReales());
const buscarR = (q: string) => buscar(indice, q);
const claves = (q: string) => buscarR(q).map((e) => `${e.clave}/${e.tipo}`);
const posDe = (q: string, clave: string) => buscarR(q).findIndex((e) => e.clave === clave);

describe('normalizar · pliega acentos, ñ y abreviaturas', () => {
  it('acentos y ñ: "peñaflor" y "penaflor" caen en el mismo texto', () => {
    expect(normalizar('Peñaflor')).toBe('penaflor');
    expect(normalizar('Aljafería')).toBe('aljaferia');
    expect(normalizar('Montañana')).toBe('montanana');
  });
  it('abreviaturas de callejero a los dos lados', () => {
    expect(normalizar('Avda')).toBe('avenida');
    expect(normalizar('Pza Aragón')).toBe('plaza aragon');
    // Con punto pegado deja un "." suelto (comportamiento previo), pero el match por
    // palabras sueltas lo salva: lo que importa es que la abreviatura se ABRE.
    expect(normalizar('Av. de Madrid')).toContain('avenida');
  });
});

describe('⭐ CONTRAPRUEBA · los dos rotos que la corrección de nombres dejó', () => {
  it('🔴→🟢 "quinto" NO encuentra la 53 sin alias; SÍ con alias', () => {
    // Rojo: el índice sin alias (como quedó tras corregir "Carlos Quinto"→"Carlos V").
    const sinAlias = indexar(entradasReales(false));
    expect(buscar(sinAlias, 'quinto').some((e) => e.clave === '53')).toBe(false);
    // Verde: con el alias "quinto" colgado de la 53.
    expect(claves('quinto')).toEqual(['53/linea']); // y SOLO la 53
  });

  it('🔴→🟢 "avda" hunde la 60 sin el desempate línea-primero; con él, va la 1ª', () => {
    // Rojo: mismo índice, pero ordenando solo por (puntos, longitud) —sin preferir
    //       la línea—: la 60 cae fuera de los 8 primeros (medido: estaba en el #293).
    const nq = 'avenida';
    const sinPref = indice
      .map(({ e, n }) => {
        let p = 99;
        if (e.clave === nq) p = 0; else if (e.clave.startsWith(nq)) p = 1;
        else if (n.startsWith(nq)) p = 3; else if (n.includes(nq)) p = 4;
        else if (nq.split(' ').every((t) => n.includes(t))) p = 6;
        return { e, p };
      })
      .filter((r) => r.p < 99)
      .sort((a, b) => a.p - b.p || a.e.titulo.length - b.e.titulo.length)
      .slice(0, 8)
      .map((r) => r.e.clave);
    expect(sinPref).not.toContain('60'); // 🔴 hundida
    // Verde: buscar() prefiere la línea dentro del nivel de nombre → la 60 lidera.
    expect(buscarR('avda')[0].clave).toBe('60'); // 🟢
    expect(buscarR('avenida')[0].clave).toBe('60');
  });
});

describe('⭐ lo que la gente teclea, encontrado', () => {
  it('romanos por su forma hablada/dígito (alias quirúrgico)', () => {
    expect(buscarR('quinto')[0].clave).toBe('53');
    expect(buscarR('siglo 21')[0].clave).toBe('23');
    expect(buscarR('siglo veintiuno')[0].clave).toBe('23');
    expect(buscarR('siglo xxi')[0].clave).toBe('23'); // la forma tal cual, intacta
  });
  it('la forma corregida sigue encontrando ("carlos", "avenida estudiantes")', () => {
    expect(claves('carlos')).toContain('53/linea');
    expect(buscarR('avenida estudiantes')[0].clave).toBe('60');
  });
  it('topónimos sin ñ ni tilde, y formas cortas', () => {
    expect(buscarR('penaflor').length).toBeGreaterThan(0);
    expect(buscarR('montanana').length).toBeGreaterThan(0);
    expect(claves('actur')).toContain('42/linea');
    expect(buscarR('canteras').some((e) => /canteras/i.test(e.titulo))).toBe(true);
  });
  it('el número de poste manda: "744" → el poste, no una línea', () => {
    expect(buscarR('744')[0]).toMatchObject({ tipo: 'parada', clave: '744' });
  });
});

describe('⭐ los DESTINOS también se indexan (el hueco de las circulares)', () => {
  it('🔴→🟢 "paseo de la ribera" NO hallaba la Ci4; ahora sí', () => {
    // Rojo: sin indexar destinos, la Ci4 se llama "Circular 4" y no dice a dónde va.
    const sinDestinos = indexar(entradasReales(true, false));
    expect(buscar(sinDestinos, 'paseo de la ribera').some((e) => e.clave === 'ci4')).toBe(false);
    // Verde: con los destinos indexados.
    expect(buscarR('paseo de la ribera').some((e) => e.clave === 'ci4')).toBe(true);
  });
  it('las circulares aparecen por su destino real', () => {
    expect(claves('estación delicias')).toContain('ci1/linea'); // y ci2
    expect(claves('estación delicias')).toContain('ci2/linea');
    expect(claves('las fuentes')).toContain('ci3/linea');
  });
  it('el destino de campo/lanzadera ya iba por el longName, y sigue: "complejo funerario" → C1', () => {
    expect(buscarR('complejo funerario').some((e) => e.clave === 'c1')).toBe(true);
  });
  it('⚠️ SIN RUIDO: "miralbueno" no se infla (ya iba por el nombre; no hay parada así)', () => {
    // Antes y después: las mismas líneas, ninguna parada llamada exactamente Miralbueno.
    const conD = buscarR('miralbueno');
    const sinD = buscar(indexar(entradasReales(true, false)), 'miralbueno');
    expect(conD.length).toBe(sinD.length);
    expect(conD.every((e) => e.tipo === 'linea')).toBe(true);
  });
});

describe('⚠️ FALSOS POSITIVOS · no encontrar de más', () => {
  it('"v" a secas no arrastra media red (Beethoven, Broto…): 0 resultados', () => {
    expect(buscarR('v')).toEqual([]);
  });
  it('"quinto" no arrastra paradas con "V": solo la 53', () => {
    expect(claves('quinto')).toEqual(['53/linea']);
  });
  it('un número sigue liderado por su poste/línea, no por el romano', () => {
    expect(buscarR('21')[0].clave).toBe('21'); // la LÍNEA 21, no la 23 (que lleva alias "21")
    expect(posDe('21', '23')).toBeLessThan(0); // la 23 ni asoma en los 8 primeros: sin ruido
    // "5": lo lideran postes/línea "5x"; la 53 no sube por ser "Carlos V".
    expect(buscarR('5')[0].tipo).toBe('parada');
  });
});

describe('la presentación NO cambia · el alias no se muestra', () => {
  it('el título de la 53 sigue siendo "Carlos V", sin "quinto"', () => {
    const l53 = lineas().find((l) => l.shortName === '53')!;
    expect(l53.longName).toBe('Plaza Emperador Carlos V - Miralbueno');
    expect(l53.longName).not.toMatch(/quinto/i);
  });
  it('la Ci4 se sigue mostrando "Circular 4" aunque se encuentre por su destino', () => {
    const ci4 = lineas().find((l) => l.shortName === 'Ci4')!;
    expect(ci4.longName).toBe('Circular 4'); // el destino "Paseo de la Ribera" NO se muestra
  });
});
