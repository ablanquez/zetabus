/**
 * ⭐⭐ UNA SOLA FÓRMULA DE CONTRASTE EN TODO EL PROYECTO. Y ESTE TEST EXISTE PORQUE
 *    DURANTE MESES HUBO CUATRO, Y LA CUARTA NO ERA LA MISMA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA CICATRIZ. La fórmula de luminancia WCAG estaba escrita a mano en cuatro
 *  sitios: `ChipLinea.tsx`, `TokensVivos.tsx`, `e2e/lib/medir.ts` y
 *  `e2e/sentido.spec.ts`. Las tres primeras coincidían. La cuarta hacía
 *
 *      (0.2126·r + 0.7152·g + 0.0722·b) / 255
 *
 *  — los coeficientes de la WCAG aplicados sobre canales **codificados en gamma**,
 *  o sea sobre el espacio equivocado.
 *
 *  ⚠️ Y NO SE CAZÓ CON UN TEST: se cazó CONTANDO las apariciones de `0.03928` en
 *     el árbol. Tres las tenían y una no. **Ninguna prueba automática podía verlo,
 *     porque cada copia era coherente consigo misma.**
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ QUÉ VIGILA ESTE FICHERO — son DOS cosas distintas:
 *
 *   ── LA FORMA (que no exista otra copia) ──────────────────────────────
 *   El bug de la cicatriz no lo cazó comparar resultados —cada copia era coherente
 *   consigo misma—: lo cazó CONTAR las apariciones de la fórmula en el árbol. Eso
 *   es lo que se automatiza aquí. Se grepea el código (SIN comentarios) de `src/`,
 *   `e2e/`, `scripts/` y `tests/` buscando la firma de la luminancia —el coeficiente
 *   verde 0.7152 y el umbral de linealización 0.03928— y se exige que aparezca SOLO
 *   en los dos sitios sancionados:
 *     · src/core/contraste.ts — la fórmula canónica.
 *     · este fichero — la copia INGENUA (`luminanciaIngenua`), a propósito, para
 *       medir el daño de la que hubo.
 *   ⭐ POR QUÉ LA FIRMA Y NO EL RESULTADO — y es la regla general de un guardián de
 *      fuente única: una copia reescrita a mano HOY da el mismo número, así que
 *      compararlos NO la ve; pero es la copia DIVERGENTE de mañana (se edita una y
 *      no la otra). Vigilar el coeficiente la caza el día que se escribe, correcta o
 *      no —toda luminancia WCAG lo lleva—, que es ANTES de que el bug exista. Vigila
 *      la FORMA (que no haya otra copia), no el RESULTADO (que todas coincidan).
 *   ⚠️ LO QUE ESTO NO CAZA, para no prometer de más: una copia con el número en OTRA
 *      forma (7152e-4, tabla de lookup, aproximación) o que duplique solo la razón
 *      (max+.05)/(min+.05). Tolera el cero de más (.7152), no reescrituras exóticas.
 *      Un guardián con límites dichos es honesto; el problema era el que prometía de
 *      más —que es justo lo que este fichero afirmaba antes y no cumplía—.
 *
 *   ── EL RESULTADO (que el número es correcto), COMO RED DE RESPALDO ────
 *   Se sigue comprobando por VALOR: que el núcleo ES la WCAG (contra referencia),
 *   que la ingenua NO da lo mismo (con el número del daño), y que `ChipLinea`
 *   coincide con el núcleo sobre las 44 líneas reales. Esto NO caza la EXISTENCIA de
 *   una copia —solo su divergencia—; para eso está la parte de arriba. Cubre los
 *   huecos declarados de la firma: una copia que la firma no vea pero dé otro número.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { luminancia, contrasteRgb, deHex, deCss, AA_TEXTO } from '@/core/contraste';
import { contraste as contrasteDelChip } from '@/components/ChipLinea';
import { lineas } from '@/engine/topologia';

// ─────────────────────────────────────────────────────────────────────────────
//  ⭐⭐ LA FORMA. Que la fórmula no esté copiada fuera del núcleo. Ver la cabecera.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los DOS únicos sitios donde la firma puede aparecer: el núcleo canónico y este
 * guardián (que conserva la copia INGENUA a propósito). Cualquier otro es una copia.
 */
