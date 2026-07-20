import type { HorarioWeb } from '@/sources/avanza/horario';
import { modelarSalidas, type FrecuenciaModelo, type SalidaMarcada } from '@/engine/salidas';

/**
 * ⭐ PRIMERAS Y ÚLTIMAS SALIDAS DE HOY — el MODELO ESTÁNDAR (`docs/MODELO-BLOQUE-SALIDAS.md`).
 *
 * La tabla de Avanza usa tres columnas (hora · desde · hasta) para transportar una
 * CONSTANTE: en el 71 % de la red el par origen→destino no cambia nunca. Aquí ese
 * par sube a la CABECERA y las horas van en FLUJO, en orden cronológico estricto.
 * Solo las salidas que se apartan del par llevan una MARCA (letra volada), explicada
 * al pie. El que calcula todo eso es `engine/salidas.ts`; esto solo lo pinta.
 *
 * ⚠️ NO ES UN HORARIO DE PASO por tu parada: son la primera y la última salida.
 * ⚠️ La marca es una LETRA, no color ni asterisco: se distingue en gris y `*` ya
 *    significa "fuente secundaria" en la ficha de flota (no se reutiliza).
 */

/** Cómo se lee la frecuencia: un número si los tres días coinciden, los tres si no. */
function textoFrecuencia(f: FrecuenciaModelo): string {
  if (f.uniforme && f.laborables !== null) return `Cada ${f.laborables} min de media · según Avanza`;
  const partes: string[] = [];
  if (f.laborables !== null) partes.push(`laborables ${f.laborables}`);
  if (f.sabados !== null) partes.push(`sábados ${f.sabados}`);
  if (f.festivos !== null) partes.push(`domingos y festivos ${f.festivos}`);
  if (partes.length === 0) return `${f.literal} · según Avanza`; // plan B: la cita cruda
  return `De media: ${partes.join(' · ')} min · según Avanza`;
}

/**
 * Las horas en flujo, separadas por `·`. La marca es una `<sup>` a tinta plena (no
 * tenue: una letra volada pequeña necesita el contraste para pasar AA). Para quien
 * usa lector de pantalla, la salida marcada lleva su nota en el `aria-label` —así
 * no oye una "a" suelta y sin sentido— y la hora se oculta para no leerla dos veces.
 */
function Flujo({ salidas, notaPorMarca }: { salidas: readonly SalidaMarcada[]; notaPorMarca: Map<string, string> }) {
  return (
    <p className="text-cuerpo leading-relaxed text-[var(--color-tinta)] sin-recortar" data-papel="flujo-salidas">
      {salidas.map((x, i) => (
        <span key={i} aria-label={x.marca ? `${x.hora}, ${notaPorMarca.get(x.marca) ?? ''}` : undefined}>
          {i > 0 && (
            <span aria-hidden className="text-[var(--color-tinta-tenue)]">
              {' · '}
            </span>
          )}
          <span aria-hidden={x.marca ? true : undefined} className="font-bold tabular-nums">
            {x.hora}
          </span>
          {x.marca && (
            <sup aria-hidden className="ml-px text-[0.72em] font-black" data-marca={x.marca}>
              {x.marca}
            </sup>
          )}
        </span>
      ))}
    </p>
  );
}

export function Terminal({ horario }: { horario: HorarioWeb | null }) {
  // ⚠️ `null` = NO se pudo LEER (fallo de red, plantilla cambiada). No es lo mismo
  //    que "Avanza no publica": no lo afirmamos, así que no se pinta nada. El caso
  //    de "publica página pero sin tabla" (búhos) sí llega, con `hay=false`.
  if (!horario) return null;

  const modelo = modelarSalidas(horario);
  const notaPorMarca = new Map(modelo.notas.map((n) => [n.marca, n.texto]));

  return (
    <section className="mt-6" data-papel="terminal">
      <h2 className="text-menor font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        funcionamiento de terminal
      </h2>

      {modelo.hay && modelo.cabecera ? (
        <>
          <p className="mb-2 text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
            Las <strong>primeras</strong> y <strong>últimas</strong> salidas de hoy, tal y como las publica
            Avanza. No es la hora a la que pasa por tu parada.
          </p>

          <div className="overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
            {/* Cabecera: el par mayoritario. HACIA {destino} manda; desde {origen} lo acompaña. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-[var(--color-borde)] px-4 py-2.5">
              <p className="text-menor font-black uppercase tracking-wide sin-recortar" data-papel="cabecera-hacia">
                Hacia {modelo.cabecera.destino}
              </p>
              <p className="text-nota text-[var(--color-tinta-tenue)] sin-recortar" data-papel="cabecera-desde">
                desde {modelo.cabecera.origen}
              </p>
            </div>

            <div className="px-4 py-3" data-papel="tabla-salidas" data-etiqueta="Primeras salidas">
              <p className="mb-1 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                Primeras
              </p>
              <Flujo salidas={modelo.primeras} notaPorMarca={notaPorMarca} />
            </div>

            {modelo.frecuencia && (
              <p
                className="border-y border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 py-1.5 text-nota font-bold leading-snug text-[var(--color-tinta-suave)] sin-recortar"
                data-papel="frecuencia"
              >
                {textoFrecuencia(modelo.frecuencia)}
              </p>
            )}

            <div className="px-4 py-3" data-papel="tabla-salidas" data-etiqueta="Últimas salidas">
              <p className="mb-1 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                Últimas
              </p>
              <Flujo salidas={modelo.ultimas} notaPorMarca={notaPorMarca} />
            </div>

            {/* Al pie, una línea por marca: en qué se aparta del par de cabecera. */}
            {modelo.notas.length > 0 && (
              <ul className="border-t border-[var(--color-borde)] px-4 py-2.5" data-papel="notas-salidas">
                {modelo.notas.map((n) => (
                  <li
                    key={n.marca}
                    className="text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar [&:not(:first-child)]:mt-1"
                  >
                    <span className="font-black text-[var(--color-tinta)]" data-marca={n.marca}>
                      {n.marca}
                    </span>{' '}
                    {n.texto}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        // ⚠️ Sin tabla (los 14 búhos). Un bloque en blanco parece "no hay servicio":
        //    miente por omisión. Se dice la verdad, y SIN inventar el motivo.
        <p
          className="mt-1 rounded-panel border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-4 py-3 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="sin-horario"
        >
          Avanza no publica los horarios de esta línea.
        </p>
      )}

      {/* ⭐ "Información adicional": CITA LITERAL de Avanza. Condicional. */}
      {horario.info && (
        <aside
          className="mt-3 rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)] px-4 py-3"
          data-papel="info-adicional"
        >
          <p className="mb-1 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            Información adicional · según Avanza
          </p>
          {horario.info.split('\n').map((parrafo, i) => (
            <p key={i} className="text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar [&:not(:first-of-type)]:mt-1">
              {parrafo}
            </p>
          ))}
        </aside>
      )}
    </section>
  );
}
