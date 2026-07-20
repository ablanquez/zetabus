/**
 * EL MODELO DEL BLOQUE DE SALIDAS. Casos tomados del dato REAL de la red
 * (`docs/DATOS_CRUDOS_SALIDAS_RED_COMPLETA.md`), no inventados: el par mayoritario
 * sobre las dos tablas juntas, el desempate por la salida más temprana, las marcas
 * por orden de aparición, y el sentido sin tabla.
 */

import { describe, expect, it } from 'vitest';
import { modelarSalidas, parsearFrecuencia } from '@/engine/salidas';
import type { HorarioWeb, SalidaWeb } from '@/sources/avanza/horario';

const s = (hora: string, desde: string, hasta: string): SalidaWeb => ({ hora, desde, hasta });
const horario = (
  primeras: SalidaWeb[],
  ultimas: SalidaWeb[],
  extra: Partial<HorarioWeb> = {},
): HorarioWeb => ({ primeras, ultimas, info: null, frecuencia: null, ...extra });

describe('modelarSalidas', () => {
  it('sin excepciones (el 71 % de la red): cabecera con el par, cero marcas, cero notas', () => {
    const h = horario(
      [s('05:00', 'PARQUE GOYA', 'SEMINARIO'), s('05:33', 'PARQUE GOYA', 'SEMINARIO')],
      [s('21:51', 'PARQUE GOYA', 'SEMINARIO')],
    );
    const m = modelarSalidas(h);
    expect(m.hay).toBe(true);
    expect(m.cabecera).toEqual({ destino: 'SEMINARIO', origen: 'PARQUE GOYA' });
    expect(m.primeras.every((x) => x.marca === null)).toBe(true);
    expect(m.notas).toEqual([]);
  });

  it('⭐ mayoría sobre las DOS tablas juntas (23 `-1`): ninguna tabla sola la tiene', () => {
    // Primeras: tres pares empatados a 2. Sumando últimas, PARQUE VENECIA→CLARA gana.
    const m = modelarSalidas(
      horario(
        [
          s('04:51', 'P. PAMPLONA, 12', 'CLARA CAMPOAMOR'),
          s('05:15', 'P. PAMPLONA, 12', 'CLARA CAMPOAMOR'),
          s('05:15', 'PARQUE VENECIA', 'CLARA CAMPOAMOR'),
          s('05:45', 'PARQUE VENECIA', 'CLARA CAMPOAMOR'),
          s('06:10', 'PARQUE VENECIA', 'CDM. SIGLO XXI'),
          s('06:35', 'PARQUE VENECIA', 'CDM. SIGLO XXI'),
        ],
        [
          s('21:20', 'PARQUE VENECIA', 'CDM. SIGLO XXI'),
          s('22:20', 'PARQUE VENECIA', 'CLARA CAMPOAMOR'),
          s('22:32', 'PARQUE VENECIA', 'CLARA CAMPOAMOR'),
          s('22:46', 'PARQUE VENECIA', 'CLARA CAMPOAMOR'),
          s('00:10', 'P. PAMPLONA, 12', 'CLARA CAMPOAMOR'),
        ],
      ),
    );
    expect(m.cabecera).toEqual({ destino: 'CLARA CAMPOAMOR', origen: 'PARQUE VENECIA' });
    // Marcas por PRIMERA aparición: Pamplona (04:51) = a, Siglo XXI (06:10) = b.
    expect(m.primeras.map((x) => x.marca)).toEqual(['a', 'a', null, null, 'b', 'b']);
    expect(m.notas).toEqual([
      { marca: 'a', texto: 'sale de P. PAMPLONA, 12, no de PARQUE VENECIA' },
      { marca: 'b', texto: 'termina en CDM. SIGLO XXI, no en CLARA CAMPOAMOR' },
    ]);
  });

  it('⚠️ las dos salidas a la misma hora (05:15) NO se deduplican; van las dos', () => {
    const m = modelarSalidas(
      horario(
        [s('05:15', 'P. PAMPLONA, 12', 'CLARA CAMPOAMOR'), s('05:15', 'PARQUE VENECIA', 'CLARA CAMPOAMOR')],
        [s('22:00', 'PARQUE VENECIA', 'CLARA CAMPOAMOR'), s('22:10', 'PARQUE VENECIA', 'CLARA CAMPOAMOR')],
      ),
    );
    expect(m.primeras).toHaveLength(2);
    expect(m.primeras.map((x) => x.hora)).toEqual(['05:15', '05:15']);
  });

  it('⚠️ EMPATE (41 `-2`, 2 vs 2): desempata la salida más temprana', () => {
    const m = modelarSalidas(
      horario(
        [s('06:00', 'ROSALES DEL CANAL', 'PUERTA DEL CARMEN')],
        [
          s('22:22', 'ROSALES DEL CANAL', 'PUERTA DEL CARMEN'),
          s('22:55', 'ROSALES DEL CANAL', 'H. CORTES, 9'),
          s('23:30', 'ROSALES DEL CANAL', 'H. CORTES, 9'),
        ],
      ),
    );
    // Los dos pares empatan a 2; gana el de la salida de las 06:00.
    expect(m.cabecera).toEqual({ destino: 'PUERTA DEL CARMEN', origen: 'ROSALES DEL CANAL' });
    expect(m.ultimas.map((x) => x.marca)).toEqual([null, 'a', 'a']);
    expect(m.notas).toEqual([{ marca: 'a', texto: 'termina en H. CORTES, 9, no en PUERTA DEL CARMEN' }]);
  });

  it('nota de "ambos distintos" (`de X a Y`) cuando cambian origen y destino a la vez', () => {
    const m = modelarSalidas(
      horario(
        [s('06:00', 'A', 'B'), s('06:10', 'A', 'B'), s('06:20', 'C', 'D')],
        [s('22:00', 'A', 'B')],
      ),
    );
    expect(m.cabecera).toEqual({ destino: 'B', origen: 'A' });
    expect(m.notas).toEqual([{ marca: 'a', texto: 'de C a D' }]);
  });

  it('⚠️ el orden cronológico NO se reordena: la salida de después de medianoche va al final', () => {
    const m = modelarSalidas(
      horario([s('05:45', 'A', 'B')], [s('23:47', 'A', 'B'), s('00:07', 'A', 'B')]),
    );
    expect(m.ultimas.map((x) => x.hora)).toEqual(['23:47', '00:07']); // 00:07 NO se sube al principio
  });

  it('⚠️ sentido SIN tabla (búho): hay=false, para que la pantalla lo diga y no mienta en blanco', () => {
    const m = modelarSalidas(horario([], []));
    expect(m.hay).toBe(false);
    expect(m.cabecera).toBeNull();
  });
});

describe('parsearFrecuencia', () => {
  it('los tres tipos de día, y "uniforme" cuando coinciden', () => {
    expect(parsearFrecuencia('Frecuencia media: laborables: 15, sábados: 15, domingos y festivos: 15 min.')).toEqual({
      uniforme: true,
      laborables: 15,
      sabados: 15,
      festivos: 15,
      literal: 'Frecuencia media: laborables: 15, sábados: 15, domingos y festivos: 15 min.',
    });
  });

  it('cuando difieren, uniforme es false y salen los tres números', () => {
    const f = parsearFrecuencia('Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min.');
    expect(f).toMatchObject({ uniforme: false, laborables: 13, sabados: 17, festivos: 17 });
  });

  it('null si no hay frecuencia', () => {
    expect(parsearFrecuencia(null)).toBeNull();
  });
});
