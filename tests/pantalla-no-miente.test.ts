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

  it('el recuento dice "Detectamos", nunca "circulan todos"', () => {
    const c = readFileSync('src/app/linea/[linea]/page.tsx', 'utf8');
    expect(c).toMatch(/Detectamos \{total\}/);
    expect(c).not.toMatch(/todos los autobuses de la línea/i);
  });

  it('⭐ el recuento NO afirma sobre los autobuses SIN FICHA', () => {
    // Si de 11 detectados conozco la ficha de 9, NO puedo decir "los 11 son
    // articulados": estaría afirmando sobre 2 vehículos de los que no sé nada.
    // El denominador son LOS QUE TIENEN FICHA, y los que no, se dicen.
    const c = readFileSync('src/app/linea/[linea]/page.tsx', 'utf8');
    expect(c).toMatch(/conFicha/);
    expect(c).toMatch(/de los que conocemos la ficha/);
    expect(c).toMatch(/NO TENEMOS DATOS/);
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
