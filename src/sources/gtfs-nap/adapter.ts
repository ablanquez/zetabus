import {
  control,
  IngestError,
  lineId,
  sourceId,
  stopId,
  type ControlReport,
  type Direction,
  type FeedValidity,
  type LatLon,
  type Line,
  type LineId,
  type Mode,
  type Provenance,
  type RouteShape,
  type Stop,
  type StopId,
} from '@/core';
import { columns, hasColumn, parseCsv, streamCsv } from './csv';
import { posteFromStopCode } from './identity';
import type { GtfsFiles } from './zip';

const SOURCE = sourceId('gtfs-nap');

/**
 * ⚠️ EL COLOR DE UNA LÍNEA A LA QUE EL FEED NO LE DIO `route_color`. Con nombre,
 * no un `#1F2937` suelto.
 *
 * ⚠️ Y NO es el mismo gris que `--color-sin-color` (el del render, para un bus
 * cuya línea NO ESTÁ en el GTFS). Son DOS ESTADOS distintos y se decidió a
 * propósito que se vean distintos (ver docs/AUDITORIA_SISTEMA_VISUAL.md §4.1):
 *   · aquí: la línea EXISTE en el GTFS pero el feed olvidó su color → gris oscuro.
 *   · allí: la línea no existe para nosotros → gris medio.
 * Por eso vive aquí (build) y no en `@theme` (render): no comparten valor.
 */
const COLOR_LINEA_SIN_ROUTE_COLOR = '#1F2937';
const COLOR_TEXTO_POR_DEFECTO = '#FFFFFF';

/**
 * route_type → modo del núcleo.
 *
 * ⭐ ESTA TABLA ES TODO EL "SABER QUÉ ES UN BUS" QUE HAY EN EL PROYECTO.
 *
 * Es una TABLA y no un `if (route_type === 704) esBus = true`, y esa es la
 * diferencia entre un modelo agnóstico y uno que finge serlo. Añadir el tranvía
 * no fue tocar el núcleo: fue tener ya la fila `900 → tram` puesta.
 *
 * https://gtfs.org/documentation/schedule/reference/#routestxt
 */
const ROUTE_TYPE_TO_MODE: Readonly<Record<string, Mode>> = {
  '0': 'tram', // Tram, Streetcar, Light rail
  '3': 'bus', // Bus
  '700': 'bus', // Bus Service
  '702': 'bus', // Express Bus
  '704': 'bus', // Local Bus Service   ← el de Zaragoza
  '715': 'bus', // Demand and Response Bus
  '900': 'tram', // Tram Service        ← el tranvía de Zaragoza
};

export interface LoadOptions {
  /** Qué modos ingerir. `['bus']` para ZetaBus v1; `['bus','tram']` para el 004. */
  readonly modes: readonly Mode[];
  /** Fecha de la ingesta. Parámetro, no `Date.now()`: así el feed caducado es un test. */
  readonly now: Date;
  /** Si `true`, una línea sin trazado aborta el build en vez de avisar. */
  readonly strictGeometry?: boolean;
}

