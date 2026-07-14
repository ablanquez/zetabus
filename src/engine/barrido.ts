/**
 * EL BARRIDO DE LÍNEA. Qué autobuses hay AHORA en una línea.
 *
 * La API viva no tiene un endpoint "dame la línea 35". Solo sabe contestar por
 * poste. Así que la línea se reconstruye preguntando por sus postes y uniendo.
 *
 * ⚠️ LOS DOS SENTIDOS. Una línea son dos, y se barren los dos: los postes de
 * todos los sentidos se funden en una sola lista (sin repetir: la 35 tiene 2
 * postes que sirven a los dos, y preguntarlos dos veces sería pagar dos veces).
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⭐⭐ POR QUÉ SE BARRE ENTERO, Y POR QUÉ ANTES NO. LA MUERTE DEL PASO 4.
 *
 * Hasta hoy esto muestreaba 1 de cada 4 postes. La medida de la Tanda 3 decía
 * "paso 4 → 11 de 11 autobuses → 100%", y me la creí.
 *
 * ⚠️ ERA UN CASO FAVORABLE, Y LO TOMÉ POR EL CASO GENERAL.
 *
 * Antonio, que coge el bus, dijo haber visto TRES SEGUIDOS EN DOS PARADAS. Se
 * repitió la medida sobre las tres líneas que más autobuses tienen (35, 33, 32),
 * los dos sentidos, una sola captura, el 14/07/2026 a las 10:38:
 *
 *     línea 35 · 12 buses    paso 2  92%   paso 3 100%   paso 4  83%   paso 5  92%
 *     línea 33 · 15 buses    paso 2  93%   paso 3  93%   paso 4  93%   paso 5  87%
 *     línea 32 ·  9 buses    paso 2 100%   paso 3 100%   paso 4 100%   paso 5 100%
 *
 * Tres cosas, y las tres matan al paso:
 *
 *   1. EL PASO 4 PIERDE AUTOBUSES. Dos de doce en la 35 (los coches 4302 y 4324).
 *   2. LA COBERTURA NO ES MONÓTONA: en la 35, el paso 3 encuentra MÁS que el 2.
 *      Un número que sube cuando debería bajar no es una medida: es una lotería.
 *      El paso acierta o falla según dónde caiga la rejilla. Eso no es cobertura.
 *   3. LA LÍNEA 32 SALE 100% EN TODOS LOS PASOS — porque sus autobuses van
 *      repartidos. Tiene la forma exacta de mi medida de la Tanda 3. Si hubiera
 *      repetido la medida yo solo, habría vuelto a "confirmarlo".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ Y HAY UNA RAZÓN ESTRUCTURAL. LA REGLA DE LOS DOS.
 *
 * Avanza anuncia en cada poste, COMO MUCHO, LOS DOS SIGUIENTES autobuses de cada
 * línea y sentido. Pon los autobuses de un sentido en fila, del más adelantado al
 * más atrasado: B1, B2, B3… En un poste solo se anuncian los dos que lo tienen
 * más cerca por detrás. Luego B3 solo es visible en los postes que hay ENTRE B3 y
 * B1: más allá, lo tapan los otros dos.
 *
 *     ⇒ LA VENTANA DE VISIBILIDAD DE UN AUTOBÚS LA FIJA LO CERCA QUE TENGA AL QUE
 *       VA **DOS** POSICIONES POR DELANTE. No la fija la longitud de la línea.
 *
 * Un autobús suelto tiene una ventana enorme y cualquier paso lo pilla. Tres
 * apelotonados dejan al tercero con una ventana de UN poste — medido: el coche
 * 4314 de la 33 solo era visible en UN poste de 51. Y se midieron 8 parejas a ≤2
 * postes, dos de ellas a CERO (dos autobuses visibles en el mismo poste).
 *
 * Y de ahí sale la regla que decide, que no es estadística:
 *
 *     un tramo de p postes CONSECUTIVOS siempre contiene un múltiplo de p
 *     ⇒ el paso p garantiza encontrar a un autobús cuya ventana mida ≥ p
 *     ⇒ el paso que aguanta = LA VENTANA MÁS ESTRECHA que exista
 *
 * La ventana más estrecha medida es **1**. Luego el único paso que garantiza algo
 * es el 1. No hay muestreo defendible. SE BARRE ENTERO.
 *
 * Cuesta 67 peticiones en la 35 en vez de 18. Se paga. Un barrido caro y correcto
 * vale más que uno barato que miente.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LO QUE NI SIQUIERA EL BARRIDO COMPLETO PUEDE VER, Y SE DICE EN PANTALLA:
 * si TRES autobuses caben entre dos postes consecutivos, el tercero no es de los
 * dos siguientes de NINGÚN poste — y no sale, por mucho que preguntemos a todos.
 * Por eso la pantalla dice "hemos ENCONTRADO", nunca "hay". La diferencia no es
 * cosmética: es la única frase que sigue siendo verdad cuando eso pasa.
 */

