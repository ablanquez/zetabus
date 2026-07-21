import type { ParadaDelDiff } from '@/engine/desvios';

/**
 * ⭐⭐ EL AVISO DE DESVÍO, CONVERTIDO EN ACORDEÓN.
 *
 * Antonio, mirando la pantalla: el chip «⚠ Esta línea está DESVIADA hoy» estaba
 * ARRIBA y el cuadro con las paradas caídas ABAJO, separados por 30 paradas. El chip
 * avisaba y NO LLEVABA A NINGUNA PARTE: te dejaba con la duda y la respuesta a un
 * scroll largo.
 *
 * ⇒ El chip ES el resumen de un `<details>`. Pulsas y se despliega DEBAJO, en el
 *   sitio, todo el cuadro de suprimidas —titular, explicación, la lista tachada y la
 *   nota de «puede haber otras»—. El cuadro de abajo desaparece: quien quiere el
 *   detalle abre; el resto ve solo el aviso. Las paradas afectadas ya salen marcadas
 *   PROVISIONAL en el propio itinerario, así que fuera del acordeón no queda nada.
 *
 * ⚠️ `<details>` NATIVO, a propósito:
 *   · funciona SIN JavaScript —la vista de línea es un server component—;
 *   · el lector de pantalla anuncia abierto/cerrado y se abre con Enter/Espacio,
 *     gratis, sin que nosotros toquemos nada;
 *   · el contenido SIEMPRE está en el DOM (plegado, no ausente): el buscador del
 *     navegador (Ctrl+F) lo encuentra y lo despliega.
 *   La pega es que abre SECO (difícil de animar sin JS). Se aceptó: mejor un acordeón
 *   nativo que abra seco que un componente cliente solo por la animación. El chevrón
 *   sí gira (una transición de `transform`), y se apaga con `prefers-reduced-motion`.
 *
 * ⚠️ El estado abierto/cerrado NO va en el tono: va en PALABRA («Mostrar más» /
 *    «Mostrar menos») y en FORMA (el chevrón girado). Sobrevive a la escala de grises.
 *
 * Empieza CERRADO: si se abriera solo, no habríamos ganado el espacio y volveríamos a
 * lo de antes.
 */
export function AvisoDesvio({ fuera }: { fuera: readonly ParadaDelDiff[] }) {
  // Sin paradas caídas que listar (el desvío es solo altas/reordenación, que ya se
  // ven marcadas PROVISIONAL en el itinerario): no hay cuadro que desplegar, así que
  // el chip se queda como chip —un acordeón vacío sería un botón que no hace nada—.
  if (fuera.length === 0) {
    return (
      <p
        className="mb-3 rounded-caja border-2 border-[var(--color-aviso)] bg-[var(--color-aviso-fondo)] px-3 py-2 text-cuerpo font-black leading-snug text-[var(--color-aviso)] sin-recortar"
        data-papel="hay-desvio"
        role="status"
      >
        ⚠ Esta línea está DESVIADA hoy
      </p>
    );
  }

  return (
    <details
      className="acordeon mb-3 rounded-caja border-2 border-[var(--color-aviso)] bg-[var(--color-aviso-fondo)]"
      data-papel="hay-desvio"
    >
      <summary className="flex min-h-[var(--control-fila)] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-cuerpo font-black leading-snug text-[var(--color-aviso)] sin-recortar">
        <span>⚠ Esta línea está DESVIADA hoy</span>
        <span className="flex shrink-0 items-center gap-1 text-menor font-bold">
          <span className="acordeon-cerrado">Mostrar más</span>
          <span className="acordeon-abierto">Mostrar menos</span>
          <span aria-hidden className="acordeon-chevron text-cuerpo leading-none">▾</span>
        </span>
      </summary>

      {/* El contenido del cuadro de suprimidas, MUDADO aquí dentro. Se conserva tal
          cual: fondo ámbar (el del <details>), borde de 2 px, el tachado, y el
          separador ámbar antes de la nota. Se muda, no se rediseña. */}
      <div className="border-t-2 border-[var(--color-aviso)] px-3 py-3" data-papel="paradas-fuera">
        <p className="text-menor font-black leading-snug text-[var(--color-aviso)] sin-recortar">
          ⚠ Hoy el autobús NO pasa por{' '}
          {fuera.length === 1 ? 'esta parada' : `estas ${fuera.length} paradas`}
        </p>
        <p className="mt-0.5 text-nota leading-snug not-italic text-[var(--color-tinta-suave)] sin-recortar">
          Están en el recorrido oficial, pero el recorrido que Avanza publica{' '}
          <strong>para hoy</strong> no las incluye. No lo decimos nosotros: lo dice su ruta.
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {fuera.map((x) => (
            <li key={x.poste} className="text-menor leading-snug not-italic sin-recortar">
              <span className="line-through decoration-2" data-papel="parada-tachada">
                {x.nombre}
              </span>{' '}
              <span className="text-nota text-[var(--color-tinta-tenue)]">poste {x.poste}</span>
            </li>
          ))}
        </ul>
        <p
          className="mt-2.5 border-t border-[var(--color-aviso-borde)] pt-2 text-nota leading-snug not-italic text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="no-detectamos-supresiones"
        >
          ⚠ Puede haber <strong>otras paradas suprimidas que no detectamos</strong>. Si ves un
          cartel en el poste, hazle caso a él.
        </p>
      </div>
    </details>
  );
}
