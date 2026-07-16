import type { SalidaDeTerminal, TerminalDeSentido, TipoDeDia } from '@/engine/topologia';

/**
 * ⭐ C5 · EL FUNCIONAMIENTO DE TERMINAL. Primeras y últimas salidas.
 *
 * ⚠️ ANTES DE PROMETERLO SE COMPROBÓ QUE EL DATO EXISTE, que era la condición que
 * puso Antonio. Existe: `stop_times.txt` (870.718 filas) + `trips.txt` +
 * `calendar_dates.txt`, horneado en el build. Ver `sources/gtfs-nap/terminal.ts`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LAS HORAS DE MADRUGADA. El GTFS escribe `25:29:00` para "la 1:29 del día
 * siguiente". Se pinta **1:29** a secas: va en las ÚLTIMAS, tras las 23:xx (se
 * ordena por MINUTO GTFS, no por reloj), así que su sitio ya dice que es de
 * madrugada. Nunca se pinta "25:29" —eso lo vigila un test—.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ LAS SALIDAS QUE NO RECORREN LA LÍNEA ENTERA: dos índices, y solo dos, con
 * TEXTO FIJO al pie —cero cálculo de nombres, cero posibilidad de equivocarse—:
 *   1 · No viene desde principio de línea   (su primera parada ≠ cabecera de origen)
 *   2 · No llega a final de línea           (su última parada ≠ cabecera de destino)
 * Una salida puede llevar 1 y 2. Se marca la excepción; una tabla sin parciales no
 * lleva ni índices ni leyenda.
 *
 * ⚠️ Y ESTO NO ES UN HORARIO. Es la PRIMERA y la ÚLTIMA salida. No decimos a qué
 * hora pasa por tu parada: para eso habría que sumar el recorrido teórico —el que
 * falla con tráfico, obras o desvíos—. Eso te lo dice la pantalla de la parada.
 */

const NOMBRE: Record<TipoDeDia, string> = {
  laborable: 'Laborables',
  sabado: 'Sábados',
  festivo: 'Domingos y festivos',
};

/** `1529` → `{ hora: "1:29", siguiente: true }`. Ver la cabecera. */
export function reloj(minutos: number): { hora: string; siguiente: boolean } {
  const siguiente = minutos >= 24 * 60;
  const m = minutos % (24 * 60);
  return {
    hora: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`,
    siguiente,
  };
}

/**
 * Una salida, pintada. La hora a secas, y un índice si no recorre la línea entera:
 * 1 (no viene del principio) y/o 2 (no llega al final). El texto está al pie.
 */
function Salida({ salida }: { salida: SalidaDeTerminal }) {
  const r = reloj(salida.minuto);
  return (
    <span
      className="tabular-nums"
      data-papel="salida"
      data-minuto={salida.minuto}
      data-siguiente={r.siguiente ? 'si' : 'no'}
      data-noviene={salida.noViene ? 'si' : undefined}
      data-nollega={salida.noLlega ? 'si' : undefined}
    >
      {r.hora}
      {salida.noViene && (
        <sup
          className="ml-1 font-normal text-[var(--color-tinta-tenue)]"
          data-papel="indice-parcial"
          data-indice="1"
        >
          1
        </sup>
      )}
      {salida.noLlega && (
        <sup
          className={`font-normal text-[var(--color-tinta-tenue)] ${salida.noViene ? 'ml-0.5' : 'ml-1'}`}
          data-papel="indice-parcial"
          data-indice="2"
        >
          2
        </sup>
      )}
    </span>
  );
}

/** Una fila de salidas (primeras / últimas / todas), separadas por puntos. */
function Fila({ etiqueta, salidas }: { etiqueta: string; salidas: readonly SalidaDeTerminal[] }) {
  return (
    <div className="flex gap-2" data-papel="fila-salidas" data-etiqueta={etiqueta}>
      <span className="w-16 shrink-0 pt-0.5 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        {etiqueta}
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-menor font-black leading-snug sin-recortar">
        {salidas.map((s, i) => (
          <span key={i} className="inline-flex items-baseline">
            {i > 0 && <span className="mr-2 font-normal text-[var(--color-borde)]">·</span>}
            <Salida salida={s} />
          </span>
        ))}
      </p>
    </div>
  );
}

export function Terminal({ terminal }: { terminal: TerminalDeSentido | null }) {
  // ⚠️ Si el feed no da horario para este sentido, NO SE INVENTA: no se pinta nada.
  //    Una tabla vacía con guiones parece un fallo; no ponerla, no.
  if (!terminal || terminal.dias.length === 0) return null;

  // ¿Qué índices hacen falta? Se mira TODA la tabla (los tres días): la leyenda va
  // UNA vez al pie, solo con los índices que de verdad aparecen. La excepción.
  const todas = terminal.dias.flatMap((d) => [...d.primeras, ...d.ultimas]);
  const hayNoViene = todas.some((s) => s.noViene);
  const hayNoLlega = todas.some((s) => s.noLlega);

  return (
    <section className="mt-6" data-papel="terminal">
      <h2 className="text-menor font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        funcionamiento de terminal
      </h2>
      <p className="mb-2 text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
        Las <strong>primeras</strong> y <strong>últimas</strong> salidas (del GTFS, no la hora a la
        que pasa por tu parada). Están para cotejarlas: si el horario real no cuadra, es que el dato
        oficial va por detrás.
      </p>

      <div className="overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
        {terminal.dias.map((d, i) => {
          // ⚠️ MENOS DE 10 SALIDAS: primeras y últimas se solapan; su unión son
          //    TODAS. No se fuerza 5+5 (sería repetir). Dedup por MINUTO.
          const pocas = d.expediciones <= 10;
          const union = [...new Map([...d.primeras, ...d.ultimas].map((s) => [s.minuto, s])).values()].sort(
            (a, b) => a.minuto - b.minuto,
          );
          return (
            <div
              key={d.tipo}
              className={`px-4 py-3 ${i > 0 ? 'border-t border-[var(--color-borde)]' : ''}`}
              data-papel="dia-terminal"
              data-tipo={d.tipo}
              data-expediciones={d.expediciones}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <p className="text-cuerpo font-bold leading-snug sin-recortar">{NOMBRE[d.tipo]}</p>
                <p className="shrink-0 text-nota text-[var(--color-tinta-tenue)] sin-recortar">
                  {d.expediciones} {d.expediciones === 1 ? 'salida' : 'salidas'}
                </p>
              </div>

              {pocas ? (
                <Fila etiqueta={d.expediciones === union.length ? 'Todas' : 'Salidas'} salidas={union} />
              ) : (
                <div className="flex flex-col gap-1">
                  <Fila etiqueta="Primeras" salidas={d.primeras} />
                  <Fila etiqueta="Últimas" salidas={d.ultimas} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ⭐ LA LEYENDA, UNA VEZ AL PIE, con FRASES FIJAS. No se calcula ninguna
          cabecera ni se nombra el punto: cero posibilidad de equivocarse. Solo los
          índices que aparecen en la tabla. */}
      {(hayNoViene || hayNoLlega) && (
        <ul className="mt-2 flex flex-col gap-0.5" data-papel="leyenda-parciales">
          {hayNoViene && (
            <li
              className="text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
              data-papel="leyenda-parcial"
              data-indice="1"
            >
              <span className="font-bold">1</span> · No viene desde principio de línea
            </li>
          )}
          {hayNoLlega && (
            <li
              className="text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
              data-papel="leyenda-parcial"
              data-indice="2"
            >
              <span className="font-bold">2</span> · No llega a final de línea
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
