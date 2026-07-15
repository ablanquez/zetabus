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
