/**
 * LA CACHÉ DE DOS PISOS.
 *
 *   PISO 1 · MEMORIA  — un Map por proceso. Rápido. Y con VUELO ÚNICO: si 20
 *                       peticiones piden la misma clave a la vez, sale UNA sola
 *                       llamada y las otras 19 esperan a esa. Sin esto, 20
 *                       usuarios mirando la misma parada son 20 peticiones.
 *
 *   PISO 2 · DISCO    — el único canal que comparten los N workers de Hostinger
 *                       sin meter Redis. Sin él, el vuelo único del piso 1 solo
 *                       coordina DENTRO de un proceso, y con 4 workers se
 *                       cuadruplica todo. En silencio.
 *
 * ⚠️ TTL = 15 s, Y ES UNA DECISIÓN, NO UN NÚMERO SUELTO.
 * Avanza refresca su GPS cada 10-20 s. Una caché de 15 s sirve datos que, como
 * mucho, están una vuelta por detrás: es honesta. Una caché de 5 minutos
 * serviría autobuses que ya han pasado, y lo haría con toda la confianza del
 * mundo. Eso no es "optimizar": es MENTIR.
 *
 * ⭐ CERO PETICIONES CUANDO NADIE MIRA.
 * No hay `setInterval`, ni barredor de fondo, ni precalentamiento. Una entrada
 * caduca y NO PASA NADA hasta que alguien pregunta. De madrugada, con la web
 * abierta y nadie delante, ZetaBus hace exactamente cero peticiones a Avanza.
 * Eso no es una promesa: es que no existe el código que las haría.
 */

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Fechado } from '@/core';
import { coger, type Cerrojo } from './cerrojo';
import { Limitador } from './limitador';

/** El dato de Avanza se refresca cada 10-20 s. Ver la nota de arriba. */
export const TTL_MS = 15_000;
/** Cuánto esperamos a que OTRO worker termine antes de servir rancio. */
export const ESPERA_MAX_MS = 3_000;
/** Cada cuánto miramos si el otro worker ya escribió. */
const SONDEO_MS = 50;

export type Resultado<T> =
  | ({ readonly tipo: 'fresco' } & Fechado<T>)
  | ({ readonly tipo: 'rancio'; readonly motivo: string } & Fechado<T>)
  | { readonly tipo: 'fallo'; readonly motivo: string };

interface Entrada<T> {
  readonly datos: T;
  readonly observadoEnMs: number;
}

/** Se cuenta TODO. Un diseño de caché que no se puede medir es una promesa. */
export interface Metricas {
  aciertosMemoria: number;
  aciertosDisco: number;
  aciertosVueloUnico: number;
  fallosDeCache: number;
  llamadasAlOrigen: number;
  esperasAOtroWorker: number;
  serviciosRancios: number;
  cerrojosRobados: number;
  denegadasPorTecho: number;
}

const metricasVacias = (): Metricas => ({
  aciertosMemoria: 0, aciertosDisco: 0, aciertosVueloUnico: 0, fallosDeCache: 0,
  llamadasAlOrigen: 0, esperasAOtroWorker: 0, serviciosRancios: 0,
  cerrojosRobados: 0, denegadasPorTecho: 0,
});

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Nombre de fichero seguro a partir de una clave arbitraria. */
const aFichero = (clave: string) =>
  `${clave.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)}-${createHash('sha1').update(clave).digest('hex').slice(0, 8)}`;

export interface OpcionesCache {
  readonly dir: string;
  readonly ttlMs?: number;
  readonly ahora?: () => number;
  readonly limitador?: Limitador;
  /** ⚠️ Solo para la CONTRAPRUEBA: apaga el vuelo único y mira lo que pasa. */
  readonly sinVueloUnico?: boolean;
  /** ⚠️ Solo para la CONTRAPRUEBA: apaga el piso de disco y mira lo que pasa. */
  readonly sinDisco?: boolean;
}

export class CacheDosPisos {
  private readonly memoria = new Map<string, Entrada<unknown>>();
  private readonly enVuelo = new Map<string, Promise<Resultado<unknown>>>();
  private readonly dir: string;
  private readonly ttl: number;
  private readonly ahora: () => number;
  readonly limitador: Limitador;
  readonly metricas: Metricas = metricasVacias();

  constructor(private readonly o: OpcionesCache) {
    this.dir = o.dir;
    this.ttl = o.ttlMs ?? TTL_MS;
    this.ahora = o.ahora ?? Date.now;
    this.limitador = o.limitador ?? new Limitador(join(o.dir, '_techo'), undefined, undefined, this.ahora);
    mkdirSync(this.dir, { recursive: true });
  }

