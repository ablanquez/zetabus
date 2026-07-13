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
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
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
