import { readFileSync, existsSync } from 'node:fs';
import { control, IngestError, vehicleId, type Confidence, type ControlReport, type VehicleId } from '@/core';
import { classFromLength, type BusClass, type BusProfile, type Fuel } from '@/modes/bus/profile';

/**
 * EL MAESTRO DE FLOTA.
 *
 * Regenerado desde el Anexo 5 del pliego municipal (350 vehículos, `oficial`)
 * más 53 del fichero heredado (`sin_verificar`, autobuses entregados después
 * de octubre de 2025).
 *
 * ⚠️ DOS REGLAS QUE NO SE TOCAN:
 *
 * 1. `confidence` VIAJA HASTA LA INTERFAZ. Un `sin_verificar` no puede
 *    disfrazarse de oficial por estar en el mismo array.
 *
 * 2. UN COCHE QUE NO ESTÉ AQUÍ DEVUELVE `null` → la interfaz dice SIN DATOS.
 *    NUNCA un valor por defecto. Un valor por defecto miente, y encima con
 *    confianza. Y va a pasar: el registro oficial cubre el 87% de lo que se ve
 *    en la calle, porque cada bus nuevo aparece antes en la calle que en un
 *    documento.
 */

interface RawVehicle {
  coche: number;
  matricula: string | null;
  fechaMatriculacion: string | null;
  fabricante: string;
  modelo: string;
  longitudM: number | null;
  clase: string | null;
  propulsion: string | null;
  fuente: string;
  confianza: string;
}

interface RawFleet {
  _meta: { fuentes: { id: string; vehiculos: number }[] };
  vehiculos: RawVehicle[];
}

const LENGTHS = new Set([10, 12, 18]);
const FUELS = new Set<Fuel>(['diesel', 'hibrido', 'electrico']);
const CLASSES = new Set<BusClass>(['sencillo', 'articulado', 'microbus_pmrs']);

export interface Fleet {
  /** `null` si el coche no está en el maestro. **SIN DATOS**, no un defecto. */
  get(id: VehicleId): BusProfile | null;
  readonly size: number;
  readonly controls: readonly ControlReport[];
}

export function loadFleet(path: string): Fleet {
  if (!existsSync(path)) {
    throw new IngestError(
      `El maestro de flota no está en ${path}.`,
      'Sin él, ZetaBus no puede decir si un bus es articulado — que es justo lo que no dice nadie más.',
    );
  }

  let raw: RawFleet;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) as RawFleet;
  } catch (e) {
    throw new IngestError(`El maestro de flota no es JSON válido: ${(e as Error).message}`);
  }
  if (!Array.isArray(raw.vehiculos)) {
    throw new IngestError('El maestro de flota no tiene un array `vehiculos`.');
  }

  const byId = new Map<string, BusProfile>();
  for (const v of raw.vehiculos) {
    if (!Number.isInteger(v.coche)) {
      throw new IngestError(`Vehículo con número ilegible: ${JSON.stringify(v).slice(0, 90)}`);
    }
    const key = String(v.coche);
    if (byId.has(key)) {
      throw new IngestError(
        `El coche ${key} aparece dos veces en el maestro.`,
        'Un duplicado significa que dos fuentes se pisan. Hay que decidir cuál manda, no dejar que gane la última.',
      );
    }

    // ── Validaciones que FALLAN, no que rellenan ──────────────────────────
    const len = v.longitudM;
    if (len !== null && !LENGTHS.has(len)) {
      throw new IngestError(
        `El coche ${key} declara una longitud de ${len} m, que no existe en esta flota (10 / 12 / 18).`,
        'Si aparece una longitud nueva, hay que MIRARLA, no redondearla a la más cercana.',
      );
    }
    const clase = v.clase;
    if (clase !== null && !CLASSES.has(clase as BusClass)) {
      throw new IngestError(`El coche ${key} declara una clase desconocida: "${clase}".`);
    }
    const fuel = v.propulsion;
    if (fuel !== null && !FUELS.has(fuel as Fuel)) {
      throw new IngestError(`El coche ${key} declara una propulsión desconocida: "${fuel}".`);
    }
    const conf = v.confianza;
    if (conf !== 'oficial' && conf !== 'sin_verificar') {
      throw new IngestError(
        `El coche ${key} tiene una confianza desconocida: "${conf}".`,
        'Solo hay dos valores, y el campo viaja hasta la pantalla. No se puede improvisar un tercero.',
      );
    }

    // Coherencia interna: la clase debe salir de la longitud, no del modelo.
    if (len !== null && clase !== 'microbus_pmrs' && classFromLength(len) !== clase) {
      throw new IngestError(
        `El coche ${key} dice "${clase}" pero mide ${len} m (le tocaría "${classFromLength(len)}").`,
        'Esto es exactamente el error del fichero heredado: la clase y la longitud no cuadran.',
      );
    }

    byId.set(key, {
      mode: 'bus',
      manufacturer: v.fabricante,
      model: v.modelo,
      lengthMeters: (len as 10 | 12 | 18 | null) ?? null,
      busClass: (clase as BusClass) ?? 'sencillo',
      fuel: (fuel as Fuel) ?? null,
      registeredOn: v.fechaMatriculacion,
      plate: v.matricula,
      confidence: conf as Confidence,
    });
  }

  // ⭐ CONTADOR DE CONTROL INDEPENDIENTE (L1).
  //    Lo esperado NO se cuenta con `raw.vehiculos.length` —eso sería contar con
  //    el mismo método con el que extraigo—. Se cuenta con la METAINFORMACIÓN
  //    que el propio fichero declara sobre sus fuentes: 350 + 53.
  const declared = raw._meta?.fuentes?.reduce((a, f) => a + (f.vehiculos ?? 0), 0);
  if (typeof declared !== 'number' || declared === 0) {
    throw new IngestError(
      'El maestro de flota no declara cuántos vehículos aporta cada fuente (`_meta.fuentes[].vehiculos`).',
      'Sin esa cifra no hay contador de control independiente, y un parser sin contador miente con confianza. Ver docs/LECCIONES.md · L1.',
    );
  }
  const ctl = control(
    'flota: vehículos del maestro',
    declared,
    byId.size,
    'suma de `_meta.fuentes[].vehiculos` declarada por el propio fichero (independiente del recorrido del array)',
  );

  return {
    get: (id: VehicleId) => byId.get(String(id)) ?? null, // ← null = SIN DATOS
    size: byId.size,
    controls: [ctl],
  };
}

export const asVehicleId = (coche: string | number): VehicleId => vehicleId(String(coche));
