/**
 * ⭐⭐ LA PROCEDENCIA, CAMPO A CAMPO.
 *
 * En la Tanda 8 yo defendí que un vehículo debía tener UNA fuente, y no una por
 * campo: *"mezclar procedencias produce fichas Frankenstein de las que ya no se
 * puede decir «esto viene de aquí»"*.
 *
 * ⛔ Y perdí. El sistema estaba OBLIGANDO A CALLARSE que el 4114 mide 12 metros
 * —porque busesmadrid.es no publica longitudes— existiendo alguien que se sube a
 * él todas las semanas. **Eso es dejar de informar por pureza de diseño.**
 *
 * ⭐ Mi objeción no se tira: SE CONVIERTE EN EL REQUISITO. Que de cada campo se
 * pueda decir de dónde viene. **Eso no es Frankenstein: es trazabilidad.**
 *
 * Este fichero es el cerrojo de esa promesa.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadFleet } from '@/sources/flota-zetabus/adapter';
import { confianzaDeLaFicha } from '@/modes/bus/profile';

const MAESTRO = 'data/flota-avanza-zaragoza.json';
interface Campo {
  valor: unknown;
  procedencia: { fuente: string; confidence: string; quien?: string; fecha?: string; comoLoSupe?: string };
}
const crudo = JSON.parse(readFileSync(MAESTRO, 'utf8')) as {
  _meta: {
    fuentes: { id: string; confianza: string; vehiculos: number; campos: number; url: string | null }[];
    discrepancias: { coche: number; campo: string }[];
    yaSobranEnLaObservacion: { coche: number; campo: string }[];
  };
  vehiculos: (Record<string, unknown> & { coche: number; confianza: string; campos: Record<string, Campo> })[];
};
const flota = loadFleet(MAESTRO);
const coche = (n: number) => crudo.vehiculos.find((v) => v.coche === n)!;
const p = (n: string) => join(mkdtempSync(join(tmpdir(), 'zeta-')), n);

describe('el maestro: CUATRO fuentes, y la procedencia BAJA AL CAMPO', () => {
  it('403 vehículos, y NI UN SOLO campo sin padre', () => {
    expect(crudo.vehiculos.length).toBe(403);
    const CAMPOS = ['matricula', 'fechaMatriculacion', 'fabricante', 'modelo', 'longitudM', 'clase', 'propulsion'];
    for (const v of crudo.vehiculos) {
      for (const c of CAMPOS) {
        if (v[c] === null || v[c] === undefined) continue;
        expect(v.campos[c], `${v.coche} afirma ${c} sin decir de dónde`).toBeDefined();
        expect(v.campos[c].valor).toBe(v[c]); // lo plano y la procedencia, lo MISMO
      }
    }
  });

  it('⭐ LA FICHA DEL 4114 — cada campo, con su fuente', () => {
    const v = coche(4114);
    const de = (c: string) => v.campos[c].procedencia;

    // De busesmadrid.es: lo que ELLA publica.
    expect(de('matricula').confidence).toBe('fuente_secundaria');
    expect(v.matricula).toBe('7882-MZP');
    expect(de('modelo').confidence).toBe('fuente_secundaria');
    expect(de('propulsion').confidence).toBe('fuente_secundaria');

    // ⭐ Y LA LONGITUD, DE ANTONIO. Que es TODA la tanda:
    //   busesmadrid CALLA la longitud, y el silencio de una fuente NO gana a un
    //   dato de otra. Antes, este coche salía SIN METROS existiendo alguien que
    //   se sube a él todas las semanas.
    expect(v.longitudM).toBe(12);
    expect(de('longitudM').confidence).toBe('observacion_propia');
    expect(de('longitudM').quien).toBe('Antonio Blánquez');
    expect(de('longitudM').fecha).toBe('2026-07-14');
    expect(de('longitudM').comoLoSupe).toMatch(/no porque lo deduzca de un catálogo/i);

    // ⚠️ Y LA MATRÍCULA SIGUE SIN INVENTARSE. Esa regla no la toca nadie.
    expect(coche(4124).matricula).toBeNull();
  });

  it('⭐ …y la FICHA lleva el † aunque 3 de sus 4 campos sean de busesmadrid', () => {
    expect(coche(4114).confianza).toBe('observacion_propia');
    expect(flota.get('4114' as never)!.confidence).toBe('observacion_propia');
  });

  it('un vehículo ENTERO de busesmadrid sigue siendo `*`', () => {
    // El 4640 es un Irisbus: busesmadrid lo cubre, y Antonio no afirma nada de él.
    const v = coche(4640);
    expect(v.confianza).toBe('fuente_secundaria');
    for (const c of ['clase', 'propulsion']) expect(v.campos[c].procedencia.confidence).toBe('fuente_secundaria');
  });

  it('⚠️ los 3 que quedan SIN VERIFICAR, y siguen sin enseñar metros', () => {
    const sv = crudo.vehiculos.filter((v) => v.confianza === 'sin_verificar');
    expect(sv.map((v) => v.coche)).toEqual([4610, 4617, 4923]);
    // El heredado SÍ traía una longitud. Tiene un 20% de error medido. No se enseña.
    for (const v of sv) expect(v.longitudM).toBeNull();
  });

  it('⚠️ hoy NADIE se contradice — y el maestro lo dice, no lo calla', () => {
    expect(crudo._meta.discrepancias).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('⛔⛔ LOS TRES CERROJOS. Y las tres contrapruebas.', () => {
  const base = {
    coche: 1, fabricante: 'V', modelo: 'M', longitudM: 12, clase: 'sencillo',
    propulsion: 'diesel', matricula: null, fechaMatriculacion: null,
  };
  const campos = (conf: string, extra: Record<string, unknown> = {}) => ({
    fabricante: { valor: 'V', procedencia: { fuente: 'x', confidence: conf } },
    modelo: { valor: 'M', procedencia: { fuente: 'x', confidence: conf } },
    longitudM: { valor: 12, procedencia: { fuente: 'x', confidence: conf } },
    clase: { valor: 'sencillo', procedencia: { fuente: 'x', confidence: conf } },
    propulsion: { valor: 'diesel', procedencia: { fuente: 'x', confidence: conf } },
    ...extra,
  });
  const escribir = (n: string, vehiculos: unknown[]) => {
    const f = p(n);
    writeFileSync(f, JSON.stringify({ _meta: { fuentes: [{ id: 'x', vehiculos: 1 }] }, vehiculos }));
    return f;
  };

  it('⛔ CONTRAPRUEBA 1 · un valor SIN procedencia → REVIENTA', () => {
    const f = escribir('sin-padre.json', [{
      ...base,
      matricula: '1234-ABC', // ← un valor plano que NADIE afirma
      confianza: 'oficial',
      campos: campos('oficial'),
    }]);
    expect(() => loadFleet(f)).toThrow(/SIN DECIR DE DÓNDE SALE/i);
  });

  it('⛔ CONTRAPRUEBA 2 · una observación sin autor / sin fecha / sin cómo → REVIENTA', () => {
    const f = escribir('sin-custodia.json', [{
      ...base,
      confianza: 'observacion_propia',
      campos: campos('oficial', {
        longitudM: { valor: 12, procedencia: { fuente: 'observacion-propia', confidence: 'observacion_propia' } },
      }),
    }]);
    expect(() => loadFleet(f)).toThrow(/SIN autor, SIN fecha o SIN "cómo lo supe"/i);
  });

  /**
   * ⭐⭐ LA QUE IMPORTA. **Es el ataque que la procedencia por campo hace posible:**
   * coges un vehículo, le pones seis campos del pliego municipal y UNO observado,
   * y la ficha sale impecable — con un dato que nadie ha publicado nunca dentro.
   */
  it('⛔⛔ CONTRAPRUEBA 3 · UNA FICHA NO SE BLANQUEA', () => {
    const f = escribir('blanqueada.json', [{
      ...base,
      confianza: 'oficial', // 💀 la mentira
      campos: campos('oficial', {
        longitudM: {
          valor: 12,
          procedencia: {
            fuente: 'observacion-propia', confidence: 'observacion_propia',
            quien: 'Antonio', fecha: '2026-07-14', comoLoSupe: 'me subo',
          },
        },
      }),
    }]);
    expect(() => loadFleet(f)).toThrow(/no se blanquea/i);
    expect(() => loadFleet(f)).toThrow(/el campo más débil que ENSEÑA es "observacion_propia"/i);
  });

  it('⭐ y la confianza NO se lee del fichero: SE CALCULA', () => {
    // Aunque el JSON dijera "oficial", el adaptador recalcula desde los campos.
    // Por eso el cerrojo 3 es posible: hay DOS fuentes de verdad que tienen que
    // coincidir, y cuando no coinciden, gana la más pesimista y se avisa.
    expect(confianzaDeLaFicha({
      clase: { fuente: 'a', confidence: 'oficial' },
      propulsion: { fuente: 'a', confidence: 'oficial' },
      longitudM: { fuente: 'b', confidence: 'observacion_propia' },
    })).toBe('observacion_propia');

    // ⚠️ Y un campo NULO no ensucia: un silencio no es una afirmación débil.
    expect(confianzaDeLaFicha({
      clase: { fuente: 'a', confidence: 'oficial' },
      propulsion: { fuente: 'a', confidence: 'oficial' },
    })).toBe('oficial');

    // ⚠️ Y la MATRÍCULA no cuenta: no se enseña en la ficha. Marcar un autobús
    //    con † por un dato que el usuario no puede ni ver sería un aviso hueco.
    expect(confianzaDeLaFicha({
      clase: { fuente: 'a', confidence: 'oficial' },
      matricula: { fuente: 'b', confidence: 'observacion_propia', quien: 'x', fecha: 'y', comoLoSupe: 'z' },
    })).toBe('oficial');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('⭐ EL SILENCIO DE UNA FUENTE NO GANA A UN DATO DE OTRA', () => {
  it('⭐ 36 vehículos han ganado longitud gracias a la observación de serie', () => {
    const conLongitudDeAntonio = crudo.vehiculos.filter(
      (v) => v.campos.longitudM?.procedencia.confidence === 'observacion_propia',
    );
    expect(conLongitudDeAntonio.length).toBe(36);
    // Y todos son eCitaro: la regla de serie NO toca a nadie más.
    for (const v of conLongitudDeAntonio) expect(String(v.modelo)).toMatch(/^eCitaro/);
  });

  it('⚠️ la regla de serie NO alcanza a un Irisbus, aunque el número empiece por 4', () => {
    // La serie no es el número: es el número Y el modelo. Si esto fallara,
    // habríamos puesto 12 metros a autobuses que Antonio nunca ha mirado.
    for (const c of [4610, 4617, 4640, 4644]) {
      expect(coche(c).campos.longitudM?.procedencia.confidence).not.toBe('observacion_propia');
    }
  });

  it('⛔ y donde el PLIEGO habla, manda el pliego — la serie no lo pisa', () => {
    // Todos los oficiales conservan su longitud del Anexo 5.
    const oficiales = crudo.vehiculos.filter((v) => v.confianza === 'oficial');
    expect(oficiales.length).toBe(350);
    for (const v of oficiales) {
      if (v.longitudM === null) continue;
      expect(v.campos.longitudM.procedencia.confidence).toBe('oficial');
    }
  });
});
