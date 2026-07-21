/**
 * LA "INFORMACIÓN ADICIONAL" — el cuadro neutro que sube encima del itinerario.
 *
 * Se prueba el contrato: cita TAL CUAL (no se razona ni se resume), marco NEUTRO
 * (no ámbar: el ámbar es "hoy", esto es "siempre"), título A SECAS (sin "· según
 * Avanza": la procedencia vive en /sobre-los-datos), y las viñetas `*` de Avanza
 * como lista.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InfoAdicional } from '@/components/InfoAdicional';

const pinta = (info: string | null) => renderToStaticMarkup(createElement(InfoAdicional, { info }));

describe('InfoAdicional', () => {
  it('sin info (25 de 44 líneas): no pinta nada, sin hueco', () => {
    expect(pinta(null)).toBe('');
  });

  it('⚠️ marco NEUTRO (borde, no ámbar) y título A SECAS, sin "· según Avanza"', () => {
    const html = pinta('Línea sin costo para los pasajeros.');
    expect(html).toContain('data-papel="info-adicional"');
    expect(html).toContain('Información adicional');
    expect(html).not.toContain('según Avanza'); // la procedencia vive en /sobre-los-datos
    // Borde NEUTRO y fondo papel; JAMÁS el ámbar del aviso (que es "algo de hoy").
    // Se probó el borde de color de línea y 4 de 19 no llegaban a 3:1 sobre papel.
    expect(html).toContain('border-[var(--color-borde)]');
    expect(html).toContain('bg-[var(--color-papel)]');
    expect(html).not.toContain('--color-aviso');
    // Mismo marco que el cuadro de suprimidas: 2 px y rounded-caja.
    expect(html).toContain('border-2');
    expect(html).toContain('rounded-caja');
  });

  it('⭐ el título es un <h2> (subtítulo de región), no un <p> mudo a la navegación', () => {
    // Bajo el <h1> de la vista (el rumbo) y sin h2 previo, el nivel que no salta es 2.
    // Como <p> era invisible a quien navega por encabezados con un lector de pantalla.
    const html = pinta('Línea sin costo para los pasajeros.');
    expect(html).toMatch(/<h2[^>]*>\s*Información adicional\s*<\/h2>/);
  });

  it('⭐⭐ la CITA de Avanza va en <Cita> (translate=no); el título NUESTRO, no', () => {
    // El traductor del navegador reescribiría la cita literal en silencio —deshaciendo
    // desde FUERA el "se cita, no se razona"—. Se congela la HOJA de texto citada; el
    // título y la estructura son nuestros y se traducen.
    const html = pinta('Amplía su recorrido los días de feria.');
    expect(html).toMatch(/<span[^>]*translate="no"[^>]*data-cita[^>]*>Amplía su recorrido los días de feria\.<\/span>/);
    // el título NO es cita (no lleva data-cita): se traduce con normalidad
    expect(html).not.toContain('data-cita="">Información adicional');
  });

  it('⭐ el texto se CITA TAL CUAL, sin cambiar palabras', () => {
    const info = 'Amplía su recorrido hasta la entrada del parque de atracciones los días de feria.';
    expect(pinta(info)).toContain(info);
  });

  it('⭐ las viñetas `*` de Avanza (la 23) se pintan como lista, con su entradilla', () => {
    const info =
      'Realiza terminal en José Atarés en las siguientes franjas horarias: * Laborables – de 6:42h a 22:58h. * Sábados – de 7:26h a 20:23h. * Festivos y domingos – de 7:46h a 14:23h.';
    const html = pinta(info);
    // La entradilla (antes del primer `*`) va como texto.
    expect(html).toContain('Realiza terminal en José Atarés en las siguientes franjas horarias:');
    // Y las tres franjas, como <li> (una viñeta cada una).
    expect(html.match(/<li/g) ?? []).toHaveLength(3);
    expect(html).toContain('Laborables – de 6:42h a 22:58h.');
    expect(html).toContain('Festivos y domingos – de 7:46h a 14:23h.');
    // NO se cuela un `*` crudo en el texto pintado.
    expect(html).not.toContain('*');
  });

  it('prosa sin `*` (la mayoría): párrafos, sin lista', () => {
    const html = pinta('Antes de terminal. El acceso podrá realizarse desde la calle Biel.');
    expect(html).not.toContain('<li');
    expect(html).toContain('Antes de terminal. El acceso podrá realizarse desde la calle Biel.');
  });

  it('varios párrafos (unidos por \\n por el parser) se respetan', () => {
    const html = pinta('Primer párrafo.\nSegundo párrafo.');
    expect(html).toContain('Primer párrafo.');
    expect(html).toContain('Segundo párrafo.');
  });
});
