/**
 * ⭐⭐ A1 · LA CAPA DE NOMBRES. Se pide al operador, en el build, una vez.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El GTFS trae el 80,4 % de los nombres rotos por el exportador de Avanza. El
 *  operador, en `get_stops_list`, los escribe bien. Es EL MISMO endpoint que ya
 *  llamamos para los desvíos —de hecho devuelve lo mismo: la lista ordenada de
 *  `{poste, nombre}` de un sentido—, así que aquí NO hay un parser nuevo: se
 *  reutiliza `leerRecorrido`, y lo único que cambia es que nos quedamos con los
 *  NOMBRES en vez de con el orden.
 *
 *  74 sentidos = 74 peticiones. En el BUILD, una vez. En runtime, CERO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LA PARTE PURA (el merge) NO TOCA LA RED. Se le pasan recorridos ya leídos y
 *    devuelve la tabla + las discrepancias + los contadores. Así se prueba sin
 *    Avanza, con los recorridos que YA hay cacheados. La red vive en `pedirNombres`.
 */

import type { PosteDelRecorrido } from './recorrido';
import { leerRecorrido, type SentidoAvanza } from './recorrido';
import type { Transporte } from './transporte';

/** Una petición que toca hacer: una línea, un sentido. */
export interface PeticionDeSentido {
  readonly lineaEtiqueta: string;
  readonly sentido: SentidoAvanza;
}

/** El resultado de una petición: o la lista de postes, o el motivo del fallo. */
export type RespuestaDeSentido =
  | { readonly peticion: PeticionDeSentido; readonly ok: true; readonly postes: readonly PosteDelRecorrido[] }
  | { readonly peticion: PeticionDeSentido; readonly ok: false; readonly motivo: string };

export interface Discrepancia {
  readonly poste: number;
  readonly nombres: readonly string[];
  /** En qué sentidos apareció cada versión. Para poder ir a mirarlo. */
  readonly vistoEn: readonly string[];
}

export interface TablaDeNombres {
  /** poste → nombre, tal y como lo escribe Avanza HOY. */
  readonly porPoste: Readonly<Record<number, string>>;
  /**
   * ⭐ Un mismo poste con DOS nombres distintos en dos sentidos ES UN DATO, no un
   * error que quitar de en medio. Se registra —igual que en la flota— y se usa la
   * PRIMERA versión vista. NO se lanza excepción: eso obligaría a borrar una de las
   * dos, y la contradicción desaparecería. (La lección de Avenida Valencia.)
   */
  readonly discrepancias: readonly Discrepancia[];
  readonly contadores: {
    /** Peticiones que se esperaba hacer (= nº de sentidos). */
    readonly esperadas: number;
    /** Peticiones que respondieron bien. */
    readonly respondidas: number;
    /** Peticiones que fallaron (Avanza caída, HTML raro, timeout…). */
    readonly fallidas: number;
    /** Postes distintos para los que Avanza SÍ dio nombre. */
    readonly postesConNombre: number;
    /** Nombres vacíos que Avanza devolvió y se descartaron (no se cuentan como nombre). */
    readonly vacios: number;
  };
}

/**
 * ⭐ EL MERGE. Puro: recorridos → tabla. Sin red, sin reloj.
 *
 * @param fecha ISO de la ejecución. Se pasa (no `new Date()`) para que sea un
 *              parámetro reproducible y no una fuente de no-determinismo.
 */
export function fundirNombres(respuestas: readonly RespuestaDeSentido[]): TablaDeNombres {
  const porPoste: Record<number, string> = {};
  /** poste → { nombre → sentidos donde apareció } */
  const versiones = new Map<number, Map<string, string[]>>();
  let respondidas = 0;
  let fallidas = 0;
  let vacios = 0;

  for (const r of respuestas) {
    const etiquetaSentido = `${r.peticion.lineaEtiqueta}/${r.peticion.sentido}`;
    if (!r.ok) { fallidas++; continue; }
    respondidas++;

    for (const p of r.postes) {
      const nombre = p.nombre.trim();
      // ⚠️ NOMBRE VACÍO = NO ES UN NOMBRE. No se registra: el poste caerá al GTFS
      //    marcado, que es la verdad ("Avanza no me lo dio"), en vez de un "".
      if (nombre === '') { vacios++; continue; }

      let v = versiones.get(p.poste);
      if (!v) { v = new Map(); versiones.set(p.poste, v); }
      (v.get(nombre) ?? v.set(nombre, []).get(nombre)!).push(etiquetaSentido);

      // La PRIMERA versión vista es la que se usa. Las demás quedan como discrepancia.
      if (!(p.poste in porPoste)) porPoste[p.poste] = nombre;
    }
  }

  const discrepancias: Discrepancia[] = [];
  for (const [poste, v] of versiones) {
    if (v.size <= 1) continue;
    discrepancias.push({
      poste,
      nombres: [...v.keys()],
      vistoEn: [...v.values()].flat(),
    });
  }
  // Orden estable: por poste. Nada de `Math.random` ni orden de inserción de Map.
  discrepancias.sort((a, b) => a.poste - b.poste);

  return {
    porPoste,
    discrepancias,
    contadores: {
      esperadas: respuestas.length,
      respondidas,
      fallidas,
      postesConNombre: Object.keys(porPoste).length,
      vacios,
    },
  };
}

/**
 * LA RED. Pide cada sentido a Avanza, a ritmo pausado, y NO se rinde a la primera:
 * un sentido que falla es UN nombre menos (cae al GTFS), no un build roto.
 *
 * ⚠️ EL RITMO ES DELIBERADO. El repo es público y promete no abusar de Avanza. Se
 *    duerme entre peticiones: 74 × ~1,5 s ≈ 2 min. No se paraleliza — un build que
 *    tarda dos minutos más una vez cada pocas semanas es un precio ridículo frente a
 *    martillear a un servicio ajeno del que estamos viviendo.
 */
export async function pedirNombres(
  peticiones: readonly PeticionDeSentido[],
  transporte: Transporte,
  opciones: {
    readonly pausaMs?: number;
    /** Se llama tras cada petición, para poder enseñar el avance en el build. */
    readonly alAvanzar?: (hechas: number, total: number, ultima: RespuestaDeSentido) => void;
    readonly dormir?: (ms: number) => Promise<void>;
  } = {},
): Promise<readonly RespuestaDeSentido[]> {
  const pausaMs = opciones.pausaMs ?? 1_500;
  const dormir = opciones.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const salida: RespuestaDeSentido[] = [];

  for (let i = 0; i < peticiones.length; i++) {
    const peticion = peticiones[i];
    if (i > 0) await dormir(pausaMs);

    let r: RespuestaDeSentido;
    try {
      const postes = await leerRecorrido(peticion.lineaEtiqueta, peticion.sentido, transporte);
      r = { peticion, ok: true, postes };
    } catch (e) {
      r = { peticion, ok: false, motivo: (e as Error)?.message ?? String(e) };
    }
    salida.push(r);
    opciones.alAvanzar?.(i + 1, peticiones.length, r);
  }

  return salida;
}
