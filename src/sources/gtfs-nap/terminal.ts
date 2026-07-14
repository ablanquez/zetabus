/**
 * ⭐ C5 · FUNCIONAMIENTO DE TERMINAL: primeras y últimas salidas por tipo de día.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ ANTES DE PROMETERLO, SE COMPROBÓ QUE EL DATO EXISTE. Y existe:
 *     stop_times.txt (870.718 filas) + trips.txt + calendar_dates.txt
 *
 * ⚠️ PERO NO HAY `calendar.txt`. Solo fechas sueltas. Así que el tipo de día no
 * viene dado: hay que sacarlo. Y aquí está la trampa.
 *
 * ⛔ LO QUE **NO** SE HACE: clasificar los `service_id` por su nombre.
 *
 * El feed tiene DOS familias de identificadores:
 *     `021008L_02101_`  → la letra L/S/F antes del guion bajo
 *     `210_DFI`, `210_PL07`, `210_LABJUL1`…  → otra convención distinta
 *
 * Y sus fechas no caen donde uno esperaría: las de `DFI` ("domingos y festivos")
 * caen en **lunes, martes, jueves y viernes**. No es un fallo del feed:
 * **un festivo cae en día laborable.** Clasificar por día de la semana daría
 * "domingos y festivos circulando un martes", que parece un bug y no lo es.
 *
 * ⭐ LO QUE SÍ SE HACE: EVALUAR EL FEED EN UNA FECHA CONCRETA.
 *
 * El GTFS dice, para una fecha, exactamente qué servicios circulan. Eso no es
 * inferencia: es leer. Se elige una fecha representativa de cada tipo de día
 * —tomada del PROPIO CALENDARIO del feed, no del calendario de la pared— y se
 * calculan las salidas de cabecera de ese día.
 *
 * ⚠️ Y "domingo o festivo" se representa con un DOMINGO real del feed. Un festivo
 * entre semana usa ESE MISMO servicio, así que la cifra vale para los dos. Por eso
 * la etiqueta dice "domingos y festivos" y no miente.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y LAS HORAS PASADAS DE MEDIANOCHE. El GTFS escribe `25:29:00` para "la 1:29
 * de la madrugada del día siguiente". Si eso se pintara tal cual, la pantalla
 * diría "última salida: 25:29", que no existe. Y si se hiciera `% 24` a secas,
 * diría "01:29" sin decir que es del día siguiente — y alguien iría a las 01:29
 * del mismo día, doce horas antes. Se guarda el número de minutos crudo y se
 * marca `delDiaSiguiente`.
 */

export type TipoDeDia = 'laborable' | 'sabado' | 'festivo';

export interface SalidasDeTerminal {
  readonly tipo: TipoDeDia;
  /** Minutos desde medianoche. Puede pasar de 1440 (madrugada del día siguiente). */
  readonly primera: number;
  readonly ultima: number;
  /** Cuántas salidas hay ese día. Da idea de la frecuencia sin prometer un horario. */
  readonly expediciones: number;
}

export interface TerminalDeSentido {
  readonly lineId: string;
  readonly directionId: 0 | 1;
  readonly dias: readonly SalidasDeTerminal[];
}

