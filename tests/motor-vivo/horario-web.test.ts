/**
 * EL PARSER DE LA TABLA WEB DE AVANZA. Contra el HTML REAL, que viene torcido:
 *   · las celdas abren `<td>` y cierran `</th>` (malformado);
 *   · cada fila se repite ×4 (copias responsive) → hay que deduplicar;
 *   · "Información adicional" es condicional: muchas líneas no la traen.
 * Si el parser se rompe con esto, el bloque de terminal miente o desaparece.
 */

import { describe, expect, it } from 'vitest';
import { parsearHorarioWeb, HorarioIlegible } from '@/sources/avanza/horario';

/** Una fila REAL de Avanza: `<td>` que cierra con `</th>`, repetida `veces`. */
const fila = (hora: string, desde: string, hasta: string, veces = 4) =>
  `<tr><td>${hora}</th><td>${desde}</th><td>${hasta}</th></tr>`.repeat(veces);

const tabla = (describedby: string, filas: string) =>
  `<div class="container-horarios-table"><table class="table-horarios" aria-describedby="${describedby}">
     <thead><tr><th>Hora</th><th>Desde</th><th>Hasta</th></tr></thead>
     <tbody>${filas}</tbody></table></div>`;

const pagina = (primeras: string, ultimas: string, info: string) =>
  `<div id="infoHorarios">
     ${tabla('table-horarios-primeras-desc', primeras)}
     ${tabla('table-horarios-ultimas-desc', ultimas)}
   </div>
   <div id="infoCaracteristicas">${info}</div>`;

describe('parsearHorarioWeb', () => {
  it('⭐ deduplica las filas ×4 y devuelve hora · desde · hasta', () => {
    const html = pagina(
      fila('05:15', 'ESTACION MIRAFLORES', 'PABLO R. PICASSO') + fila('05:36', 'ESTACION MIRAFLORES', 'PABLO R. PICASSO'),
      fila('22:42', 'ESTACION MIRAFLORES', 'PABLO R. PICASSO'),
      '<p>Una nota.</p>',
    );
    const h = parsearHorarioWeb(html);

    expect(h.primeras).toEqual([
      { hora: '05:15', desde: 'ESTACION MIRAFLORES', hasta: 'PABLO R. PICASSO' },
      { hora: '05:36', desde: 'ESTACION MIRAFLORES', hasta: 'PABLO R. PICASSO' },
    ]);
    expect(h.ultimas).toEqual([{ hora: '22:42', desde: 'ESTACION MIRAFLORES', hasta: 'PABLO R. PICASSO' }]);
  });

  it('⚠️ ignora filas que no son una salida (hora no válida o celdas de menos)', () => {
    const html = pagina(
      fila('05:15', 'A', 'B') + '<tr><td>Sin servicio</th></tr>' + '<tr><td>no-es-hora</th><td>A</th><td>B</th></tr>',
      fila('23:00', 'A', 'B'),
      '',
    );
    const h = parsearHorarioWeb(html);
    expect(h.primeras.map((s) => s.hora)).toEqual(['05:15']); // las dos basura, fuera
  });

  it('⭐ "Información adicional" se cita literal, uniendo los párrafos', () => {
    const html = pagina(fila('06:00', 'A', 'B'), fila('22:00', 'A', 'B'), '<p>Primera frase.</p><p>Segunda frase.</p>');
    expect(parsearHorarioWeb(html).info).toBe('Primera frase.\nSegunda frase.');
  });

  it('⚠️ CONDICIONAL: si la caja de información viene vacía, info es null (no un bloque vacío)', () => {
    const html = pagina(fila('06:00', 'A', 'B'), fila('22:00', 'A', 'B'), '');
    expect(parsearHorarioWeb(html).info).toBeNull();
  });

  it('⚠️ una línea/día sin salidas devuelve listas vacías (no se inventa)', () => {
    const html = pagina('', '', '');
    const h = parsearHorarioWeb(html);
    expect(h.primeras).toEqual([]);
    expect(h.ultimas).toEqual([]);
    expect(h.info).toBeNull();
  });

  it('⭐ "Frecuencia media" se cita literal, y va FUERA de #infoCaracteristicas', () => {
    // El <p> de frecuencia vive entre el formulario y las tablas, no en la caja de
    // "Información adicional". Por eso el parser lo busca en toda la página.
    const html =
      `<p style="text-align:left;">Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min. </p>` +
      pagina(fila('06:00', 'A', 'B'), fila('22:00', 'A', 'B'), '<p>Una nota.</p>');
    const h = parsearHorarioWeb(html);
    expect(h.frecuencia).toBe('Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min.');
    expect(h.info).toBe('Una nota.'); // y no se contamina con la frecuencia
  });

  it('⚠️ si no hay "Frecuencia media", el campo es null (no se inventa)', () => {
    const html = pagina(fila('06:00', 'A', 'B'), fila('22:00', 'A', 'B'), '');
    expect(parsearHorarioWeb(html).frecuencia).toBeNull();
  });

  it('⛔ FRENO DE MANO: si la página no trae la estructura conocida, se declara ilegible', () => {
    // Si aceptáramos esto como "tabla vacía", el bloque desaparecería en silencio
    // el día que cambien la plantilla, y nadie se enteraría.
    expect(() => parsearHorarioWeb('<html><body><p>Error 500</p></body></html>')).toThrow(HorarioIlegible);
  });
});