import type { LatLon, LineId, Observacion, VehicleId } from '@/core';
import type { BusProfile } from '@/modes/bus/profile';
import { leerPoste } from '@/sources/avanza/poste';
import type { Dependencias } from './llegadas';
import { canonLinea, linea as buscarLinea, sentidosDe, perfilDe, posteDe, idParada } from './topologia';

/**
 * ⭐ EL RITMO. Y ESTO NO ES UNA OPTIMIZACIÓN: ES LO QUE PROMETEMOS.
 *
 * ⚠️ AQUÍ HABÍA UN AGUJERO, Y SOLO SE VIO AL SUBIR A 67 POSTES.
 *
 * El barrido hacía `Promise.all` de todos los postes: los disparaba A LA VEZ. Con
 * 18 no se notaba porque el cubo de fichas tiene 40 y se los tragaba enteros. Es
 * decir: **el techo no estaba frenando al barrido, le estaba dando permiso para
 * una ráfaga.** Dieciocho conexiones simultáneas contra un servidor al que le
 * prometemos cortesía por escrito, y al que hemos visto caerse.
 *
 * Con 67 postes el agujero deja de ser teórico por dos motivos a la vez:
 *   · serían 67 conexiones de golpe, y
 *   · el cubo solo tiene 40 fichas → 27 postes saldrían `fallo` DE SALIDA.
 *
 * ⇒ EL BARRIDO SE MARCA SU PROPIO RITMO. El cubo vuelve a ser lo que debía ser:
 *   una red de seguridad que en marcha normal NO SE TOCA, no el regulador.
 *
 * 67 postes a 4/s son ~17 segundos. Es mucho. Y es exactamente por eso que hay
 * una barra de progreso: la espera deja de ser un problema y pasa a ser lo que se
 * mira. Lo que NO se puede hacer es ahorrársela machacando a Avanza.
 */
export const POR_SEGUNDO = 4;

/**
 * Peticiones a la vez. Es un TOPE, no un objetivo: quien manda es el ritmo.
 *
 * ⚠️ CON 4 NO LLEGABA, Y LO VI EN UN RELOJ. Un barrido real de la 35 tardó 90 s
 * en vez de los 17 que dice la aritmética. Con 4 obreros, el caudal no es 4/s: es
 * 4 ÷ (lo que tarde Avanza). Si contesta en 1 s, salen 4/s y el ritmo manda. Si
 * tarda 3 s, salen 1,3/s y quien manda es la latencia.
 *
 * Con 8, el ritmo sigue mandando aunque Avanza responda en 2 segundos. Y NO sube
 * el caudal: el techo de 4/s es el mismo. Solo evita que una fuente lenta
 * convierta un barrido de 17 segundos en uno de minuto y medio.
 */
export const EN_VUELO = 8;

/**
 * ⭐⭐ EL CORTACIRCUITOS. SI NADA CONTESTA, SE PARA. NO SE INSISTE 67 VECES.
 *
 * ⚠️ ESTO NO EXISTÍA, Y CON 18 POSTES CASI NO SE NOTABA. CON 67, SÍ.
 *
 * El 14/07/2026, con Avanza caída, un barrido real de la 35 hizo esto:
 *
 *     110 peticiones · 67 timeouts · 43 reintentos · 3.269 ms de media · 90 s
 *
 * Los sesenta y siete postes dieron timeout. Y nosotros seguimos pidiendo. Le
 * mandamos 110 peticiones a un servidor que ya estaba en el suelo, y al usuario
 * le pusimos una barra girando durante minuto y medio para acabar diciéndole que
 * no sabíamos nada.
 *
 * Las dos cosas están mal, y las dos las arregla lo mismo: si los primeros postes
 * fallan TODOS y no ha entrado ni un dato bueno, Avanza no está. Se para.
 *
 *   · Al usuario se le dice en ~10 segundos, no en 90.
 *   · Y a Avanza se le dejan de mandar las 60 peticiones que faltaban.
 *
 * ⚠️ Y SOLO SI NO HA IDO BIEN NI UNA. Si un poste suelto falla y los demás van, la
 * fuente está viva y el barrido sigue entero: un poste malo NO puede tumbar la
 * línea. Lo que se detecta aquí no es "hay fallos", es "no hay NADIE al otro lado".
 */
