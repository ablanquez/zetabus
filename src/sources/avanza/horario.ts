/**
 * LA TABLA DE HORARIOS QUE PUBLICA AVANZA PARA HOY.
 *
 * `/lineas-y-horarios/?selectLinea={L}&selectSentido={-1|-2}` devuelve, server-
 * rendered, la tabla de **primeras y últimas salidas del día** —hora, de dónde y
 * hasta dónde— y un bloque de **"Información adicional"** en prosa. Es la propia
 * web del operador, day-true: para la 44 de hoy pone terminal en Pablo Ruiz
 * Picasso, no en Campus Río Ebro. Ver `docs/AUDITORIA_HORARIO_WEB_AVANZA.md`.
 *
 * ⚠️ NO se razona sobre esto. Se muestra la tabla PELADA (hora · desde · hasta) y,
 * si la trae, la "Información adicional" como CITA LITERAL de Avanza. El motor de
 * horarios que DERIVABA las rarezas está aparcado (`docs/MOTOR-HORARIOS.md`): en su
 * lugar, dejamos que Avanza las cuente con sus palabras.
 *
 * ⚠️ Y OTRA VEZ: HTML, NO REGEX. El HTML viene **malformado** —las celdas abren
 * `<td>` y cierran `</th>`— y cada fila se repite ×4 (copias responsive). Un regex
 * se rompería con el primer cambio de plantilla. `node-html-parser` traga el
 * malformado (medido) y se deduplica por (hora, desde, hasta).
 */

import { parse } from 'node-html-parser';
import { pedir, type Transporte } from './transporte';
import type { SentidoAvanza } from './recorrido';

export const URL_HORARIOS = 'https://zaragoza.avanzagrupo.com/lineas-y-horarios/';

/** Una salida de la tabla: hora de reloj y sentido (de dónde → hasta dónde). */
export interface SalidaWeb {
  readonly hora: string;
  readonly desde: string;
  readonly hasta: string;
}

export interface HorarioWeb {
  readonly primeras: readonly SalidaWeb[];
  readonly ultimas: readonly SalidaWeb[];
  /** "Información adicional" de Avanza, cita literal. `null` si la línea no trae. */
  readonly info: string | null;
}

export class HorarioIlegible extends Error {
  constructor(motivo: string) {
    super(`No se puede leer el horario web: ${motivo}`);
    this.name = 'HorarioIlegible';
  }
}

const ES_HORA = /^\d{1,2}:\d{2}$/;

/** Las filas de una tabla `.table-horarios`, saneadas y deduplicadas. */
function filasDe(root: ReturnType<typeof parse>, describedby: string): SalidaWeb[] {
  const tabla = root
    .querySelectorAll('table.table-horarios')
    .find((t) => t.getAttribute('aria-describedby') === describedby);
  if (!tabla) return [];

  const vistas = new Set<string>();
  const salidas: SalidaWeb[] = [];
  for (const tr of tabla.querySelectorAll('tbody tr')) {
    const celdas = tr.querySelectorAll('td');
    if (celdas.length < 3) continue; // fila rara → se ignora, no se inventa
    const hora = celdas[0].text.trim();
    if (!ES_HORA.test(hora)) continue; // no es una hora → no es una salida
    const desde = celdas[1].text.replace(/\s+/g, ' ').trim();
    const hasta = celdas[2].text.replace(/\s+/g, ' ').trim();
    // ⚠️ Las filas vienen ×4; nos quedamos con cada (hora, desde, hasta) una vez.
    const clave = `${hora}|${desde}|${hasta}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salidas.push({ hora, desde, hasta });
  }
  return salidas;
}

export function parsearHorarioWeb(html: string): HorarioWeb {
  const root = parse(html);

  // ⚠️ FRENO DE MANO: si no está NI el contenedor de horarios NI el de información,
  //    la página no es la que esperamos (¿han cambiado la plantilla?). No se
  //    inventa una tabla vacía: se declara ilegible y arriba se muestra "nada".
  if (!root.querySelector('#infoHorarios') && !root.querySelector('#infoCaracteristicas')) {
    throw new HorarioIlegible('la página no trae la estructura de horarios conocida');
  }

  const primeras = filasDe(root, 'table-horarios-primeras-desc');
  const ultimas = filasDe(root, 'table-horarios-ultimas-desc');

  // "Información adicional": los párrafos de #infoCaracteristicas, tal cual.
  const caja = root.querySelector('#infoCaracteristicas');
  const parrafos = caja
    ? caja.querySelectorAll('p').map((p) => p.text.replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0)
    : [];
  const suelto = caja && parrafos.length === 0 ? caja.text.replace(/\s+/g, ' ').trim() : '';
  const info = parrafos.length > 0 ? parrafos.join('\n') : suelto.length > 0 ? suelto : null;

  return { primeras, ultimas, info };
}

export async function leerHorarioWeb(
  lineaEtiqueta: string,
  sentido: SentidoAvanza,
  transporte: Transporte,
): Promise<HorarioWeb> {
  const url = `${URL_HORARIOS}?selectLinea=${encodeURIComponent(lineaEtiqueta)}&selectSentido=${sentido}`;
  const { status, texto } = await pedir(transporte, { url });
  if (status !== 200) {
    throw new HorarioIlegible(`la fuente ha respondido con HTTP ${status} (línea ${lineaEtiqueta}, sentido ${sentido})`);
  }
  return parsearHorarioWeb(texto);
}
