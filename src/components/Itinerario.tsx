import Link from 'next/link';
import type { Line, LineId, StopId } from '@/core';
import { esBuho, transbordosDe } from '@/engine/topologia';
import { ChipLinea } from './ChipLinea';
import { AcuseDeToque } from './AcuseDeToque';
import type { ParadaDelDiff } from '@/engine/desvios';

/**
 * ⭐ EL ITINERARIO VERTICAL. Clonado de la referencia — y medido, no mirado.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C1 y C2 · "LAS PARADAS NO SON PULSABLES" / "LOS CHIPS NO SON PULSABLES"
 *
 * ⭐ NO ERA VERDAD, Y LO COMPROBÉ PULSANDO (que es lo que no hice la otra vez):
 *
 *     enlaces a parada en /linea/35 ....... 38
 *     chips de transbordo ................. 84
 *     pulsar el nodo 3 .................... → /parada/25 ✅
 *
 * Mi PRIMER test dijo que no funcionaban. Mentía: leía la URL antes de que la
 * navegación hubiera ocurrido. El instrumento otra vez. Si me lo hubiera creído,
 * habría "arreglado" código que funcionaba — y probablemente lo habría roto.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ C3 · LO QUE SÍ FALTABA: el nodo no distinguía una parada CON correspondencias
 * de una SIN ellas. En la referencia sí... con **14 px frente a 16 px**. Dos
 * píxeles. Eso no es una señal: es una coincidencia. Se clona el CONCEPTO —que es
 * bueno— pero de forma que se vea:
 *
 *     cabecera ............... CUADRADO redondeado, RELLENO
 *     final .................. CUADRADO redondeado, HUECO
 *     con correspondencias ... ANILLO
 *     sin correspondencias ... punto
 *
 * ⚠️ Las cuatro son FORMAS, no tonos. El color ya está ocupado por la IDENTIDAD
 * de la línea y no puede hacer dos trabajos. En gris esto se sigue leyendo entero.
 *
 * ⚠️ C4 · Y por eso desaparecen los rótulos "CABECERA" y "FINAL": los dice la
 * geometría. Se quedan en `sr-only` para quien no ve formas.
 *
 * ⚠️ C6 · "los búhos van en su propio carril": MEDIDO, Y NO. En la referencia van
 * en LA MISMA FILA que los demás (todos a y=533), los ÚLTIMOS, e INVERTIDOS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⭐⭐ EL RECORRIDO VA EN UNA SUPERFICIE. Y antes NO, que era el fallo.
 *
 * En la vista de línea, el aviso de desvío tenía caja, el bloque de suprimidas
 * tenía caja y la tabla de horarios tenía tarjeta — pero EL RECORRIDO, que es el
 * contenido principal y ocupa entre el 53 % y el 72 % del scroll, iba tirado
 * sobre el lienzo. Lo secundario encajado y lo principal suelto. Y al no tener
 * bordes laterales, la vista perdía su columna durante 2-3 pantallas seguidas.
 *
 * ⚠️ NO ERA UNA DECISIÓN HEREDADA: LA REFERENCIA SÍ LO METE EN TARJETA
 * (`BusLineRoute.tsx`, un `bg-white border rounded-2xl` que envuelve las paradas).
 * Se clonó el NODO —formas, hilo, chips, transbordos, que es donde estaban los
 * bugs C1-C6— y se perdió el contenedor por el camino, porque el contenedor no
 * tenía ningún bug que arreglar y nadie lo miró.
 *
 * Se usa el patrón que ZetaBus YA tiene en `LlegadasVivas` y en `Terminal`
 * (tarjeta + filas divididas), no uno nuevo: una sola caja evita las 17 tarjetas
 * sueltas —que dan lista, no columna— y la raya divisoria impide que en la 23 se
 * lean 2.475 px de blanco liso.
 *
 * ⚠️ LA RAYA VA SANGRADA, y no por gusto: se pinta sobre el BLOQUE DE CONTENIDO,
 * no sobre el <li>, así que arranca de forma estructural después de la columna
 * del hilo (24 px + 12 de gap). Si cruzara el hilo, el trazado se vería punteado.
 * No hay `divide-y` a lo ancho, y no puede haberlo.
 *
 * ⭐ Y arregla de paso dos cosas que llevaban rotas desde el principio, sin tocar
 * su código: `.chip-meta--poste` se pinta con `--color-fondo`, o sea que sobre el
 * lienzo era 1:1 —INVISIBLE, la pastilla no existía— y ahora se lee sobre papel;
 * y el acuse táctil de `.bloque-parada:has(:active)` era invisible por lo mismo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ⭐⭐ LA ALTURA DE LA ENTRADA DEL HILO, Y POR QUÉ NO ES UN NÚMERO SUELTO.
 *
 * El hilo entra por arriba con un tramo corto antes del nodo, y ese tramo tiene
 * que dejar el nodo A LA ALTURA DE LA PRIMERA LÍNEA DEL NOMBRE. Si el nombre baja,
 * el nodo tiene que bajar lo mismo o el trazado se descuadra.
 *
 * La primera fila no lleva raya divisoria, así que su contenido arranca con
 * `pt-0.5` (2 px) y el hilo entra con 8. Las demás llevan raya y respiran con
 * `pt-3` (12 px): son 10 px más, y el hilo tiene que crecer EXACTAMENTE esos 10.
 *
 * ⚠️ Los tres números están atados: si tocas el `pt-*` del bloque, toca esto.
 */
