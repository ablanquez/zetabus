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
 * ⚠️ QUÉ VIGILA ESTE FICHERO, y por qué así:
 *
 *   1. Que la fórmula del núcleo es **la de la especificación**, clavada contra
 *      valores de referencia. Sin esto, «una sola fórmula» solo garantiza que
 *      todos se equivocan igual.
 *   2. Que la versión ingenua **NO da lo mismo** — con el número de la diferencia.
 *      Es la parte que convierte «había una copia distinta» en «había una copia
 *      distinta Y ESO IMPORTA».
 *   3. Que la aplicación (`ChipLinea.contraste`) y el núcleo dan **exactamente**
 *      el mismo resultado sobre las 44 líneas reales. Si alguien vuelve a
 *      escribir la fórmula a mano en un componente, esto se pone rojo.
 */
import { describe, it, expect } from 'vitest';
import { luminancia, contrasteRgb, deHex, deCss, AA_TEXTO } from '@/core/contraste';
import { contraste as contrasteDelChip } from '@/components/ChipLinea';
import { lineas } from '@/engine/topologia';

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
