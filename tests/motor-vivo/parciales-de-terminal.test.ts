/**
 * ⭐ SALIDAS PARCIALES: se DETECTA si una salida empieza/acaba a mitad (booleano).
 *
 * El nombre del punto intermedio ya NO se guarda: con obras el punto teórico del
 * GTFS miente (ver docs/AUDITORIA_TERMINALES_EN_OBRAS.md), así que la pantalla marca
 * con un asterisco y nombra la CABECERA del sentido, no el punto. Aquí se prueba la
 * DETECCIÓN, que sí es fiable:
 *
 *   noViene = la primera parada NO es la cabecera de origen (empieza a mitad).
 *   noLlega = la última parada NO es la cabecera de destino (acaba a mitad).
 *
 * Con feeds de juguete (deterministas). Y la cabecera es la parada MODAL (la más
 * frecuente), no la más madrugadora — esa era la trampa que ya cazamos.
 */

import { describe, it, expect } from 'vitest';
import { calcularTerminales, type SalidaDeTerminal } from '@/sources/gtfs-nap/terminal';

const DESDE = new Date(2026, 6, 15); // miércoles → laborable
const CAL = ['service_id,date,exception_type', 'S1,20260715,1'].join('\n');

function feed(trips: { trip: string; route: string; dir: string; paradas: [string, string][] }[]) {
  const t = ['route_id,service_id,trip_id,direction_id'];
  const st = ['trip_id,stop_id,departure_time,stop_sequence'];
  for (const tr of trips) {
    t.push(`${tr.route},S1,${tr.trip},${tr.dir}`);
    tr.paradas.forEach(([stop, hm], i) => st.push(`${tr.trip},${stop},${hm}:00,${i + 1}`));
  }
  return { tripsTxt: t.join('\n'), stopTimesTxt: st.join('\n') };
}
const porMin = (ss: readonly SalidaDeTerminal[], m: number) => ss.find((s) => s.minuto === m);

describe('calcularTerminales · detección de salidas parciales', () => {
  // Cabecera de origen A (mayoría) y de destino FIN (mayoría). Trips:
  //  · c1/c2/c3 completas A→FIN (la 05:00 corta es la MÁS madrugadora, no cabecera);
  //  · acaba-mid: A→MID (acaba a mitad);
  //  · empieza-mid: MID→FIN (empieza a mitad);
  //  · ambas: MID→MID (las dos cosas).
  const { tripsTxt, stopTimesTxt } = feed([
    { trip: 'c1', route: 'R1', dir: '0', paradas: [['A', '06:00'], ['MID', '06:10'], ['FIN', '06:20']] },
    { trip: 'c2', route: 'R1', dir: '0', paradas: [['A', '22:00'], ['MID', '22:10'], ['FIN', '22:20']] },
    { trip: 'c3', route: 'R1', dir: '0', paradas: [['A', '23:00'], ['MID', '23:10'], ['FIN', '23:20']] },
    { trip: 'madruga', route: 'R1', dir: '0', paradas: [['A', '05:00'], ['MID', '05:10'], ['FIN', '05:20']] },
    { trip: 'acaba-mid', route: 'R1', dir: '0', paradas: [['A', '23:30'], ['MID', '23:40']] },
    { trip: 'empieza-mid', route: 'R1', dir: '0', paradas: [['MID', '23:45'], ['FIN', '23:55']] },
    { trip: 'ambas', route: 'R1', dir: '0', paradas: [['MID', '23:50'], ['MID', '23:52']] },
    // R2 sin parciales: todas A→FIN.
    { trip: 'u1', route: 'R2', dir: '0', paradas: [['A', '09:00'], ['FIN', '09:20']] },
    { trip: 'u2', route: 'R2', dir: '0', paradas: [['A', '10:00'], ['FIN', '10:20']] },
  ]);
  const res = calcularTerminales(CAL, tripsTxt, stopTimesTxt, DESDE);
  const dia = (route: string) => res.terminales.find((x) => x.lineId === route)!.dias.find((d) => d.tipo === 'laborable')!;

  it('la normal (A→FIN) no lleva marca: noViene=false, noLlega=false', () => {
    const s = porMin(dia('R1').ultimas, 23 * 60)!; // c3
    expect(s.noViene).toBe(false);
    expect(s.noLlega).toBe(false);
  });

  it('la que ACABA a mitad (A→MID): noLlega=true, noViene=false', () => {
    const s = porMin(dia('R1').ultimas, 23 * 60 + 30)!; // acaba-mid
    expect(s.noLlega).toBe(true);
    expect(s.noViene).toBe(false);
  });

  it('la que EMPIEZA a mitad (MID→FIN): noViene=true, noLlega=false', () => {
    const s = porMin(dia('R1').ultimas, 23 * 60 + 45)!; // empieza-mid
    expect(s.noViene).toBe(true);
    expect(s.noLlega).toBe(false);
  });

  it('la que corta por los DOS lados (MID→MID): noViene y noLlega', () => {
    const s = porMin(dia('R1').ultimas, 23 * 60 + 50)!; // ambas
    expect(s.noViene).toBe(true);
    expect(s.noLlega).toBe(true);
  });

  it('⛔ CONTRAPRUEBA · la cabecera es la parada MODAL, no la más madrugadora', () => {
    // La 05:00 arranca en A (la cabecera modal) y va a FIN: NO es parcial, aunque
    // sea la primera del día. Si la cabecera fuera "la primera por hora", fallaría.
    const s = porMin(dia('R1').primeras, 5 * 60)!;
    expect(s.noViene, 'la 05:00 sale de cabecera, no es parcial').toBe(false);
    expect(s.noLlega).toBe(false);
  });

  it('⚠️ una línea SIN parciales (R2): ninguna salida lleva marca', () => {
    const d = dia('R2');
    expect([...d.primeras, ...d.ultimas].some((s) => s.noViene || s.noLlega)).toBe(false);
  });

  it('NO se filtra nada: la corta tardía (23:30) SIGUE en las últimas', () => {
    expect(porMin(dia('R1').ultimas, 23 * 60 + 30), 'la 23:30 se enseña, no se descarta').toBeDefined();
  });
});
