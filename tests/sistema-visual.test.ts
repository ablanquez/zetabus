/**
 * ⛔⛔ EL GUARDIÁN DEL SISTEMA VISUAL. La lección de la referencia, hecha test.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  La referencia tiene la regla escrita ("prohibido el hex hardcodeado") y aun
 *  así se le coló un `TH_COLOR = "#2563eb"`. **La regla sin test se incumple.**
 *
 *  Este test REVIENTA si aparece un color a mano donde debería haber un token.
 *  No prohíbe TODO hex —hay unos pocos legítimos, con nombre y motivo—: prohíbe
 *  los NUEVOS. Añadir uno obliga a pasar por aquí, que es justo el punto: que
 *  meter un color a pelo sea un acto deliberado y visible, no un descuido que
 *  pudre el sistema en tres tandas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ⚠️ UN GREP SOBRE PROSA NO ES UN CHEQUEO DE CÓDIGO. Los comentarios de este
 * proyecto están LLENOS de hex de ejemplo ("la línea 33 es #C5CE00…"): son
 * documentación, no color pintado. Se quitan ANTES de mirar. El `[^:]` evita
 * comerse un `://` de una URL. (Misma técnica que horas-malas.test.ts.)
 */
const sinComentarios = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * Los hex que SÍ pueden vivir a mano, por fichero, y con motivo. Todo lo demás
 * tiene que ser un token (`var(--color-…)`). En minúsculas: la comparación no
 * distingue caja.
 */
const PERMITIDOS: Record<string, readonly string[]> = {
  // Las anclas del cálculo de contraste (D1) y el azul noche con nombre (NOCHE).
  // No son "colores de la paleta": son constantes del algoritmo que ELIGE el color.
  'src/components/ChipLinea.tsx': ['#1c1a42', '#ffffff', '#000000'],
  // Fallbacks de build CON NOMBRE (línea sin route_color / texto por defecto).
  // Ver adapter.ts: son otro estado, distinto del gris de render. A propósito.
  'src/sources/gtfs-nap/adapter.ts': ['#1f2937', '#ffffff'],
  // Keylines blancas del marcador (contorno del SVG) + anillo de foco. No son
  // color de identidad ni de estado: son el reborde de un icono.
  'src/components/MapaParada.tsx': ['#fff', '#111827'],
  // ⚠️ HUECO D1 CONOCIDO: el chip de filtro pinta texto blanco sobre el color de
  //    línea sin calcular contraste (la línea 33 amarilla sale ilegible). Está
  //    fuera del alcance de esta tanda; queda marcado aquí para no olvidarlo.
  'src/components/LlegadasVivas.tsx': ['#fff'],
};

/**
 * Ficheros excluidos ENTEROS, con motivo. `global-error` se renderiza SIN el
 * layout ni el CSS de tokens (lo sustituye), así que NO PUEDE usar `var(--…)`:
 * sus hex crudos son forzados y están documentados. Es la única excepción.
 */
const EXCLUIDOS = new Set<string>(['src/app/global-error.tsx']);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

function ficherosDe(dir: string): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) salida.push(...ficherosDe(p));
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) salida.push(p);
  }
  return salida;
}

/** Los hex crudos de un código, quitando comentarios y lo permitido. */
function hexCrudosEn(codigo: string, permitidos: readonly string[]): string[] {
  const limpio = sinComentarios(codigo);
  const malos: string[] = [];
  for (const m of limpio.matchAll(HEX)) {
    if (!permitidos.includes(m[0].toLowerCase())) malos.push(m[0]);
  }
  return malos;
}

