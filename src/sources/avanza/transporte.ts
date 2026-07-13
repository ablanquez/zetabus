/**
 * EL ÚNICO SITIO DEL PROGRAMA QUE HABLA CON AVANZA.
 *
 * Es un cuello de botella A PROPÓSITO. Si hubiera dos, la cuenta de
 * peticiones/minuto que le prometemos al operador sería una estimación. Con uno
 * solo, es una MEDIDA: basta contar aquí.
 *
 * El proyecto viejo llamaba a `fetch` a pelo, sin timeout y sin reintento. Sin
 * timeout, una petición que no vuelve deja el worker colgado hasta que el S.O.
 * se cansa (minutos). Sin reintento, un paquete perdido es un hueco en la
 * pantalla.
 */

import { IngestError } from '@/core';

export interface RespuestaCruda {
  readonly status: number;
  readonly texto: string;
  /** En minúsculas. `last-modified` es la que sostiene el detector de desvíos. */
  readonly cabeceras: Readonly<Record<string, string>>;
  /** Milisegundos que tardó la fuente en responder. Se mide, no se estima. */
  readonly msTardados: number;
}

/**
 * La forma de "hablar con el mundo". Se inyecta.
 *
 * ⚠️ ESTO NO ES ARQUITECTURA POR ARQUITECTURA. Es la única manera de probar lo
 * que pide la Tanda 3: "¿qué pasa si Avanza tarda 30 s? ¿si devuelve HTML de
 * error?". Eso no se le puede pedir a Avanza. Se le pide a un doble.
 */
export type Transporte = (
  url: string,
  opciones: { readonly cuerpo?: string; readonly cabeceras?: Record<string, string>; readonly senal: AbortSignal },
) => Promise<{ status: number; texto: string; cabeceras?: Record<string, string> }>;

export const AGENTE = 'ZetaBus/0.1 (+https://github.com/ablanquez/zetabus)';

export const transporteReal: Transporte = async (url, { cuerpo, cabeceras, senal }) => {
  const res = await fetch(url, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    body: cuerpo,
    headers: {
      'User-Agent': AGENTE,
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...cabeceras,
    },
    signal: senal,
    // ⚠️ `cache: 'no-store'` es OBLIGATORIO aquí y no es paranoia:
    //    la memoización de fetch de Next es SOLO para GET y NO se aplica en
    //    Route Handlers (doc oficial), pero nosotros hacemos POST desde un
    //    Route Handler y además tenemos NUESTRA caché, que sí expone la edad.
    //    Dos cachés apiladas es la receta para no saber la edad de nada.
    cache: 'no-store',
  });
  const devueltas: Record<string, string> = {};
  res.headers.forEach((v, k) => { devueltas[k.toLowerCase()] = v; });
  // ⚠️ Un 304 no tiene cuerpo. `res.text()` devuelve "" y eso está bien: el que
  //    llama distingue por el `status`, no por si el texto está vacío.
  return { status: res.status, texto: res.status === 304 ? '' : await res.text(), cabeceras: devueltas };
};

// ─────────────────────────────────────────────────────────────────────────────
//  CONTADOR GLOBAL. Lo que le prometemos a Avanza se MIDE aquí.
// ─────────────────────────────────────────────────────────────────────────────

export interface Cuenta {
  peticiones: number;
  reintentos: number;
  timeouts: number;
  errores: number;
  /** Milisegundos acumulados. Para sacar la media sin guardar la serie. */
  msAcumulados: number;
  desde: number;
}

const nuevaCuenta = (ahora: number): Cuenta => ({
  peticiones: 0, reintentos: 0, timeouts: 0, errores: 0, msAcumulados: 0, desde: ahora,
});

export class ContadorAvanza {
  private c: Cuenta;
  constructor(ahora = Date.now()) { this.c = nuevaCuenta(ahora); }
  get cuenta(): Readonly<Cuenta> { return this.c; }
  reiniciar(ahora = Date.now()): void { this.c = nuevaCuenta(ahora); }
  /** Peticiones por minuto MEDIDAS desde el último reinicio. */
  porMinuto(ahora = Date.now()): number {
    const min = Math.max((ahora - this.c.desde) / 60_000, 1 / 60_000);
    return this.c.peticiones / min;
  }
  registrar(p: Partial<Cuenta>): void {
    this.c.peticiones += p.peticiones ?? 0;
    this.c.reintentos += p.reintentos ?? 0;
    this.c.timeouts += p.timeouts ?? 0;
    this.c.errores += p.errores ?? 0;
    this.c.msAcumulados += p.msAcumulados ?? 0;
  }
}

/** El contador del proceso. `/api/diag` lo enseña. */
export const contador = new ContadorAvanza();

// ─────────────────────────────────────────────────────────────────────────────

export interface OpcionesPeticion {
  readonly url: string;
  readonly cuerpo?: string;
  readonly cabeceras?: Record<string, string>;
  readonly timeoutMs?: number;
  readonly reintentos?: number;
  readonly backoffMs?: number;
}

export const TIMEOUT_MS = 4_000;
export const REINTENTOS = 1;
export const BACKOFF_MS = 300;

export class FuenteCaida extends IngestError {
  constructor(readonly url: string, readonly causa: string) {
    super(`La fuente no ha respondido (${url}): ${causa}`,
      'Esto NO significa "no hay autobuses". Significa que no lo sabemos. Se dice.');
    this.name = 'FuenteCaida';
  }
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Una petición a Avanza, con timeout duro y un reintento.
 *
 * ⚠️ El peor caso está ACOTADO y la cuenta importa: el cerrojo de la caché de
 * disco tiene que durar MÁS que esto, o dos workers se pisarán.
 *     timeout(4 s) + backoff(0,3 s) + timeout(4 s) = 8,3 s  →  cerrojo de 12 s.
 */
export async function pedir(
  transporte: Transporte,
  o: OpcionesPeticion,
  ahora: () => number = Date.now,
): Promise<RespuestaCruda> {
  const intentos = (o.reintentos ?? REINTENTOS) + 1;
  const timeoutMs = o.timeoutMs ?? TIMEOUT_MS;
  let ultimo = '';

  for (let i = 0; i < intentos; i++) {
    if (i > 0) {
      contador.registrar({ reintentos: 1 });
      await dormir((o.backoffMs ?? BACKOFF_MS) * i);
    }

    // AbortController: el timeout que el proyecto viejo no tenía.
    const ac = new AbortController();
    const reloj = setTimeout(() => ac.abort(new Error(`timeout de ${timeoutMs} ms`)), timeoutMs);
    const t0 = ahora();
    try {
      const { status, texto, cabeceras } = await transporte(o.url, {
        cuerpo: o.cuerpo, cabeceras: o.cabeceras, senal: ac.signal,
      });
      const ms = ahora() - t0;
      contador.registrar({ peticiones: 1, msAcumulados: ms });
      return { status, texto, cabeceras: cabeceras ?? {}, msTardados: ms };
    } catch (e) {
      const ms = ahora() - t0;
      const abortado = ac.signal.aborted;
      contador.registrar({ peticiones: 1, msAcumulados: ms, errores: 1, timeouts: abortado ? 1 : 0 });
      ultimo = abortado ? `timeout tras ${ms} ms` : ((e as Error)?.message ?? String(e));
    } finally {
      clearTimeout(reloj); // ⚠️ si esto falta, el proceso no termina nunca en los tests
    }
  }
  throw new FuenteCaida(o.url, ultimo);
}
