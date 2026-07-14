/**
 * EL MOTOR ENTERO. Los cruces, los estados raros y las horas malas.
 *
 * El modo de fallo que se persigue aquí NO es que la aplicación pete.
 * Es que PINTE UNA PANTALLA COHERENTE Y FALSA. Petar se ve; mentir bien, no.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { llegadasDePoste } from '@/engine/llegadas';
import { compararRecorrido, desviosDeLinea, UMBRAL_ABSURDO } from '@/engine/desvios';
import { canonLinea, idLinea, idParada, lineas, paradaDelPoste, perfilDe, posteDe, sentidosDe } from '@/engine/topologia';
import { POSTE_MUDO, respuestaPoste, respuestaRecorrido, siempre, transporteFalso, posteDelCuerpo } from './dobles';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-m-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const cache = () => new CacheDosPisos({ dir });
/** Un poste REAL del GTFS de Zaragoza. Plaza San Miguel. */
const POSTE_REAL = 744;


describe('⭐ EL AGUJERO DE LA FUENTE: poste inválido ≠ poste sin autobuses', () => {
  it('la fuente devuelve LO MISMO para los dos. Éste es el hecho.', () => {
    // No es una suposición: es lo que se midió contra gps.avanzabus.com el
    // 13/07/2026. Un poste válido y desviado (264), uno inexistente (999999) y
    // la cadena "abc" devuelven, los tres, este byte exacto:
    expect(POSTE_MUDO).toBe('{"tablatiempos":""}');
    // ⇒ NINGÚN parser puede distinguirlos. La información no está ahí.
  });

  it('un poste que NO existe → `desconocido`, y NO SE LLAMA A AVANZA', async () => {
    const t = siempre(POSTE_MUDO);
    const r = await llegadasDePoste(999999, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('desconocido');
    expect(t.llamadas).toBe(0); // ⭐ CERO. No se gasta una petición ajena en basura.
  });

  it('un poste REAL sin autobuses → `ok` con la lista vacía. Que es otra cosa.', async () => {
    const t = siempre(POSTE_MUDO);
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok'); // ← NO 'desconocido'
    if (r.estado === 'ok') expect(r.datos.llegadas).toEqual([]);
    expect(t.llamadas).toBe(1);
    // "Sin llegadas previstas" AQUÍ es verdad. En el poste 999999 habría sido
    // mentira, y el proyecto viejo decía exactamente eso en los dos casos.
  });

  it('la basura de la URL se para en la puerta', async () => {
    const t = siempre(POSTE_MUDO);
    for (const basura of ['0', '-1', 'abc', '', '  ', '744.5', 'null', '<script>', '+744', '744abc']) {
      const r = await llegadasDePoste(basura, { cache: cache(), transporte: t.transporte });
      expect(r.estado, `poste "${basura}"`).toBe('desconocido');
    }
    expect(t.llamadas).toBe(0); // ni una sola petición por toda esa basura
  });

  it('⭐ LA COERCIÓN DE JAVASCRIPT: "0x2E8" es 744, y ese poste EXISTE', () => {
    // Este test me pilló a MÍ. La primera versión del guardia usaba `Number()`,
    // que es demasiado servicial:
    expect(Number('0x2E8')).toBe(744); // ← hexadecimal
    expect(Number('1e3')).toBe(1000); // ← notación científica, y el 1000 existe
    expect(Number('')).toBe(0);
    // Con `Number()`, /api/llegadas/0x2E8 servía Plaza San Miguel tan tranquilo.
    // No es peligroso; es que la entrada NO era la que creíamos y el motor
    // siguió adelante. Ahora se exigen DÍGITOS:
    expect(paradaDelPoste('0x2E8')).toBeNull();
    expect(paradaDelPoste('1e3')).toBeNull();
    expect(paradaDelPoste('')).toBeNull();
    expect(paradaDelPoste('744.5')).toBeNull();
    expect(paradaDelPoste(' 744 ')).not.toBeNull(); // los espacios sí se toleran
    expect(paradaDelPoste('744')).not.toBeNull();
  });

  it('⭐ CONTRAPRUEBA: sin el guardia, el poste 999999 pasaría a Avanza', async () => {
    // Un motor "ingenuo" que se fía de la respuesta:
    const ingenuo = (respuesta: string) => {
      const d = JSON.parse(respuesta) as { tablatiempos: string };
      return d.tablatiempos === '' ? 'no hay autobuses' : 'hay';
    };
    // Sobre el poste INEXISTENTE 999999 (respuesta real):
    expect(ingenuo(POSTE_MUDO)).toBe('no hay autobuses'); // ← MENTIRA. Ese poste no existe.
    // El nuestro, con la misma entrada, ni siquiera llega a preguntar.
    const t = siempre(POSTE_MUDO);
    const r = await llegadasDePoste(999999, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('desconocido');
  });
});

describe('⚠️ AVANZA SE PORTA MAL', () => {
  it('NO responde (conexión caída) → `caido`, NUNCA "no hay autobuses"', async () => {
    const t = transporteFalso({ explota: 'ECONNREFUSED' });
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('caido');
    expect(r).not.toHaveProperty('datos'); // no hay datos que fingir
    expect(t.llamadas).toBe(2); // el original + 1 reintento. Y no más.
  });

  it('tarda 30 segundos → el timeout corta a los 4, no esperamos', async () => {
    const t = transporteFalso({ tarda: 30_000, responder: () => ({ status: 200, texto: POSTE_MUDO }) });
    const t0 = Date.now();
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });
    const tardo = Date.now() - t0;

    expect(r.estado).toBe('caido');
    // Timeout(4s) + backoff(0,3s) + timeout(4s) ≈ 8,3 s. NUNCA 30.
    expect(tardo).toBeLessThan(12_000);
    expect(tardo).toBeGreaterThan(8_000);
    if (r.estado === 'caido') expect(r.motivo).toMatch(/timeout/);
  }, 20_000);

  it('devuelve HTML de error → `ilegible`, que NO es "no hay autobuses"', async () => {
    const t = siempre('<html><body><h1>502 Bad Gateway</h1></body></html>');
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ilegible'); // ⭐ ni 'ok' con lista vacía, ni 'caido'
    if (r.estado === 'ilegible') expect(r.motivo).toMatch(/no ha devuelto JSON/);
  });

  it('devuelve HTTP 500 con cuerpo válido → tampoco cuela', async () => {
    const t = siempre(respuestaPoste({ buses: [] }), 500);
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('ilegible');
  });

  it('⚠️ cambia una clase CSS → GRITA. No degrada.', async () => {
    const t = siempre(
      respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'VADORREY', eta: 2 }], claseStrong: 'b' }),
    );
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ilegible');
    // ⭐ Lo que NO puede pasar bajo ningún concepto:
    expect(r.estado).not.toBe('ok'); // ...con `llegadas: []` y la pantalla tan contenta
  });
});

