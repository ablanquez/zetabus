/**
 * ⭐⭐ EL GUARDIÁN DEL README. Que reviente si una cifra escrita en `README.md` o en
 * `docs/README.md` ya no es la que dice el propio repositorio.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ. El README llevaba 91 commits de `src/` diciendo que la aplicación no
 *  existía, y pasaba las más de mil pruebas del proyecto: ninguna mira la prosa. Y el
 *  índice de `docs/` indexaba 7 informes cuando ya había 13. Las cifras de un
 *  documento **caducan solas y en silencio** — nadie las rompe, dejan de ser
 *  ciertas mientras el fichero no se toca.
 *
 *  CÓMO. Un REGISTRO de afirmaciones: pares {patrón que la encuentra en el texto
 *  → función que calcula el valor REAL}. El test lee el documento, extrae el
 *  número y lo compara.
 *
 *  ⚠️ CONTRA LA FUENTE, NO CONTRA OTRA CONSTANTE (L1). Ninguna `real()` de aquí
 *     devuelve un número escrito a mano. Todas CUENTAN: los vehículos se cuentan
 *     por la procedencia de sus campos, los informes por los ficheros que hay en
 *     el directorio, las lecciones por sus encabezados. Comparar el número del
 *     README con otro número tecleado sería cometer el mismo error dos veces y
 *     llamarlo verificación.
 *
 *  ⚠️ SI EL PATRÓN NO ENCUENTRA NADA, TAMBIÉN ES ROJO. Una afirmación reescrita
 *     sale del registro sin avisar, y el guardián se quedaría verde vigilando una
 *     frase que ya no existe. Aquí eso se pone rojo y pide que se re-ancle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️⚠️ ALCANCE HONESTO — QUÉ CUBRE ESTE GUARDIÁN Y QUÉ NO
 *
 *  CUBRE: las afirmaciones CON NÚMERO que se pueden calcular desde el repositorio.
 *  Son las 14 del registro de abajo.
 *
 *  NO CUBRE — y esto no es una carencia que se vaya a tapar luego, es el reparto:
 *   · **La prosa sin número.** «Ni una línea de aplicación todavía», que es
 *     exactamente la frase que estuvo mintiendo 91 commits, NO TIENE NÚMERO y
 *     este guardián NO LA HABRÍA CAZADO. Esa parte es del OJO, y está escrita
 *     como tarea fija del cierre de tanda en `AGENTS.md`.
 *   · Las cifras que el repositorio no sabe calcular: cuántas pruebas hay, cuántas
 *     líneas caen en la franja rojo/ámbar/verde, cuántas veces hubo retractación.
 *     Están enumeradas en el test «lo que este registro NO puede verificar».
 *   · Enlaces e imágenes rotos: eso es otro guardián, y no está construido.
 *
 *  ⛔ NO LEER ESTE FICHERO COMO «ya hay un test que vigila el README». Vigila los
 *     números. La verdad del README sigue siendo cosa de mirarlo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lineas, paradas } from '@/engine/topologia';
import { TTL_MS } from '@/cache/dos-pisos';

// ─────────────────────────────────────────────────────────────────────────────
//  LAS FUENTES. Cada una CUENTA algo; ninguna lee un número ya escrito.
// ─────────────────────────────────────────────────────────────────────────────

const leer = (f: string): string => readFileSync(f, 'utf8');

/** Vehículos del maestro con al menos un campo procedente de esta fuente. */
function vehiculosDeFuente(id: string): number {
  const maestro = JSON.parse(leer('data/flota-avanza-zaragoza.json')) as {
    vehiculos: readonly { campos?: Record<string, { procedencia?: { fuente?: string } }> }[];
  };
  return maestro.vehiculos.filter((v) =>
    Object.values(v.campos ?? {}).some((c) => c?.procedencia?.fuente === id),
  ).length;
}

/** Informes de auditoría: los ficheros numerados que hay en el directorio. */
const informesDeAuditoria = (): number =>
  readdirSync('docs/auditoria').filter((f) => /^\d\d-.+\.md$/.test(f)).length;

