/**
 * ⭐⭐ EL CONTADOR Y LA CACHÉ SON ÚNICOS **POR PROCESO**, NO POR MÓDULO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA CICATRIZ: `/api/diag` contestaba `avanza.peticiones: 0` **mientras
 *  ZetaBus estaba pidiendo datos a Avanza**, y lo hizo durante meses.
 *
 *  ⚠️ NADIE LO VIO, Y ÉSA ES LA LECCIÓN: **cero es una respuesta plausible.**
 *     Significa «no ha entrado nadie». Un instrumento que devuelve un número
 *     tranquilizador cuando no mide nada es indistinguible de uno que funciona.
 *     La única forma de separarlos es PROVOCAR el caso y exigir que el número
 *     SUBA — que es literalmente lo que hace este fichero.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CÓMO SE REPRODUCE UN FALLO DE «DOS GRAFOS DE MÓDULOS» DENTRO DE UN TEST.
 *
 * En producción la causa era que las páginas y los route handlers se compilan a
 * grafos distintos, así que un `let` a nivel de módulo se instancia DOS VECES en
 * el mismo proceso. Eso no se puede montar dentro de Vitest… pero **no hace falta
 * montarlo: hace falta reproducir su FORMA.**
 *
 *     `vi.resetModules()` + dos `import()` = dos ejemplares del mismo módulo,
 *     vivos a la vez, en un solo proceso.
 *
 * Que es exactamente la situación. Si el estado colgara del módulo, los dos
 * ejemplares tendrían cada uno el suyo y estos tests se pondrían rojos. Si cuelga
 * del proceso, se ven el uno al otro.
 *
 * ⚠️ Lo que este test **NO** puede probar es que Next compile de verdad en dos
 *    grafos: eso solo se ve en un `next build`, y está medido a mano en
 *    `docs/auditoria/12-perimetro-y-publicacion.md` § B-F1. Aquí se vigila la
 *    PROPIEDAD que hace que dé igual cuántos grafos haya.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { unicoPorProceso, vaciarElTarroDelProceso } from '@/core/proceso';

beforeEach(() => {
  vaciarElTarroDelProceso();
  vi.resetModules();
});

describe('⭐ `unicoPorProceso`, la propiedad que lo sostiene todo', () => {
  it('la misma clave devuelve EL MISMO objeto, no uno igual', () => {
    const a = unicoPorProceso('prueba.caja', () => ({ n: 0 }));
    const b = unicoPorProceso('prueba.caja', () => ({ n: 999 }));
    expect(b).toBe(a); // identidad, no igualdad
    a.n = 42;
    expect(b.n, 'escribir en uno se ve en el otro').toBe(42);
  });

  it('⭐ y `crear` NO se ejecuta la segunda vez — quien llega primero, manda', () => {
    const crear = vi.fn(() => ({ n: 1 }));
    unicoPorProceso('prueba.una-vez', crear);
    unicoPorProceso('prueba.una-vez', crear);
    unicoPorProceso('prueba.una-vez', crear);
    expect(crear).toHaveBeenCalledTimes(1);
  });

  it('claves distintas NO se pisan', () => {
    const a = unicoPorProceso('prueba.a', () => ({ q: 'a' }));
    const b = unicoPorProceso('prueba.b', () => ({ q: 'b' }));
    expect(a).not.toBe(b);
    expect(b.q).toBe('b');
  });

  it('sobrevive a un valor `undefined` sin volver a crearlo', () => {
    const crear = vi.fn(() => undefined);
    unicoPorProceso('prueba.vacio', crear);
    unicoPorProceso('prueba.vacio', crear);
    // ⚠️ Con `??=` en vez de `in`, esto llamaría a `crear` cada vez y el estado
    //    se reconstruiría en silencio. Es el mismo fallo con otra cara.
    expect(crear).toHaveBeenCalledTimes(1);
  });
});

describe('⭐⭐ DOS EJEMPLARES DEL MÓDULO, UN SOLO CONTADOR', () => {
  it('el `contador` de Avanza es el mismo objeto en los dos', async () => {
    const uno = await import('@/sources/avanza/transporte');
    vi.resetModules(); // ← a partir de aquí, `import` devuelve un módulo NUEVO
    const otro = await import('@/sources/avanza/transporte');

    expect(otro, 'no se han creado dos ejemplares: el test no prueba nada')
      .not.toBe(uno);
    expect(otro.contador, 'DOS contadores en un proceso: el fallo de B-F1')
      .toBe(uno.contador);
  });

  it('⭐ y lo que se cuenta por uno SE VE por el otro — el número SUBE', async () => {
    const uno = await import('@/sources/avanza/transporte');
    vi.resetModules();
    const otro = await import('@/sources/avanza/transporte');

    const antes = otro.contador.cuenta.peticiones;
    // El «render de la página» registra su petición…
    uno.contador.registrar({ peticiones: 1, msAcumulados: 120 });
    uno.contador.registrar({ peticiones: 1, msAcumulados: 80 });
    // …y `/api/diag`, que vive en el otro grafo, tiene que verlas.
    expect(otro.contador.cuenta.peticiones, 'el endoscopio no ve lo que pidió la página')
      .toBe(antes + 2);
    expect(otro.contador.cuenta.msAcumulados).toBe(200);
  });

  it('la CACHÉ del motor también es una sola — si no, el vuelo único no cruza', async () => {
    const uno = await import('@/engine/motor');
    vi.resetModules();
    const otro = await import('@/engine/motor');

    expect(otro).not.toBe(uno);
    expect(otro.motor().cache, 'dos cachés en un proceso: cada grafo pide por su cuenta')
      .toBe(uno.motor().cache);
    expect(otro.motorHorario().cache).toBe(uno.motorHorario().cache);
  });

  it('y las cachés FINGIDAS no se duplican por grafo', async () => {
    const uno = await import('@/engine/motor');
    vi.resetModules();
    const otro = await import('@/engine/motor');
    const t = async () => ({ status: 200, texto: '' });

    // ⚠️ El mismo fingimiento tiene que dar la MISMA caché aunque lo pida el otro
    //    grafo: si no, `?fingir=caido` fingiría dos veces contra dos estados.
    expect(otro.motor(t, 'caido').cache).toBe(uno.motor(t, 'caido').cache);
    expect(otro.motor(t, 'desviada').cache).not.toBe(uno.motor(t, 'caido').cache);
  });
});
