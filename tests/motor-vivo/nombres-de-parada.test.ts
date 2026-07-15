/**
 * ⭐⭐ A1 · LA CAPA DE NOMBRES. Las dos piezas puras, atadas.
 *
 * El GTFS trae el 80,4 % de los nombres rotos por un `ucwords()` de PHP en el
 * exportador de Avanza. El operador los escribe bien en `get_stops_list`. Esta capa
 * pide los buenos y marca los que Avanza no da. Aquí se prueba SIN TOCAR LA RED: el
 * merge y la superposición son funciones puras.
 */
import { describe, expect, it } from 'vitest';
import {
  fundirNombres,
  pedirNombres,
  type PeticionDeSentido,
  type RespuestaDeSentido,
} from '@/sources/avanza/nombres';
import { aplicarNombres, type TablaNombresLeida } from '@/sources/avanza/aplicar-nombres';
import type { Transporte } from '@/sources/avanza/transporte';
import type { Stop } from '@/core';
import { stopId } from '@/core';

const ok = (linea: string, sentido: -1 | -2, postes: { poste: number; nombre: string }[]): RespuestaDeSentido =>
  ({ peticion: { lineaEtiqueta: linea, sentido }, ok: true, postes });
const fallo = (linea: string, sentido: -1 | -2, motivo: string): RespuestaDeSentido =>
  ({ peticion: { lineaEtiqueta: linea, sentido }, ok: false, motivo });

