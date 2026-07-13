/**
 * LA CACHÉ, CON EL CONTADOR PUESTO.
 *
 * Aquí no se demuestra que la caché "funciona": se CUENTA cuántas veces se toca
 * el origen. Un diseño de caché que no se puede contar es una promesa, y a
 * Avanza le hemos hecho una promesa POR ESCRITO en un repositorio público.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { Limitador } from '@/cache/limitador';
import { coger, LOCK_TTL_MS } from '@/cache/cerrojo';
import { TIMEOUT_MS, BACKOFF_MS, REINTENTOS } from '@/sources/avanza/transporte';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

/** Un origen que cuenta cuántas veces lo llaman. Es todo el instrumento. */
function origenContado(valor: unknown = { buses: 3 }, tardaMs = 20) {
  const estado = { llamadas: 0 };
  const fn = async () => {
    estado.llamadas++;
    await new Promise((r) => setTimeout(r, tardaMs));
    return valor;
  };
  return { estado, fn };
}

describe('⭐ 20 PETICIONES CONCURRENTES AL MISMO POSTE = 1 SOLA LLAMADA A AVANZA', () => {
  it('el vuelo único las funde en una', async () => {
    const cache = new CacheDosPisos({ dir });
    const origen = origenContado();

    // 20 usuarios abren la misma parada EN EL MISMO INSTANTE.
    const todas = await Promise.all(
      Array.from({ length: 20 }, () => cache.obtener('poste:744', origen.fn)),
    );

    expect(origen.estado.llamadas).toBe(1); // ⭐ UNA. Contada, no supuesta.
    expect(todas).toHaveLength(20);
    expect(todas.every((r) => r.tipo === 'fresco')).toBe(true);
    // Las 20 reciben el MISMO dato, con la misma marca de tiempo.
    const sellos = new Set(todas.map((r) => (r.tipo === 'fresco' ? r.observadoEn : 'x')));
    expect(sellos.size).toBe(1);

    expect(cache.metricas.llamadasAlOrigen).toBe(1);
    expect(cache.metricas.aciertosVueloUnico).toBe(19); // las otras 19, a esperar
  });

  it('⭐ CONTRAPRUEBA: SIN vuelo único, las mismas 20 peticiones = 20 llamadas', async () => {
    // Se desactiva la protección y se mira lo que pasa. Si sin ella el número no
    // cambiara, el test de arriba no probaría nada.
    //
    // Con el cubo de fichas ABIERTO, para ver el daño en crudo y aislado.
    const cubazo = new Limitador(join(dir, 'grande'), 1000, 1000);
    const cache = new CacheDosPisos({ dir, sinVueloUnico: true, sinDisco: true, limitador: cubazo });
    const origen = origenContado();

    await Promise.all(Array.from({ length: 20 }, () => cache.obtener('poste:744', origen.fn)));

    expect(origen.estado.llamadas).toBe(20); // ← VEINTE. En silencio. A Avanza.
  });

  it('⭐ Y EL TECHO ES LA SEGUNDA LÍNEA: sin vuelo único, corta el daño en 40', async () => {
    // ⚠️ EL INTERCAMBIO, DICHO EN VOZ ALTA.
    //
    // La capacidad era 8, y una ráfaga de 20 se cortaba en 8. Pero 8 fichas no
    // dan para el barrido de la línea N7 (31 peticiones), así que la capacidad
    // subió a 40 para que la función principal no saliera mutilada.
    //
    // ⇒ ESO DEBILITA LA PROTECCIÓN DE RÁFAGA. Ahora una avalancha de menos de 40
    //   peticiones NO la corta el cubo: la corta el vuelo único, y punto.
    //   El cubo es la red de abajo, no la de arriba. No lo tapo: se prueba dónde
    //   está de verdad.
    //
    // El techo SOSTENIDO —4 req/s, que es lo que le prometemos a Avanza— no ha
    // cambiado ni un ápice. Lo que ha cambiado es cuánto se tolera de golpe.
    const cache = new CacheDosPisos({ dir, sinVueloUnico: true, sinDisco: true });
    const origen = origenContado();

    await Promise.all(Array.from({ length: 60 }, () => cache.obtener('poste:744', origen.fn)));

    expect(origen.estado.llamadas).toBe(40); // ← el techo aguantó las otras 20
    expect(cache.metricas.denegadasPorTecho).toBe(20);
  });

  it('100 peticiones a 5 postes distintos = 5 llamadas, no 100', async () => {
    const cache = new CacheDosPisos({ dir });
    const origen = origenContado();
    await Promise.all(
      Array.from({ length: 100 }, (_, i) => cache.obtener(`poste:${700 + (i % 5)}`, origen.fn)),
    );
    expect(origen.estado.llamadas).toBe(5);
  });
});