const SANCIONADOS = new Set([
  'src/core/contraste.ts',
  'tests/contraste-una-sola-formula.test.ts',
]);

/**
 * Las firmas vigiladas, cada una con su NOMBRE para que el rojo diga CUÁL disparó y
 * dónde —y se arregle solo con leerlo, sin investigar—. Toleran el cero de más
 * (`.7152` ≡ `0.7152`) pero NO formas exóticas (`7152e-4`): declarado en la cabecera.
 */
const FIRMAS: readonly { nombre: string; re: RegExp }[] = [
  { nombre: 'coeficiente verde 0.7152 (luminancia WCAG)', re: /(?<![\d.])0?\.7152(?![\d])/ },
  { nombre: 'umbral de linealización 0.03928', re: /(?<![\d.])0?\.03928(?![\d])/ },
];

/**
 * Como el `sinComentarios` del resto del repo, pero PRESERVA el nº de línea —sustituye
 * el interior de cada comentario por espacios en vez de colapsarlo— para que el rojo
 * diga fichero Y línea. Sin quitar comentarios, la fórmula CITADA en uno (la cabecera
 * del núcleo, la nota histórica de `sentido.spec`) sería un falso rojo.
 */
const soloCodigo = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Ficheros de código git-trackeados del ámbito, menos los dos sancionados. */
const ficherosDeCodigo = (): string[] =>
  execFileSync('git', ['ls-files', 'src', 'e2e', 'scripts', 'tests'], { encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => /\.(ts|tsx|mjs|js)$/.test(f))
    .filter((f) => !SANCIONADOS.has(f));

describe('⭐⭐ LA FORMA: la fórmula de luminancia no está copiada fuera del núcleo', () => {
  it('la firma (0.7152 / 0.03928) aparece SOLO en los dos ficheros sancionados', () => {
    const ficheros = ficherosDeCodigo();
    // Sanity: si `git ls-files` no devuelve el árbol (cwd mala, clon raro), el test
    // daría VERDE sin mirar nada —justo el fallo que persigue—. Hoy hay ~193.
    expect(ficheros.length, 'git ls-files no devolvió el árbol de código').toBeGreaterThan(100);

    const copias: string[] = [];
    for (const f of ficheros) {
      soloCodigo(readFileSync(f, 'utf8'))
        .split('\n')
        .forEach((linea, i) => {
          for (const firma of FIRMAS) {
            if (firma.re.test(linea)) copias.push(`${f}:${i + 1} → ${firma.nombre}`);
          }
        });
    }
    expect(
      copias,
      copias.length
        ? `\n   la fórmula de contraste está COPIADA fuera de src/core/contraste.ts:\n   ` +
          copias.join('\n   ') +
          `\n   Impórtala de @/core/contraste, no la reescribas (los dos sitios permitidos son\n` +
          `   el núcleo y este guardián con su copia ingenua a propósito).`
        : '',
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EL RESULTADO. Red de respaldo (ver cabecera): que el número es el correcto.
// ─────────────────────────────────────────────────────────────────────────────

/** La copia que había en `e2e/sentido.spec.ts`. Se conserva AQUÍ, y solo aquí, para medir el daño. */
const luminanciaIngenua = ({ r, g, b }: { r: number; g: number; b: number }) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

describe('⭐ la fórmula del núcleo ES la de la WCAG', () => {
  it('los dos extremos, clavados: blanco = 1, negro = 0', () => {
    expect(luminancia({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
    expect(luminancia({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 10);
  });

  it('el contraste máximo posible es 21:1 — el que define la escala entera', () => {
    expect(contrasteRgb({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 6);
  });

  it('⭐ el gris medio #808080: la referencia dice 0,2159 — no 0,502', () => {
    // Es EL valor que separa las dos fórmulas. Si alguien quita la linealización,
    // este número se va a 0,502 y el test lo dice con nombre y apellidos.
    expect(luminancia(deHex('#808080'))).toBeCloseTo(0.2159, 4);
  });

  it('es simétrica: el orden de los colores no cambia el contraste', () => {
    const a = deHex('#1C1A42');
    const b = deHex('#C5CE00');
    expect(contrasteRgb(a, b)).toBeCloseTo(contrasteRgb(b, a), 12);
  });

  it('`deHex` y `deCss` leen el MISMO color por los dos caminos', () => {
    expect(deHex('#111827')).toEqual({ r: 17, g: 24, b: 39 });
    expect(deCss('rgb(17, 24, 39)')).toEqual({ r: 17, g: 24, b: 39 });
    expect(deCss('rgba(17, 24, 39, 0.5)')).toEqual({ r: 17, g: 24, b: 39 });
    expect(deCss('no soy un color')).toBeNull();
  });
});

describe('⛔ la copia divergente NO daba lo mismo — el número del daño', () => {
  it('⭐ en el gris medio se equivoca por un factor de 2,3', () => {
    const gris = deHex('#808080');
    const buena = luminancia(gris);
    const mala = luminanciaIngenua(gris);
    expect(buena).toBeCloseTo(0.2159, 4);
    expect(mala).toBeCloseTo(0.502, 3);
    expect(mala / buena).toBeGreaterThan(2.3);
  });

  it('⭐⭐ y se equivoca EN LA DIRECCIÓN QUE FABRICA VERDES', () => {
    /**
     * ⚠️ ESTE PAR NO SE ELIGIÓ A OJO: SE BUSCÓ, recorriendo los 32.640 pares de
     *    grises y quedándose con el de MAYOR margen. El primer par que puse a mano
     *    (#B4B4B4 / #666666) daba 0,3235 y **puso este test en rojo** — que es
     *    exactamente lo que tenía que pasar: elegir el ejemplo por intuición es la
     *    misma clase de error que escribir la fórmula por intuición.
     *
     * El umbral 0,3 es el que usa `e2e/sentido.spec.ts` para afirmar que dos
     * rellenos se distinguen SIN color. Con la copia vieja, este par lo pasaba.
     */
    const oscuro = deHex('#000000');
    const medio = deHex('#707070');
    const ingenua = Math.abs(luminanciaIngenua(oscuro) - luminanciaIngenua(medio));
    const real = Math.abs(luminancia(oscuro) - luminancia(medio));
    expect(ingenua, 'la ingenua dice que se separan de sobra').toBeCloseTo(0.4392, 4);
    expect(ingenua).toBeGreaterThan(0.3);
    expect(real, 'la de verdad dice que NO llegan ni de lejos').toBeCloseTo(0.162, 3);
    expect(real).toBeLessThan(0.3);
  });
});

describe('⭐ la APLICACIÓN y el INSTRUMENTO usan la misma regla', () => {
  it('`ChipLinea.contraste` no es una implementación aparte: es la del núcleo', () => {
    // ⚠️ Se comprueba sobre las 44 líneas REALES, no sobre un color de juguete: es
    //    donde de verdad se decide si un número se lee o no.
    const todas = lineas();
    expect(todas.length, 'no hay líneas que comprobar').toBeGreaterThan(40);
    for (const l of todas) {
      const porElChip = contrasteDelChip(l.color, '#FFFFFF');
      const porElNucleo = contrasteRgb(deHex(l.color), { r: 255, g: 255, b: 255 });
      expect(porElChip, `la línea ${l.shortName} da distinto según quién pregunte`)
        .toBeCloseTo(porElNucleo, 12);
    }
  });

  it('y el umbral AA es UNO, no uno por fichero', () => {
    expect(AA_TEXTO).toBe(4.5);
  });
});