export interface GtfsDataset {
  readonly validity: FeedValidity;
  readonly stops: readonly Stop[];
  readonly lines: readonly Line[];
  readonly directions: readonly Direction[];
  /** Puente de identidad de Avanza. Vacío para modos que no lo tienen. */
  readonly posteByStopId: Readonly<Record<string, number>>;
  readonly controls: readonly ControlReport[];
  readonly warnings: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────

function prov(sourceUpdatedAt: string | null, now: Date): Provenance {
  return {
    source: SOURCE,
    observedAt: now.toISOString(),
    sourceUpdatedAt,
    url: 'https://nap.transportes.gob.es',
    confidence: 'oficial',
  };
}

function isoDay(yyyymmdd: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(yyyymmdd.trim());
  if (!m) throw new IngestError(`fecha de feed_info ilegible: "${yyyymmdd}" (se esperaba YYYYMMDD)`);
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function hex(v: string, fallback: string): string {
  const c = v.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(c) ? `#${c.toUpperCase()}` : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GTFS → entidades del núcleo.
 *
 * El MISMO código carga autobús y tranvía. La única diferencia es qué modos se
 * piden en `options.modes`. No hay una rama `if (esTranvia)` en ninguna parte.
 */
export function loadGtfs(files: GtfsFiles, options: LoadOptions): GtfsDataset {
  const { modes, now } = options;
  const controls: ControlReport[] = [];
  const warnings: string[] = [];
  const wanted = new Set<Mode>(modes);

  // ── feed_info: la vigencia ────────────────────────────────────────────────
  const feedT = parseCsv('feed_info.txt', files['feed_info.txt']);
  controls.push(feedT.control);
  if (feedT.rows.length !== 1) {
    throw new IngestError(
      `feed_info.txt debería tener exactamente 1 fila y tiene ${feedT.rows.length}.`,
    );
  }
  const fget = columns(feedT, ['feed_start_date', 'feed_end_date', 'feed_version', 'feed_publisher_name']);
  const validity: FeedValidity = {
    startDate: isoDay(fget(feedT.rows[0], 'feed_start_date')),
    endDate: isoDay(fget(feedT.rows[0], 'feed_end_date')),
    version: fget(feedT.rows[0], 'feed_version'),
    publisher: fget(feedT.rows[0], 'feed_publisher_name'),
  };
  const feedUpdated = validity.startDate;

  // ── agency ────────────────────────────────────────────────────────────────
  const agencyT = parseCsv('agency.txt', files['agency.txt']);
  controls.push(agencyT.control);
  const aget = columns(agencyT, ['agency_id', 'agency_name']);
  const agencyName = new Map<string, string>();
  for (const r of agencyT.rows) agencyName.set(aget(r, 'agency_id'), aget(r, 'agency_name'));

  // ── trips: qué rutas tienen viajes de verdad ──────────────────────────────
  //    Las líneas zombi (CE, CEM, LAN, V1, V4, ES3, EM1, EM2...) existen en
  //    routes.txt y NO TIENEN NI UN VIAJE. Ensucian la interfaz con líneas que
  //    no circulan. Se filtran aquí, contra trips.txt, no contra una lista negra
  //    escrita a mano que se quedaría obsoleta.
  const tripsT = parseCsv('trips.txt', files['trips.txt']);
  controls.push(tripsT.control);
  const tget = columns(tripsT, ['route_id', 'trip_id', 'direction_id']);
  const hasHeadsign = hasColumn(tripsT, 'trip_headsign');
  const hasShapeId = hasColumn(tripsT, 'shape_id');

  interface TripRow {
    tripId: string;
    routeId: string;
    dir: 0 | 1;
    headsign: string;
    shapeId: string;
  }
  const trips: TripRow[] = [];
  const routesWithTrips = new Set<string>();
  for (const r of tripsT.rows) {
    const d = tget(r, 'direction_id');
    const dir: 0 | 1 = d === '1' ? 1 : 0;
    const routeId = tget(r, 'route_id');
    trips.push({
      tripId: tget(r, 'trip_id'),
      routeId,
      dir,
      headsign: hasHeadsign ? tget(r, 'trip_headsign') : '',
      shapeId: hasShapeId ? tget(r, 'shape_id') : '',
    });
    routesWithTrips.add(routeId);
  }

  // ── routes: filtrar por modo y por "tiene viajes" ─────────────────────────
  const routesT = parseCsv('routes.txt', files['routes.txt']);
  controls.push(routesT.control);
  const rget = columns(routesT, ['route_id', 'agency_id', 'route_short_name', 'route_type']);

  const lines: Line[] = [];
  const lineMode = new Map<string, Mode>();
  let zombies = 0;
  let otherMode = 0;
  let unknownType = 0;

  for (const r of routesT.rows) {
    const rid = r[routesT.header.indexOf('route_id')]?.trim() ?? rget(r, 'route_id');
    const type = rget(r, 'route_type');
    const mode = ROUTE_TYPE_TO_MODE[type];

    if (!mode) {
      unknownType++;
      warnings.push(`route_type desconocido "${type}" en la ruta ${rid}: se ignora la ruta.`);
      continue;
    }
    if (!wanted.has(mode)) {
      otherMode++;
      continue;
    }
    if (!routesWithTrips.has(rid)) {
      zombies++; // ← línea zombi: existe pero no circula
      continue;
    }

    const agencyId = rget(r, 'agency_id');
    lines.push({
      id: lineId(rid),
      mode,
      shortName: rget(r, 'route_short_name'),
      longName: hasColumn(routesT, 'route_long_name') ? rget(r, 'route_long_name') : '',
      color: hex(hasColumn(routesT, 'route_color') ? rget(r, 'route_color') : '', COLOR_LINEA_SIN_ROUTE_COLOR),
      textColor: hex(hasColumn(routesT, 'route_text_color') ? rget(r, 'route_text_color') : '', COLOR_TEXTO_POR_DEFECTO),
      operator: agencyName.get(agencyId) ?? agencyId,
      provenance: prov(feedUpdated, now),
    });
    lineMode.set(rid, mode);
  }

  if (lines.length === 0) {
    throw new IngestError(
      `El GTFS no contiene ninguna línea de los modos pedidos (${modes.join(', ')}).`,
      'O el feed es de otra ciudad, o el filtro de modos está mal.',
    );
  }
  if (zombies > 0) warnings.push(`${zombies} línea(s) sin ningún viaje descartadas (zombis).`);
  if (otherMode > 0) warnings.push(`${otherMode} ruta(s) de otros modos ignoradas.`);
  if (unknownType > 0) warnings.push(`${unknownType} ruta(s) con route_type desconocido.`);

  // ── stop_times: SIN materializar (47 MB) ──────────────────────────────────
  //    Pasada A: cuántas paradas tiene cada viaje.
  const keptTrips = new Map<string, TripRow>();
  for (const t of trips) if (lineMode.has(t.routeId)) keptTrips.set(t.tripId, t);

  const stopCountByTrip = new Map<string, number>();
  const stCtl = streamCsv('stop_times.txt', files['stop_times.txt'], (get) => {
    const tid = get('trip_id');
    if (!keptTrips.has(tid)) return;
    stopCountByTrip.set(tid, (stopCountByTrip.get(tid) ?? 0) + 1);
  });
  controls.push(stCtl);

  //    El viaje CANÓNICO de cada (línea, sentido) es el que más paradas tiene:
  //    los viajes cortos son refuerzos y variantes, y darían un recorrido
  //    truncado.
  const canonical = new Map<string, TripRow>(); // `${routeId}|${dir}`
  for (const t of keptTrips.values()) {
    const key = `${t.routeId}|${t.dir}`;
    const cur = canonical.get(key);
    const n = stopCountByTrip.get(t.tripId) ?? 0;
    if (!cur || n > (stopCountByTrip.get(cur.tripId) ?? 0)) canonical.set(key, t);
  }
  const canonicalIds = new Set([...canonical.values()].map((t) => t.tripId));

  //    Pasada B: la secuencia ordenada de los viajes canónicos.
  const seqByTrip = new Map<string, { seq: number; stop: string }[]>();
  const usedStops = new Set<string>();
  streamCsv('stop_times.txt (2ª pasada)', files['stop_times.txt'], (get) => {
    const tid = get('trip_id');
    if (!canonicalIds.has(tid)) return;
    const s = get('stop_id');
    const n = Number.parseInt(get('stop_sequence'), 10);
    if (!Number.isFinite(n)) {
      throw new IngestError(`stop_sequence ilegible en el viaje ${tid}: "${get('stop_sequence')}"`);
    }
    (seqByTrip.get(tid) ?? seqByTrip.set(tid, []).get(tid)!).push({ seq: n, stop: s });
    usedStops.add(s);
  });

  // ── shapes ────────────────────────────────────────────────────────────────
  const shapeById = new Map<string, { seq: number; p: LatLon }[]>();
  const wantedShapes = new Set([...canonical.values()].map((t) => t.shapeId).filter(Boolean));
  const shCtl = streamCsv('shapes.txt', files['shapes.txt'], (get) => {
    const sid = get('shape_id');
    if (!wantedShapes.has(sid)) return;
    const lat = Number.parseFloat(get('shape_pt_lat'));
    const lon = Number.parseFloat(get('shape_pt_lon'));
    const seq = Number.parseInt(get('shape_pt_sequence'), 10);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    (shapeById.get(sid) ?? shapeById.set(sid, []).get(sid)!).push({ seq, p: { lat, lon } });
  });
  controls.push(shCtl);

  // ── stops ─────────────────────────────────────────────────────────────────
  const stopsT = parseCsv('stops.txt', files['stops.txt']);
  controls.push(stopsT.control);
  const sget = columns(stopsT, ['stop_id', 'stop_name', 'stop_lat', 'stop_lon']);
  const hasCode = hasColumn(stopsT, 'stop_code');

  const modesByStop = new Map<string, Set<Mode>>();
  for (const t of canonical.values()) {
    const m = lineMode.get(t.routeId)!;
    for (const e of seqByTrip.get(t.tripId) ?? []) {
      (modesByStop.get(e.stop) ?? modesByStop.set(e.stop, new Set()).get(e.stop)!).add(m);
    }
  }

  const stops: Stop[] = [];
  const posteByStopId: Record<string, number> = {};
  let withoutPoste = 0;

  for (const r of stopsT.rows) {
    const sid = sget(r, 'stop_id');
    if (!usedStops.has(sid)) continue; // paradas que ninguna línea pedida usa

    const lat = Number.parseFloat(sget(r, 'stop_lat'));
    const lon = Number.parseFloat(sget(r, 'stop_lon'));

    // ⛔ UNA PARADA SIN COORDENADAS ES UN ERROR, NO UN AVISO.
    //    El proyecto viejo hacía `const lat = pair?.lat ?? 0` y pintaba la
    //    parada en Null Island (0,0), en mitad del Atlántico, sin decir nada.
    //    Aquí revienta el build.
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new IngestError(
        `La parada ${sid} ("${sget(r, 'stop_name')}") no tiene coordenadas válidas ` +
          `(lat="${sget(r, 'stop_lat')}" lon="${sget(r, 'stop_lon')}").`,
        'No se inventa un 0,0. Una parada que no se puede situar no se puede pintar.',
      );
    }
    if (lat === 0 && lon === 0) {
      throw new IngestError(
        `La parada ${sid} ("${sget(r, 'stop_name')}") está en 0,0 (Null Island).`,
        'Eso no es una coordenada: es un valor por defecto que alguien dejó pasar.',
      );
    }

    const code = hasCode ? sget(r, 'stop_code') || null : null;
    const poste = posteFromStopCode(code);
    if (poste !== null) posteByStopId[sid] = poste;
    else withoutPoste++;

    stops.push({
      id: stopId(sid),
      code,
      name: sget(r, 'stop_name'),
      // ⚠️ POR DEFECTO, EL NOMBRE ES EL DEL GTFS Y SE MARCA COMO TAL. El adaptador
      //    del GTFS no conoce la web de Avanza —a propósito, es GTFS y nada más—.
      //    `build-data.ts` superpone después los nombres de `avanza-web` sobre los
      //    postes que Avanza sí da, y a esos les cambia esta procedencia. Los que se
      //    quedan aquí son los que Avanza NO da (suprimidos por desvío): rotos, y
      //    marcados. Ver `ProcedenciaDelNombre`.
      nombreProc: { fuente: 'gtfs-marcado', fecha: null },
      position: { lat, lon },
      modes: [...(modesByStop.get(sid) ?? [])],
      provenance: prov(feedUpdated, now),
    });
  }

  //    ⚠️ Las paradas SIN poste no son un error: el tranvía no tiene prefijo PA.
  //    Se cuentan y se dicen. No se rellenan.
  if (withoutPoste > 0) {
    warnings.push(
      `${withoutPoste} parada(s) sin poste de Avanza (stop_code sin prefijo "PA"). ` +
        `Es lo esperado en modos distintos de bus — el tranvía no lo lleva.`,
    );
  }

  // Contador de control de las paradas: las que usan los viajes canónicos.
  controls.push(
    control(
      'stops: paradas usadas por las líneas pedidas',
      usedStops.size,
      stops.length,
      'conjunto de stop_id distintos vistos en la 2ª pasada de stop_times.txt (fuente independiente de stops.txt)',
    ),
  );

  // ── directions ────────────────────────────────────────────────────────────
  const directions: Direction[] = [];
  let noGeometry = 0;

  for (const [key, t] of canonical) {
    const entries = (seqByTrip.get(t.tripId) ?? []).slice().sort((a, b) => a.seq - b.seq);
    if (entries.length === 0) {
      throw new IngestError(`El viaje canónico ${t.tripId} (${key}) no tiene ninguna parada.`);
    }
    const pts = (shapeById.get(t.shapeId) ?? []).slice().sort((a, b) => a.seq - b.seq);
    if (pts.length === 0) {
      noGeometry++;
      const msg = `La línea ${t.routeId} sentido ${t.dir} no tiene trazado (shape_id="${t.shapeId}").`;
      if (options.strictGeometry) throw new IngestError(msg, 'strictGeometry está activo.');
      warnings.push(`${msg} Se sirve la secuencia de paradas sin geometría, y se etiquetará como tal.`);
    }

    const official: RouteShape = {
      stops: entries.map((e) => stopId(e.stop) as StopId),
      geometry: pts.map((p) => p.p),
      provenance: prov(feedUpdated, now),
    };
    directions.push({
      lineId: lineId(t.routeId) as LineId,
      directionId: t.dir,
      headsign: t.headsign,
      official,
      current: null, // ← lo real llega en la Tanda 3 (get_stops_list + KML)
    });
  }
  if (noGeometry > 0) warnings.push(`${noGeometry} sentido(s) sin trazado en el GTFS.`);

  controls.push(
    control(
      'directions: sentidos con recorrido',
      canonical.size,
      directions.length,
      'nº de pares (route_id, direction_id) distintos hallados en trips.txt',
    ),
  );

  return { validity, stops, lines, directions, posteByStopId, controls, warnings };
}