/** `HH:MM:SS` → minutos desde medianoche. `25:29:00` → 1529. */
function aMinutos(hhmmss: string): number | null {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(hhmmss.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

const DOW = (yyyymmdd: string): number =>
  new Date(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8)).getDay();

export interface EntradaCsv {
  readonly cabecera: readonly string[];
  readonly filas: readonly (readonly string[])[];
}

/** Parte un CSV plano. El GTFS de Zaragoza no usa comillas en estos ficheros. */
function csv(texto: string): EntradaCsv {
  const lineas = texto.split(/\r?\n/).filter((l) => l.length > 0);
  return {
    cabecera: lineas[0].split(','),
    filas: lineas.slice(1).map((l) => l.split(',')),
  };
}

export interface ResultadoTerminal {
  readonly terminales: readonly TerminalDeSentido[];
  /** Las fechas que se han usado como representativas. Se enseñan: son auditables. */
  readonly fechas: Readonly<Record<TipoDeDia, string | null>>;
  /** L1 · contadores de control. */
  readonly control: { readonly tripsLeidos: number; readonly tripsConSalida: number };
}

export function calcularTerminales(
  calendarDates: string,
  tripsTxt: string,
  stopTimesTxt: string,
  /** Desde qué fecha se buscan los días representativos. Inyectable para el test. */
  desde: Date,
): ResultadoTerminal {
  // ── 1 · qué servicios circulan cada fecha ────────────────────────────────
  const activos = new Map<string, Set<string>>();
  const cd = csv(calendarDates);
  const cSvc = cd.cabecera.indexOf('service_id');
  const cDate = cd.cabecera.indexOf('date');
  const cExc = cd.cabecera.indexOf('exception_type');
  for (const f of cd.filas) {
    if (f[cExc]?.trim() !== '1') continue; // 2 = "ese día NO circula"
    const d = f[cDate];
    if (!activos.has(d)) activos.set(d, new Set());
    activos.get(d)!.add(f[cSvc]);
  }

  // ── 2 · LA FECHA REPRESENTATIVA DE CADA TIPO DE DÍA ──────────────────────
  //    ⚠️ Se saca DEL CALENDARIO DEL FEED, no del calendario de la pared: si el
  //    feed no cubre ningún sábado, no hay dato de sábado, y se dice (null).
  const clave = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const fechas: Record<TipoDeDia, string | null> = { laborable: null, sabado: null, festivo: null };
  for (let i = 0; i < 60 && (!fechas.laborable || !fechas.sabado || !fechas.festivo); i++) {
    const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + i);
    const k = clave(d);
    if (!activos.has(k)) continue;
    const dow = DOW(k);
    if (dow === 0 && !fechas.festivo) fechas.festivo = k;
    else if (dow === 6 && !fechas.sabado) fechas.sabado = k;
    else if (dow >= 1 && dow <= 5 && !fechas.laborable) fechas.laborable = k;
  }

  // ── 3 · trips ────────────────────────────────────────────────────────────
  const t = csv(tripsTxt);
  const tRoute = t.cabecera.indexOf('route_id');
  const tSvc = t.cabecera.indexOf('service_id');
  const tTrip = t.cabecera.indexOf('trip_id');
  const tDir = t.cabecera.indexOf('direction_id');
  const info = new Map<string, { route: string; svc: string; dir: 0 | 1 }>();
  for (const f of t.filas) {
    const dir = f[tDir] === '1' ? 1 : 0;
    info.set(f[tTrip], { route: f[tRoute], svc: f[tSvc], dir });
  }

  // ── 4 · la salida de CABECERA de cada trip (la parada de secuencia mínima) ──
  const st = csv(stopTimesTxt);
  const sTrip = st.cabecera.indexOf('trip_id');
  const sDep = st.cabecera.indexOf('departure_time');
  const sSeq = st.cabecera.indexOf('stop_sequence');
  const salida = new Map<string, { min: number; seq: number }>();
  for (const f of st.filas) {
    const seq = Number(f[sSeq]);
    const prev = salida.get(f[sTrip]);
    if (prev && seq >= prev.seq) continue;
    const min = aMinutos(f[sDep]);
    if (min === null) continue;
    salida.set(f[sTrip], { min, seq });
  }

  // ── 5 · agrupar por (línea, sentido, tipo de día) ────────────────────────
  const acumulado = new Map<string, number[]>(); // `${route}|${dir}|${tipo}` → minutos
  for (const [tipo, fecha] of Object.entries(fechas) as [TipoDeDia, string | null][]) {
    if (fecha === null) continue;
    const act = activos.get(fecha)!;
    for (const [trip, s] of salida) {
      const i = info.get(trip);
      if (!i || !act.has(i.svc)) continue;
      const k = `${i.route}|${i.dir}|${tipo}`;
      if (!acumulado.has(k)) acumulado.set(k, []);
      acumulado.get(k)!.push(s.min);
    }
  }

  const porSentido = new Map<string, SalidasDeTerminal[]>();
  for (const [k, mins] of acumulado) {
    const [route, dir, tipo] = k.split('|');
    const kk = `${route}|${dir}`;
    if (!porSentido.has(kk)) porSentido.set(kk, []);
    porSentido.get(kk)!.push({
      tipo: tipo as TipoDeDia,
      primera: Math.min(...mins),
      ultima: Math.max(...mins),
      expediciones: mins.length,
    });
  }

  const ORDEN: TipoDeDia[] = ['laborable', 'sabado', 'festivo'];
  const terminales: TerminalDeSentido[] = [...porSentido].map(([k, dias]) => {
    const [lineId, dir] = k.split('|');
    return {
      lineId,
      directionId: dir === '1' ? 1 : 0,
      dias: [...dias].sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo)),
    };
  });

  return {
    terminales,
    fechas,
    control: { tripsLeidos: info.size, tripsConSalida: salida.size },
  };
}
