/**
 * EL CERROJO ENTRE PROCESOS.
 *
 * Hostinger arranca N workers de Node. No sabemos cuántos —no lo dice en su
 * documentación y no se puede averiguar desde fuera— y el diseño NO PUEDE
 * depender de esa cifra. Cada worker tiene su propia memoria: un `Map` en
 * JavaScript no los coordina. Sin un canal compartido, 4 workers preguntando
 * cada 15 s por 934 postes son ~1.020 peticiones/minuto contra Avanza, EN
 * SILENCIO, hasta que nos bloqueen la IP.
 *
 * El único canal compartido que hay sin meter Redis es el DISCO. Y en disco, la
 * exclusión mutua se consigue con `open(..., 'wx')` — la bandera O_EXCL, que el
 * sistema operativo garantiza atómica: o creas el fichero tú, o falla. No hay
 * medio camino, ni carrera posible.
 *
 * (Y no es un invento: es exactamente lo que hace el propio Next con su caché,
 * que la doc de auto-hospedaje describe como "in memory and on disk".)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ EL MODO DE FALLO QUE JUSTIFICA MEDIO FICHERO: EL CERROJO HUÉRFANO.
 *
 * Un cerrojo es un candado. Si el worker que lo tiene puesto MUERE —OOM, un
 * SIGKILL, un despliegue a mitad—, el fichero se queda ahí. Para siempre.
 * Y entonces NINGÚN worker vuelve a refrescar esa clave NUNCA MÁS.
 *
 * La aplicación no se cae. No hay excepción. No hay log rojo.
 * Simplemente sirve el último dato bueno... y sigue sirviéndolo mañana.
 *
 * ⭐ ESE ES EXACTAMENTE EL FALLO QUE PERSEGUIMOS: una pantalla coherente y
 *    falsa. Buses de anteayer, pintados con la misma confianza que los de hace
 *    tres segundos.
 *
 * Por eso el cerrojo CADUCA. Un cerrojo más viejo que `LOCK_TTL_MS` está
 * huérfano por definición, y el siguiente que pase lo ROBA. Se prefiere una
 * petición de más a un dato congelado para siempre.
 *
 * ⚠️ Y el número no es arbitrario. Tiene que ser MAYOR que el peor caso de una
 *    petición completa, o robaríamos el cerrojo a un worker que sigue vivo y
 *    trabajando:
 *        timeout(4 s) + backoff(0,3 s) + timeout(4 s) = 8,3 s   →   TTL 12 s.
 *    Si alguien toca los timeouts del transporte y no toca esto, el test
 *    `cerrojo: el TTL cubre el peor caso del transporte` se pone rojo.
 */

import { mkdirSync, openSync, closeSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const LOCK_TTL_MS = 12_000;

export interface Cerrojo {
  /** Suéltalo. Idempotente: soltar dos veces no revienta. */
  soltar(): void;
}

const noEsFaltaDeFichero = (e: unknown) => (e as NodeJS.ErrnoException)?.code !== 'ENOENT';

/**
 * Intenta coger el cerrojo. Devuelve `null` si lo tiene OTRO y sigue vivo.
 *
 * @param robado Se pone a `true` si había un cerrojo huérfano y se ha robado.
 *               Sirve para CONTARLOS: un robo es normal (un worker murió); un
 *               goteo constante de robos significa que los timeouts están mal
 *               calibrados y hay que mirarlo, no taparlo.
 */
export function coger(
  ruta: string,
  ahora: () => number = Date.now,
  robado?: { valor: boolean },
): Cerrojo | null {
  mkdirSync(dirname(ruta), { recursive: true });

  for (let intento = 0; intento < 2; intento++) {
    try {
      // 'wx' = O_CREAT | O_EXCL. Atómico. O lo creo yo, o EEXIST.
      const fd = openSync(ruta, 'wx');
      try {
        // Quién lo tiene. No es decorativo: sale en /api/diag y en los tests.
        writeFileSync(fd, JSON.stringify({ pid: process.pid, desde: ahora() }));
      } finally {
        closeSync(fd);
      }
      let soltado = false;
      return {
        soltar() {
          if (soltado) return;
          soltado = true;
          try {
            unlinkSync(ruta);
          } catch (e) {
            if (noEsFaltaDeFichero(e)) throw e; // que ya no esté es el caso bueno
          }
        },
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;

      // Lo tiene otro. ¿Sigue vivo, o es un huérfano?
      //
      // ⚠️ LA EDAD SE LEE DE DENTRO DEL FICHERO, NO DEL `mtime`.
      //    Usar `mtime` metía un TERCER reloj en la ecuación —el del sistema de
      //    ficheros— junto al del proceso que escribió y el del que lee. Tres
      //    relojes que nadie garantiza que estén de acuerdo (contenedores, NFS,
      //    volúmenes montados). Y el fallo no era teórico: lo cazó el test del
      //    cerrojo huérfano, que se quedó COLGADO 60 segundos porque un cerrojo
      //    muerto le parecía recién nacido. En producción eso significa una
      //    petición que no vuelve.
      //
      //    Con la marca DENTRO, el reloj es el mismo que puso el que escribió.
      let edad: number;
      try {
        const dentro = JSON.parse(readFileSync(ruta, 'utf8')) as { desde?: number };
        // Si no se puede leer la marca, se cae al `mtime` como último recurso;
        // y si tampoco, se da por huérfano: preferimos una petición de más a una
        // clave congelada para siempre.
        edad = ahora() - (Number.isFinite(dentro?.desde) ? dentro.desde! : statSync(ruta).mtimeMs);
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') continue; // lo soltaron: reintenta
        edad = LOCK_TTL_MS + 1; // ilegible = huérfano
      }

      if (edad <= LOCK_TTL_MS) return null; // vivo y trabajando. No se molesta.

      // ⚠️ HUÉRFANO. Lo robamos. Sin esto, esta clave se congela PARA SIEMPRE.
      if (robado) robado.valor = true;
      try {
        unlinkSync(ruta);
      } catch (err) {
        if (noEsFaltaDeFichero(err)) throw err;
      }
      // Y a por él. Si dos workers roban a la vez, uno gana y el otro ve EEXIST
      // otra vez y devuelve null: dos peticiones en el peor caso, no infinitas.
    }
  }
  return null;
}
