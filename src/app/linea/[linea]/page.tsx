import Link from 'next/link';
import { notFound } from 'next/navigation';
import { idLinea, idParada, lineas, parada, paradaDelPoste, posteDe, sentidosDe, terminalDe } from '@/engine/topologia';
import { fingimientoDe, transporteDe } from '@/engine/fingir';
import { motor, contador } from '@/engine/motor';
import { desviosDeLinea, type Veredicto } from '@/engine/desvios';
import { Itinerario, type ParadaDelItinerario } from '@/components/Itinerario';
import { ChipLinea } from '@/components/ChipLinea';
import { Terminal } from '@/components/Terminal';
import type { Line, LineId, StopId } from '@/core';
import type { Fingimiento } from '@/engine/fingir';

export const dynamic = 'force-dynamic';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⛔⛔ A1 · AQUÍ SE PINTABA LA RUTA TEÓRICA. Y ERA EL FALLO MÁS GRAVE DEL PROYECTO.
 *
 * En /linea/35 salían las paradas de **Avenida Valencia**. Esa calle ESTÁ CORTADA.
 * ZetaBus le estaba diciendo a alguien que su autobús para en una calle por la que
 * el autobús no pasa. No petaba: PINTABA. Con toda la coherencia del mundo.
 *
 * ⚠️ Y LO PEOR: EL MOTOR YA SABÍA LA VERDAD DESDE LA TANDA 3.
 *
 * `desviosDeLinea` estaba escrito, medido y probado. `get_stops_list` devuelve el
 * recorrido REAL DE HOY, con el desvío aplicado. Se verificó. Se documentó.
 * **Y NUNCA SE ENCHUFÓ A LA PANTALLA.** 344 tests en verde, y ninguno miraba si
 * la pantalla usaba el motor.
 *
 * ⇒ Cuando la ruta real difiera del GTFS, MANDA LA REAL. Siempre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LO QUE ESTO CUESTA, DICHO EN VOZ ALTA (porque contradice a la Tanda 5B):
 *
 * Al aparcar el barrido prometí "CERO peticiones al abrir la vista de línea". Esto
 * son **2 peticiones** (una por sentido), cacheadas **30 minutos**.
 *
 * No es lo mismo, y la diferencia importa:
 *   · el barrido eran 67 peticiones y hasta 66 s de espera, POR PULSACIÓN
 *   · esto son 2, cacheadas media hora, y es lo que separa decir la verdad de
 *     mandar a alguien a esperar el autobús a una calle cortada
 *
 * Un desvío no se pone y se quita cada minuto: 30 minutos de caché es honesto.
 * Y con 44 líneas, el peor caso absoluto son 88 peticiones cada media hora — 2,9
 * por minuto, muy por debajo del techo de 4/s que prometemos.
 *
 * ⛔ Lo que NO se hace: pedirlo en `/api/...` sin que nadie mire, ni refrescarlo
 *    solo. Se pide al abrir la página, que es cuando alguien quiere saberlo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

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

  // ⭐ LA RUTA REAL. Dos peticiones, cacheadas 30 min. Ver la cabecera.
  const antes = contador.cuenta.peticiones;
  const desvios = await desviosDeLinea(id, motor(transporteDe(fingir), fingir));
  const peticiones = contador.cuenta.peticiones - antes;

  const veredicto: Veredicto | null =
    desvios.estado === 'ok'
      ? (desvios.datos.find((d) => d.directionId === activo.directionId)?.veredicto ?? null)
      : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <ChipLinea linea={l} papel="chip-cabecera" grande />
        <h1 className="text-[18px] font-black leading-tight sin-recortar">{l.longName}</h1>
      </div>

      {sentidos.length > 1 && (
        <nav className="mt-4 flex gap-2" aria-label="Sentido">
          {sentidos.map((s) => {
            const esActivo = s.directionId === activo.directionId;
            return (
              <Link
                key={s.directionId}
                href={`/linea/${encodeURIComponent(l.shortName)}?sentido=${s.directionId}${fingir ? `&fingir=${fingir}` : ''}`}
                aria-current={esActivo ? 'true' : undefined}
                className={`flex-1 rounded-xl border px-3 py-2 text-center text-[13px] font-bold leading-snug sin-recortar ${
                  esActivo
                    ? 'border-2 border-[var(--color-tinta)] bg-[var(--color-papel)]'
                    : 'border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-tinta-tenue)]'
                }`}
              >
                {/* El sentido activo se marca con BORDE GRUESO, no con color: el
                    color ya está ocupado por la identidad de la línea. */}
                {s.headsign}
              </Link>
            );
          })}
        </nav>
      )}

      <Recorrido
        sentido={activo}
        linea={l}
        lineaId={id}
        fingir={fingir}
        veredicto={veredicto}
        peticiones={peticiones}
      />

      {/* ⭐ C5 · CUÁNDO ABRE Y CUÁNDO CIERRA LA LÍNEA. Del GTFS, horneado. */}
      <Terminal terminal={terminalDe(id, activo.directionId)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Recorrido({
  sentido, linea, lineaId, fingir, veredicto, peticiones,
}: {
  sentido: ReturnType<typeof sentidosDe>[number];
  linea: Line;
  lineaId: LineId;
  fingir: Fingimiento | null;
  veredicto: Veredicto | null;
  peticiones: number;
}) {
  // ── LA RUTA OFICIAL (GTFS). Es el plan B, y se dice cuando se usa. ─────────
  const oficial: ParadaDelItinerario[] = [];
  for (const sid of sentido.official.stops) {
    const poste = posteDe(idParada(sid));
    const p = parada(idParada(sid));
    if (poste !== null && p) oficial.push({ poste, nombre: p.name, sid: idParada(sid) });
  }

  // ── ⭐ LA RUTA REAL. MANDA SIEMPRE QUE SE PUEDA LEER. ──────────────────────
  const hayReal = veredicto?.tipo === 'comparado';
  const desviada = hayReal && veredicto.hayDesvio;

  const enOficial = new Set(oficial.map((p) => p.poste));
  const aPintar: readonly ParadaDelItinerario[] = hayReal
    ? veredicto.real.map((p) => {
        // ⚠️ El nombre viene de AVANZA (`get_stops_list`), no del GTFS: una parada
        //    provisional puede no estar en nuestra topología y hay que poder
        //    escribirla igual. El `sid` sí se busca, porque es lo que da los
        //    transbordos — y si no lo encontramos, se pinta sin ellos y ya.
        const sid: StopId | null = paradaDelPoste(p.poste);
        return {
          poste: p.poste,
          nombre: sid ? (parada(sid)?.name ?? p.nombre) : p.nombre,
          sid,
          provisional: !enOficial.has(p.poste),
        };
      })
    : oficial;

  const sinGeometria = sentido.official.geometry.length === 0;

  return (
    <div className="mt-4">
      {/* ⭐⭐ EL AVISO DE DESVÍO. Y es DERIVADO: se auto-apaga cuando restauren. */}
      {desviada && (
        <div
          className="mb-3 rounded-xl border-2 border-[var(--color-aviso)] bg-[var(--color-papel)] px-3 py-2.5"
          data-papel="hay-desvio"
          role="status"
        >
          <p className="text-[14px] font-black leading-snug text-[var(--color-aviso)] sin-recortar">
            ⚠ Esta línea está DESVIADA hoy
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
            Lo que ves abajo es <strong>el recorrido que el autobús hace hoy</strong>, no el oficial.
            Sale de comparar el GTFS del Ministerio con la ruta que publica Avanza para esta jornada.
            {veredicto.fuera.length > 0 && (
              <>
                {' '}
                <strong>
                  {veredicto.fuera.length}{' '}
                  {veredicto.fuera.length === 1 ? 'parada ha caído' : 'paradas han caído'}
                </strong>{' '}
                del recorrido.
              </>
            )}
            {veredicto.hacia.length > 0 && (
              <>
                {' '}
                Hay{' '}
                <strong>
                  {veredicto.hacia.length}{' '}
                  {veredicto.hacia.length === 1 ? 'parada provisional' : 'paradas provisionales'}
                </strong>
                .
              </>
            )}
          </p>
        </div>
      )}

      {/* ⚠️ NO SE PUDO LEER LA RUTA DE HOY. Y "no lo sé" NO ES "no hay desvío".
          Se pinta la oficial —es lo único que tenemos— pero se DICE que puede
          estar desactualizada. Callarlo sería exactamente el fallo que venimos
          a matar, solo que con una excusa. */}
      {veredicto?.tipo === 'indeterminado' && (
        <div
          className="mb-3 es-sin-verificar px-3 py-2.5"
          data-papel="desvio-indeterminado"
          role="status"
        >
          <p className="text-[13px] font-bold leading-snug not-italic sin-recortar">
            No hemos podido comprobar si esta línea está desviada
          </p>
          <p className="mt-1 text-[11px] leading-snug not-italic text-[var(--color-tinta-suave)] sin-recortar">
            Abajo va <strong>el recorrido oficial</strong>. Si hoy hay un desvío,{' '}
            <strong>no lo sabemos</strong> — y eso no es lo mismo que decir que no lo hay.
            ({veredicto.motivo})
          </p>
        </div>
      )}

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

      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
          el recorrido · {aPintar.length} paradas
        </h2>
        <span
          className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]"
          data-papel="origen-recorrido"
          data-real={hayReal ? 'si' : 'no'}
        >
          {hayReal ? 'la ruta de HOY, según Avanza' : 'ruta oficial (GTFS)'}
        </span>
      </div>
      {/* ⭐ C5 · FUERA LA LEYENDA DE LOS CUADRADITOS. Decía: "Los cuadraditos de
          colores son los transbordos... Los oscuros son las nocturnas." Si un sistema
          visual necesita un rótulo que lo explique, el sistema visual no funciona: la
          referencia NO lo tiene y se entiende igual. GEOMETRÍA, NO RÓTULOS. Y de paso
          ese texto se solapaba con la cabecera. El chip de transbordo YA se entiende:
          es el número de una línea, en su color; el búho, invertido sobre azul noche.
          Quien no ve formas lo tiene en el `aria-label` de cada chip ("Ver el recorrido
          de la línea N1, nocturna"). */}

      <Itinerario
        lineaId={lineaId}
        linea={linea}
        paradas={aPintar}
        fingir={fingir}
        fuera={hayReal ? veredicto.fuera : undefined}
      />

      {/* ⚠️ LO QUE NO PODEMOS SABER, DICHO SIN ADJUDICAR NADA. Ver `desvios.ts`:
          un desvío de RUTA es detectable; una SUPRESIÓN de parada NO lo es por
          ninguna fuente, y está comprobado (con el comunicado de Avanza diciendo
          por escrito que la parada estaba suprimida, su propia API seguía
          anunciando autobuses en ella). */}
      <p
        className="mt-3 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
        data-papel="no-detectamos-supresiones"
      >
        ⚠ <strong>Una parada puede estar suprimida sin que se note aquí.</strong> Si el autobús pasa
        por la calle pero no para, su recorrido no cambia y{' '}
        <strong>ninguna fuente lo publica</strong>: lo ponen en un cartel en la marquesina. Si ves
        un aviso pegado en el poste, hazle caso a él.{' '}
        <span data-papel="coste-peticiones">
          ({peticiones} {peticiones === 1 ? 'petición' : 'peticiones'} a Avanza para saber la ruta de
          hoy; se guarda 30 minutos.)
        </span>
      </p>
    </div>
  );
}
