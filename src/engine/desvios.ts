/**
 * EL DIFF DE DESVÍOS. La pieza que no tiene nadie más.
 *
 *      GTFS (lo que la línea DEBERÍA hacer)
 *    − get_stops_list (lo que la línea ESTÁ haciendo hoy)
 *    ─────────────────────────────────────────────────────
 *    = EL DESVÍO
 *
 * ⭐ Y LO QUE LO HACE HONESTO: SE AUTO-APAGA.
 * No hay ninguna lista de desvíos que mantener. El día que Avanza restaure la
 * ruta, `get_stops_list` vuelve a coincidir con el GTFS, el diff sale vacío, y
 * el aviso desaparece SOLO. Nadie tiene que acordarse de quitarlo. Un sistema
 * que hay que acordarse de apagar acaba mintiendo — siempre.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ LA ASIMETRÍA. ES LA CLAVE DEL PROYECTO Y HAY QUE DECIRLA EN VOZ ALTA.
 *
 *   DESVÍO DE RUTA        el autobús NO PASA por la calle
 *                         → la ruta operativa CAMBIA
 *                         → get_stops_list lo refleja
 *                         → DETECTABLE. Es esto.
 *
 *   SUPRESIÓN DE PARADA   el autobús PASA pero NO PARA
 *                         → la ruta operativa NO cambia
 *                         → get_stops_list sigue listando la parada
 *                         → **NO DETECTABLE. POR NINGUNA FUENTE.**
 *
 * Está comprobado en la auditoría (docs/auditoria/05-fase7-oraculo.md): en el
 * poste 744, con el comunicado de Avanza diciendo POR ESCRITO que las líneas 29
 * y 39 "realizan su recorrido habitual PERO SIN REALIZAR PARADA", la API viva
 * anunciaba tranquilamente "039 VADORREY, 0 minutos". Ponen el cartel en la
 * marquesina y no desconectan el poste.
 *
 * ⇒ ZetaBus detecta desvíos. NO detecta supresiones. Y lo dice.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y OJO: A ESTA FUNCIÓN NO ENTRA NI UN DATO VIVO. MÍRALE LA FIRMA.
 * La tentación de deducir un desvío de "ese poste lleva callado toda la mañana"
 * es enorme y es un error. Un poste callado puede ser un desvío, pueden ser las
 * cuatro de la mañana, o puede ser un poste que Avanza no tiene dado de alta.
 * La API devuelve LO MISMO en los tres casos (medido: ver `topologia.ts`).
 * Deducir un desvío de un silencio es INVENTARSE UN DESVÍO.
 *
 * Aquí no se evita con disciplina, que se olvida: se evita con el TIPO. Esta
 * función recibe dos listas de postes y NADA MÁS. No hay por dónde colar una
 * llegada aunque uno quiera.
 */

import type { LineId, Observacion } from '@/core';
import type { CacheDosPisos } from '@/cache/dos-pisos';
import { leerRecorrido, type SentidoAvanza } from '@/sources/avanza/recorrido';
import type { Transporte } from '@/sources/avanza/transporte';
import { idParada, linea as buscarLinea, parada, posteDe, sentidosDe } from './topologia';

/**
 * ⚠️ ESTE FICHERO NO IMPORTA NI PUEDE IMPORTAR `poste.ts` NI `llegadas.ts`.
 * No es una convención: lo comprueba `tests/desvios-no-miran-lo-vivo.test.ts`,
 * que lee este fichero y se pone rojo si aparece un `import` del canal vivo.
 * La disciplina se olvida. Un test, no.
 */

export interface ParadaDelDiff {
  readonly poste: number;
  readonly nombre: string;
}

