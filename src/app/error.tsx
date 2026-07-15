'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * ⭐ A4 · EL 500. CUANDO ALGO SE ROMPE DE VERDAD.
 *
 * ⚠️ `error.tsx` TIENE QUE SER UN CLIENT COMPONENT. Lo exige la documentación
 * oficial (`node_modules/next/dist/docs/…/file-conventions/error.md`): es una
 * *error boundary* de React, y las boundaries solo existen en el cliente.
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
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El detalle va a la consola del SERVIDOR/navegador, no a la pantalla.
    // `digest` es el identificador que Next deja para poder cruzarlo con el log.
    console.error('[zetabus] fallo de render', error.digest ?? '(sin digest)');
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
          onClick={reset}
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[var(--color-tinta)] px-4 text-cuerpo font-bold text-[var(--color-papel)]"
          data-papel="reintentar"
        >
          Volver a intentarlo
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center text-menor font-semibold underline underline-offset-2"
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