const ENTRADA_SIN_RAYA = 8;
const ENTRADA_CON_RAYA = ENTRADA_SIN_RAYA + 10;

/** Una parada del recorrido, tal y como se va a pintar. */
export interface ParadaDelItinerario {
  readonly poste: number;
  readonly nombre: string;
  /**
   * `null` = una parada que Avanza sirve HOY y que no está en nuestro GTFS (pasa
   * con las provisionales de un desvío). Se pinta igual —existe, y el autobús
   * para en ella— pero sin correspondencias, porque no las sabemos.
   */
  readonly sid: StopId | null;
  /** Provisional: la ha traído el desvío y no está en la ruta oficial. */
  readonly provisional?: boolean;
}

export function Itinerario({
  lineaId,
  linea,
  paradas,
  fingir,
  fuera,
  nombreAccesible,
}: {
  lineaId: LineId;
  linea: Line;
  /** ⚠️ LA RUTA QUE SE PINTA. Si hay desvío, es LA REAL. Nunca la teórica. */
  paradas: readonly ParadaDelItinerario[];
  fingir: string | null;
  /** Paradas del GTFS por las que HOY el autobús NO pasa. Se tachan, con motivo. */
  fuera?: readonly ParadaDelDiff[];
  /**
   * ⚠️ EL NOMBRE DE LA REGIÓN PARA QUIEN NO LA VE. Existía como un <h2> visible
   * ("EL RECORRIDO · 32 PARADAS") que se retiró por no decir nada a quien SÍ ve la
   * tarjeta. Pero quien navega por encabezados lo usaba para llegar hasta aquí, así
   * que el nombre se queda — en el sitio donde no gasta píxeles.
   */
  nombreAccesible?: string;
}) {
  return (
    <ol
      className="mt-6 overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 pt-3"
      data-papel="itinerario"
      aria-label={nombreAccesible}
    >
      {paradas.map((p, i) => {
        const primero = i === 0;
        const ultimo = i === paradas.length - 1;
        const transbordos = p.sid ? transbordosDe(p.sid, lineaId) : [];

        return (
          <li key={`${p.poste}-${i}`} className="flex gap-3" data-papel="nodo" data-poste={p.poste}>
            {/* ── LA COLUMNA DEL RECORRIDO: nodo + hilo ─────────────────────── */}
            <div className="flex w-6 shrink-0 flex-col items-center" aria-hidden="true">
              <span
                className="w-[3px] flex-none"
                style={{
                  height: primero ? ENTRADA_SIN_RAYA : ENTRADA_CON_RAYA,
                  background: primero ? 'transparent' : linea.color,
                }}
              />
              <Nodo
                color={linea.color}
                primero={primero}
                ultimo={ultimo}
                conTransbordo={transbordos.length > 0}
              />
              <span
                className="w-[3px] flex-1"
                style={{ background: ultimo ? 'transparent' : linea.color, minHeight: 14 }}
              />
            </div>

            {/* ── EL CONTENIDO. C1: TRES LÍNEAS. C2: TODO PULSABLE (sin <a> anidado) ─
                nombre                                     ← línea 1
                [POSTE 55]  [PROVISIONAL · DESVÍO]         ← línea 2, misma familia
                [28] [32] [39] [N1] [N7]                   ← línea 3, transbordos
                El `bloque-parada` es position:relative; el enlace del nombre estira
                su zona pulsable a todo el bloque con un ::after; los chips flotan
                por encima. Ver globals.css · C2/C3/C4. */}
            <div
              className={`bloque-parada min-w-0 flex-1 px-2 pb-3 ${
                primero ? 'pt-0.5' : 'border-t border-[var(--color-borde)] pt-3'
              }`}
              data-papel="bloque-parada"
            >
              {/* LÍNEA 1 · EL NOMBRE, SOLO. Y es el ÚNICO <a> a la parada. */}
              <Link
                href={`/parada/${p.poste}${fingir ? `?fingir=${fingir}` : ''}`}
                data-papel="ir-a-parada"
                className="block min-h-[var(--control-min)] text-cuerpo font-bold leading-snug sin-recortar"
                aria-label={`Parada ${p.nombre}, poste ${p.poste}`}
              >
                {/* SIN TRUNCAR. Si el nombre mide 53 caracteres, baja de línea. */}
                {p.nombre}
                {(primero || ultimo) && (
                  <span className="sr-only"> · {primero ? 'cabecera de línea' : 'final de línea'}</span>
                )}
                {/* ⭐ «Te he oído, voy»: mantiene el bloque marcado tras soltar el
                    dedo, hasta que aparece la parada. Ver `AcuseDeToque.tsx`. */}
                <AcuseDeToque />
              </Link>

              {/* LÍNEA 2 · POSTE + PROVISIONAL, CHIPS DE LA MISMA FAMILIA.
                  Antes el poste era una pastilla gris tenue y "provisional" un chip
                  aparte: dos familias para dos cosas del mismo rango (metadatos de la
                  parada). Ahora son el mismo chip; lo que cambia es el ROL (neutro vs
                  aviso), no la forma. NO son enlaces: pulsarlos cae en la zona de la
                  parada, que es lo que se quiere. */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="chip-meta chip-meta--poste" data-papel="chip-poste">
                  poste {p.poste}
                </span>
                {p.provisional && (
                  <span className="chip-meta chip-meta--aviso" data-papel="parada-provisional">
                    provisional · desvío
                  </span>
                )}
              </div>

              {/* LÍNEA 3 · LOS TRANSBORDOS. Lo mejor que se han inventado. Cada uno un
                  <a> a SU línea, HERMANO del enlace de la parada (no anidado), y por
                  encima de la zona estirada. */}
              {transbordos.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1" data-papel="transbordos">
                  {[...transbordos]
                    // ⭐ D1/C6: los búhos, AL FINAL. Como ellos. Otra categoría, detrás.
                    .sort((a, b) => Number(esBuho(a)) - Number(esBuho(b)))
                    .map((t) => (
                      <li key={String(t.id)}>
                        <ChipLinea linea={t} papel="chip-transbordo" enlace />
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}

      {/* ⭐⭐ A1 · LAS PARADAS QUE CAEN POR EL DESVÍO. TACHADAS, Y CON EL MOTIVO.
          Van al final, y NO en su sitio de la secuencia — porque su sitio ya no
          existe. Dejarlas en medio insinuaría que el autobús pasa por ahí, que es
          justo la mentira que venimos a matar.

          ⚠️ Y es DERIVADO: sale de comparar el GTFS con la ruta que Avanza publica
          para hoy. El día que restauren la calle, el diff sale vacío y esto
          DESAPARECE SOLO. Nada que mantener, nada de lo que acordarse. Un aviso
          que hay que acordarse de quitar acaba mintiendo, siempre.

          El `mb-3` iguala el aire de abajo con el `pb-3` que deja la última parada
          cuando este bloque no está: la tarjeta cierra igual en los dos casos.

          ⚠️ AQUÍ HABÍA UN RAYADO DIAGONAL, Y SE COMÍA EL TEXTO. Usaba `es-rancio`,
          que además era MENTIRA SEMÁNTICA: "rancio" es un dato VIEJO —el estado de
          las llegadas cuando dejan de refrescarse—, y esto no es viejo, es la ruta
          de HOY. Se tomó prestado un estado por su aspecto y se heredó su trama.
          `.es-rancio` NO se toca: sigue significando lo que significa en
          `LlegadasVivas`, que es quien la necesita.

          ⚠️ ÁMBAR Y NO ROJO, Y ES SEMÁNTICA: el rojo es ALERTA y exige acción (el
          "YA LLEGA"). Una parada que hoy no se sirve CUESTA, pero no rompe: es
          AVISO. Gastar rojo aquí le quitaría fuerza al que sí la necesita.

          ⭐ EL BORDE VA CON `--color-aviso`, NO CON `--color-aviso-borde`, y lo
          decidió el medidor: sobre el papel blanco de la tarjeta, #fcd34d da
          **1,44:1** —invisible, no llega ni al 3,0 de elemento no textual— y
          #92400e da **7,09:1**. `--color-aviso-borde` funciona sobre el ámbar
          claro, no sobre blanco. Es además el mismo borde que ya lleva el aviso de
          desvío de arriba, así que los dos avisos de la pantalla hablan igual.

          El TACHADO se queda: es forma, no color, y sobrevive al gris. */}
      {fuera && fuera.length > 0 && (
        <li className="mb-3" data-papel="paradas-fuera">
          <div className="rounded-caja border-2 border-[var(--color-aviso)] bg-[var(--color-aviso-fondo)] px-3 py-3">
            <p className="text-menor font-black leading-snug text-[var(--color-aviso)] sin-recortar">
              ⚠ Hoy el autobús NO pasa por{' '}
              {fuera.length === 1 ? 'esta parada' : `estas ${fuera.length} paradas`}
            </p>
            <p className="mt-0.5 text-nota leading-snug not-italic text-[var(--color-tinta-suave)] sin-recortar">
              Están en el recorrido oficial, pero el recorrido que Avanza publica{' '}
              <strong>para hoy</strong> no las incluye. No lo decimos nosotros: lo dice su ruta.
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {fuera.map((x) => (
                <li key={x.poste} className="text-menor leading-snug not-italic sin-recortar">
                  <span className="line-through decoration-2" data-papel="parada-tachada">
                    {x.nombre}
                  </span>{' '}
                  <span className="text-nota text-[var(--color-tinta-tenue)]">poste {x.poste}</span>
                </li>
              ))}
            </ul>
          </div>
        </li>
      )}
    </ol>
  );
}

/**
 * EL NODO. Cuatro formas para cuatro cosas distintas. Ninguna es un color.
 *
 *   ▣ cuadrado relleno ... cabecera
 *   ▢ cuadrado hueco ..... final
 *   ◎ anillo ............. parada con correspondencias
 *   ● punto .............. parada sin correspondencias
 *
 * ⚠️ EL RELLENO DE LOS HUECOS ES `--color-fondo`, NO `--color-papel`. Antes era
 * papel, y funcionaba de casualidad: el itinerario iba sobre el LIENZO, así que
 * "blanco" y "el color de atrás" coincidían en apariencia. Al entrar el recorrido
 * en una tarjeta blanca, papel sobre papel habría dejado el hueco sin relleno
 * propio. `--color-fondo` es lo que siempre debió ser: HUECO = el color de atrás.
 */
function Nodo({
  color, primero, ultimo, conTransbordo,
}: {
  color: string;
  primero: boolean;
  ultimo: boolean;
  conTransbordo: boolean;
}) {
  if (primero || ultimo) {
    return (
      <span
        className="flex-none"
        data-papel={primero ? 'nodo-cabecera' : 'nodo-final'}
        style={{
          width: 18,
          height: 18,
          borderRadius: 'var(--radius-chip)',
          border: `4px solid ${color}`,
          background: primero ? color : 'var(--color-fondo)',
        }}
      />
    );
  }
  if (conTransbordo) {
    return (
      <span
        className="flex-none rounded-full"
        data-papel="nodo-transbordo"
        style={{ width: 14, height: 14, border: `4px solid ${color}`, background: 'var(--color-fondo)' }}
      />
    );
  }
  return (
    <span
      className="flex-none rounded-full"
      data-papel="nodo-simple"
      style={{ width: 9, height: 9, background: color }}
    />
  );
}