// ─────────────────────────────────────────────────────────────────────────────
describe('⭐ fundirNombres · recorridos → tabla poste→nombre', () => {
  it('dos sentidos con el MISMO nombre → una entrada, sin discrepancia', () => {
    const t = fundirNombres([
      ok('35', -1, [{ poste: 55, nombre: 'Av. de Cataluña n.º 51' }]),
      ok('35', -2, [{ poste: 55, nombre: 'Av. de Cataluña n.º 51' }]),
    ]);
    expect(t.porPoste[55]).toBe('Av. de Cataluña n.º 51');
    expect(t.discrepancias).toEqual([]);
    expect(t.contadores.postesConNombre).toBe(1);
    expect(t.contadores.respondidas).toBe(2);
  });

  it('⭐ dos nombres DISTINTOS para el mismo poste → discrepancia, NO excepción, gana el primero', () => {
    // Una discrepancia entre dos versiones ES UN DATO, como en la flota: se registra
    // y se usa la primera, pero NO se lanza — eso obligaría a borrar una de las dos.
    const t = fundirNombres([
      ok('21', -1, [{ poste: 8, nombre: 'Miguel Ángel Blanco n.º 53' }]),
      ok('21', -2, [{ poste: 8, nombre: 'Miguel Ángel Blanco 53' }]),
    ]);
    expect(t.porPoste[8]).toBe('Miguel Ángel Blanco n.º 53'); // el primero
    expect(t.discrepancias).toHaveLength(1);
    expect(t.discrepancias[0].poste).toBe(8);
    expect(t.discrepancias[0].nombres).toContain('Miguel Ángel Blanco n.º 53');
    expect(t.discrepancias[0].nombres).toContain('Miguel Ángel Blanco 53');
  });

  it('⚠️ un nombre VACÍO no es un nombre: se descarta y se cuenta, no se registra ""', () => {
    const t = fundirNombres([
      ok('30', -1, [
        { poste: 100, nombre: '   ' },
        { poste: 101, nombre: 'Plaza del Pilar' },
      ]),
    ]);
    expect(t.porPoste[100]).toBeUndefined(); // NO se guarda ""
    expect(t.porPoste[101]).toBe('Plaza del Pilar');
    expect(t.contadores.vacios).toBe(1);
    expect(t.contadores.postesConNombre).toBe(1);
  });

  it('una petición FALLIDA se cuenta y no rompe el merge', () => {
    const t = fundirNombres([
      ok('C1', -1, [{ poste: 7, nombre: 'Parque Goya' }]),
      fallo('C1', -2, 'timeout tras 4000 ms'),
    ]);
    expect(t.contadores.esperadas).toBe(2);
    expect(t.contadores.respondidas).toBe(1);
    expect(t.contadores.fallidas).toBe(1);
    // ⭐ El contador de control: respondidas + fallidas = esperadas.
    expect(t.contadores.respondidas + t.contadores.fallidas).toBe(t.contadores.esperadas);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⭐ pedirNombres · la orquestación, con un transporte de mentira', () => {
  const dosPeticiones: PeticionDeSentido[] = [
    { lineaEtiqueta: '35', sentido: -1 },
    { lineaEtiqueta: '35', sentido: -2 },
  ];
  const sinDormir = () => Promise.resolve();

  it('⛔ AVANZA CAÍDA EN EL BUILD: todas fallan, ninguna excepción, todo se cuenta', async () => {
    // El transporte que siempre se cae. Es la simulación de "Avanza no responde
    // durante el build". No debe tirar el proceso: cada sentido es un fallo contado.
    const caido: Transporte = async () => { throw new Error('ECONNREFUSED'); };

    const r = await pedirNombres(dosPeticiones, caido, { dormir: sinDormir });
    const t = fundirNombres(r);

    expect(t.contadores.respondidas).toBe(0);
    expect(t.contadores.fallidas).toBe(2);
    expect(Object.keys(t.porPoste)).toHaveLength(0);
    // ⭐ El ratio es 0 → el build-nombres se negaría a escribir (suelo del 80 %).
    //    Aquí solo comprobamos que el merge no explota y deja los números claros.
    expect(t.contadores.respondidas / t.contadores.esperadas).toBe(0);
  });

  it('un sentido responde y otro se cae: cobertura parcial, honesta', async () => {
    const html = '<option value="postedefault">Elige</option><option value="55">55 - Av. de Cataluña n.º 51</option>';
    let n = 0;
    const aMedias: Transporte = async () => {
      n++;
      if (n === 1) return { status: 200, texto: html };
      throw new Error('timeout');
    };

    const r = await pedirNombres(dosPeticiones, aMedias, { dormir: sinDormir });
    const t = fundirNombres(r);
    expect(t.contadores.respondidas).toBe(1);
    expect(t.contadores.fallidas).toBe(1);
    expect(t.porPoste[55]).toBe('Av. de Cataluña n.º 51');
  });

  it('⚠️ caracteres con tildes, ñ y barras pasan TAL CUAL (no se sanea nada)', async () => {
    const raro = 'Peñaflor / Camión de La Muñeca · nº 3';
    const html = `<option value="900">900 - ${raro}</option>`;
    const t: Transporte = async () => ({ status: 200, texto: html });
    const r = await pedirNombres([{ lineaEtiqueta: 'C1', sentido: -1 }], t, { dormir: sinDormir });
    expect(fundirNombres(r).porPoste[900]).toBe(raro);
  });

  it('la pausa entre peticiones se respeta (N-1 esperas para N peticiones)', async () => {
    let esperas = 0;
    const t: Transporte = async () => ({ status: 200, texto: '<option value="1">1 - X</option>' });
    await pedirNombres(dosPeticiones, t, { dormir: async () => { esperas++; } });
    // Entre 2 peticiones hay 1 pausa. Ni una antes de la primera (sería tiempo tirado).
    expect(esperas).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
const parada = (id: string, name: string): Stop => ({
  id: stopId(id),
  code: null,
  name,
  nombreProc: { fuente: 'gtfs-marcado', fecha: null },
  position: { lat: 41.6, lon: -0.9 },
  modes: ['bus'],
  provenance: {
    source: 'gtfs-nap' as never,
    observedAt: '2026-07-15T00:00:00.000Z',
    sourceUpdatedAt: null,
    url: null,
    confidence: 'oficial',
  },
});

describe('⭐ aplicarNombres · superponer avanza-web sobre las paradas', () => {
  const stops = [parada('s55', 'Av. De Cataluña N.º 51'), parada('s262', 'Av. De Valencia N.º 8')];
  const puente = { s55: 55, s262: 262 };
  const tabla: TablaNombresLeida = {
    generatedAt: '2026-07-15T10:00:00.000Z',
    porPoste: { 55: 'Av. de Cataluña n.º 51' }, // Avanza da el 55; el 262 está en desvío
  };

  it('la parada que Avanza da → nombre bueno + fuente avanza-web + fecha', () => {
    const r = aplicarNombres(stops, puente, tabla);
    const s55 = r.stops.find((s) => String(s.id) === 's55')!;
    expect(s55.name).toBe('Av. de Cataluña n.º 51'); // arreglado
    expect(s55.nombreProc.fuente).toBe('avanza-web');
    expect(s55.nombreProc.fecha).toBe('2026-07-15T10:00:00.000Z');
  });

  it('⚠️ la parada que Avanza NO da → se queda el GTFS ROTO, marcado (Avenida Valencia)', () => {
    const r = aplicarNombres(stops, puente, tabla);
    const s262 = r.stops.find((s) => String(s.id) === 's262')!;
    expect(s262.name).toBe('Av. De Valencia N.º 8'); // sigue roto, a propósito
    expect(s262.nombreProc.fuente).toBe('gtfs-marcado');
  });

  it('SIN tabla (Avanza caída en el build) → TODO gtfs-marcado, y sinCapa = true', () => {
    const r = aplicarNombres(stops, puente, null);
    expect(r.sinCapa).toBe(true);
    expect(r.deAvanza).toBe(0);
    expect(r.deGtfsMarcado).toBe(2);
    expect(r.stops.every((s) => s.nombreProc.fuente === 'gtfs-marcado')).toBe(true);
  });

  it('⭐ el contador independiente cuadra: deAvanza + deGtfsMarcado = total', () => {
    const r = aplicarNombres(stops, puente, tabla);
    expect(r.deAvanza + r.deGtfsMarcado).toBe(r.total);
    expect(r.total).toBe(2);
    expect(r.deAvanza).toBe(1);
    expect(r.deGtfsMarcado).toBe(1);
  });

  it('⚠️ NO SE TRUNCA: un nombre larguísimo de Avanza pasa entero', () => {
    const largo = 'Vía Hispanidad n.º 73 / Nuestra Señora de los Ángeles / Centro Deportivo Municipal';
    const r = aplicarNombres([parada('s823', 'roto')], { s823: 823 }, {
      generatedAt: '2026-07-15T10:00:00.000Z',
      porPoste: { 823: largo },
    });
    expect(r.stops[0].name).toBe(largo); // sin recortar, ni un carácter
  });

  it('un poste que Avanza da pero NO está en nuestro GTFS se cuenta como sobrante', () => {
    const r = aplicarNombres(stops, puente, {
      generatedAt: '2026-07-15T10:00:00.000Z',
      porPoste: { 55: 'Av. de Cataluña n.º 51', 99999: 'Parada provisional del desvío' },
    });
    expect(r.sobrantesDeAvanza).toBe(1);
  });
});