/** Lecciones de método: sus encabezados en el documento, no la lista del índice. */
const leccionesDeMetodo = (): number =>
  (leer('docs/LECCIONES.md').match(/^## L\d+ /gm) ?? []).length;

/** La mayor de una dependencia, leída del `package.json` que instala npm. */
function mayorDe(dep: string): number {
  const p = JSON.parse(leer('package.json')) as { dependencies: Record<string, string> };
  const v = p.dependencies[dep];
  const n = Number(v?.match(/(\d+)/)?.[1]);
  if (!Number.isFinite(n)) throw new Error(`no hay versión de ${dep} en package.json`);
  return n;
}

/** El Node mínimo que declara `engines`. */
function nodeMinimo(): number {
  const p = JSON.parse(leer('package.json')) as { engines?: { node?: string } };
  const v = p.engines?.node?.match(/([\d.]+)/)?.[1];
  if (!v) throw new Error('no hay `engines.node` en package.json');
  return Number(v);
}

/** El zip del GTFS, en MB. `null` si no está descargado (no viaja en el repo). */
function gtfsMb(): number | null {
  const dir = 'data/gtfs';
  const zip = existsSync(dir) ? readdirSync(dir).find((f) => f.endsWith('.zip')) : undefined;
  if (!zip) return null;
  return statSync(join(dir, zip)).size / 1024 / 1024;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EL REGISTRO
// ─────────────────────────────────────────────────────────────────────────────

/** Números escritos con letra, que en prosa se usan tanto como los dígitos. */
const PALABRAS: Record<string, number> = {
  cero: 0, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
};

/**
 * «6,6» → 6.6 · «trece» → 13 · «1.257» → 1257 · «20.9» → 20.9. `null` si no es número.
 *
 * ⚠️ El punto es AMBIGUO en español: separa millares («1.257») pero también aparece
 * como decimal en versiones («Node 20.9»). Se trata como millar SOLO si el número
 * tiene la forma de millares (grupos de tres). La primera versión de esto leía
 * «20.9» como 209 y ponía el test rojo contra un README que decía la verdad.
 */
function aNumero(bruto: string): number | null {
  const limpio = bruto.trim().toLowerCase();
  if (limpio in PALABRAS) return PALABRAS[limpio];
  const millares = /^\d{1,3}(\.\d{3})+$/.test(limpio);
  const n = Number(millares ? limpio.replace(/\./g, '') : limpio.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

interface Afirmacion {
  /** El documento donde vive la frase. */
  readonly doc: string;
  /** Qué afirma, en una línea — es lo que se lee cuando el test se pone rojo. */
  readonly que: string;
  /** Global, y con el número en el grupo 1. Debe encontrar al menos una vez. */
  readonly patron: RegExp;
  /** El valor REAL, calculado desde la fuente. */
  readonly real: () => number;
  /** Margen para las cifras redondeadas a propósito (tamaños en MB). */
  readonly margen?: number;
}

const REGISTRO: readonly Afirmacion[] = [
  // ── README.md ──────────────────────────────────────────────────────────────
  {
    doc: 'README.md',
    que: 'cuántas líneas tiene la red',
    patron: /(\d+) líneas/g,
    real: () => lineas().length,
  },
  {
    doc: 'README.md',
    que: 'cuántas paradas tiene la red',
    patron: /(\d+) paradas/g,
    real: () => paradas().length,
  },
  {
    doc: 'README.md',
    que: 'cuántos vehículos trae el pliego municipal',
    patron: /registro oficial de la flota[^|]*?\*\*(\d+) vehículos\*\*/g,
    real: () => vehiculosDeFuente('pliego-2025-anexo5'),
  },
  {
    doc: 'README.md',
    que: 'cuántos vehículos aporta busesmadrid.es',
    patron: /\*\*(\d+) vehículos\*\* que circulan y no están en el pliego/g,
    real: () => vehiculosDeFuente('busesmadrid-2026-07-14'),
  },
  {
    doc: 'README.md',
    que: 'cuántos vehículos reconoce ZetaBus en total',
    patron: /los \*\*(\d+) vehículos\*\* que ZetaBus reconoce/g,
    real: () => {
      const m = JSON.parse(leer('data/flota-avanza-zaragoza.json')) as { vehiculos: unknown[] };
      return m.vehiculos.length;
    },
  },
  {
    doc: 'README.md',
    que: 'cuántos informes de auditoría hay',
    patron: /\(docs\/auditoria\/\) — ([a-záéíóúñ]+),/gu,
    real: informesDeAuditoria,
  },
  {
    doc: 'README.md',
    que: 'en cuántos segundos caducan los minutos de llegada',
    patron: /caducan en (\d+) segundos/g,
    real: () => TTL_MS / 1000,
  },
  {
    doc: 'README.md',
    que: 'qué mayor de Next.js se usa',
    patron: /Next\.js[- ](\d+)\b/g,
    real: () => mayorDe('next'),
  },
  {
    doc: 'README.md',
    que: 'qué mayor de React se usa',
    patron: /· React (\d+)\b/g,
    real: () => mayorDe('react'),
  },
  {
    doc: 'README.md',
    que: 'qué Node.js mínimo hace falta',
    patron: /\*\*Node\.js ([\d.]+)\*\* o superior/g,
    real: nodeMinimo,
  },

  // ── docs/README.md ─────────────────────────────────────────────────────────
  {
    doc: 'docs/README.md',
    que: 'sobre cuántas paradas cerró el puente de identidad',
    patron: /`, (\d+)\/(?:\d+) paradas/g,
    real: () => paradas().length,
  },
  {
    doc: 'docs/README.md',
    que: 'cuántas lecciones de método hay',
    patron: /\[\*\*LECCIONES\.md\*\*\]\(LECCIONES\.md\) — ([a-záéíóúñ]+),/giu,
    real: leccionesDeMetodo,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  EL MOTOR DE COMPROBACIÓN — el mismo que se prueba abajo con una mentira plantada
// ─────────────────────────────────────────────────────────────────────────────

interface Desajuste {
  readonly frase: string;
  readonly dice: number;
  readonly real: number;
}

/** Todos los desajustes de una afirmación dentro de un texto. Lanza si no encuentra la frase. */
function revisar(a: Afirmacion, texto: string): Desajuste[] {
  const real = a.real();
  const hallazgos = [...texto.matchAll(new RegExp(a.patron.source, a.patron.flags))];
  if (hallazgos.length === 0) {
    throw new Error(
      `el patrón de «${a.que}» ya no encuentra la frase en ${a.doc}.\n` +
        `   La afirmación se reescribió o desapareció, y el registro se quedaría VERDE\n` +
        `   vigilando un texto que ya no existe. Re-ancla el patrón en tests/readme-no-miente.ts.`,
    );
  }
  const fuera: Desajuste[] = [];
  for (const h of hallazgos) {
    const dice = aNumero(h[1]);
    if (dice === null) continue;
    const margen = a.margen ?? 0;
    if (Math.abs(dice - real) > margen) {
      fuera.push({ frase: h[0], dice, real });
    }
  }
  return fuera;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('⭐⭐ EL README NO MIENTE: las cifras escritas son las que dice el repositorio', () => {
  const documentos = new Map(
    [...new Set(REGISTRO.map((a) => a.doc))].map((d) => [d, leer(d)] as const),
  );

  for (const a of REGISTRO) {
    it(`${a.doc} · ${a.que}`, () => {
      const fuera = revisar(a, documentos.get(a.doc)!);
      expect(
        fuera,
        fuera.length
          ? `\n   ${a.doc} dice «${fuera[0].frase}», y el repositorio cuenta ${fuera[0].real}.\n` +
            `   Si el número nuevo es el bueno, corrige el documento. No toques el registro.`
          : '',
      ).toEqual([]);
    });
  }

  it('el índice de docs/ lista TODOS los informes de auditoría que hay', () => {
    // La cifra que más veces ha caducado del proyecto: el índice decía 7 cuando
    // ya había 13. No se compara con un número escrito: se cuentan las FILAS de
    // las tablas del índice contra los FICHEROS del directorio.
    const filas = (leer('docs/README.md').match(/^\| \d+ \| \[/gm) ?? []).length;
    expect(
      filas,
      `el índice de docs/README.md lista ${filas} informes y en docs/auditoria/ hay ${informesDeAuditoria()}`,
    ).toBe(informesDeAuditoria());
  });

  // El zip del GTFS NO viaja en el repositorio (`data/gtfs/README.md` explica por qué),
  // así que esta comprobación solo puede correr donde esté descargado. Se SALTA a la
  // vista —no se da por buena en silencio—: un `skipped` en la salida dice que aquí
  // nadie ha verificado nada.
  const mb = gtfsMb();
  it.skipIf(mb === null)('README.md · cuánto pesa el GTFS que se descarga', () => {
    const fuera = revisar(
      {
        doc: 'README.md',
        que: 'cuánto pesa el GTFS',
        patron: /descarga el GTFS oficial \(~([\d,]+) MB\)/g,
        real: () => mb!,
        margen: 0.1, // la cifra del README está redondeada a una decimal, a propósito
      },
      documentos.get('README.md')!,
    );
    expect(fuera).toEqual([]);
  });
});

describe('⭐ CONTRAPRUEBA: el motor caza una mentira plantada y una frase reescrita', () => {
  const afirmacion: Afirmacion = {
    doc: '(sintético)',
    que: 'cuántas líneas tiene la red',
    patron: /(\d+) líneas/g,
    real: () => lineas().length,
  };
  const reales = lineas().length;

  it('con el número bueno, no dice nada', () => {
    expect(revisar(afirmacion, `La red tiene ${reales} líneas hoy.`)).toEqual([]);
  });

  it('con un número cambiado a mano, lo caza y dice el real', () => {
    const fuera = revisar(afirmacion, `La red tiene ${reales + 1} líneas hoy.`);
    expect(fuera).toHaveLength(1);
    expect(fuera[0]).toMatchObject({ dice: reales + 1, real: reales });
  });

  it('caza la cifra rancia AUNQUE la frase buena esté también en el texto', () => {
    // El caso real: la misma cifra repetida en cuatro sitios y actualizada en tres.
    const fuera = revisar(afirmacion, `Son ${reales} líneas. Antes eran ${reales - 2} líneas.`);
    expect(fuera).toHaveLength(1);
    expect(fuera[0].dice).toBe(reales - 2);
  });

  it('si la frase se reescribe y el patrón deja de encontrarla, es ROJO, no verde', () => {
    expect(() => revisar(afirmacion, 'La red tiene unas cuantas rutas.')).toThrow(
      /ya no encuentra la frase/,
    );
  });

  it('entiende los números escritos con letra, que en prosa se usan igual', () => {
    expect(aNumero('trece')).toBe(13);
    expect(aNumero('6,6')).toBe(6.6);
    expect(aNumero('1.257')).toBe(1257);
    expect(aNumero('ninguno')).toBeNull();
  });
});

describe('⛔ LO QUE ESTE REGISTRO **NO** PUEDE VERIFICAR (y por tanto sigue siendo del ojo)', () => {
  // Este test no comprueba nada del repositorio: DECLARA el techo, y lo hace donde
  // se lee cuando algo se pone rojo. Un guardián que no dice lo que NO cubre
  // enseña a no mirar, que es peor que no tenerlo.
  it('la lista está escrita, y cada exclusión trae su motivo', () => {
    const NO_CONSTA = {
      'cuántas pruebas hay (motor y navegador)':
        'contarlas exige EJECUTAR las dos suites. El conteo estático de `it(` daba 398 cuando ' +
        'la suite corría 451 (hay tests generados en bucle): sería un número distinto ' +
        'disfrazado del mismo, y se quedaría verde estando mal. Por eso el README las dice ' +
        'como SUELO («más de 470»): un suelo aguanta que se añadan pruebas, que es lo que pasa.',
      '22 de las 44 líneas caen en la franja rojo/ámbar/verde':
        'no hay en el repositorio ninguna definición de «franja rojo/ámbar/verde». ' +
        'Calcularla aquí sería INVENTAR el criterio, no verificarlo.',
      'los tres informes en que hubo que retractarse':
        'solo 2 de los 13 informes llevan marca de retractación. La tercera puede estar ' +
        'dentro del cuerpo de otro. No hay marca mecánica que contar.',
      'siete fases de investigación de fuentes':
        'las fases no se corresponden una a una con los ficheros (hay una 7b). No es contable ' +
        'sin decidir a mano qué cuenta como fase.',
      'el fichero heredado mentía en el 20 % de las longitudes':
        'es un hallazgo histórico sobre un fichero que ya se sustituyó. No se recalcula: ' +
        'se cita al informe 07, que es donde está la medida.',
      'la aplicación existe / lo que hace / cómo se describe':
        '⭐ NO TIENE NÚMERO. Es la clase de afirmación que estuvo mintiendo 91 commits, ' +
        'y ningún registro de cifras la caza. Es del OJO, en el cierre de tanda (AGENTS.md).',
    };
    for (const [afirmacion, motivo] of Object.entries(NO_CONSTA)) {
      expect(motivo.length, `${afirmacion} debe traer su motivo escrito`).toBeGreaterThan(40);
    }
    expect(Object.keys(NO_CONSTA)).toHaveLength(6);
  });
});
