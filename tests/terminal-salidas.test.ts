/**
 * EL BLOQUE DE SALIDAS, RENDERIZADO. Aquí no se prueba el cálculo (eso está en
 * `salidas-modelo.test.ts`) sino el CONTRATO de pantalla:
 *   · un sentido sin tabla DICE que no lo publican —no se queda en blanco—;
 *   · un `null` (no se pudo leer) no pinta nada —no afirma "no publica"—;
 *   · las excepciones salen con su marca y su nota al pie.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Terminal } from '@/components/Terminal';
import type { HorarioWeb, SalidaWeb } from '@/sources/avanza/horario';

const s = (hora: string, desde: string, hasta: string): SalidaWeb => ({ hora, desde, hasta });
const pinta = (horario: HorarioWeb | null) => renderToStaticMarkup(createElement(Terminal, { horario }));

describe('Terminal (bloque de salidas)', () => {
  it('⚠️ sin tabla (búho): lo DICE, no se queda en blanco', () => {
    const html = pinta({ primeras: [], ultimas: [], info: null, frecuencia: null });
    expect(html).toContain('Avanza no publica los horarios de esta línea');
    expect(html).toContain('data-papel="sin-horario"');
  });

  it('⚠️ null (no se pudo leer): NO afirma "no publica" — no pinta nada', () => {
    expect(pinta(null)).toBe('');
  });

  it('con tabla y sin excepciones: cabecera con el destino, y ningún pie de notas', () => {
    const html = pinta({
      primeras: [s('05:00', 'PARQUE GOYA', 'SEMINARIO')],
      ultimas: [s('21:51', 'PARQUE GOYA', 'SEMINARIO')],
      info: null,
      frecuencia: 'Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.',
    });
    expect(html).toContain('Hacia SEMINARIO');
    expect(html).not.toContain('data-papel="notas-salidas"');
    expect(html).toContain('De media:'); // los tres tipos de día
  });

  it('⛔ ya NO lleva la cabecera "funcionamiento de terminal" ni la procedencia (viven en /sobre-los-datos)', () => {
    const html = pinta({
      primeras: [s('05:00', 'A', 'B')],
      ultimas: [s('22:00', 'A', 'B')],
      info: null,
      frecuencia: null,
    });
    expect(html.toLowerCase()).not.toContain('funcionamiento de terminal');
    expect(html).not.toContain('tal y como las publica'); // procedencia → /sobre-los-datos
  });

  it('⚠️ PERO conserva el aviso contra el malentendido: es la hora de salida, no la de paso', () => {
    // No es procedencia: es una advertencia con consecuencias (perder el bus). Se queda.
    const html = pinta({
      primeras: [s('05:00', 'A', 'B')],
      ultimas: [s('22:00', 'A', 'B')],
      info: null,
      frecuencia: null,
    });
    expect(html).toContain('data-papel="aviso-salidas"');
    expect(html).toContain('Es la hora de salida, no la de paso por tu parada.');
  });

  it('⭐ con excepción: la salida lleva marca y el pie la explica', () => {
    const html = pinta({
      primeras: [s('06:00', 'ROSALES DEL CANAL', 'PUERTA DEL CARMEN')],
      ultimas: [
        s('22:22', 'ROSALES DEL CANAL', 'PUERTA DEL CARMEN'),
        s('22:55', 'ROSALES DEL CANAL', 'H. CORTES, 9'),
      ],
      info: null,
      frecuencia: 'Frecuencia media: laborables: 20, sábados: 20, domingos y festivos: 20 min.',
    });
    expect(html).toContain('data-marca="a"');
    expect(html).toContain('termina en H. CORTES, 9, no en PUERTA DEL CARMEN');
    expect(html).toContain('Cada 20 min de media'); // uniforme → un solo número
  });

  it('⚠️ el orden de la web se respeta: la salida de después de medianoche va al final', () => {
    const html = pinta({
      primeras: [s('05:45', 'A', 'B')],
      ultimas: [s('23:47', 'A', 'B'), s('00:07', 'A', 'B')],
      info: null,
      frecuencia: null,
    });
    expect(html.indexOf('23:47')).toBeLessThan(html.indexOf('00:07'));
  });
});
