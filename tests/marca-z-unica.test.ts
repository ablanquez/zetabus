/**
 * ⭐⭐ EL GUARDIÁN DE LA Z ÚNICA. Que reviente si aparece un SEGUNDO dibujo de la
 * Z de la marca en cualquier parte de `src` — no una lista de sitios conocidos,
 * sino la FORMA: se parsea todo dato de path/polyline y se caza cualquier Z, aun
 * dibujada con coordenadas nuevas en un fichero nuevo (como el centinela de <Cita>).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ. La Opción A dice: una geometría, el stroke como variable. El favicon
 *  es un recorte de la marca, no un SVG aparte. Sin este test, dentro de tres
 *  meses alguien redibuja la Z para un caso suelto (un spinner, un OG image, un
 *  botón) y vuelven a existir dos Z que mantener a mano. Aquí se corta.
 *
 *  QUÉ ES UNA "Z": un polígono de 4 vértices con barra superior horizontal,
 *  diagonal a la baja hacia la izquierda, y barra inferior horizontal — la
 *  silueta de la Z. Se ignoran curvas y arcos (el pin del mapa) y los polígonos
 *  que no son de 4 puntos (el triángulo de la punta del pin).
 *
 *  ⚠️ ALCANCE HONESTO: caza path `d="…"`/`d='…'`, literales de path (`const Z =
 *     'M …'`) y `points="…"` de polyline, en .ts/.tsx/.svg. NO caza una Z metida
 *     como imagen rasterizada (PNG) ni una dibujada con curvas Bézier a mano — pero
 *     eso ya no es "copiar el path", es rehacer el símbolo desde cero, y se ve.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const sinComentarios = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

type Punto = { x: number; y: number };

/** Convierte datos de path (solo M/L/H/V, sin curvas) en la lista de vértices. */
function verticesDePath(d: string): Punto[] | null {
  if (/[CcSsQqTtAa${}]/.test(d)) return null; // curvas, arcos o interpolación → no es un polígono
  const tokens = d.match(/[MLHVZmlhvz]|-?\d*\.?\d+/g);
  if (!tokens) return null;
  const pts: Punto[] = [];
  let cx = 0, cy = 0, cmd = '';
  let i = 0;
  while (i < tokens.length) {
    if (/[MLHVZmlhvz]/.test(tokens[i])) { cmd = tokens[i++]; if (/[Zz]/.test(cmd)) continue; }
    if (!cmd) return null;
    const abs = cmd === cmd.toUpperCase();
    if (/[ML]/i.test(cmd)) {
      const x = Number(tokens[i++]), y = Number(tokens[i++]);
      if (Number.isNaN(x) || Number.isNaN(y)) return null;
      cx = abs ? x : cx + x; cy = abs ? y : cy + y;
    } else if (/[H]/i.test(cmd)) {
      const x = Number(tokens[i++]); if (Number.isNaN(x)) return null; cx = abs ? x : cx + x;
    } else if (/[V]/i.test(cmd)) {
      const y = Number(tokens[i++]); if (Number.isNaN(y)) return null; cy = abs ? y : cy + y;
    } else return null;
    pts.push({ x: cx, y: cy });
  }
  return pts;
}

/** Convierte `points="x,y x,y …"` en vértices. */
function verticesDePoints(s: string): Punto[] | null {
  const n = s.match(/-?\d*\.?\d+/g);
  if (!n || n.length < 2 || n.length % 2 !== 0) return null;
  const pts: Punto[] = [];
  for (let i = 0; i < n.length; i += 2) pts.push({ x: Number(n[i]), y: Number(n[i + 1]) });
  return pts;
}

const cerca = (a: number, b: number) => Math.abs(a - b) <= 2;

/** ¿Estos 4 vértices dibujan una Z? (barra sup horizontal, diagonal ↙, barra inf horizontal). */
function esZeta(p: Punto[]): boolean {
  if (p.length !== 4) return false;
  const [a, b, c, d] = p;
  return (
    cerca(a.y, b.y) &&        // barra superior horizontal
    cerca(c.y, d.y) &&        // barra inferior horizontal
    c.y - b.y > 8 &&          // la inferior claramente debajo de la superior
    b.x > a.x + 4 &&          // la barra superior va hacia la derecha
    d.x > c.x + 4 &&          // la inferior también
    c.x < b.x - 4             // la diagonal baja hacia la IZQUIERDA
  );
}

