import Link from 'next/link';

/**
 * ⭐ A4 · EL 404. Y NO ES DECORACIÓN.
 *
 * El repo es PÚBLICO E INDEXADO. Los bots van a probar `/parada/abc`,
 * `/parada/0x2E8`, `/wp-admin`, `/.env`. Todas esas rutas tienen que morir en una
 * página NUESTRA, no en la de Next.
 *
 * ⚠️ Y AQUÍ HAY QUE SER PRECISO, PORQUE ANTONIO Y YO NO COINCIDIMOS DEL TODO:
 *
 * Antonio teme que *"si una revienta con un stack trace de Next en producción,
 * estamos enseñando las tripas"*. **Comprobado, y no es así**: en producción Next
 * NO envía el stack al navegador — manda un mensaje genérico y guarda el detalle
 * en el servidor. La fuga que él teme **no existía**.
 *
 * Lo que sí faltaba, y era verdad, es que la página **no era nuestra**: salía el
 * «404: This page could not be found.» pelado de Next, sin cabecera, sin vuelta a
 * casa, sin decirle a nadie qué hacer. Eso sí se arregla, y es lo que hay aquí.
 *
 * ⭐ Y LO IMPORTANTE: NO SE INVENTA UN MOTIVO. Este 404 sirve para un poste que no
 * existe, para una línea que no existe y para una ruta inventada. **No sabemos cuál
 * de los tres es**, así que no lo afirmamos: se dice lo que se sabe y se ofrece la
 * salida. Un mensaje que adivina es la primera mentira de una app.
 */
export default function NoEncontrado() {
  return (
    <div className="flex flex-col gap-5 py-6" data-papel="404">
      <div>
        <p className="text-[13px] font-black uppercase tracking-wide text-[var(--color-tinta-tenue)]">
          Error 404
        </p>
        <h1 className="mt-1 text-[24px] font-black leading-tight sin-recortar">
          Aquí no hay nada
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-tinta-suave)] sin-recortar">
          Esa parada, esa línea o esa dirección <strong>no existen</strong> en la red de Zaragoza.
          Puede que el número esté mal escrito, o que la parada ya no esté en servicio.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[var(--color-tinta)] px-4 text-[15px] font-bold text-[var(--color-papel)]"
          data-papel="volver-al-indice"
        >
          Ver todas las líneas
        </Link>
        <Link
          href="/sobre-los-datos"
          className="inline-flex min-h-[44px] items-center justify-center text-[13px] font-semibold underline underline-offset-2"
        >
          Sobre los datos
        </Link>
      </div>
    </div>
  );
}
