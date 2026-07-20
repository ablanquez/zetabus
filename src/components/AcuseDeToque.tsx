'use client';

import { useLinkStatus } from 'next/link';

/**
 * ⭐⭐ «TE HE OÍDO, VOY». EL ACUSE QUE SOBREVIVE A SOLTAR EL DEDO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL HUECO MUDO. Hasta ahora el bloque se teñía con `:active` —o sea, MIENTRAS
 *  el dedo está encima— y se apagaba AL SOLTAR. Entre soltar y que aparezca la
 *  pantalla nueva no había NINGUNA señal.
 *
 *  En un móvil con mala cobertura ese hueco dura segundos, y lo que hace una
 *  persona cuando pulsa algo y no pasa nada es **volver a pulsarlo**. La interfaz
 *  no estaba rota: estaba callada, que es casi peor porque parece rota.
 *
 *  ⇒ Al soltar, el elemento SE QUEDA MARCADO hasta que la navegación termina.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ NO SE PUEDE HACER CON CSS. `:active` es una pseudoclase del navegador
 *    y se apaga en cuanto levantas el dedo: no hay forma de "retenerla". Hace falta
 *    ESTADO, y el estado tiene que saber cuándo termina la navegación.
 *
 * ⭐ Y ESO YA LO SABE EL FRAMEWORK: `useLinkStatus` (Next 15.3+) da el `pending` de
 *    su <Link> — `true` antes de que el historial cambie, `false` después. Es la vía
 *    canónica, documentada en
 *    `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`.
 *
 * ⛔ LO QUE NO SE HACE, y era la tentación: un `useState` con un `setTimeout` de
 *    300 ms. Eso no mide la navegación: mide un número inventado. Si la red va
 *    lenta se apaga antes de llegar (el hueco mudo vuelve, solo que más tarde), y
 *    si la navegación falla se queda encendido para siempre. `pending` se apaga
 *    cuando de verdad ha pasado algo, incluida la vuelta atrás.
 *
 * ⚠️ CONDICIONES PARA QUE ESTO SIRVA, y aquí se cumplen las dos que pide la doc:
 *    · la ruta de destino es dinámica → `/parada/[poste]` y `/linea/[linea]` son
 *      las dos `export const dynamic = 'force-dynamic'`;
 *    · no hay ningún `loading.tsx` en el proyecto que permita una transición
 *      instantánea (comprobado: `find src/app -name loading.tsx` no devuelve nada).
 *    Si algún día se añade un `loading.tsx`, el `pending` dejará de verse — y estará
 *    BIEN, porque entonces habrá algo mejor que enseñar.
 *
 * ⚠️ TIENE QUE SER DESCENDIENTE DE UN <Link>. Lo exige el hook. Por eso esto es un
 *    marcador diminuto que va DENTRO del enlace y el estilo lo recoge el ancestro
 *    con `:has()` — el mismo mecanismo que ya usaba el `:active`. No pinta nada por
 *    sí mismo (no tiene tamaño ni contenido): solo lleva la bandera al CSS.
 */
export function AcuseDeToque() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      data-papel="acuse-de-toque"
      data-pendiente={pending ? 'si' : 'no'}
    />
  );
}
