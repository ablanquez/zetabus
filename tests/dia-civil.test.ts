/**
 * ⭐ EL DÍA CIVIL DE ZARAGOZA, NO EL DE UTC. Contraprueba del arreglo de la clave de
 * caché del horario (`app/linea/[linea]/page.tsx` → `engine/horario.ts`).
 *
 * El bug: la página calculaba el «hoy» con `new Date().toISOString().slice(0,10)`, que
 * da el día en UTC. Entre medianoche y las 01:00/02:00 de Madrid, en UTC todavía es
 * AYER → la clave `horario-web:…:<día>` se quedaba en el día anterior, y con TTL de un
 * día servía el horario de ayer una jornada entera.
 *
 * El arreglo: reutilizar `diaCivil` (fuente única en `feed-validity`), que resuelve el
 * día civil en `Europe/Madrid` con `Intl` (DST-safe). NO se escribe una segunda forma.
 *
 * ⚠️ Reloj INYECTADO: `diaCivil(now)` toma el instante, así que estos bordes son un
 *    test y no una sorpresa a las 00:30. Con la forma vieja (UTC) los casos de abajo
 *    se ponen ROJOS —cada uno lo dice al lado con el día que daría UTC—.
 */
import { describe, expect, it } from 'vitest';
import { diaCivil } from '@/core';

describe('⭐ diaCivil · el día civil de Zaragoza (no el de UTC)', () => {
  it('verano (CEST, UTC+2): 23:30Z ya es el día siguiente en Madrid', () => {
    // 2026-08-31T23:30:00Z = 01:30 del 2026-09-01 en Madrid. UTC diría "2026-08-31".
    const instante = new Date('2026-08-31T23:30:00Z');
    expect(diaCivil(instante)).toBe('2026-09-01');
    // El bug que se reemplaza, explícito: la forma vieja daba el día de UTC (ayer).
    expect(instante.toISOString().slice(0, 10)).toBe('2026-08-31');
  });

  it('invierno (CET, UTC+1): 23:30Z ya es el día siguiente en Madrid', () => {
    // 2026-01-31T23:30:00Z = 00:30 del 2026-02-01 en Madrid. UTC diría "2026-01-31".
    const instante = new Date('2026-01-31T23:30:00Z');
    expect(diaCivil(instante)).toBe('2026-02-01');
    expect(instante.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('⚠️ noche del cambio de hora (fin oct 2026): sigue dando el día de Madrid', () => {
    // La madrugada del 25/10/2026 los relojes atrasan 03:00→02:00. A las 23:30Z del 24
    // aún es CEST (+2) → 01:30 del 25 en Madrid. `Intl` lo resuelve sin que nadie toque nada.
    const instante = new Date('2026-10-24T23:30:00Z');
    expect(diaCivil(instante)).toBe('2026-10-25');
    expect(instante.toISOString().slice(0, 10)).toBe('2026-10-24');
  });

  it('a mediodía los dos coinciden (no rompe el caso normal)', () => {
    // 2026-07-15T12:00:00Z = 14:00 en Madrid, mismo día civil que UTC.
    expect(diaCivil(new Date('2026-07-15T12:00:00Z'))).toBe('2026-07-15');
  });
});
