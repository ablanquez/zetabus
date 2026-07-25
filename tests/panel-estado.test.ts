/**
 * ⭐⭐ LAS CONTRAPRUEBAS DEL PANEL `/estado`. Un test por cada camino que puede
 * mentir, y cada uno con su ROJO demostrado antes que el verde (ver la bitácora).
 *
 * Se prueba el NÚCLEO PURO (`@/engine/panel-estado`), sin disco ni reloj: se le
 * construye un `EstadoIndice` a mano y se mira el veredicto. Es la parte que puede
 * dar VERDE SOBRE UN DATO RANCIO —el peor fallo del proyecto—, así que se aísla y
 * se ataca directamente.
 */
import { describe, expect, it } from 'vitest';
import {
  clasificarEstado,
  construirModelo,
  formatearEdad,
  formatearMillar,
  modeloSeguro,
  FRESCURA_MAX_SEGUNDOS,
  FRESCURA_MAX_HORAS,
} from '@/engine/panel-estado';
import { estadoIndiceDesde, type EstadoIndice } from '@/engine/correspondencias';

const H = 3600;

/** Un barrido sano de relleno (los números no importan para clasificar). */
const BARRIDO = {
  sentidosEsperados: 74,
  sentidosRespondidos: 74,
  sentidosFallidos: 0,
  sentidosSospechosos: 0,
  postesGtfs: 918,
  postesSoloBarrido: 9,
  postesSinCoordenadas: 9,
  postesConProvisional: 32,
  lineasDesviadas: 14,
  incidencias: 2034,
} as const;

const presente = (edadSegundos: number | undefined): EstadoIndice => ({
  presente: true,
  degradado: false,
  generadoEn: '2026-07-25T02:01:00.000Z',
  edadSegundos,
  barrido: BARRIDO,
});

const FEED = { estado: 'vigente' as const, endDate: '2026-10-05', aviso: null };
const TOTALES = { lineas: 44, paradas: 934 };