describe('⭐ EL PISO DE DISCO: lo que coordina a los N workers de Hostinger', () => {
  it('dos procesos distintos (dos cachés, un disco) = 1 sola llamada', async () => {
    // Esto es lo más cerca que se puede estar de simular los workers de
    // Hostinger sin desplegar: dos instancias que NO comparten memoria, solo
    // el directorio. Es exactamente su situación.
    const origen = origenContado();
    const worker1 = new CacheDosPisos({ dir });
    const worker2 = new CacheDosPisos({ dir });

    await worker1.obtener('poste:744', origen.fn);
    await worker2.obtener('poste:744', origen.fn); // ← encuentra lo del otro, en disco

    expect(origen.estado.llamadas).toBe(1);
    expect(worker2.metricas.aciertosDisco).toBe(1);
    expect(worker2.metricas.llamadasAlOrigen).toBe(0);
  });

  it('⭐ CONTRAPRUEBA: SIN el piso de disco, 4 workers = 4 llamadas', async () => {
    // ESTA es la cuenta que asusta. Con 4 workers y sin disco, cada uno pide lo
    // suyo. Nadie se entera. La aplicación va perfecta. Y Avanza recibe el
    // cuádruple de tráfico del que creemos que le mandamos.
    const origen = origenContado();
    const workers = Array.from({ length: 4 }, () => new CacheDosPisos({ dir, sinDisco: true }));
    for (const w of workers) await w.obtener('poste:744', origen.fn);

    expect(origen.estado.llamadas).toBe(4); // ← ×4. Y con 8 workers, ×8.
  });

  it('el segundo worker ESPERA al primero en vez de duplicar la petición', async () => {
    const origen = origenContado({ buses: 1 }, 150);
    const w1 = new CacheDosPisos({ dir });
    const w2 = new CacheDosPisos({ dir });

    const [a, b] = await Promise.all([
      w1.obtener('poste:744', origen.fn),
      // Un pelín después, para que el primero ya tenga el cerrojo puesto.
      new Promise((r) => setTimeout(r, 30)).then(() => w2.obtener('poste:744', origen.fn)),
    ]);

    expect(origen.estado.llamadas).toBe(1); // ⭐ el segundo esperó, no duplicó
    expect(a.tipo).toBe('fresco');
    expect((b as { tipo: string }).tipo).toBe('fresco');
    expect(w2.metricas.esperasAOtroWorker).toBe(1);
  });
});

