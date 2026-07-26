import type { MetadataRoute } from 'next';
import { URL_SITIO } from '@/sitio';

/**
 * ⭐⭐ QUÉ SE INDEXA Y QUÉ NO. Y NO ES «CERRARLO TODO» NI «ABRIRLO TODO».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL RIESGO QUE ESTO CIERRA, MEDIDO Y CON NOMBRE:
 *
 *  `/parada/[poste]` es `force-dynamic` y **pide a Avanza durante el render**.
 *  Hay **934 paradas**, todas alcanzables por enlaces desde la portada (home →
 *  línea → itinerario). Un rastreador no tiene que adivinar ninguna URL: se las
 *  damos servidas. Recorrer el sitio produce **~934 peticiones a Avanza**, y
 *  cada una es un fallo de caché **perfectamente legítimo**, porque son claves
 *  distintas y la caché acota las peticiones POR CLAVE, no el NÚMERO DE CLAVES.
 *
 *  ⚠️ Y QUIEN RECIBE EL GOLPE ES AVANZA, NO NOSOTROS. Eso es lo que lo convierte
 *     en un problema y no en una molestia: ZetaBus vive de un servicio ajeno del
 *     que no tiene permiso, solo ausencia de prohibición.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ EL CRITERIO, Y NO ES «PROTEGER A AVANZA»: ES **QUÉ CONTENIDO SE PUEDE
 *    INDEXAR SIN MENTIR**. Que además proteja a Avanza sale de propina.
 *
 * ── SE PERMITE ────────────────────────────────────────────────────────────────
 *
 *   `/`                 La portada. Es lo que hay que encontrar.
 *
 *   `/linea/*`          ⭐ **EL CONTENIDO CON VALOR DE BÚSQUEDA.** Quien teclea
 *                       «línea 35 Zaragoza recorrido» quiere exactamente esto, y
 *                       lo que hay aquí **es cierto durante meses**: el recorrido,
 *                       las paradas en orden, el desvío vigente, los horarios de
 *                       terminal. Son 74 páginas —no 934— y su caché de horario
 *                       dura UN DÍA, así que el coste contra Avanza está acotado
 *                       y se reparte. Cerrarlo sería tirar el tráfico útil por
 *                       una precaución que aquí no hace falta.
 *
 *   `/sobre-los-datos`  Explica de dónde sale cada cosa. Estático.
 *
 * ── NO SE PERMITE ─────────────────────────────────────────────────────────────
 *
 *   `/parada/*`         ⭐⭐ **Y EL MOTIVO PRINCIPAL NO ES EL COSTE: ES QUE ESE
 *                       CONTENIDO NO ES INDEXABLE POR NATURALEZA.**
 *
 *                       Lo único que la página de parada tiene de valioso son
 *                       **los minutos que faltan**, y eso **caduca en 15
 *                       segundos**. Una parada indexada le enseñaría a quien
 *                       llega desde el buscador un «llega en 3 min» de hace tres
 *                       semanas. Sería, literalmente, publicar una mentira — y
 *                       este proyecto entero está construido sobre no hacer eso.
 *
 *                       ⇒ Que además evite ~934 peticiones a Avanza por cada
 *                         reindexación es la segunda razón, no la primera. Si el
 *                         contenido fuera indexable, habría que buscar otra vía
 *                         (un tope global de claves nuevas) en vez de cerrarlo.
 *
 *   `/api/*`            No es contenido: es maquinaria. `/api/llegadas/*` además
 *                       pide a Avanza en cada llamada, y `/api/diag` es el
 *                       endoscopio —público a propósito, pero no algo que deba
 *                       salir en una búsqueda—.
 *
 *                       ⚠️ Y aquí dentro cae también `/api/regenerar`, que lanza
 *                       el barrido nocturno. **Que esté cerrado aquí NO es lo que
 *                       lo protege** —ver abajo: esto es una petición, no una
 *                       valla—. Lo protegen tres cosas que sí son vallas: que
 *                       solo responde a POST (un rastreador hace GET), que exige
 *                       un token en cabecera, y que sin token configurado no
 *                       ejecuta nada. El `Disallow` solo le ahorra el viaje a
 *                       quien se porta bien.
 *
 *   `/interno/*`        La guía del sistema visual. Ya lleva `noindex` en su
 *                       metadata, pero eso el rastreador solo lo sabe DESPUÉS de
 *                       pedir la página. Decirlo aquí le ahorra la visita.
 *
 *   `/*?fingir=*`       El modo demo. No está enlazado desde ninguna parte, pero
 *                       si una URL fingida se filtrara alguna vez a un enlace
 *                       externo, se indexaría una pantalla **falsa a propósito**
 *                       como si fuera el servicio real. Es barato cerrarlo.
 *
 * ── LO QUE ESTO NO ES ─────────────────────────────────────────────────────────
 *
 * ⚠️ **`robots.txt` es una PETICIÓN, no una valla.** Lo respetan los buscadores
 *    serios; no lo respeta quien no quiera. Contra un rastreador maleducado lo
 *    único que hay hoy es el `Limitador` (cubo de fichas, 4/s), que **no impide
 *    las 934 peticiones pero sí impone el ritmo**: salen en ~4 minutos, que es un
 *    goteo y no una avalancha.
 *
 * ⚠️ Y sigue abierto lo que la auditoría llamó la causa de fondo: **nada acota el
 *    número de CLAVES NUEVAS por minuto**. Esto tapa el caso conocido; no tapa el
 *    caso que no hemos pensado. Ver
 *    `docs/auditoria/12-perimetro-y-publicacion.md` · B-F2.
 *
 * ⭐ SÍ se declara `Sitemap:`, y ahora es cierto: ya existe `app/sitemap.ts` (3 fijas +
 *    44 líneas, cero paradas). Su URL absoluta sale de `@/sitio`, la MISMA base que usan
 *    el `metadataBase` del layout y el propio sitemap: una sola fuente de dominio.
 *
 *    ⚠️ Antes aquí decía «NO se declara porque todavía no hay sitemap». Dejó de ser
 *    cierto cuando el sitemap aterrizó — y viajaron en el MISMO commit a propósito: un
 *    sitemap sin anunciar en robots, o un `Sitemap:` que apunte a un 404, es peor que
 *    nada. El sitemap NO lista ninguna URL que estas reglas bloqueen (se prueba en
 *    `tests/sitemap.test.ts`): la coherencia dura sitemap↔robots.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/linea/', '/sobre-los-datos'],
      disallow: ['/parada/', '/api/', '/interno/', '/*?fingir='],
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
