import type { Hex, LatLon, LineId, Mode, StopId, VehicleId } from './ids';
import type { Provenance, ProcedenciaDelNombre } from './provenance';
import type { VehicleProfile } from './profiles';

/**
 * LAS ENTIDADES DEL NÚCLEO.
 *
 * ⚠️ BUSCA LA PALABRA "BUS" EN ESTE FICHERO. No está.
 *
 * No hay `poste`. No hay `numeroAutobus`. No hay `route_type`. No hay `PA`.
 * Todo eso son detalles de UN proveedor concreto y viven en `src/sources/`.
 * Zaragoza-bus es el PRIMER INQUILINO de este modelo, no el modelo.
 *
 * El test `tests/core-agnostico.test.ts` lo comprueba automáticamente: si
 * alguien mete la palabra "bus" aquí, o hace que `core/` importe de
 * `sources/`, el test se pone rojo.
 */

// ─────────────────────────────────────────────────────────────────────────────

export interface Stop {
  readonly id: StopId;
  /** El código que el operador enseña en la marquesina. Puede no haberlo. */
  readonly code: string | null;
  readonly name: string;
  /**
   * ⭐ A1 · DE DÓNDE SALE EL NOMBRE. Su procedencia, campo a campo, como en la flota.
   * `avanza-web` = el operador lo escribe así hoy (el bueno). `gtfs-marcado` = Avanza
   * no lo da (parada suprimida por desvío) y se queda el del GTFS, que puede estar
   * roto — y la pantalla lo dice. Ver `ProcedenciaDelNombre`.
   */
  readonly nombreProc: ProcedenciaDelNombre;
  readonly position: LatLon;
  /** Una parada puede servir a varios modos (una plaza con bus y tranvía). */
  readonly modes: readonly Mode[];
  readonly provenance: Provenance;
}

export interface Line {
  readonly id: LineId;
  readonly mode: Mode;
  /** "35", "Ci3", "N1" */
  readonly shortName: string;
  readonly longName: string;
  /**
   * Color de MARCA, no de estado.
   *
   * ⚠️ El estado (desviada / suprimida / sin datos) NO PUEDE ir en el tono:
   * 22 de las 44 líneas caen en la franja rojo/ámbar/verde, y la línea 31 es
   * literalmente el mismo rojo que "retraso" (ΔE 3,0). El estado va en FORMA.
   * Por eso aquí no hay ningún campo `statusColor`. A propósito.
   */
  readonly color: Hex;
  readonly textColor: Hex;
  readonly operator: string;
  readonly provenance: Provenance;
}

/** Una geometría + una secuencia de paradas, con su procedencia. Íntegra. */
export interface RouteShape {
  /** ORDENADA. */
  readonly stops: readonly StopId[];
  /** Puede estar vacía: no todas las líneas tienen trazado publicado. */
  readonly geometry: readonly LatLon[];
  readonly provenance: Provenance;
}

/**
 * Un sentido de una línea. Aquí vive toda la tensión teórico/real.
 *
 * Se guardan LAS DOS formas, y no es indecisión: **el diff ES el producto**.
 * Si solo guardas la real, no puedes decirle al usuario que su parada de
 * siempre ya no se usa, porque no tienes con qué compararla.
 */
export interface Direction {
  readonly lineId: LineId;
  readonly directionId: 0 | 1;
  readonly headsign: string;
  /** Lo que la topología oficial dice que es. Puede estar desfasada. */
  readonly official: RouteShape;
  /** Lo que el operador ejecuta HOY. Manda ésta. Puede faltar (Tanda 3). */
  readonly current: RouteShape | null;
}

/**
 * La diferencia entre lo oficial y lo real. NO se guarda: se calcula.
 * Lo derivable no se persiste.
 */
export interface RouteDelta {
  /** En `official` y no en `current` → el vehículo YA NO PASA. Se tacha. */
  readonly removed: readonly StopId[];
  /** En `current` y no en `official` → parada provisional. */
  readonly added: readonly StopId[];
  readonly reordered: boolean;
  readonly geometryChanged: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Un vehículo detectado ahora mismo.
 *
 * ⚠️ NO tiene `articulado`, ni `combustible`, ni `longitud`. Eso es específico
 * del modo y vive en `profile` (ver `profiles.ts`). El núcleo solo sabe que un
 * vehículo PUEDE llevar un perfil, y que el perfil se discrimina por `mode`.
 *
 * `profile: null` significa **SIN DATOS**, y así se enseña. Nunca un valor por
 * defecto: un valor por defecto miente, y encima con confianza.
 */
export interface Vehicle {
  readonly id: VehicleId;
  readonly mode: Mode;
  readonly lineId: LineId | null;
  readonly headsign: string | null;
  readonly position: LatLon;
  readonly observedAt: string;
  readonly profile: VehicleProfile | null;
}

/** Un vehículo que viene hacia una parada. */
export interface Arrival {
  readonly stopId: StopId;
  readonly lineId: LineId;
  readonly vehicleId: VehicleId | null;
  readonly headsign: string;
  readonly etaMinutes: number;
  /** ⚠️ Entero en la fuente. `0 km` significa "menos de 1 km", NO "ha llegado". */
  readonly distanceKm: number | null;
  readonly observedAt: string;
}

/**
 * Lo que el operador DICE. Nunca lo que nosotros deducimos.
 *
 * ⚠️ Un `Advisory` NO tacha ni oculta nada por sí solo. Solo anota.
 * Lo que se tacha es lo que se DERIVA (una parada ausente de `current`), porque
 * eso se auto-apaga el día que restauran la ruta. Lo declarado se cita.
 */
export interface Advisory {
  readonly id: string;
  readonly publishedAt: string;
  readonly scope: {
    readonly lineIds: readonly LineId[];
    readonly stopIds: readonly StopId[];
  };
  readonly kind: 'suppression' | 'diversion' | 'schedule' | 'other';
  readonly title: string;
  readonly bodyHtml: string;
  readonly url: string;
  readonly provenance: Provenance;
}
