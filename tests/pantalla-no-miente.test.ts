/**
 * LO QUE LA PANTALLA NO PUEDE HACER. Vigilado por el CÓDIGO, no por la memoria.
 *
 * Los casos feos ya se miran con los ojos en `e2e/`. Aquí van las reglas que un
 * test visual NO PUEDE vigilar: las que hay que comprobar leyendo el código,
 * porque una pantalla concreta puede estar bien y la siguiente no.
 *
 * Son reglas que se olvidan. Un test, no.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function ficheros(dir: string, ext: string[]): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...ficheros(p, ext));
    else if (ext.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const UI = [...ficheros('src/app', ['.tsx', '.css']), ...ficheros('src/components', ['.tsx'])];

/** Quita comentarios. Un test que mira la prosa no comprueba el código: hace grep. */
const sinComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('⚠️ AQUÍ NO SE TRUNCA UN DATO. NUNCA.', () => {
  it('no existe `truncate` ni `text-overflow` en toda la interfaz', () => {
    // "Hu…" puede ser Hugo o Humberto. Un dato recortado es PEOR que un dato
    // ausente: parece un dato. La referencia usaba `truncate` en el destino del
    // autobús y en el nombre de la parada.
    const culpables: string[] = [];
    for (const f of UI) {
      // ⚠️ SE MIRA EL CÓDIGO, NO LOS COMENTARIOS. Este test se puso rojo por la
      //    palabra `truncate` que aparece DENTRO del comentario que la PROHÍBE.
      //    Un test que no distingue el código de la prosa que lo explica no
      //    comprueba el código: hace `grep`. (Segunda vez que caigo en esto en el
      //    mismo fichero. Queda escrito para que no haya una tercera.)
      const c = sinComentarios(readFileSync(f, 'utf8'));
      // Se permite en `globals.css`, donde está la REGLA que lo prohíbe.
      if (f.endsWith('globals.css')) continue;
      if (/\btruncate\b/.test(c)) culpables.push(`${f} → truncate`);
      if (/text-ellipsis|text-overflow/.test(c)) culpables.push(`${f} → text-overflow`);
      if (/\bline-clamp-/.test(c)) culpables.push(`${f} → line-clamp`);
    }
    expect(culpables, 'si no cabe, BAJA DE LÍNEA').toEqual([]);
  });
});

describe('⏳ LA EDAD NO SE CUENTA CON EL RELOJ DEL MÓVIL', () => {
  it('`LlegadasVivas` usa `performance.now()`, NO `Date.now()`', () => {
    // ⚠️ SE MIRA EL CÓDIGO, NO LOS COMENTARIOS.
    //    La primera versión de este test se puso roja... por el `Date.now()` que
    //    aparece DENTRO del comentario que explica por qué NO se usa `Date.now()`.
    //    Un test que no distingue el código de la prosa que lo explica no está
    //    comprobando el código: está haciendo `grep`.
    const c = sinComentarios(readFileSync('src/components/LlegadasVivas.tsx', 'utf8'));

    // ⚠️ POR QUÉ IMPORTA, Y NO ES UNA FILIGRANA:
    //
    // `Date.now() - Date.parse(observadoEn)` mezcla el reloj del SERVIDOR (que
    // fechó el dato) con el del CLIENTE (el móvil del usuario). Si el móvil va
    // tres minutos adelantado —cosa comunísima—, la pantalla diría "hace 3 min"
    // sobre un dato recién traído. Si va atrasado, "hace -2 s". Y el último
    // domingo de octubre, con el cambio de hora, UNA HORA ENTERA.
    //
    // `performance.now()` es MONÓTONO. No sabe de husos, ni de cambios de hora,
    // ni de saltos de NTP. Es el único reloj que no puede mentir aquí.
    expect(c).toMatch(/performance\.now\(\)/);
    expect(c, 'ni un solo Date.now() en el cálculo de la edad').not.toMatch(/Date\.now\(\)/);
    expect(c, 'ni un Date.parse: eso es reloj de pared').not.toMatch(/Date\.parse/);
  });

  it('el contador NO se reinicia cuando el refresco falla', () => {
    const c = readFileSync('src/components/LlegadasVivas.tsx', 'utf8');
    // El `catch` del refresco NO puede tocar `llegoEn`: si lo tocara, la edad se
    // reiniciaría a cero en cada fallo y el dato viejo parecería recién traído.
    // Ése es, exactamente, el pecado de la referencia.
    const catchBloque = /catch \(e\) \{([\s\S]*?)\n    \}/.exec(c)?.[1] ?? '';
    expect(catchBloque, 'hay un catch de refresco').not.toBe('');
    expect(catchBloque, '⛔ el catch resetea el reloj: la edad volvería a cero').not.toMatch(/llegoEn\.current\s*=/);
    expect(catchBloque, 'el catch tiene que producir el estado de fallo').toMatch(/refresco-fallido/);
  });
});

