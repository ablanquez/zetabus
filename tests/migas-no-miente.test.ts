/**
 * ⭐ EL BREADCRUMBLIST NO MIENTE. La única pieza de schema.org de ZetaBus afirma,
 * en formato máquina y con la máxima confianza, «esta página es la Línea XX». Si el
 * marcado dijera una línea distinta de la que pinta la página, sería una mentira
 * INVISIBLE para el humano y visible para el buscador — el peor sitio para una.
 *
 * Este guardián la hace imposible: cruza lo que afirma el marcado con `l.shortName`
 * (la MISMA fuente de la que la página saca su título) para las 44 líneas, incluidos
 * los casos raros: numérica (35), circular (Ci3), búho (N1).
 *
 * ⚠️ Rojo demostrado: si `migasDeLinea` cablea una línea fija en vez de derivarla del
 *    `shortName`, el cruce de abajo revienta. Un guardián que nunca se ha visto rojo
 *    no vigila nada.
 */
import { describe, expect, it } from 'vitest';
import { lineas } from '@/engine/topologia';
import { migasDeLinea, migasJsonLd } from '@/migas';
import { URL_SITIO } from '@/sitio';

interface ListItem {
  '@type': 'ListItem';
  position: number;
  name: string;
  item?: string;
}
interface Migas {
  '@context': string;
  '@type': string;
  itemListElement: ListItem[];
}

const TODAS = lineas();

describe('⭐ schema.org · el BreadcrumbList de /linea', () => {
  it('la estructura es un BreadcrumbList de dos ítems, del schema.org', () => {
    const m = migasDeLinea('35') as Migas;
    expect(m['@context']).toBe('https://schema.org');
    expect(m['@type']).toBe('BreadcrumbList');
    expect(m.itemListElement).toHaveLength(2);
    expect(m.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it('el ítem 1 es «Inicio» con la URL de la home (fuente única del dominio)', () => {
    const [inicio] = (migasDeLinea('35') as Migas).itemListElement;
    expect(inicio.name).toBe('Inicio');
    expect(inicio.item).toBe(URL_SITIO);
  });

  it('⭐ el ÚLTIMO ítem (la página actual) va SIN `item` — no se enlaza a sí misma', () => {
    const m = migasDeLinea('35') as Migas;
    const ultimo = m.itemListElement[m.itemListElement.length - 1];
    expect(ultimo.name).toBe('Línea 35');
    expect('item' in ultimo).toBe(false);
  });

  it('⭐ NO MIENTE · para las 44 líneas, el marcado nombra la MISMA línea que pinta la página', () => {
    for (const l of TODAS) {
      const m = migasDeLinea(l.shortName) as Migas;
      const ultimo = m.itemListElement[m.itemListElement.length - 1];
      expect(ultimo.name, l.shortName).toBe(`Línea ${l.shortName}`);
    }
  });

  it('cubre los casos raros: numérica (35), circular (Ci3), búho (N1)', () => {
    for (const nombre of ['35', 'Ci3', 'N1']) {
      expect(TODAS.some((l) => l.shortName === nombre), `existe la línea ${nombre}`).toBe(true);
      const m = migasDeLinea(nombre) as Migas;
      expect(m.itemListElement[1].name).toBe(`Línea ${nombre}`);
    }
  });

  it('⭐ ESCAPE (anti-XSS) · el `<` sale como su escape unicode, nunca crudo', () => {
    // Un dato sintético con `<` (jamás en datos reales): demuestra que no puede
    // cerrar el <script>. El repo escapa por disciplina, no por confiar en el dato.
    const salida = migasJsonLd('a<script>b');
    expect(salida).not.toContain('<'); // ni un solo `<` crudo
    expect(salida).toContain('\\u003c'); // convertido a <
  });

  it('el JSON-LD escapado sigue siendo JSON válido y round-trips', () => {
    const salida = migasJsonLd('35');
    const parseado = JSON.parse(salida) as Migas;
    expect(parseado['@type']).toBe('BreadcrumbList');
    expect(parseado.itemListElement[1].name).toBe('Línea 35');
  });
});
