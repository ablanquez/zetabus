/**
 * ⭐ EL PRIMER ICONO DEL SISTEMA. Un autobús, junto al nombre de la parada: conecta
 * lo que ves en la pantalla con lo que tienes delante en la marquesina.
 *
 * ⚠️ SVG INLINE, y no emoji ni librería. Justificado:
 *   · el emoji 🚏 lo pinta CADA plataforma a su manera —no controlas cómo se ve, y a
 *     veces es a todo color, justo lo que aquí no queremos—;
 *   · una librería de iconos es una dependencia entera para UN icono;
 *   · un SVG propio da control total, no pesa casi nada y es monocromo DE VERDAD.
 *   Sí: es el primer icono del sistema. Un SVG suelto no es una «librería de iconos»;
 *   es un carácter más, como el `⚠` o la flecha, pero dibujado por nosotros.
 *
 * ⚠️ MONOCROMO, con `currentColor`. NUNCA un color propio: debajo, en ESTA MISMA
 *    pantalla, están los chips con los 44 colores de línea. El color es IDENTIDAD de
 *    línea, no decoración — un icono de color competiría con ellos. Por eso va en el
 *    tono del texto (lo hereda), y el trazo (no relleno) lo distingue de los chips.
 *
 * ⚠️ `aria-hidden`: es DECORATIVO. El <h1> ya dice el nombre y justo debajo pone
 *    «poste N»; un lector de pantalla no gana nada con «icono de autobús» encima.
 *    Aporta a la vista, no a la semántica.
 */
export function IconoParada({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="4" y="4" width="16" height="12" rx="2.5" />
      <line x1="4" y1="10.5" x2="20" y2="10.5" />
      <circle cx="8" cy="17" r="1.4" />
      <circle cx="16" cy="17" r="1.4" />
    </svg>
  );
}
