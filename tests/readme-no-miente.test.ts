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
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
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

/**
 * ⭐⭐ EL REPOSITORIO — no el disco.
 *
 * Todo lo que git tiene seguido, y los directorios que lo contienen (para que un
 * enlace a una carpeta, `](docs/auditoria/)`, también valga).
 *
 * ⚠️⚠️ ESTO ES LO QUE ARREGLA EL FALLO, Y NO SE REVIERTA POR COMODIDAD:
 *
 *    ⭐ Cuando un guardián valida algo que SE PUBLICA, su universo tiene que ser
 *      LO PUBLICADO. El disco local es el sitio donde todas las respuestas salen
 *      bien.
 *
 * La versión anterior preguntaba `existsSync`. En la máquina donde se desarrolla,
 * «¿está en este disco?» y «¿está en el repositorio?» dan la misma respuesta casi
 * siempre — y por eso el fallo solo aparece en el clon de otro, que es donde ya no
 * se puede corregir a tiempo. Caso real: `docs/SPIKE_SUELO_DE_ZOOM.md` enlaza
 * capturas de `/capturas/`, que el `.gitignore` deniega. Existían aquí; no existen
 * para nadie más, y el guardián las daba por buenas.
 *
 * Si git no contesta, esto revienta en voz alta. Un `catch` que devolviera un
 * conjunto vacío dejaría el guardián verde sin haber mirado nada.
 */
const REPOSITORIO = (() => {
  const lista = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
  const ficheros = new Set(lista);
  const directorios = new Set<string>();
  for (const f of lista) {
    for (let d = posix.dirname(f); d && d !== '.'; d = posix.dirname(d)) directorios.add(d);
  }
  return { ficheros, directorios };
})();

/**
 * Los destinos que un documento enlaza, **en todas las formas que sabe leer GitHub**.
 * Si el guardián solo conociera dos de las que se usan, seguiría sin cubrir lo que
 * dice cubrir.
 */
function destinosDe(texto: string): string[] {
  const d: string[] = [];
  for (const m of texto.matchAll(/\]\(([^)\s]+?)\)/g)) d.push(m[1]); // [x](destino)
  for (const m of texto.matchAll(/<img[^>]+\bsrc="([^"]+)"/g)) d.push(m[1]); // <img src="…">
  for (const m of texto.matchAll(/<a[^>]+\bhref="([^"]+)"/g)) d.push(m[1]); // <a href="…">
  for (const m of texto.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)) d.push(m[1]); // [ref]: destino
  for (const m of texto.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const trozo of m[1].split(',')) d.push(trozo.trim().split(/\s+/)[0]); // srcset
  }
  return d;
}

/**
 * Los destinos de un texto que **no están en el repositorio**, resueltos desde el
 * directorio del documento. Se ignoran los enlaces externos, las anclas de la
 * propia página y los `data:`; el `#fragmento` y el `:línea` de un destino local se
 * recortan (`medir.ts#L84` sigue siendo `medir.ts`).
 */
