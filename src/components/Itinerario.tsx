import Link from 'next/link';
import type { Line, LineId, StopId } from '@/core';
import { esBuho, transbordosDe } from '@/engine/topologia';
import { ChipLinea } from './ChipLinea';
import { Cita } from './Cita';
import { AcuseDeToque } from './AcuseDeToque';
import { InfoAdicional } from './InfoAdicional';

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
  info,
  nombreAccesible,
}: {
  lineaId: LineId;
  linea: Line;
  /** ⚠️ LA RUTA QUE SE PINTA. Si hay desvío, es LA REAL. Nunca la teórica. */
  paradas: readonly ParadaDelItinerario[];
  fingir: string | null;
  /** "Información adicional" de Avanza. Va DENTRO de la tarjeta, al final del recorrido. */
  info?: string | null;
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
      className="mt-6 overflow-hidden rounded-panel border-2 border-[var(--color-tinta)] bg-[var(--color-papel)] px-3 pt-3"
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

            {/* ── EL CONTENIDO. DOS LÍNEAS. C2: TODO PULSABLE (sin <a> anidado) ─────
                nombre                                     ← línea 1
                [POSTE 55] [PROVISIONAL] [28] [32] [N1]    ← línea 2: TODO junto
                El `bloque-parada` es position:relative; el enlace del nombre estira
                su zona pulsable a todo el bloque con un ::after (z-index 0); los chips
                de LÍNEA flotan por encima (z-index 1); los de poste/provisional NO se
                elevan, así que caen a la zona de la parada. Ver globals.css · C1/C2/C4. */}
            <div
              className={`bloque-parada min-w-0 flex-1 px-2 pb-3 ${
                primero ? 'pt-0.5' : 'border-t border-[var(--color-borde)] pt-3'
              }`}
              data-papel="bloque-parada"
            >
              {/* LÍNEA 1 · EL NOMBRE, SOLO. Y es el ÚNICO <a> a la parada.
                  ⛔ Ya NO se pasa `?desde=<línea>`: alimentaba a la flecha de "volver"
                     de la parada, que se retiró (la marca "ZetaBus" de la cabecera es la
                     salida). Sin flecha que lo lea, el parámetro sería ruido en la URL. */}
              <Link
                href={`/parada/${p.poste}${fingir ? `?fingir=${fingir}` : ''}`}
                data-papel="ir-a-parada"
                className="block min-h-[var(--control-min)] text-cuerpo font-bold leading-snug sin-recortar"
                aria-label={`Parada ${p.nombre}, poste ${p.poste}`}
              >
                {/* SIN TRUNCAR. Si el nombre mide 53 caracteres, baja de línea.
                    <Cita>: el nombre es del GTFS/Avanza, el traductor no lo reescribe. */}
                <Cita>{p.nombre}</Cita>
                {(primero || ultimo) && (
                  <span className="sr-only"> · {primero ? 'cabecera de línea' : 'final de línea'}</span>
                )}
                {/* ⭐ «Te he oído, voy»: mantiene el bloque marcado tras soltar el
                    dedo, hasta que aparece la parada. Ver `AcuseDeToque.tsx`. */}
                <AcuseDeToque />
              </Link>

              {/* LÍNEA 2 · POSTE + PROVISIONAL + TRANSBORDOS, TODO EN UNA FILA.
                  · poste y provisional: chips de METADATO (misma familia `chip-meta`);
                    NO son enlaces → caen en la zona de la parada.
                  · "provisional" a secas: las provisionales SOLO salen en desvío, y el
                    chip de desvío de arriba ya lo dice — "· desvío" era contexto repetido.
                  · transbordos: cada uno un <a> a SU línea, HERMANO del enlace de la
                    parada (no anidado) y POR ENCIMA de la zona estirada (z-index 1).
                  ⚠️ El `<ul>` es UN item flex que NO encoge (`flex-none`): cuando la fila
                    no cabe, los chips de línea bajan JUNTOS a la siguiente, no uno
                    colgando. El texto NUNCA se recorta: si no cabe, baja de línea. */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="chip-meta chip-meta--poste" data-papel="chip-poste">
                  poste {p.poste}
                </span>
                {p.provisional && (
                  <span className="chip-meta chip-meta--aviso" data-papel="parada-provisional">
                    provisional
                  </span>
                )}
                {transbordos.length > 0 && (
                  <ul className="flex flex-none flex-wrap items-center gap-1.5" data-papel="transbordos">
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
            </div>
          </li>
        );
      })}

      {/* ⭐ "Información adicional" (cómo funciona la línea) DENTRO de la tarjeta, al
          final del recorrido. (El cuadro de paradas suprimidas que vivía aquí debajo
          se mudó al acordeón de desvío, arriba — ver `AvisoDesvio.tsx`. Las decisiones
          de aquel cuadro —ámbar y no rojo, borde de 2 px con `--color-aviso`, el
          tachado que sobrevive al gris— se fueron con él.) */}
      {info && (
        <li>
          <InfoAdicional info={info} />
        </li>
      )}

      {/* ⭐⭐ EL CUADRO DE PARADAS SUPRIMIDAS SE MUDÓ. Ya no vive aquí, al final del
          recorrido —a 30 paradas del aviso que lo anunciaba—: ahora es el CONTENIDO
          del acordeón de desvío, arriba, pegado a su chip. Ver `AvisoDesvio.tsx` y la
          vista de línea. Aquí las paradas afectadas siguen marcándose PROVISIONAL. */}
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
