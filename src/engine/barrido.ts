/**
 * EL BARRIDO DE LÍNEA. Qué autobuses hay AHORA en una línea.
 *
 * La API viva no tiene un endpoint "dame la línea 35". Solo sabe contestar por
 * poste. Así que la línea se reconstruye preguntando por sus postes y uniendo.
 *
 * ⭐ POR QUÉ CON PASO Y NO ENTERO.
 * Cada poste "ve" los autobuses que se le acercan hasta unos 4 km río arriba.
 * Postes consecutivos ven casi lo mismo. Preguntar por los 63 postes de la 35 es
 * pagar 63 peticiones por una información que dan 17. Con paso 4, las ventanas
 * de 4 km siguen solapando y ningún tramo se queda sin cubrir.
 *
 * ⚠️ ESO NO ES UNA CORAZONADA, Y TAMPOCO ME LO CREO PORQUE SUENE BIEN.
 * Está medido en `scripts/barrido-recall.ts`, y medido de una forma concreta
 * que importa: comparando el barrido completo con el de paso SOBRE LA MISMA
 * CAPTURA. Hacer un barrido de 63 y luego otro de 17 y comparar NO VALE — entre
 * los dos pasan 20 segundos y los autobuses SE MUEVEN. La diferencia que vieras
 * no distinguiría "el paso se ha dejado un bus" de "ese bus acabó su servicio".
 * El instrumento estaría midiendo su propio retraso. Ver el script.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ EL CONTRATO DE DATOS. LEER ANTES DE ENSEÑAR ESTO EN PANTALLA.
 *
 * Esto devuelve los autobuses **DETECTADOS**. NO "todos los autobuses de la
 * línea". Y la diferencia no es cosmética:
 *
 *   · Avanza anuncia como mucho LOS DOS SIGUIENTES por línea y sentido.
 *   · Un autobús que va entre dos paradas muy separadas, y que no es de los dos
 *     siguientes de ninguna, EXISTE y NO SALE AQUÍ.
 *
 * Se puede decir "de los 12 autobuses que vemos ahora en la 35, los 12 son
 * articulados". No se puede decir "la 35 tiene 12 autobuses". La primera frase
 * es verdad siempre. La segunda es mentira en cuanto uno se esconda.
 */

import type { LatLon, LineId, Observacion, VehicleId } from '@/core';
import type { BusProfile } from '@/modes/bus/profile';
import { leerPoste } from '@/sources/avanza/poste';
import type { Dependencias } from './llegadas';
import { canonLinea, linea as buscarLinea, sentidosDe, perfilDe, posteDe, idParada, nombreDePoste } from './topologia';

/** Paso por defecto. 4 km de alcance y ~250 m entre paradas → sobra margen. */
export const PASO = 4;

export interface AutobusDetectado {
  readonly coche: VehicleId;
  /** El destino que anuncia Avanza. En la práctica, ES el sentido. */
  readonly destino: string;
  readonly posicion: LatLon | null;
  /** El más cercano de los tiempos con que se le vio, en minutos. */
  readonly etaMinutos: number;
  /**
   * ⭐ LA PARADA A LA QUE ESTÁ A PUNTO DE LLEGAR, y su nombre.
   *
   * ⚠️ OJO CON LA TENTACIÓN: **no es "dónde está el autobús"**. Es el poste del
   * barrido que lo ha visto MÁS CERCA. Un autobús a 1 minuto de esa parada está,
   * efectivamente, casi ahí. Uno a 14 minutos puede estar a kilómetros. Por eso
   * la pantalla dice "llega a X en N min" y NO "está en X": lo primero es lo que
   * la fuente afirma; lo segundo sería una deducción nuestra.
   */
  readonly posteMasCercano: number;
  readonly paradaMasCercana: string;
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
  readonly postesConsultados: number;
  readonly postesDeLaLinea: number;
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
  readonly paso: number;
  /** ⚠️ DETECTADOS. Nunca "todos". Ver la cabecera. */
  readonly detectados: readonly AutobusDetectado[];
  readonly avisos: readonly string[];
}

export interface OpcionesBarrido {
  readonly paso?: number;
  /** ⚠️ Solo para el script de medida: barrer TODOS los postes. */
  readonly completo?: boolean;
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

