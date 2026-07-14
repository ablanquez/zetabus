/**
 * ⭐ AGRUPAR LOS AUTOBUSES ENCONTRADOS POR TIPO DE VEHÍCULO.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * POR QUÉ AGRUPAR, Y POR QUÉ ESTO SUSTITUYE AL RECUENTO.
 *
 * Teníamos un recuento agregado: "de los 11 que vemos, 11 son articulados". Es
 * un texto. Y un texto HAY QUE CREÉRSELO: el que lo lee no tiene forma de saber
 * si el que lo escribió sumó bien.
 *
 *     Volvo 7905 · articulado · 18 m · diésel
 *     [4266] [4211] [4243] [4236]
 *
 *     Mercedes-Benz eCitaro · sencillo · 12 m · eléctrico
 *     [4684] [4307]
 *
 * Tres bloques y ya sabes qué flota circula. Nadie te lo ha contado: LA GEOMETRÍA
 * SE EXPLICA SOLA. Y de paso el dato bruto sigue ahí — los números de coche —, que
 * es lo único que le sirve a alguien que está mirando el autobús de verdad.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ DOS REGLAS QUE NO SE NEGOCIAN, Y LAS DOS SON SOBRE MENTIR POR OMISIÓN:
 *
 *  1. LOS QUE NO TIENEN FICHA VAN EN SU PROPIO GRUPO. Nunca dentro de otro.
 *     El registro oficial cubre ~87% de lo que circula: un autobús nuevo llega
 *     antes a la calle que a un documento. Meter al 13% restante en el grupo
 *     "sencillo, 12 m" porque es el más común sería inventarse los datos
 *     exactamente donde no los tenemos, y hacerlo con total confianza.
 *
 *  2. LA CONFIANZA FORMA PARTE DE LA CLAVE. Dos autobuses del mismo modelo, uno
 *     OFICIAL y otro SIN VERIFICAR, NO se funden en un grupo. Si se fundieran, el
 *     grupo heredaría la confianza del primero que llegase y el "sin verificar"
 *     se habría disfrazado de dato oficial sin que nadie tocara una línea de
 *     código. Son 53 de 403 vehículos: uno de cada ocho.
 */

import type { BusProfile } from '@/modes/bus/profile';
import type { Confidence } from '@/core';
import type { AutobusDetectado } from './barrido';

export interface GrupoDeFlota {
  readonly clave: string;
  /** "Volvo 7905". `null` cuando NO HAY FICHA: no se inventa un nombre. */
  readonly modelo: string | null;
  /** "articulado" | "sencillo" | "microbús". `null` sin ficha. */
  readonly clase: string | null;
  /** "diésel" | "híbrido" | "eléctrico". `null` si la ficha no lo dice. */
  readonly combustible: string | null;
  readonly metros: number | null;
  /** `null` = SIN FICHA. Es un tercer estado, y no es "sin verificar". */
  readonly confianza: Confidence | null;
  readonly coches: readonly string[];
}

const CLASE: Record<string, string> = {
  articulado: 'articulado',
  sencillo: 'sencillo',
  microbus_pmrs: 'microbús',
};

const COMBUSTIBLE: Record<string, string> = {
  diesel: 'diésel',
  hibrido: 'híbrido',
  electrico: 'eléctrico',
};

/** La clave de un grupo. La confianza va DENTRO: ver la regla 2 de la cabecera. */
function claveDe(p: BusProfile): string {
  return [p.manufacturer, p.model, p.busClass, p.fuel ?? '?', p.lengthMeters ?? '?', p.confidence].join('|');
}

export function agruparFlota(
  buses: readonly Pick<AutobusDetectado, 'coche' | 'perfil'>[],
): readonly GrupoDeFlota[] {
  const grupos = new Map<string, { g: Omit<GrupoDeFlota, 'coches'>; coches: string[] }>();

  for (const b of buses) {
    const coche = String(b.coche);
    const p = b.perfil;

    // ⚠️ SIN FICHA → SU PROPIO GRUPO. Regla 1. No hay valor por defecto.
    const clave = p === null ? 'SIN_DATOS' : claveDe(p);

    let entrada = grupos.get(clave);
    if (!entrada) {
      entrada = {
        g: p === null
          ? { clave, modelo: null, clase: null, combustible: null, metros: null, confianza: null }
          : {
              clave,
              modelo: `${p.manufacturer} ${p.model}`.trim(),
              clase: CLASE[p.busClass] ?? p.busClass,
              combustible: p.fuel !== null ? (COMBUSTIBLE[p.fuel] ?? p.fuel) : null,
              metros: p.lengthMeters,
              confianza: p.confidence,
            },
        coches: [],
      };
      grupos.set(clave, entrada);
    }
    entrada.coches.push(coche);
  }

  return [...grupos.values()]
    .map((e) => ({
      ...e.g,
      coches: [...e.coches].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })),
    }))
    .sort((a, b) => {
      // SIN DATOS al final: no es un modelo, es la ausencia de uno. Pero VA, y se ve.
      if (a.confianza === null) return 1;
      if (b.confianza === null) return -1;
      if (b.coches.length !== a.coches.length) return b.coches.length - a.coches.length;
      return (a.modelo ?? '').localeCompare(b.modelo ?? '', 'es');
    });
}
