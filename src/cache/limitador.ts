/**
 * EL TECHO DURO. 4 PETICIONES POR SEGUNDO CONTRA AVANZA. PASE LO QUE PASE.
 *
 * ⚠️ POR QUÉ ESTO NO SOBRA, AUNQUE YA HAYA CACHÉ.
 *
 * Es tentador pensar que la caché ya limita: si cada clave se refresca como
 * mucho cada 15 s, ¿cuántas peticiones pueden salir? La cuenta:
 *
 *      934 postes  ÷  15 s de TTL  =  62,3 peticiones/segundo
 *
 * La caché acota las peticiones POR CLAVE. No acota el número de CLAVES. Un
 * rastreador que recorra `/api/llegadas/<poste>` para los 934 postes produce
 * 934 fallos de caché legítimos, y los 934 son peticiones reales a Avanza.
 * La caché estaría funcionando perfectamente mientras nos bloquean la IP.
 *
 * El techo, por tanto, es OTRA pieza. No es redundante: es la que aguanta el
 * caso que la caché no ve.
 *
 * ⚠️ Y TIENE QUE SER COMPARTIDO ENTRE PROCESOS.
 * Un cubo de fichas por worker no es un techo de 4 req/s: es un techo de 4·N,
 * con N desconocido. Sería exactamente la misma mentira que la caché en memoria
 * a secas. Va al disco, como el cerrojo, y por el mismo motivo.
 *
 * ⭐ QUÉ PASA CUANDO SE ACABAN LAS FICHAS: NO SE ENCOLA. SE ENVEJECE.
 *
 * La tentación es esperar a que haya ficha. Pero encolar convierte una carga
 * alta en latencia sin límite, y el usuario se queda mirando una rueda.
 * Lo que hacemos es servir lo último bueno DICIENDO SU EDAD. Bajo presión,
 * ZetaBus no machaca a Avanza y no miente: simplemente se le nota que va viejo,
 * y se le nota EN LA PANTALLA, porque la edad va escrita.
 */

import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Fichas por segundo. EL TECHO SOSTENIDO, que es el que de verdad le importa a
 * Avanza y el que promete el README público. Este número no se toca.
 */
export const TASA_POR_SEGUNDO = 4;

/**
 * ⚠️ LA RÁFAGA. Y AQUÍ ME EQUIVOQUÉ, ASÍ QUE QUEDA ESCRITO.
 *
 * Puse 8, con el comentario "un barrido de línea (17 postes) no debe atascarse
 * de golpe". Ocho. Para diecisiete. **Mi propio comentario contradecía mi propio
 * número**, y no me di cuenta hasta que un test contó los autobuses y no le
 * salieron las cuentas.
 *
 * Y la cifra real es peor: la línea **N7 tiene 119 postes**, que con paso 4 son
 * **31 peticiones**. Con un cubo de 8, el barrido de la línea más larga de
 * Zaragoza se truncaba a 8 postes de 31 — es decir, la función principal del
 * producto quedaba mutilada de serie. No en silencio (salía el aviso "barrido
 * INCOMPLETO"), pero mutilada.
 *
 * Una ráfaga NO relaja el techo: el sostenido sigue siendo 4/s. Solo permite que
 * la primera carga de una línea salga entera en vez de a trozos.
 *
 * ⚠️ ESTE NÚMERO ESTÁ ATADO A LA TOPOLOGÍA. Si un día crece una línea, el test
 *    `el cubo da para el barrido MÁS LARGO de la red` se pone rojo. No se
 *    confía en que alguien se acuerde.
 */
export const CAPACIDAD = 40;

const CERROJO_TTL_MS = 1_000; // el cubo se toca en microsegundos; 1 s ya es huérfano

interface Cubo {
  fichas: number;
  ultimoMs: number;
}

/** Lo que ha pasado al pedir una ficha. Se cuenta y se enseña en /api/diag. */
export interface Veredicto {
  readonly concedida: boolean;
  readonly fichasRestantes: number;
}

export class Limitador {
  private readonly rutaCubo: string;
  private readonly rutaCerrojo: string;
  /** Cubo en memoria, para el caso de un solo proceso (tests, `next dev`). */
  private cubo: Cubo | null = null;
  concedidas = 0;
  denegadas = 0;

  constructor(
    private readonly dir: string,
    private readonly tasa: number = TASA_POR_SEGUNDO,
    private readonly capacidad: number = CAPACIDAD,
    private readonly ahora: () => number = Date.now,
  ) {
    this.rutaCubo = join(dir, 'cubo.json');
    this.rutaCerrojo = join(dir, 'cubo.lock');
  }

