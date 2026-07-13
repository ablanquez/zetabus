/**
 * GET /api/llegadas/<poste>
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

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ poste: string }> }) {
  const { poste } = await ctx.params;
  const o = await llegadasDePoste(poste, motor());

  // El estado del motor se traduce a HTTP SIN aplanarlo. Cada uno significa una
  // cosa distinta, y el cliente tiene que poder distinguirlos:
  const codigo =
    o.estado === 'desconocido' ? 404 // ese poste no existe. No es "no hay buses".
    : o.estado === 'ilegible' ? 502  // Avanza contestó algo que no entendemos.
    : o.estado === 'caido' ? 503     // Avanza no contesta.
    : 200;                            // ok o rancio: hay datos, con su edad dentro.

  return Response.json(o, {
    status: codigo,
    headers: {
      // Que ningún intermediario nos cachee: la edad que va dentro del cuerpo
      // dejaría de ser cierta en cuanto un proxy sirviera esto dos veces.
      'Cache-Control': 'no-store',
    },
  });
}
