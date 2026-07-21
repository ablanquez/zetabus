/**
 * ⭐ LA "INFORMACIÓN ADICIONAL" DE AVANZA — CÓMO FUNCIONA LA LÍNEA, CITADA TAL CUAL.
 *
 * Sube ENCIMA del itinerario porque explica cómo funciona la línea (la 23: "realiza
 * terminal en Pabellón Siglo XXI en estas franjas horarias…"): hay que leerlo ANTES
 * de la ruta, no al final de todo.
 *
 * ⚠️ MARCO NEUTRO, NO ÁMBAR, y el motivo es SEMÁNTICO. El ámbar en ZetaBus significa
 * AVISO —algo que HOY no es normal, como una parada suprimida—. Esto es lo contrario:
 * es cómo funciona la línea SIEMPRE. Y son 19 de 44 líneas: en ámbar, casi media red
 * tendría un cuadro de alarma permanente —el cartel que se deja de leer—, y el ámbar
 * de las suprimidas (que SÍ es de hoy) perdería fuerza. Mismo MARCO que el cuadro de
 * suprimidas (borde de 2 px, `rounded-caja`, mismo padding) para que se lean como
 * hermanos; distinto COLOR (papel + `--color-borde`) para que se distingan.
 *
 * ⚠️ Y el texto NO SE RAZONA NI SE RESUME: es una cita. Se le da formato —los `*` de
 * Avanza son viñetas— pero NO se cambian las palabras. La procedencia ("según Avanza")
 * tampoco va aquí: vive en /sobre-los-datos.
 */

/** Un párrafo de la cita. Si trae `*`, son viñetas de Avanza → lista. */
function Parrafo({ texto }: { texto: string }) {
  const claseTexto = 'text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar';

  if (!texto.includes('*')) {
    return <p className={`mt-1.5 ${claseTexto}`}>{texto}</p>;
  }

  // `*` = viñeta de Avanza. Lo ANTES del primer `*` es el texto de entrada (si lo
  // hay); cada trozo posterior, una viñeta. No se reordena ni se resume: se parte.
  const segmentos = texto.split('*');
  const hayEntrada = !texto.trimStart().startsWith('*');
  const entrada = hayEntrada ? segmentos[0].trim() : '';
  const vinetas = (hayEntrada ? segmentos.slice(1) : segmentos).map((s) => s.trim()).filter(Boolean);

  return (
    <>
      {entrada && <p className={`mt-1.5 ${claseTexto}`}>{entrada}</p>}
      <ul className="mt-1 flex flex-col gap-1">
        {vinetas.map((v, i) => (
          <li key={i} className={`flex gap-1.5 ${claseTexto}`}>
            <span aria-hidden className="text-[var(--color-tinta-tenue)]">
              •
            </span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function InfoAdicional({ info }: { info: string | null }) {
  if (!info) return null; // línea sin "Información adicional" (25 de 44) → nada, sin hueco
  // El parser une los `<p>` de Avanza con `\n`: se respeta ese reparto de párrafos.
  const parrafos = info.split('\n').filter((p) => p.trim().length > 0);

  return (
    // ⚠️ BORDE NEUTRO, NO color de línea. Se probó el color de línea y 4 de las 19
    //    líneas con info (29, 59, 38, 56) no llegaban a 3:1 sobre papel —el amarillo
    //    y los limas quedaban por debajo del mínimo no-textual—. El neutro además NO
    //    choca con el borde ámbar del cuadro de suprimidas de al lado (decisión de
    //    Antonio: neutro para todas).
    // ⚠️ translate="no" en el BLOQUE: el cuerpo es una CITA LITERAL de Avanza, y el
    //    traductor del navegador la reescribiría en silencio —deshaciendo desde FUERA
    //    el principio "se cita, no se razona", sin que ningún test lo cace—. El título,
    //    que es NUESTRO, se vuelve a habilitar con translate="yes": ese sí se traduce.
    <div
      className="mb-3 rounded-caja border-2 border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-3"
      data-papel="info-adicional"
      translate="no"
    >
      {/* Título A SECAS, sin "· según Avanza" (la procedencia vive en /sobre-los-datos).
          ⭐ <h2>: es el subtítulo de una región; bajo el <h1> de la vista (el rumbo) y
          sin h2 previo, el nivel que no salta es el 2. Antes era <p>: invisible a la
          navegación por encabezados de un lector de pantalla. */}
      <h2 className="text-menor font-black leading-snug text-[var(--color-tinta)] sin-recortar" translate="yes">
        Información adicional
      </h2>
      {parrafos.map((p, i) => (
        <Parrafo key={i} texto={p} />
      ))}
    </div>
  );
}