describe('⚠️ EL CERROJO HUÉRFANO: el fallo que congelaría la pantalla PARA SIEMPRE', () => {
  it('un cerrojo de un worker MUERTO se roba, y la clave vuelve a refrescarse', async () => {
    const reloj = { t: 1_000_000 };
    const ahora = () => reloj.t;
    const cache = new CacheDosPisos({ dir, ahora });
    const origen = origenContado();

    // Un worker cogió el cerrojo... y lo mataron. El fichero se queda ahí.
    const fichero = readdirSync(dir); // (aún vacío)
    expect(fichero).toEqual([]);
    await cache.obtener('poste:744', origen.fn); // crea el fichero de datos
    expect(origen.estado.llamadas).toBe(1);

    // Simulamos el cadáver: ponemos un cerrojo a mano y NO lo soltamos.
    const datos = readdirSync(dir).find((f) => f.startsWith('poste_744'))!;
    const rutaCerrojo = join(dir, `${datos}.lock`);
    writeFileSync(rutaCerrojo, JSON.stringify({ pid: 99999, desde: reloj.t }));

    // Pasa el TTL de la caché. El dato está viejo y hay que refrescarlo.
    reloj.t += 60_000;

    // ⚠️ SIN robo de cerrojo, esto NO llamaría al origen NUNCA MÁS y devolvería
    //    el dato de hace un minuto... y luego el de hace una hora... para
    //    siempre. Con la edad diciendo lo que toca, pero sin refrescarse jamás.
    const r = await cache.obtener('poste:744', origen.fn);

    expect(origen.estado.llamadas).toBe(2); // ⭐ se refrescó. El cerrojo se robó.
    expect(cache.metricas.cerrojosRobados).toBe(1);
    expect(r.tipo).toBe('fresco');
    expect(existsSync(rutaCerrojo)).toBe(false); // y se soltó al terminar
  });

  it('⭐ CONTRAPRUEBA: un cerrojo RECIENTE no se roba (o robaríamos a un vivo)', () => {
    const reloj = { t: 1_000_000 };
    const ruta = join(dir, 'x.lock');
    const primero = coger(ruta, () => reloj.t);
    expect(primero).not.toBeNull();

    // 1 segundo después, otro worker lo intenta. El dueño SIGUE TRABAJANDO.
    reloj.t += 1_000;
    expect(coger(ruta, () => reloj.t)).toBeNull(); // ← no se lo quita

    // Pasado el TTL, ya es un cadáver y sí se lo lleva.
    reloj.t += LOCK_TTL_MS;
    const robado = { valor: false };
    expect(coger(ruta, () => reloj.t, robado)).not.toBeNull();
    expect(robado.valor).toBe(true);

    primero!.soltar();
  });

  it('⚠️ EL TTL DEL CERROJO CUBRE EL PEOR CASO DEL TRANSPORTE', () => {
    // Este test no prueba código: prueba que dos NÚMEROS de ficheros distintos
    // siguen siendo compatibles. Si alguien sube el timeout a 10 s y no toca el
    // cerrojo, empezaríamos a robarle el cerrojo a workers vivos, y dos workers
    // pedirían lo mismo a la vez. Silenciosamente. Que se ponga rojo.
    const peorCaso = TIMEOUT_MS * (REINTENTOS + 1) + BACKOFF_MS * REINTENTOS;
    expect(peorCaso).toBe(8_300);
    expect(LOCK_TTL_MS).toBeGreaterThan(peorCaso);
  });
});

