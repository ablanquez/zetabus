/**
 * ⭐⭐ LA FÓRMULA DEL CONTRASTE. **UNA SOLA VEZ, EN TODO EL PROYECTO.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ EXISTE ESTE FICHERO: ESTABA ESCRITA CUATRO VECES, Y LA CUARTA NO
 *  ERA LA MISMA FÓRMULA.
 *
 *      1. src/components/ChipLinea.tsx            WCAG, con gamma   ✔
 *      2. src/components/interno/TokensVivos.tsx  WCAG, con gamma   ✔  (reescrita)
 *      3. e2e/lib/medir.ts                        WCAG, con gamma   ✔  (reescrita)
 *      4. e2e/sentido.spec.ts                     ⛔ SIN GAMMA
 *
 *  La cuarta hacía `(0.2126·r + 0.7152·g + 0.0722·b) / 255`: una media ponderada
 *  de los valores **tal y como vienen del navegador**, que están codificados en
 *  gamma sRGB. Los coeficientes son los de la WCAG; **el espacio en el que se
 *  aplican, no**. Es como sumar metros y pies porque los dos son longitudes.
 *
 *  ⇒ Y lo que lo hacía peligroso NO es que diera mal: es que daba **parecido**.
 *    Tres copias idénticas y una divergente que coincide en la mayoría de los
 *    casos es peor que cuatro copias mal, porque nada la delata hasta el día
 *    en que un tono cae en la zona donde discrepan — y entonces hay dos
 *    instrumentos dando veredictos opuestos y nadie sabe a cuál creer.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y POR QUÉ VIVE EN `src/core/` Y NO EN `e2e/lib/`:
 *    porque la usan **los dos lados**. La aplicación decide con ella el color de
 *    un número (`ChipLinea`), y el instrumento juzga con ella lo que hay pintado
 *    en pantalla (`medir.ts`). Si vivieran separadas, el instrumento podría
 *    aprobar exactamente lo que la aplicación considera ilegible. El núcleo es
 *    el único sitio del que **puede tirar cualquiera** sin invertir dependencias.
 *
 * ⚠️ Este módulo es MATEMÁTICA PURA: no importa nada, ni del núcleo. Se puede
 *    leer y comprobar contra la especificación sin abrir ningún otro fichero.
 *    https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Un color, canal a canal, **en 0..255** — que es como los dan el CSS y el PNG. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Luminancia relativa (WCAG 2.x), en 0..1.
 *
 * ⚠️ LA LÍNEA QUE NO SE PUEDE SALTAR es la de `linealizar`: los valores que
 *    devuelven `getComputedStyle` y un PNG están **codificados en gamma**. Sin
 *    deshacer esa codificación, los coeficientes 0,2126 / 0,7152 / 0,0722 se
 *    aplican sobre el espacio equivocado y el número resultante no es luminancia.
 */
export function luminancia({ r, g, b }: Rgb): number {
  const linealizar = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linealizar(r) + 0.7152 * linealizar(g) + 0.0722 * linealizar(b);
}

/** Razón de contraste WCAG entre dos colores. Simétrica: el orden da igual. */
export function contrasteRgb(a: Rgb, b: Rgb): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `#RRGGBB` (o `RRGGBB`) → `Rgb`. */
export function deHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * `rgb(17, 24, 39)` / `rgba(17, 24, 39, .5)` → `Rgb`, o `null` si no se entiende.
 *
 * ⚠️ **El alfa se IGNORA a propósito y hay que saberlo.** Un color con alfa no se
 *    puede resolver sin conocer lo que hay detrás, y adivinarlo sería inventar.
 *    Quien necesite el color REAL de un píxel translúcido no debe usar esto:
 *    tiene que mirar el píxel pintado (`contrasteReal` en `e2e/lib/medir.ts`).
 */
export function deCss(css: string): Rgb | null {
  const m = css.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map(Number);
  return { r, g, b };
}

/** WCAG AA: 4,5:1 para texto normal · 3:1 para texto grande (≥18,66 px, o ≥14 px en negrita). */
export const AA_TEXTO = 4.5;
export const AA_TEXTO_GRANDE = 3;