  /**
   * Trae `clave`. Llama a `origen()` SOLO si hace falta de verdad.
   *
   * El orden importa y es el que produce la cuenta que le prometemos a Avanza:
   *   memoria fresca → vuelo único → disco fresco → cerrojo → techo → origen
   * Cada escalón que se salta es una petición que NO sale.
   */
  async obtener<T>(clave: string, origen: () => Promise<T>): Promise<Resultado<T>> {
    // ── PISO 1a · memoria fresca. El 90% de los aciertos mueren aquí. ────────
    const enMem = this.memoria.get(clave) as Entrada<T> | undefined;
    if (enMem && this.edadMs(enMem) < this.ttl) {
      this.metricas.aciertosMemoria++;
      return this.fresco(enMem, 'memoria');
    }

    // ── PISO 1b · ⭐ VUELO ÚNICO ────────────────────────────────────────────
    //    Aquí es donde 20 peticiones concurrentes se convierten en 1.
    //    NO es una optimización: sin esto, cada visita a una parada popular
    //    multiplica la carga sobre Avanza por el número de curiosos.
    if (!this.o.sinVueloUnico) {
      const volando = this.enVuelo.get(clave);
      if (volando) {
        this.metricas.aciertosVueloUnico++;
        return (await volando) as Resultado<T>;
      }
    }

    this.metricas.fallosDeCache++;
    const trabajo = this.resolver(clave, origen);
    if (!this.o.sinVueloUnico) this.enVuelo.set(clave, trabajo as Promise<Resultado<unknown>>);
    try {
      return await trabajo;
    } finally {
      this.enVuelo.delete(clave);
    }
  }

  private async resolver<T>(clave: string, origen: () => Promise<T>): Promise<Resultado<T>> {
    const fichero = join(this.dir, `${aFichero(clave)}.json`);

    // ── PISO 2 · disco fresco: OTRO worker ya lo trajo. Gratis. ──────────────
    const deDisco = this.leerDisco<T>(fichero);
    if (deDisco && this.edadMs(deDisco) < this.ttl) {
      this.metricas.aciertosDisco++;
      this.memoria.set(clave, deDisco);
      return this.fresco(deDisco, 'disco');
    }

    // ── EL CERROJO · uno solo va a Avanza; los demás, a esperarle ────────────
    const robado = { valor: false };
    let cerrojo: Cerrojo | null = null;
    if (!this.o.sinDisco) {
      cerrojo = coger(`${fichero}.lock`, this.ahora, robado);
      if (robado.valor) this.metricas.cerrojosRobados++;

      if (!cerrojo) {
        // Lo tiene otro worker y sigue vivo. Esperamos a que escriba.
        this.metricas.esperasAOtroWorker++;
        const suyo = await this.esperarAlOtro<T>(fichero);
        if (suyo) {
          this.memoria.set(clave, suyo);
          return this.fresco(suyo, 'disco');
        }
        // No escribió a tiempo. Antes de ir a Avanza por nuestra cuenta —lo que
        // duplicaría la petición—, servimos lo viejo DICIENDO su edad.
        const viejo = this.loMasNuevoQueTengamos<T>(clave, fichero);
        if (viejo) return this.rancio(viejo, 'otro worker está refrescando y no ha llegado a tiempo');
        // Ni eso. Entonces sí: vamos nosotros. Peor una petición de más que un
        // usuario mirando una pantalla vacía sin explicación.
      }
    }

    try {
      // Doble comprobación DENTRO del cerrojo: entre el `leerDisco` de arriba y
      // el `coger`, otro worker ha podido terminar. Si no se mira, su trabajo se
      // tira y se repite la petición.
      const otraVez = this.leerDisco<T>(fichero);
      if (otraVez && this.edadMs(otraVez) < this.ttl) {
        this.metricas.aciertosDisco++;
        this.memoria.set(clave, otraVez);
        return this.fresco(otraVez, 'disco');
      }

      // ── EL TECHO · 4 req/s, compartido. Si no hay ficha, NO se encola ──────
      const ficha = this.limitador.pedirFicha();
      if (!ficha.concedida) {
        this.metricas.denegadasPorTecho++;
        const viejo = this.loMasNuevoQueTengamos<T>(clave, fichero);
        if (viejo) return this.rancio(viejo, `techo de ${this.limitador ? '4' : '?'} peticiones/s alcanzado`);
        return { tipo: 'fallo', motivo: 'techo de peticiones alcanzado y no hay nada guardado que servir' };
      }

      // ── EL ORIGEN. Aquí, y SOLO aquí, se toca Avanza. ─────────────────────
      this.metricas.llamadasAlOrigen++;
      let datos: T;
      try {
        datos = await origen();
      } catch (e) {
        // La fuente falló. ¿Tenemos algo de antes? Se sirve CON SU EDAD.
        const viejo = this.loMasNuevoQueTengamos<T>(clave, fichero);
        const motivo = (e as Error)?.message ?? String(e);
        if (viejo) return this.rancio(viejo, motivo);
        return { tipo: 'fallo', motivo };
      }

      const entrada: Entrada<T> = { datos, observadoEnMs: this.ahora() };
      this.memoria.set(clave, entrada);
      if (!this.o.sinDisco) this.escribirDisco(fichero, entrada);
      return this.fresco(entrada, 'fuente');
    } finally {
      cerrojo?.soltar();
    }
  }

