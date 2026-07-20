/**
 * ⭐ LA CONTRAPRUEBA DEL CAMBIO DE CONTRATO SILENCIOSO.
 *
 * `frecuencia` se añadió a `HorarioWeb`, que se cachea un día. Las entradas ya
 * guardadas con la forma vieja —sin `frecuencia`— se servían mancas todo el día, sin
 * dar error. El arreglo: una VERSIÓN DE FORMA (`FORMA_HORARIO`) en la clave.
 *
 * Aquí se prueba lo que IMPORTA: que una entrada con la forma vieja, guardada a mano,
 * NO se sirve — se vuelve a pedir. Si se sirviera la vieja, el arreglo no valdría de
 * nada. (Comprobado que sin la versión en la clave, el primer test se pone ROJO: la
 * entrada vieja se sirve y `frecuencia` llega `undefined`.)
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { horarioDeLinea, FORMA_HORARIO } from '@/engine/horario';
import type { Transporte } from '@/sources/avanza/transporte';

const fila = (h: string, d: string, ha: string) => `<tr><td>${h}</th><td>${d}</th><td>${ha}</th></tr>`;
// Una página REAL de Avanza: tabla + el <p> de frecuencia FUERA de #infoCaracteristicas.
const PAGINA_CON_FRECUENCIA =
  `<p>Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.</p>` +
  `<div id="infoHorarios">` +
  `<table class="table-horarios" aria-describedby="table-horarios-primeras-desc"><tbody>${fila('05:00', 'PARQUE GOYA', 'SEMINARIO')}</tbody></table>` +
  `<table class="table-horarios" aria-describedby="table-horarios-ultimas-desc"><tbody>${fila('21:51', 'PARQUE GOYA', 'SEMINARIO')}</tbody></table>` +
  `</div>`;

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-horario-')); });

const transporteQueCuenta = () => {
  let pedidos = 0;
  const transporte: Transporte = async () => { pedidos++; return { status: 200, texto: PAGINA_CON_FRECUENCIA }; };
  return { transporte, pedidos: () => pedidos };
};

describe('FORMA_HORARIO invalida lo cacheado con la forma vieja', () => {
  it('⭐ una entrada guardada con la forma VIEJA (sin `frecuencia`) NO se sirve: se vuelve a pedir y trae frecuencia', async () => {
    // TTL enorme: si la forma vieja se sirviera, se serviría PARA SIEMPRE (no se cura por caducidad).
    const cache = new CacheDosPisos({ dir, ttlMs: 1e9 });

    // 1 · SEMBRAR el disco con la forma vieja, bajo la clave SIN versión (la del código anterior).
    const claveVieja = `horario-web:35:-1:2026-07-20`;
    await cache.obtener(claveVieja, async () => ({
      primeras: [{ hora: '05:00', desde: 'PARQUE GOYA', hasta: 'SEMINARIO' }],
      ultimas: [],
      info: null,
      // ⚠️ SIN `frecuencia`: es justo la forma que dejó el código de ayer.
    }));

    // 2 · Pedir por el camino de hoy (clave versionada `f2`).
    const { transporte, pedidos } = transporteQueCuenta();
    const h = await horarioDeLinea('35', 0, '2026-07-20', { cache, transporte });

    // 3 · La versión invalidó la vieja: se pidió de nuevo y ahora SÍ trae frecuencia.
    expect(pedidos(), 'la entrada vieja NO debía servirse: había que volver a pedir').toBe(1);
    expect(h?.frecuencia).toBe('Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.');
    expect(FORMA_HORARIO).toBeGreaterThanOrEqual(2); // el token que lo hace posible
  });

  it('CONTROL: con la clave versionada el cacheo SIGUE funcionando (no rompimos la caché)', async () => {
    const cache = new CacheDosPisos({ dir, ttlMs: 1e9 });
    const { transporte, pedidos } = transporteQueCuenta();

    await horarioDeLinea('35', 0, '2026-07-20', { cache, transporte });
    await horarioDeLinea('35', 0, '2026-07-20', { cache, transporte }); // segunda vez, misma clave

    expect(pedidos(), 'la segunda vez debe salir de caché, no de Avanza').toBe(1);
  });
});