describe('⭐ LA EDAD: lo que hace honesta a una caché', () => {
  it('un dato de caché viene con su edad, en segundos', async () => {
    const reloj = { t: 1_000_000 };
    const cache = new CacheDosPisos({ dir, ahora: () => reloj.t });
    const origen = origenContado();

    const primera = await cache.obtener('poste:744', origen.fn);
    expect(primera.tipo).toBe('fresco');
    if (primera.tipo !== 'fallo') expect(primera.edadSegundos).toBe(0);

    reloj.t += 8_000; // pasan 8 segundos
    const segunda = await cache.obtener('poste:744', origen.fn);

    expect(origen.estado.llamadas).toBe(1); // sigue en caché, no se ha pedido
    if (segunda.tipo !== 'fallo') {
      expect(segunda.edadSegundos).toBe(8); // ⭐ "actualizado hace 8 s"
      expect(segunda.origen).toBe('memoria');
    }
  });

  it('pasado el TTL de 15 s, se vuelve a pedir', async () => {
    const reloj = { t: 1_000_000 };
    const cache = new CacheDosPisos({ dir, ahora: () => reloj.t });
    const origen = origenContado();

    await cache.obtener('poste:744', origen.fn);
    reloj.t += 14_999;
    await cache.obtener('poste:744', origen.fn);
    expect(origen.estado.llamadas).toBe(1); // el borde exacto: 14,999 s → cachea

    reloj.t += 2;
    await cache.obtener('poste:744', origen.fn);
    expect(origen.estado.llamadas).toBe(2); // 15,001 s → refresca
  });

  it('⭐ si Avanza se cae, se sirve lo viejo DICIENDO su edad — no se miente', async () => {
    const reloj = { t: 1_000_000 };
    const cache = new CacheDosPisos({ dir, ahora: () => reloj.t });
    let vivo = true;
    const origen = async () => {
      if (!vivo) throw new Error('ECONNREFUSED');
      return { buses: 3 };
    };

    await cache.obtener('poste:744', origen); // ok, guardado
    vivo = false;
    reloj.t += 47_000; // Avanza lleva caída 47 segundos

    const r = await cache.obtener('poste:744', origen);

    expect(r.tipo).toBe('rancio'); // ⭐ ni 'fresco' ni error
    if (r.tipo === 'rancio') {
      expect(r.edadSegundos).toBe(47); // "actualizado hace 47 s" — y es VERDAD
      expect(r.motivo).toMatch(/ECONNREFUSED/);
      expect(r.datos).toEqual({ buses: 3 });
    }
  });

  it('si Avanza se cae y NO tenemos nada de antes → fallo, no un vacío mentiroso', async () => {
    const cache = new CacheDosPisos({ dir });
    const r = await cache.obtener('poste:744', async () => { throw new Error('ECONNREFUSED'); });
    expect(r.tipo).toBe('fallo'); // ← NO `{tipo:'fresco', datos:[]}`
  });
});

describe('⭐ EL TECHO DURO: 4 peticiones/segundo, y no hay más', () => {
  it('la ráfaga 9 se deniega: el cubo tiene 8 fichas', () => {
    const reloj = { t: 0 };
    const lim = new Limitador(dir, 4, 8, () => reloj.t);
    const veredictos = Array.from({ length: 9 }, () => lim.pedirFicha());
    expect(veredictos.filter((v) => v.concedida)).toHaveLength(8);
    expect(veredictos[8].concedida).toBe(false); // ← la novena, fuera
  });

  it('las fichas se regeneran a 4/s, ni más ni menos', () => {
    const reloj = { t: 0 };
    const lim = new Limitador(dir, 4, 8, () => reloj.t);
    for (let i = 0; i < 8; i++) lim.pedirFicha(); // vacía el cubo
    expect(lim.pedirFicha().concedida).toBe(false);

    reloj.t += 250; // un cuarto de segundo → 1 ficha
    expect(lim.pedirFicha().concedida).toBe(true);
    expect(lim.pedirFicha().concedida).toBe(false); // y no hay una segunda

    reloj.t += 1000; // un segundo → 4 fichas
    expect(Array.from({ length: 4 }, () => lim.pedirFicha().concedida)).toEqual([true, true, true, true]);
    expect(lim.pedirFicha().concedida).toBe(false);
  });

  it('⭐ el techo es COMPARTIDO: dos workers gastan del MISMO cubo', () => {
    // Sin esto, el "techo de 4 req/s" sería en realidad 4·N con N desconocido.
    const reloj = { t: 0 };
    const w1 = new Limitador(dir, 4, 8, () => reloj.t);
    const w2 = new Limitador(dir, 4, 8, () => reloj.t);

    for (let i = 0; i < 8; i++) w1.pedirFicha(); // el worker 1 vacía el cubo
    expect(w2.pedirFicha().concedida).toBe(false); // ⭐ el worker 2 se queda sin
  });

  it('⭐ CONTRAPRUEBA: dos cubos en directorios distintos NO se coordinan', () => {
    const reloj = { t: 0 };
    const w1 = new Limitador(join(dir, 'a'), 4, 8, () => reloj.t);
    const w2 = new Limitador(join(dir, 'b'), 4, 8, () => reloj.t);
    for (let i = 0; i < 8; i++) w1.pedirFicha();
    expect(w2.pedirFicha().concedida).toBe(true); // ← 8 de más. El techo es falso.
  });

  it('⚠️ sin ficha NO se encola: se sirve lo viejo con su edad', async () => {
    const reloj = { t: 1_000_000 };
    const ahora = () => reloj.t;
    const lim = new Limitador(join(dir, 'techo'), 4, 8, ahora);
    const cache = new CacheDosPisos({ dir, ahora, limitador: lim });
    const origen = origenContado();

    await cache.obtener('poste:744', origen.fn); // gasta 1 ficha, guarda el dato
    reloj.t += 20_000; // el dato caduca...
    // ⚠️ ...y el cubo se ha RELLENADO en esos 20 s (4 fichas/s). Vaciarlo ANTES
    //    de avanzar el reloj no valdría: el test pasaría por el motivo
    //    equivocado y yo me lo habría creído. Se vacía AQUÍ, después.
    for (let i = 0; i < 8; i++) lim.pedirFicha();

    const r = await cache.obtener('poste:744', origen.fn);

    expect(origen.estado.llamadas).toBe(1); // ⭐ NO se llamó: no había ficha
    expect(r.tipo).toBe('rancio');
    if (r.tipo === 'rancio') {
      expect(r.edadSegundos).toBe(20); // y se dice: "hace 20 s"
      expect(r.motivo).toMatch(/techo/);
    }
    expect(cache.metricas.denegadasPorTecho).toBe(1);
  });
});