describe('⛔ EL ESTADO NO VA EN EL TONO', () => {
  it('los colores semánticos NO se usan como fondo de ningún chip de línea', () => {
    // El color de línea viene del GTFS y va SOLO en `chip-linea`. Los colores
    // semánticos (--color-alerta, --color-aviso) NO pueden aparecer como fondo
    // de nada que represente una línea: la línea 31 es #D1221D, el mismo rojo
    // que "alerta". Si compartieran canal, la 31 estaría siempre en alerta.
    const c = readFileSync('src/components/LlegadasVivas.tsx', 'utf8');
    const chip = /data-papel="chip-linea"[\s\S]{0,200}/.exec(c)?.[0] ?? '';
    expect(chip).not.toMatch(/color-alerta|color-aviso/);
  });

  it('cada señal de estado tiene AL MENOS una marca que sobrevive al gris', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    // No basta con que exista la clase: tiene que llevar FORMA, no solo color.
    for (const [clase, forma] of [
      ['.es-inminente', /outline/],
      ['.es-rancio', /border-style:\s*dashed|repeating-linear-gradient/],
      ['.es-sin-verificar', /dashed/],
      ['.es-sin-datos', /dotted/],
    ] as [string, RegExp][]) {
      const bloque = new RegExp(`\\${clase}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? '';
      expect(bloque, `${clase} tiene que existir`).not.toBe('');
      expect(bloque, `${clase} necesita una señal de FORMA, no solo color`).toMatch(forma);
    }
  });
});

describe('⚠️ EL MODO DEMO NO PUEDE COLARSE EN PRODUCCIÓN', () => {
  it('`?fingir=` se ignora si `ZETABUS_DEMO` no vale exactamente "1"', async () => {
    const anterior = process.env.ZETABUS_DEMO;
    const { fingimientoDe, demoEncendido } = await import('@/engine/fingir');

    delete process.env.ZETABUS_DEMO;
    expect(demoEncendido()).toBe(false);
    expect(fingimientoDe({ fingir: 'caido' })).toBeNull(); // ⭐ se ignora

    process.env.ZETABUS_DEMO = 'true'; // ni "true" vale: TIENE que ser "1"
    expect(fingimientoDe({ fingir: 'caido' })).toBeNull();

    process.env.ZETABUS_DEMO = '1';
    expect(fingimientoDe({ fingir: 'caido' })).toBe('caido');
    expect(fingimientoDe({ fingir: 'inventado' })).toBeNull(); // solo los conocidos

    if (anterior === undefined) delete process.env.ZETABUS_DEMO;
    else process.env.ZETABUS_DEMO = anterior;
  });

  it('si el modo demo está encendido, el layout GRITA', () => {
    const c = readFileSync('src/app/layout.tsx', 'utf8');
    expect(c).toMatch(/demoEncendido\(\)/);
    expect(c).toMatch(/FINGIDOS/);
  });

  it('⚠️ y cada fingimiento tiene su PROPIA caché', () => {
    // Si el modo demo compartiera la caché real, `?fingir=caido` devolvería el
    // dato BUENO de hace 8 segundos y el fingimiento no fingiría nada. Yo habría
    // abierto la página, habría visto autobuses, y habría dado por bueno que "el
    // caso caído se ve bien" — cuando estaba viendo el caso normal.
    const c = readFileSync('src/engine/motor.ts', 'utf8');
    expect(c).toMatch(/cachesFingidas/);
    expect(c).toMatch(/_demo/);
  });
});

describe('⚠️ EL CONTRATO DE DATOS SE DICE EN LA PANTALLA', () => {
  it('la lista de llegadas dice "DETECTADOS", no "todos"', () => {
    const c = readFileSync('src/components/LlegadasVivas.tsx', 'utf8');
    expect(c).toMatch(/DETECTADOS/);
    expect(c).toMatch(/no todos/);
  });

  it('el hallazgo dice "Hemos encontrado", nunca "hay" ni "todos"', () => {
    // ⚠️ CAMBIÓ EN LA TANDA 5A. El recuento agregado ("los 11 son articulados")
    //    se retiró: no le servía a nadie. Lo que sirve es el dato BRUTO —cuántos
    //    hay y CUÁLES SON— y el usuario ve con sus ojos cuáles son articulados.
    //    La geometría se explica sola; el texto hay que creérselo.
    const c = readFileSync('src/components/BuscarBuses.tsx', 'utf8');
    expect(c).toMatch(/Hemos encontrado/);
    expect(sinComentarios(c)).not.toMatch(/todos los autobuses/i);
  });

  it('⭐ un autobús SIN FICHA sigue diciendo SIN DATOS, nunca un defecto', () => {
    // Esto NO cambia con la Tanda 5A: la ficha es la misma, y su regla también.
    const c = readFileSync('src/components/FichaVehiculo.tsx', 'utf8');
    expect(c).toMatch(/SIN DATOS/);
    expect(c).toMatch(/No inventamos su modelo/);
    expect(c).toMatch(/SIN VERIFICAR/);
  });

  it('los cinco estados tienen CINCO mensajes distintos', () => {
    const c = readFileSync('src/components/LlegadasVivas.tsx', 'utf8');
    // El proyecto viejo tenía UNO —"no hay llegadas"— y era MENTIRA en cuatro
    // de los cinco casos.
    expect(c).toMatch(/Ese poste no existe/);
    expect(c).toMatch(/Avanza no responde/);
    expect(c).toMatch(/No entendemos lo que ha contestado/);
    expect(c).toMatch(/no viene ningún autobús/);
    expect(c).toMatch(/NO significa que no haya autobuses/);
  });
});

describe('⛔ EL BARRIDO NO SE DISPARA SOLO. NUNCA.', () => {
  /**
   * ⚠️ ANTONIO: "comprueba que NO QUEDA NINGÚN OTRO SITIO donde se dispare solo.
   *              CUÉNTALO, no lo supongas."
   *
   * Lo conté. Y HABÍA OTRO: `/api/linea/[linea]/route.ts`, un Route Handler de la
   * Tanda 3 que barría la línea entera —y encima calculaba los desvíos— con un
   * simple GET. No lo llamaba nadie de la interfaz, pero era una URL PÚBLICA: el
   * día que un rastreador la encontrara, disparaba 18 peticiones a Avanza sin que
   * nadie hubiera pulsado nada.
   *
   * Se borró. Y este test existe para que no vuelva a colarse otro.
   */
  const rutas = ficheros('src/app', ['.tsx', '.ts']);

  it('barrerLinea SOLO se llama desde /api/barrido, que necesita un botón', () => {
    const culpables = rutas.filter(
      (f) => /barrerLinea/.test(sinComentarios(readFileSync(f, 'utf8'))) && !f.includes('barrido'),
    );
    expect(culpables, 'un barrido que se dispara solo no se puede defender').toEqual([]);
  });

  it('NINGUNA página (page.tsx) toca Avanza al renderizarse... salvo la de parada', () => {
    // La parada SÍ consulta al abrirse, y es correcto: es UNA petición, y es
    // exactamente el dato por el que el usuario ha abierto esa pantalla.
    // La LÍNEA, no: son 18, y quien solo quiere ver el recorrido no las pide.
    const paginas = rutas.filter((f) => f.endsWith('page.tsx'));
    const queBarren = paginas.filter((f) => {
      const c = sinComentarios(readFileSync(f, 'utf8'));
      return /barrerLinea|leerPoste/.test(c);
    });
    expect(queBarren).toEqual([]);

    const linea = readFileSync('src/app/linea/[linea]/page.tsx', 'utf8');
    expect(sinComentarios(linea), 'la vista de línea NO puede barrer al abrirse').not.toMatch(
      /barrerLinea|motor\(/,
    );
    expect(linea, 'tiene que haber un botón').toMatch(/BuscarBuses/);
  });

  it('⭐ el titular NO afirma más de lo que sabe', () => {
    const c = readFileSync('src/components/BuscarBuses.tsx', 'utf8');
    expect(c, '"Hemos encontrado N" — es un hallazgo, no un censo').toMatch(/Hemos encontrado/);
    // ⛔ Lo que NO puede decir, pase lo que pase:
    const codigo = sinComentarios(c);
    expect(codigo, 'nunca "todos los autobuses"').not.toMatch(/todos los autobuses/i);
    expect(codigo, 'nunca "hay N autobuses" a secas').not.toMatch(/Hay \$\{n\}/);
    // Y la salvedad que hace que el titular sea verdad:
    const plano = c.replace(/\s+/g, ' ');
    expect(plano).toMatch(/Puede haber alguno más que no aparezca/);
    expect(c).toMatch(/sin respuesta/);

    // ⭐ Y LA SALVEDAD TIENE QUE DECIR POR QUÉ, porque desde que el barrido es
    //    completo el "puede haber alguno más" suena a excusa. No lo es: Avanza
    //    solo anuncia los DOS SIGUIENTES de cada línea y sentido, así que un
    //    tercero muy pegado a otros dos no lo publica NINGÚN poste. Ni
    //    preguntándolos todos. Ése es el motivo, y va escrito en la pantalla.
    expect(plano, 'la salvedad tiene que explicar la regla de los dos').toMatch(
      /dos siguientes de cada línea y sentido/,
    );
  });

  it('la barra de progreso mide POSTES REALES, no una animación', () => {
    const c = sinComentarios(readFileSync('src/components/BuscarBuses.tsx', 'utf8'));
    // El ancho sale del contador de postes hechos, no de un keyframes.
    expect(c).toMatch(/hechos \/ total/);
    expect(c).toMatch(/aria-valuenow=\{hechos\}/);
    expect(c, 'una barra animada que no mide nada es un instrumento mentiroso').not.toMatch(
      /animate-pulse|animate-\[/,
    );
    // ⭐ Lo que SE VE es el %. Lo que se MIDE siguen siendo postes. Quitar el
    //    rótulo de fontanería ("12 de 18 postes") no puede quitar el instrumento.
    expect(c, 'la barra enseña el porcentaje').toMatch(/\{pct\} %/);
    expect(c, 'y ya no enseña el recuento de postes, que no le dice nada a nadie')
      .not.toMatch(/de \{total\} postes/);
  });
});

describe('⛔ EL BARRIDO NO PUEDE VOLVER A DISPARARLO TODO DE GOLPE', () => {
  it('⭐ el motor NO hace Promise.all sobre los postes: se marca un ritmo', () => {
    const c = sinComentarios(readFileSync('src/engine/barrido.ts', 'utf8'));
    // El `Promise.all` de los postes era la ráfaga: 67 conexiones a la vez contra
    // un servidor ajeno. Ahora las peticiones van por `aRitmo`, que reserva un
    // hueco por petición. El `Promise.all` que queda es el de los OBREROS (4), y
    // ése es justo el que acota las simultáneas.
    expect(c).toMatch(/aRitmo\(/);
    expect(c).toMatch(/POR_SEGUNDO\s*=\s*4/);
    expect(c, 'los postes NO se mapean a un Promise.all').not.toMatch(
      /Promise\.all\(\s*aConsultar/,
    );
  });

  it('⚠️ el ritmo SOLO se salta cuando el transporte es falso (modo demo)', () => {
    const c = sinComentarios(readFileSync('src/app/api/barrido/[linea]/route.ts', 'utf8'));
    // Saltarse el ritmo es defendible cuando no sale ni un byte hacia Avanza. No
    // lo es en ningún otro caso, y no puede haber ninguna otra puerta.
    const saltos = c.match(/porSegundo/g) ?? [];
    expect(saltos).toHaveLength(1);
    expect(c, 'el salto va condicionado a `fingir`').toMatch(
      /fingir\s*\?\s*\{\s*porSegundo:\s*Infinity\s*\}/,
    );
  });
});
