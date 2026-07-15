import type { SalidaDeTerminal, TerminalDeSentido, TipoDeDia } from '@/engine/topologia';

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
 * ⇒ Se pinta **1:29** con un superíndice **⁺¹**. Con "0:31" ya se entiende que es
 *   de madrugada; el ⁺¹ mantiene el orden claro sin una línea que lo explique.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ Y NO TODA SALIDA ARRANCA EN LA CABECERA. Las de refuerzo empiezan a mitad de
 * línea (la 35, en "Coso n.º 126"). Se marcan con un ÍNDICE numérico ¹ ² … que
 * remite a la leyenda del día ("1 · salidas desde Coso n.º 126"). Un número por
 * cada origen distinto. La cabecera va sin marca: se enseña la excepción.
 *
 * ⚠️ Y ESTO NO ES UN HORARIO. Es la PRIMERA y la ÚLTIMA salida. No decimos a qué
 * hora pasa por tu parada, porque para eso habría que sumar el tiempo de recorrido
 * teórico — y el teórico es justo el que se equivoca cuando hay tráfico, obras o un
 * desvío. Lo que pasa por tu parada te lo dice la pantalla de la parada, en vivo.
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
 * Una salida, pintada. `1529` → "1:29" con ⁺¹ si cruza medianoche, y un índice
 * numérico si arranca a mitad de línea (remite a la leyenda del día).
 */
function Salida({ salida, numeroOrigen }: { salida: SalidaDeTerminal; numeroOrigen: number | null }) {
  const r = reloj(salida.minuto);
  return (
    <span
      className="tabular-nums"
      data-papel="salida"
      data-minuto={salida.minuto}
      data-siguiente={r.siguiente ? 'si' : 'no'}
      data-origen={salida.origen ?? undefined}
      data-indice={numeroOrigen ?? undefined}
    >
      {r.hora}
      {/* ⚠️ La ⁺¹ (madrugada) va en ÁMBAR y CON "+": así no se confunde con el
          índice de origen, que es un dígito gris y sin "+". Son distintos. */}
      {r.siguiente && (
        <sup className="ml-0.5 font-bold text-[var(--color-aviso)]" data-papel="marca-dia-siguiente">
          +1
        </sup>
      )}
      {/* ⭐ EL ÍNDICE DE ORIGEN: un dígito pequeño que remite a la leyenda de abajo.
          Solo en las parciales. Nombre a números: una fila no se ensucia repitiendo
          "desde Coso n.º 126" cinco veces. */}
      {numeroOrigen !== null && (
        <sup className="ml-0.5 text-[var(--color-tinta-tenue)]" data-papel="indice-origen">
          {numeroOrigen}
        </sup>
      )}
    </span>
  );
}

/** Una fila de salidas (primeras / últimas / todas), separadas por puntos. */
function Fila({
  etiqueta,
  salidas,
  indice,
}: {
  etiqueta: string;
  salidas: readonly SalidaDeTerminal[];
  indice: ReadonlyMap<string, number>;
}) {
  return (
    <div className="flex gap-2" data-papel="fila-salidas" data-etiqueta={etiqueta}>
      <span className="w-16 shrink-0 pt-0.5 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        {etiqueta}
      </span>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-menor font-black leading-snug sin-recortar">
        {salidas.map((s, i) => (
          <span key={i} className="inline-flex items-baseline">
            {i > 0 && <span className="mr-2 font-normal text-[var(--color-borde)]">·</span>}
            <Salida salida={s} numeroOrigen={s.origen ? (indice.get(s.origen) ?? null) : null} />
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
        Las <strong>primeras</strong> y <strong>últimas</strong> salidas (del GTFS, no la hora a la
        que pasa por tu parada). Están para cotejarlas: si el horario real no cuadra, es que el dato
        oficial va por detrás.
      </p>

      <div className="overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
        {terminal.dias.map((d, i) => {
          // ⚠️ MENOS DE 10 SALIDAS: primeras y últimas se solapan; su unión son
          //    TODAS. No se fuerza 5+5 (sería repetir). Se dice cuántas hay.
          //    Dedup por MINUTO (una salida se identifica por su hora GTFS).
          const pocas = d.expediciones <= 10;
          const todas = [...new Map([...d.primeras, ...d.ultimas].map((s) => [s.minuto, s])).values()].sort(
            (a, b) => a.minuto - b.minuto,
          );

          // ⭐ LOS ORÍGENES PARCIALES QUE APARECEN EN ESTA TABLA, numerados por
          //    primera aparición (por minuto). Solo los que salen de verdad: la
          //    leyenda es la excepción, nunca un aparato fijo. Un sentido sin
          //    parciales no tiene ni número ni leyenda.
          const mostradas = pocas ? todas : [...d.primeras, ...d.ultimas];
          const origenes: string[] = [];
          for (const s of [...mostradas].sort((a, b) => a.minuto - b.minuto)) {
            if (s.origen && !origenes.includes(s.origen)) origenes.push(s.origen);
          }
          const indice = new Map(origenes.map((o, n) => [o, n + 1]));

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
                <Fila
                  etiqueta={d.expediciones === todas.length ? 'Todas' : 'Salidas'}
                  salidas={todas}
                  indice={indice}
                />
              ) : (
                <div className="flex flex-col gap-1">
                  <Fila etiqueta="Primeras" salidas={d.primeras} indice={indice} />
                  <Fila etiqueta="Últimas" salidas={d.ultimas} indice={indice} />
                </div>
              )}

              {/* ⭐ LA LEYENDA DE ORÍGENES, solo con los números que aparecen arriba. */}
              {origenes.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-0.5" data-papel="leyenda-origenes">
                  {origenes.map((o) => (
                    <li
                      key={o}
                      className="text-micro leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
                      data-papel="leyenda-origen"
                      data-indice={indice.get(o)}
                    >
                      <span className="font-bold">{indice.get(o)}</span> · salidas desde {o}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
