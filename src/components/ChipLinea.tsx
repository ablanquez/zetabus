import Link from 'next/link';
import type { Line } from '@/core';
import { esBuho } from '@/engine/topologia';

/**
 * ⭐⭐ D1 · EL CHIP DE UNA LÍNEA. Y ESTO ES SISTEMA, NO ESTÉTICA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  DOS CANALES PARA DOS PREGUNTAS. Y ELLOS LO HICIERON BIEN.
 *
 *      EL COLOR      →  ¿QUÉ línea es?        (IDENTIDAD)
 *      LA INVERSIÓN  →  ¿es NOCTURNA?         (CATEGORÍA)
 *
 *  Un búho: FONDO AZUL NOCHE + el número EN EL COLOR DE LA LÍNEA. Invertido.
 *
 *  ⇒ Se distingue de un vistazo SIN LEER NADA. Y sin gastar un color, que es
 *    justo lo que no sobra en esta red: **22 de las 44 líneas caen en la franja
 *    rojo / ámbar / verde**. Si la categoría gastara un color, se comería el
 *    presupuesto entero de la identidad.
 *
 *  ⚠️ MEDIDO EN SU WEB, NO COPIADO A OJO (Playwright, /moverme/bus/21, 360 px):
 *
 *      N1 → fondo rgb(28, 26, 66)   texto rgb(157, 196, 24)  ← el color de la N1
 *      N7 → fondo rgb(28, 26, 66)   texto rgb(255, 237, 0)   ← el color de la N7
 *      32 → fondo rgb(230,103,153)  texto blanco             ← una diurna normal
 *
 *  El azul noche exacto es **#1C1A42**.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y AQUÍ NO SE CLONA UNA COSA: la referencia pinta el número del búho con el
 * color de la línea SIN COMPROBAR EL CONTRASTE. La N1 es verde lima (#90CA46)
 * sobre azul noche: pasa de sobra. Pero si mañana hubiera un búho azul oscuro,
 * su chip sería ilegible y nadie se enteraría.
 *
 * Aquí el contraste se COMPRUEBA contra el fondo, y si no llega a 4.5:1 se cae a
 * blanco. La inversión (que es la señal de categoría) se mantiene igual: lo que
 * cambia es el tono del número, que es lo accesorio. Ver `tests/chip-linea`.
 */

/** El azul noche de los búhos. Medido en la referencia: rgb(28, 26, 66). */
export const NOCHE = '#1C1A42';

const aRgb = (hex: string) => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

/** Luminancia relativa (WCAG 2.x). El mismo cálculo que usa el test de contraste. */
function luminancia(hex: string): number {
  const { r, g, b } = aRgb(hex);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** AA para texto pequeño. Un número de línea ilegible no identifica nada. */
export const AA = 4.5;

/**
 * Los dos tonos de un chip. Es una función pura, y por eso se puede probar sin
 * navegador: el test le pasa las 44 líneas reales y comprueba que ninguna sale
 * ilegible.
 */
export function tonosDeChip(l: Line): { fondo: string; texto: string; buho: boolean } {
  if (!esBuho(l)) {
    return { fondo: l.color, texto: l.textColor, buho: false };
  }
  // ⭐ INVERTIDO. Y con red de seguridad: si el color de la línea no se lee sobre
  //    el azul noche, el número va en blanco. La CATEGORÍA (la inversión) no se
  //    pierde nunca; lo que cede es el tono, que es lo accesorio.
  const suyo = contraste(l.color, NOCHE);
  return { fondo: NOCHE, texto: suyo >= AA ? l.color : '#FFFFFF', buho: true };
}

export function ChipLinea({
  linea,
  papel,
  enlace = false,
  grande = false,
}: {
  linea: Line;
  papel: string;
  enlace?: boolean;
  grande?: boolean;
}) {
  const { fondo, texto, buho } = tonosDeChip(linea);
  const clase = grande
    ? 'flex h-12 w-12 items-center justify-center rounded-xl text-[16px] font-black'
    : 'flex h-6 min-w-[24px] items-center justify-center rounded-md px-1.5 text-[11px] font-black';

  const contenido = (
    <span
      className={clase}
      style={{ backgroundColor: fondo, color: texto }}
      data-papel={papel}
      data-linea={linea.shortName}
      data-buho={buho ? 'si' : 'no'}
    >
      {linea.shortName}
    </span>
  );

  if (!enlace) return contenido;

  return (
    <Link
      href={`/linea/${encodeURIComponent(linea.shortName)}`}
      aria-label={`Ver el recorrido de la línea ${linea.shortName}${buho ? ', nocturna' : ''}`}
      className="block"
    >
      {contenido}
    </Link>
  );
}