describe('⚠️ LOS ESTADOS RAROS', () => {
  it('un autobús VIVO cuyo número no está en la flota → SIN DATOS, no un defecto', async () => {
    const t = siempre(
      respuestaPoste({ buses: [{ coche: '9999', linea: '039', destino: 'VADORREY', eta: 4 }] }),
    );
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      const l = r.datos.llegadas[0];
      expect(l.coche).toBe('9999');
      expect(l.perfil).toBeNull(); // ⭐ null = SIN DATOS. No "sencillo, 12 m".
      expect(l.etaMinutos).toBe(4); // pero el autobús se ENSEÑA: existe y viene
    }
    expect(perfilDe('9999')).toBeNull();
  });

  it('y va a pasar de verdad: el registro oficial cubre el 87% de lo que circula', () => {
    // 4650 sí está (Anexo 5). Un coche nuevo, no. Y el nuevo circula igual.
    expect(perfilDe('4650')).not.toBeNull();
    expect(perfilDe('5001')).toBeNull(); // aún no entregado / aún no documentado
  });

  it('Avanza anuncia una línea que el GTFS NO TIENE → se enseña, y se avisa', async () => {
    const t = siempre(
      respuestaPoste({ buses: [{ coche: '4650', linea: '099', destino: 'LINEA NUEVA', eta: 5 }] }),
    );
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      const l = r.datos.llegadas[0];
      expect(l.lineaId).toBeNull(); // no la conocemos
      expect(l.linea).toBeNull();
      expect(l.color).toBeNull(); // sin color: no nos lo inventamos
      expect(l.etiquetaCruda).toBe('099'); // pero SE ENSEÑA lo que dijo Avanza
      expect(l.etaMinutos).toBe(5); // ⭐ el autobús NO SE DESCARTA. Va lleno de gente.
      expect(r.datos.avisos.join()).toMatch(/no existe en el GTFS/);
    }
  });

  it('⭐ "039" y "39", "CI2" y "Ci2" son la MISMA línea', () => {
    // Sin esto, todos los autobuses saldrían sin color y sin nombre. En silencio.
    expect(canonLinea('039')).toBe('39');
    expect(canonLinea('39')).toBe('39');
    expect(canonLinea('CI2')).toBe('CI2');
    expect(canonLinea('Ci2')).toBe('CI2');
    expect(canonLinea(' 007 ')).toBe('7');
    // ...y no se pasa de listo: "0X" NO se convierte en "X".
    expect(canonLinea('0X')).toBe('0X');
  });

  it('la línea "039" de Avanza SÍ casa con la 39 del GTFS, de punta a punta', async () => {
    const t = siempre(
      respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'VADORREY', eta: 2 }] }),
    );
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });
    if (r.estado === 'ok') {
      expect(r.datos.llegadas[0].linea).toBe('39'); // ← casó
      expect(r.datos.llegadas[0].color).toMatch(/^#/); // y trae su color de marca
    }
  });
});

