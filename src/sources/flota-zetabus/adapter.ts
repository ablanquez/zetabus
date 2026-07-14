import { readFileSync, existsSync } from 'node:fs';
import { control, IngestError, vehicleId, type Confidence, type ControlReport, type ProcedenciaDeCampo, type VehicleId } from '@/core';
import {
  classFromLength,
  confianzaDeLaFicha,
  type BusClass,
  type BusProfile,
  type CampoDeFicha,
  type Fuel,
} from '@/modes/bus/profile';

/** Los siete campos que un vehículo puede afirmar. Cada uno con su padre. */
const CAMPOS_DE_FICHA: readonly CampoDeFicha[] = [
  'matricula', 'fechaMatriculacion', 'fabricante', 'modelo', 'longitudM', 'clase', 'propulsion',
];

/**
 * EL MAESTRO DE FLOTA.
 *
 * Lo genera `scripts/build-flota.ts` a partir de CUATRO fuentes, cada una con su
 * nivel de confianza. ⛔ No se edita a mano: se regenera (L3).
 *
 * ⚠️ DOS REGLAS QUE NO SE TOCAN:
 *
 * 1. `confidence` VIAJA HASTA LA INTERFAZ. Un dato de una web de aficionados no
 *    puede disfrazarse de pliego municipal por estar en el mismo array.
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
  confianza: string;
  /** ⭐ De dónde sale CADA campo. Es la fuente de la verdad; lo plano es su reflejo. */
  campos: Record<string, { valor: unknown; procedencia: ProcedenciaDeCampo }>;
}

interface RawFleet {
  _meta: { fuentes: { id: string; vehiculos: number }[] };
  vehiculos: RawVehicle[];
}

const LENGTHS = new Set([10, 12, 18]);
const FUELS = new Set<Fuel>(['diesel', 'hibrido', 'electrico']);
const CLASSES = new Set<BusClass>(['sencillo', 'articulado', 'microbus_pmrs']);
/**
 * ⚠️ LOS CUATRO. Ni uno más.
 *
 * No es una lista para "aceptar valores": es una lista para RECHAZARLOS. Un
 * `confianza: "bastante_seguro"` que se colara aquí llegaría a la pantalla y
 * pintaría un chip sin marcar, que es exactamente cómo el fichero heredado
 * disfrazaba de dato oficial lo que alguien había tecleado a mano.
 */
const CONFIANZAS = new Set<Confidence>([
  'oficial',
  'fuente_secundaria',
  'observacion_propia',
  'sin_verificar',
]);

export interface Fleet {
  /** `null` si el coche no está en el maestro. **SIN DATOS**, no un defecto. */
  get(id: VehicleId): BusProfile | null;
  /** Para hornear la flota en el artefacto de build. En runtime no se lee disco. */
  readonly perfiles: Readonly<Record<string, BusProfile>>;
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
    if (!CONFIANZAS.has(conf as Confidence)) {
      throw new IngestError(
        `El coche ${key} tiene una confianza desconocida: "${conf}".`,
        `Solo hay cuatro valores (${[...CONFIANZAS].join(', ')}), y el campo viaja hasta la pantalla. No se puede improvisar un quinto.`,
      );
    }

    // Coherencia interna: la clase debe salir de la longitud, no del modelo.
    if (len !== null && clase !== 'microbus_pmrs' && classFromLength(len) !== clase) {
      throw new IngestError(
        `El coche ${key} dice "${clase}" pero mide ${len} m (le tocaría "${classFromLength(len)}").`,
        'Esto es exactamente el error del fichero heredado: la clase y la longitud no cuadran.',
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⭐⭐ LA PROCEDENCIA POR CAMPO. Y TRES CERROJOS, PORQUE ESTO ES PELIGROSO.
    // ═══════════════════════════════════════════════════════════════════════
    if (!v.campos || typeof v.campos !== 'object') {
      throw new IngestError(
        `El coche ${key} no trae \`campos\`: no se puede decir de dónde sale cada dato.`,
        'La procedencia por campo NO es opcional. Un valor sin padre es un rumor.',
      );
    }

    const procedencias: Partial<Record<CampoDeFicha, ProcedenciaDeCampo>> = {};
    for (const campo of CAMPOS_DE_FICHA) {
      const valorPlano = (v as unknown as Record<string, unknown>)[campo] ?? null;
      const c = v.campos[campo];

      // CERROJO 1 · UN VALOR SIN PROCEDENCIA NO ENTRA.
      if (valorPlano !== null && !c) {
        throw new IngestError(
          `El coche ${key} afirma "${campo}" = ${JSON.stringify(valorPlano)} SIN DECIR DE DÓNDE SALE.`,
          'Es el pecado del JSON heredado: dato correcto, origen desconocido, toda la confianza del mundo.',
        );
      }
      if (!c) continue;

      // CERROJO 2 · LO PLANO Y LA PROCEDENCIA TIENEN QUE DECIR LO MISMO. Si el
      //   fichero se edita a mano —y no se debe—, los dos se separan en silencio.
      if (c.valor !== valorPlano) {
        throw new IngestError(
          `El coche ${key}: el campo "${campo}" vale ${JSON.stringify(valorPlano)} pero su procedencia dice ${JSON.stringify(c.valor)}.`,
          'El maestro se REGENERA (`npm run flota:build`), no se edita a mano.',
        );
      }

      // CERROJO 3 · Y LA CONFIANZA DE CADA CAMPO ES UNA DE LAS CUATRO.
      if (!CONFIANZAS.has(c.procedencia?.confidence)) {
        throw new IngestError(
          `El coche ${key}: el campo "${campo}" declara una confianza desconocida: "${c.procedencia?.confidence}".`,
        );
      }
      // Y si es una observación, TIENE que decir quién, cuándo y cómo lo sabe.
      if (c.procedencia.confidence === 'observacion_propia') {
        const { quien, fecha, comoLoSupe } = c.procedencia;
        if (!quien || !fecha || !comoLoSupe) {
          throw new IngestError(
            `El coche ${key}: el campo "${campo}" es una observación SIN autor, SIN fecha o SIN "cómo lo supe".`,
            'Una afirmación editorial sin cadena de custodia no llega a la pantalla.',
          );
        }
      }
      procedencias[campo] = c.procedencia;
    }

    // ⭐⭐ EL CERROJO QUE IMPORTA: **LA FICHA NO SE BLANQUEA.**
    //
    //   La confianza NO se lee del fichero: SE CALCULA, aquí, a partir de las
    //   procedencias de los campos que la pantalla enseña. Si alguien editara el
    //   maestro y pusiera `confianza: "oficial"` en un coche cuya longitud viene de
    //   Antonio, esto lo caza. **Que es exactamente el ataque que la procedencia por
    //   campo hace posible**: 6 campos del pliego, 1 observado, y la ficha impecable.
    const calculada = confianzaDeLaFicha(procedencias);
    if (calculada !== conf) {
      throw new IngestError(
        `El coche ${key} se declara "${conf}" pero el campo más débil que ENSEÑA es "${calculada}".`,
        'Una ficha no se blanquea. Si un solo dato visible viene de una observación, la ficha entera lo dice.',
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
      confidence: calculada, // ← CALCULADA, no leída
      procedencias,
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
    perfiles: Object.fromEntries(byId),
    size: byId.size,
    controls: [ctl],
  };
}

export const asVehicleId = (coche: string | number): VehicleId => vehicleId(String(coche));
