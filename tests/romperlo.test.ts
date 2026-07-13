import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { ControlCountError, feedStatus, feedWarning, IngestError } from '@/core';
import { loadGtfs, readGtfsZip } from '@/sources/gtfs-nap';
import { countCsvRecords, parseCsv } from '@/sources/gtfs-nap/csv';
import { loadFleet } from '@/sources/flota-zetabus/adapter';

/**
 * BACKTESTING CEBADO.
 *
 * "No demuestres que funciona: INTENTA REVENTARLO."
 * "Si nada se rompe al primer intento, SOSPECHA DEL TEST, no celebres el código."
 *
 * Cada caso de aquí es un fallo que ocurrió de verdad, o que va a ocurrir.
 */

const tmp = mkdtempSync(join(tmpdir(), 'zetabus-'));
const p = (n: string) => join(tmp, n);
const now = new Date('2026-07-13T12:00:00Z');

// GTFS mínimo pero VÁLIDO, para poder romperlo de uno en uno.
const OK: Record<string, string> = {
  'agency.txt': 'agency_id,agency_name\n1,Avanza Zaragoza\n',
  'routes.txt': 'route_id,agency_id,route_short_name,route_long_name,route_type,route_color\nR1,1,35,Parque Goya,704,00A0DF\n',
  'trips.txt': 'route_id,trip_id,direction_id,trip_headsign,shape_id\nR1,T1,0,PARQUE GOYA,S1\n',
  'stops.txt': 'stop_id,stop_code,stop_name,stop_lat,stop_lon\nS1,PA00669,P. Pamplona,41.6484,-0.8865\nS2,PA00209,Ramon Sainz,41.63,-0.89\n',
  'stop_times.txt': 'trip_id,stop_id,stop_sequence\nT1,S1,1\nT1,S2,2\n',
  'shapes.txt': 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nS1,41.6484,-0.8865,1\nS1,41.63,-0.89,2\n',
  'feed_info.txt': 'feed_publisher_name,feed_start_date,feed_end_date,feed_version\nAvanza,20260623,20261005,v1\n',
};
const withOverride = (o: Record<string, string>) => ({ ...OK, ...o });

