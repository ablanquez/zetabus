/**
 * ⚠️ LA COHERENCIA GLOBAL.
 *
 * "Si el motor dice LIMPIO pieza a pieza, ¿SIGUE limpio al validar el conjunto?
 *  Si no, A vale, B vale, y A+B es ilegal — y nadie avisó."
 *
 * Los tests de cada módulo comprueban ese módulo. Éstos comprueban las
 * PROPIEDADES QUE TIENEN QUE CUMPLIRSE SIEMPRE, sobre el resultado entero, sin
 * importar por qué camino se haya llegado. Son las que un usuario notaría.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos, TTL_MS } from '@/cache/dos-pisos';
import { CAPACIDAD, Limitador, TASA_POR_SEGUNDO } from '@/cache/limitador';
import { llegadasDePoste, type LlegadasDeParada } from '@/engine/llegadas';
import { paradaDelPoste } from '@/engine/topologia';
import { tieneDatos, type Observacion } from '@/core';
import { POSTE_MUDO, respuestaPoste, siempre, transporteFalso } from './dobles';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-c-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

/**
 * LAS INVARIANTES. Se cumplen SIEMPRE, venga el dato de donde venga.
 * Si alguna se rompe, la pantalla estaría enseñando algo falso con toda la
 * coherencia del mundo — que es el fallo que perseguimos.
 */
function auditar(o: Observacion<LlegadasDeParada>): string[] {
  const fallos: string[] = [];

  if (tieneDatos(o)) {
    // 1 · NADIE ACABA EN EL GOLFO DE GUINEA.
    for (const l of o.datos.llegadas) {
      if (l.posicion && l.posicion.lat === 0 && l.posicion.lon === 0) {
        fallos.push(`coche ${l.coche} pintado en (0,0)`);
      }
      // Y si tiene posición, tiene que estar en Zaragoza, no en Somalia.
      if (l.posicion && (l.posicion.lat < 41 || l.posicion.lat > 42 || l.posicion.lon < -2 || l.posicion.lon > 0)) {
        fallos.push(`coche ${l.coche} fuera de Zaragoza: ${l.posicion.lat}, ${l.posicion.lon}`);
      }
      // 2 · UN PERFIL AUSENTE ES `null`, NUNCA UN PERFIL INVENTADO.
      if (l.perfil !== null && !l.perfil.mode) {
        fallos.push(`coche ${l.coche} con un perfil a medias`);
      }
      // 3 · UN ETA SIEMPRE ES UN ENTERO RAZONABLE.
      if (!Number.isInteger(l.etaMinutos) || l.etaMinutos < 0 || l.etaMinutos > 240) {
        fallos.push(`coche ${l.coche} con eta ${l.etaMinutos}`);
      }
      // 4 · SI HAY LÍNEA DEL GTFS, HAY COLOR. Y SI NO, NO SE INVENTA.
      if ((l.lineaId === null) !== (l.color === null)) {
        fallos.push(`coche ${l.coche}: lineaId y color no van de la mano`);
      }
    }
    // 5 · LA EDAD ES REAL Y NO ES NEGATIVA.
    if (o.edadSegundos < 0) fallos.push(`edad negativa: ${o.edadSegundos}`);
    // 6 · UN DATO 'ok' NO PUEDE SER MÁS VIEJO QUE EL TTL. Si lo fuera, sería
    //     'rancio' y no lo estaría diciendo.
    if (o.estado === 'ok' && o.edadSegundos > TTL_MS / 1000) {
      fallos.push(`'ok' con ${o.edadSegundos} s: eso es rancio disfrazado de fresco`);
    }
    // 7 · EL POSTE QUE SE DEVUELVE ES UN POSTE QUE EXISTE.
    if (paradaDelPoste(o.datos.poste) === null) {
      fallos.push(`se ha devuelto el poste ${o.datos.poste}, que no está en el GTFS`);
    }
  } else {
    // 8 · UN ESTADO SIN DATOS SIEMPRE EXPLICA POR QUÉ.
    if (!o.motivo || o.motivo.length < 10) fallos.push(`estado '${o.estado}' sin un motivo decente`);
  }
  return fallos;
}

