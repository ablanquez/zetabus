/**
 * ⭐⭐ D1 · LAS 44 LÍNEAS, UNA A UNA. NINGUNA ILEGIBLE.
 *
 * Antonio vio que la línea 29 tenía el número en negro y las demás en blanco, y
 * dedujo: *"alguien decidió el color del texto por línea, a ojo"*.
 *
 * **Tenía razón, y el culpable era Avanza** (`route_text_color` del GTFS).
 * Nosotros lo copiábamos sin comprobarlo, así que el fallo era nuestro igual.
 *
 * Y el síntoma que él vio era la punta: **26 de 44 chips estaban por debajo de AA.**
 */
import { describe, expect, it } from 'vitest';
import { lineas } from '@/engine/topologia';
import { AA, NOCHE, contraste, textoLegible, tonosDeChip } from '@/components/ChipLinea';

const TODAS = lineas();

describe('⛔ EL ROJO · lo que hacía el GTFS, y lo que pasaba si lo obedecíamos', () => {
  it('⛔ CONTRAPRUEBA · obedecer a `route_text_color` deja 26 de 44 ilegibles', () => {
    // Esto es EXACTAMENTE lo que hacía el código antes: `texto: l.textColor`.
    const obediente = TODAS.map((l) => ({
      linea: l.shortName,
      c: contraste(l.color, l.textColor),
    }));
    const ilegibles = obediente.filter((x) => x.c < AA);

    expect(ilegibles.length).toBe(26); // ⛔ el rojo, con su número exacto

    // Y el peor no es un caso raro: es la línea 33, blanco sobre lima.
    const peor = obediente.reduce((a, b) => (a.c <= b.c ? a : b));
    expect(peor.linea).toBe('33');
    expect(peor.c).toBeLessThan(2); // 1,72:1 — prácticamente invisible
  });

  it('⛔ y NO era "la 29 la rara": era la única donde Avanza acertó', () => {
    const l29 = TODAS.find((l) => l.shortName === '29')!;
    expect(l29.textColor.toUpperCase()).toBe('#000000'); // el que Antonio vio
    expect(contraste(l29.color, l29.textColor)).toBeGreaterThanOrEqual(AA); // …y se lee
  });
});

describe('⭐ EL VERDE · el contraste se CALCULA, y ninguna baja de AA', () => {
  it.each(TODAS.map((l) => [l.shortName, l] as const))(
    'la línea %s se lee sobre su propio color',
    (nombre, l) => {
      const { fondo, texto } = tonosDeChip(l);
      const c = contraste(fondo, texto);
      expect(c, `la línea ${nombre} sale a ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    },
  );

  /**
   * ⭐ EL TEST ME CORRIGIÓ A MÍ, Y MERECE QUEDARSE ESCRITO.
   *
   * Escribí este caso para demostrar que existe un fondo donde **ni el blanco ni el
   * negro** llegan a AA, y que ahí la función no debía mentir. Y se puso rojo:
   * `#808080` con negro da **5,32:1**.
   *
   * Fui a la cuenta, y resulta que **el caso NO EXISTE**. El peor fondo posible es
   * aquel en el que blanco y negro empatan:
   *
   *     (L + 0,05) / 0,05  =  1,05 / (L + 0,05)
   *     (L + 0,05)²        =  0,0525
   *     L + 0,05           ≈  0,2291
   *     contraste          ≈  0,2291 / 0,05  =  **4,58 : 1**
   *
   * ⇒ **`max(blanco, negro) ≥ 4,58:1 SIEMPRE.** Sea cual sea el color de fondo.
   *   AA es alcanzable en el 100% de los casos, y por eso la rama "no llego a AA"
   *   de `textoLegible()` es INALCANZABLE.
   *
   * ⚠️ No la borro, y no finjo que protege de algo: la dejo devolviendo el mejor
   *    tono y marcándolo `forzado`, que es información REAL (dice "aquí no respeté
   *    al operador"). Pero **no hay un caso ilegible que cazar**, y decir que lo hay
   *    sería venderte una protección que no protege de nada.
   */
  it('⭐ Y NO HAY FONDO ILEGIBLE POSIBLE: max(blanco, negro) ≥ 4,58:1 siempre', () => {
    // Barrido de los 256 grises + los 44 colores reales. Ni uno baja del suelo.
    const suelo = 4.58;
    for (let v = 0; v <= 255; v++) {
      const g = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
      const mejor = Math.max(contraste(g, '#FFFFFF'), contraste(g, '#000000'));
      expect(mejor, `el gris ${g}`).toBeGreaterThanOrEqual(suelo - 0.01);
    }
    // El peor gris posible está donde blanco y negro empatan. Se busca, no se supone.
    const grises = Array.from({ length: 256 }, (_, v) => `#${v.toString(16).padStart(2, '0').repeat(3)}`);
    const peor = grises
      .map((g) => Math.max(contraste(g, '#FFFFFF'), contraste(g, '#000000')))
      .reduce((a, b) => Math.min(a, b));
    expect(peor).toBeGreaterThan(AA); // ⭐ ni el PEOR caso posible baja de AA
    expect(peor).toBeLessThan(4.7); // …y está justo donde dice la cuenta

    // Y `textoLegible` nunca devuelve algo por debajo de AA. Ni forzando.
    expect(textoLegible('#808080', '#FFFFFF').contraste).toBeGreaterThanOrEqual(AA);
  });

  it('⭐ el color del OPERADOR se respeta cuando SÍ se lee — no repintamos por gusto', () => {
    // La 29 pasa con su negro: se queda tal cual. Mínima intervención.
    const l29 = TODAS.find((l) => l.shortName === '29')!;
    expect(tonosDeChip(l29).texto.toUpperCase()).toBe(l29.textColor.toUpperCase());
  });

  it('⛔ …y donde NO se lee, se cae al que gana. La 33 pasa a NEGRO', () => {
    const l33 = TODAS.find((l) => l.shortName === '33')!;
    expect(l33.textColor.toUpperCase()).toBe('#FFFFFF'); // lo que manda el GTFS
    expect(tonosDeChip(l33).texto).toBe('#000000'); // lo que se pinta
    expect(contraste(l33.color, '#000000')).toBeGreaterThan(12); // 12,2:1
  });
});

describe('⭐ D2 · LOS BÚHOS: fondo único, número de su línea', () => {
  const buhos = TODAS.filter((l) => tonosDeChip(l).buho);

  it('son SIETE, y los siete comparten EXACTAMENTE el mismo fondo', () => {
    expect(buhos.map((l) => l.shortName).sort()).toEqual(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7']);
    expect(new Set(buhos.map((l) => tonosDeChip(l).fondo))).toEqual(new Set([NOCHE]));
  });

  it('⭐ el COLOR sigue diciendo QUÉ línea es — la inversión no se lo come', () => {
    for (const l of buhos) {
      const { texto } = tonosDeChip(l);
      // O es su color, o —si no se leyera— el de respaldo. Nunca un color ajeno.
      expect([l.color.toUpperCase(), '#FFFFFF', '#000000']).toContain(texto.toUpperCase());
    }
  });

  it('y ninguno baja de AA sobre el azul noche', () => {
    for (const l of buhos) {
      const { fondo, texto } = tonosDeChip(l);
      expect(contraste(fondo, texto), l.shortName).toBeGreaterThanOrEqual(AA);
    }
  });
});
