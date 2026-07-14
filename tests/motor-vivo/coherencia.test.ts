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
import { CAPACIDAD, TASA_POR_SEGUNDO } from '@/cache/limitador';
import { llegadasDePoste, type LlegadasDeParada } from '@/engine/llegadas';
import { barrerLinea, EN_VUELO, POR_SEGUNDO } from '@/engine/barrido';
import { idLinea, idParada, lineas, paradaDelPoste, posteDe, sentidosDe } from '@/engine/topologia';
import { tieneDatos, type Observacion } from '@/core';
import { cacheSinTecho, POSTE_MUDO, respuestaPoste, siempre, transporteFalso } from './dobles';

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

describe('⚠️ COHERENCIA DEL BARRIDO', () => {
  it('ningún coche sale dos veces, y el total dedupe ≤ suma de apariciones', async () => {
    const l = lineas().find((x) => x.shortName === '39')!;
    const buses = Array.from({ length: 6 }, (_, i) => ({
      coche: String(4600 + i), linea: '039', destino: 'VADORREY', eta: i,
    }));
    const t = siempre(respuestaPoste({ buses })); // cada poste ve los 6

    const r = await barrerLinea(
      idLinea(String(l.id)),
      { cache: cacheSinTecho(dir), transporte: t.transporte },
      { dormir: async () => {} },
    );

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      const coches = r.datos.detectados.map((d) => String(d.coche));
      expect(new Set(coches).size).toBe(coches.length); // ⭐ cero duplicados
      expect(r.datos.detectados).toHaveLength(6); // 6, no 6 × 40 postes
      // Cada uno visto en varios postes: es la prueba de que el dedupe trabajó.
      expect(r.datos.detectados.every((d) => d.vistoEnPostes > 1)).toBe(true);
      // Y salen ordenados por número de coche: la lista ya no se lee por minutos
      // (los minutos se han quitado), así que el orden tiene que ser estable y
      // no depender de por dónde pasaba cada autobús en ese instante.
      expect(coches).toEqual([...coches].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })));
    }
  }, 30_000);

  it('⭐ CONTRAPRUEBA: sin deduplicar, la línea 39 tendría ~100 autobuses', async () => {
    // Un barrido ingenuo suma las llegadas de cada poste. El mismo autobús
    // aparece en MUCHOS postes (medido: hasta 22 de los 72 de la línea 32), así
    // que la cifra se dispara: "la línea 39 tiene 240 autobuses circulando".
    // Perfectamente coherente. Perfectamente falsa. Y nadie la cuestionaría.
    const l = lineas().find((x) => x.shortName === '39')!;
    const buses = Array.from({ length: 6 }, (_, i) => ({ coche: String(4600 + i), linea: '039', destino: 'V', eta: i }));
    const t = siempre(respuestaPoste({ buses }));

    const r = await barrerLinea(
      idLinea(String(l.id)),
      { cache: cacheSinTecho(dir), transporte: t.transporte },
      { dormir: async () => {} },
    );
    if (r.estado === 'ok') {
      const sinDeduplicar = r.datos.detectados.reduce((a, d) => a + d.vistoEnPostes, 0);
      // 6 autobuses vistos en cada uno de los postes del barrido. El motor
      // ingenuo los sumaría todos y cantaría una cifra ocho veces mayor.
      expect(sinDeduplicar).toBe(6 * r.datos.postesConsultados);
      expect(sinDeduplicar).toBeGreaterThan(40); // ← lo que diría el motor ingenuo
      expect(r.datos.detectados).toHaveLength(6); // ← lo que decimos nosotros
      expect(sinDeduplicar / r.datos.detectados.length).toBeGreaterThan(5); // ×8, de hecho
    }
  }, 30_000);
});

describe('⚠️ EL TECHO NO PUEDE MUTILAR EL PRODUCTO', () => {
  /**
   * ⭐⭐ ESTE TEST CAMBIÓ DE SIGNIFICADO, Y ESO ES EL HALLAZGO.
   *
   * Antes decía: "el cubo (40 fichas) tiene que dar para el barrido más largo
   * (N7: 31 peticiones con paso 4)". Y pasaba. Pero lo que estaba comprobando,
   * SIN QUE YO ME DIERA CUENTA, era que **el cubo dejara pasar una ráfaga entera
   * de golpe**. El barrido hacía `Promise.all` de todos los postes: los soltaba a
   * la vez, y el cubo, con 40 fichas, se los tragaba.
   *
   * ⇒ El techo no estaba frenando al barrido. LE ESTABA DANDO PERMISO.
   *
   * Y el test me estaba ayudando a mantener ese permiso, con toda la solemnidad
   * de una invariante. Ese es el modo de fallo que persigue este proyecto: no que
   * algo pete, sino que algo coherente y falso se quede a vivir.
   *
   * Solo se vio al subir a 67 postes, porque entonces el permiso ya no alcanzaba
   * (67 > 40) y 27 postes habrían salido `fallo` de salida.
   *
   * Ahora el barrido SE MARCA SU PROPIO RITMO (4/s, y nunca dispara de golpe), y
   * el cubo vuelve a ser lo que tenía que ser: una red de seguridad que en marcha
   * normal no se toca. La invariante que hay que atar ya no es "cabe la ráfaga",
   * es **"el barrido no pide más deprisa de lo que el cubo repone"**.
   */
  it('⭐ el barrido NO pide más deprisa de lo que el cubo repone', () => {
    // Si alguien sube POR_SEGUNDO por encima de la tasa del cubo, el barrido se
    // comería sus propias fichas y empezaría a fallar postes en marcha normal.
    // Dos números en dos ficheros que nadie relacionaría a ojo. Atados.
    expect(POR_SEGUNDO).toBeLessThanOrEqual(TASA_POR_SEGUNDO);
    // Y el colchón tiene que absorber, como mínimo, lo que hay en vuelo a la vez.
    expect(CAPACIDAD).toBeGreaterThanOrEqual(EN_VUELO);
  });

  it('⚠️ el barrido más largo de la red YA NO tiene que caber en el cubo', () => {
    // La línea más larga (N7, 119 postes) ahora se pide ENTERA. No cabe en 40
    // fichas, y NO PASA NADA: no se piden de golpe. Este test deja escrito que la
    // vieja relación "postes ≤ CAPACIDAD" ha dejado de existir a propósito, para
    // que nadie la restaure "arreglando" un número.
    let peor = 0;
    let cual = '';
    for (const l of lineas()) {
      const postes = new Set<number>();
      for (const s of sentidosDe(idLinea(String(l.id)))) {
        for (const sid of s.official.stops) {
          const p = posteDe(idParada(sid));
          if (p) postes.add(p);
        }
      }
      if (postes.size > peor) { peor = postes.size; cual = l.shortName; }
    }
    expect(peor, `la línea más larga es la ${cual}`).toBeGreaterThan(CAPACIDAD);
    // El tiempo que va a tardar, dicho en voz alta: si un día son 5 minutos,
    // que se vea aquí y no en la cara del usuario.
    const segundos = peor / POR_SEGUNDO;
    expect(segundos, `barrer la ${cual} entera tarda ${segundos.toFixed(0)} s`).toBeLessThan(60);
  });

  it('...y el techo SOSTENIDO sigue siendo 4/s: la ráfaga no lo relaja', () => {
    // Una ráfaga grande NO es barra libre. Se vacía el cubo entero y luego solo
    // se regenera a 4 fichas por segundo, que es lo que le prometemos a Avanza.
    expect(TASA_POR_SEGUNDO).toBe(4);
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