describe('⚠️ LAS INVARIANTES SE CUMPLEN VENGA EL DATO DE DONDE VENGA', () => {
  const ESCENARIOS: [string, () => ReturnType<typeof siempre>][] = [
    ['un poste normal', () => siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'VADORREY', eta: 3 }] }))],
    ['un poste mudo', () => siempre(POSTE_MUDO)],
    ['un bus sin coordenadas', () => siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'V', eta: 1, lat: null, lon: null }] }))],
    ['un bus en (0,0)', () => siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'V', eta: 1, lat: 0, lon: 0 }] }))],
    ['un bus que no está en la flota', () => siempre(respuestaPoste({ buses: [{ coche: '9999', linea: '039', destino: 'V', eta: 2 }] }))],
    ['una línea que el GTFS no tiene', () => siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '099', destino: 'V', eta: 2 }] }))],
    ['20 buses a la vez', () => siempre(respuestaPoste({ buses: Array.from({ length: 20 }, (_, i) => ({ coche: String(4600 + i), linea: '039', destino: 'V', eta: i })) }))],
    ['HTML de error', () => siempre('<html>502</html>')],
    ['Avanza caída', () => transporteFalso({ explota: 'ECONNREFUSED' })],
    ['HTTP 500', () => siempre(POSTE_MUDO, 500)],
    ['clase CSS cambiada', () => siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'V', eta: 1 }], claseStrong: 'b' }))],
    ['cruce roto', () => siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'V', eta: 1 }], ocultarDeMaquinas: ['4650'] }))],
  ];

  for (const [nombre, hacer] of ESCENARIOS) {
    it(`${nombre} → el conjunto sigue siendo coherente`, async () => {
      const t = hacer();
      const o = await llegadasDePoste(744, { cache: new CacheDosPisos({ dir }), transporte: t.transporte });
      expect(auditar(o), `escenario: ${nombre}`).toEqual([]);
    }, 20_000);
  }

  it('⭐ CONTRAPRUEBA: la auditoría CAZA una incoherencia si la hubiera', () => {
    // Si `auditar()` devolviera siempre [] estaría "aprobando" todo y estos 12
    // tests serían decorativos. Se le mete un dato ilegal a mano:
    const falso = {
      estado: 'ok', observadoEn: new Date().toISOString(), edadSegundos: 0, origen: 'fuente',
      datos: {
        paradaId: 'x', nombreParada: 'x', poste: 744, posicionParada: null, avisos: [],
        llegadas: [{
          lineaId: null, etiquetaCruda: '039', linea: null, color: '#ff0000', // ← incoherente
          destino: 'V', coche: '4650', etaMinutos: 999, // ← eta absurdo
          perfil: null, posicion: { lat: 0, lon: 0 }, // ← Null Island
        }],
      },
    } as unknown as Observacion<LlegadasDeParada>;

    const fallos = auditar(falso);
    expect(fallos.length).toBeGreaterThanOrEqual(3); // los caza los tres
    expect(fallos.join()).toMatch(/\(0,0\)/);
    expect(fallos.join()).toMatch(/eta 999/);
    expect(fallos.join()).toMatch(/no van de la mano/);
  });
});

