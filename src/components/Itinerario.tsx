import Link from 'next/link';
import type { Line, LineId } from '@/core';
import { idParada, parada, posteDe, transbordosDe } from '@/engine/topologia';

/**
 * ⭐ EL ITINERARIO VERTICAL. CLONADO DE LA REFERENCIA, Y SIN DISCUSIÓN.
 *
 * Lo nuestro era una lista plana de 38 nombres. **Era peor.** Y no hay debate.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUÉ HACE BIEN LO SUYO, Y QUE NO SE VE LEYENDO EL CÓDIGO:
 *
 *  1. NODOS CONECTADOS POR UNA LÍNEA VERTICAL. El recorrido se lee como lo que
 *     es —una secuencia— y no como un menú. **El tiempo vive en el espacio.**
 *
 *  2. ⭐ LOS CHIPS DE TRANSBORDO. Cada parada lleva las OTRAS líneas que pasan
 *     por ella. Medido jugando con su pantalla: la línea 21 tiene 34 paradas y
 *     **61 chips de transbordo**. Te dice dónde cambiar de línea SIN SALIR DEL
 *     ITINERARIO. Eso es oro puro, y yo no lo tenía.
 *
 *  3. El nodo del PRIMERO y el ÚLTIMO se distinguen: el recorrido tiene extremos.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y ES LA L7 OTRA VEZ, CON OTRA CARA:
 * leí su CSS, medí su geometría... y NUNCA PULSÉ NADA. Lo mejor de su producto
 * —el filtro que apaga mapa y lista a la vez, y estos transbordos— vivía en la
 * capa que no miré: LA INTERACCIÓN.
 *
 * ⚠️ LO ÚNICO QUE NO SE CLONA: nada de `truncate`. Ellos truncan el nombre de la
 * parada; aquí, si no cabe, BAJA DE LÍNEA. "Hu…" puede ser Hugo o Humberto.
 */

export function Itinerario({
  lineaId,
  linea,
  paradas,
  fingir,
}: {
  lineaId: LineId;
  linea: Line;
  paradas: readonly string[];
  fingir: string | null;
}) {
  return (
    <ol className="mt-2" data-papel="itinerario">
      {paradas.map((sid, i) => {
        const p = parada(idParada(sid));
        const poste = posteDe(idParada(sid));
        if (!p || poste === null) return null;

        const primero = i === 0;
        const ultimo = i === paradas.length - 1;
        const transbordos = transbordosDe(idParada(sid), lineaId);

        return (
          <li key={sid} className="flex gap-3" data-papel="nodo" data-poste={poste}>
            {/* ── LA COLUMNA DEL RECORRIDO: nodo + hilo ─────────────────────── */}
            <div className="flex w-6 shrink-0 flex-col items-center" aria-hidden="true">
              {/* El hilo de ARRIBA. El primero no lo tiene: ahí empieza. */}
              <span
                className="w-[3px] flex-none"
                style={{ height: 10, background: primero ? 'transparent' : linea.color }}
              />
              {/* El NODO. Los extremos son un anillo grueso; los de en medio, un
                  punto. ⚠️ La diferencia es de FORMA (relleno/hueco, tamaño), no
                  de color: el color ya está ocupado por la identidad de la línea
                  y no puede hacer dos trabajos. */}
              <span
                className="flex-none rounded-full"
                style={
                  primero || ultimo
                    ? {
                        width: 16, height: 16,
                        border: `4px solid ${linea.color}`,
                        background: 'var(--color-papel)',
                      }
                    : { width: 9, height: 9, background: linea.color }
                }
              />
              {/* El hilo de ABAJO. El último no lo tiene: ahí acaba. */}
              <span
                className="w-[3px] flex-1"
                style={{ background: ultimo ? 'transparent' : linea.color, minHeight: 18 }}
              />
            </div>

            {/* ── EL CONTENIDO ─────────────────────────────────────────────── */}
            <div className="min-w-0 flex-1 pb-4">
              <Link
                href={`/parada/${poste}${fingir ? `?fingir=${fingir}` : ''}`}
                className="flex min-h-[44px] flex-col justify-center rounded-lg"
              >
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {/* SIN TRUNCAR. Si el nombre mide 53 caracteres, baja de línea. */}
                  <span className="text-[14px] font-bold leading-snug sin-recortar">{p.name}</span>
                  <span className="shrink-0 rounded-md bg-[var(--color-fondo)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-tinta-tenue)]">
                    poste {poste}
                  </span>
                  {(primero || ultimo) && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                      {primero ? 'cabecera' : 'final'}
                    </span>
                  )}
                </span>
              </Link>

              {/* ⭐ LOS TRANSBORDOS. Lo mejor que se han inventado. */}
              {transbordos.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1" data-papel="transbordos">
                  {transbordos.map((t) => (
                    <li key={String(t.id)}>
                      <Link
                        href={`/linea/${encodeURIComponent(t.shortName)}`}
                        aria-label={`Ver el recorrido de la línea ${t.shortName}`}
                        className="flex h-6 min-w-[24px] items-center justify-center rounded-md px-1.5 text-[11px] font-black"
                        style={{ backgroundColor: t.color, color: t.textColor }}
                      >
                        {t.shortName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
