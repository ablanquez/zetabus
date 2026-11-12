/**
 * ⭐ LOS CHIPS DE TRANSBORDO CONSERVAN `?fingir=`, COMO LOS BOTONES DE SENTIDO.
 *
 * Una línea abierta fingiendo (`/linea/35?fingir=caido`) no pide nada a Avanza. Pero
 * el chip de transbordo enlazaba a `/linea/X` SIN `fingir`: al pulsarlo, la demo se
 * salía a datos reales y la página de destino esperaba a Avanza. El e2e C4
 * (`e2e/bloque-parada.spec.ts`) dio rojo por eso con 10 s de espera (bitácora, Fase 58),
 * cuando su cabecera promete no pedirle NADA a Avanza.
 *
 * Los botones de sentido (`page.tsx`) y los enlaces a la parada (`Itinerario.tsx`) ya
 * arrastraban el fingimiento. El chip era el único enlace de la vista que lo soltaba.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Itinerario, type ParadaDelItinerario } from '@/components/Itinerario';
import { idLinea, idParada, lineas, parada, posteDe, sentidosDe } from '@/engine/topologia';

function pinta(fingir: string | null): string[] {
  const l = lineas().find((x) => x.shortName === '35')!;
  const id = idLinea(String(l.id));
  const paradas: ParadaDelItinerario[] = [];
  for (const sid of sentidosDe(id)[0].official.stops) {
    const poste = posteDe(idParada(sid));
    const p = parada(idParada(sid));
    if (poste !== null && p) paradas.push({ poste, nombre: p.name, sid: idParada(sid) });
  }
  const html = renderToStaticMarkup(
    createElement(Itinerario, { lineaId: id, linea: l, paradas, fingir, info: null }),
  );
  // El <a> que envuelve a cada chip de transbordo.
  return [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*data-papel="chip-transbordo"/g)].map((m) => m[1]);
}

describe('⭐ el chip de transbordo y el fingimiento', () => {
  it('la 35 tiene chips de transbordo (si no, el test no prueba nada)', () => {
    expect(pinta(null).length).toBeGreaterThan(0);
  });

  it('fingiendo, TODOS los chips llevan el mismo `?fingir=`', () => {
    const hrefs = pinta('caido');
    for (const h of hrefs) expect(h, `el chip ${h} suelta el fingimiento`).toMatch(/^\/linea\/[^?]+\?fingir=caido$/);
  });

  it('sin fingir, ningún chip lleva `fingir` (la página real sigue igual)', () => {
    for (const h of pinta(null)) expect(h).toMatch(/^\/linea\/[^?]+$/);
  });
});