describe('⚠️ EL TECHO SIGUE EN PIE AUNQUE EL BARRIDO SE HAYA IDO', () => {
  /**
   * ⚠️ SEAMOS EXACTOS CON LO QUE PROTEGE CADA COSA. AQUÍ ES MUY FÁCIL AUTOENGAÑARSE.
   *
   * El RITMO (4/s) y el CORTACIRCUITOS eran propiedades DEL BARRIDO: existían porque
   * una sola pulsación disparaba 67 peticiones. Con el barrido aparcado no queda
   * ninguna operación que haga más de UNA petición, así que esas dos piezas se han
   * ido aparcadas CON él (`parked/barrido-de-linea/`).
   *
   * Decir que "siguen protegiéndonos" sería quedarme con una medalla que no me toca:
   * hoy no protegen nada que exista. Lo que se queda es su LECCIÓN, escrita en
   * `docs/BARRIDO_APARCADO.md`, porque el que lo encienda dentro de seis meses va a
   * tropezar con lo mismo.
   *
   * ⭐ LO QUE SÍ NOS PROTEGE HOY, Y NO SE VA A NINGUNA PARTE, ES EL TECHO.
   *
   * Y no es redundante con la caché: la caché acota las peticiones POR CLAVE, no el
   * número de CLAVES. Un rastreador que recorra `/api/llegadas/<poste>` para los 934
   * postes produce 934 fallos de caché legítimos, y los 934 son peticiones reales a
   * Avanza. La caché estaría funcionando perfectamente mientras nos bloquean la IP.
   *
   * Ese caso no lo ha aparcado nadie. Sigue vivo, y el techo es lo único que lo para.
   */
  it('⭐ el techo sostenido sigue siendo 4/s', () => {
    expect(TASA_POR_SEGUNDO).toBe(4);
    expect(CAPACIDAD).toBeGreaterThan(0);
  });

  it('⭐ un rastreador pidiendo 200 postes seguidos NO sale de golpe', () => {
    const c = new CacheDosPisos({ dir });
    let concedidas = 0;
    for (let n = 0; n < 200; n++) if (c.limitador.pedirFicha().concedida) concedidas++;

    // Se vacía el cubo y a partir de ahí solo repone 4 fichas por segundo. Doscientas
    // peticiones de golpe NO salen de golpe. Es la promesa del README, cumplida — y es
    // la ÚNICA pieza que sigue de guardia ahora que el barrido no está.
    expect(concedidas, 'el cubo tiene que denegar').toBeLessThan(200);
    expect(concedidas).toBeLessThanOrEqual(CAPACIDAD + 5); // + lo poco que repone entretanto
  });

  it('⚠️ CONTRAPRUEBA: sin techo, los 200 saldrían todos', () => {
    // Si el cubo concediera siempre, el test de arriba estaría pasando por el motivo
    // equivocado ("es que solo pedí 200"). Con un cubo enorme, salen las 200.
    const c = new CacheDosPisos({
      dir,
      limitador: new Limitador(join(dir, '_sin_techo'), 1e9, 1e9),
    });
    let concedidas = 0;
    for (let n = 0; n < 200; n++) if (c.limitador.pedirFicha().concedida) concedidas++;
    expect(concedidas).toBe(200); // ⛔ esto es lo que Avanza recibiría sin el techo
  });
});

describe('⭐ EL DETECTOR TAMBIÉN MIENTE: desconfiar de los propios dobles', () => {
  it('el transporte falso CUENTA de verdad (si no, todos los contadores mienten)', async () => {
    const t = siempre(POSTE_MUDO);
    expect(t.llamadas).toBe(0);
    await llegadasDePoste(744, { cache: new CacheDosPisos({ dir }), transporte: t.transporte });
    expect(t.llamadas).toBe(1); // ⭐ si esto no subiera, "20 = 1 llamada" no valdría nada
    expect(t.historial[0].url).toContain('gps.avanzabus.com');
    expect(t.historial[0].cuerpo).toContain('poste=744');
  });

  it('el transporte falso RESPETA el AbortSignal (o el test del timeout mentiría)', async () => {
    // Si el doble ignorara la señal de aborto, el test "tarda 30 s → corta a
    // los 4" pasaría porque el doble se rinde solo, no porque nuestro timeout
    // funcione. Estaríamos probando el doble, no el motor.
    const t = transporteFalso({ tarda: 10_000, responder: () => ({ status: 200, texto: POSTE_MUDO }) });
    const ac = new AbortController();
    const p = t.transporte('http://x', { senal: ac.signal });
    setTimeout(() => ac.abort(new Error('cortado a propósito')), 50);
    await expect(p).rejects.toThrow(/cortado a propósito/);
  });

  it('el fixture bueno NO dispara ninguna protección (o serían falsos positivos)', () => {
    // Si el fixture "correcto" hiciera saltar el cruce de canales, todos los
    // tests de "grita" estarían pasando por el motivo equivocado.
    const bueno = respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'VADORREY', eta: 3 }] });
    expect(() => JSON.parse(bueno)).not.toThrow();
    const d = JSON.parse(bueno) as { tablatiempos: string; maquinas: Record<string, unknown> };
    expect(d.tablatiempos).toContain('fParadas');
    expect(Object.keys(d.maquinas)).toHaveLength(2); // la parada + 1 bus
  });
});
