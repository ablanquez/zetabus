/**
 * ⭐⭐ LA MUERTE DEL PASO 4, Y EL RITMO QUE LA PAGA.
 *
 * Dos cosas cambiaron a la vez, y las dos hay que poder demostrarlas:
 *
 *   1. SE BARRE ENTERO. El muestreo perdía autobuses — medido contra Avanza el
 *      14/07/2026: en la línea 35, el paso 4 encontraba 10 de 12.
 *   2. EL BARRIDO SE MARCA SU PROPIO RITMO. Antes soltaba todos los postes de
 *      golpe con un `Promise.all` y el cubo de fichas se lo permitía. Con 67 no
 *      solo es descortés: es que 27 postes saldrían `fallo` de salida.
 *
 * ⚠️ Y LOS DATOS DE AVANZA NO ENTRAN EN EL REPOSITORIO. Ni capturas, ni fixtures.
 * El pelotón que mató al paso se REPRODUCE aquí, sintético, con la regla que lo
 * causa. Si la regla es la correcta, el fallo sale igual.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { barrerLinea, EN_VUELO, POR_SEGUNDO, RENDIRSE_TRAS } from './barrido';
import { agruparFlota } from './agrupar-flota';
import { idLinea, idParada, lineas, posteDe, sentidosDe } from '@/engine/topologia';
import type { BusProfile } from '@/modes/bus/profile';
import type { Transporte } from '@/sources/avanza/transporte';
import { cacheSinTecho, POSTE_MUDO, respuestaPoste, siempre, transporteFalso, posteDelCuerpo } from '../../tests/motor-vivo/dobles';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-bc-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const cache = () => new CacheDosPisos({ dir });
const L35 = () => lineas().find((x) => x.shortName === '35')!;

/** Los postes de la 35, los dos sentidos, en el mismo orden que usa el motor. */
function postesDeLa35(): number[] {
  const out: number[] = [];
  const vistos = new Set<number>();
  for (const s of sentidosDe(idLinea(String(L35().id)))) {
    for (const sid of s.official.stops) {
      const p = posteDe(idParada(sid));
      if (p !== null && !vistos.has(p)) { vistos.add(p); out.push(p); }
    }
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════

describe('⭐⭐ EL PELOTÓN: por qué el muestreo perdía autobuses', () => {
  /**
   * LA REGLA DE LOS DOS, reproducida sin tocar Avanza.
   *
   * Avanza anuncia en cada poste, como mucho, LOS DOS SIGUIENTES de cada línea y
   * sentido. Si tres autobuses van pegados, el TERCERO solo es visible en el
   * puñado de postes que hay entre él y el que va dos por delante. Su ventana se
   * estrecha. Y un muestreo que salta de 4 en 4 puede no caer dentro.
   *
   * Aquí se monta exactamente eso: un autobús que SOLO se ve en el poste nº 7.
   * (En la calle, ese 7 fue el coche 4314 de la línea 33: visible en 1 poste de 51.)
   */
  const ESCONDIDO = '4314';
  const INDICE_UNICO = 7; // 7 no es múltiplo de 4. Ese es todo el drama.

  const transporteConPeloton = () => {
    const postes = postesDeLa35();
    return transporteFalso({
      responder: (_url, cuerpo) => {
        const poste = posteDelCuerpo(cuerpo);
        const i = postes.indexOf(Number(poste));
        // Los dos de cabeza se ven por toda la línea. El tercero, en UN poste.
        const buses = [
          { coche: '4900', linea: '035', destino: 'PARQUE GOYA', eta: 2 },
          { coche: '4901', linea: '035', destino: 'PARQUE GOYA', eta: 3 },
          ...(i === INDICE_UNICO
            ? [{ coche: ESCONDIDO, linea: '035', destino: 'PARQUE GOYA', eta: 4 }]
            : []),
        ];
        return { status: 200, texto: respuestaPoste({ buses }) };
      },
    });
  };

  it('⭐ el barrido COMPLETO lo encuentra', async () => {
    const t = transporteConPeloton();
    const r = await barrerLinea(
      idLinea(String(L35().id)),
      { cache: cache(), transporte: t.transporte },
      { dormir: async () => {} },
    );

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      const coches = r.datos.detectados.map((d) => String(d.coche));
      expect(coches).toContain(ESCONDIDO); // ⭐ EL VERDE
      expect(coches).toHaveLength(3);
      expect(r.datos.detectados.find((d) => String(d.coche) === ESCONDIDO)!.vistoEnPostes).toBe(1);
    }
  }, 30_000);

  it('⭐ CONTRAPRUEBA — EL ROJO: el paso 4 se lo come. Con LOS MISMOS DATOS.', async () => {
    // Se reconstruye el muestreo que hacía el motor hasta hoy —{0, 4, 8…} más el
    // último— y se aplica a la captura completa. Es la comparación honesta: mismo
    // instante, mismas respuestas. La única diferencia es a qué postes se pregunta.
    const postes = postesDeLa35();
    const conPaso4 = new Set<number>();
    for (let i = 0; i < postes.length; i += 4) conPaso4.add(i);
    conPaso4.add(postes.length - 1); // el último iba siempre

    // 7 no es múltiplo de 4, y no es el último. El autobús NO SALE.
    expect(conPaso4.has(INDICE_UNICO)).toBe(false);

    // Y que quede escrito lo que costaba y lo que cuesta:
    expect(postes.length).toBeGreaterThan(60);       // 67 postes, los dos sentidos
    expect(conPaso4.size).toBeLessThan(20);          // 18 peticiones. Baratas. Y ciegas.
  });

  it('⚠️ y el muestreo NO se puede rescatar cambiando el número', () => {
    // La tentación es "pues bajamos a paso 2". Pero la ventana de un autobús la
    // fija LO CERCA QUE TENGA AL QUE VA DOS POR DELANTE — no la longitud de la
    // línea. Medido en la calle: hay ventanas de UN poste. Y solo el paso 1
    // garantiza caer dentro de una ventana de 1.
    //
    // Esto no es una simulación: es aritmética. Un tramo de p postes consecutivos
    // siempre contiene un múltiplo de p; uno de p−1, no tiene por qué.
    const VENTANA_MAS_ESTRECHA_MEDIDA = 1; // coche 4314, línea 33, 14/07/2026
    for (const paso of [2, 3, 4, 5]) {
      const cae = Array.from({ length: VENTANA_MAS_ESTRECHA_MEDIDA }, (_, k) => INDICE_UNICO + k)
        .some((i) => i % paso === 0);
      expect(cae, `el paso ${paso} NO garantiza una ventana de 1 poste`).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⭐ EL RITMO: 67 postes no se piden de golpe', () => {
  /**
   * ⚠️⚠️ EL INSTRUMENTO ME MINTIÓ AL ESCRIBIR ESTO, Y QUEDA ANOTADO.
   *
   * La primera versión de este test apagaba las esperas (`dormir` vacío) y dejaba
   * la caché con el reloj de verdad. Resultado: el barrido soltaba los 67 postes
   * en cero milisegundos, el cubo (40 fichas) denegaba 27, y el test fallaba con
   * "esperaba 67, recibí 40".
   *
   * El fallo era REAL —es exactamente lo que pasaría sin ritmo— pero el test lo
   * provocaba haciendo trampa: media con un reloj y frenaba con otro.
   *
   * ⭐ LO HONESTO ES UN RELOJ VIRTUAL QUE AVANZA CON LAS PROPIAS ESPERAS. Así el
   *   cubo ve el tiempo que vería de verdad, se rellena como se rellenaría de
   *   verdad, y el test comprueba LO QUE IMPORTA: que el ritmo del barrido y la
   *   reposición del cubo encajan. Sin esperar 17 segundos.
   */
  const conRelojVirtual = async (o: { porSegundo?: number; enVuelo?: number } = {}) => {
    const reloj = { t: 1_000_000 };
    const t0 = reloj.t;
    const esperas: number[] = [];
    const c = new CacheDosPisos({ dir, ahora: () => reloj.t });
    const t = siempre(POSTE_MUDO);

    const r = await barrerLinea(
      idLinea(String(L35().id)),
      { cache: c, transporte: t.transporte, ahora: () => reloj.t },
      {
        ...o,
        // El tiempo pasa PORQUE el barrido lo pide. Igual que en la calle.
        dormir: async (ms) => { esperas.push(ms); reloj.t += ms; },
      },
    );
    return { r, t, c, esperas, transcurrido: reloj.t - t0 };
  };

  it('⭐ pide 4 por segundo, tarda ~17 s, y el cubo NO deniega ni una ficha', async () => {
    const { r, t, c, transcurrido } = await conRelojVirtual();
    const n = postesDeLa35().length;

    expect(r.estado).toBe('ok');
    expect(t.llamadas).toBe(n); // ⭐ LOS 67. Ninguno se queda por el camino.

    // ⭐ LA CIFRA QUE IMPORTA: el techo no ha tenido que denegar NADA. El cubo
    //    vuelve a ser una red de seguridad, no el regulador del barrido.
    expect(c.metricas.denegadasPorTecho).toBe(0);
    if (r.estado === 'ok') expect(r.datos.postesFallidos).toBe(0);

    // Y el ritmo real: (n−1) huecos de 1/4 de segundo. ~16,5 s. Se dice en voz alta.
    expect(transcurrido / 1000).toBeCloseTo((n - 1) / POR_SEGUNDO, 1);
    expect(transcurrido).toBeGreaterThan(15_000);
  }, 30_000);

  it('⭐⭐ CONTRAPRUEBA — EL ROJO: sin ritmo, EL PROPIO TECHO se come el barrido', async () => {
    // Esto es LITERALMENTE lo que hacía el motor hasta hoy: `Promise.all` sobre
    // todos los postes, todos a la vez. Con 18 no se notaba (cabían en el cubo de
    // 40). Con 67 no caben — y 27 postes salen `fallo` SIN QUE AVANZA SE ENTERE.
    //
    // ⚠️ Fíjate en lo tramposo del caso viejo: el barrido de paso 4 "funcionaba"
    //    porque la ráfaga cabía justa. El techo no lo estaba frenando: le estaba
    //    dando permiso. Y un test verde certificaba ese permiso como invariante.
    const { r, t, c, esperas } = await conRelojVirtual({ porSegundo: Infinity, enVuelo: 999 });

    expect(esperas).toHaveLength(0); // cero esperas = ráfaga
    expect(t.llamadas).toBeLessThan(postesDeLa35().length); // ⭐ NO llegan todas
    expect(c.metricas.denegadasPorTecho).toBeGreaterThan(20);
    if (r.estado === 'ok') {
      expect(r.datos.postesFallidos).toBeGreaterThan(20);
      expect(r.datos.avisos.join()).toMatch(/INCOMPLETO/);
    }
  }, 30_000);

  it('nunca hay más de EN_VUELO peticiones EN EL AIRE a la vez', async () => {
    // ⚠️ El ritmo (4/s) y las peticiones simultáneas son DOS cosas distintas, y
    //    la segunda es la que ve Avanza como conexiones abiertas. Se mide con un
    //    transporte que cuenta cuántos están dentro, porque el doble no lo sabe.
    let dentro = 0;
    let pico = 0;
    const transporte: Transporte = async () => {
      dentro++;
      pico = Math.max(pico, dentro);
      await new Promise((r) => setTimeout(r, 5)); // una respuesta tarda algo
      dentro--;
      return { status: 200, texto: POSTE_MUDO };
    };

    await barrerLinea(
      idLinea(String(L35().id)),
      { cache: cache(), transporte },
      { dormir: async () => {} }, // sin esperas: el tope tiene que aguantar IGUAL
    );

    // ⭐ Y aquí está la gracia: aunque se apague el reloj, el tope de simultáneas
    //    NO depende de él. Son dos frenos independientes, y ninguno tapa al otro.
    expect(pico).toBeLessThanOrEqual(EN_VUELO);
    expect(pico).toBeGreaterThan(1); // ...pero SÍ va en paralelo: no es secuencial
  }, 30_000);
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⭐⭐ EL CORTACIRCUITOS: si no contesta nadie, se PARA', () => {
  /**
   * ⚠️ ESTO SALIÓ DE UN BARRIDO REAL, EL 14/07/2026, CON AVANZA CAÍDA:
   *
   *     110 peticiones · 67 timeouts · 43 reintentos · 3.269 ms de media · 90 s
   *
   * Los 67 postes dieron timeout, y nosotros seguimos preguntando hasta el final.
   * Le mandamos 110 peticiones a un servidor que ya estaba en el suelo, y al
   * usuario le pusimos una barra girando minuto y medio para acabar diciéndole
   * que no sabíamos nada. Las dos cosas están mal.
   */
  it('⭐ Avanza no contesta a NADA → se rinde pronto y NO pregunta las 67', async () => {
    const t = transporteFalso({ explota: 'ECONNREFUSED' });
    const r = await barrerLinea(
      idLinea(String(L35().id)),
      { cache: cacheSinTecho(dir), transporte: t.transporte },
      { dormir: async () => {} },
    );

    expect(r.estado).toBe('caido'); // ← NO 'ok' con la lista vacía
    if (r.estado === 'caido') {
      expect(r.motivo).toMatch(/dejado de preguntar/);
    }

    // ⭐ LA CIFRA QUE LE IMPORTA A AVANZA. Cada `leerPoste` reintenta una vez, y
    //    los que ya estaban en vuelo cuando saltó el corte terminan igual. El tope
    //    duro es, por tanto, (RENDIRSE_TRAS + EN_VUELO) × 2 peticiones. Y punto.
    const postes = postesDeLa35().length;
    console.log(`\n  Avanza caída → ${t.llamadas} peticiones en vez de ${postes * 2}`);
    expect(t.llamadas, 'ni de lejos los 67 postes').toBeLessThan(postes);
    expect(t.llamadas).toBeLessThanOrEqual((RENDIRSE_TRAS + EN_VUELO) * 2);
  }, 60_000);

  it('⚠️ pero UN POSTE MALO no puede tumbar la línea: si algo va, se barre ENTERA', async () => {
    // La diferencia entre "hay fallos" y "no hay nadie al otro lado". Si el
    // cortacircuitos confundiera las dos cosas, un poste roto dejaría media línea
    // sin mirar — y la pantalla enseñaría 3 autobuses de 12 tan tranquila.
    let n = 0;
    const t = transporteFalso({
      responder: () => {
        n++;
        if (n % 5 === 0) return { status: 500, texto: 'boom' }; // 1 de cada 5, roto
        return { status: 200, texto: respuestaPoste({ buses: [{ coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 3 }] }) };
      },
    });

    const r = await barrerLinea(
      idLinea(String(L35().id)),
      { cache: cacheSinTecho(dir), transporte: t.transporte },
      { dormir: async () => {} },
    );

    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') {
      expect(r.datos.abandonado, 'la fuente está VIVA: no hay que rendirse').toBe(false);
      expect(r.datos.postesConsultados).toBe(postesDeLa35().length); // la línea ENTERA
      expect(r.datos.postesFallidos).toBeGreaterThan(0); // ...con sus fallos, dichos
      expect(r.datos.detectados).toHaveLength(1);
    }
  }, 60_000);

  it('⭐ CONTRAPRUEBA — EL ROJO: sin cortacircuitos, se piden los 67 a un muerto', async () => {
    // Se apaga la protección (`rendirseTras` altísimo) y se mira lo que hacía el
    // motor hasta hoy: preguntar los 67 postes, uno por uno, a un servidor que no
    // contesta. Con reintento, son 134 peticiones. Es exactamente lo que se midió.
    const t = transporteFalso({ explota: 'ECONNREFUSED' });
    const r = await barrerLinea(
      idLinea(String(L35().id)),
      { cache: cacheSinTecho(dir), transporte: t.transporte },
      { dormir: async () => {}, rendirseTras: 1e9 },
    );

    const postes = postesDeLa35().length;
    console.log(`  sin cortacircuitos → ${t.llamadas} peticiones a un servidor caído`);
    expect(t.llamadas).toBe(postes * 2); // ⭐ los 67, con su reintento cada uno
    expect(r.estado).toBe('caido');
  }, 60_000);
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⭐ AGRUPAR POR MODELO: la geometría se explica sola', () => {
  const ficha = (o: Partial<BusProfile>): BusProfile => ({
    mode: 'bus', manufacturer: 'Volvo', model: '7905', lengthMeters: 18,
    busClass: 'articulado', fuel: 'diesel', registeredOn: null, plate: null,
    confidence: 'oficial', ...o,
  } as BusProfile);

  it('mismo modelo → un grupo; los coches, ordenados', () => {
    const g = agruparFlota([
      { coche: '4243' as never, perfil: ficha({}) },
      { coche: '4211' as never, perfil: ficha({}) },
      { coche: '4266' as never, perfil: ficha({}) },
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].coches).toEqual(['4211', '4243', '4266']);
    expect(g[0].modelo).toBe('Volvo 7905');
    expect(g[0].clase).toBe('articulado');
    expect(g[0].combustible).toBe('diésel');
  });

  it('⚠️ SIN FICHA → SU PROPIO GRUPO. Nunca dentro de otro.', () => {
    const g = agruparFlota([
      { coche: '4243' as never, perfil: ficha({}) },
      { coche: '9999' as never, perfil: null }, // ← no consta en el registro
    ]);
    expect(g).toHaveLength(2);
    const sinDatos = g.find((x) => x.confianza === null)!;
    expect(sinDatos.coches).toEqual(['9999']);
    // ⭐ Y NO SE LE INVENTA NADA. Ni modelo, ni clase, ni metros.
    expect(sinDatos.modelo).toBeNull();
    expect(sinDatos.clase).toBeNull();
    expect(sinDatos.metros).toBeNull();
    // Va el último: no es un modelo, es la ausencia de uno. Pero VA.
    expect(g[g.length - 1]).toBe(sinDatos);
  });

  it('⭐⭐ un SIN VERIFICAR no se disfraza de oficial escondiéndose en su grupo', () => {
    // El mismo modelo, la misma clase, el mismo combustible. Lo único distinto es
    // la CONFIANZA. Si la clave del grupo no la incluyera, los dos caerían en el
    // mismo bloque, el bloque heredaría la confianza del primero, y el borde
    // discontinuo desaparecería. Un dato sin verificar se habría vuelto oficial
    // sin que nadie tocase una línea de código.
    const g = agruparFlota([
      { coche: '4243' as never, perfil: ficha({ confidence: 'oficial' }) },
      { coche: '4114' as never, perfil: ficha({ confidence: 'sin_verificar' }) },
    ]);
    expect(g).toHaveLength(2); // ⭐ DOS grupos, no uno
    expect(g.map((x) => x.confianza).sort()).toEqual(['oficial', 'sin_verificar']);
  });

  it('el grupo más numeroso va primero: la flota mayoritaria se ve de un vistazo', () => {
    const g = agruparFlota([
      { coche: '4001' as never, perfil: ficha({ model: 'eCitaro', manufacturer: 'Mercedes-Benz' }) },
      { coche: '4002' as never, perfil: ficha({}) },
      { coche: '4003' as never, perfil: ficha({}) },
    ]);
    expect(g[0].modelo).toBe('Volvo 7905');
    expect(g[0].coches).toHaveLength(2);
  });
});
