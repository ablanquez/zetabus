import Link from 'next/link';
import type { Line, LineId, StopId } from '@/core';
import { esBuho, transbordosDe } from '@/engine/topologia';
import { ChipLinea } from './ChipLinea';
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
 */

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
}: {
  lineaId: LineId;
  linea: Line;
  /** ⚠️ LA RUTA QUE SE PINTA. Si hay desvío, es LA REAL. Nunca la teórica. */
  paradas: readonly ParadaDelItinerario[];
  fingir: string | null;
  /** Paradas del GTFS por las que HOY el autobús NO pasa. Se tachan, con motivo. */
  fuera?: readonly ParadaDelDiff[];
}) {
  return (
    <ol className="mt-2" data-papel="itinerario">
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
                style={{ height: 8, background: primero ? 'transparent' : linea.color }}
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
            <div className="bloque-parada min-w-0 flex-1 px-2 pb-3 pt-0.5" data-papel="bloque-parada">
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
          que hay que acordarse de quitar acaba mintiendo, siempre. */}
      {fuera && fuera.length > 0 && (
        <li className="mt-2" data-papel="paradas-fuera">
          <div className="es-rancio px-3 py-3">
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
          background: primero ? color : 'var(--color-papel)',
        }}
      />
    );
  }
  if (conTransbordo) {
    return (
      <span
        className="flex-none rounded-full"
        data-papel="nodo-transbordo"
        style={{ width: 14, height: 14, border: `4px solid ${color}`, background: 'var(--color-papel)' }}
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
