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
 * Una salida, pintada. La hora a secas, y un índice si no recorre la línea entera.
 *
 * ⚠️ EL ÍNDICE DEPENDE DE LA SECCIÓN, no solo del dato: en PRIMERAS solo cuenta el 1
 * (de dónde viene); en ÚLTIMAS solo el 2 (hasta dónde llega). Un servicio de noche
 * que da la vuelta EMPIEZA a mitad (noViene) pero eso no pinta nada en las últimas
 * —a quien mira las últimas le importa hasta dónde LLEGA—, así que ahí el 1 se calla.
 */
function Salida({ salida, mostrar1, mostrar2 }: { salida: SalidaDeTerminal; mostrar1: boolean; mostrar2: boolean }) {
  const r = reloj(salida.minuto);
  const uno = mostrar1 && salida.noViene;
  const dos = mostrar2 && salida.noLlega;
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
      {uno && (
        <sup className="ml-1 font-normal text-[var(--color-tinta-tenue)]" data-papel="indice-parcial" data-indice="1">
          1
        </sup>
      )}
      {dos && (
        <sup
          className={`font-normal text-[var(--color-tinta-tenue)] ${uno ? 'ml-0.5' : 'ml-1'}`}
          data-papel="indice-parcial"
          data-indice="2"
        >
          2
        </sup>
      )}
    </span>
  );
}

/**
 * Una fila de salidas. `mostrar1`/`mostrar2` dicen qué índices pinta esta sección:
 * primeras → solo el 1; últimas → solo el 2; "todas" (pocas salidas) → los dos.
 */
function Fila({
  etiqueta,
  salidas,
  mostrar1,
  mostrar2,
}: {
  etiqueta: string;
  salidas: readonly SalidaDeTerminal[];
  mostrar1: boolean;
  mostrar2: boolean;
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
            <Salida salida={s} mostrar1={mostrar1} mostrar2={mostrar2} />
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

  // ¿Qué índices hacen falta? SOLO los que de verdad se PINTAN (según la sección):
  //   · el 1 solo aparece en PRIMERAS (o en "todas", si son pocas salidas);
  //   · el 2 solo aparece en ÚLTIMAS  (o en "todas").
  // La leyenda va UNA vez al pie, solo con esos. La excepción, nunca el aparato fijo.
  const indicesDe = (d: TerminalDeSentido['dias'][number]) => {
    const pocas = d.expediciones <= 10;
    const union = [...d.primeras, ...d.ultimas];
    return {
      uno: pocas ? union.some((s) => s.noViene) : d.primeras.some((s) => s.noViene),
      dos: pocas ? union.some((s) => s.noLlega) : d.ultimas.some((s) => s.noLlega),
    };
  };
  const hay1 = terminal.dias.some((d) => indicesDe(d).uno);
  const hay2 = terminal.dias.some((d) => indicesDe(d).dos);

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
                // "Todas" no es primeras ni últimas: pinta los dos índices.
                <Fila
                  etiqueta={d.expediciones === union.length ? 'Todas' : 'Salidas'}
                  salidas={union}
                  mostrar1
                  mostrar2
                />
              ) : (
                <div className="flex flex-col gap-1">
                  <Fila etiqueta="Primeras" salidas={d.primeras} mostrar1 mostrar2={false} />
                  <Fila etiqueta="Últimas" salidas={d.ultimas} mostrar1={false} mostrar2 />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ⭐ LA LEYENDA, UNA VEZ AL PIE, con FRASES FIJAS. No se calcula ninguna
          cabecera ni se nombra el punto: cero posibilidad de equivocarse. Solo los
          índices que aparecen en la tabla. */}
      {(hay1 || hay2) && (
        <ul className="mt-2 flex flex-col gap-0.5" data-papel="leyenda-parciales">
          {hay1 && (
            <li
              className="text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
              data-papel="leyenda-parcial"
              data-indice="1"
            >
              <span className="font-bold">1</span> · No viene desde principio de línea
            </li>
          )}
          {hay2 && (
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