describe('⚠️ LOS CRUCES: varias condiciones a la vez. ¿Se pisan? ¿Se eclipsan?', () => {
  it('⭐ un bus SIN COORDENADAS, en una línea DESVIADA, DE NOCHE, con Avanza a 3,5 s', async () => {
    // Las cuatro cosas a la vez, que es como pasan en la calle.
    const t = transporteFalso({
      tarda: 3_500, // Avanza va lenta, pero por debajo del timeout de 4 s
      responder: () => ({
        status: 200,
        texto: respuestaPoste({
          buses: [
            { coche: '4650', linea: '039', destino: 'VADORREY', eta: 1, lat: null, lon: null }, // sin GPS
            { coche: '9999', linea: '039', destino: 'VADORREY', eta: 9 }, // y sin ficha de flota
          ],
        }),
      }),
    });
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok'); // no se eclipsan: el motor sigue en pie
    if (r.estado === 'ok') {
      const [a, b] = r.datos.llegadas;
      // El sin-GPS: SE ANUNCIA (sabemos que viene) pero NO SE PINTA.
      expect(a.coche).toBe('4650');
      expect(a.etaMinutos).toBe(1);
      expect(a.posicion).toBeNull(); // ← ni (0,0), ni la posición del otro
      expect(a.perfil).not.toBeNull(); // 4650 sí está en la flota
      // El sin-ficha: SE PINTA pero sin datos de vehículo.
      expect(b.posicion).not.toBeNull();
      expect(b.perfil).toBeNull(); // ← SIN DATOS
      // ⭐ Y LO IMPORTANTE: los dos fallos son INDEPENDIENTES. Ni el hueco de
      //    coordenadas se contagia al perfil, ni al revés.
      expect(r.datos.avisos.join()).toMatch(/4650.*sin coordenadas/);
    }
  }, 15_000);

  it('DE MADRUGADA (todo mudo) + Avanza lenta → `ok` vacío, NUNCA "desviado"', async () => {
    const t = transporteFalso({ tarda: 2_000, responder: () => ({ status: 200, texto: POSTE_MUDO }) });
    const r = await llegadasDePoste(POSTE_REAL, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      expect(r.datos.llegadas).toEqual([]);
      // ⚠️ EL ESTADO 'desviado' NO EXISTE EN ESTE CANAL. NO PUEDE EXISTIR.
      //    A las 4 de la mañana, TODOS los postes están mudos. Si el silencio
      //    implicara desvío, ZetaBus declararía la ciudad entera desviada cada
      //    noche — con una coherencia perfecta y una falsedad total.
      expect(Object.keys(r.datos)).not.toContain('desviado');
    }
  }, 15_000);

  it('la caché SIRVE de madrugada: 50 curiosos a las 4 a.m. = 1 petición', async () => {
    const t = siempre(POSTE_MUDO);
    const c = cache();
    await Promise.all(
      Array.from({ length: 50 }, () => llegadasDePoste(POSTE_REAL, { cache: c, transporte: t.transporte })),
    );
    expect(t.llamadas).toBe(1); // un poste mudo también se cachea. Faltaría más.
  });
});

