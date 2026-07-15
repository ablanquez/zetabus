/**
 * ⭐⭐ D1 · LAS 44 LÍNEAS, UNA A UNA. REGLA DE MARCA + CONTORNO.
 *
 * Antonio dio una regla que manda: TODAS las diurnas → número BLANCO. Solo las
 * nocturnas invierten (fondo noche + número en su color). El modelo anterior
 * calculaba blanco/negro por contraste y daba legibilidad, pero rompía la marca:
 * la 29 salía en negro entre 30 blancos y parecía un error.
 *
 * ⚠️ Y EL PRIMER INTENTO —oscurecer el fondo hasta que el blanco pasara AA—
 * COLAPSABA la identidad: medido sobre las 44, 20 pares de diurnas caían al mismo
 * color (la 25 y la 28 a distancia 4). La paleta del operador tiene ~20 claras
 * agrupadas por tono; bajarlas todas a la misma luminancia las vuelve el mismo
 * color. Se lo dije a Antonio y eligió la otra vía:
 *
 *   ⇒ EL COLOR DE LÍNEA NO SE TOCA. El número es blanco con un TRAZO NEGRO. El
 *     contraste lo da el contorno, no el fondo. Y está GARANTIZADO: sobre un fondo
 *     claro manda el trazo (negro), sobre uno oscuro manda el relleno (blanco).
 *     `max(contraste(blanco, fondo), contraste(negro, fondo)) ≥ 4,58` SIEMPRE.
 */
import { describe, expect, it } from 'vitest';
import { lineas } from '@/engine/topologia';
import { AA, NOCHE, contraste, textoLegible, tonosDeChip, llevaContorno } from '@/components/ChipLinea';

const TODAS = lineas();
const DIURNAS = TODAS.filter((l) => !tonosDeChip(l).buho);

/** La garantía del número con contorno: relleno blanco Ó trazo negro se lee. */
const legiblePorContorno = (fondo: string) =>
  Math.max(contraste('#FFFFFF', fondo), contraste('#000000', fondo));

describe('⛔ EL ROJO · lo que hacía el GTFS (histórico, sigue valiendo de contraprueba)', () => {
  it('⛔ obedecer a `route_text_color` deja 26 de 44 ilegibles', () => {
    const ilegibles = TODAS.filter((l) => contraste(l.color, l.textColor) < AA);
    expect(ilegibles.length).toBe(26);
    const peor = TODAS.reduce((a, b) => (contraste(a.color, a.textColor) <= contraste(b.color, b.textColor) ? a : b));
    expect(peor.shortName).toBe('33');
    expect(contraste(peor.color, peor.textColor)).toBeLessThan(2);
  });
});

