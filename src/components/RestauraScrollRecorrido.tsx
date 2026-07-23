'use client';

import { useEffect, useLayoutEffect } from 'react';

/**
 * ⭐ DEVUELVE EL SITIO EN EL RECORRIDO AL VOLVER DE UNA PARADA (solo ≥880).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Arriba del corte, el recorrido hace scroll DENTRO de su bloque (globals.css ·
 *  `.zona-recorrido-linea`). Y el navegador NO restaura la posición de un contenedor
 *  con scroll interno al volver atrás —solo la del documento—. Así que sin esto:
 *  itinerario de 40 paradas, estás por la 30, pulsas un poste, vuelves… y apareces
 *  arriba del todo. Debajo del corte el <ol> no es contenedor de scroll (la página
 *  entera scrollea) y el navegador ya lo restaura solo: aquí NO se toca nada.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ES UNA ISLA MÍNIMA, a propósito: la vista de línea sigue siendo un server
 *    component; lo ÚNICO cliente es esto, que renderiza `null` y solo guarda y
 *    devuelve un número (`scrollTop`) por `sessionStorage`. No convierte la página.
 *
 * ⚠️ La CLAVE la da el servidor (línea + sentido), no la URL leída en cliente: así
 *    /linea/21 y /linea/35 —o los dos sentidos de la misma— no se restauran cruzados.
 *
 * ⚠️ FAIL-SAFE: si `sessionStorage` no está (modo privado, cuota, bloqueo), la página
 *    funciona igual —simplemente no restaura—. Nunca peta por esto.
 *
 * ⚠️ SIN SALTO VISIBLE: se restaura en `useLayoutEffect` (antes de pintar), no en
 *    `useEffect` (que pintaría arriba y saltaría abajo).
 */

// `useLayoutEffect` avisa si se ejecuta en el servidor; como esto es cliente y solo
// corre en el navegador, se elige la variante isomórfica una vez (no es hook condicional).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const CORTE = 880;

export function RestauraScrollRecorrido({ clave }: { clave: string }) {
  useIsoLayoutEffect(() => {
    // Solo ≥880: debajo del corte el navegador ya restaura el scroll del documento.
    if (window.innerWidth < CORTE) return;

    const ol = document.querySelector('[data-papel="itinerario"]');
    if (!ol) return;

    const k = `zb-scroll-recorrido:${clave}`;

    // Restaurar (antes de pintar → sin salto).
    try {
      const guardado = window.sessionStorage.getItem(k);
      if (guardado !== null) {
        const y = Number(guardado);
        if (Number.isFinite(y)) ol.scrollTop = y;
      }
    } catch {
      // sessionStorage no disponible → sin restaurar, la página va igual.
    }

    // Guardar según se scrollea: la última posición gana, y sobrevive a la navegación
    // (sessionStorage persiste en la pestaña). Al desmontar se quita el oyente.
    const guarda = () => {
      try {
        window.sessionStorage.setItem(k, String(ol.scrollTop));
      } catch {
        // fail-safe: si no se puede guardar, no pasa nada.
      }
    };
    ol.addEventListener('scroll', guarda, { passive: true });
    return () => ol.removeEventListener('scroll', guarda);
  }, [clave]);

  return null;
}