export const RENDIRSE_TRAS = 6;

const dormirDeVerdad = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface AutobusDetectado {
  readonly coche: VehicleId;
  /** El destino que anuncia Avanza. En la práctica, ES el sentido. */
  readonly destino: string;
  readonly posicion: LatLon | null;
  /** El más cercano de los tiempos con que se le vio, en minutos. */
  readonly etaMinutos: number;
  readonly perfil: BusProfile | null;
  /** En cuántos postes del barrido apareció. Sirve para depurar, no para decidir. */
  readonly vistoEnPostes: number;
}

/** Lo que ha pasado con UN poste del barrido. Se emite EN CUANTO ocurre. */
export interface ProgresoPoste {
  readonly hechos: number;
  readonly total: number;
  readonly poste: number;
  readonly resultado: 'ok' | 'rancio' | 'fallo';
  readonly motivo?: string;
}

export interface BarridoDeLinea {
  readonly lineaId: LineId;
  readonly linea: string;
  /** Todos los de la línea, los dos sentidos. Desde hoy no se muestrea. */
  readonly postesDeLaLinea: number;
  /**
   * Los que de verdad se han llegado a preguntar. Normalmente son TODOS. Solo son
   * menos si el cortacircuitos se disparó — y entonces `abandonado` lo dice.
   */
  readonly postesConsultados: number;
  /** ⭐ `true` = paramos nosotros porque no contestaba nadie. Se dice en pantalla. */
  readonly abandonado: boolean;
  /**
   * ⚠️ TRES CIFRAS, NO UNA. Y NO ES BUROCRACIA.
   *
   * La primera versión metía en un solo saco de "avisos" los postes que NO
   * RESPONDIERON y los que respondieron con un dato RANCIO. La pantalla acabó
   * diciendo, literalmente:
   *
   *     "Detectamos 4 autobuses"  ...  "17 de 17 postes no respondieron"
   *
   * Si no respondió ninguno, ¿DE DÓNDE SALEN LOS CUATRO AUTOBUSES? Salían de la
   * caché, y estaba bien servirlos — lo que estaba mal era el RESUMEN. Una
   * pantalla que se contradice consigo misma en dos líneas seguidas es la
   * pantalla coherente y falsa, en su forma más tonta.
   */
  readonly postesLeidos: number;
  readonly postesFallidos: number;
  readonly postesRancios: number;
  /** ⚠️ DETECTADOS. Nunca "todos". Ver la cabecera. */
  readonly detectados: readonly AutobusDetectado[];
  readonly avisos: readonly string[];
}

export interface OpcionesBarrido {
  /**
   * ⭐ SE LLAMA EN CUANTO CADA POSTE TERMINA. No al final: EN CUANTO TERMINA.
   *
   * Es lo que permite que la barra de progreso mida algo de verdad. Una barra
   * que se rellena con una animación fija, sin saber por dónde va el trabajo, es
   * un instrumento mentiroso: promete información y no da ninguna. Ésta cuenta
   * postes reales.
   *
   * ⚠️ Y LOS FALLOS SE EMITEN AQUÍ, MIENTRAS OCURREN. Así ya no tapan el
   *    resultado: suceden ANTES que él. Eso arregla solo el problema del bloque
   *    de avisos que gritaba más que el dato.
   */
  readonly onPoste?: (p: ProgresoPoste) => void;
  /**
   * ⚠️ Subir esto SOLO tiene sentido cuando NO se está hablando con Avanza (modo
   * demo, tests). Nunca en producción: el ritmo es la promesa, no un parámetro.
   */
  readonly porSegundo?: number;
  readonly enVuelo?: number;
  /** Inyectable para que los tests midan el RITMO sin tener que esperarlo. */
  readonly dormir?: (ms: number) => Promise<void>;
  /** Solo para los tests del cortacircuitos. En producción manda `RENDIRSE_TRAS`. */
  readonly rendirseTras?: number;
}

/**
 * Lanza `f` sobre cada elemento a un ritmo máximo de `porSegundo`, con como mucho
 * `enVuelo` en el aire. El hueco se reserva ANTES de esperar, así que N obreros no
 * se pisan ni se agolpan: entre dos arranques cualesquiera pasan 1000/porSegundo ms.
 */
