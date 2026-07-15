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
 * ⭐⭐ D1 · EL COLOR DEL TEXTO **SE CALCULA**. NO SE ELIGE A MANO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Antonio vio que la línea 29 tiene el número en NEGRO y las demás en blanco, y
 *  dijo: *"alguien decidió el color del texto POR LÍNEA, A OJO, en vez de
 *  calcularlo del contraste real"*.
 *
 *  ⭐ TENÍA RAZÓN. Y ese alguien fue **Avanza**: el color sale de
 *    `route_text_color` del GTFS, y nosotros lo copiábamos sin comprobarlo.
 *
 *  ⛔ Y LA REALIDAD ES MUCHO PEOR QUE EL SÍNTOMA. Medido sobre las 44 líneas:
 *
 *      26 DE 44 CHIPS ESTÁN POR DEBAJO DE WCAG AA.
 *
 *      línea 33 · #C5CE00 + blanco →  1,72:1   (en negro: 12,2:1)
 *      línea 43 · #F8AD07 + blanco →  1,91:1
 *      línea 59 · #A5C715 + blanco →  1,95:1
 *      línea 25 · #EAA200 + blanco →  2,17:1
 *      línea N3 · #00B9F2 + blanco →  2,28:1
 *
 *  La 29 no era la rara: **era la única donde Avanza acertó.**
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA REGLA, y es la mínima intervención posible:
 *
 *   1. Si el color que manda el operador **se lee** (≥ AA), se respeta. Es SU
 *      identidad, y no vamos a repintarla por gusto.
 *   2. Si NO se lee, se cae al que más contraste da (blanco o negro).
 *
 * ⚠️ Y si NINGUNO de los dos llegara a AA, esta función **no miente**: devuelve el
 *    mejor que hay y lo marca. Un test recorre las 44 y **revienta** si eso pasa —
 *    porque entonces el problema no es el texto: es el color de fondo, y eso hay
 *    que MIRARLO, no redondearlo.
 */
export function textoLegible(fondo: string, preferido: string): { texto: string; contraste: number; forzado: boolean } {
  const suyo = contraste(fondo, preferido);
  if (suyo >= AA) return { texto: preferido, contraste: suyo, forzado: false };

  const blanco = contraste(fondo, '#FFFFFF');
  const negro = contraste(fondo, '#000000');
  const gana = blanco >= negro ? '#FFFFFF' : '#000000';
  return { texto: gana, contraste: Math.max(blanco, negro), forzado: true };
}

/**
 * ⭐⭐ D1 (REGLA DE MARCA) · EL NÚMERO DE UNA DIURNA ES SIEMPRE BLANCO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El modelo anterior calculaba el color del texto por contraste caso a caso, y
 *  daba LEGIBILIDAD pero rompía la COHERENCIA de marca: la 29 salía con el número
 *  en negro entre 30 blancos, y el ojo lo lee como un error.
 *
 *  La regla: el número de una diurna es SIEMPRE blanco. Y se lee sobre CUALQUIER
 *  color —hasta un amarillo— por un CONTORNO oscuro (`.zb-num-contorno`), NO
 *  oscureciendo el fondo. Así la IDENTIDAD (el color de línea) queda INTACTA.
 *
 * ⚠️ POR QUÉ NO SE OSCURECE EL FONDO (fue el primer intento, y lo medí):
 *    oscurecer a AA COLAPSA 20 pares de diurnas —la 25 y la 28 caían a distancia
 *    4; la 38 y la 59, a 4—. La paleta del operador tiene ~20 claras agrupadas por
 *    tono, y bajarlas todas a la misma luminancia baja las vuelve EL MISMO color.
 *    El contorno da el contraste local sin tocar el color. Antonio eligió esta vía.
 *
 * ⭐ Y EL CONTRASTE ESTÁ GARANTIZADO, no prometido: el número lleva relleno blanco
 *    y trazo negro, y `max(contraste(blanco, fondo), contraste(negro, fondo)) ≥
 *    4,58` para CUALQUIER color (demostrado en el test). Sobre un fondo claro manda
 *    el trazo; sobre uno oscuro, el relleno. Nunca hay un número ilegible.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function tonosDeChip(l: Line): { fondo: string; texto: string; buho: boolean } {
  if (esBuho(l)) {
    // ⭐ NOCTURNAS, INTACTAS: fondo noche + número en el color de la línea (con la
    //    red de D1 por si un búho no se leyera sobre el azul noche). La categoría
    //    va en la INVERSIÓN, no en un color; y NO llevan contorno (su número no es
    //    blanco, y un trazo negro sobre el azul noche no ayudaría).
    return { fondo: NOCHE, texto: textoLegible(NOCHE, l.color).texto, buho: true };
  }
  // ⭐ DIURNAS: color de línea INTACTO + número blanco (el contorno lo pone el chip).
  return { fondo: l.color, texto: '#FFFFFF', buho: false };
}

/** ¿Este número lleva contorno? Sí cuando es blanco (diurnas). Un solo sitio decide. */
export const llevaContorno = (texto: string): boolean => texto.toUpperCase() === '#FFFFFF';

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
  /**
   * ⭐ D3 · `shrink-0`. UN SOLO ATRIBUTO, Y ERA TODO EL FALLO.
   *
   * Antonio: *"los chips de búho tienen tamaños distintos entre sí"*. Y era
   * verdad. Medido en pantalla, los siete:
   *
   *     N1 43×48 · N2 35×48 · N3 39×48 · N4 36×48 · N5 35×48 · N6 35×48 · N7 42×48
   *
   * El chip declara `w-12` (48 px) y la ALTURA salía bien… pero el ancho no. ¿Por
   * qué? Porque vive dentro de un contenedor `flex`, y **un hijo flex se encoge**:
   * `w-12` es la anchura *deseada*, no un suelo. Sin `shrink-0`, el navegador la
   * recorta hasta el contenido — y "N1" ocupa más que "N5".
   *
   * ⚠️ Y en el CSS declarado ponía 48 px. **`getComputedStyle` lo habría aprobado.**
   *    Solo se caza midiendo la caja REAL. Es la décima vez que el píxel y el CSS
   *    no dicen lo mismo.
   */
  const base = grande
    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-tarjeta text-seccion font-black'
    : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-chip text-nota font-black';
  // ⭐ El contorno oscuro que hace legible el número blanco sobre CUALQUIER color.
  const clase = llevaContorno(texto) ? `${base} zb-num-contorno` : base;

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
