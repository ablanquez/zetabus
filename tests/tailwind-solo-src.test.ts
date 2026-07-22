/**
 * ⛔ TAILWIND SOLO ESCANEA `src` (lista blanca). Que nadie quite `source(none)`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sin `source(none)`, Tailwind auto-detecta fuentes y en DEV (Turbopack) ingiere
 *  `.next/server/app/*.html` —el HTML prerenderizado con el payload RSC troceado—.
 *  Cuando un corte de chunk cae en medio de una clase `[…]`, Tailwind genera una
 *  utilidad rota y TUMBA la hoja entera: dev responde 500. La causa está medida
 *  (docs abajo). El arreglo es LISTA BLANCA, no exclusión: lo no listado no existe.
 *
 *  Este test es el tripwire: si alguien borra `source(none)` viéndolo como una
 *  restricción gratuita, se pone rojo y explica por qué NO lo es.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/app/globals.css', 'utf8');

describe('⛔ la lista blanca de fuentes de Tailwind sigue puesta', () => {
  it('globals.css apaga la auto-detección con source(none)', () => {
    // Si esto falta, Tailwind vuelve a poder escanear `.next` → 500 en dev.
    expect(css).toMatch(/@import\s+["']tailwindcss["']\s+source\(none\)\s*;/);
  });

  it('y declara `src` como única fuente explícita', () => {
    // `@source ".."` desde src/app/globals.css = el árbol `src`. Sin esto, con la
    // auto-detección apagada, no se generaría NINGUNA utilidad.
    expect(css).toMatch(/@source\s+["']\.\.["']\s*;/);
  });
});
