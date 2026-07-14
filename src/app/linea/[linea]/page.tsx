import Link from 'next/link';
import { notFound } from 'next/navigation';
import { idLinea, lineas, sentidosDe } from '@/engine/topologia';
import { fingimientoDe } from '@/engine/fingir';
import { Itinerario } from '@/components/Itinerario';
import { BuscarBuses } from '@/components/BuscarBuses';
import type { Line, LineId } from '@/core';
import type { Fingimiento } from '@/engine/fingir';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ linea: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LineaPage({ params, searchParams }: Props) {
  const { linea: etiqueta } = await params;
  const sp = await searchParams;
  const l = lineas().find((x) => x.shortName.toLowerCase() === decodeURIComponent(etiqueta).toLowerCase());
  if (!l) notFound();

  const id = idLinea(String(l.id));
  const sentidos = sentidosDe(id);
  const pedido = Array.isArray(sp.sentido) ? sp.sentido[0] : sp.sentido;
  const activo = sentidos.find((s) => String(s.directionId) === pedido) ?? sentidos[0];
  const fingir = fingimientoDe(sp);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[16px] font-black"
          style={{ backgroundColor: l.color, color: l.textColor }}
          aria-hidden="true"
        >
          {l.shortName}
        </span>
        <h1 className="text-[18px] font-black leading-tight sin-recortar">{l.longName}</h1>
      </div>

      {/* ⭐ EL BARRIDO, BAJO DEMANDA. CERO PETICIONES AL ABRIR ESTA PÁGINA.
          Antes había aquí un <Suspense> con un barrido automático: 18 peticiones a
          Avanza que nadie había pedido, cada vez que alguien abría la línea solo
          para mirar el recorrido. El repositorio promete en público no abusar, y
          eso no se podía defender. Ahora solo se barre si se PULSA. */}
      <BuscarBuses linea={l.shortName} fingir={fingir} />

      {/* Sentido: dos pestañas. Y el enlace lleva el sentido DENTRO, para que se
          pueda compartir. (La referencia leía `?sentido=` y no lo generaba nunca:
          no se podía enlazar al sentido 2.) */}
      {sentidos.length > 1 && (
        <nav className="mt-5 flex gap-2" aria-label="Sentido">
          {sentidos.map((s) => {
            const esActivo = s.directionId === activo.directionId;
            return (
              <Link
                key={s.directionId}
                href={`/linea/${encodeURIComponent(l.shortName)}?sentido=${s.directionId}`}
                aria-current={esActivo ? 'true' : undefined}
                className={`flex-1 rounded-xl border px-3 py-2 text-center text-[13px] font-bold leading-snug sin-recortar ${
                  esActivo
                    ? 'border-[var(--color-tinta)] border-2 bg-[var(--color-papel)]'
                    : 'border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-tinta-tenue)]'
                }`}
              >
                {/* El sentido activo se marca con BORDE GRUESO, no con color:
                    el color ya está ocupado por la identidad de la línea. */}
                {s.headsign}
              </Link>
            );
          })}
        </nav>
      )}

      <Paradas sentido={activo} linea={l} lineaId={id} fingir={fingir} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Paradas({
  sentido,
  linea,
  lineaId,
  fingir,
}: {
  sentido: ReturnType<typeof sentidosDe>[number];
  linea: Line;
  lineaId: LineId;
  fingir: Fingimiento | null;
}) {
  const sinGeometria = sentido.official.geometry.length === 0;

  return (
    <div className="mt-4">
      {/* ⚠️ Ci3 y Ci4 NO tienen trazado publicado. Se ETIQUETA, no se finge. */}
      {sinGeometria && (
        <p
          className="mb-3 rounded-xl border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="sin-geometria"
        >
          ⚠ Esta línea NO tiene trazado publicado en el GTFS oficial. Podemos decirte sus paradas y
          sus autobuses, pero no dibujar por dónde va. No nos lo inventamos.
        </p>
      )}

      <h2 className="mb-1 text-[13px] font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        el recorrido · {sentido.official.stops.length} paradas
      </h2>
      <p className="mb-2 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
        Los cuadraditos de colores son <strong>los transbordos</strong>: las otras líneas que pasan
        por esa misma parada.
      </p>

      {/* ⭐ EL ITINERARIO VERTICAL. Clonado de la referencia, con sus nodos y sus
          chips de transbordo. Lo nuestro (una lista plana de nombres) era peor. */}
      <Itinerario
        lineaId={lineaId}
        linea={linea}
        paradas={sentido.official.stops}
        fingir={fingir}
      />
    </div>
  );
}
