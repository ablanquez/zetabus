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
    // El nombre de terminal es CITA de Avanza → va envuelto en translate="no"
    // (que el traductor del navegador no reescriba el dato). "Hacia" es nuestro.
    expect(html).toContain('Hacia <span translate="no">SEMINARIO</span>');
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

  it('⛔ el aviso "es la hora de salida…" ya NO va: los rótulos "…SALIDAS" lo dicen', () => {
    // El rótulo "PRIMERAS SALIDAS"/"ÚLTIMAS SALIDAS" lleva la palabra "salidas", que
    // es lo que sostiene quitar el aviso suelto. Y /sobre-los-datos lo remata.
    const html = pinta({
      primeras: [s('05:00', 'A', 'B')],
      ultimas: [s('22:00', 'A', 'B')],
      info: null,
      frecuencia: null,
    });
    expect(html).not.toContain('data-papel="aviso-salidas"');
    expect(html).not.toContain('no la de paso por tu parada');
    // …y los rótulos llevan "salidas", no solo "Primeras"/"Últimas":
    expect(html).toContain('Primeras salidas');
    expect(html).toContain('Últimas salidas');
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
    // uniforme → un solo número, ahora como CIFRA (negrita, el dato)
    expect(html).toContain('Cada ');
    expect(html).toContain('min de media');
    expect(html).toMatch(/data-papel="frecuencia-cifra"[^>]*>20</);
  });

  it('⭐ la franja de frecuencia va en TINTA con el dato en cifra, y SIN "según Avanza"', () => {
    const html = pinta({
      primeras: [s('05:00', 'PARQUE GOYA', 'SEMINARIO')],
      ultimas: [s('21:51', 'PARQUE GOYA', 'SEMINARIO')],
      info: null,
      frecuencia: 'Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.',
    });
    // Fondo tinta (la bisagra entre las dos tablas) y por tokens, no hex crudo.
    expect(html).toMatch(/bg-\[var\(--color-tinta\)\][^>]*data-papel="frecuencia"/);
    // Las tres cifras van marcadas como dato (para la jerarquía peso/color).
    expect(html.match(/data-papel="frecuencia-cifra"/g) ?? []).toHaveLength(3);
    // ⛔ La procedencia se fue a /sobre-los-datos: la franja NO la lleva.
    expect(html).not.toContain('según Avanza');
  });

  it('⭐⭐ las CITAS de Avanza van con translate="no" (el traductor no reescribe el dato)', () => {
    // El principio "se cita, no se razona" lo puede deshacer el usuario dándole a
    // "traducir esta página": el navegador reescribiría nombres y horas en silencio,
    // y ningún test del código lo caza porque el ataque viene de FUERA. La defensa es
    // marcar cada cita como no-traducible.
    const html = pinta({
      primeras: [s('06:00', 'ROSALES DEL CANAL', 'PUERTA DEL CARMEN')],
      ultimas: [
        s('22:22', 'ROSALES DEL CANAL', 'PUERTA DEL CARMEN'),
        s('22:55', 'ROSALES DEL CANAL', 'H. CORTES, 9'),
      ],
      info: null,
      frecuencia: 'cada 12 min aprox.', // formato que NO parsea → cae a la cita literal
    });
    // nombres de terminal (cabecera)
    expect(html).toContain('<span translate="no">PUERTA DEL CARMEN</span>');
    // las horas (el flujo entero, que solo lleva horas + puntuación)
    expect(html).toMatch(/data-papel="flujo-salidas"[^>]*translate="no"/);
    // la nota del pie, que incrusta nombres citados
    expect(html).toContain('<span translate="no">termina en H. CORTES, 9, no en PUERTA DEL CARMEN</span>');
    // la frecuencia en su plan B (cita cruda) también se congela
    expect(html).toContain('<span translate="no">cada 12 min aprox.</span>');
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