async function aRitmo<T>(
  items: readonly number[],
  f: (x: number) => Promise<T>,
  o: {
    porSegundo: number;
    enVuelo: number;
    ahora: () => number;
    dormir: (ms: number) => Promise<void>;
    /** `true` = ese resultado ha ido bien. Alimenta al cortacircuitos. */
    fueBien: (r: T) => boolean;
    rendirseTras: number;
  },
): Promise<{ hechos: T[]; abandonado: boolean }> {
  const salida: T[] = [];
  const hueco = o.porSegundo > 0 && Number.isFinite(o.porSegundo) ? 1000 / o.porSegundo : 0;
  let proximoArranque = o.ahora();
  let siguiente = 0;
  let fallosSeguidos = 0;
  let algoFueBien = false;
  let abandonado = false;

  const obrero = async (): Promise<void> => {
    for (;;) {
      if (abandonado) return; // ⭐ ni una petición más a un servidor que no está
      const i = siguiente++;
      if (i >= items.length) return;
      // Se COGE el turno y se libera el mostrador; luego se espera al turno. Si
      // se esperase primero y se cogiera después, dos obreros cogerían el mismo.
      const turno = proximoArranque;
      proximoArranque += hueco;
      const espera = turno - o.ahora();
      if (espera > 0) await o.dormir(espera);
      if (abandonado) return; // pudo caerse mientras esperábamos nuestro turno

      const r = await f(items[i]);
      salida.push(r);

      if (o.fueBien(r)) {
        algoFueBien = true;
        fallosSeguidos = 0;
      } else if (!algoFueBien && ++fallosSeguidos >= o.rendirseTras) {
        // ⚠️ Ni un dato bueno en los primeros N. No es un poste malo: no hay nadie.
        abandonado = true;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(o.enVuelo, items.length)) }, obrero),
  );
  return { hechos: salida, abandonado };
}

