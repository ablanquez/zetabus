/**
 * ⭐ A1 · SUPERPONER LOS NOMBRES DE AVANZA SOBRE LAS PARADAS DEL GTFS.
 *
 * Puro. Se le pasan las paradas (con su nombre roto del GTFS), el puente
 * poste→stopId, y la tabla de `avanza-web` (o `null` si no se generó). Devuelve las
 * paradas con el nombre bueno donde lo hay, y un informe con el contador independiente.
 *
 * ⚠️ EL CONTADOR ES INDEPENDIENTE DEL DE `build-nombres`. Aquel contaba PETICIONES
 *    (74 sentidos). Este cuenta PARADAS por fuente (avanza-web vs gtfs-marcado). Son
 *    dos métodos distintos de contar la misma realidad — que es justo lo que exige
 *    L1: si los dos no cuentan lo mismo por caminos distintos, uno miente. Aquí, la
 *    suma de las dos fuentes TIENE que dar el total de paradas, o revienta.
 */

import type { Stop } from '@/core';

export interface TablaNombresLeida {
  readonly generatedAt: string;
  readonly porPoste: Readonly<Record<string, string>>;
}

export interface InformeNombres {
  readonly stops: readonly Stop[];
  readonly deAvanza: number;
  readonly deGtfsMarcado: number;
  readonly total: number;
  /**
   * Postes que Avanza da pero que NO están en nuestro GTFS (paradas provisionales
   * de un desvío, por ejemplo). No es un error: se cuentan y se dicen.
   */
  readonly sobrantesDeAvanza: number;
  /** `true` si no había tabla: TODO se quedó en gtfs-marcado. La app lo dirá. */
  readonly sinCapa: boolean;
}

export function aplicarNombres(
  stops: readonly Stop[],
  posteByStopId: Readonly<Record<string, number>>,
  tabla: TablaNombresLeida | null,
): InformeNombres {
  const porPoste = tabla?.porPoste ?? {};
  const fecha = tabla?.generatedAt ?? null;

  const usados = new Set<number>();
  let deAvanza = 0;
  let deGtfsMarcado = 0;

  const nuevas = stops.map((s): Stop => {
    const poste = posteByStopId[String(s.id)];
    const nombreAvanza = poste !== undefined ? porPoste[String(poste)] : undefined;

    if (nombreAvanza !== undefined && nombreAvanza.trim() !== '') {
      usados.add(poste!);
      deAvanza++;
      return {
        ...s,
        name: nombreAvanza,
        nombreProc: { fuente: 'avanza-web', fecha },
      };
    }

    // ⚠️ Avanza no lo da → se queda el del GTFS, MARCADO. No se toca el nombre: se
    //    conserva roto y honesto. La pantalla dirá "sin confirmar".
    deGtfsMarcado++;
    return { ...s, nombreProc: { fuente: 'gtfs-marcado', fecha: null } };
  });

  // ⭐ EL CONTADOR INDEPENDIENTE. La suma por fuente = el total, o algo se ha perdido.
  if (deAvanza + deGtfsMarcado !== stops.length) {
    throw new Error(
      `el contador de nombres no cuadra: ${deAvanza} + ${deGtfsMarcado} ≠ ${stops.length}. ` +
        'Una parada se ha quedado sin clasificar. No se hornea un artefacto que no cuadra.',
    );
  }

  const sobrantesDeAvanza = Object.keys(porPoste).filter(
    (p) => !usados.has(Number(p)),
  ).length;

  return {
    stops: nuevas,
    deAvanza,
    deGtfsMarcado,
    total: stops.length,
    sobrantesDeAvanza,
    sinCapa: tabla === null,
  };
}