describe('⭐ REGLA DE MARCA · toda diurna, número BLANCO con contorno; ninguna ilegible', () => {
  it('TODAS las diurnas tienen el número blanco — NINGUNA en negro', () => {
    const enNegro = DIURNAS.filter((l) => tonosDeChip(l).texto.toUpperCase() !== '#FFFFFF');
    expect(enNegro.map((l) => l.shortName), 'ninguna diurna puede llevar número negro').toEqual([]);
  });

  it('⭐ IDENTIDAD INTACTA · el fondo de una diurna es su color del operador, SIN tocar', () => {
    // Ésta es la razón de ser del contorno: no se oscurece, no se colapsa nada.
    const alterados = DIURNAS.filter((l) => tonosDeChip(l).fondo.toUpperCase() !== l.color.toUpperCase());
    expect(alterados.map((l) => l.shortName), 'ningún color de línea se altera').toEqual([]);
  });

  it('y toda diurna lleva contorno (su número es blanco)', () => {
    for (const l of DIURNAS) {
      expect(llevaContorno(tonosDeChip(l).texto), l.shortName).toBe(true);
    }
  });

  it.each(DIURNAS.map((l) => [l.shortName, l] as const))(
    'la diurna %s se lee: relleno blanco Ó trazo negro ≥ AA sobre su color',
    (nombre, l) => {
      const { fondo, texto } = tonosDeChip(l);
      expect(texto.toUpperCase()).toBe('#FFFFFF');
      const c = legiblePorContorno(fondo);
      expect(c, `la línea ${nombre} sale a ${c.toFixed(2)}:1 (blanco o negro)`).toBeGreaterThanOrEqual(AA);
    },
  );

  it('⭐ EL SUELO · max(blanco, negro) ≥ 4,58 para CUALQUIER color — el contorno nunca falla', () => {
    // El peor fondo posible es donde blanco y negro empatan. Se busca, no se supone.
    const grises = Array.from({ length: 256 }, (_, v) => `#${v.toString(16).padStart(2, '0').repeat(3)}`);
    const peor = grises.map(legiblePorContorno).reduce((a, b) => Math.min(a, b));
    expect(peor).toBeGreaterThan(AA);
    expect(peor).toBeLessThan(4.7); // justo donde dice la cuenta: ~4,58
    // Y ninguna de las 44 reales baja de AA por ninguno de los dos canales.
    for (const l of TODAS) expect(legiblePorContorno(l.color), l.shortName).toBeGreaterThanOrEqual(AA);
  });

  it('⭐ CONTRAPRUEBA · el blanco SOLO (sin contorno) NO se lee sobre un color claro', () => {
    // El rojo antes del verde: la 33 (lima) con blanco a pelo era ilegible —por eso
    // hace falta el trazo—. El trazo negro sobre esa lima sí pasa AA.
    const l33 = TODAS.find((l) => l.shortName === '33')!;
    expect(contraste('#FFFFFF', l33.color), 'blanco solo sobre la lima').toBeLessThan(AA);
    expect(contraste('#000000', l33.color), 'el trazo negro sobre la lima').toBeGreaterThanOrEqual(AA);
    // Y el color NO se ha tocado: sigue siendo la lima del operador.
    expect(tonosDeChip(l33).fondo.toUpperCase()).toBe(l33.color.toUpperCase());
  });

  it('⭐ la 29 (que Avanza pintaba en NEGRO) ahora es blanca con contorno, color intacto', () => {
    const l29 = TODAS.find((l) => l.shortName === '29')!;
    const { fondo, texto } = tonosDeChip(l29);
    expect(texto.toUpperCase()).toBe('#FFFFFF');
    expect(llevaContorno(texto)).toBe(true);
    expect(fondo.toUpperCase()).toBe(l29.color.toUpperCase()); // sin tocar
  });
});

describe('⭐ D2 · LOS BÚHOS: intactos — fondo único noche, número de su línea, SIN contorno', () => {
  const buhos = TODAS.filter((l) => tonosDeChip(l).buho);

  it('son SIETE, y los siete comparten EXACTAMENTE el mismo fondo noche', () => {
    expect(buhos.map((l) => l.shortName).sort()).toEqual(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7']);
    expect(new Set(buhos.map((l) => tonosDeChip(l).fondo))).toEqual(new Set([NOCHE]));
  });

  it('⭐ el COLOR sigue diciendo QUÉ línea es, y NO llevan contorno (su número no es blanco)', () => {
    for (const l of buhos) {
      const { texto } = tonosDeChip(l);
      expect([l.color.toUpperCase(), '#FFFFFF', '#000000']).toContain(texto.toUpperCase());
      // Los 7 búhos reales tienen su color legible sobre el azul noche → no son blancos.
      expect(llevaContorno(texto), `${l.shortName} no debería llevar contorno`).toBe(false);
    }
  });

  it('y ninguno baja de AA sobre el azul noche', () => {
    for (const l of buhos) {
      const { fondo, texto } = tonosDeChip(l);
      expect(contraste(fondo, texto), l.shortName).toBeGreaterThanOrEqual(AA);
    }
  });

  it('⚠️ textoLegible sigue siendo la red del búho, y nunca devuelve algo bajo AA', () => {
    expect(textoLegible('#808080', '#FFFFFF').contraste).toBeGreaterThanOrEqual(AA);
  });
});
