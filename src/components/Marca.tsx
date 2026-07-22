import Link from 'next/link';
import {
  BANDERA,
  NOMBRE_MARCA,
  POSTE,
  STROKE_MARCA,
  VISTA,
  Z_PATH,
} from '@/components/marca-fuente';

/**
 * ⭐ LA MARCA. Ya no es un wordmark suelto: es el SÍMBOLO (V4) + "ZetaBus".
 *
 * El símbolo es una Z-recorrido con un poste de parada plantado en la base — el
 * recorrido llega a la parada. Sale de la FUENTE ÚNICA (`marca-fuente.ts`): el
 * mismo `Z_PATH` que usa el favicon, aquí con stroke 6 + poste + bandera. No hay
 * un segundo dibujo de la Z en ninguna parte (lo vigila `marca-z-unica.test.ts`).
 *
 * ⚠️ COLOR POR TOKEN, no hex: la Z en `--color-marca`, el poste en
 *    `--color-marca-poste`. El guardián anti-hex de /interno/sistema-visual
 *    exige que aquí no haya ni un `#`.
 *
 * ⚠️ EL SÍMBOLO NO ES UNA CITA NI UN TOPÓNIMO: es identidad nuestra, dibujada,
 *    no un dato externo. Por eso NO lleva <Cita>/<Toponimo> — no hay nada que
 *    proteger de una fuente ajena. PERO el wordmark "ZetaBus" SÍ lleva
 *    `translate="no"`: es un nombre propio, y un traductor de navegador que lo
 *    reescriba ("ZetaBus" → "Autobús Zeta") es el MISMO agujero que L21. El
 *    símbolo es decorativo para el lector de pantalla (`aria-hidden`): el enlace
 *    ya se llama "ZetaBus" por su texto; anunciar el dibujo sería redundante.
 */
export function Marca() {
  return (
    <Link
      href="/"
      // ⚠️ min-h-[var(--control)] = 44 px, NO el mínimo de 24. La marca es la ÚNICA
      //    salida visible de las pantallas de detalle (se retiraron las flechas "←"):
      //    volver a la home es acción principal, no un enlace suelto en una frase, así
      //    que merece el objetivo cómodo (WCAG 2.5.5), no el mínimo (2.5.8). El tamaño
      //    de letra lo pone `text-seccion`; la ZONA pulsable la garantiza el min-h.
      //    Medido en 360 px: con `text-titulo` la caja es 110×44 (el min-h eleva el alto natural
      //    de ~28 a 44). Lo vigila `navegacion.spec`.
      //
      // ⭐ TAMAÑO `text-titulo` (20 px), no `text-seccion` (16): la marca es el rótulo de la
      //    cabecera y flotaba —20 px de marca en una banda de 60—. Sube un peldaño de la escala.
      //    El símbolo va en `1.15em`, así que crece SOLO —del mismo em— y con la misma relación
      //    símbolo/texto: es un escalado, no un redibujo (el path sigue siendo `Z_PATH`).
      className="inline-flex min-h-[var(--control)] items-center gap-1.5 text-titulo font-black tracking-tight text-[var(--color-tinta)]"
      data-papel="marca"
    >
      <svg
        viewBox={VISTA}
        className="h-[1.15em] w-[1.15em] shrink-0"
        aria-hidden="true"
        focusable="false"
        data-papel="marca-simbolo"
      >
        {/* La Z (el recorrido). Mismo path que el favicon; aquí stroke 6. */}
        <path
          d={Z_PATH}
          fill="none"
          stroke="var(--color-marca)"
          strokeWidth={STROKE_MARCA}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* El poste, plantado en la prolongación (la acera). */}
        <line
          x1={POSTE.x}
          y1={POSTE.yBase}
          x2={POSTE.x}
          y2={POSTE.yAlto}
          stroke="var(--color-marca-poste)"
          strokeWidth={POSTE.grosor}
          strokeLinecap="round"
        />
        {/* La señal en bandera (que se lea "parada", no "i"). */}
        <rect
          x={BANDERA.x}
          y={BANDERA.y}
          width={BANDERA.ancho}
          height={BANDERA.alto}
          rx={BANDERA.radio}
          fill="var(--color-marca-poste)"
        />
      </svg>
      <span data-papel="marca-wordmark" translate="no">
        {NOMBRE_MARCA}
      </span>
    </Link>
  );
}
