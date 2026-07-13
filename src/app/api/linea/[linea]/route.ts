/**
 * GET /api/linea/<linea>        → los autobuses DETECTADOS en esa línea
 * GET /api/linea/<linea>?desvios → además, el diff contra la ruta de hoy
 *
 * ⚠️ "DETECTADOS", NO "TODOS". Ver `src/engine/barrido.ts`.
 */

import { barrerLinea } from '@/engine/barrido';
import { desviosDeLinea } from '@/engine/desvios';
import { motor } from '@/engine/motor';
import { idLinea, lineas } from '@/engine/topologia';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ linea: string }> }) {
  const { linea } = await ctx.params;
  const dep = motor();

  // El usuario escribe "35" o "ci3"; el GTFS usa un route_id interno.
  const l = lineas().find((x) => x.shortName.toLowerCase() === decodeURIComponent(linea).toLowerCase());
  if (!l) {
    return Response.json(
      { estado: 'desconocido', motivo: `La línea "${linea}" no existe en el GTFS de Zaragoza.` },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const id = idLinea(String(l.id));

  const quiereDesvios = new URL(req.url).searchParams.has('desvios');
  const [buses, desvios] = await Promise.all([
    barrerLinea(id, dep),
    quiereDesvios ? desviosDeLinea(id, dep) : Promise.resolve(null),
  ]);

  const codigo = buses.estado === 'caido' ? 503 : buses.estado === 'desconocido' ? 404 : 200;
  return Response.json(
    { buses, ...(desvios ? { desvios } : {}) },
    { status: codigo, headers: { 'Cache-Control': 'no-store' } },
  );
}
