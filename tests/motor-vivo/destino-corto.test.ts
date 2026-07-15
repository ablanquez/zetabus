/**
 * ⭐ LAS ÚLTIMAS SALIDAS SE JUZGAN POR SU DESTINO: solo cuentan las que LLEGAN.
 *
 * Antonio, cotejando con Avanza: en →Seminario aparecían como "última salida"
 * expediciones que acaban antes (en P. Mina) y NO llegan a Seminario. Quien espera
 * en Seminario después no tiene bus, y le decíamos que sí.
 *
 * Se prueba la MÁQUINA con feeds de juguete (deterministas):
 *   1) una corta por el final (última parada ≠ terminal) NO entra en las últimas;
 *   2) las PRIMERAS no se tocan: una corta sí puede ser la primera del día;
 *   3) una que empieza a mitad pero SÍ llega a la terminal, se queda (con su origen);
 *   4) destino AMBIGUO (dos terminales, modal ≠ terminal oficial): NO se filtra.
 */

import { describe, it, expect } from 'vitest';
import { calcularTerminales, type SalidaDeTerminal } from '@/sources/gtfs-nap/terminal';

const DESDE = new Date(2026, 6, 15); // miércoles → laborable
const CAL = ['service_id,date,exception_type', 'S1,20260715,1'].join('\n');
const NOMBRES: Record<string, string> = { A: 'Cabecera', MID: 'P. Mina', FIN: 'Seminario', X: 'Otra Terminal' };
const nombreDeParada = (id: string) => NOMBRES[id] ?? id;

function feed(trips: { trip: string; route: string; dir: string; paradas: [string, string][] }[]) {
  const t = ['route_id,service_id,trip_id,direction_id'];
  const st = ['trip_id,stop_id,departure_time,stop_sequence'];
  for (const tr of trips) {
    t.push(`${tr.route},S1,${tr.trip},${tr.dir}`);
    tr.paradas.forEach(([stop, hm], i) => st.push(`${tr.trip},${stop},${hm}:00,${i + 1}`));
  }
  return { tripsTxt: t.join('\n'), stopTimesTxt: st.join('\n') };
}
const minutos = (ss: readonly SalidaDeTerminal[]) => ss.map((s) => s.minuto);

