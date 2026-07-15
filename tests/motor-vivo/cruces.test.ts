/**
 * ⭐⭐ BACKTESTING CEBADO. LOS CRUCES, QUE ES DONDE VIVE LO QUE NO SE PRUEBA.
 *
 * Cada caso feo por separado ya está probado. Lo que NO estaba probado es lo que
 * pasa cuando se juntan — y es justo donde se cuela la pantalla coherente y falsa:
 * cada pieza hace lo suyo, todas van bien, y el conjunto miente.
 *
 * ⚠️ SI NADA SE ROMPE AL PRIMER INTENTO, SOSPECHA DEL TEST. Por eso cada
 * protección lleva su CONTRAPRUEBA: se apaga, y se demuestra que el dato malo
 * pasa. El rojo antes del verde.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CacheDosPisos } from '@/cache/dos-pisos';
import { llegadasDePoste } from '@/engine/llegadas';
import { compararRecorrido, UMBRAL_ABSURDO } from '@/engine/desvios';
import { canonLinea, lineaDeEtiqueta, terminalDe, idLinea, lineas, sentidosDe, esBuho } from '@/engine/topologia';
import type { TerminalDeSentido } from '@/engine/topologia';
import { tonosDeChip, contraste, AA, NOCHE } from '@/components/ChipLinea';
import { reloj, Terminal } from '@/components/Terminal';
import { POSTE_MUDO, respuestaPoste, siempre, transporteFalso } from './dobles';

/**
 * ⛔ EL DETECTOR DE HORAS IMPOSIBLES. La 1:29 de HOY es una hora; la "25:29" NO
 * existe en ningún reloj. Cualquier `HH:MM` con `HH ≥ 24` en pantalla es la
 * huella de que alguien pintó el minuto crudo del GTFS sin normalizarlo. Se usa
 * en el test del render Y en su contraprueba, para que sea LA MISMA regla.
 */
const HORA_IMPOSIBLE = /\b(2[4-9]|[3-9]\d):[0-5]\d\b/;

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'zetabus-x-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const cache = () => new CacheDosPisos({ dir });

// ═════════════════════════════════════════════════════════════════════════════

