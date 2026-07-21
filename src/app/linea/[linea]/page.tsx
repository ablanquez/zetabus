import Link from 'next/link';
import { notFound } from 'next/navigation';
import { esBuho, idLinea, idParada, lineas, parada, paradaDelPoste, posteDe, sentidosDe, sentidosParaRumbo } from '@/engine/topologia';
import { destinoDeSentido, rumboDe, type Rumbo } from '@/engine/rumbo';
import { fingimientoDe, transporteDe } from '@/engine/fingir';
import { motor, motorHorario } from '@/engine/motor';
import { desviosDeLinea, type Veredicto } from '@/engine/desvios';
import { horarioDeLinea } from '@/engine/horario';
import { Itinerario, type ParadaDelItinerario } from '@/components/Itinerario';
import { AvisoDesvio } from '@/components/AvisoDesvio';
import { ChipLinea } from '@/components/ChipLinea';
import { Cita } from '@/components/Cita';
import { Toponimo } from '@/components/Toponimo';
import { Terminal } from '@/components/Terminal';
import { Fingiendo } from '@/components/Fingiendo';
import { AcuseDeToque } from '@/components/AcuseDeToque';
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

  // ⭐ EL RUMBO. Qué origen y qué destino se pintan arriba, según el sentido
  //    activo. Un bucle NO tiene flecha (mentiría). Ver `engine/rumbo.ts`.
  const rumboSents = sentidosParaRumbo(id);
  const activoRumbo = rumboSents.find((s) => s.directionId === activo.directionId);
  const rumbo: Rumbo = activoRumbo
    ? rumboDe(activoRumbo, rumboSents, { esBuho: esBuho(l), nombreLargo: l.longName })
    : { tipo: 'nombre', texto: l.longName };
  const etiquetaSentido = (dir: 0 | 1): string => {
    const s = rumboSents.find((x) => x.directionId === dir);
    return s ? destinoDeSentido(s, rumboSents) : '';
  };

  // ⭐ LA RUTA REAL. Dos peticiones, cacheadas 30 min. Ver la cabecera.
  const desvios = await desviosDeLinea(id, motor(transporteDe(fingir), fingir));

  const veredicto: Veredicto | null =
    desvios.estado === 'ok'
      ? (desvios.datos.find((d) => d.directionId === activo.directionId)?.veredicto ?? null)
      : null;

  // ⭐ LA TABLA DE HORARIOS DE HOY, de la web de Avanza. Una petición más, pero
  //    cacheada UN DÍA (el horario no es el vivo). La clave lleva la fecha para
  //    renovarse al cambiar de día. Ver `engine/horario.ts`.
  const hoy = new Date().toISOString().slice(0, 10);
  const horario = await horarioDeLinea(l.shortName, activo.directionId, hoy, motorHorario(transporteDe(fingir), fingir));

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        {/* ⭐ LA FLECHA DE VUELTA A LA HOME, a la izquierda del chip. La vista de línea
            no tenía ninguna; ahora sí, y es la simétrica de la de parada. Objetivo
            táctil 44 px (`--control`), y su `aria-label` dice A DÓNDE va. */}
        <Link
          href="/"
          data-papel="volver"
          aria-label="Volver al inicio"
          className="-ml-1.5 inline-flex h-[var(--control)] w-[var(--control)] shrink-0 items-center justify-center text-dato leading-none text-[var(--color-tinta-suave)]"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <ChipLinea linea={l} papel="chip-cabecera" grande />
        {/* ⭐ EL TÍTULO DICE EL RUMBO, no un rango. Una FLECHA para ida y vuelta
            ("Seminario → Parque Goya"); "Circular por ..." para un bucle; y su
            nombre para un búho que da la vuelta. Cambia con el sentido activo. */}
        <h1
          className="text-titulo font-black leading-tight sin-recortar"
          data-papel="titulo-linea"
          aria-label={
            rumbo.tipo === 'trayecto'
              ? `${rumbo.origen} hacia ${rumbo.destino}`
              : rumbo.tipo === 'circular'
                ? `Circular por ${rumbo.por}`
                : rumbo.texto
          }
        >
          {/* Origen/destino son DESTINOS corregidos (ucwords del GTFS arreglado) →
              <Toponimo> (protege del traductor sin decir "verbatim"). La flecha es
              nuestra. El "por" del circular y el nombre largo SÍ son verbatim → <Cita>. */}
          {rumbo.tipo === 'trayecto' ? (
            <>
              <Toponimo>{rumbo.origen}</Toponimo>{' '}
              <span
                aria-hidden
                className="font-normal text-[var(--color-tinta-tenue)]"
                data-papel="flecha-rumbo"
              >
                →
              </span>{' '}
              <Toponimo>{rumbo.destino}</Toponimo>
            </>
          ) : rumbo.tipo === 'circular' ? (
            <>Circular por <Cita>{rumbo.por}</Cita></>
          ) : (
            <Cita>{rumbo.texto}</Cita>
          )}
        </h1>
      </div>

      {/* ⚠️ /linea ACEPTA `?fingir=` Y NO LO DECÍA. Mientras existió la banda roja
          del layout el agujero quedaba tapado por accidente —la banda salía en todas
          las páginas—, pero tapado por algo que además mentía. Al quitarla, esta
          pantalla se habría quedado fingiendo EN SILENCIO, que es peor que el
          problema original. Va en el mismo commit, no en el siguiente. */}
      <Fingiendo que={fingir} />

      {sentidos.length > 1 && (
        <nav className="mt-4 flex gap-2" aria-label="Sentido">
          {sentidos.map((s) => {
            const esActivo = s.directionId === activo.directionId;
            return (
              <Link
                key={s.directionId}
                href={`/linea/${encodeURIComponent(l.shortName)}?sentido=${s.directionId}${fingir ? `&fingir=${fingir}` : ''}`}
                aria-current={esActivo ? 'true' : undefined}
                data-papel="sentido"
                data-acusa="si"
                data-activo={esActivo ? 'si' : 'no'}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-tarjeta border px-3 py-2 text-center text-menor leading-snug sin-recortar ${
                  esActivo
                    ? 'border-transparent bg-[var(--color-tinta)] font-black text-[var(--color-papel)]'
                    : 'border-[var(--color-borde)] bg-[var(--color-papel)] font-bold text-[var(--color-tinta-tenue)]'
                }`}
              >
                {/* Se queda marcado tras soltar, hasta que carga el otro sentido. */}
                <AcuseDeToque />
                {/* El sentido activo se marca por TRES canales que sobreviven al
                    gris —RELLENO oscuro (valor), PESO, y el punto lleno ●/○—. El
                    color se reserva para la identidad de la línea, no para decir
                    "seleccionado". El "Hacia" deja claro que eliges DIRECCIÓN. */}
                <span aria-hidden className="text-[0.8em] leading-none">
                  {esActivo ? '●' : '○'}
                </span>
                {/* El destino va en <Toponimo> (corregido + protegido del traductor):
                    el MISMO texto que el h1 y que la home. "Hacia" es nuestro. */}
                <span>Hacia <Toponimo>{etiquetaSentido(s.directionId)}</Toponimo></span>
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
        info={horario?.info ?? null}
      />

      {/* ⭐ C5 · CUÁNDO ABRE Y CUÁNDO CIERRA LA LÍNEA. Del GTFS, horneado. */}
      <Terminal horario={horario} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Recorrido({
  sentido, linea, lineaId, fingir, veredicto, info,
}: {
  sentido: ReturnType<typeof sentidosDe>[number];
  linea: Line;
  lineaId: LineId;
  fingir: Fingimiento | null;
  veredicto: Veredicto | null;
  info: string | null;
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
      {/* ⭐⭐ EL AVISO DE DESVÍO, ENCOGIDO A UN CHIP. Y es DERIVADO: se auto-apaga.
          ⛔ FUERA EL PÁRRAFO que explicaba el cruce y contaba las caídas/provisionales:
             REDUNDABA con lo que ya está a la vista —el cuadro de suprimidas lista las
             caídas una a una, y las provisionales salen marcadas en el propio itinerario—,
             y encima lo contaba ANTES de que se vieran.
          ⚠️ SOLO EL TÍTULO, y sin causa: ZetaBus NO sabe POR QUÉ (obras, cabalgata, un
             corte…), solo que la ruta de hoy difiere de la oficial. Afirmar la causa sería
             inventar. La frase "el recorrido es el de hoy, no el oficial" no se pierde: es
             comportamiento normal de la app (el itinerario SIEMPRE es el de hoy), y vive en
             /sobre-los-datos. */}
      {/* ⭐⭐ EL AVISO DE DESVÍO ES UN ACORDEÓN: el chip que avisa, y que al abrirse
          despliega DEBAJO las paradas caídas —el cuadro de abajo se mudó aquí dentro—.
          Antes el aviso estaba arriba y su respuesta 30 paradas más abajo. Ver
          `components/AvisoDesvio.tsx`. */}
      {desviada && <AvisoDesvio fuera={veredicto.fuera} />}

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
          <p className="text-menor font-bold leading-snug not-italic sin-recortar">
            No hemos podido comprobar si esta línea está desviada
          </p>
          <p className="mt-1 text-nota leading-snug not-italic text-[var(--color-tinta-suave)] sin-recortar">
            Abajo va <strong>el recorrido oficial</strong>. Si hoy hay un desvío,{' '}
            <strong>no lo sabemos</strong> — y eso no es lo mismo que decir que no lo hay.
            ({veredicto.motivo})
          </p>
        </div>
      )}

      {/* ⚠️ Ci3 y Ci4 NO tienen trazado publicado. Se ETIQUETA, no se finge. */}
      {sinGeometria && (
        <p
          className="mb-3 rounded-tarjeta border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="sin-geometria"
        >
          ⚠ Esta línea NO tiene trazado publicado en el GTFS oficial. Podemos decirte sus paradas y
          sus autobuses, pero no dibujar por dónde va. No nos lo inventamos.
        </p>
      )}

      {/* ⭐ C5 · FUERA LA LEYENDA DE LOS CUADRADITOS. Decía: "Los cuadraditos de
          colores son los transbordos... Los oscuros son las nocturnas." Si un sistema
          visual necesita un rótulo que lo explique, el sistema visual no funciona: la
          referencia NO lo tiene y se entiende igual. GEOMETRÍA, NO RÓTULOS. Y de paso
          ese texto se solapaba con la cabecera. El chip de transbordo YA se entiende:
          es el número de una línea, en su color; el búho, invertido sobre azul noche.
          Quien no ve formas lo tiene en el `aria-label` de cada chip ("Ver el recorrido
          de la línea N1, nocturna"). */}

      {/* ⭐⭐ Y POR EL MISMO MOTIVO SE VA LA FRANJA QUE HABÍA AQUÍ:
          «EL RECORRIDO · 32 PARADAS»  +  «LA RUTA DE HOY, SEGÚN AVANZA»

          Las tres partes decían algo que ya estaba dicho, y ninguna era accionable:

            · «32 PARADAS» — la gente sabe contar, y se ven. Nadie decide nada
              distinto porque haya 32 en vez de 28.
            · «LA RUTA DE HOY, SEGÚN AVANZA» — redundante cuando hay desvío (el aviso
              ámbar de arriba ya lo explica mucho mejor: "Lo que ves abajo es el
              recorrido que el autobús hace hoy, no el oficial") y vacío cuando no lo
              hay. La procedencia vive en /sobre-los-datos, enlazada desde el pie.
            · «EL RECORRIDO» — un título que dice "EL RECORRIDO" encima de un recorrido
              es como poner "FOTO" debajo de una foto. La tarjeta con sus nodos, su hilo
              y sus nombres se explica sola.

          ⚠️ LO QUE SÍ HACÍA ESA FRANJA Y NO SE PIERDE: era el único <h2> que NOMBRABA
             la región, y quien navega por encabezados lo usaba para saltar aquí. El
             recuento no hace falta —un <ol> ya anuncia cuántos elementos tiene—, pero
             el NOMBRE sí. Se conserva en el `aria-label` del <ol>: misma información
             para quien la necesita, cero píxeles para quien no. */}

      <Itinerario
        nombreAccesible={`El recorrido, ${aPintar.length} ${aPintar.length === 1 ? 'parada' : 'paradas'}`}
        lineaId={lineaId}
        linea={linea}
        paradas={aPintar}
        fingir={fingir}
        info={info}
      />

      {/* ⛔ AQUÍ FLOTABA LA NOTA DE «UNA PARADA PUEDE ESTAR SUPRIMIDA SIN QUE SE
          NOTE», y estaba HUÉRFANA: hablaba del cuadro ámbar de paradas caídas —que
          desde que el itinerario tiene tarjeta vive DENTRO de ella— pero ella se
          quedaba fuera, suelta sobre el lienzo, sin pertenecer a nada.

          ⇒ Se ha mudado al final de ese cuadro (ver `Itinerario.tsx`), que es donde
            el usuario está pensando "¿y me puedo fiar de esto?", y se ha quedado en
            las dos ideas accionables: que puede haber más, y qué hacer.

          ⛔ Y SE VA EL RECUENTO DE PETICIONES Y LA CACHÉ. Era fontanería: al que
             está en la marquesina no le sirve saber cuántas peticiones hacemos ni
             cuánto las guardamos, y eso ya está contado en /sobre-los-datos. El coste
             real se sigue vigilando donde importa —`e2e/linea-sin-barrido.spec.ts` lo
             lee de `/api/diag`, no de la pantalla—, así que no se pierde control. */}
    </div>
  );
}
