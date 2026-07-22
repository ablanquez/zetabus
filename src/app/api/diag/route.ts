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

import { motor, contador } from '@/engine/motor';
import { generadoEn, validez, lineas, paradas } from '@/engine/topologia';
import { estadoIndice } from '@/engine/correspondencias';
import { feedStatus, feedWarning } from '@/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { cache } = motor();
  const ahora = new Date();
  const estado = feedStatus(validez, ahora);

  return Response.json(
    {
      // ⭐ Lo que se viene a buscar aquí.
      pid: process.pid,
      arribaDesdeSegundos: Math.round(process.uptime()),

      avanza: {
        ...contador.cuenta,
        peticionesPorMinutoMedidas: Number(contador.porMinuto().toFixed(2)),
        msMediosPorPeticion:
          contador.cuenta.peticiones > 0
            ? Math.round(contador.cuenta.msAcumulados / contador.cuenta.peticiones)
            : null,
      },

      cache: cache.instantanea(),

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
