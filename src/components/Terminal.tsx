import type { TerminalDeSentido, TipoDeDia } from '@/engine/topologia';

/**
 * ⭐ C5 · EL FUNCIONAMIENTO DE TERMINAL. Primeras y últimas salidas.
 *
 * ⚠️ ANTES DE PROMETERLO SE COMPROBÓ QUE EL DATO EXISTE, que era la condición que
 * puso Antonio. Existe: `stop_times.txt` (870.718 filas) + `trips.txt` +
 * `calendar_dates.txt`, horneado en el build. Ver `sources/gtfs-nap/terminal.ts`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ LAS HORAS DE MADRUGADA. AQUÍ SE MIENTE MUY FÁCIL.
 *
 * El GTFS escribe **`25:29:00`** para "la 1:29 de la madrugada del día siguiente".
 *
 *   · Pintarlo tal cual → "última salida: 25:29". Una hora que no existe.
 *   · Hacerle `% 24` a secas → "01:29". Correcto... y MENTIROSO: alguien iría a
 *     las 01:29 de HOY, doce horas antes de que salga ese autobús.
 *
 * ⇒ Se pinta **1:29** y se dice **"del día siguiente"**. Las dos cosas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y ESTO NO ES UN HORARIO. Es la PRIMERA y la ÚLTIMA salida de cabecera. No
 * decimos a qué hora pasa por tu parada, porque para eso habría que sumar el
 * tiempo de recorrido teórico — y el teórico es justo el que se equivoca cuando
 * hay tráfico, obras o un desvío. Lo que pasa por tu parada te lo dice la pantalla
 * de la parada, en vivo. Aquí solo decimos cuándo abre y cuándo cierra la línea.
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

/** Una salida, pintada. `1529` → "1:29" con marca "+1" si cruza medianoche. */
function Salida({ minuto }: { minuto: number }) {
  const r = reloj(minuto);
  return (
    <span
      className="tabular-nums"
      data-papel="salida"
      data-minuto={minuto}
      data-siguiente={r.siguiente ? 'si' : 'no'}
    >
      {r.hora}
      {/* ⚠️ SIN ESTO, "1:29" SIGNIFICARÍA DOCE HORAS ANTES. La marca +1 lo ata a
          la leyenda "del día siguiente" de abajo. */}
      {r.siguiente && (
        <sup className="ml-0.5 font-bold text-[var(--color-aviso)]" data-papel="marca-dia-siguiente">
          +1
        </sup>
      )}
    </span>
  );
}

/** Una fila de salidas (primeras / últimas / todas), separadas por puntos. */
function Fila({ etiqueta, salidas }: { etiqueta: string; salidas: readonly number[] }) {
  return (
    <div className="flex gap-2" data-papel="fila-salidas" data-etiqueta={etiqueta}>
      <span className="w-16 shrink-0 pt-0.5 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        {etiqueta}
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-menor font-black leading-snug sin-recortar">
        {salidas.map((m, i) => (
          <span key={i} className="inline-flex items-baseline">
            {i > 0 && <span className="mr-2 font-normal text-[var(--color-borde)]">·</span>}
            <Salida minuto={m} />
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

  return (
    <section className="mt-6" data-papel="terminal">
      <h2 className="text-menor font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        funcionamiento de terminal
      </h2>
      <p className="mb-2 text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
        Las <strong>primeras</strong> y <strong>últimas</strong> salidas{' '}
        <strong>desde la cabecera</strong> (del GTFS, no la hora a la que pasa por tu parada). Están
        para cotejarlas: si el horario real no cuadra, es que el dato oficial va por detrás.
      </p>

      <div className="overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
        {terminal.dias.map((d, i) => {
          // ⚠️ MENOS DE 10 SALIDAS: primeras y últimas se solapan; su unión son
          //    TODAS. No se fuerza 5+5 (sería repetir). Se dice cuántas hay.
          const pocas = d.expediciones <= 10;
          const todas = [...new Set([...d.primeras, ...d.ultimas])].sort((a, b) => a - b);
          const cruza = d.ultimas.some((m) => m >= 24 * 60);
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
                <Fila etiqueta={d.expediciones === todas.length ? 'Todas' : 'Salidas'} salidas={todas} />
              ) : (
                <div className="flex flex-col gap-1">
                  <Fila etiqueta="Primeras" salidas={d.primeras} />
                  <Fila etiqueta="Últimas" salidas={d.ultimas} />
                </div>
              )}

              {cruza && (
                <p
                  className="mt-1 text-micro font-bold uppercase tracking-wide text-[var(--color-aviso)]"
                  data-papel="dia-siguiente"
                >
                  <span className="not-italic">+1</span> · del día siguiente
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
