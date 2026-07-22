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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Fingiendo } from '@/components/Fingiendo';

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
    /**
     * ⚠️ ESTE TEST SE PUSO ROJO AL METER EL ROJO DEL "YA LLEGA", Y HAY QUE MIRARLO
     * DESPACIO, PORQUE AQUÍ ES DONDE SE ABLANDA UN TEST SIN DARSE CUENTA.
     *
     * Exigía literalmente `outline` en `.es-inminente`. Y el anillo se ha ido: era
     * mi error de la Tanda 6 (quitar el color por miedo y poner un aro que, dicho
     * por Antonio mirando la pantalla, "parece un error de renderizado").
     *
     * ⭐ LA INTENCIÓN DEL TEST ERA BUENA Y NO SE TOCA: *"al menos una señal que
     *   sobreviva al gris"*. Lo que estaba mal era atarla a UNA FORMA CONCRETA.
     *
     * Lo que sobrevive al gris NO es solo el borde: es **cualquier cosa que no sea
     * un tono**. El latido (`animation`) es una de ellas —una opacidad que pulsa se
     * ve igual en blanco y negro—, y la palabra "YA LLEGA" es otra (esa la
     * comprueba `e2e/color.spec.ts`, en el navegador, sobre la página ya en gris).
     *
     * ⛔ Lo que NO se acepta, y por eso el regex sigue siendo estricto: que la única
     *    propiedad del bloque sea un `color`. Si alguien borra el `animation`, este
     *    test vuelve a ponerse rojo. **Se ha cambiado la forma exigida, no el listón.**
     */
    for (const [clase, forma] of [
      ['.es-inminente', /outline|animation/],
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

  /**
   * ⭐⭐ EL CONTRATO NUEVO, Y ES EL OPUESTO DEL QUE HABÍA AQUÍ.
   *
   * ⛔ ANTES SE EXIGÍA: *"si el modo demo está encendido, el layout GRITA"* —
   *    `expect(layout).toMatch(/demoEncendido/)` y `/FINGIDOS/`.
   *
   * Y ESE TEST BLINDABA UNA MENTIRA. `ZETABUS_DEMO=1` **no finge nada**: lo único
   * que hace es desbloquear la lectura de `?fingir=`. Sin ese parámetro en la URL
   * los datos son REALES —comprobado con dos servidores del mismo build, mismo
   * poste, mismo instante: llegadas idénticas byte a byte— y la banda seguía
   * diciendo "los datos pueden ser FINGIDOS".
   *
   * Un aviso que avisa de algo que no está pasando no es prudencia: **entrena a
   * desconfiar de datos buenos**, y el que grita siempre deja de ser oído.
   *
   * ⇒ Ahora se exige lo contrario: que el layout NO sepa nada del modo demo. La
   *   marca la pone cada página, con su fingimiento concreto.
   */
  it('⛔ el layout NO puede volver a avisar por el FLAG: no es él quien lo sabe', () => {
    const c = readFileSync('src/app/layout.tsx', 'utf8');
    // ⚠️ Se mira el CÓDIGO, no los comentarios: la explicación de por qué se quitó
    //    la banda sí la menciona, y tiene que poder mencionarla.
    const codigo = c.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '');
    expect(codigo, 'el layout ha vuelto a mirar el flag').not.toMatch(/demoEncendido/);
    expect(codigo, 'ha vuelto la banda genérica').not.toMatch(/FINGIDOS|banda-demo/);
  });

  it('⭐ la marca depende del FINGIMIENTO, no del flag: sin fingir NO se pinta nada', () => {
    // Es toda la corrección, y por eso es lo primero que se prueba. Ni un hueco,
    // ni un borde: cadena vacía.
    expect(renderToStaticMarkup(createElement(Fingiendo, { que: null }))).toBe('');
  });

  it('⭐ y cuando SÍ se finge, dice QUÉ se finge — no un "puede ser mentira" genérico', () => {
    const h = renderToStaticMarkup(createElement(Fingiendo, { que: 'caido' }));
    expect(h, 'tiene que nombrar el fingimiento CONCRETO').toContain('caido');
    expect(h, 'y marcarse para poder encontrarla').toContain('data-papel="fingiendo"');
    expect(h, 'y decir que el dato es inventado').toMatch(/inventados/);
    // ⚠️ NO SOLO EL TONO (regla de la casa): símbolo + palabra + forma.
    expect(h, 'falta el símbolo').toContain('⚠');
    expect(h, 'falta la palabra').toMatch(/Fingiendo/i);
    expect(h, 'falta la FORMA: en escala de grises el color no existe').toMatch(/border-2/);
  });

  it('⛔ CONTRAPRUEBA · una marca que se pintara SIEMPRE sí pasaría por el aro', () => {
    // Se reconstruye la regresión exacta que venimos a impedir: un aviso que sale
    // pase lo que pase, como hacía la banda. Si el guardián de arriba no
    // distinguiera `null` de un fingimiento, esto se colaría sin que nadie lo viera.
    const Mentirosa = ({ que }: { que: string | null }) =>
      createElement('p', { 'data-papel': 'fingiendo' }, `⚠ FINGIENDO «${que ?? 'demo'}»`);

    expect(
      renderToStaticMarkup(createElement(Mentirosa, { que: null })),
      'la versión mentirosa SÍ pinta con null — por eso la prueba de arriba mide algo',
    ).not.toBe('');
    expect(renderToStaticMarkup(createElement(Fingiendo, { que: null })), 'y la buena no').toBe('');
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
  // ⛔ AQUÍ EXIGÍA QUE LA PARADA DIJERA "DETECTADOS, no todos". Se retiró CON la frase:
  //    el guardián no cazaba un bug, blindaba una DECISIÓN DE PRODUCTO (poner ese caveat
  //    en la parada) que dejamos de compartir —la frase es verdadera pero inútil ahí—. Un
  //    guardián de honestidad que exige un TEXTO concreto convierte una decisión revisable
  //    en una invariante: cuando el criterio cambia, hay que retirar el test CON el texto,
  //    no dejarlo poniéndose rojo para exigir la decisión de ayer. Es L25. (El titular del
  //    barrido, "Hemos encontrado N" y no "hay N", se fue con el barrido a
  //    `parked/barrido-de-linea/`; su regla vive en `docs/BARRIDO_APARCADO.md` §2.)

  it('⭐ un autobús SIN FICHA sigue diciendo "sin datos", nunca un defecto', () => {
    // La ficha cambió de forma (ahora son chips, como los suyos) pero la REGLA es
    // la misma y no se negocia: si no sabemos el modelo, se dice. Nunca "Estándar,
    // 12 m" porque sea lo más común — eso es inventarse el dato justo donde no lo
    // tenemos, y hacerlo con toda la confianza del mundo.
    const c = sinComentarios(readFileSync('src/components/FichaVehiculo.tsx', 'utf8'));
    expect(c).toMatch(/Sin datos de este autobús/i);
    // Y el valor por defecto sigue prohibido en el motor, que es donde importa.
    const t = sinComentarios(readFileSync('src/engine/topologia.ts', 'utf8'));
    expect(t, 'perfilDe devuelve null, no un perfil inventado').toMatch(/A\.flota\[coche\] \?\? null/);
  });

  it('⭐ A5 · la PROCEDENCIA ya no ocupa una línea en cada tarjeta (era la NORMA)', () => {
    // "✓ Dato oficial (Anexo 5 del pliego municipal)" salía en 350 de 403 fichas.
    // El 87%. Eso no es una excepción: es la norma. Y al que espera el autobús le
    // da igual de qué documento sale el dato.
    const c = sinComentarios(readFileSync('src/components/FichaVehiculo.tsx', 'utf8'));
    expect(c, 'la procedencia se fue a /sobre-los-datos').not.toMatch(/Dato oficial|Anexo 5/);

    // ⚠️ Pero NO SE HA PERDIDO. Existe la página, y dice de dónde sale cada cosa.
    const sobre = readFileSync('src/app/sobre-los-datos/page.tsx', 'utf8');
    expect(sobre).toMatch(/Anexo 5/);
    expect(sobre).toMatch(/0034140-25/);
    expect(sobre, 'y lo que NO sabemos, también').toMatch(/NO detectamos supresiones/);
  });

  it('⭐⭐ FUERA la procedencia de la vista de parada: ni marca, ni borde, ni enlace', () => {
    // Antonio: «al usuario le importa tres pimientos de dónde saques el dato». La
    // vista de parada es operativa; la procedencia se fue ENTERA a /sobre-los-datos.
    const c = sinComentarios(readFileSync('src/components/FichaVehiculo.tsx', 'utf8'));
    // Nada de alarmas ámbar (nunca las hubo aquí) y, ahora, nada de las TRES señales:
    expect(c, 'nada de alarmas ámbar en cada tarjeta').not.toMatch(/color-aviso|SIN VERIFICAR/);
    expect(c, 'la marca †*? ya no se pinta en la ficha').not.toMatch(/marca-confianza/);
    // El borde discontinuo POR CONFIANZA se fue (los chips clase/combustible ya no lo
    // reciben). El único `discontinuo` que queda es el del chip "Sin datos de este
    // autobús", que NO es procedencia: es "no tenemos ficha", y se explica solo.
    expect(c, 'los chips de confianza ya no van discontinuos').not.toMatch(/discontinuo=\{!oficial\}/);

    const llegadas = sinComentarios(readFileSync('src/components/LlegadasVivas.tsx', 'utf8'));
    expect(llegadas, 'fuera el enlace "De dónde sale cada dato"').not.toMatch(/DeDondeSaleCadaDato/);
    expect(llegadas, 'fuera la leyenda al pie').not.toMatch(/NotaSinVerificar/);
  });

  it('⭐ pero la procedencia NO desaparece: sigue entera en /sobre-los-datos', () => {
    // No puede irse de los DOS sitios. La tabla de los cuatro niveles, con recuentos
    // derivados y el mapa MARCAS, se queda en /sobre-los-datos.
    const sobre = sinComentarios(readFileSync('src/app/sobre-los-datos/page.tsx', 'utf8'));
    expect(sobre, 'lee el mapa MARCAS').toMatch(/import \{ MARCAS \}/);
    expect(sobre, 'la tabla cuenta por nivel').toMatch(/data-papel="nivel-procedencia"/);
    expect(sobre, 'busesmadrid, con su matiz').toMatch(/busesmadrid\.es/);
    expect(sobre, 'no oficial, dicho').toMatch(/no es oficial/i);

    // Y el mapa MARCAS sigue vivo en el módulo (lo leen sobre-los-datos y sistema-visual).
    const ficha = readFileSync('src/components/FichaVehiculo.tsx', 'utf8');
    expect(ficha).toMatch(/export const MARCAS/);
    for (const simbolo of ["'\\*'", "'†'", "'\\?'"]) {
      expect(ficha, `MARCAS conserva ${simbolo}`).toMatch(new RegExp(`simbolo: ${simbolo}`));
    }
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

describe('⛔⛔ EL BARRIDO ESTÁ APARCADO, Y NO HAY NINGÚN CAMINO QUE LLEGUE A ÉL', () => {
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ⚠️ ESTE TEST NO EXISTE PARA COMPROBAR QUE EL BOTÓN NO ESTÁ.
   *
   * Existe porque YA PASÓ UNA VEZ: en la Tanda 5A conté los sitios que disparaban
   * el barrido y apareció `/api/linea/[linea]/route.ts`, un Route Handler que
   * barría la línea entera —y encima calculaba los desvíos— con un simple GET.
   * No lo llamaba nadie de la interfaz. Pero era una URL PÚBLICA E INDEXABLE: el
   * día que un rastreador la encontrara, 18 peticiones a Avanza sin que nadie
   * hubiera pulsado nada.
   *
   * Quitar el botón NO ES aparcar el barrido. Aparcarlo es que NO QUEDE NINGÚN
   * CAMINO DE EJECUCIÓN — ni ruta, ni handler, ni import vivo.
   *
   * Y eso se CUENTA, no se supone.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  const vivos = [...ficheros('src', ['.ts', '.tsx']), ...ficheros('scripts', ['.ts'])];

  it('⭐ NADA en src/ ni en scripts/ importa el barrido aparcado', () => {
    const culpables = vivos.filter((f) => {
      const c = sinComentarios(readFileSync(f, 'utf8'));
      return /barrerLinea|agruparFlota|BuscarBuses|parked\//.test(c);
    });
    expect(culpables, 'el código aparcado NO puede tener un import vivo').toEqual([]);
  });

  it('⭐ no existe NINGUNA ruta de barrido bajo src/app', () => {
    // Next enruta lo que hay bajo `src/app`. Un `route.ts` ahí es una URL pública.
    // El barrido vive en `parked/`, que Next no mira: no es una ruta, es un fichero.
    expect(existsSync('src/app/api/barrido'), 'no puede haber endpoint de barrido').toBe(false);

    const rutas = ficheros('src/app', ['.ts', '.tsx']);
    const queBarren = rutas.filter((f) => /barrerLinea|barrido/i.test(sinComentarios(readFileSync(f, 'utf8'))));
    expect(queBarren, 'ninguna ruta puede mencionar el barrido siquiera').toEqual([]);
  });

  /**
   * ⚠️⚠️ ESTE TEST HA CAMBIADO, Y NO POR DESCUIDO. QUEDA ESCRITO POR QUÉ.
   *
   * Al aparcar el barrido prometí "CERO peticiones al abrir la vista de línea", y
   * este test lo exigía. Hoy la vista de línea hace **2 peticiones**.
   *
   * ⛔ PORQUE ESTABA PINTANDO LA RUTA TEÓRICA. Y la Avenida de Valencia ESTÁ
   *   CORTADA. ZetaBus le decía a alguien que su autobús para en una calle por la
   *   que el autobús no pasa. No petaba: pintaba.
   *
   * La promesa de "cero peticiones" era contra el BARRIDO: 67 peticiones y hasta
   * 66 segundos de espera, por pulsación, para una pregunta que nadie se hace.
   * Esto son 2, cacheadas 30 minutos, y son la diferencia entre decir la verdad y
   * mandar a alguien a esperar a una calle cortada.
   *
   * ⚠️ Y para que "2" no se convierta en "20" el día que alguien añada algo, el
   *    número está ATADO aquí abajo.
   */
  it('⭐ solo PARADA y LÍNEA tocan Avanza al renderizarse. Y ninguna barre.', () => {
    const paginas = ficheros('src/app', ['.tsx']).filter((f) => f.endsWith('page.tsx'));
    const queLlaman = paginas
      .filter((f) => /leerPoste|motor\(/.test(sinComentarios(readFileSync(f, 'utf8'))))
      .map((f) => f.replace(/\\/g, '/'))
      .sort();

    expect(queLlaman).toEqual([
      'src/app/linea/[linea]/page.tsx', // ← la RUTA REAL. 2 peticiones, 30 min de caché.
      'src/app/parada/[poste]/page.tsx', // ← las llegadas. 1 petición, 15 s de caché.
    ]);

    // ⛔ Y NINGUNA puede barrer. El barrido sigue aparcado.
    for (const f of paginas) {
      expect(sinComentarios(readFileSync(f, 'utf8')), f).not.toMatch(/barrerLinea/);
    }
  });

  it('⭐ la vista de línea pide LA RUTA, no las llegadas: 2 peticiones, no 67', () => {
    const c = sinComentarios(readFileSync('src/app/linea/[linea]/page.tsx', 'utf8'));

    // Pide el recorrido de hoy (un `get_stops_list` por sentido). Y NADA MÁS.
    expect(c).toMatch(/desviosDeLinea/);
    expect(c, 'no lee postes, que es lo que se disparaba a 67').not.toMatch(/leerPoste|llegadasDePoste/);

    // ⚠️ EL COSTE, ATADO A UN NÚMERO. Si mañana alguien mete otra llamada, esto se
    //    pone rojo antes de que Avanza se entere.
    const llamadas = (c.match(/await (desviosDeLinea|llegadasDePoste|barrerLinea)/g) ?? []).length;
    expect(llamadas, 'una sola llamada al motor por render').toBe(1);

    // Y la caché del recorrido son 30 minutos: un desvío no se pone y se quita
    // cada minuto. Si esto bajara a 15 s, multiplicaríamos por 120 el tráfico.
    const d = sinComentarios(readFileSync('src/engine/desvios.ts', 'utf8'));
    expect(d).toMatch(/TTL_RECORRIDO_MS\s*=\s*30 \* 60_000/);
  });

  it('⛔ la vista de línea NO tiene botón. Ni apagado, ni con un "próximamente".', () => {
    // Un botón que no hace nada es ruido. Y una promesa incumplida en una demo
    // resta: el que la ve piensa "esto está a medias", no "esto es deliberado".
    const c = readFileSync('src/app/linea/[linea]/page.tsx', 'utf8');
    const codigo = sinComentarios(c);
    expect(codigo).not.toMatch(/BuscarBuses|boton-barrer|<button/i);
    expect(codigo, 'nada de "próximamente"').not.toMatch(/próximamente|proximamente|disabled/i);
    // Pero el recorrido SÍ está: es lo que la pantalla sirve, y sale del GTFS.
    expect(codigo, 'el itinerario se queda').toMatch(/Itinerario/);
  });

  it('⚠️ el código aparcado SIGUE AHÍ. Aparcar no es borrar.', () => {
    // Lo valioso no es el código (está en git). Es el PORQUÉ, que sí se pierde.
    for (const f of ['barrido.ts', 'agrupar-flota.ts', 'BuscarBuses.tsx', 'route.ts']) {
      expect(existsSync(`parked/barrido-de-linea/${f}`), `falta ${f}`).toBe(true);
    }
    expect(existsSync('docs/BARRIDO_APARCADO.md'), 'el porqué, escrito').toBe(true);
  });

  it('⭐ y el documento explica LA REGLA DE LOS DOS, que es el motivo de verdad', () => {
    // Si alguien lo enciende dentro de seis meses, va a tropezar con lo mismo. Lo
    // que tiene que encontrar no es "estaba desactivado": es POR QUÉ NO FUNCIONA.
    const d = readFileSync('docs/BARRIDO_APARCADO.md', 'utf8').replace(/\s+/g, ' ');
    expect(d, 'la regla de los dos').toMatch(/dos siguientes/i);
    expect(d, 'la ventana la fija el pelotón').toMatch(/ventana/i);
    expect(d, 'no hay muestreo defendible').toMatch(/no hay muestreo defendible/i);
    expect(d, 'la cobertura no es monótona').toMatch(/monótona/i);
    expect(d, 'el coste real').toMatch(/67/);
  });
});