export async function barrerLinea(
  lineaId: LineId,
  dep: Dependencias,
  o: OpcionesBarrido = {},
): Promise<Observacion<BarridoDeLinea>> {
  const l = buscarLinea(lineaId);
  if (!l) {
    return { estado: 'desconocido', motivo: `La línea "${String(lineaId)}" no existe en el GTFS.` };
  }

  // ⭐ TODOS los postes de LOS DOS sentidos, sin repetir, siguiendo la ruta.
  const aConsultar: number[] = [];
  const vistos = new Set<number>();
  for (const s of sentidosDe(lineaId)) {
    for (const sid of s.official.stops) {
      const poste = posteDe(idParada(sid));
      if (poste !== null && !vistos.has(poste)) {
        vistos.add(poste);
        aConsultar.push(poste);
      }
    }
  }
  if (aConsultar.length === 0) {
    return { estado: 'desconocido', motivo: `La línea ${l.shortName} no tiene ni un poste con identidad de Avanza.` };
  }

  const canon = canonLinea(l.shortName);
  const avisos: string[] = [];

  // Las peticiones van por la caché, así que un barrido de la línea 35 y alguien
  // mirando una parada de la 35 COMPARTEN entradas. No se cuentan dos veces.
  let hechos = 0;
  const total = aConsultar.length;
  const { hechos: lecturas, abandonado } = await aRitmo(
    aConsultar,
    async (poste) => {
      const r = await dep.cache.obtener(`poste:${poste}`, () => leerPoste(poste, dep.transporte));
      hechos++;
      o.onPoste?.({
        hechos,
        total,
        poste,
        resultado: r.tipo === 'fallo' ? 'fallo' : r.tipo === 'rancio' ? 'rancio' : 'ok',
        ...(r.tipo !== 'fresco' ? { motivo: r.motivo } : {}),
      });
      return { poste, r };
    },
    {
      porSegundo: o.porSegundo ?? POR_SEGUNDO,
      enVuelo: o.enVuelo ?? EN_VUELO,
      ahora: dep.ahora ?? Date.now,
      dormir: o.dormir ?? dormirDeVerdad,
      // ⚠️ RANCIO CUENTA COMO BIEN. El poste contestó (antes) y su dato se usa.
      //    Si contara como fallo, una caché tibia dispararía el cortacircuitos.
      fueBien: (x) => x.r.tipo !== 'fallo',
      rendirseTras: o.rendirseTras ?? RENDIRSE_TRAS,
    },
  );

  interface Acumulado {
    destino: string; posicion: LatLon | null; eta: number; postes: number;
  }
  const porCoche = new Map<string, Acumulado>();
  let leidos = 0;
  let fallidos = 0;
  let rancios = 0;
  let masViejoMs = 0;
  let observadoEn: string | null = null;

  for (const { poste, r } of lecturas) {
    if (r.tipo === 'fallo') {
      fallidos++;
      avisos.push(`poste ${poste}: ${r.motivo}`);
      continue;
    }
    leidos++;
    // ⚠️ LA EDAD DE UN BARRIDO ES LA DE SU PARTE MÁS VIEJA, no la de la más
    //    nueva. Si un poste vino de caché con 14 s y otro se acaba de pedir,
    //    el conjunto tiene 14 s. Quedarse con el mejor número sería maquillar.
    if (r.edadSegundos * 1000 >= masViejoMs) {
      masViejoMs = r.edadSegundos * 1000;
      observadoEn = r.observadoEn;
    }
    if (r.tipo === 'rancio') {
      // ⚠️ RANCIO NO ES FALLIDO. El poste SÍ contestó (antes), y su dato SÍ se
      //    está usando. Confundirlos hace que la pantalla se contradiga.
      rancios++;
      avisos.push(`poste ${poste}: dato rancio (${r.motivo})`);
    }

    const posiciones = new Map(r.datos.vehiculos.map((v) => [v.coche, v.posicion]));
    for (const ll of r.datos.llegadas) {
      // Solo los de ESTA línea. El poste anuncia todas las que pasan por él.
      if (canonLinea(ll.lineaCruda) !== canon) continue;

      // ⭐ DEDUPLICADO POR COCHE, y por eso los dos sentidos caben en una lista:
      //    el mismo autobús aparece en VARIOS postes (hasta 22 medidos en la 32).
      //    Contarlo una vez por poste convertiría "12 autobuses" en "31".
      const previo = porCoche.get(ll.coche);
      if (previo) {
        previo.postes++;
        // Nos quedamos con el ETA más pequeño: es la observación más cercana,
        // la que menos tiempo lleva viajando en el estómago del sistema.
        if (ll.etaMinutos < previo.eta) {
          previo.eta = ll.etaMinutos;
          previo.destino = ll.destino;
        }
        previo.posicion ??= posiciones.get(ll.coche) ?? null;
      } else {
        porCoche.set(ll.coche, {
          destino: ll.destino,
          posicion: posiciones.get(ll.coche) ?? null,
          eta: ll.etaMinutos,
          postes: 1,
        });
      }
    }
  }

  if (leidos === 0) {
    // ⭐ Y si además nos hemos rendido, se dice CUÁNTAS preguntas nos ahorramos.
    //    No es un adorno: es la promesa de no abusar, rindiendo cuentas.
    const rendidos = abandonado
      ? ` Se ha dejado de preguntar tras ${lecturas.length} intentos fallidos seguidos: si no contesta nadie, insistir ${total - lecturas.length} veces más no ayuda a nadie.`
      : '';
    return {
      estado: 'caido',
      motivo: `Avanza no ha contestado a ninguna de las ${lecturas.length} paradas que le hemos preguntado de la línea ${l.shortName}.${rendidos}`,
    };
  }
  if (leidos < total) {
    avisos.push(
      `barrido INCOMPLETO: ${leidos} de ${total} postes. ` +
        'Puede haber autobuses de esta línea que no salgan en la lista.',
    );
  }

  const detectados: AutobusDetectado[] = [...porCoche.entries()]
    .map(([coche, a]) => ({
      coche: coche as VehicleId,
      destino: a.destino,
      posicion: a.posicion,
      etaMinutos: a.eta,
      perfil: perfilDe(coche), // ← null = SIN DATOS. Jamás un valor por defecto.
      vistoEnPostes: a.postes,
    }))
    .sort((x, y) => String(x.coche).localeCompare(String(y.coche), 'es', { numeric: true }));

  const datos: BarridoDeLinea = {
    lineaId,
    linea: l.shortName,
    postesDeLaLinea: total,
    postesConsultados: lecturas.length,
    abandonado,
    postesLeidos: leidos,
    postesFallidos: fallidos,
    postesRancios: rancios,
    detectados,
    avisos,
  };

  return {
    estado: 'ok',
    datos,
    observadoEn: observadoEn ?? new Date((dep.ahora ?? Date.now)()).toISOString(),
    edadSegundos: Math.floor(masViejoMs / 1000),
    origen: 'fuente',
  };
}
