import type { HorarioWeb, SalidaWeb } from '@/sources/avanza/horario';

/**
 * ⭐ PRIMERAS Y ÚLTIMAS SALIDAS DE HOY. La tabla PELADA, tal y como la publica
 * Avanza en su web: hora · desde · hasta. Sin marcas, sin índices, sin asteriscos.
 *
 * ⚠️ Se JUBILÓ todo el aparato anterior (índices 1/2 "no viene / no llega",
 * asterisco, terminal dinámico, cabecera modal, cálculo de parciales sobre el
 * GTFS). El motor que DERIVABA esas rarezas está aparcado (`docs/MOTOR-HORARIOS.md`):
 * en su lugar mostramos la tabla que Avanza ya da hecha, day-true, y —si la trae—
 * su "Información adicional" como CITA LITERAL. Que lo cuente la fuente, no nosotros.
 *
 * ⚠️ NO ES UN HORARIO DE PASO por tu parada: son la primera y la última salida.
 */

function Fila({ salida }: { salida: SalidaWeb }) {
  return (
    <tr data-papel="salida">
      <td className="py-0.5 pr-3 font-black tabular-nums">{salida.hora}</td>
      <td className="py-0.5 pr-3 text-[var(--color-tinta-suave)] sin-recortar">{salida.desde}</td>
      <td className="py-0.5 text-[var(--color-tinta-suave)] sin-recortar">{salida.hasta}</td>
    </tr>
  );
}

function Tabla({ etiqueta, salidas }: { etiqueta: string; salidas: readonly SalidaWeb[] }) {
  if (salidas.length === 0) return null;
  return (
    <div className="px-4 py-3" data-papel="tabla-salidas" data-etiqueta={etiqueta}>
      <p className="mb-1.5 text-cuerpo font-bold leading-snug sin-recortar">{etiqueta}</p>
      <table className="w-full border-collapse text-menor leading-snug">
        <thead>
          <tr className="text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            <th className="pb-1 pr-3 text-left font-bold">Hora</th>
            <th className="pb-1 pr-3 text-left font-bold">Desde</th>
            <th className="pb-1 text-left font-bold">Hasta</th>
          </tr>
        </thead>
        <tbody>
          {salidas.map((s, i) => (
            <Fila key={i} salida={s} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Terminal({ horario }: { horario: HorarioWeb | null }) {
  // ⚠️ Si no hay dato (no se pudo leer, o la línea no circula), no se pinta nada.
  //    Una tabla vacía con guiones parece un fallo; no ponerla, no.
  if (!horario) return null;
  const hayTabla = horario.primeras.length > 0 || horario.ultimas.length > 0;
  if (!hayTabla && !horario.info) return null;

  return (
    <section className="mt-6" data-papel="terminal">
      <h2 className="text-menor font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        funcionamiento de terminal
      </h2>
      <p className="mb-2 text-nota leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
        Las <strong>primeras</strong> y <strong>últimas</strong> salidas de hoy, tal y como las publica
        Avanza. No es la hora a la que pasa por tu parada.
      </p>

      {hayTabla && (
        <div className="divide-y divide-[var(--color-borde)] overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
          <Tabla etiqueta="Primeras salidas" salidas={horario.primeras} />
          <Tabla etiqueta="Últimas salidas" salidas={horario.ultimas} />
        </div>
      )}

      {/* ⭐ "Información adicional": CITA LITERAL de Avanza. Condicional —solo si la
          línea la trae—. El motor no razona sobre el texto: lo enseña y ya. */}
      {horario.info && (
        <aside
          className="mt-3 rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)] px-4 py-3"
          data-papel="info-adicional"
        >
          <p className="mb-1 text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            Información adicional · según Avanza
          </p>
          {horario.info.split('\n').map((parrafo, i) => (
            <p key={i} className="text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar [&:not(:first-of-type)]:mt-1">
              {parrafo}
            </p>
          ))}
        </aside>
      )}
    </section>
  );
}
