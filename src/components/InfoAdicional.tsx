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
    <div
      className="mb-3 rounded-caja border-2 border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-3"
      data-papel="info-adicional"
    >
      {/* Título A SECAS, sin "· según Avanza" (la procedencia vive en /sobre-los-datos). */}
      <p className="text-menor font-black leading-snug text-[var(--color-tinta)] sin-recortar">
        Información adicional
      </p>
      {parrafos.map((p, i) => (
        <Parrafo key={i} texto={p} />
      ))}
    </div>
  );
}