function enlacesDe(doc: string, texto: string): string[] {
  const base = posix.dirname(doc.split('\\').join('/'));
  const rotos: string[] = [];
  for (const destino of destinosDe(texto)) {
    if (/^(https?:|mailto:|data:|#)/.test(destino)) continue;
    const limpio = destino
      .split('#')[0]
      .replace(/:\d+(-\d+)?$/, '')
      .replace(/\/$/, '');
    if (!limpio) continue;
    const ruta = posix.normalize(posix.join(base, limpio));
    if (!REPOSITORIO.ficheros.has(ruta) && !REPOSITORIO.directorios.has(ruta)) rotos.push(destino);
  }
  return [...new Set(rotos)];
}

const enlacesRotos = (doc: string): string[] => enlacesDe(doc, leer(doc));

/**
 * **Todos** los `.md` del repositorio, no solo los de `docs/`. El README vive en la
 * raíz y es la página que más se mira del proyecto: dejarlo fuera era exactamente
 * el fallo de alcance que este guardián ya cometió una vez.
 *
 * ⚠️ `ZETABUS-ESTADO.md` entra también, aunque sea el único fichero que estas
 * reglas prohíben modificar (ver `AGENTS.md`). Está publicado, así que un enlace
 * roto suyo es tan público como cualquier otro; y **dejar fuera de la lista el
 * documento que más se edita y menos se revisa es justo cómo se pudrieron los 21
 * del cuaderno de campo**. Si se pone rojo, el arreglo va al informe de la tanda,
 * no a una edición desde aquí: el guardián avisa, no autoriza.
 */
const documentosDelRepositorio = (): string[] =>
  [...REPOSITORIO.ficheros].filter((f) => f.endsWith('.md')).sort();

/**
 * ⚠️ DEUDA DECLARADA · 25/07/2026 — los enlaces que hoy apuntan fuera del repositorio.
 *
 * Aparecieron al cambiar el universo del guardián de «el disco» a «lo publicado».
 * Los dos enlazan capturas de `/capturas/`, que el `.gitignore` deniega a propósito
 * («se regeneran con `npm run visual`»): existen en la máquina donde se escribió el
 * spike y **no existen para nadie que clone**.
 *
 * ⛔ ESTO NO ES UNA LISTA DE PERDÓN, Y SE VIGILA A SÍ MISMA. La comprobación exige
 * igualdad EXACTA con esta lista, así que:
 *   · si aparece un enlace roto nuevo → ROJO (la lista no puede crecer en silencio),
 *   · y si uno de estos se arregla → TAMBIÉN ROJO, pidiendo que se quite de aquí.
 * Una excepción que no se retira sola acaba siendo permanente sin que nadie lo decida.
 *
 * ⚠️ Y no se arreglan desde aquí porque **no es un arreglo, es una decisión**: o se
 * publican esas dos capturas, o se cambia el texto del spike. Antonio elige.
 */
const PENDIENTES: readonly string[] = [
  'docs/SPIKE_SUELO_DE_ZOOM.md → ../capturas/zetabus/ZOOM-13-poste47.png',
  'docs/SPIKE_SUELO_DE_ZOOM.md → ../capturas/zetabus/ZOOM-14-poste47.png',
];

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

  it('⭐ ningún enlace de NINGÚN .md apunta fuera del repositorio', () => {
    // ⚠️ EL ALCANCE SE HA AMPLIADO DOS VECES, Y LAS DOS PORQUE SE MIDIÓ QUE NO
    // LLEGABA. Primero miraba solo `docs/README.md`: no cazó ninguno de los 12
    // enlaces rotos del 24/07, que vivían DENTRO de los documentos. Después
    // miraba todo `docs/`: no cazaba ninguna de las 8 imágenes del README, que
    // está en la raíz y encima las enlaza con `<img src>`.
    const documentos = documentosDelRepositorio();
    // Sanity ANTES de la comprobación: si la lista viniera vacía —git ausente,
    // clon superficial— el test pasaría en verde sin haber mirado nada, que es
    // exactamente el fallo que este fichero persigue.
    expect(documentos.length, 'la lista de documentos del repositorio no puede venir vacía')
      .toBeGreaterThan(40);

    const rotos = documentos.flatMap((d) => enlacesRotos(d).map((e) => `${d} → ${e}`)).sort();
    expect(
      rotos,
      `enlaces que apuntan a algo que NO está en el repositorio ` +
        `(${documentos.length} documentos revisados):\n   ` +
        rotos.join('\n   ') +
        '\n   Si uno de estos ya está arreglado, QUITA su línea de PENDIENTES.',
    ).toEqual(PENDIENTES);
  });

  it('⭐ CONTRAPRUEBA: caza las cuatro formas de enlazar, no solo la de markdown', () => {
    // Sobre texto sintético, para no tocar los documentos de verdad.
    const d = 'README.md';
    expect(enlacesDe(d, '<img src="docs/capturas/logo.png">')).toEqual([]);
    expect(enlacesDe(d, '<img src="docs/capturas/no-existe.png">')).toEqual([
      'docs/capturas/no-existe.png',
    ]);
    expect(enlacesDe(d, '<a href="docs/README.md">x</a>')).toEqual([]);
    expect(enlacesDe(d, '<a href="docs/no-existe.md">x</a>')).toEqual(['docs/no-existe.md']);
    expect(enlacesDe(d, '[ref]: docs/no-existe.md')).toEqual(['docs/no-existe.md']);
    expect(enlacesDe(d, '<img srcset="docs/capturas/logo.png 1x, docs/nada.png 2x">')).toEqual([
      'docs/nada.png',
    ]);
    // Los externos, las anclas y los `data:` no se comprueban:
    expect(enlacesDe(d, '[x](https://ejemplo.org/nada) [y](#ancla) <img src="data:image/png;b">'))
      .toEqual([]);
  });

  it('⭐ CONTRAPRUEBA: el destino se resuelve desde el directorio de CADA documento', () => {
    // El mismo destino relativo significa cosas distintas según dónde viva la
    // frase, y ahí es donde un comprobador de enlaces se vuelve inútil en silencio.
    expect(enlacesDe('docs/auditoria/03-fase5-desvios.md', '[x](01-fase3-cruce-gtfs.md)')).toEqual(
      [],
    );
    expect(enlacesDe('docs/README.md', '[x](01-fase3-cruce-gtfs.md)')).toEqual([
      '01-fase3-cruce-gtfs.md', // desde el índice ese destino NO existe: está en auditoria/
    ]);
    expect(enlacesDe('docs/README.md', '[x](auditoria/01-fase3-cruce-gtfs.md)')).toEqual([]);
    // Un enlace a un DIRECTORIO que contiene ficheros seguidos también vale:
    expect(enlacesDe('docs/README.md', '[x](auditoria/)')).toEqual([]);
  });

  it('⭐⭐ CONTRAPRUEBA: lo que existe en el DISCO pero no en el repositorio es ROJO', () => {
    // ⚠️ Esta es la que prueba el cambio de universo, y no vale con texto
    // sintético: se busca un fichero REAL que esté en el disco y que el
    // `.gitignore` deje fuera. Si no hubiera ninguno, la comprobación no
    // probaría nada y hay que decirlo en vez de dar verde.
    const ignorado = 'capturas/zetabus/ZOOM-14-poste47.png';
    if (!existsSync(ignorado)) {
      throw new Error(
        `esta contraprueba necesita un fichero presente en el disco y fuera de git.\n` +
          `   ${ignorado} no está: regenera las capturas (npm run visual) o cambia el ejemplo.`,
      );
    }
    expect(REPOSITORIO.ficheros.has(ignorado), `${ignorado} NO debe estar seguido`).toBe(false);
    // El comprobador viejo (existsSync) lo habría dado por bueno. El nuevo, no:
    expect(enlacesDe('docs/x.md', `[x](../${ignorado})`)).toEqual([`../${ignorado}`]);
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
