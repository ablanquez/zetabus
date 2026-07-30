'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { NOMBRE_MARCA } from '@/components/marca-fuente';

/**
 * ⭐ A4 · EL 500. CUANDO ALGO SE ROMPE DE VERDAD.
 *
 * ⚠️ `error.tsx` TIENE QUE SER UN CLIENT COMPONENT. Lo exige la documentación
 * oficial (`node_modules/next/dist/docs/…/file-conventions/error.md`): es una
 * *error boundary* de React, y las boundaries solo existen en el cliente.
 *
 * ⚠️ Y POR ESO SALE EN BLANCO SIN JS (B-07): el shell inicial va vacío y esto se pinta
 * al hidratar. Es INHERENTE —una error boundary es cliente—, no arreglable, y NO es el
 * caso del B-03 (aquél es el `notFound()` de /parada y /linea). Se anota para que no se
 * redescubra como hallazgo.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔ LO QUE **NO** SE ENSEÑA, Y ES LA MITAD DEL FICHERO:
 *
 * `error.message` **NO se pinta**. En producción Next ya lo sustituye por un
 * mensaje genérico —comprobado— pero no me apoyo en eso: si mañana cambian esa
 * política, o si alguien despliega esto en modo desarrollo por error, el mensaje
 * de una excepción puede llevar dentro **una ruta del servidor, una consulta, o
 * un trozo de la ApiKey del NAP**.
 *
 * ⇒ Aquí se enseña QUE se ha roto y QUÉ hacer. **Nunca POR QUÉ.** El porqué va al
 *   servidor, que es donde se mira.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y NO SE MIENTE SOBRE LOS DATOS. Un fallo de render NO significa "Avanza está
 * caído" —eso tiene su propio aviso, con su edad y su contador—. Aquí no se
 * diagnostica nada que no se sepa.
 */
/**
 * ⚠️ `unstable_retry`, NO `reset`. Y es una decisión con riesgo asumido, escrita
 *    para el que venga.
 *
 *    `reset()` limpia el estado y re-renderiza los MISMOS hijos SIN volver a
 *    pedir datos. Para un fallo de render de CLIENTE recupera; para uno de
 *    SERVIDOR (el caso más probable aquí) NO —re-renderiza lo que ya reventó y
 *    vuelve a reventar—. Se comprobó EN VIVO con `?fingir=error`: el botón no
 *    hacía nada. `unstable_retry()` re-FETCHEA y re-renderiza el segmento, que es
 *    lo que un "Volver a intentarlo" promete. Los dos props CONVIVEN (la doc no
 *    los enfrenta); aquí se usa el que de verdad recupera.
 *
 *    ⚠️ ES API `unstable_` (llegó en Next 16.2.0). El riesgo de que cambie bajo los
 *       pies está ACOTADO porque `next` va CLAVADO a `16.2.10` en package.json, SIN
 *       `^`: no se mueve hasta que alguien suba de versión a propósito.
 *    ⇒ AL SUBIR NEXT, revisar aquí: que `unstable_retry` siga existiendo y con esta
 *       firma; si se estabilizó (p. ej. pasó a `retry` sin prefijo), migrar; si
 *       desapareció, volver a mirar la doc. Ver `node_modules/next/dist/docs/.../
 *       file-conventions/error.md` y `.../getting-started/error-handling.md`.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // El detalle va a la consola del SERVIDOR/navegador, no a la pantalla.
    // `digest` es el identificador que Next deja para poder cruzarlo con el log.
    console.error('[zetabus] fallo de render', error.digest ?? '(sin digest)');
    // ⚠️ El título lo pone `document.title`, no `metadata`: una error boundary es un
    //    client component y NO puede exportar `metadata`. Sin esto, la pestaña se
    //    quedaría con el título de la página que reventó. La marca, de su fuente única.
    document.title = `${NOMBRE_MARCA} | Algo se ha roto`;
  }, [error]);

  return (
    <div className="flex flex-col gap-5 py-6" data-papel="500">
      <div>
        <p className="text-menor font-black uppercase tracking-wide text-[var(--color-alerta)]">
          Algo se ha roto
        </p>
        <h1 className="mt-1 text-titulo font-black leading-tight sin-recortar">
          No hemos podido pintar esta pantalla
        </h1>
        <p className="mt-2 text-cuerpo leading-relaxed text-[var(--color-tinta-suave)] sin-recortar">
          El fallo es <strong>nuestro</strong>, no tuyo, y no tiene nada que ver con los autobuses:
          puede que estén llegando con toda normalidad. Vuelve a intentarlo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          // ⭐ RE-FETCH + re-render del segmento. Ver la nota de arriba: `reset` no
          //    recuperaba de un fallo de servidor; esto sí.
          onClick={() => unstable_retry()}
          className="inline-flex min-h-[var(--control-fuerte)] items-center justify-center rounded-tarjeta bg-[var(--color-tinta)] px-4 text-cuerpo font-bold text-[var(--color-papel)]"
          data-papel="reintentar"
        >
          Volver a intentarlo
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[var(--control)] items-center justify-center text-menor font-semibold underline underline-offset-2"
        >
          Ver todas las líneas
        </Link>
      </div>

      {/* El identificador, para poder cruzarlo con el log del servidor si alguien
          nos lo cuenta. No dice NADA del fallo: es un hash. */}
      {error.digest && (
        <p className="text-nota text-[var(--color-tinta-tenue)]" data-papel="digest">
          Referencia del fallo: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
