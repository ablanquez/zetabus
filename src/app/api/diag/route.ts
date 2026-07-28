/**
 * GET /api/diag — el endoscopio.
 *
 * ⭐ PARA QUÉ EXISTE, EN CONCRETO: PARA CONTAR LOS WORKERS DE HOSTINGER.
 *
 * Cuántos procesos de Node levanta Hostinger es un dato que NO ESTÁ EN SU
 * DOCUMENTACIÓN y que no se puede averiguar desde fuera. Y no es una curiosidad:
 * si son 4, una caché que viva solo en memoria multiplica por 4 las peticiones
 * contra Avanza sin que nadie se entere.
 *
 * Se mide así, en el servidor ya desplegado:
 *
 *     for i in $(seq 1 30); do curl -s https://.../api/diag | jq -r .pid & done | sort -u
 *
 * Cada PID distinto que salga es un worker. Si sale uno solo, es un proceso.
 * Si salen cuatro, son cuatro — y el piso de disco de la caché deja de ser una
 * precaución teórica para ser lo único que impide 1.020 peticiones/minuto.
 *
 * ⚠️ NO SE FILTRA NADA. Ni variables de entorno, ni rutas absolutas, ni la
 * ApiKey del NAP. Este endpoint es público porque el repo es público, y lo que
 * enseña son cuentas nuestras, no secretos.
 */

import { motor, motorRecorrido, motorHorario, contador } from '@/engine/motor';
import { generadoEn, validez, lineas, paradas } from '@/engine/topologia';
import { estadoIndice } from '@/engine/correspondencias';
import { feedStatus, feedWarning } from '@/core';

export const dynamic = 'force-dynamic';

/**
 * ⭐⭐ EL DIRECTORIO DE TRABAJO, Y POR QUÉ SE RECORTA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  PARA QUÉ SIRVE. Es el único dato que separa dos historias que desde fuera son
 *  IDÉNTICAS: «Hostinger reescribe el mismo directorio en cada despliegue» y
 *  «Hostinger clona en un directorio nuevo». Las fechas de `generadoEn` cambian
 *  en los dos casos —el build las regenera siempre—, así que no distinguen nada.
 *
 *  Y lo que decide: **dónde tiene que escribir el cron nocturno.** Si la ruta es
 *  efímera, un cron que escriba donde estaba hoy estará escribiendo en un
 *  directorio muerto mañana — **sin error y sin aviso**, que es la peor forma.
 *
 *  ⚠️ POR QUÉ NO SE ENSEÑA ENTERA. La ruta real empieza por `/home/uXXXXXXXXX/`:
 *  el identificador de la cuenta de hosting. Este endpoint es PÚBLICO. Es la
 *  misma familia que las rutas de disco que se limpiaron del árbol el 25/07
 *  —información personal que nadie decidió publicar— y se trata igual: **se
 *  conserva lo que el dato tiene que contar y se va lo que identifica.**
 *
 *  Sustituir `$HOME` por `~` no pierde NADA de la medición: cualquier cambio en
 *  la parte que importa (`…/.builds/source/repository`) se sigue viendo. Y sigue
 *  sirviendo para configurar el cron, anteponiendo `$HOME`.
 *
 *  ⛔ Si en algún entorno no hubiera `HOME`, se enseña la ruta tal cual: preferir
 *     un dato crudo a un dato inventado. En Hostinger (Linux) siempre está.
 * ═══════════════════════════════════════════════════════════════════════════
 */
function directorioDeTrabajo(): string {
  const cwd = process.cwd();
  const casa = process.env.HOME ?? process.env.USERPROFILE;
  return casa && cwd.startsWith(casa) ? `~${cwd.slice(casa.length)}` : cwd;
}

export async function GET() {
  const { cache } = motor();
  const ahora = new Date();
  const estado = feedStatus(validez, ahora);

  return Response.json(
    {
      // ⭐ Lo que se viene a buscar aquí.
      pid: process.pid,
      arribaDesdeSegundos: Math.round(process.uptime()),

      // ⭐ Compárese ENTRE DESPLIEGUES, no dentro de uno. Distinto → la ruta es
      //    efímera y el cron necesita un sitio estable fuera de `.builds/`.
      //    Igual → se puede escribir donde está. Ver `directorioDeTrabajo`.
      cwd: directorioDeTrabajo(),

      avanza: {
        ...contador.cuenta,
        peticionesPorMinutoMedidas: Number(contador.porMinuto().toFixed(2)),
        msMediosPorPeticion:
          contador.cuenta.peticiones > 0
            ? Math.round(contador.cuenta.msAcumulados / contador.cuenta.peticiones)
            : null,
      },

      // ⭐ LAS TRES cachés del sistema, CON NOMBRE. La del VIVO (llegadas, TTL 15 s), la del
      //    RECORRIDO (desvíos, TTL 1 h) y la del HORARIO WEB (TTL 1 día) — cada una es una
      //    instancia aparte (ver `motorRecorrido` y `motorHorario`). Sin nombre serían bloques
      //    idénticos y no se sabría cuál se está moviendo. Cada una tiene su `ttlSegundos`, su
      //    contador y su techo propios. Si una caché del sistema no sale aquí, hay un trozo del
      //    que el endoscopio no puede decir nada — que es justo lo que este endpoint persigue.
      cache: {
        llegadas: cache.instantanea(),
        recorrido: motorRecorrido().cache.instantanea(),
        horario: motorHorario().cache.instantanea(),
      },

      // ⭐ EL ÍNDICE DE CORRESPONDENCIAS. AQUÍ es donde se nota si va en modo degradado
      //    (sin fichero → normales del GTFS, sin provisionales) y cuántos días lleva el
      //    barrido — la edad NO va a la pantalla del usuario, va aquí y al panel. Y aquí
      //    salen los postes solo-barrido SIN coordenada, para resolverlos a mano.
      correspondencias: estadoIndice(),

      datos: {
        generadoEn,
        lineas: lineas().length,
        paradas: paradas().length,
        feed: { ...validez, estado: estado.kind },
        // Si el feed caduca, aquí sale — aunque todavía no haya pantalla que lo diga.
        aviso: feedWarning(estado, validez),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