describe('⭐ EL DIFF DE DESVÍOS', () => {
  const P = (n: number, nombre = `parada ${n}`) => ({ poste: n, nombre });
  const RUTA = [P(1), P(2), P(3), P(4), P(5), P(6), P(7), P(8), P(9), P(10)];

  it('sin desvío: el diff sale vacío y se AUTO-APAGA', () => {
    const v = compararRecorrido(RUTA, RUTA);
    expect(v.tipo).toBe('comparado');
    if (v.tipo === 'comparado') {
      expect(v.hayDesvio).toBe(false);
      expect(v.fuera).toEqual([]);
      expect(v.hacia).toEqual([]);
    }
  });

  it('desvío real: dos paradas fuera, una provisional dentro', () => {
    const hoy = [P(1), P(2), P(99, 'provisional'), P(5), P(6), P(7), P(8), P(9), P(10)];
    const v = compararRecorrido(RUTA, hoy);
    expect(v.tipo).toBe('comparado');
    if (v.tipo === 'comparado') {
      expect(v.hayDesvio).toBe(true);
      expect(v.fuera.map((p) => p.poste)).toEqual([3, 4]); // el autobús ya no pasa
      expect(v.hacia.map((p) => p.poste)).toEqual([99]); // parada de obras
    }
  });

  it('⚠️ LA LISTA REAL VACÍA NO ES "HAN QUITADO TODAS LAS PARADAS"', () => {
    // Si esto devolviera un diff, la pantalla tacharía la línea ENTERA. Con una
    // coherencia visual impecable. Y sería falso de principio a fin.
    const v = compararRecorrido(RUTA, []);
    expect(v.tipo).toBe('indeterminado');
    if (v.tipo === 'indeterminado') expect(v.motivo).toMatch(/vac/);
  });

  it('⭐ EL FRENO DE MANO: si "desaparece" más de la mitad, es una lectura rota', () => {
    // Un desvío quita 3 paradas, o 5. No quita 8 de 10.
    const medioRota = [P(1), P(2)];
    const v = compararRecorrido(RUTA, medioRota);
    expect(v.tipo).toBe('indeterminado'); // ← NO se tacha nada
    if (v.tipo === 'indeterminado') expect(v.motivo).toMatch(/lectura rota/);
  });

  it('el borde exacto del freno: 50% pasa, 60% no', () => {
    expect(UMBRAL_ABSURDO).toBe(0.5);
    const justo = RUTA.slice(0, 5); // faltan 5 de 10 = 50%, NO supera el umbral
    expect(compararRecorrido(RUTA, justo).tipo).toBe('comparado');
    const pasada = RUTA.slice(0, 4); // faltan 6 de 10 = 60%
    expect(compararRecorrido(RUTA, pasada).tipo).toBe('indeterminado');
  });

  it('⭐ CONTRAPRUEBA: sin el freno, media línea se tacharía sin rechistar', () => {
    // El diff "ingenuo", que es el que sale solo si nadie piensa en esto:
    const ingenuo = (of: typeof RUTA, real: typeof RUTA) => of.filter((p) => !real.some((q) => q.poste === p.poste));
    expect(ingenuo(RUTA, [])).toHaveLength(10); // ← LAS DIEZ. Todas tachadas.
    // El nuestro, con la misma entrada, se niega a concluir:
    expect(compararRecorrido(RUTA, []).tipo).toBe('indeterminado');
  });

  it('reordenar sin quitar nada TAMBIÉN es un desvío', () => {
    const alReves = [...RUTA].reverse();
    const v = compararRecorrido(RUTA, alReves);
    if (v.tipo === 'comparado') {
      expect(v.reordenado).toBe(true);
      expect(v.hayDesvio).toBe(true);
      expect(v.fuera).toEqual([]); // no falta ninguna...
      expect(v.hacia).toEqual([]); // ...ni sobra ninguna. Pero el orden cambió.
    }
  });

  it('⚠️ un desvío que aparece y desaparece entre dos peticiones NO deja rastro raro', () => {
    // El diff no tiene memoria a propósito: se recalcula entero cada vez. Un
    // estado que va y viene produce dos veredictos independientes, no un
    // "desvío pegado" que haya que acordarse de limpiar.
    const conDesvio = compararRecorrido(RUTA, RUTA.filter((p) => p.poste !== 5));
    const sinDesvio = compararRecorrido(RUTA, RUTA);
    expect(conDesvio.tipo === 'comparado' && conDesvio.hayDesvio).toBe(true);
    expect(sinDesvio.tipo === 'comparado' && sinDesvio.hayDesvio).toBe(false); // ⭐ se apagó solo
  });

  it('el GTFS sin paradas para un sentido → indeterminado, no "todo desviado"', () => {
    expect(compararRecorrido([], RUTA).tipo).toBe('indeterminado');
  });

  it('⚠️ una parada de HOY que el GTFS no conoce: se lista, pero sin coordenadas', () => {
    const hoy = [...RUTA, P(99999, 'parada que no está en el GTFS')];
    const v = compararRecorrido(RUTA, hoy);
    if (v.tipo === 'comparado') {
      expect(v.hacia.map((p) => p.poste)).toEqual([99999]);
      // Y arriba, quien la pinte, tendrá que mirar si existe. `posteDe` dirá
      // que no, y entonces se enseña el nombre y NO se pinta un punto.
      expect(paradaDelPoste(99999)).toBeNull();
    }
  });
});