export type Veredicto =
  /** Se ha podido comparar. `hayDesvio` dice si además hay diferencia. */
  | {
      readonly tipo: 'comparado';
      readonly hayDesvio: boolean;
      /**
       * ⭐⭐ LA RUTA QUE EL AUTOBÚS HACE HOY, EN ORDEN. Y ES LO QUE SE PINTA.
       *
       * ⛔ ANTES ESTO NO SE DEVOLVÍA, Y ÉSE ERA EL FALLO MÁS GRAVE DEL PROYECTO.
       *
       * El diff estaba hecho, medido y probado desde la Tanda 3... y la pantalla
       * seguía pintando la ruta del GTFS. Es decir: ZetaBus le decía a alguien que
       * su autobús para en **Avenida Valencia**, una calle que está CORTADA.
       *
       * No petaba. Pintaba. Con toda la coherencia del mundo. Que es exactamente
       * el modo de fallo que este proyecto existe para no tener.
       *
       * ⚠️ Y ojo a la asimetría: la lista lleva `poste` y `nombre` **tal y como los
       * da Avanza**, no ids del GTFS. Tiene que ser así: una parada PROVISIONAL de
       * un desvío puede no estar en la ruta oficial de esta línea, y aun así hay
       * que poder escribir su nombre. Si esto devolviera StopIds, las paradas
       * nuevas se caerían del listado en silencio.
       */
      readonly real: readonly ParadaDelDiff[];
      /** En el GTFS y NO en la ruta de hoy → el autobús YA NO PASA. Se tacha. */
      readonly fuera: readonly ParadaDelDiff[];
      /** En la ruta de hoy y NO en el GTFS → parada provisional del desvío. */
      readonly hacia: readonly ParadaDelDiff[];
      /** Mismas paradas, distinto orden. Pasa cuando cambian el sentido de giro. */
      readonly reordenado: boolean;
      readonly oficiales: number;
      readonly reales: number;
    }
  /** ⚠️ NO se puede comparar. Y "no se puede" NO ES "no hay desvío". */
  | { readonly tipo: 'indeterminado'; readonly motivo: string };

export interface DesvioDeSentido {
  readonly lineaId: LineId;
  readonly linea: string;
  readonly directionId: 0 | 1;
  readonly headsign: string;
  readonly veredicto: Veredicto;
}

/**
 * ⚠️ EL FRENO DE MANO. Si la ruta de hoy se ha "comido" más de esta fracción de
 * las paradas oficiales, ESO NO ES UN DESVÍO: es una lectura rota.
 *
 * Un desvío de obras quita tres paradas, cinco, ocho. No quita el 70% de la
 * línea. Si el diff dice eso, lo que ha pasado es que `get_stops_list` ha
 * devuelto media respuesta, o que han cambiado el HTML y el parser ha sacado de
 * menos.
 *
 * Y esto NO es una precaución teórica. Sin este freno, el modo de fallo es el
 * peor de todos: la pantalla tacharía media línea, con toda la coherencia
 * visual del mundo, y el usuario se creería que su parada ha desaparecido.
 * PREFERIMOS DECIR "NO LO SÉ" A TACHAR 30 PARADAS QUE SIGUEN AHÍ.
 */
export const UMBRAL_ABSURDO = 0.5;

