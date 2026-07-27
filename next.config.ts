import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ⭐ NO SE ANUNCIA EL FRAMEWORK. Next manda `X-Powered-By: Next.js` por defecto.
   * No es una vulnerabilidad —la versión se deduce de otras diez señales— pero es
   * ruido gratis en cada respuesta. Una línea.
   */
  poweredByHeader: false,

  /**
   * ⭐⭐ LAS CABECERAS DE SEGURIDAD. Cinco, y cada una con su porqué: una lista
   * larga no es una app más segura, es una app que PARECE más segura, así que aquí
   * cada línea se gana el sitio o se va.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *  SE PONEN:
   *
   *  · `Referrer-Policy` · `X-Content-Type-Options` — las de siempre. Su porqué,
   *    con el daño concreto que evita cada una, va EN LÍNEA junto a ellas abajo.
   *
   *  · `X-Frame-Options: SAMEORIGIN` — anti-clickjacking. En un visor sin un solo
   *    botón con efecto en el servidor el riesgo real es casi nulo (lo peor que
   *    logra quien la enmarque es enseñar horarios), pero es estándar y gratis, y
   *    cierra la puerta a que la embeban y la hagan pasar por suya.
   *
   *  · `Permissions-Policy: camera=(), microphone=(), geolocation=()` — apaga las
   *    tres APIs sensibles PARA TODOS, la propia página incluida. Y NO a ciegas: se
   *    comprobó por grep que `navigator.geolocation` no se usa ni una vez (el chip
   *    «Cerca de mí» es decorativo), ni cámara, ni micrófono, y que Leaflet no pide
   *    nada del navegador. Apagar lo que no se usa no rompe nada y deja dicho que no
   *    se pide. El día que se haga el «cerca de mí», se abre `geolocation=(self)`
   *    aquí y en ningún otro sitio.
   *
   *  · `Strict-Transport-Security: max-age=31536000; includeSubDomains` — fuerza
   *    HTTPS un año. ⚠️ ES PEGAJOSA: el navegador que la ve fuerza HTTPS durante el
   *    `max-age` AUNQUE se retire la cabecera; si el SSL cayera, el sitio quedaría
   *    inaccesible para quien ya la recibió. Se asume porque el SSL de Hostinger es
   *    estable y es lo estándar.
   *
   *  ⚠️ ESTO REVISA UNA DECISIÓN ANTERIOR. Las tres de arriba estaban anotadas como
   *     «adorno» en `docs/auditoria/12-perimetro-y-publicacion.md`·B-D1 (ese informe
   *     describe su momento y se queda como está). Se añaden ahora a sabiendas de que
   *     en un visor sin login no suben la seguridad REAL: son baratas, estándar, y el
   *     escaneo del perímetro (securityheaders) las pide.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *  SIGUEN SIN PONERSE:
   *
   *  · `Content-Security-Policy` — cara y arriesgada aquí. Next inyecta scripts en
   *    línea y Leaflet estilos: haría falta *nonce* y middleware, ~1 día con
   *    capacidad real de romper el mapa (las teselas vienen de otro dominio). Sin
   *    formularios ni sesiones el retorno es bajo, y a medias es PEOR que nada. Otra
   *    tanda, con pruebas. No se pone CSP desde la app.
   *
   *  · `X-XSS-Protection` — obsoleta, retirada de los navegadores modernos. Teatro.
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

          // Anti-clickjacking. No necesitamos que nadie nos embeba.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },

          // Fuerza HTTPS un año. Pegajosa (ver arriba); el SSL de Hostinger es estable.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },

          // Apaga geolocalización/cámara/micrófono para todos: ninguna se usa (grep).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