describe('⭐⭐ LOS CRUCES: varios casos feos A LA VEZ', () => {
  it('bus SIN FICHA + SIN COORDENADAS + línea DESCONOCIDA + Avanza LENTA, todo junto', async () => {
    // El peor autobús imaginable: no está en el maestro, no tiene GPS, circula en
    // una línea que el GTFS no conoce... y la fuente tarda.
    //
    // ⛔ LO QUE NO PUEDE PASAR: que se caiga, que lo esconda, o que lo rellene.
    const t = siempre(
      respuestaPoste({
        buses: [{ coche: '9999', linea: '099', destino: 'DESCONOCIDO', eta: 7, lat: null, lon: null }],
      }),
    );
    const r = await llegadasDePoste(744, { cache: cache(), transporte: t.transporte });

    expect(r.estado).toBe('ok'); // ⭐ se ENSEÑA. Existe y va lleno de gente.
    if (r.estado !== 'ok') return;

    const l = r.datos.llegadas[0];
    expect(l.perfil, 'SIN FICHA → null, nunca un valor por defecto').toBeNull();
    expect(l.posicion, 'SIN COORDENADAS → null, nunca (0,0)').toBeNull();
    expect(l.lineaId, 'línea desconocida → null').toBeNull();
    expect(l.color, 'sin GTFS no hay color, y no se inventa').toBeNull();
    expect(l.etiquetaCruda, 'pero la etiqueta CRUDA se conserva').toBe('099');
    expect(l.destino).toBe('DESCONOCIDO');
    // Y se AVISA de lo que no cuadra. No se calla.
    expect(r.datos.avisos.join()).toMatch(/099/);
  });

  it('⭐ CONTRAPRUEBA: un motor ingenuo habría pintado ese bus EN EL GOLFO DE GUINEA', () => {
    // El `?? 0` es la línea de código más inocente del mundo, y manda el autobús a
    // la isla de Null. Con un mapa delante, alguien lo vería flotando en el mar y
    // pensaría que la app está rota. Lo peligroso es el caso en que NO se ve.
    const ingenuo = (lat: number | null, lon: number | null) => ({ lat: lat ?? 0, lon: lon ?? 0 });
    const malo = ingenuo(null, null);
    expect(malo).toEqual({ lat: 0, lon: 0 }); // ⛔ el golfo de Guinea
    expect(malo.lat === 0 && malo.lon === 0).toBe(true);

    // El nuestro: si no hay coordenadas, NO HAY PUNTO. Y el mapa lo dice.
    const nuestro = (lat: number | null, lon: number | null) =>
      lat === null || lon === null ? null : { lat, lon };
    expect(nuestro(null, null)).toBeNull();
  });

  it('línea DESVIADA + un poste que HOY no existe en el GTFS → se pinta igual', () => {
    // Una parada provisional de un desvío puede no estar en nuestra topología. Si
    // el diff devolviera StopIds, se caería de la lista EN SILENCIO y el usuario no
    // vería la parada a la que de verdad va el autobús.
    const oficial = [
      { poste: 100, nombre: 'A' },
      { poste: 200, nombre: 'B (Av. Valencia)' },
      { poste: 300, nombre: 'C' },
    ];
    const hoy = [
      { poste: 100, nombre: 'A' },
      { poste: 999999, nombre: 'PROVISIONAL — que no está en el GTFS' },
      { poste: 300, nombre: 'C' },
    ];
    const v = compararRecorrido(oficial, hoy);
    expect(v.tipo).toBe('comparado');
    if (v.tipo !== 'comparado') return;

    expect(v.hayDesvio).toBe(true);
    expect(v.fuera.map((p) => p.poste), 'Av. Valencia CAE').toEqual([200]);
    expect(v.hacia.map((p) => p.poste), 'la provisional ENTRA').toEqual([999999]);
    // ⭐ Y LA RUTA REAL SALE ENTERA, con el nombre que da Avanza para la que no
    //    conocemos. Sin esto, la pantalla se saltaría una parada sin decir nada.
    expect(v.real.map((p) => p.nombre)).toEqual([
      'A',
      'PROVISIONAL — que no está en el GTFS',
      'C',
    ]);
  });

  it('⛔ CONTRAPRUEBA — EL FRENO DE MANO: una lectura ROTA no tacha media línea', () => {
    // Si `get_stops_list` devuelve media respuesta, el diff diría "han quitado 20
    // paradas". Y la pantalla tacharía media línea, con toda la coherencia del
    // mundo, y el usuario se creería que su parada ha desaparecido.
    const oficial = Array.from({ length: 30 }, (_, i) => ({ poste: i + 1, nombre: `P${i}` }));
    const rota = oficial.slice(0, 5); // solo llegaron 5 de 30

    const v = compararRecorrido(oficial, rota);
    expect(v.tipo, 'preferimos decir NO LO SÉ a tachar 25 paradas que siguen ahí').toBe('indeterminado');
    if (v.tipo === 'indeterminado') expect(v.motivo).toMatch(/lectura rota/);

    // ⭐ EL ROJO: sin el freno, el diff diría que han caído 25 paradas (el 83%).
    const caidas = oficial.filter((p) => !rota.some((r) => r.poste === p.poste)).length;
    expect(caidas / oficial.length).toBeGreaterThan(UMBRAL_ABSURDO);
    expect(caidas).toBe(25); // ⛔ esto es lo que se habría pintado, tachado
  });

  it('⚠️ una ruta de hoy VACÍA no significa "han quitado todas las paradas"', () => {
    const oficial = [{ poste: 1, nombre: 'A' }, { poste: 2, nombre: 'B' }];
    const v = compararRecorrido(oficial, []);
    expect(v.tipo).toBe('indeterminado'); // ← NO "hayDesvio: true, fuera: [A, B]"
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⭐ D1 · LOS BÚHOS: ninguno sale ilegible, y la categoría no gasta color', () => {
  it('⭐ los 7 búhos reales se leen sobre el azul noche (o caen a blanco)', () => {
    const buhos = lineas().filter(esBuho);
    expect(buhos.length, 'N1..N7').toBe(7);

    const tabla: string[] = [];
    for (const b of buhos) {
      const t = tonosDeChip(b);
      expect(t.buho).toBe(true);
      expect(t.fondo, 'el fondo es el azul noche, SIEMPRE').toBe(NOCHE);
      const c = contraste(t.texto, t.fondo);
      tabla.push(`${b.shortName}: ${b.color} sobre ${NOCHE} → ${c.toFixed(1)}:1 · pinta ${t.texto}`);
      // ⭐ NINGUNO puede salir ilegible. Un número de línea que no se lee no
      //    identifica nada, y entonces el chip no sirve para lo que existe.
      expect(c, `el búho ${b.shortName} sale ilegible`).toBeGreaterThanOrEqual(AA);
    }
    console.log('\n  ' + tabla.join('\n  '));
  });

  it('⚠️ CONTRAPRUEBA: un búho de color oscuro CAERÍA a blanco, no se quedaría ilegible', () => {
    // La referencia pinta el número del búho con el color de la línea SIN comprobar
    // el contraste. Si mañana hubiera un búho azul marino, su chip sería ilegible y
    // nadie se enteraría. Aquí hay red: la CATEGORÍA (la inversión) se mantiene, y
    // lo que cede es el tono, que es lo accesorio.
    const buhoOscuro = {
      id: 'x', shortName: 'N9', longName: 'x',
      color: '#1C1A44', textColor: '#FFFFFF', mode: 'bus',
    } as unknown as Parameters<typeof tonosDeChip>[0];

    expect(contraste('#1C1A44', NOCHE), 'casi el mismo tono: ilegible').toBeLessThan(AA);
    const t = tonosDeChip(buhoOscuro);
    expect(t.fondo, 'la inversión NO se pierde: sigue siendo un búho').toBe(NOCHE);
    expect(t.texto, 'pero el número se lee').toBe('#FFFFFF');
    expect(contraste(t.texto, t.fondo)).toBeGreaterThanOrEqual(AA);
  });

  it('⭐ una diurna NO se invierte: la categoría es una pregunta distinta del color', () => {
    const treintaYUno = lineas().find((l) => l.shortName === '31')!; // el rojo de alerta
    const t = tonosDeChip(treintaYUno);
    expect(t.buho).toBe(false);
    expect(t.fondo).toBe(treintaYUno.color);
    expect(t.fondo).not.toBe(NOCHE);
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⏳ C5 · LA MEDIANOCHE, QUE ES DONDE SE MIENTE POR DOCE HORAS', () => {
  it('⭐ el GTFS escribe 25:29 y la pantalla NO puede poner "25:29" ni "1:29" a secas', () => {
    // 25:29 = la 1:29 de la MADRUGADA DEL DÍA SIGUIENTE.
    const r = reloj(25 * 60 + 29);
    expect(r.hora).toBe('1:29');
    expect(r.siguiente, 'sin esto, alguien iría doce horas antes').toBe(true);

    // Una hora normal no lleva la marca.
    const m = reloj(5 * 60);
    expect(m.hora).toBe('5:00');
    expect(m.siguiente).toBe(false);

    // Y el límite exacto: 23:59 es de hoy; 24:00 ya es de mañana.
    expect(reloj(23 * 60 + 59)).toEqual({ hora: '23:59', siguiente: false });
    expect(reloj(24 * 60)).toEqual({ hora: '0:00', siguiente: true });
  });

  it('⭐ CONTRAPRUEBA: un `% 24` a secas diría "1:29" SIN decir que es de mañana', () => {
    const ingenuo = (min: number) => `${Math.floor((min % 1440) / 60)}:${String(min % 60).padStart(2, '0')}`;
    expect(ingenuo(25 * 60 + 29)).toBe('1:29'); // ⛔ correcto... y mentiroso
    // No hay forma de distinguirlo de la 1:29 de HOY. Doce horas de diferencia.
    expect(ingenuo(1 * 60 + 29)).toBe('1:29');
    expect(ingenuo(25 * 60 + 29)).toBe(ingenuo(1 * 60 + 29)); // ⛔ IDÉNTICOS
  });

  it('⚠️ un búho NO tiene servicio de laborable, y el dato lo dice solo', () => {
    // La N7 circula viernes y sábado noche. Si el feed no le da un servicio de
    // laborable, la pantalla NO inventa una fila vacía con guiones: no la pinta.
    const n7 = lineas().find((l) => l.shortName === 'N7')!;
    const t = terminalDe(idLinea(String(n7.id)), 0);
    if (t) {
      const tipos = t.dias.map((d) => d.tipo);
      console.log(`\n  N7 · tipos de día con servicio: ${tipos.join(', ') || '(ninguno)'}`);
      // No se afirma CUÁLES son (eso lo dice el feed, y puede cambiar). Se afirma
      // que si no hay servicio, NO SE INVENTA una fila.
      for (const d of t.dias) {
        expect(d.expediciones, 'una fila sin expediciones no debería existir').toBeGreaterThan(0);
        expect(d.ultima).toBeGreaterThanOrEqual(d.primera);
      }
    }
  });

  it('⭐ la línea 35 tiene su última salida DESPUÉS de medianoche, y se marca', () => {
    const l35 = lineas().find((x) => x.shortName === '35')!;
    const t = terminalDe(idLinea(String(l35.id)), 0);
    expect(t, 'la 35 tiene horario de terminal en el feed').not.toBeNull();
    if (!t) return;
    const lab = t.dias.find((d) => d.tipo === 'laborable');
    expect(lab).toBeDefined();
    if (!lab) return;
    console.log(`  35 · laborable: ${reloj(lab.primera).hora} → ${reloj(lab.ultima).hora}` +
      `${reloj(lab.ultima).siguiente ? ' (del día siguiente)' : ''} · ${lab.expediciones} salidas`);
    expect(lab.ultima, 'la última salida pasa de medianoche').toBeGreaterThan(24 * 60);
    expect(reloj(lab.ultima).siguiente).toBe(true);
  });

  it('⭐⭐ C10 · EL Terminal RENDERIZADO enseña "1:29 del día siguiente", NUNCA "25:29"', () => {
    // ⚠️ NO BASTA con que `reloj()` esté bien: hay que probar lo que el componente
    //    PINTA. Se renderiza el Terminal REAL con el dato REAL de la 35 (última =
    //    1529 min = las 25:29 del GTFS) y se le pasa el detector por encima.
    const t35: TerminalDeSentido = {
      lineId: 'x', directionId: 0,
      dias: [{ tipo: 'laborable', primera: 300, ultima: 1529, expediciones: 122 }],
    };
    const html = renderToStaticMarkup(createElement(Terminal, { terminal: t35 }));
    // ⚠️ Se juzga el TEXTO que se lee, no las clases ni los estilos: se quitan las
    //    etiquetas para no cazar un "text-[15px]" como si fuera una hora.
    const enPantalla = html.replace(/<[^>]+>/g, ' ');

    expect(enPantalla, 'la última salida se pinta como 1:29').toContain('1:29');
    expect(enPantalla, 'y se dice que es de la madrugada siguiente').toContain('del día siguiente');
    expect(enPantalla, '⛔ en pantalla NO puede salir una hora ≥ 24').not.toMatch(HORA_IMPOSIBLE);

    // ⭐ CONTRAPRUEBA: se mete un "25:29" CRUDO en lo mismo que enseña la pantalla y
    //    se comprueba que el detector LO CAZA. Es exactamente lo que aparecería si
    //    una regresión quitara el `% 24` de `reloj()`: el rojo antes del verde.
    const regresion = enPantalla.replace('1:29', '25:29');
    expect(regresion, 'el detector tiene que cazar el 25:29 crudo').toMatch(HORA_IMPOSIBLE);
    // Y no caza cualquier cosa: una hora buena de madrugada NO la marca.
    expect('1:29', 'la 1:29 real es una hora legítima').not.toMatch(HORA_IMPOSIBLE);
    expect('23:59', 'las 23:59 son legítimas').not.toMatch(HORA_IMPOSIBLE);
  });

  it('⚠️ BACKTEST · festivo y laborable son FILAS DISTINTAS, no la misma copiada', () => {
    // La 21 circula los tres tipos de día, y NO con el mismo servicio: el domingo
    // hay menos expediciones. Si la pantalla pintara la misma fila para los tres,
    // mentiría sobre el domingo. No se afirma un número (lo dice el feed): se
    // afirma que DIFIEREN.
    const l21 = lineas().find((x) => x.shortName === '21')!;
    const t = terminalDe(idLinea(String(l21.id)), 0);
    expect(t, 'la 21 tiene horario de terminal en el feed').not.toBeNull();
    if (!t) return;
    const lab = t.dias.find((d) => d.tipo === 'laborable');
    const fes = t.dias.find((d) => d.tipo === 'festivo');
    expect(lab, 'hay fila de laborable').toBeDefined();
    expect(fes, 'hay fila de festivo').toBeDefined();
    if (!lab || !fes) return;
    console.log(`\n  21 · LAB ${reloj(lab.primera).hora}→${reloj(lab.ultima).hora} (${lab.expediciones} exp)  ` +
      `FES ${reloj(fes.primera).hora}→${reloj(fes.ultima).hora} (${fes.expediciones} exp)`);
    const difieren =
      lab.primera !== fes.primera || lab.ultima !== fes.ultima || lab.expediciones !== fes.expediciones;
    expect(difieren, 'laborable y festivo no pueden salir idénticos aquí').toBe(true);
  });

  it('⭐ BACKTEST · una CIRCULAR de bucle (Ci3) empieza y acaba en la MISMA parada', () => {
    // La pregunta de Antonio: ¿una circular tiene cabecera y final, o es un bucle?
    // Respuesta MEDIDA, no supuesta: hay DOS familias.
    //   · Ci1/Ci2 → dos sentidos, cabecera y final DISTINTOS (como una línea normal).
    //   · Ci3/Ci4 → un solo sentido, y la PRIMERA parada ES la última: un bucle.
    // Para el bucle, pintar la misma parada como cabecera (cuadrado relleno) arriba
    // y final (cuadrado hueco) abajo NO es un error: el autobús SALE de ahí y VUELVE
    // a ahí. Es lo honesto. Aquí se fija el dato del que depende ese pintado.
    const ci3 = lineas().find((x) => x.shortName === 'Ci3')!;
    const sc = sentidosDe(idLinea(String(ci3.id)));
    expect(sc.length, 'Ci3 es de un solo sentido (bucle)').toBe(1);
    const stops = sc[0].official.stops;
    expect(stops.length, 'y tiene recorrido').toBeGreaterThan(2);
    expect(stops[0], 'Ci3 es un bucle: primera === última parada').toBe(stops[stops.length - 1]);

    // Y una NO-bucle (Ci1) sí tiene cabecera y final distintos, para que la
    // afirmación de arriba signifique algo.
    const ci1 = lineas().find((x) => x.shortName === 'Ci1')!;
    const sc1 = sentidosDe(idLinea(String(ci1.id)));
    const st1 = sc1[0].official.stops;
    expect(st1[0], 'Ci1 NO es bucle: cabecera ≠ final').not.toBe(st1[st1.length - 1]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⛔ A2 · el "0C1" en el CRUCE con todo lo demás', () => {
  it('un bus de la C1 con la etiqueta "0C1" tiene color, enlace y NINGÚN aviso falso', async () => {
    const t = siempre(
      respuestaPoste({ buses: [{ coche: '4650', linea: '0C1', destino: 'COMPLEJO FUNERARIO', eta: 5 }] }),
    );
    const r = await llegadasDePoste(730, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('ok');
    if (r.estado !== 'ok') return;

    const l = r.datos.llegadas[0];
    expect(l.linea, 'la etiqueta bonita').toBe('C1');
    expect(l.lineaId, 'casa con el GTFS').not.toBeNull();
    expect(l.color, 'y por tanto TIENE color').not.toBeNull();

    // ⭐⭐ Y NINGÚN AVISO FALSO. Éste era el daño de verdad: un aviso que miente
    //    enseña al usuario a ignorar TODOS los avisos.
    expect(r.datos.avisos.join(), 'nada de "la línea 0C1 no existe"').not.toMatch(/0C1|no existe en el GTFS/);
    expect(r.datos.avisos).toEqual([]);
  });

  it('⭐ CONTRAPRUEBA: con la regla vieja, ese mismo bus salía sin color Y con aviso falso', () => {
    const vieja = (e: string) => e.trim().toUpperCase().replace(/^0+(?=\d)/, '');
    const canonGtfs = canonLinea('C1');

    expect(vieja('0C1')).not.toBe(canonGtfs); // ⛔ NO CASA
    expect(lineaDeEtiqueta('C1')).not.toBeNull(); // ...aunque la línea existe

    // Y la consecuencia, escrita: sin GTFS no hay color ni enlace, y `llegadas.ts`
    // empuja el aviso "está circulando pero no existe en el GTFS". Sobre una línea
    // que SÍ existe. Ése es el aviso falso.
    expect(canonLinea('0C1')).toBe(canonGtfs); // ✅ con la nueva, sí casa
  });

  it('⚠️ y EM1/EM2/TUR siguen sin existir: ahí el aviso NO es falso, es verdad', () => {
    for (const e of ['EM1', 'EM2', 'TUR']) expect(lineaDeEtiqueta(e)).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('⚠️ AVANZA SE PORTA MAL MIENTRAS PASA TODO LO DEMÁS', () => {
  it('Avanza CAÍDA en una parada con 6 líneas → `caido`, y NUNCA "no hay autobuses"', async () => {
    const t = transporteFalso({ explota: 'ECONNREFUSED' });
    const r = await llegadasDePoste(674, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('caido');
    expect(r).not.toHaveProperty('datos');
  });

  it('⭐ un poste con UNA sola línea y otro con SEIS: los dos se comportan igual', async () => {
    // El filtro solo aparece con más de una línea. Pero el DATO no cambia de forma.
    const una = siempre(respuestaPoste({ buses: [{ coche: '4650', linea: '039', destino: 'V', eta: 3 }] }));
    const seis = siempre(
      respuestaPoste({
        buses: ['021', '022', '023', '029', '035', '039'].map((l, i) => ({
          coche: String(4600 + i), linea: l, destino: 'X', eta: i * 2,
        })),
      }),
    );
    const a = await llegadasDePoste(744, { cache: cache(), transporte: una.transporte });
    const b = await llegadasDePoste(674, { cache: new CacheDosPisos({ dir: join(dir, 'b') }), transporte: seis.transporte });

    for (const r of [a, b]) {
      expect(r.estado).toBe('ok');
      if (r.estado !== 'ok') continue;
      // ⭐ ORDEN POR TIEMPO en los dos casos. Siempre.
      const etas = r.datos.llegadas.map((l) => l.etaMinutos);
      expect(etas).toEqual([...etas].sort((x, y) => x - y));
    }
    if (b.estado === 'ok') expect(b.datos.llegadas).toHaveLength(6);
  });

  it('el poste MUDO a las 4 de la mañana → `ok` con lista vacía. NO es una anomalía.', async () => {
    const t = siempre(POSTE_MUDO);
    const r = await llegadasDePoste(744, { cache: cache(), transporte: t.transporte });
    expect(r.estado).toBe('ok');
    if (r.estado === 'ok') expect(r.datos.llegadas).toEqual([]);
    // ⚠️ Y NO existe ningún estado "esto está raro". Si existiera, saltaría 934
    //    veces cada noche y nadie volvería a mirarlo.
  });
});