// ─────────────────────────────────────────────────────────────────────────────
//  LEY 1 · FRESCURA. El rojo que hay que ver antes: «al día» sobre dato de 3 días.
// ─────────────────────────────────────────────────────────────────────────────
describe('Ley 1 · frescura (al día vs desactualizado)', () => {
  it('⭐ un índice de HACE 3 DÍAS es DESACTUALIZADO (no «al día»)', () => {
    // La contraprueba del encargo: si esto dijera 'al-dia', el instrumento
    // estaría dando verde sobre un dato de anteayer. Con el clasificador roto
    // (return 'al-dia' fijo) este expect se pone ROJO — demostrado en bitácora.
    expect(clasificarEstado(presente(3 * 24 * H))).toBe('desactualizado');
  });

  it('un índice de hace 1 h es «al día» (el mismo test daría verde con dato fresco)', () => {
    expect(clasificarEstado(presente(1 * H))).toBe('al-dia');
  });

  it('el borde del umbral: justo en 26 h es «al día»; un segundo más, «desactualizado»', () => {
    expect(clasificarEstado(presente(FRESCURA_MAX_SEGUNDOS))).toBe('al-dia');
    expect(clasificarEstado(presente(FRESCURA_MAX_SEGUNDOS + 1))).toBe('desactualizado');
  });

  it('el umbral son 26 h, con su porqué escrito', () => {
    expect(FRESCURA_MAX_HORAS).toBe(26);
    expect(FRESCURA_MAX_SEGUNDOS).toBe(26 * 3600);
  });

  it('⭐ contra la fórmula vieja: se clasifica por la EDAD real, calculada por el motor', () => {
    // Se usa `estadoIndiceDesde` (la fuente real) con un generadoEn de hace 3 días
    // y un `ahora` fijo: end-to-end del cálculo de edad, no un número inventado.
    const generadoEn = '2026-07-22T02:01:00.000Z';
    const ahoraMs = Date.parse('2026-07-25T03:00:00.000Z'); // ~3 días después
    const estado = estadoIndiceDesde({ generadoEn, barrido: BARRIDO } as never, ahoraMs);
    expect(estado.presente).toBe(true);
    expect(clasificarEstado(estado)).toBe('desactualizado');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  COSTURA 4 · DEGRADADO. Protege que `!presente` NO se pliegue en «no lo sé».
// ─────────────────────────────────────────────────────────────────────────────
describe('Costura 4 · degradado (índice falta)', () => {
  const ausente: EstadoIndice = { presente: false, degradado: true };

  it('⭐ sin índice (presente:false) el veredicto es DEGRADADO, no «ilegible» ni «al día»', () => {
    expect(clasificarEstado(ausente)).toBe('degradado');
  });

  it('el modelo de degradado trae feed y totales, pero NI edad NI barrido (el motor no los da)', () => {
    const m = construirModelo(ausente, FEED, TOTALES);
    expect(m.veredicto).toBe('degradado');
    // Ni existen esas claves: nada que rellenar con placeholder.
    expect('edadSegundos' in m).toBe(false);
    expect('barrido' in m).toBe(false);
    if (m.veredicto === 'degradado') {
      expect(m.feed.endDate).toBe('2026-10-05');
      expect(m.totales.lineas).toBe(44);
    }
  });

  it('contraprueba: con presente:true ese camino NO se dispara', () => {
    expect(clasificarEstado(presente(1 * H))).not.toBe('degradado');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LEY 3 · ILEGIBLE. El cinturón: si no se puede formar veredicto, se dice.
// ─────────────────────────────────────────────────────────────────────────────
describe('Ley 3 · ilegible (no lo sé)', () => {
  it('⭐ presente pero con edad INFECHABLE → ilegible (no se finge «al día»)', () => {
    expect(clasificarEstado(presente(undefined))).toBe('ilegible');
  });

  it('el modelo ilegible NO pinta nada más que el veredicto (ni feed ni totales)', () => {
    const m = construirModelo(presente(undefined), FEED, TOTALES);
    expect(m).toEqual({ veredicto: 'ilegible' });
  });

  it('⭐ una EXCEPCIÓN al leer el motor cae en ilegible, no revienta la página', () => {
    const m = modeloSeguro(() => {
      throw new Error('feed incoherente / disco / lo que sea');
    });
    expect(m).toEqual({ veredicto: 'ilegible' });
  });

  it('contraprueba: con un modelo SANO el cinturón no se dispara', () => {
    const sano = construirModelo(presente(1 * H), FEED, TOTALES);
    const m = modeloSeguro(() => sano);
    expect(m.veredicto).toBe('al-dia');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  El modelo sano pinta el subconjunto seguro, y SOLO ese (Costura 3 / Ley 2).
// ─────────────────────────────────────────────────────────────────────────────
describe('lista blanca del modelo sano', () => {
  it('copia los campos aprobados del barrido y descarta los tres de la Costura 3', () => {
    const m = construirModelo(presente(1 * H), FEED, TOTALES);
    if (m.veredicto !== 'al-dia' || !m.barrido) throw new Error('debería ser al-dia con barrido');
    // Están los aprobados:
    expect(m.barrido.lineasDesviadas).toBe(14);
    expect(m.barrido.incidencias).toBe(2034);
    expect(m.barrido.postesSinCoordenadas).toBe(9);
    // NO están los descartados (Costura 3): ni por asomo.
    expect('postesGtfs' in m.barrido).toBe(false);
    expect('postesSoloBarrido' in m.barrido).toBe(false);
    expect('postesConProvisional' in m.barrido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Formato de edad legible (greyscale-safe: palabras y números).
// ─────────────────────────────────────────────────────────────────────────────
describe('formatearEdad', () => {
  it('minutos, horas, horas+min y días', () => {
    expect(formatearEdad(30)).toBe('hace menos de un minuto');
    expect(formatearEdad(20 * 60)).toBe('hace 20 min');
    expect(formatearEdad(3 * H)).toBe('hace 3 h');
    expect(formatearEdad(3 * H + 20 * 60)).toBe('hace 3 h 20 min');
    expect(formatearEdad(25 * H)).toBe('hace 1 día y 1 h');
    expect(formatearEdad(3 * 24 * H)).toBe('hace 3 días');
  });
});

describe('formatearMillar', () => {
  it('agrupa con punto sin depender del ICU del host (medido: toLocaleString no agrupaba)', () => {
    expect(formatearMillar(2034)).toBe('2.034');
    expect(formatearMillar(934)).toBe('934');
    expect(formatearMillar(1234567)).toBe('1.234.567');
    expect(formatearMillar(0)).toBe('0');
  });
});
