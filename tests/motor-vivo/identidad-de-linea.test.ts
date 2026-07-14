/**
 * ⛔ EL "0C1". LA CAUSA, NO EL SÍNTOMA.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * QUÉ PASABA, MEDIDO CONTRA AVANZA EL 14/07/2026 (postes 730, 1040, 467, 464):
 *
 *     Avanza manda ... "0C1" y "0C4"       El GTFS tiene ... "C1" y "C4"
 *
 * `canonLinea` quitaba los ceros SOLO si detrás venía un dígito. O sea: trataba
 * la etiqueta COMO UN NÚMERO. Y C1 no es un número.
 *
 * ⇒ No casaban. Y el destrozo no era cosmético:
 *     · la etiqueta salía "0C1" en vez de "C1"
 *     · sin color de línea y sin enlace
 *     · y con un AVISO FALSO: "la línea 0C1 no existe en el GTFS"
 *
 * ⚠️ UN AVISO FALSO ENSEÑA A IGNORAR LOS AVISOS. Ése es el daño de verdad, y es
 *    el mismo que hace el "SIN VERIFICAR" sobre un dato correcto.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⭐ Y SE ARREGLA EN UN SOLO SITIO. Se contó: `canonLinea` es la ÚNICA función
 * que normaliza etiquetas de línea en todo el proyecto. No había copias a mano
 * (que es lo que convierte un parche en cinco parches, y luego en un bug).
 */

import { describe, expect, it } from 'vitest';
import { canonLinea, lineaDeEtiqueta, lineas } from '@/engine/topologia';

/** Los 3 caracteres con que el OPERADOR codifica cada línea, rellenando con ceros. */
const COMO_LO_MANDA_AVANZA: Record<string, string> = {
  '021': '21',
  '029': '29',
  '035': '35',
  '039': '39',
  '060': '60',
  '0C1': 'C1', // ⛔ el fallo
  '0C4': 'C4', // ⛔ el fallo
  CI1: 'Ci1',
  CI2: 'Ci2',
  CI3: 'Ci3',
  CI4: 'Ci4',
  N1: 'N1',
  N2: 'N2',
  N3: 'N3',
  N4: 'N4',
  N5: 'N5',
  N6: 'N6',
  N7: 'N7',
};

describe('⛔ LA IDENTIDAD DE LÍNEA: "0C1" ES "C1"', () => {
  it('⭐ TODAS las etiquetas raras casan con su línea del GTFS', () => {
    const rotas: string[] = [];
    for (const [cruda, esperada] of Object.entries(COMO_LO_MANDA_AVANZA)) {
      const l = lineaDeEtiqueta(cruda);
      if (l === null || l.shortName !== esperada) {
        rotas.push(`${cruda} → ${l?.shortName ?? 'NO CASA'} (debía ser ${esperada})`);
      }
    }
    expect(rotas, 'un bus sin línea es un bus sin color, sin enlace y con un aviso falso').toEqual([]);
  });

  it('⭐ CONTRAPRUEBA — EL ROJO: la regla vieja SÍ rompía C1 y C4', () => {
    // La regla anterior, literal. Se ejecuta aquí para que el fallo se VEA, en vez
    // de tener que creerse el comentario de arriba.
    const vieja = (e: string) => e.trim().toUpperCase().replace(/^0+(?=\d)/, '');

    // Con los numéricos funcionaba de sobra. Por eso pasó desapercibida meses.
    expect(vieja('021')).toBe('21');
    expect(vieja('039')).toBe('39');

    // ⛔ Y con las letras, no. El cero se quedaba pegado.
    expect(vieja('0C1')).toBe('0C1');
    expect(vieja('0C4')).toBe('0C4');
    expect(vieja('0C1')).not.toBe(canonLinea('C1'));

    // La nueva sí.
    expect(canonLinea('0C1')).toBe('C1');
    expect(canonLinea('0C4')).toBe('C4');
    expect(canonLinea('0C1')).toBe(canonLinea('C1'));
  });

  it('⚠️ EL SUPUESTO, ATADO: ninguna línea del GTFS empieza por cero', () => {
    // La regla nueva quita TODOS los ceros de cabeza. Es correcta porque el cero
    // es RELLENO del operador. Si algún día existiera una línea llamada "0X", esa
    // premisa moriría y volveríamos a tener el lío, del revés.
    //
    // No se confía en que alguien se acuerde: esto se pone rojo el día que pase.
    const conCero = lineas().filter((l) => l.shortName.startsWith('0'));
    expect(conCero.map((l) => l.shortName), 'la regla de quitar ceros dejaría de valer').toEqual([]);
  });

  it('⚠️ una etiqueta de solo ceros NO se convierte en la cadena vacía', () => {
    // `"000".replace(/^0+/,'')` es `""`. Y una cadena vacía casaría con cualquier
    // cosa que también quedara vacía, o con nada. El caso degenerado se ata.
    expect(canonLinea('000')).toBe('000');
    expect(canonLinea('0')).toBe('0');
    expect(canonLinea('')).toBe('');
  });

  it('la comparación sigue siendo insensible a mayúsculas y a espacios', () => {
    expect(canonLinea(' ci2 ')).toBe('CI2');
    expect(lineaDeEtiqueta('ci2')?.shortName).toBe('Ci2');
    expect(lineaDeEtiqueta(' 0C1 ')?.shortName).toBe('C1');
  });

  it('⚠️ EM1, EM2 y TUR NO están en nuestro GTFS. Y eso se dice, no se inventa.', () => {
    // Antonio los pidió en la lista de identificadores raros. No existen en el
    // feed de autobús urbano del NAP: son servicios que no vienen en él.
    //
    // ⇒ Si Avanza los anunciara, saldrían SIN color y SIN enlace, con el aviso
    //   "está circulando pero no existe en el GTFS" — que en su caso es VERDAD.
    //   Ésa es la diferencia con el 0C1: allí el aviso era falso; aquí no.
    for (const e of ['EM1', 'EM2', 'TUR']) {
      expect(lineaDeEtiqueta(e), `${e} no está en el GTFS y no se inventa`).toBeNull();
    }
  });
});
