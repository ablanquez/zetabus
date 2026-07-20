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
import { MARCAS } from '@/components/FichaVehiculo';
import type { BusProfile } from '@/modes/bus/profile';

/** El texto que de verdad lee una persona: sin etiquetas y con los espacios sanos. */
const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const A = artefacto as unknown as { flota: Record<string, BusProfile> };
const flota = Object.values(A.flota);
const cuantos = (c: BusProfile['confidence']) => flota.filter((v) => v.confidence === c).length;

const render = () => texto(renderToStaticMarkup(createElement(SobreLosDatos)));
const html = () => renderToStaticMarkup(createElement(SobreLosDatos));

/**
 * El recuento que la TABLA de procedencia pinta para un nivel, leído del DOM.
 * Se mira el atributo y no la prosa: así el control sobrevive a un rediseño y sigue
 * vigilando lo único que importa — que el número sea el del dato.
 */
const vehEnTabla = (c: BusProfile['confidence']): number | null => {
  const m = html().match(new RegExp(`data-confianza="${c}"[^>]*data-veh="(\\d+)"`));
  return m ? Number(m[1]) : null;
};

describe('/sobre-los-datos · los números se DERIVAN, no se escriben', () => {
  it('⭐ los recuentos de flota que pinta la página son los del artefacto', () => {
    const t = render();
    const oficiales = cuantos('oficial');
    const secundarios = cuantos('fuente_secundaria');
    const observados = cuantos('observacion_propia');
    const marcados = cuantos('sin_verificar');

    // Contados por un camino distinto del de la página. Tienen que cuadrar.
    expect(t, 'el total de la familia').toContain(`${flota.length} vehículos`);
    // ⭐ Y nivel a nivel, leyendo la TABLA de procedencia del DOM.
    expect(vehEnTabla('oficial'), 'oficial').toBe(oficiales);
    expect(vehEnTabla('fuente_secundaria'), 'busesmadrid').toBe(secundarios);
    expect(vehEnTabla('observacion_propia'), 'observados').toBe(observados);
    expect(vehEnTabla('sin_verificar'), 'sin procedencia').toBe(marcados);

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
    // Si el número estuviera escrito a mano, cambiar la flota no lo movería. Se
    // comprueba que la página NO pinta un valor vecino: solo pinta el real.
    expect(render()).not.toContain(`${flota.length + 1} vehículos`);
    expect(html()).not.toMatch(new RegExp(`data-confianza="oficial"[^>]*data-veh="${cuantos('oficial') + 1}"`));
  });

  it('⭐ los 4 niveles se pintan con el símbolo REAL del mapa MARCAS, no escrito a mano', () => {
    const h = html();
    // El mismo símbolo que la app pinta en cada ficha. `oficial` es la NORMA y no
    // lleva marca: si algún día la llevara, esto lo caza.
    expect(MARCAS.oficial, 'la norma no se marca').toBeNull();
    for (const c of ['fuente_secundaria', 'observacion_propia', 'sin_verificar'] as const) {
      expect(h, `${c} debe pintar «${MARCAS[c]?.simbolo}»`).toContain(MARCAS[c]!.simbolo);
    }
  });

  it('⭐ la página está AGRUPADA en tres familias, no en tarjetas sueltas', () => {
    const h = html();
    expect((h.match(/data-papel="familia"/g) ?? []).length, 'tres familias').toBe(3);
    expect((h.match(/data-papel="nivel-procedencia"/g) ?? []).length, 'la tabla, 4 filas').toBe(4);
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