export function compararRecorrido(
  oficial: readonly ParadaDelDiff[],
  real: readonly ParadaDelDiff[],
): Veredicto {
  if (oficial.length === 0) {
    return { tipo: 'indeterminado', motivo: 'el GTFS no da paradas para este sentido' };
  }
  // ⚠️ Una lista real VACÍA no significa "han quitado todas las paradas".
  //    Significa que no hemos podido leerla. Si esto devolviera un diff, la
  //    línea entera aparecería tachada.
  if (real.length === 0) {
    return {
      tipo: 'indeterminado',
      motivo:
        'la ruta de hoy ha llegado vacía. No se compara: una lista vacía daría ' +
        'TODAS las paradas por suprimidas, que es justo la mentira que evitamos.',
    };
  }

  const enOficial = new Map(oficial.map((p) => [p.poste, p]));
  const enReal = new Map(real.map((p) => [p.poste, p]));

  const fuera = oficial.filter((p) => !enReal.has(p.poste));
  const hacia = real.filter((p) => !enOficial.has(p.poste));

  // El freno de mano.
  const desaparecidas = fuera.length / oficial.length;
  if (desaparecidas > UMBRAL_ABSURDO) {
    return {
      tipo: 'indeterminado',
      motivo:
        `la ruta de hoy no incluye el ${Math.round(desaparecidas * 100)}% de las paradas oficiales ` +
        `(${fuera.length} de ${oficial.length}). Eso no es un desvío: es una lectura rota. ` +
        'No se tacha nada.',
    };
  }

  // Reordenado: mismas paradas, otro orden. Se mira SOLO sobre las comunes.
  const comunOficial = oficial.filter((p) => enReal.has(p.poste)).map((p) => p.poste);
  const comunReal = real.filter((p) => enOficial.has(p.poste)).map((p) => p.poste);
  const reordenado = comunOficial.join('>') !== comunReal.join('>');

  return {
    tipo: 'comparado',
    hayDesvio: fuera.length > 0 || hacia.length > 0 || reordenado,
    real, // ⭐ LA RUTA DE HOY, EN ORDEN. Es lo que la pantalla va a pintar.
    fuera,
    hacia,
    reordenado,
    oficiales: oficial.length,
    reales: real.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  LA ORQUESTACIÓN. Trae las dos rutas y las compara. La comparación de arriba
//  sigue siendo pura: se le puede meter cualquier par de listas y no toca red.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ MEDIDO, NO SUPUESTO. `selectSentido` de Avanza contra `direction_id` del GTFS:
 *
 *     línea 21 · sentido -1 → solapa 91% con dir 0, 6% con dir 1
 *     línea 21 · sentido -2 → solapa 93% con dir 1, 7% con dir 0
 *     línea 35 · sentido -1 → solapa 83% con dir 0, 10% con dir 1
 *     línea 35 · sentido -2 → solapa 86% con dir 1, 6% con dir 0
 *
 * Y los extremos se invierten (el primer poste de -1 es el último de -2), que es
 * la confirmación independiente. La señal es inequívoca.
 *
 * ⚠️ Si esto estuviera al revés, TODOS los diffs saldrían llenos de desvíos
 * inventados y con una pinta perfectamente razonable. Por eso se midió en lugar
 * de elegirlo a cara o cruz.
 */
const SENTIDO_AVANZA: Record<0 | 1, SentidoAvanza> = { 0: -1, 1: -2 };

/** La caché del recorrido: 30 min. Un desvío no se pone y se quita cada minuto. */
export const TTL_RECORRIDO_MS = 30 * 60_000;

export interface DependenciasDesvio {
  readonly cache: CacheDosPisos;
  readonly transporte: Transporte;
}

export async function desviosDeLinea(
  lineaId: LineId,
  dep: DependenciasDesvio,
): Promise<Observacion<readonly DesvioDeSentido[]>> {
  const l = buscarLinea(lineaId);
  if (!l) return { estado: 'desconocido', motivo: `La línea "${String(lineaId)}" no existe en el GTFS.` };

  const resultados: DesvioDeSentido[] = [];
  let masViejo = 0;
  let observadoEn: string | null = null;

  for (const s of sentidosDe(lineaId)) {
    // La ruta OFICIAL: la del GTFS, con nombre y todo.
    const oficial: ParadaDelDiff[] = [];
    for (const sid of s.official.stops) {
      const poste = posteDe(idParada(sid));
      const p = parada(idParada(sid));
      if (poste !== null && p) oficial.push({ poste, nombre: p.name });
    }

    const clave = `recorrido:${l.shortName}:${s.directionId}`;
    const r = await dep.cache.obtener(clave, () =>
      leerRecorrido(l.shortName, SENTIDO_AVANZA[s.directionId], dep.transporte).then((ps) => [...ps]),
    );

    let veredicto: Veredicto;
    if (r.tipo === 'fallo') {
      // ⚠️ NO se compara contra una lista vacía. "No he podido leerlo" y "no hay
      //    desvío" son cosas distintas, y confundirlas tacharía la línea entera.
      veredicto = { tipo: 'indeterminado', motivo: `no se ha podido leer la ruta de hoy: ${r.motivo}` };
    } else {
      veredicto = compararRecorrido(
        oficial,
        r.datos.map((p) => ({ poste: p.poste, nombre: p.nombre })),
      );
      if (r.edadSegundos >= masViejo) {
        masViejo = r.edadSegundos;
        observadoEn = r.observadoEn;
      }
    }

    resultados.push({
      lineaId,
      linea: l.shortName,
      directionId: s.directionId,
      headsign: s.headsign,
      veredicto,
    });
  }

  return {
    estado: 'ok',
    datos: resultados,
    observadoEn: observadoEn ?? new Date().toISOString(),
    edadSegundos: masViejo,
    origen: 'fuente',
  };
}