describe('⭐ EL DIFF NO PUEDE MIRAR LO VIVO. NI QUERIENDO.', () => {
  it('la firma de `compararRecorrido` no admite ni un dato de llegadas', () => {
    // No es disciplina: es el TIPO. Recibe dos listas de {poste, nombre} y nada
    // más. No hay por dónde colar un ETA, ni un coche, ni un "lleva 3 h mudo".
    // Si alguien lo intenta, TypeScript se planta antes de que llegue a nadie.
    const v = compararRecorrido([{ poste: 1, nombre: 'a' }], [{ poste: 1, nombre: 'a' }]);
    expect(v.tipo).toBe('comparado');
    expect(compararRecorrido.length).toBe(2); // dos parámetros. Ni uno más.
  });

  it('⚠️ un poste mudo NO produce un desvío. Ni con 10 postes mudos.', async () => {
    // El escenario que INVENTARÍA un desvío: la línea entera callada (son las
    // 4 de la mañana) y el recorrido de hoy idéntico al oficial.
    const l = lineas().find((x) => x.shortName === '39')!;
    const id = idLinea(String(l.id));

    const t = transporteFalso({
      responder: (url, cuerpo) => {
        if (url.includes('admin-ajax')) {
          // ⚠️ El doble tiene que responder POR SENTIDO. La primera versión
          //    devolvía las paradas de LOS DOS sentidos a las dos preguntas, y
          //    el diff veía paradas "de más" → desvío inventado. El test se puso
          //    rojo por culpa del doble, no del motor. Un doble descuidado
          //    también miente.
          const pedido = new URLSearchParams(cuerpo ?? '').get('selectSentido');
          const dir = pedido === '-1' ? 0 : 1;
          const s = sentidosDe(id).find((x) => x.directionId === dir);
          const postes: { poste: number; nombre: string }[] = [];
          for (const sid of s?.official.stops ?? []) {
            const p = posteDe(idParada(sid));
            if (p) postes.push({ poste: p, nombre: 'x' });
          }
          return { status: 200, texto: respuestaRecorrido(postes) };
        }
        void posteDelCuerpo(cuerpo);
        return { status: 200, texto: POSTE_MUDO }; // TODOS los postes, mudos
      },
    });

    const r = await desviosDeLinea(id, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      for (const d of r.datos) {
        if (d.veredicto.tipo === 'comparado') {
          // ⭐ Silencio absoluto en la calle, y el diff dice: NO HAY DESVÍO.
          //    Porque el silencio no es su fuente. Ni la mira.
          expect(d.veredicto.hayDesvio).toBe(false);
        }
      }
    }
  }, 30_000);
});
