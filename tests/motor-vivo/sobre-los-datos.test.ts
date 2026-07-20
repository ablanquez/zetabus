/**
 * ⭐ EL CONTADOR DE CONTROL DE /sobre-los-datos (L1 aplicado a una PÁGINA).
 *
 * Es LA página que promete decir de dónde sale cada dato. Si un recuento suyo se
 * escribe a mano, caduca en silencio el día que cambie la flota — y mentiríamos
 * justo donde prometemos no hacerlo.
 *
 * ⇒ Aquí se cuenta POR SEGUNDA VEZ, por un camino distinto (directo del artefacto),
 *   y se exige que lo que la página PINTA coincida. Si alguien vuelve a cablear un
 *   número, esto se pone rojo.
 */

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SobreLosDatos from '@/app/sobre-los-datos/page';
import { nombresControl, paradas, validez } from '@/engine/topologia';
import artefacto from '@/generated';
import type { BusProfile } from '@/modes/bus/profile';

/** El texto que de verdad lee una persona: sin etiquetas y con los espacios sanos. */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const A = artefacto as unknown as { flota: Record<string, BusProfile> };
const flota = Object.values(A.flota);
const cuantos = (c: BusProfile['confidence']) => flota.filter((v) => v.confidence === c).length;

const render = () => texto(renderToStaticMarkup(createElement(SobreLosDatos)));

describe('/sobre-los-datos · los números se DERIVAN, no se escriben', () => {
  it('⭐ los recuentos de flota que pinta la página son los del artefacto', () => {
    const t = render();
    const oficiales = cuantos('oficial');
    const secundarios = cuantos('fuente_secundaria');
    const observados = cuantos('observacion_propia');
    const marcados = cuantos('sin_verificar');

    // Contados por un camino distinto del de la página. Tienen que cuadrar.
    expect(t, 'el titular de la ficha oficial').toContain(`${oficiales} de ${flota.length} vehículos`);
    expect(t, 'fuente secundaria').toContain(`${secundarios} vehículos`);
    expect(t, 'observación propia').toContain(`${observados} vehículos`);
    expect(t, 'sin procedencia').toContain(`${marcados} vehículos`);

    // ⭐ Y la suma por niveles TIENE que dar el total, o falta gente por clasificar.
    expect(oficiales + secundarios + observados + marcados).toBe(flota.length);
    console.log(
      `\n  flota ${flota.length} = ${oficiales} oficial + ${secundarios} secundaria + ` +
        `${observados} observada + ${marcados} sin verificar`,
    );
  });

  it('⭐ los recuentos de nombres de parada también salen del dato', () => {
    const t = render();
    const stops = paradas();
    const sinConfirmar = stops.filter((s) => s.nombreProc.fuente === 'gtfs-marcado').length;
    const { comparables, distintos } = nombresControl;
    const pct = Math.round((distintos / comparables) * 1000) / 10;

    expect(t, 'las paradas marcadas «sin confirmar»').toContain(`${sinConfirmar} paradas`);
    expect(t, 'el % que el operador escribe distinto').toContain(`el ${pct} %`);
    expect(t, 'la fracción que lo sostiene').toContain(`${distintos} de ${comparables}`);
    console.log(`  nombres: ${distintos}/${comparables} distintos (${pct} %) · ${sinConfirmar} sin confirmar`);
  });

  it('la vigencia del feed sale del feed, no escrita a mano', () => {
    expect(render()).toContain(validez.endDate);
  });

  it('⛔ CONTRAPRUEBA: un recuento equivocado NO aparece (si estuviera cableado, aquí seguiría)', () => {
    const t = render();
    const oficiales = cuantos('oficial');
    // Si el número estuviera escrito a mano, cambiar la flota no lo movería. Se
    // comprueba que la página NO pinta un valor vecino: solo pinta el real.
    expect(t).not.toContain(`${oficiales + 1} de ${flota.length} vehículos`);
    expect(t).not.toContain(`${flota.length + 1} vehículos`);
  });

  it('⛔ los números que YA NO se pueden derivar se han QUITADO, no cableado', () => {
    const t = render();
    // El cotejo contra busesmadrid se midió offline contra los dos ficheros crudos;
    // el artefacto solo guarda el campo ganador, así que no es recalculable. Fuera.
    expect(t, 'el % de matrículas cotejadas').not.toContain('98,6');
    expect(t, 'el 100 % del fabricante').not.toMatch(/100\s*%\s*del fabricante/);
    expect(t, 'las 62 fichas del fichero anterior').not.toContain('62 fichas');
    expect(t, 'los 350 "que están en los dos"').not.toMatch(/\d+\s*vehículos que están en los dos/);
  });

  it('⚠️ las fuentes que la página afirma son las que el código usa HOY', () => {
    const t = render();
    // Tras el cambio de motor, los horarios vienen de la web del operador.
    expect(t, 'la web de Avanza es fuente de primer orden y tiene que salir').toMatch(
      /zaragoza\.avanzagrupo\.com/,
    );
    expect(t, 'la tabla de horarios de hoy').toMatch(/primeras y últimas salidas de hoy/i);
    expect(t, 'la cita de «Información adicional», marcada como suya').toMatch(/seg[úu]n Avanza/i);
    expect(t, 'y el matiz de que la mantienen a mano').toMatch(/a mano/i);
  });
});
