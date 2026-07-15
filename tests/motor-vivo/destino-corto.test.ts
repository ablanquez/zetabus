/**
 * ⭐ ENSEÑAR, NO FILTRAR: cada salida dice si EMPIEZA o ACABA a mitad de línea.
 *
 * Antonio, cotejando con Avanza: en →Seminario aparecían de madrugada expediciones
 * que acaban antes (en P. Mina) y NO llegan. La versión anterior las FILTRABA (con
 * guardia, casación de terminales, detección de ambigüedad…). Avanza no esconde
 * nada: enseña el Desde/Hasta y ya. Es más simple y más honesto: la 0:11 no
 * desaparece, se ve "acaba en Coso" y el usuario entiende que no llega.
 *
 * Se prueba la MÁQUINA con feeds de juguete (deterministas):
 *   1) una que ACABA a mitad se ENSEÑA (no se filtra), marcada con su destino;
 *   2) la normal (empieza y acaba en su cabecera) va sin marca;
 *   3) una que EMPIEZA a mitad pero acaba bien lleva solo "empieza en";
 *   4) una que empieza Y acaba a mitad lleva las DOS marcas;
 *   5) un sentido con dos terminales NO es especial: marca el destino que toque.
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

describe('calcularTerminales · empieza / acaba a mitad, sin filtrar', () => {
  // Cabecera de origen A (mayoría) y de destino FIN (mayoría). Una corta por el
  // final, una parcial de origen, y una que corta por los DOS lados, todas tardías.
  const r1 = feed([
    { trip: 'c1', route: 'R1', dir: '0', paradas: [['A', '06:00'], ['MID', '06:10'], ['FIN', '06:20']] },
    { trip: 'c2', route: 'R1', dir: '0', paradas: [['A', '22:00'], ['MID', '22:10'], ['FIN', '22:20']] },
    { trip: 'c3', route: 'R1', dir: '0', paradas: [['A', '23:00'], ['MID', '23:10'], ['FIN', '23:20']] },
    { trip: 'acaba-mid', route: 'R1', dir: '0', paradas: [['A', '23:30'], ['MID', '23:40']] },
    { trip: 'empieza-mid', route: 'R1', dir: '0', paradas: [['MID', '23:45'], ['FIN', '23:55']] },
    { trip: 'ambas', route: 'R1', dir: '0', paradas: [['MID', '23:50'], ['MID', '23:52']] },
  ]);
  const dia1 = () => {
    const res = calcularTerminales(CAL, r1.tripsTxt, r1.stopTimesTxt, DESDE, nombreDeParada);
    return res.terminales.find((x) => x.lineId === 'R1')!.dias.find((d) => d.tipo === 'laborable')!;
  };
  const porMin = (ss: readonly SalidaDeTerminal[], m: number) => ss.find((s) => s.minuto === m);

  it('⛔ la que ACABA a mitad (23:30 → P. Mina) SE ENSEÑA, con "acaba en"; no se filtra', () => {
    const d = dia1();
    const s = porMin(d.ultimas, 23 * 60 + 30);
    expect(s, 'la 23:30 sigue en las últimas (no se descarta)').toBeDefined();
    expect(s!.destino, 'marcada acaba en P. Mina').toBe('P. Mina');
    expect(s!.origen, 'pero empieza en la cabecera: sin marca de origen').toBeNull();
  });

  it('la normal (empieza y acaba en su cabecera) va SIN marca', () => {
    const s = porMin(dia1().ultimas, 23 * 60); // c3: A → FIN
    expect(s!.origen).toBeNull();
    expect(s!.destino).toBeNull();
  });

  it('la que EMPIEZA a mitad pero acaba bien lleva solo "empieza en"', () => {
    const s = porMin(dia1().ultimas, 23 * 60 + 45); // empieza-mid: MID → FIN
    expect(s!.origen, 'empieza en P. Mina').toBe('P. Mina');
    expect(s!.destino, 'acaba en la cabecera: sin marca de destino').toBeNull();
  });

  it('la que corta por los DOS lados lleva las DOS marcas', () => {
    const s = porMin(dia1().ultimas, 23 * 60 + 50); // ambas: MID → MID
    expect(s!.origen).toBe('P. Mina');
    expect(s!.destino).toBe('P. Mina');
  });

  // R2: dos terminales (X mayoría, FIN minoría). NO es un caso especial: la que
  // acaba en FIN (≠ destino modal X) se marca "acaba en Seminario" y ya.
  it('⚠️ dos terminales: NO es especial, se marca el destino que toque', () => {
    const r2 = feed([
      { trip: 'a1', route: 'R2', dir: '0', paradas: [['A', '20:00'], ['X', '20:20']] },
      { trip: 'a2', route: 'R2', dir: '0', paradas: [['A', '21:00'], ['X', '21:20']] },
      { trip: 'a3', route: 'R2', dir: '0', paradas: [['A', '22:00'], ['X', '22:20']] },
      { trip: 'b1', route: 'R2', dir: '0', paradas: [['A', '23:00'], ['FIN', '23:30']] },
    ]);
    const res = calcularTerminales(CAL, r2.tripsTxt, r2.stopTimesTxt, DESDE, nombreDeParada);
    const d = res.terminales.find((x) => x.lineId === 'R2')!.dias.find((x) => x.tipo === 'laborable')!;
    // Las 4 se enseñan (nada se filtra). La que va a X (mayoría) sin marca; la de FIN, marcada.
    expect(d.ultimas.map((s) => s.minuto)).toEqual([20 * 60, 21 * 60, 22 * 60, 23 * 60]);
    expect(porMin(d.ultimas, 22 * 60)!.destino, 'X es el destino modal: sin marca').toBeNull();
    expect(porMin(d.ultimas, 23 * 60)!.destino, 'FIN es la excepción: marcada').toBe('Seminario');
  });
});
