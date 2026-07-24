import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ⭐ NO SE ANUNCIA EL FRAMEWORK. Next manda `X-Powered-By: Next.js` por defecto.
   * No es una vulnerabilidad —la versión se deduce de otras diez señales— pero es
   * ruido gratis en cada respuesta. Una línea.
   */
  poweredByHeader: false,

  /**
   * ⭐⭐ LAS DOS CABECERAS QUE APLICAN DE VERDAD A ESTA APLICACIÓN. Y SOLO ESAS DOS.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *  ⚠️ LO QUE **NO** SE PONE, Y POR QUÉ — porque decirlo es parte del trabajo:
   *
   *  · `Content-Security-Policy` — **cara y arriesgada aquí.** Next inyecta
   *    scripts en línea y Leaflet inyecta estilos, así que haría falta *nonce* y
   *    un middleware: ~1 día de trabajo con capacidad real de romper el mapa. Y
   *    **sin formularios, sin sesiones y sin login, el retorno es bajo.** Puesta a
   *    medias (o en `report-only` sin mirar los informes) es PEOR que no ponerla:
   *    parece protección y no lo es.
   *
   *  · `X-Frame-Options` / `frame-ancestors` — **adorno en esta app.** Protegen
   *    del *clickjacking*: engañar a alguien para que pulse algo con efecto.
   *    **ZetaBus no tiene ni un solo botón con efecto en el servidor.** Lo peor
   *    que consigue quien la enmarque es enseñar horarios de autobús.
   *
   *  · `Permissions-Policy` — **adorno.** No se usa geolocalización, ni cámara,
   *    ni micrófono, ni pagos. No hay permiso que denegar.
   *
   *  · `Strict-Transport-Security` — **sí aplica, pero NO AQUÍ.** Es del hosting.
   *    Declararla desde la aplicación sin HTTPS garantizado puede dejar el sitio
   *    inaccesible para quien la reciba una vez.
   *
   *  · `X-XSS-Protection` — **obsoleta.** Retirada de los navegadores modernos.
   *    Ponerla sería teatro.
   *
   *  ⇒ Una lista larga de cabeceras no es una app más segura: es una app que
   *    parece más segura. Ver `docs/auditoria/12-perimetro-y-publicacion.md`·B-D1.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async headers() {
    return [
      {
        source: '/:ruta*',
        headers: [
          /**
           * ⭐⭐ ESTA ES LA QUE TIENE UN DAÑO CONCRETO, Y NO ES TEÓRICO.
           *
           * La pantalla de parada carga teselas de `tile.openstreetmap.org`. Sin
           * `Referrer-Policy`, **cada petición de tesela lleva un `Referer` con la
           * URL completa** — `https://…/parada/744`. Es decir:
           *
           *     los servidores de OpenStreetMap reciben, de cada usuario,
           *     EN QUÉ PARADA DE AUTOBÚS ESTÁ.
           *
           * Y lo mismo con cada enlace saliente (busesmadrid.es, zaragoza.es,
           * transportes.gob.es). No es un agujero de seguridad: es una **fuga de
           * privacidad de nuestros usuarios hacia terceros**, y es exactamente la
           * clase de cosa que este proyecto no le toleraría a nadie.
           *
           * ⚠️ `strict-origin-when-cross-origin` y no `no-referrer`: OSM sigue
           *    recibiendo el ORIGEN (que es lo que su política de uso de teselas
           *    pide para poder identificar quién les consume), pero **no la ruta**.
           *    Se les da lo que necesitan y ni un dato más.
           */
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          /**
           * El navegador no adivina el tipo de contenido: se cree la cabecera.
           * Barato y correcto. Importa sobre todo en `/api/*`, que devuelve JSON.
           */
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