  // Todos los postes de la línea, sin repetir, siguiendo el orden de la ruta.
  const enOrden: number[] = [];
  const vistos = new Set<number>();
  for (const s of sentidosDe(lineaId)) {
    for (const sid of s.official.stops) {
      const poste = posteDe(idParada(sid));
      if (poste !== null && !vistos.has(poste)) {
        vistos.add(poste);
        enOrden.push(poste);
      }
    }
  }
  if (enOrden.length === 0) {
    return { estado: 'desconocido', motivo: `La línea ${l.shortName} no tiene ni un poste con identidad de Avanza.` };
  }

  const paso = o.completo ? 1 : Math.max(1, o.paso ?? PASO);
  // ⚠️ El ÚLTIMO poste va SIEMPRE, aunque el paso no caiga en él. Si no, la cola
  //    de la línea se queda ciega y los autobuses del final del recorrido —los
  //    que están a punto de terminar— desaparecen del mapa sin motivo.
  const aConsultar = enOrden.filter((_, i) => i % paso === 0);
  const ultimo = enOrden[enOrden.length - 1];
  if (!aConsultar.includes(ultimo)) aConsultar.push(ultimo);

  const canon = canonLinea(l.shortName);
  const avisos: string[] = [];

  // Las peticiones van por la caché, así que un barrido de la línea 35 y alguien
  // mirando una parada de la 35 COMPARTEN entradas. No se cuentan dos veces.
  //
  // ⭐ Y CADA UNA AVISA EN CUANTO TERMINA, no al final. Siguen yendo en paralelo
  //    (con su vuelo único y su techo de fichas); lo único que cambia es que el
  //    progreso se cuenta según van cayendo, en lugar de esperar a que caigan
  //    todas y entonces decir "18 de 18" de golpe, que no es una barra: es un
  //    interruptor.
  let hechos = 0;
  const total = aConsultar.length;
  const lecturas = await Promise.all(
    aConsultar.map(async (poste) => {
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
    }),
  );

  interface Acumulado {
    destino: string; posicion: LatLon | null; eta: number; postes: number;
    posteCercano: number;
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

      // ⭐ DEDUPLICADO POR COCHE: el mismo autobús aparece en varios postes del
      //    barrido (por eso el paso funciona). Contarlo dos veces convertiría
      //    "12 autobuses en la 35" en "31 autobuses en la 35".
      const previo = porCoche.get(ll.coche);
      if (previo) {
        previo.postes++;
        // Nos quedamos con el ETA más pequeño: es la observación más cercana,
        // la que menos tiempo lleva viajando en el estómago del sistema.
        if (ll.etaMinutos < previo.eta) {
          previo.eta = ll.etaMinutos;
          previo.destino = ll.destino;
          previo.posteCercano = poste;
        }
        previo.posicion ??= posiciones.get(ll.coche) ?? null;
      } else {
        porCoche.set(ll.coche, {
          destino: ll.destino,
          posicion: posiciones.get(ll.coche) ?? null,
          eta: ll.etaMinutos,
          postes: 1,
          posteCercano: poste,
        });
      }
    }
  }

  if (leidos === 0) {
    return { estado: 'caido', motivo: `No se ha podido leer ni uno de los ${aConsultar.length} postes de la línea ${l.shortName}.` };
  }
  if (leidos < aConsultar.length) {
    avisos.push(
      `barrido INCOMPLETO: ${leidos} de ${aConsultar.length} postes. ` +
        'Puede haber autobuses de esta línea que no salgan en la lista.',
    );
  }

  const detectados: AutobusDetectado[] = [...porCoche.entries()]
    .map(([coche, a]) => ({
      coche: coche as VehicleId,
      destino: a.destino,
      posicion: a.posicion,
      etaMinutos: a.eta,
      posteMasCercano: a.posteCercano,
      paradaMasCercana: nombreDePoste(a.posteCercano),
      perfil: perfilDe(coche), // ← null = SIN DATOS. Jamás un valor por defecto.
      vistoEnPostes: a.postes,
    }))
    .sort((x, y) => x.etaMinutos - y.etaMinutos);

  const datos: BarridoDeLinea = {
    lineaId,
    linea: l.shortName,
    postesConsultados: aConsultar.length,
    postesDeLaLinea: enOrden.length,
    postesLeidos: leidos,
    postesFallidos: fallidos,
    postesRancios: rancios,
    paso,
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
