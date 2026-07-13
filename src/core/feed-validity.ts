import { InvariantError } from './errors';

/**
 * La vigencia de un feed.
 *
 * ⚠️ EL GTFS CADUCA. El que teníamos al diseñar esto expiraba el 05/10/2026.
 * Un feed caducado que se sigue sirviendo **miente en silencio**: sus horarios
 * y sus rutas siguen ahí, con la misma pinta de siempre, y nadie se entera.
 *
 * Por eso la vigencia no es un dato suelto: es parte del artefacto, y la
 * aplicación TIENE que poder preguntarla y decirlo en pantalla.
 */
export interface FeedValidity {
  /** `YYYY-MM-DD` */
  readonly startDate: string;
  /** `YYYY-MM-DD` */
  readonly endDate: string;
  readonly version: string;
  readonly publisher: string;
}

export type FeedStatus =
  | { readonly kind: 'vigente'; readonly daysLeft: number }
  | { readonly kind: 'por-empezar'; readonly startsIn: number }
  | { readonly kind: 'caduca-pronto'; readonly daysLeft: number }
  | { readonly kind: 'CADUCADO'; readonly daysAgo: number };

const DAY = 86_400_000;
const AVISO_DIAS = 30;

/**
 * ⚠️ LA ZONA IMPORTA, Y NO ES UNA FILIGRANA.
 *
 * `feed_end_date` de un GTFS es una FECHA CIVIL DE LA AGENCIA, no un instante:
 * "válido hasta el 5 de octubre" significa hasta que acabe ese día EN ZARAGOZA.
 *
 * La primera versión de esto comparaba con `getUTCDate()`. Zaragoza va en UTC+2
 * en verano, así que entre las 00:00 y las 02:00 del 6 de octubre —hora de
 * Zaragoza— en UTC todavía era día 5, y la aplicación habría dicho "los datos
 * caducan mañana" CUANDO YA HABÍAN CADUCADO.
 *
 * Dos horas. Una vez. El día exacto en que caduca el feed. Justo la clase de
 * bug que solo aparece el peor día del año, y que nadie sabe reproducir después.
 * Lo cazó el test del borde de medianoche, no yo.
 *
 * ⚠️ Y OJO: la solución NO es `getHours()` ni `toLocaleDateString()` a secas —
 * eso ata el resultado al huso del SERVIDOR, que en Hostinger no sabemos cuál
 * es. Se nombra la zona explícitamente. `Intl` ya sabe de horarios de verano;
 * no hay que enseñárselo, y no hay que acordarse de nada en marzo ni en octubre.
 */
const ZONA_AGENCIA = 'Europe/Madrid';

const formateador = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_AGENCIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día del calendario EN ZARAGOZA en el instante `now`. `YYYY-MM-DD`. */
function diaCivil(now: Date): string {
  return formateador.format(now);
}

function parseDay(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new InvariantError(`fecha de feed no es YYYY-MM-DD: ${iso}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Estado del feed a una fecha dada.
 *
 * `now` es un parámetro y no `Date.now()` A PROPÓSITO: así el 06/10/2026 es un
 * test, no una sorpresa.
 */
export function feedStatus(v: FeedValidity, now: Date): FeedStatus {
  // El día civil de Zaragoza, convertido a un número para poder restar días.
  // Las dos fechas del feed ya SON días civiles, así que la resta es exacta.
  const today = parseDay(diaCivil(now));
  const start = parseDay(v.startDate);
  const end = parseDay(v.endDate);

  if (end < start) {
    throw new InvariantError(
      `feed incoherente: caduca (${v.endDate}) antes de empezar (${v.startDate})`,
    );
  }
  if (today < start) {
    return { kind: 'por-empezar', startsIn: Math.round((start - today) / DAY) };
  }
  if (today > end) {
    return { kind: 'CADUCADO', daysAgo: Math.round((today - end) / DAY) };
  }
  const daysLeft = Math.round((end - today) / DAY);
  return daysLeft <= AVISO_DIAS
    ? { kind: 'caduca-pronto', daysLeft }
    : { kind: 'vigente', daysLeft };
}

/** Lo que se le enseña al usuario. Nunca se calla. */
export function feedWarning(s: FeedStatus, v: FeedValidity): string | null {
  switch (s.kind) {
    case 'vigente':
      return null;
    case 'caduca-pronto':
      return `Los datos oficiales de recorrido caducan el ${v.endDate} (dentro de ${s.daysLeft} días).`;
    case 'por-empezar':
      return `Los datos oficiales no entran en vigor hasta el ${v.startDate}. Lo que ves puede no corresponder al servicio actual.`;
    case 'CADUCADO':
      return `⚠️ Los datos oficiales de recorrido CADUCARON el ${v.endDate} (hace ${s.daysAgo} días). Lo que ves puede estar desfasado.`;
  }
}