// ─────────────────────────────────────────────────────────────────────────────
describe('el GTFS no está / no se puede leer', () => {
  it('⛔ fichero ausente → falla RUIDOSAMENTE, no sigue con datos vacíos', () => {
    expect(() => readGtfsZip(p('no-existe.zip'))).toThrow(IngestError);
    expect(() => readGtfsZip(p('no-existe.zip'))).toThrow(/no está/i);
  });

  it('⛔ ApiKey inválida → el NAP devuelve HTML, no un ZIP → se detecta por la firma "PK"', () => {
    // Este es el fallo REAL: el NAP responde 200 con una página de error, y el
    // fichero se guarda con extensión .zip. Sin esta comprobación, el error
    // aparecería tres pasos más tarde, disfrazado de "zip corrupto".
    const f = p('html.zip');
    writeFileSync(f, '<!DOCTYPE html><html><body>401 Unauthorized</body></html>');
    expect(() => readGtfsZip(f)).toThrow(/no es un ZIP/i);
    expect(() => readGtfsZip(f)).toThrow(/ApiKey/i);
  });

  it('⛔ ZIP corrupto (descarga cortada) → falla, y dice que lo borres', () => {
    const good = zipSync({ 'agency.txt': strToU8(OK['agency.txt']) });
    const f = p('corrupto.zip');
    writeFileSync(f, good.subarray(0, Math.floor(good.length / 2))); // cortado a la mitad
    expect(() => readGtfsZip(f)).toThrow(IngestError);
  });

  it('⛔ ZIP vacío (0 bytes)', () => {
    const f = p('vacio.zip');
    writeFileSync(f, '');
    expect(() => readGtfsZip(f)).toThrow(/vacío/i);
  });

  it('⛔ ZIP válido al que le faltan ficheros obligatorios', () => {
    const f = p('incompleto.zip');
    writeFileSync(f, zipSync({ 'agency.txt': strToU8(OK['agency.txt']) }));
    expect(() => readGtfsZip(f)).toThrow(/faltan ficheros obligatorios/i);
    expect(() => readGtfsZip(f)).toThrow(/stop_times\.txt/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('datos inválidos dentro de un GTFS bien formado', () => {
  it('⛔ parada SIN coordenadas → NO se inventa un 0,0', () => {
    const bad = withOverride({
      'stops.txt': 'stop_id,stop_code,stop_name,stop_lat,stop_lon\nS1,PA00669,Sin coords,,\nS2,PA00209,Ok,41.63,-0.89\n',
    });
    expect(() => loadGtfs(bad, { modes: ['bus'], now })).toThrow(/no tiene coordenadas/i);
  });

  it('⛔ parada en 0,0 (Null Island) → se rechaza AUNQUE sea numéricamente válida', () => {
    // El bug del proyecto viejo: `const lat = pair?.lat ?? 0`. Pintaba autobuses
    // en mitad del Atlántico y no decía nada. 0,0 no es una coordenada: es un
    // valor por defecto que alguien dejó pasar.
    const bad = withOverride({
      'stops.txt': 'stop_id,stop_code,stop_name,stop_lat,stop_lon\nS1,PA00669,Null Island,0,0\nS2,PA00209,Ok,41.63,-0.89\n',
    });
    expect(() => loadGtfs(bad, { modes: ['bus'], now })).toThrow(/Null Island/i);
  });

  it('⚠️ línea SIN trazado → NO revienta: avisa y sigue (Ci3/Ci4 no tienen KML)', () => {
    const sinShape = withOverride({
      'trips.txt': 'route_id,trip_id,direction_id,trip_headsign,shape_id\nR1,T1,0,PARQUE GOYA,\n',
      'shapes.txt': 'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n',
    });
    const ds = loadGtfs(sinShape, { modes: ['bus'], now });
    expect(ds.directions[0].official.geometry).toHaveLength(0);
    expect(ds.warnings.join(' ')).toMatch(/no tiene trazado/i);

    // Y con strictGeometry, revienta. La política es una decisión, no un accidente.
    expect(() => loadGtfs(sinShape, { modes: ['bus'], now, strictGeometry: true })).toThrow(
      /no tiene trazado/i,
    );
  });

  it('⚠️ stop_code SIN prefijo "PA" (el tranvía) → sin poste, sin drama', () => {
    const tranvia = withOverride({
      'routes.txt': 'route_id,agency_id,route_short_name,route_long_name,route_type,route_color\nR1,1,TRA,Tranvia,900,00A0DF\n',
      'stops.txt': 'stop_id,stop_code,stop_name,stop_lat,stop_lon\nS1,TRAM01,Plaza Espana,41.65,-0.88\nS2,,Sin codigo,41.63,-0.89\n',
    });
    const ds = loadGtfs(tranvia, { modes: ['tram'], now });
    expect(ds.stops).toHaveLength(2);
    expect(Object.keys(ds.posteByStopId)).toHaveLength(0); // ninguno tiene poste
    expect(ds.warnings.join(' ')).toMatch(/sin poste/i);
  });

  it('⛔ ninguna línea del modo pedido → falla en vez de servir un mapa vacío', () => {
    expect(() => loadGtfs(OK, { modes: ['tram'], now })).toThrow(/ninguna línea/i);
  });

  it('⛔ feed_info con fecha ilegible', () => {
    const bad = withOverride({
      'feed_info.txt': 'feed_publisher_name,feed_start_date,feed_end_date,feed_version\nAvanza,junio,20261005,v1\n',
    });
    expect(() => loadGtfs(bad, { modes: ['bus'], now })).toThrow(/ilegible/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('el 06/10/2026: el feed caducado', () => {
  const validity = { startDate: '2026-06-23', endDate: '2026-10-05', version: 'v', publisher: 'p' };

  // ⚠️ ESTE BLOQUE CAMBIÓ EN LA TANDA 3, Y NO POR CAPRICHO.
  //
  // La versión original probaba `new Date('2026-10-05T23:00:00Z')` y esperaba
  // "todavía válido". Pero las 23:00 UTC del día 5 son la **01:00 del día 6 en
  // Zaragoza**: el feed YA HA CADUCADO. El test estaba dando por buena la
  // semántica UTC, que era precisamente el bug (`feed_end_date` de un GTFS es
  // una fecha civil de la agencia, no un instante UTC).
  //
  // Se corrigió el CÓDIGO (ahora compara en Europe/Madrid) y se corrigió este
  // test, que estaba fijando el error. Ver `tests/motor-vivo/horas-malas.test.ts`.

  it('el 05/10 todavía es válido (último día, hora de Zaragoza)', () => {
    expect(feedStatus(validity, new Date('2026-10-05T23:00:00+02:00')).kind).toBe('caduca-pronto');
  });

  it('⛔ el 06/10 está CADUCADO — y la app lo DICE, no se calla', () => {
    const s = feedStatus(validity, new Date('2026-10-06T02:00:00+02:00'));
    expect(s.kind).toBe('CADUCADO');
    expect(s).toMatchObject({ daysAgo: 1 });

    const msg = feedWarning(s, validity);
    expect(msg).toMatch(/CADUCARON/);
    expect(msg).toContain('2026-10-05');
    // Un feed caducado que se sigue sirviendo miente EN SILENCIO. Este mensaje
    // es lo único que separa a ZetaBus de mentir el 6 de octubre.
  });

  it('avisa 30 días antes, no el día de después', () => {
    expect(feedStatus(validity, new Date('2026-09-10T00:00:00Z')).kind).toBe('caduca-pronto');
    expect(feedStatus(validity, new Date('2026-08-01T00:00:00Z')).kind).toBe('vigente');
  });

  it('⛔ feed incoherente: caduca antes de empezar', () => {
    expect(() =>
      feedStatus({ ...validity, startDate: '2026-10-06' }, now),
    ).toThrow(/incoherente/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('L1 · el contador de control (y la CONTRAPRUEBA)', () => {
  it('el CSV con comas dentro de comillas NO se parte', () => {
    const t = parseCsv('x', 'a,b,c\n1,"Agustín Príncipe N. º 2, bis",3\n');
    expect(t.rows[0]).toEqual(['1', 'Agustín Príncipe N. º 2, bis', '3']);
    // Un split(',') habría dado 4 campos y desplazado TODAS las columnas
    // siguientes. Silenciosamente.
  });

  it('⭐ CONTRAPRUEBA: el contador es INDEPENDIENTE del parser', () => {
    // Si el contador usara la misma lógica que el parser, ambos verían lo
    // mismo y el test siempre sería verde. Lo comprobamos alimentándolos con
    // un caso donde un parser ingenuo se equivocaría: un salto de línea DENTRO
    // de un campo entrecomillado.
    const csv = 'a,b\n1,"linea1\nlinea2"\n';

    expect(countCsvRecords(csv)).toBe(2); // cabecera + 1 registro (¡no 3!)
    const t = parseCsv('x', csv);
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0][1]).toBe('linea1\nlinea2');

    // Y ahora la prueba de que el contador NO es un `split('\n').length`:
    expect(csv.split('\n').filter(Boolean)).toHaveLength(3); // ← lo que diría el ingenuo
    expect(countCsvRecords(csv)).not.toBe(3); //                ← lo que dice el nuestro
  });

  it('⛔ el maestro de flota sin `_meta.fuentes` → falla, porque no hay contador posible', () => {
    const f = p('flota-sin-meta.json');
    writeFileSync(f, JSON.stringify({ vehiculos: [] }));
    expect(() => loadFleet(f)).toThrow(/contador de control/i);
    // Sin una cifra declarada de forma independiente, no se puede verificar
    // nada. Preferimos no cargar la flota a cargarla sin poder comprobarla.
  });

  it('⛔ si el maestro declara 350 y solo trae 349 → ControlCountError', () => {
    const f = p('flota-descuadrada.json');
    writeFileSync(
      f,
      JSON.stringify({
        _meta: { fuentes: [{ id: 'x', vehiculos: 2 }] },
        vehiculos: [
          { coche: 1, fabricante: 'V', modelo: 'M', longitudM: 12, clase: 'sencillo', propulsion: 'diesel', confianza: 'oficial', matricula: null, fechaMatriculacion: null },
        ],
      }),
    );
    expect(() => loadFleet(f)).toThrow(ControlCountError);
    expect(() => loadFleet(f)).toThrow(/se esperaban 2 y se obtuvieron 1/);
    // ⭐ Éste es, exactamente, el fallo del Anexo 5. Ahora tiene un test.
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('la flota: SIN DATOS, nunca un valor por defecto', () => {
  const fleet = loadFleet('data/flota-avanza-zaragoza.json');

  it('un coche desconocido devuelve null, NO un bus genérico de 12 m', () => {
    // El día que Avanza matricule el 4999, aparecerá en la calle antes que en
    // ningún documento. Ese día la ficha dirá "no lo conocemos", no "12 metros,
    // diésel".
    expect(fleet.get('4999' as never)).toBeNull();
    expect(fleet.get('' as never)).toBeNull();
  });

  it('⭐ los 12 buses de la línea 35: el maestro acierta 12 de 12', () => {
    const vistos = ['4301', '4312', '4333', '4839', '4845', '4847', '4852', '4889', '4901', '4906', '4910', '4926'];
    const perfiles = vistos.map((c) => fleet.get(c as never));
    expect(perfiles.every((p) => p !== null)).toBe(true);
    expect(perfiles.filter((p) => p!.busClass === 'articulado')).toHaveLength(12);
  });

  it('⭐ el coche 4889 es ARTICULADO — el fichero heredado decía 12 m', () => {
    const v = fleet.get('4889' as never)!;
    expect(v.lengthMeters).toBe(18);
    expect(v.busClass).toBe('articulado');
    expect(v.model).toBe('7905');
    expect(v.confidence).toBe('oficial');

    // Y el heredado, para que quede constancia de la mentira que evitamos:
    const heredado = JSON.parse(
      readFileSync('data/referencia/autobuses-avanza-zaragoza-heredado.json', 'utf8').replace(/^﻿/, ''),
    ) as { numeroAutobus: number; longitud: string }[];
    expect(heredado.find((x) => x.numeroAutobus === 4889)!.longitud).toBe('12 m');
  });

  it('la confianza VIAJA: el 4333 sale marcado como sin_verificar', () => {
    expect(fleet.get('4333' as never)!.confidence).toBe('sin_verificar');
    expect(fleet.get('4301' as never)!.confidence).toBe('oficial');
  });

  it('⛔ longitud imposible (15 m) → falla en vez de redondear', () => {
    const f = p('flota-15m.json');
    writeFileSync(
      f,
      JSON.stringify({
        _meta: { fuentes: [{ id: 'x', vehiculos: 1 }] },
        vehiculos: [{ coche: 1, fabricante: 'V', modelo: 'M', longitudM: 15, clase: 'sencillo', propulsion: 'diesel', confianza: 'oficial', matricula: null, fechaMatriculacion: null }],
      }),
    );
    expect(() => loadFleet(f)).toThrow(/no existe en esta flota/i);
  });

  it('⛔ clase y longitud que no cuadran → falla (es EL error del heredado)', () => {
    const f = p('flota-incoherente.json');
    writeFileSync(
      f,
      JSON.stringify({
        _meta: { fuentes: [{ id: 'x', vehiculos: 1 }] },
        vehiculos: [{ coche: 4889, fabricante: 'VOLVO', modelo: '7905', longitudM: 18, clase: 'sencillo', propulsion: 'hibrido', confianza: 'oficial', matricula: null, fechaMatriculacion: null }],
      }),
    );
    expect(() => loadFleet(f)).toThrow(/dice "sencillo" pero mide 18 m/i);
  });

  it('⛔ confianza inventada → falla (el campo llega a la pantalla)', () => {
    const f = p('flota-confianza.json');
    writeFileSync(
      f,
      JSON.stringify({
        _meta: { fuentes: [{ id: 'x', vehiculos: 1 }] },
        vehiculos: [{ coche: 1, fabricante: 'V', modelo: 'M', longitudM: 12, clase: 'sencillo', propulsion: 'diesel', confianza: 'bastante_seguro', matricula: null, fechaMatriculacion: null }],
      }),
    );
    expect(() => loadFleet(f)).toThrow(/confianza desconocida/i);
  });
});
