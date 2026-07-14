/**
 * GET /api/barrido/<linea>  →  NDJSON EN DIRECTO, mientras se barre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ ESTE ENDPOINT SOLO SE LLAMA CUANDO EL USUARIO PULSA UN BOTÓN.
 *
 *  Antes, el barrido se disparaba SOLO al abrir /linea/35. Dieciocho peticiones
 *  a Avanza que NADIE HABÍA PEDIDO — el que solo quería ver el recorrido, las
 *  pagaba igual. Y hemos observado que un par de barridos seguidos dejan a
 *  Avanza sin responder unos minutos.
 *
 *  El repositorio es público y PROMETE POR ESCRITO no abusar. Un barrido que se
 *  dispara solo, sin que nadie lo pida, no se puede defender.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ POR QUÉ SE TRANSMITE EN LUGAR DE DEVOLVER AL FINAL.
 *
 * Barrer 18 postes tarda unos segundos. Si el endpoint devolviera al terminar,
 * el usuario miraría una rueda girando y no sabría si va bien, si va mal, o si
 * se ha colgado. Transmitiendo poste a poste, la espera deja de ser un problema
 * y pasa a ser el espectáculo: se VE trabajar.
 *
 * ⚠️ Y LOS FALLOS SE DICEN MIENTRAS OCURREN, no al final. Así ya no tapan el
 * resultado: pasan ANTES que él. Es lo que arregla, solo, el problema del bloque
 * de avisos que gritaba más que el dato.
 *
 * NDJSON —una línea de JSON por evento— y no SSE, porque no hace falta la
 * reconexión automática de SSE: si el barrido se corta, se vuelve a pulsar el
 * botón. Meter un protocolo con más partes de las que se usan es una ñapa cara.
 */

import { barrerLinea } from './barrido';
import { motor } from '@/engine/motor';
import { idLinea, lineas } from '@/engine/topologia';
import { fingimientoDe, transporteDe } from '@/engine/fingir';
import { contador } from '@/sources/avanza/transporte';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ linea: string }> }) {
  const { linea: etiqueta } = await ctx.params;
  const url = new URL(req.url);
  const fingir = fingimientoDe(Object.fromEntries(url.searchParams));

  const l = lineas().find(
    (x) => x.shortName.toLowerCase() === decodeURIComponent(etiqueta).toLowerCase(),
  );
  if (!l) {
    return Response.json(
      { estado: 'desconocido', motivo: `La línea "${etiqueta}" no existe en el GTFS de Zaragoza.` },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const antes = contador.cuenta.peticiones;
  const codificador = new TextEncoder();

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(canal) {
      const linea = (o: unknown) => canal.enqueue(codificador.encode(`${JSON.stringify(o)}\n`));

      try {
        const r = await barrerLinea(idLinea(String(l.id)), motor(transporteDe(fingir), fingir), {
          onPoste: (p) => {
            // ⭐ EN CUANTO CADA POSTE TERMINA. Ni antes ni al final.
            linea({ tipo: 'poste', ...p });
          },
          // ⚠️ EL RITMO SOLO SE SALTA CUANDO NO HAY NADIE A QUIEN PROTEGER.
          //    El ritmo de 4/s existe para no machacar a Avanza. Con un
          //    fingimiento activo, el transporte es FALSO: no sale ni un byte
          //    hacia ellos, así que esperar 17 segundos no protegería a nadie —
          //    solo haría los tests lentos y la demo insoportable.
          //
          //    Y no se puede activar por accidente: `fingimientoDe()` exige
          //    ZETABUS_DEMO === '1'. En producción esa variable no existe, luego
          //    `fingir` es null, luego el ritmo se aplica SIEMPRE. Hay un test.
          ...(fingir ? { porSegundo: Infinity } : {}),
        });

        linea({
          tipo: 'fin',
          observacion: r,
          // ⚠️ LA CUENTA REAL DE PETICIONES A AVANZA, MEDIDA EN EL ÚNICO SITIO
          //    DEL PROGRAMA QUE HABLA CON ELLOS. No es una estimación: es el
          //    contador. Y se enseña, porque lo que se promete se demuestra.
          peticionesAAvanza: contador.cuenta.peticiones - antes,
        });
      } catch (e) {
        linea({ tipo: 'error', motivo: (e as Error)?.message ?? 'fallo inesperado' });
      } finally {
        canal.close();
      }
    },
  });

  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      // Sin esto, un proxy puede acumular la respuesta entera y entregarla de
      // golpe al final — y entonces la barra saltaría de 0 a 18 sin pasar por
      // los pasos de en medio. La barra existiría, y no mediría nada.
      'X-Accel-Buffering': 'no',
    },
  });
}