describe('⚠️ EL DISCO TAMBIÉN FALLA', () => {
  it('un fichero de caché corrupto se trata como ausente, no revienta', async () => {
    const cache = new CacheDosPisos({ dir });
    const origen = origenContado();
    await cache.obtener('poste:744', origen.fn);

    // Alguien (o un corte de luz a mitad de escritura) deja un JSON a medias.
    const f = readdirSync(dir).find((x) => x.startsWith('poste_744'))!;
    writeFileSync(join(dir, f), '{"datos":{"bu');

    const otro = new CacheDosPisos({ dir });
    const r = await otro.obtener('poste:744', origen.fn);
    expect(r.tipo).toBe('fresco'); // se rehízo. Sin excepción, sin dato falso.
    expect(origen.estado.llamadas).toBe(2);
  });

  it('la escritura es ATÓMICA: no queda ningún .tmp por ahí', async () => {
    const cache = new CacheDosPisos({ dir });
    await cache.obtener('poste:744', origenContado().fn);
    expect(readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('lo escrito en disco es lo que se lee: mismo dato, misma marca', async () => {
    const cache = new CacheDosPisos({ dir });
    await cache.obtener('poste:744', origenContado({ buses: 7 }).fn);
    const f = readdirSync(dir).find((x) => x.startsWith('poste_744'))!;
    const guardado = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { datos: unknown; observadoEnMs: number };
    expect(guardado.datos).toEqual({ buses: 7 });
    expect(Number.isFinite(guardado.observadoEnMs)).toBe(true);
  });
});

describe('⭐ CERO PETICIONES CUANDO NADIE MIRA', () => {
  it('crear la caché y no pedirle nada = cero llamadas al origen', async () => {
    const cache = new CacheDosPisos({ dir });
    const origen = origenContado();
    // No hay barredor de fondo. No hay setInterval. Se espera y no pasa nada.
    await new Promise((r) => setTimeout(r, 120));
    expect(origen.estado.llamadas).toBe(0);
    expect(cache.metricas.llamadasAlOrigen).toBe(0);
  });
});