/** Todas las Z que dibuja un código (por su forma). */
function zetasEn(codigo: string): Punto[][] {
  const limpio = sinComentarios(codigo);
  const zetas: Punto[][] = [];
  // 1) cualquier string entrecomillado cuyo contenido empiece por M (path data):
  //    cubre `d="M …"` (svg/tsx) y `const Z = 'M …'` (literal) de una vez.
  for (const m of limpio.matchAll(/(["'`])(\s*[Mm][\s,][^"'`]*?)\1/g)) {
    const v = verticesDePath(m[2]);
    if (v && esZeta(v)) zetas.push(v);
  }
  // 2) polylines: `points="x,y …"`.
  for (const m of limpio.matchAll(/\bpoints\s*=\s*(["'`])([^"'`]*)\1/g)) {
    const v = verticesDePoints(m[2]);
    if (v && esZeta(v)) zetas.push(v);
  }
  return zetas;
}

function ficherosDe(dir: string): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) salida.push(...ficherosDe(p));
    else if (/\.(ts|tsx|svg)$/.test(e.name)) salida.push(p);
  }
  return salida;
}

describe('⛔⛔ UNA SOLA Z EN TODO EL PROYECTO', () => {
  it('solo existe UN dibujo de la Z, y vive en la fuente única', () => {
    const sitios: string[] = [];
    for (const f of ficherosDe('src')) {
      const rel = f.replace(/\\/g, '/');
      const n = zetasEn(readFileSync(f, 'utf8')).length;
      for (let i = 0; i < n; i++) sitios.push(rel);
    }
    // Debe haber EXACTAMENTE una Z, y en `marca-fuente.ts`. Si esto se pone rojo:
    // no redibujes la Z — importa `Z_PATH` de `@/components/marca-fuente`.
    expect(sitios, 'dibujos de la Z encontrados (debería ser solo la fuente)').toEqual([
      'src/components/marca-fuente.ts',
    ]);
  });

  it('⭐ CONTRAPRUEBA: caza una Z plantada, e ignora triángulo y curva', () => {
    // Una Z nueva (coordenadas distintas, sitio nuevo) → cazada:
    expect(zetasEn(`<path d="M 0 0 L 30 0 L 0 40 L 40 40" />`)).toHaveLength(1);
    expect(zetasEn(`const otra = 'M 5 5 L 25 5 L 5 35 L 33 35';`)).toHaveLength(1);
    // Una Z como polyline también:
    expect(zetasEn(`<polyline points="0,0 30,0 0,40 40,40" />`)).toHaveLength(1);
    // El triángulo de la punta del pin (3 vértices) → NO es Z:
    expect(zetasEn(`<path d="M1 0 L9 9 L17 0 Z" />`)).toHaveLength(0);
    // La gota del pin (curvas + arco) → NO es Z:
    expect(zetasEn(`<path d="M14 35C14 35 25 22.2 25 14A11 11 0 1 0 3 14c0 8.2 11 21 11 21Z" />`)).toHaveLength(0);
    // Una Z dentro de un comentario → NO cuenta (es documentación):
    expect(zetasEn(`// la Z es d="M 16 14 L 38 14 L 16 50 L 52 50"\nconst x = 1;`)).toHaveLength(0);
  });
});

describe('⛔ EL FAVICON NO SE SEPARA DEL TOKEN DE MARCA', () => {
  it('el hex de la Z en app/icon.tsx es exactamente --color-marca del CSS', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    const token = css.match(/--color-marca:\s*(#[0-9a-fA-F]{3,8})/)?.[1]?.toLowerCase();
    const icon = readFileSync('src/app/icon.tsx', 'utf8');
    const usado = icon.match(/stroke="(#[0-9a-fA-F]{3,8})"/)?.[1]?.toLowerCase();
    expect(token, '--color-marca en globals.css').toBeTruthy();
    // Si el favicon y el token divergen, la marca tiene dos colores distintos
    // según dónde se pinte. Deben ser el MISMO.
    expect(usado).toBe(token);
  });
});