describe('calcularTerminales · las últimas salen por su destino', () => {
  // R1 →Seminario (terminal FIN). Completas A→FIN a 06:00 / 22:00 / 23:00; y DOS
  // cortas A→MID: una temprana (05:00) y una TARDÍA (23:30) que hoy mentiría como
  // "última salida". La tardía NO debe entrar en las últimas.
  const r1 = feed([
    { trip: 'c1', route: 'R1', dir: '0', paradas: [['A', '06:00'], ['MID', '06:10'], ['FIN', '06:20']] },
    { trip: 'c2', route: 'R1', dir: '0', paradas: [['A', '22:00'], ['MID', '22:10'], ['FIN', '22:20']] },
    { trip: 'c3', route: 'R1', dir: '0', paradas: [['A', '23:00'], ['MID', '23:10'], ['FIN', '23:20']] },
    { trip: 'corta-pronto', route: 'R1', dir: '0', paradas: [['A', '05:00'], ['MID', '05:10']] },
    { trip: 'corta-tarde', route: 'R1', dir: '0', paradas: [['A', '23:30'], ['MID', '23:40']] },
    // una que EMPIEZA a mitad (en MID) pero SÍ llega a FIN: se queda, marcada.
    { trip: 'empieza-mid', route: 'R1', dir: '0', paradas: [['MID', '23:15'], ['FIN', '23:25']] },
  ]);
  const oficialR1 = (route: string) => (route === 'R1' ? 'FIN' : undefined);
  const dia1 = () => {
    const res = calcularTerminales(CAL, r1.tripsTxt, r1.stopTimesTxt, DESDE, nombreDeParada, oficialR1);
    return res.terminales.find((x) => x.lineId === 'R1')!.dias.find((d) => d.tipo === 'laborable')!;
  };

  it('⛔ la corta TARDÍA (23:30 → P. Mina) NO entra en las últimas: no llega a Seminario', () => {
    const d = dia1();
    // La última salida real es la 23:00 (c3) o la 23:15 (empieza-mid), NO la 23:30.
    expect(minutos(d.ultimas), 'la 23:30 (1410) queda fuera').not.toContain(23 * 60 + 30);
    // Y la última de verdad SÍ llega (23:15 empieza-mid o 23:00): la mayor de ultimas < 23:30.
    expect(Math.max(...minutos(d.ultimas)), 'la última mostrada llega a Seminario').toBeLessThan(23 * 60 + 30);
  });

  it('las PRIMERAS no se tocan: la corta de las 05:00 SÍ es la primera del día', () => {
    const d = dia1();
    expect(minutos(d.primeras)[0], 'la primera es la 05:00, aunque sea corta').toBe(5 * 60);
  });

  it('una que EMPIEZA a mitad pero LLEGA a la terminal se queda, marcada con su origen', () => {
    const d = dia1();
    const s = d.ultimas.find((x) => x.minuto === 23 * 60 + 15);
    expect(s, 'la 23:15 (empieza en P. Mina, llega a Seminario) está en las últimas').toBeDefined();
    expect(s!.origen, 'y va marcada "empieza en P. Mina"').toBe('P. Mina');
  });

  it('⛔ CONTRAPRUEBA · sin el filtro, la 23:30 sería la última (y es falso)', () => {
    // El orden CRUDO por minuto pondría la 23:30 la última. El filtro la saca.
    const d = dia1();
    const todasPorMinuto = [5 * 60, 6 * 60, 22 * 60, 23 * 60, 23 * 60 + 15, 23 * 60 + 30];
    expect(Math.max(...todasPorMinuto), 'cruda, la mayor es la 23:30').toBe(23 * 60 + 30);
    expect(minutos(d.ultimas), 'filtrada, la 23:30 no está').not.toContain(23 * 60 + 30);
  });

  // R2: destino AMBIGUO. Dos terminales de verdad, X (mayoría) y FIN (oficial).
  // Como el modal (X) ≠ terminal oficial (FIN), NO se filtra: se dejan todas.
  const r2 = feed([
    { trip: 'a1', route: 'R2', dir: '0', paradas: [['A', '20:00'], ['X', '20:20']] },
    { trip: 'a2', route: 'R2', dir: '0', paradas: [['A', '21:00'], ['X', '21:20']] },
    { trip: 'a3', route: 'R2', dir: '0', paradas: [['A', '22:00'], ['X', '22:20']] },
    { trip: 'b1', route: 'R2', dir: '0', paradas: [['A', '23:00'], ['FIN', '23:30']] },
  ]);
  it('⚠️ destino AMBIGUO (modal X ≠ terminal oficial FIN): NO se filtra, se dejan todas', () => {
    const res = calcularTerminales(CAL, r2.tripsTxt, r2.stopTimesTxt, DESDE, nombreDeParada, () => 'FIN');
    const d = res.terminales.find((x) => x.lineId === 'R2')!.dias.find((x) => x.tipo === 'laborable')!;
    // Las 4 salen; ninguna se descarta (una a X, otra a FIN, todas son terminal real).
    expect(minutos(d.ultimas).sort((a, b) => a - b)).toEqual([20 * 60, 21 * 60, 22 * 60, 23 * 60]);
  });

  it('menos de 5 completas: se enseñan las que haya, NO se rellena con cortas', () => {
    // R3: 3 completas (mayoría → terminal FIN es fiable) + 2 cortas TARDÍAS. Las
    // últimas deben ser SOLO las 3 completas, aunque las cortas sean más tardías.
    const r3 = feed([
      { trip: 'k1', route: 'R3', dir: '0', paradas: [['A', '06:00'], ['FIN', '06:20']] },
      { trip: 'k2', route: 'R3', dir: '0', paradas: [['A', '07:00'], ['FIN', '07:20']] },
      { trip: 'k3', route: 'R3', dir: '0', paradas: [['A', '08:00'], ['FIN', '08:20']] },
      { trip: 'x1', route: 'R3', dir: '0', paradas: [['A', '22:00'], ['MID', '22:10']] },
      { trip: 'x2', route: 'R3', dir: '0', paradas: [['A', '23:00'], ['MID', '23:10']] },
    ]);
    const res = calcularTerminales(CAL, r3.tripsTxt, r3.stopTimesTxt, DESDE, nombreDeParada, () => 'FIN');
    const d = res.terminales.find((x) => x.lineId === 'R3')!.dias.find((x) => x.tipo === 'laborable')!;
    expect(minutos(d.ultimas), 'solo las 3 completas, no rellena con las cortas tardías').toEqual([6 * 60, 7 * 60, 8 * 60]);
  });
});
