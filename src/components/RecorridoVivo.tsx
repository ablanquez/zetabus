'use client';

import { useEffect, useLayoutEffect } from 'react';

/**
 * ⭐ EL RECORRIDO VIVO (solo ≥880): lo DIMENSIONA por el scroll y DEVUELVE EL SITIO
 *    al volver de una parada. Isla mínima: renderiza `null`, la vista sigue siendo un
 *    server component. Debajo del corte NO hace nada (la página entera scrollea y el
 *    navegador ya restaura el scroll del documento).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  1 · EL ALTO LO MANDA EL SCROLL, NO UN MÍNIMO.  (decisión de Antonio)
 *
 *  · Si el recorrido CABE ENTERO → la caja se ajusta a su contenido y NO crece. Una
 *    línea de 4 paradas no deja un cajón vacío enorme debajo.
 *  · Si NO cabe → se estira hasta el FINAL DE LA VENTANA menos 10 px, para aprovechar
 *    todo antes de scrollear. Una de 40 no se queda en una rendija.
 *  El que decide no es un número: es si hay scroll o no lo hay. Y eso solo se sabe
 *  midiendo el contenido contra la ventana —por eso va aquí y no en CSS: el CSS no
 *  conoce ni la altura del contenido ni dónde cae la caja en la ventana—.
 *
 *  Se pone un `max-height = ventana − top − 10` al <ol>: si el contenido cabe por debajo,
 *  el <ol> se queda a su alto natural (sin scroll, sin cajón); si no, se corta ahí y
 *  scrollea. ⚠️ SIN JS (fallback): el <ol> no lleva tope, muestra todo y scrollea la
 *  página —como en móvil—; nunca queda una caja de altura cero.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  2 · VOLVER DE UNA PARADA sin perder el sitio.
 *
 *  El navegador NO restaura la posición de un contenedor con scroll interno (solo la
 *  del documento). Sin esto: 40 paradas, estás por la 30, pulsas un poste, vuelves… y
 *  apareces arriba. Se guarda `scrollTop` por línea:sentido en `sessionStorage` (la
 *  CLAVE la da el servidor, así dos líneas o dos sentidos no se cruzan) y se devuelve
 *  antes de pintar (`useLayoutEffect`, sin salto).
 *
 * ⚠️ FAIL-SAFE: si `sessionStorage` no está (privado, cuota, bloqueo), la página va
 *    igual —no restaura y ya—. Nunca peta por esto.
 * ⚠️ RESIZE: si cambia el tamaño de la ventana, se recalcula la altura (lo que cabía
 *    puede dejar de caber). El cambio de sentido remonta la isla, así que se recalcula solo.
 */

// `useLayoutEffect` avisa en el servidor; como esto solo corre en el navegador se elige
// la variante isomórfica una vez (no es un hook condicional).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const CORTE = 880;
const MARGEN_INFERIOR = 10;

export function RecorridoVivo({ clave }: { clave: string }) {
  useIsoLayoutEffect(() => {
    const ol = document.querySelector<HTMLElement>('[data-papel="itinerario"]');
    if (!ol) return;

    // ── 1 · DIMENSIONAR: max-height = ventana − top − 10. Si cabe, el <ol> se queda a su
    //        alto natural (sin scroll); si no, se corta ahí. Debajo del corte, sin tope. ──
    const ajusta = () => {
      if (window.innerWidth < CORTE) {
        ol.style.maxHeight = '';
        return;
      }
      const tope = window.innerHeight - ol.getBoundingClientRect().top - MARGEN_INFERIOR;
      ol.style.maxHeight = `${Math.max(0, tope)}px`;
    };
    ajusta();

    // ── 2 · RESTAURAR el sitio (tras dimensionar, para que exista el rango de scroll). ──
    const k = `zb-scroll-recorrido:${clave}`;
    try {
      const guardado = window.sessionStorage.getItem(k);
      if (guardado !== null) {
        const y = Number(guardado);
        if (Number.isFinite(y)) ol.scrollTop = y;
      }
    } catch {
      // sessionStorage no disponible → sin restaurar, la página va igual.
    }

    const guarda = () => {
      try {
        window.sessionStorage.setItem(k, String(ol.scrollTop));
      } catch {
        // fail-safe: si no se puede guardar, no pasa nada.
      }
    };
    ol.addEventListener('scroll', guarda, { passive: true });
    window.addEventListener('resize', ajusta);
    return () => {
      ol.removeEventListener('scroll', guarda);
      window.removeEventListener('resize', ajusta);
    };
  }, [clave]);

  return null;
}
