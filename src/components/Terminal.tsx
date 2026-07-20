import type { ReactNode } from 'react';
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

/**
 * ⭐ LA FRANJA DE FRECUENCIA. Fondo TINTA (negro), texto blanco — hace de BISAGRA
 * entre las dos tablas (primeras / últimas). En gris se leía como un bloque más; en
 * tinta la estructura del bloque se entiende de un vistazo.
 *
 * ⚠️ Jerarquía por PESO, no por color: la CIFRA va en blanco pleno y negrita (es el
 * dato); las etiquetas, en blanco normal; y «· según Avanza» en `papel-tenue` —la
 * atribución recede, sin competir, y aun así pasa AA (7,32:1)—.
 *
 * ⚠️ Y sí, el negro sólido también lo usa la botonera de sentido para "activo". No
 * chocan: aquella es una PÍLDORA redondeada entre iguales (eliges una); ésta, una
 * franja de ANCHO COMPLETO, sola, con una cifra dentro. Forma y contexto las
 * separan —comprobado a 360—. La bisagra no se lee como "seleccionado".
 */
function cifra(n: number) {
  return (
    <strong className="font-black text-[var(--color-papel)]" data-papel="frecuencia-cifra">
      {n}
    </strong>
  );
}

function FranjaFrecuencia({ f }: { f: FrecuenciaModelo }) {
  let cuerpo: ReactNode;
  if (f.uniforme && f.laborables !== null) {
    cuerpo = <>Cada {cifra(f.laborables)} min de media</>;
  } else {
    const dias: ReactNode[] = [];
    if (f.laborables !== null) dias.push(<>laborables {cifra(f.laborables)}</>);
    if (f.sabados !== null) dias.push(<>sábados {cifra(f.sabados)}</>);
    if (f.festivos !== null) dias.push(<>domingos y festivos {cifra(f.festivos)}</>);
    cuerpo =
      dias.length === 0 ? (
        f.literal // plan B: la cita cruda, si el formato no se dejó parsear
      ) : (
        <>
          De media:{' '}
          {dias.map((d, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {d}
            </span>
          ))}{' '}
          min
        </>
      );
  }
  return (
    <p
      className="bg-[var(--color-tinta)] px-4 py-2 text-nota font-medium leading-snug text-[var(--color-papel)] sin-recortar"
      data-papel="frecuencia"
    >
      {cuerpo}
      <span className="text-[var(--color-papel-tenue)]"> · según Avanza</span>
    </p>
  );
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
    // ⛔ FUERA "FUNCIONAMIENTO DE TERMINAL" Y EL SUBTÍTULO. Mismo criterio que la
    //    franja "EL RECORRIDO · 32 PARADAS": un título que dice "terminal" encima de
    //    algo ya rotulado "PRIMERAS"/"ÚLTIMAS" no añade nada, y "tal y como las publica
    //    Avanza" es PROCEDENCIA, que vive en /sobre-los-datos (allí se cuenta entera).
    //    El nombre de la región, que el <h2> daba a quien navega por encabezados, se
    //    conserva en el `aria-label` del <section>: misma información, cero píxeles.
    <section className="mt-6" data-papel="terminal" aria-label="Primeras y últimas salidas">
      {modelo.hay && modelo.cabecera ? (
        <>
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

            {modelo.frecuencia && <FranjaFrecuencia f={modelo.frecuencia} />}

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

          {/* ⚠️ ESTO NO ES PROCEDENCIA —que se fue a /sobre-los-datos—, es una
              ADVERTENCIA contra un malentendido real y con consecuencias: "05:00" es
              la salida DE CABECERA, no la hora a la que el bus llega a TU parada. En
              la vista de línea, recién pulsada una parada, confundirlas es fácil y
              puede costar perder el autobús. /sobre-los-datos NO lo cubre (allí está
              la procedencia, no este aviso), así que se queda —en su forma mínima—. */}
          <p
            className="mt-1.5 text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
            data-papel="aviso-salidas"
          >
            Es la hora de salida, no la de paso por tu parada.
          </p>
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
