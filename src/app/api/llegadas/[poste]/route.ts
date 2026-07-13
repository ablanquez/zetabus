/**
 * GET /api/llegadas/<poste>
 *
 * Lo consume el panel de llegadas del cliente cada 15 s. Devuelve la
 * `Observacion` ENTERA —con su estado y su edad— para que la pantalla pueda
 * distinguir "no hay autobuses" de "no lo sabemos".
 *
 * ⚠️ NUNCA se cachea en el framework. Nuestra caché es la que manda, porque es
 * la única que expone la EDAD del dato — y sin la edad, la pantalla no puede ser
 * honesta. Dos cachés apiladas serían dos relojes que no se hablan.
 *
 * (Además, la doc oficial de Next lo dice: los Route Handlers no se cachean por
 * defecto, y la memoización de `fetch` es solo para GET y no aplica en Route
 * Handlers. Nuestra llamada a Avanza es un POST desde un Route Handler: el
 * mecanismo del framework no nos sirve NI AUNQUE QUISIÉRAMOS.)
 */

import { llegadasDePoste } from '@/engine/llegadas';
import { motor } from '@/engine/motor';
import { fingimientoDe, transporteDe } from '@/engine/fingir';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ poste: string }> }) {
  const { poste } = await ctx.params;

  // ⚠️ El refresco del cliente TIENE que fingir lo mismo que la página, o el
  //    modo demo sería una mentira a medias: la primera carga fingiría el fallo
  //    y quince segundos después "se arreglaría" solo. Yo habría abierto
  //    `?fingir=caido`, habría visto el aviso, habría esperado, habrían
  //    aparecido autobuses, y me habría quedado sin saber qué acababa de ver.
  const url = new URL(req.url);
  const fingir = fingimientoDe(Object.fromEntries(url.searchParams));

  const o = await llegadasDePoste(poste, motor(transporteDe(fingir), fingir));

  // Los estados del motor se traducen a HTTP SIN APLANARLOS. Cada uno significa
  // una cosa distinta y el cliente tiene que poder distinguirlos:
  const codigo =
    o.estado === 'desconocido' ? 404 // ese poste no existe. NO es "no hay buses".
    : o.estado === 'ilegible' ? 502  // Avanza contestó algo que no entendemos.
    : o.estado === 'caido' ? 503     // Avanza no contesta.
    : 200;                            // ok o rancio: hay datos, con su edad dentro.

  return Response.json(o, {
    status: codigo,
    headers: {
      // Que ningún intermediario nos cachee: la edad que va DENTRO del cuerpo
      // dejaría de ser cierta en cuanto un proxy sirviera esto dos veces.
      'Cache-Control': 'no-store',
    },
  });
}
