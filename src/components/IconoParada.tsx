/**
 * ⭐ EL ICONO DE PARADA. Un NODO EN EL RECORRIDO: un punto marcado sobre la línea
 * del trayecto. Va junto al nombre de la parada y conecta lo que ves en pantalla
 * con lo que tienes delante en la marquesina.
 *
 * ⚠️ SVG INLINE, y no emoji ni librería. Justificado:
 *   · el emoji 🚏 lo pinta CADA plataforma a su manera —no controlas cómo se ve, y a
 *     veces es a todo color, justo lo que aquí no queremos—;
 *   · una librería de iconos es una dependencia entera para UN icono;
 *   · un SVG propio da control total, no pesa casi nada y es monocromo DE VERDAD.
 *
 * ⚠️ MONOCROMO, con `currentColor` (hereda `--color-tinta-suave` del padre; CERO hex
 *    aquí). NUNCA un color propio: debajo, en ESTA MISMA pantalla, están los chips
 *    con los 44 colores de línea. El color es IDENTIDAD de línea, no decoración — un
 *    icono de color competiría con ellos. Por eso hereda el tono del texto, y el
 *    trazo (no relleno) lo distingue de los chips.
 *
 * ⚠️ `aria-hidden`: es DECORATIVO. El <h1> ya dice el nombre y justo debajo pone
 *    «poste N»; un lector de pantalla no gana nada con «icono» encima.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ EL NODO, Y NO LAS OTRAS DOS (aviso para el siguiente que pase por aquí).
 *
 *  Se dibujaron tres direcciones y se eligió mirando (a 16 y 32 px, sobre papel y
 *  fondo, junto al logo). El NODO ganó: hereda el vocabulario de Linaje (nodos +
 *  aristas), es lo más limpio a tamaño real, y no se parece al mástil + bandera del
 *  logo (restricción dura: si el icono de parada compite con el símbolo de marca,
 *  no se sabe cuál es identidad y cuál dato).
 *
 *  ⛔ EL RELOJ — descartado POR LEY, no por gusto. La app YA usa el tiempo como
 *     canal: el contador de edad del dato (que sustituyó a «se actualiza cada 20 s»)
 *     y las llegadas en minutos. Un reloj como icono de IDENTIDAD haría que un mismo
 *     canal —el tiempo— respondiera a dos preguntas: «qué es esto» y «esto va de
 *     tiempo». Un canal, dos trabajos: es el gris de Turnia otra vez.
 *
 *  ⛔ LA ONDA (un punto con ondas ascendentes, «lo vivo/ahora») — a CUALQUIER tamaño
 *     es el glifo de Wi-Fi: dice «señal», no «parada». Callejón sin salida, dibujado
 *     y medido para que no haya que volver a dibujarlo.
 * ═══════════════════════════════════════════════════════════════════════════
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
      {/* El recorrido: la arista entra y sale del nodo (Linaje). */}
      <line x1="2.5" y1="12" x2="8.2" y2="12" />
      <line x1="15.8" y1="12" x2="21.5" y2="12" />
      {/* La parada: el nodo marcado sobre la línea, con su punto central. */}
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
