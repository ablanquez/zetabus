import Link from 'next/link';

/**
 * ⭐ LA MARCA. Hoy es un WORDMARK de texto; mañana (Fase 5) será un logo.
 *
 * Antonio: el logo NO se hace ahora —un logo sobre una app a medio pulir se
 * rehace—, pero SÍ se reserva su sitio. Por eso la marca es un componente y no
 * texto suelto en el layout: el día que haya logo, se cambia esta pieza y nada
 * más.
 *
 * ⚠️ El color sale del TOKEN `--color-tinta`, no de un literal. Si la tinta de
 *    marca cambia, el wordmark se entera (es la misma lección que el pin del mapa).
 *
 * 🪧 HUECO DEL LOGO (Fase 5): cuando exista el símbolo, va JUSTO AQUÍ, a la
 *    izquierda del wordmark (un <svg> o un next/image), y el wordmark se queda de
 *    acompañante o desaparece. La firma del componente no cambia.
 */
export function Marca() {
  return (
    <Link
      href="/"
      // ⚠️ min-h-[24px]: es un ENLACE, y el token `text-seccion` empareja una
      //    interlínea ajustada (1.25) que dejaba la caja en 20 px — por debajo del
      //    mínimo táctil de WCAG 2.5.8. El tamaño de letra manda el token; la ZONA
      //    PULSABLE la garantiza el min-h. (Lo cazó el detector táctil, no yo.)
      className="inline-flex min-h-[24px] items-center gap-2 text-seccion font-black tracking-tight text-[var(--color-tinta)]"
      data-papel="marca"
    >
      {/* 🪧 Aquí entrará el logo en la Fase 5. */}
      <span data-papel="marca-wordmark">ZetaBus</span>
    </Link>
  );
}
