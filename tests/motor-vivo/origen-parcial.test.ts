/**
 * ⭐ EL ORIGEN REAL DE CADA SALIDA. No todas arrancan en la cabecera.
 *
 * Antonio lo cazó cotejando la 35 con Avanza: hay salidas de refuerzo que
 * empiezan a mitad de línea (Coso n.º 126, no la cabecera). Aquí se prueba la
 * MÁQUINA con un feed de juguete —determinista, sin depender del artefacto— para
 * fijar tres cosas que importan:
 *
 *   1) la CABECERA es la parada de arranque MÁS FRECUENTE (modal), NO la primera
 *      por hora: un refuerzo suele ser el MÁS MADRUGADOR y no por eso es cabecera;
 *   2) una salida parcial lleva el NOMBRE de su origen real;
 *   3) una salida de cabecera NO se marca (origen null). La excepción, no la norma.
 */

import { describe, it, expect } from 'vitest';
import { calcularTerminales, type SalidaDeTerminal } from '@/sources/gtfs-nap/terminal';

// 20260715 es miércoles → laborable. `desde` arranca la búsqueda ahí.
const DESDE = new Date(2026, 6, 15);
const CAL = ['service_id,date,exception_type', 'S1,20260715,1'].join('\n');

const NOMBRES: Record<string, string> = { A1: 'Cabecera', M9: 'Paseo de Ejemplo', B2: 'Final', C3: 'Otra Cabecera', D4: 'Su Final' };
const nombreDeParada = (id: string) => NOMBRES[id] ?? id;

/** Ayuda a montar `stop_times`: cada trip, su lista de [stop, HH:MM]. */
function feed(trips: { trip: string; route: string; dir: string; paradas: [string, string][] }[]) {
  const t = ['route_id,service_id,trip_id,direction_id'];
  const st = ['trip_id,stop_id,departure_time,stop_sequence'];
  for (const tr of trips) {
    t.push(`${tr.route},S1,${tr.trip},${tr.dir}`);
    tr.paradas.forEach(([stop, hm], i) => st.push(`${tr.trip},${stop},${hm}:00,${i + 1}`));
  }
  return { tripsTxt: t.join('\n'), stopTimesTxt: st.join('\n') };
}

describe('calcularTerminales · el origen real de cada salida', () => {
  // R1: 3 salidas desde la cabecera A1 (06/07/08) + 2 PARCIALES desde M9 (una a
  // las 05:00, la MÁS madrugadora de todas).
  const { tripsTxt, stopTimesTxt } = feed([
    { trip: 'T1', route: 'R1', dir: '0', paradas: [['A1', '06:00'], ['B2', '06:20']] },
    { trip: 'T2', route: 'R1', dir: '0', paradas: [['A1', '07:00'], ['B2', '07:20']] },
    { trip: 'T3', route: 'R1', dir: '0', paradas: [['A1', '08:00'], ['B2', '08:20']] },
    { trip: 'T4', route: 'R1', dir: '0', paradas: [['M9', '05:00'], ['B2', '05:10']] },
    { trip: 'T5', route: 'R1', dir: '0', paradas: [['M9', '06:30'], ['B2', '06:40']] },
    // R2: sin parciales, todas desde su cabecera C3.
    { trip: 'U1', route: 'R2', dir: '0', paradas: [['C3', '09:00'], ['D4', '09:15']] },
    { trip: 'U2', route: 'R2', dir: '0', paradas: [['C3', '10:00'], ['D4', '10:15']] },
  ]);
  const res = calcularTerminales(CAL, tripsTxt, stopTimesTxt, DESDE, nombreDeParada);

  const diaDe = (route: string) => {
    const term = res.terminales.find((x) => x.lineId === route && x.directionId === 0)!;
    return term.dias.find((d) => d.tipo === 'laborable')!;
  };
  const porMinuto = (ss: readonly SalidaDeTerminal[], m: number) => ss.find((s) => s.minuto === m)!;

  it('la cabecera es la parada MODAL (A1, 3 salidas), no la más madrugadora (M9, 05:00)', () => {
    const lab = diaDe('R1');
    expect(lab.expediciones).toBe(5);
    // ⛔ CONTRAPRUEBA: si la cabecera se definiera como "la primera salida por
    //    hora", la de 05:00 sería cabecera y NO se marcaría. Es al revés: la
    //    05:00 es PARCIAL (arranca en M9), y va marcada.
    const cincoAM = porMinuto(lab.primeras, 300);
    expect(cincoAM.origen, 'la 05:00 arranca en M9, NO en la cabecera').toBe('Paseo de Ejemplo');
  });

  it('una salida PARCIAL lleva el nombre de su origen real', () => {
    const lab = diaDe('R1');
    expect(porMinuto(lab.primeras, 390).origen, 'la 06:30 arranca en M9').toBe('Paseo de Ejemplo');
    // Hay exactamente 2 parciales (05:00 y 06:30), ambas desde M9.
    const parciales = lab.primeras.filter((s) => s.origen !== null);
    expect(parciales.map((s) => s.minuto).sort((a, b) => a - b)).toEqual([300, 390]);
    expect(parciales.every((s) => s.origen === 'Paseo de Ejemplo')).toBe(true);
  });

  it('una salida de CABECERA no se marca (origen null): la excepción, no la norma', () => {
    const lab = diaDe('R1');
    for (const m of [360, 420, 480]) {
      expect(porMinuto(lab.primeras, m).origen, `la ${m} arranca en cabecera A1`).toBeNull();
    }
  });

  it('⚠️ una línea SIN parciales no inventa distintivos: TODO origen es null', () => {
    const lab = diaDe('R2');
    expect(lab.expediciones).toBe(2);
    expect([...lab.primeras, ...lab.ultimas].every((s) => s.origen === null)).toBe(true);
  });
});