  /**
   * Pide una ficha. NO espera: contesta sí o no, y el que llama decide.
   *
   * Todo el ciclo leer-modificar-escribir va dentro del cerrojo. Sin él, dos
   * workers leen "quedan 2", los dos restan uno, los dos escriben "queda 1", y
   * el cubo ha regalado una ficha. Eso es una condición de carrera de manual, y
   * en un techo de peticiones significa que el techo no existe.
   */
  pedirFicha(): Veredicto {
    const cerrojo = this.cogerCerrojoConEspera();
    try {
      const t = this.ahora();
      const cubo = this.leer(t);

      // Rellenado continuo: las fichas se regeneran con el tiempo, no a saltos.
      const transcurrido = Math.max(0, t - cubo.ultimoMs);
      cubo.fichas = Math.min(this.capacidad, cubo.fichas + (transcurrido / 1000) * this.tasa);
      cubo.ultimoMs = t;

      if (cubo.fichas < 1) {
        this.denegadas++;
        this.escribir(cubo);
        return { concedida: false, fichasRestantes: cubo.fichas };
      }
      cubo.fichas -= 1;
      this.concedidas++;
      this.escribir(cubo);
      return { concedida: true, fichasRestantes: cubo.fichas };
    } finally {
      cerrojo?.();
    }
  }

  get estado(): { fichas: number; concedidas: number; denegadas: number } {
    const t = this.ahora();
    const c = this.leer(t);
    const fichas = Math.min(this.capacidad, c.fichas + (Math.max(0, t - c.ultimoMs) / 1000) * this.tasa);
    return { fichas, concedidas: this.concedidas, denegadas: this.denegadas };
  }

  // ── disco ────────────────────────────────────────────────────────────────
  private leer(t: number): Cubo {
    try {
      const c = JSON.parse(readFileSync(this.rutaCubo, 'utf8')) as Cubo;
      if (Number.isFinite(c.fichas) && Number.isFinite(c.ultimoMs)) {
        // El cubo de disco MANDA sobre el de memoria: es el que ven todos.
        this.cubo = c;
        return { ...c };
      }
    } catch {
      /* no existe, o está a medio escribir. Se cae al de memoria. */
    }
    return this.cubo ? { ...this.cubo } : { fichas: this.capacidad, ultimoMs: t };
  }

  private escribir(c: Cubo): void {
    this.cubo = { ...c };
    try {
      mkdirSync(dirname(this.rutaCubo), { recursive: true });
      writeFileSync(this.rutaCubo, JSON.stringify(c));
    } catch {
      // Si el disco es de solo lectura, el techo degrada a por-proceso. NO se
      // desactiva: 4·N sigue siendo mejor que infinito. Y se avisa en /api/diag.
    }
  }

  /**
   * Cerrojo con espera CORTA. A diferencia del de las claves, aquí sí se espera:
   * la sección crítica dura microsegundos y el que espera va a ir a la red
   * después, así que 20 ms no se notan.
   *
   * Si no lo consigue en el plazo, SIGUE ADELANTE sin cerrojo. Es deliberado:
   * un techo que a veces regala una ficha es infinitamente mejor que un motor
   * que se bloquea. Se degrada la precisión, no la disponibilidad.
   */
  private cogerCerrojoConEspera(): (() => void) | null {
    mkdirSync(this.dir, { recursive: true });
    const hasta = this.ahora() + 25;
    for (;;) {
      try {
        closeSync(openSync(this.rutaCerrojo, 'wx'));
        return () => { try { unlinkSync(this.rutaCerrojo); } catch { /* ya no está */ } };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return null;
        // ¿huérfano? (mismo razonamiento que en cerrojo.ts, con otro plazo)
        try {
          if (this.ahora() - statSync(this.rutaCerrojo).mtimeMs > CERROJO_TTL_MS) {
            unlinkSync(this.rutaCerrojo);
            continue;
          }
        } catch { /* desapareció; reintenta */ }
        if (this.ahora() >= hasta) return null; // adelante sin cerrojo
        esperaCorta();
      }
    }
  }
}

/** Espera activa de ~1 ms. Sin `await`: `pedirFicha` es síncrona a propósito,
 *  para que no pueda intercalarse otra petición del mismo proceso en mitad. */
function esperaCorta(): void {
  const fin = Date.now() + 1;
  while (Date.now() < fin) { /* ceder es peor: reabriría la ventana de carrera */ }
}
