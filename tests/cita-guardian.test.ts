/**
 * ⭐⭐ EL GUARDIÁN DE <Cita>. Que reviente si un string de fuente EXTERNA se pinta
 * SIN pasar por <Cita> —y por tanto sin `translate="no"`, a merced del traductor
 * del navegador, que reescribe la cita en silencio (el ataque viene de FUERA)—.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CÓMO. No se enumeran los SITIOS donde se pinta (eso solo cazaría regresiones en
 *  la lista conocida). Se enumeran los CAMPOS externos, se rellenan con un CENTINELA
 *  —un string que SOLO puede venir de una fuente ajena—, se renderiza, y se exige
 *  que NINGÚN centinela sobreviva fuera de un `[data-cita]`. Así, si mañana alguien
 *  pinta uno de esos campos en un sitio NUEVO del componente sin <Cita>, el centinela
 *  se escapa y el test se pone rojo. No hace falta que nadie se acuerde de añadirlo.
 *
 *  ⚠️ ALCANCE HONESTO (lo que este guardián NO cubre, dicho en voz alta):
 *   · Cubre los componentes que reciben el dato externo por PROPS y renderizan
 *     standalone: Terminal, InfoAdicional, Itinerario. Un render nuevo de SUS campos
 *     sin <Cita> se caza.
 *   · NO cubre un campo externo COMPLETAMENTE NUEVO que nadie meta en el centinela
 *     de aquí (p. ej. si el motor añade `parada.apodo` y alguien lo pinta). Para eso
 *     habría que ramificar el tipo (que el dato externo NO sea `string`, y así no se
 *     pueda pintar sin desenvolverlo) — un refactor mayor, anotado como escalada.
 *   · Los sitios que se construyen INLINE en páginas async (el <h1> del rumbo) o tras
 *     interacción de cliente (resultados del Buscador, destino de LlegadasVivas) no
 *     se renderizan aquí: los vigila `e2e/cita-traduccion.spec.ts` en un navegador
 *     real, sobre las páginas que se pintan sin Avanza.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { Terminal } from '@/components/Terminal';
import { InfoAdicional } from '@/components/InfoAdicional';
import { Itinerario } from '@/components/Itinerario';
import { idLinea, lineas } from '@/engine/topologia';
import type { HorarioWeb } from '@/sources/avanza/horario';

/** Un string que SOLO puede venir de una fuente externa. No aparece en chrome nuestro. */
const C = '§E§'; // §E§

/**
 * ⭐ El corazón del guardián: quita del DOM todos los subárboles `[data-cita]` y
 * comprueba que NO queda ni un centinela en el TEXTO visible (los atributos —aria-label—
 * no cuentan: el traductor traduce texto, no atributos, y esos son otra discusión).
 */
function centinelasFuera(html: string): number {
  const root = parse(html);
  const totalTexto = (root.text.match(new RegExp(C, 'g')) ?? []).length;
  // Sanity: el fixture TIENE que haber pintado centinelas; si no, el test no prueba nada.
  if (totalTexto === 0) throw new Error('fixture sin centinelas: el test no probaría nada');
  root.querySelectorAll('[data-cita]').forEach((el) => el.remove());
  return (root.text.match(new RegExp(C, 'g')) ?? []).length;
}

describe('⭐⭐ guardián de <Cita>: ningún dato externo se pinta sin translate="no"', () => {
  it('Terminal: horas, nombres de terminal, notas y frecuencia literal, todas en <Cita>', () => {
    const horario: HorarioWeb = {
      primeras: [{ hora: `05:00${C}`, desde: `ORIG${C}`, hasta: `DEST${C}` }],
      ultimas: [
        { hora: `22:00${C}`, desde: `ORIG${C}`, hasta: `DEST${C}` },
        { hora: `22:30${C}`, desde: `ORIG${C}`, hasta: `OTRO${C}` }, // par distinto → nota
      ],
      info: null,
      frecuencia: `formato ${C} que no parsea`, // → cae a la cita literal
    };
    expect(centinelasFuera(renderToStaticMarkup(createElement(Terminal, { horario })))).toBe(0);
  });

  it('InfoAdicional: entrada y viñetas de la cita, todas en <Cita>', () => {
    const info = `entrada ${C} con franjas * viñeta ${C} uno * viñeta ${C} dos`;
    expect(centinelasFuera(renderToStaticMarkup(createElement(InfoAdicional, { info })))).toBe(0);
  });

  it('Itinerario: el nombre de parada y la info adicional, en <Cita>', () => {
    const linea = lineas()[0];
    const html = renderToStaticMarkup(
      createElement(Itinerario, {
        lineaId: idLinea(String(linea.id)),
        linea,
        paradas: [{ poste: 100, nombre: `PARADA ${C}`, sid: null }],
        fingir: null,
        info: `info ${C} adicional`,
      }),
    );
    expect(centinelasFuera(html)).toBe(0);
  });
});