describe('⛔ NO SE CUELA UN HEX CRUDO DONDE DEBERÍA HABER TOKEN', () => {
  it('ningún .ts/.tsx de src pinta un color a mano fuera del allowlist', () => {
    const infractores: string[] = [];
    for (const f of ficherosDe('src')) {
      const rel = f.replace(/\\/g, '/');
      if (EXCLUIDOS.has(rel)) continue;
      const malos = hexCrudosEn(readFileSync(f, 'utf8'), PERMITIDOS[rel] ?? []);
      if (malos.length) infractores.push(`${rel} → ${[...new Set(malos)].join(', ')}`);
    }
    // Si esto se pone rojo: usa un token `var(--color-…)`, o —si de verdad es
    // legítimo— añádelo al allowlist CON motivo. Nunca a la ligera.
    expect(infractores, 'hex a mano donde debería haber token').toEqual([]);
  });

  it('⭐ CONTRAPRUEBA: el detector CAZA un hex plantado, y NO se pasa de listo', () => {
    // Un color a pelo se caza:
    expect(hexCrudosEn(`const x = { color: '#123456' };`, [])).toEqual(['#123456']);
    // Uno permitido NO se caza:
    expect(hexCrudosEn(`export const NOCHE = '#1C1A42';`, ['#1c1a42'])).toEqual([]);
    // Y un hex que vive en un COMENTARIO tampoco (es documentación, no pintura):
    expect(hexCrudosEn(`// el rojo de alerta es #b91c1c\nconst x = 1;`, [])).toEqual([]);
    expect(hexCrudosEn(`/* la 33 es #C5CE00 y da 1,72:1 */\nconst y = 2;`, [])).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  ⛔ Y LA MISMA VIGILANCIA PARA RADIO, SOMBRA Y ALTURA DE CONTROL.
//
//  La deuda que esto mata: si se cierra la tanda sin nombrar el sistema latente
//  (radios 6/8/12/16, alturas táctiles 24/44/48/56), el cierre los fijaría a mano
//  en los componentes que toque — recreando copias a mano JUSTO tras matarlas.
// ═════════════════════════════════════════════════════════════════════════════

describe('⛔ NI RADIO, NI SOMBRA, NI ALTURA DE CONTROL A MANO', () => {
  // Los pocos crudos legítimos, por fichero y con motivo.
  const CRUDO_PERMITIDO: Record<string, readonly RegExp[]> = {
    // La píldora del marcador (border-radius:9px) y sus sombras son el REBORDE de
    // un icono SVG, no superficie de diseño. Viven en el mapa, y solo ahí.
    'src/components/MapaParada.tsx': [/border-radius:9px/, /box-shadow:/, /drop-shadow\(/],
  };

  const DETECTORES: readonly { readonly nombre: string; readonly re: RegExp }[] = [
    { nombre: 'radio a mano', re: /border-radius:\s*\d+px|borderRadius:\s*\d+/g },
    // ⚠️ Las dos cajas: `box-shadow:` (CSS/string) y `boxShadow:` (inline de React).
    //    Un `style={{ boxShadow }}` a mano se colaba con solo la primera forma.
    { nombre: 'sombra a mano', re: /box-shadow:|boxShadow:|drop-shadow\(/g },
    { nombre: 'altura de control a mano', re: /min-[hw]-\[\d+px\]/g },
  ];

  function crudosEn(codigo: string, permitidos: readonly RegExp[]): string[] {
    const limpio = sinComentarios(codigo);
    const malos: string[] = [];
    for (const d of DETECTORES) {
      for (const m of limpio.matchAll(d.re)) {
        if (!permitidos.some((p) => p.test(m[0]))) malos.push(`${d.nombre}: ${m[0]}`);
      }
    }
    return malos;
  }

  it('ningún .ts/.tsx de src cablea radio/sombra/altura donde hay token', () => {
    const infractores: string[] = [];
    for (const f of ficherosDe('src')) {
      const rel = f.replace(/\\/g, '/');
      if (EXCLUIDOS.has(rel)) continue; // global-error: sin CSS de tokens
      const malos = crudosEn(readFileSync(f, 'utf8'), CRUDO_PERMITIDO[rel] ?? []);
      if (malos.length) infractores.push(`${rel} → ${[...new Set(malos)].join(' · ')}`);
    }
    // Rojo → usa rounded-*/var(--radius-*), var(--control-*), o ninguna sombra.
    expect(infractores, 'radio/sombra/altura a mano donde debería haber token').toEqual([]);
  });

  it('⭐ CONTRAPRUEBA: caza un radio/sombra/altura plantados, y respeta lo tokenizado', () => {
    // Plantados → cazados:
    expect(crudosEn(`const s = { borderRadius: 8 };`, [])).toContain('radio a mano: borderRadius: 8');
    expect(crudosEn(`.x{box-shadow:0 1px 2px #000}`, []).some((m) => m.startsWith('sombra'))).toBe(true);
    expect(crudosEn(`style={{ boxShadow: '0 1px 2px' }}`, []).some((m) => m.startsWith('sombra'))).toBe(true);
    expect(crudosEn(`<div className="min-h-[44px]" />`, [])).toContain('altura de control a mano: min-h-[44px]');
    // Tokenizado → NO cazado:
    expect(crudosEn(`borderRadius: 'var(--radius-chip)'`, [])).toEqual([]);
    expect(crudosEn(`className="min-h-[var(--control)] rounded-caja"`, [])).toEqual([]);
    // En comentario → NO cazado (es documentación):
    expect(crudosEn(`// antes: border-radius: 8px y box-shadow: 0 1px\nconst x = 1;`, [])).toEqual([]);
  });
});