  // ── piezas ────────────────────────────────────────────────────────────────

  private edadMs(e: Entrada<unknown>): number {
    return this.ahora() - e.observadoEnMs;
  }

  private fechado<T>(e: Entrada<T>, origen: Fechado<T>['origen']): Fechado<T> {
    return {
      datos: e.datos,
      observadoEn: new Date(e.observadoEnMs).toISOString(),
      // ⭐ LA EDAD. Redondeada a segundos, hacia abajo, y nunca negativa.
      //    Sin este número la pantalla no puede decir "actualizado hace 18 s",
      //    y sin ese texto la caché es una caja negra que no rinde cuentas.
      edadSegundos: Math.max(0, Math.floor(this.edadMs(e) / 1000)),
      origen,
    };
  }

  private fresco<T>(e: Entrada<T>, origen: Fechado<T>['origen']): Resultado<T> {
    return { tipo: 'fresco', ...this.fechado(e, origen) };
  }

  private rancio<T>(e: Entrada<T>, motivo: string): Resultado<T> {
    this.metricas.serviciosRancios++;
    return { tipo: 'rancio', motivo, ...this.fechado(e, 'disco') };
  }

  /** Lo más reciente que haya, sea de memoria o de disco. Sin mirar el TTL. */
  private loMasNuevoQueTengamos<T>(clave: string, fichero: string): Entrada<T> | null {
    const m = this.memoria.get(clave) as Entrada<T> | undefined;
    const d = this.leerDisco<T>(fichero);
    if (m && d) return m.observadoEnMs >= d.observadoEnMs ? m : d;
    return m ?? d ?? null;
  }

  /**
   * ⚠️ SE ACOTA POR VUELTAS, NO POR RELOJ.
   *
   * La versión anterior hacía `while (ahora() < limite)`. Con un reloj que no
   * avanza —un reloj inyectado en un test, o un reloj de sistema congelado— ese
   * bucle NO TERMINA NUNCA. Y una petición que no termina en un Route Handler
   * es un worker menos, hasta que no queda ninguno.
   *
   * Contar vueltas no depende de ningún reloj: da igual quién mienta.
   */
  private async esperarAlOtro<T>(fichero: string): Promise<Entrada<T> | null> {
    const vueltas = Math.max(1, Math.ceil(ESPERA_MAX_MS / SONDEO_MS));
    for (let i = 0; i < vueltas; i++) {
      await dormir(SONDEO_MS);
      const e = this.leerDisco<T>(fichero);
      if (e && this.edadMs(e) < this.ttl) return e;
    }
    return null;
  }

  private leerDisco<T>(fichero: string): Entrada<T> | null {
    if (this.o.sinDisco) return null;
    try {
      const e = JSON.parse(readFileSync(fichero, 'utf8')) as Entrada<T>;
      // Un fichero a medio escribir no llega aquí (se escribe con rename
      // atómico), pero si llegara, JSON.parse falla y lo tratamos como ausente.
      return Number.isFinite(e?.observadoEnMs) ? e : null;
    } catch {
      return null;
    }
  }

  /**
   * Escritura ATÓMICA: fichero temporal + `rename`.
   *
   * Escribir "en su sitio" tiene una ventana en la que el fichero está a medias.
   * Otro worker que lea justo ahí se encuentra un JSON truncado. `rename` sobre
   * el mismo sistema de ficheros es atómico: o se ve el fichero viejo entero, o
   * el nuevo entero. Nunca la costura.
   */
  private escribirDisco<T>(fichero: string, e: Entrada<T>): void {
    const tmp = `${fichero}.${process.pid}.tmp`;
    try {
      writeFileSync(tmp, JSON.stringify(e));
      renameSync(tmp, fichero);
    } catch {
      try { unlinkSync(tmp); } catch { /* da igual */ }
      // Disco lleno o de solo lectura: el piso 1 sigue funcionando y el motor
      // NO se cae. Degradamos a caché por proceso, que es peor pero no es falso.
    }
  }

  /** Para /api/diag y para los tests. */
  instantanea() {
    return {
      clavesEnMemoria: this.memoria.size,
      enVuelo: this.enVuelo.size,
      ttlSegundos: this.ttl / 1000,
      ...this.metricas,
      techo: this.limitador.estado,
    };
  }
}
