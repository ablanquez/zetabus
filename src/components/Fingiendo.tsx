import type { Fingimiento } from '@/engine/fingir';

/**
 * ⭐⭐ «ESTA PANTALLA ESTÁ MINTIENDO, Y ESTO ES LO QUE MIENTE».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔ LO QUE HABÍA ANTES ERA UNA BANDA ROJA EN EL LAYOUT, Y AFIRMABA ALGO FALSO.
 *
 *      "⚠ MODO DEMO ENCENDIDO · LOS DATOS PUEDEN SER FINGIDOS"
 *
 * Antonio: *"no son datos demo — los tiempos y las geoposiciones son REALES"*.
 * Y tenía razón. `ZETABUS_DEMO=1` **no finge nada por sí solo**: lo único que hace
 * es DESBLOQUEAR la lectura de `?fingir=`. Sin ese parámetro en la URL, el
 * transporte es `transporteReal` y la caché es la normal. Comprobado con dos
 * servidores del mismo build, mismo poste, mismo instante:
 *
 *      CON ZETABUS_DEMO=1 → 4666|5min|SAN GREGORIO   4974|16min|SAN GREGORIO
 *      SIN el flag        → 4666|5min|SAN GREGORIO   4974|16min|SAN GREGORIO
 *                           idénticos, byte a byte
 *
 * ⇒ La banda confundía **"la puerta está abierta"** con **"ha entrado alguien"**.
 *   Se enganchó al `layout`, que es lo único que ve todas las páginas… y también
 *   lo único que NO sabe si ESTA página finge. El sitio con la información
 *   equivocada.
 *
 * ⚠️ Y ES LO MÁS IRÓNICO QUE PODÍA PASARLE A ESTA APP: un aviso que avisa de algo
 *    que no está pasando. Peor que inútil — **entrena a desconfiar de datos
 *    buenos**, y el que grita siempre deja de ser oído. Los 104 e2e corren con el
 *    flag encendido y casi ninguno usa `?fingir=`: la banda llevaba saliendo sobre
 *    pantallas 100 % reales todo el tiempo.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ Y EL EFECTO LATERAL BUENO, QUE ES EL QUE DE VERDAD CIERRA EL AGUJERO:
 *
 *   La demo pública va a servir datos REALES de Avanza. Con la banda atada al flag,
 *   bastaba **una tecla** —copiar `ZETABUS_DEMO=1 npm run start` de la
 *   documentación— para publicar una demo con datos ciertos gritando que podían ser
 *   mentira. Justo la mentira que este proyecto combate, y en la cara del visitante.
 *
 *   Atado al `?fingir=` de la URL, **ese fallo deja de ser posible**: una pantalla
 *   sin `?fingir=` no puede enseñar esto aunque el flag se quede encendido por
 *   descuido. La protección ya no depende de que nadie se equivoque.
 *
 * ⚠️ EL ROJO SE QUEDA, y no es incoherente con "el rojo es el YA LLEGA": lo que
 *    devalúa un color no es usarlo donde toca, es usarlo PERMANENTEMENTE y sin
 *    motivo. Una pantalla admitiendo que sus datos son inventados es exactamente
 *    una alerta. Al pasar de "siempre" a "casi nunca", deja de competir.
 *
 * ⚠️ Y NO VA SOLO EN EL TONO —regla de la casa—: van el SÍMBOLO (⚠), la PALABRA
 *    ("FINGIENDO", y cuál), y el BORDE. En gris se sigue leyendo entero.
 */
export function Fingiendo({ que }: { que: Fingimiento | null }) {
  // ⭐ `null` = no hay fingimiento = NO SE PINTA NADA. Ni un hueco, ni un borde.
  //    Es toda la corrección: la marca depende del fingimiento, no del flag.
  if (!que) return null;

  return (
    <p
      className="mt-2 rounded-caja border-2 border-[var(--color-alerta)] bg-[var(--color-papel)] px-3 py-2 text-menor leading-snug text-[var(--color-alerta)] sin-recortar"
      data-papel="fingiendo"
      data-fingimiento={que}
      role="status"
    >
      <span aria-hidden>⚠ </span>
      <strong className="font-black uppercase tracking-wide">Fingiendo «{que}»</strong>{' '}
      · los datos de esta pantalla son <strong>inventados</strong>, no vienen de Avanza.
    </p>
  );
}
