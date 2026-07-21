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
 * ⚠️ Jerarquía por PESO: la CIFRA va en blanco pleno y negrita (es el dato); las
 * etiquetas, en blanco normal. La procedencia ("según Avanza") NO va aquí: vive en
 * /sobre-los-datos, que ya cuenta que la frecuencia la publica el operador.
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
  // ` ` (nbsp) entre la cifra y "min": la unidad no puede quedar viuda en un
  // salto de línea, separada de su número. Solo pega el número a su unidad; el resto
  // rompe normal.
  if (f.uniforme && f.laborables !== null) {
    cuerpo = <>Cada {cifra(f.laborables)}{' '}min de media</>;
  } else {
    const dias: ReactNode[] = [];
    if (f.laborables !== null) dias.push(<>laborables {cifra(f.laborables)}</>);
    if (f.sabados !== null) dias.push(<>sábados {cifra(f.sabados)}</>);
    if (f.festivos !== null) dias.push(<>domingos y festivos {cifra(f.festivos)}</>);
    cuerpo =
      dias.length === 0 ? (
        // plan B: la cita cruda de Avanza, si el formato no se dejó parsear →
        // translate="no", es una cita literal.
        <span translate="no">{f.literal}</span>
      ) : (
        <>
          De media:{' '}
          {dias.map((d, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {d}
            </span>
          ))}
          {' '}min
        </>
      );
  }
  return (
    <p
      className="bg-[var(--color-tinta)] px-4 py-2 text-nota font-medium leading-snug text-[var(--color-papel)] sin-recortar"
      data-papel="frecuencia"
    >
      {cuerpo}
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
    // ⚠️ translate="no": las horas son CITA de Avanza. El traductor del navegador
    //    reescribiría una tabla de horarios en silencio, y ningún test lo caza
    //    (el ataque viene de FUERA del código). Aquí solo hay horas y puntuación:
    //    congelar el <p> entero no pierde chrome traducible.
    <p
      className="text-cuerpo leading-relaxed text-[var(--color-tinta)] sin-recortar"
      data-papel="flujo-salidas"
      translate="no"
    >
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
          {/* ⭐ CONTORNO DE TINTA (2 px, el mismo grosor que el cuadro ámbar de
              suprimidas). Cierra la caja: sin él, la franja negra de frecuencia iba a
              ras del borde de 1 px y parecía salirse por los lados. `overflow-hidden`
              + `rounded-panel` recortan la franja en las esquinas. */}
          <div className="overflow-hidden rounded-panel border-2 border-[var(--color-tinta)] bg-[var(--color-papel)]">
            {/* Cabecera: el par mayoritario. HACIA {destino} manda; desde {origen} lo acompaña. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-[var(--color-borde)] px-4 py-2.5">
              {/* ⚠️ El nombre de terminal es CITA de Avanza → translate="no" (que el
                  navegador no lo reescriba al traducir). "Hacia"/"desde" son NUESTROS:
                  se traducen con normalidad. */}
              <p className="text-menor font-black uppercase tracking-wide sin-recortar" data-papel="cabecera-hacia">
                Hacia <span translate="no">{modelo.cabecera.destino}</span>
              </p>
              <p className="text-nota text-[var(--color-tinta-tenue)] sin-recortar" data-papel="cabecera-desde">
                desde <span translate="no">{modelo.cabecera.origen}</span>
              </p>
            </div>

            {/* ⚠️ "PRIMERAS SALIDAS" / "ÚLTIMAS SALIDAS" — con la palabra "salidas".
                Es lo que sostiene NO poner un aviso "no es la hora de tu parada": el
                propio rótulo ya dice que son SALIDAS (de cabecera), no horas de paso. */}
            <div className="px-4 py-3" data-papel="tabla-salidas" data-etiqueta="Primeras salidas">
              <p className="mb-1 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                Primeras salidas
              </p>
              <Flujo salidas={modelo.primeras} notaPorMarca={notaPorMarca} />
            </div>

            {modelo.frecuencia && <FranjaFrecuencia f={modelo.frecuencia} />}

            <div className="px-4 py-3" data-papel="tabla-salidas" data-etiqueta="Últimas salidas">
              <p className="mb-1 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                Últimas salidas
              </p>
              <Flujo salidas={modelo.ultimas} notaPorMarca={notaPorMarca} />
            </div>

            {/* Al pie, una línea por marca: en qué se aparta del par de cabecera.
                ⚠️ El texto de la nota INCRUSTA nombres de terminal citados ("termina en
                {'{X}'}, no en {'{Y}'}") → translate="no" en el texto. Se congela junto con
                sus dos o tres conectores nuestros ("termina en", "no en"): coste ínfimo
                frente a dejar un nombre propio a merced del traductor. */}
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
                    <span translate="no">{n.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* ⛔ FUERA el aviso "es la hora de salida, no la de paso por tu parada":
              los rótulos "PRIMERAS SALIDAS"/"ÚLTIMAS SALIDAS" ya llevan la palabra
              "salidas", que es lo que lo dice. Y /sobre-los-datos lo remata. */}
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
      {/* ⛔ La "Información adicional" YA NO vive aquí (llegaba tarde, al final de
          todo). Explica CÓMO FUNCIONA la línea, así que sube ENCIMA del itinerario
          —hay que leerla antes de la ruta, no después—. Ver `InfoAdicional` y su
          colocación en `linea/[linea]/page.tsx`. */}
    </section>
  );
}
