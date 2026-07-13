import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { barrerLinea } from '@/engine/barrido';
import { motor } from '@/engine/motor';
import { idLinea, lineas, sentidosDe } from '@/engine/topologia';
import { fingimientoDe, transporteDe } from '@/engine/fingir';
import { Itinerario } from '@/components/Itinerario';
import { AvisosDelBarrido } from '@/components/AvisosDelBarrido';
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

      {/* ⭐ EL RECUENTO. Es lo primero, y es el producto.
          Va en <Suspense> porque barrer una línea son 18-31 peticiones: sin esto,
          la página entera esperaría y el usuario vería una pantalla en blanco.
          ⚠️ Y el fallback DICE que está contando. NUNCA se pinta el estado bueno
             por defecto mientras se comprueba: eso fabrica un silencio falso. */}
      <Suspense fallback={<ContandoTodavia linea={l.shortName} />}>
        <Recuento id={id} etiqueta={l.shortName} fingir={fingir} />
      </Suspense>

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

function ContandoTodavia({ linea }: { linea: string }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-4"
      data-papel="contando"
      role="status"
    >
      <p className="text-[14px] font-bold leading-snug sin-recortar">
        Contando los autobuses de la línea {linea}…
      </p>
      <p className="mt-1 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
        Estamos preguntando poste a poste. Tarda unos segundos.
      </p>
    </div>
  );
}

/**
 * ⭐ EL RECUENTO. LA L2, EN PANTALLA.
 *
 *   "De los 11 autobuses que vemos ahora en la línea 35, los 11 son articulados."
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ES UN RECUENTO, NO UNA DECLARACIÓN. Y por eso:
 *
 *   · No necesita permiso de nadie. No hay que citar ningún contrato.
 *   · No miente en domingo. (La 35 pasa de 15 articulados a 2 en festivo. Una
 *     frase declarativa —"la 35 lleva articulados"— sería falsa ese día. Un
 *     recuento, no: cuenta los que hay.)
 *   · No caduca. Se vuelve a contar cada vez.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y AQUÍ ESTÁ LA TRAMPA QUE CASI ME COMO, Y QUE ES LA MÁS FEA DE TODAS:
 *
 * Si de 11 autobuses detectados conozco la ficha de 9, **NO PUEDO DECIR "los 11
 * son articulados"**. Podría decir "los 9 que conozco son articulados", pero si
 * digo "los 11", estoy afirmando algo sobre 2 vehículos de los que NO SÉ NADA.
 *
 * Sería exactamente el pecado del proyecto viejo con otra cara: rellenar el
 * hueco con lo que parece razonable. Y el hueco no es raro: el registro oficial
 * cubre el 87% de lo que circula.
 *
 * ⇒ El denominador del recuento son LOS QUE TIENEN FICHA. Y los que no la
 *   tienen SE DICEN, en la misma frase, para que nadie los confunda con ceros.
 */
async function Recuento({ id, etiqueta, fingir }: { id: LineId; etiqueta: string; fingir: Fingimiento | null }) {
  const r = await barrerLinea(id, motor(transporteDe(fingir), fingir));

  if (r.estado !== 'ok') {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-4"
        data-papel="recuento-fallido"
        role="status"
      >
        <p className="text-[14px] font-bold leading-snug sin-recortar">
          No hemos podido contar los autobuses de la línea {etiqueta}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
          {r.motivo}
          {' '}
          <strong>Esto NO significa que no haya autobuses: significa que no lo sabemos.</strong>
        </p>
      </div>
    );
  }

  const buses = r.datos.detectados;
  const total = buses.length;
  const conFicha = buses.filter((b) => b.perfil !== null);
  const sinFicha = total - conFicha.length;
  const articulados = conFicha.filter((b) => b.perfil!.busClass === 'articulado').length;

  return (
    <div
      className={`rounded-2xl border-2 border-[var(--color-tinta)] bg-[var(--color-papel)] p-4 ${r.edadSegundos >= 45 ? 'es-rancio' : ''}`}
      data-papel="recuento"
      data-total={total}
      data-con-ficha={conFicha.length}
      data-articulados={articulados}
    >
      {total === 0 ? (
        <p className="text-[15px] font-bold leading-snug sin-recortar">
          Ahora mismo no detectamos ningún autobús en la línea {etiqueta}.
        </p>
      ) : (
        <>
          <p className="text-[17px] font-black leading-snug sin-recortar" data-papel="recuento-titular">
            {/* ⚠️ "DETECTAMOS", no "circulan". La API da los autobuses que SE
                ACERCAN a una parada: uno que vaya entre dos paradas lejanas
                existe y puede no salir. Decir "todos" sería mentir. */}
            Detectamos {total} {total === 1 ? 'autobús' : 'autobuses'} en la línea {etiqueta} ahora mismo.
          </p>

          {conFicha.length > 0 && (
            <p className="mt-2 text-[15px] font-bold leading-snug sin-recortar" data-papel="recuento-articulados">
              {articulados === conFicha.length && conFicha.length > 1
                ? `Los ${conFicha.length} de los que conocemos la ficha son ARTICULADOS.`
                : articulados === 0
                  ? `Ninguno de los ${conFicha.length} de los que conocemos la ficha es articulado.`
                  : `${articulados} de los ${conFicha.length} de los que conocemos la ficha son articulados.`}
            </p>
          )}

          {/* ⭐ LOS QUE NO SABEMOS. En la MISMA frase, no en una nota al pie. */}
          {sinFicha > 0 && (
            <p
              className="mt-2 text-[13px] font-semibold leading-snug text-[var(--color-aviso)] sin-recortar"
              data-papel="recuento-sin-ficha"
            >
              ⚠ De {sinFicha === 1 ? 'otro autobús' : `otros ${sinFicha}`} NO TENEMOS DATOS: no
              {sinFicha === 1 ? ' está' : ' están'} en el registro oficial. No {sinFicha === 1 ? 'lo contamos' : 'los contamos'}
              {' '}ni a favor ni en contra.
            </p>
          )}
        </>
      )}

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
        Contado ahora, no declarado. {r.datos.postesLeidos} de {r.datos.postesConsultados} postes
        leídos (la línea tiene {r.datos.postesDeLaLinea}). Dato de hace {r.edadSegundos} s.
      </p>

      {/* ⚠️ EL AVISO NO PUEDE GRITAR MÁS QUE EL DATO. Ver AvisosDelBarrido. */}
      <AvisosDelBarrido
        avisos={r.datos.avisos}
        postesConsultados={r.datos.postesConsultados}
        postesFallidos={r.datos.postesFallidos}
        postesRancios={r.datos.postesRancios}
      />
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
