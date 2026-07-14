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

export function Terminal({ terminal }: { terminal: TerminalDeSentido | null }) {
  // ⚠️ Si el feed no da horario para este sentido, NO SE INVENTA: no se pinta nada.
  //    Una tabla vacía con guiones parece un fallo; no ponerla, no.
  if (!terminal || terminal.dias.length === 0) return null;

  return (
    <section className="mt-6" data-papel="terminal">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        funcionamiento de terminal
      </h2>
      <p className="mb-2 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
        Cuándo sale el <strong>primer</strong> y el <strong>último</strong> autobús{' '}
        <strong>desde la cabecera</strong>. No es la hora a la que pasa por tu parada.
      </p>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-borde)] bg-[var(--color-papel)]">
        {terminal.dias.map((d, i) => {
          const p = reloj(d.primera);
          const u = reloj(d.ultima);
          return (
            <div
              key={d.tipo}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[var(--color-borde)]' : ''}`}
              data-papel="dia-terminal"
              data-tipo={d.tipo}
            >
              <div className="min-w-0">
                <p className="text-[14px] font-bold leading-snug sin-recortar">{NOMBRE[d.tipo]}</p>
                <p className="text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
                  {d.expediciones} salidas
                </p>
              </div>
              <p className="shrink-0 text-right text-[15px] font-black tabular-nums leading-snug sin-recortar">
                <span data-papel="primera">{p.hora}</span>
                <span className="mx-1 font-normal text-[var(--color-tinta-tenue)]">→</span>
                <span data-papel="ultima">{u.hora}</span>
                {/* ⚠️ SIN ESTO, "1:29" SIGNIFICARÍA DOCE HORAS ANTES. */}
                {u.siguiente && (
                  <span
                    className="ml-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-aviso)]"
                    data-papel="dia-siguiente"
                  >
                    del día siguiente
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
