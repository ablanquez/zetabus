/**
 * ⚠️ EL DETECTOR TAMBIÉN MIENTE. ESTE FICHERO DESCONFÍA DE LOS DEMÁS.
 *
 * Todos los tests del motor corren contra fixtures SINTÉTICOS: los escribí yo,
 * a mano, imitando la respuesta de Avanza. Y ahí está la trampa:
 *
 *   ⇒ SI MIS FIXTURES SE PARECEN A LO QUE YO CREÍA QUE DEVUELVE AVANZA, Y NO A
 *     LO QUE AVANZA DEVUELVE DE VERDAD, ENTONCES 100 TESTS EN VERDE NO PRUEBAN
 *     ABSOLUTAMENTE NADA. Solo prueban que soy coherente conmigo mismo.
 *
 * Ya me pasó dos veces en la auditoría de este mismo proyecto:
 *
 *   · el "discriminador definitivo" del poste 333, que resultó ser otro caso de
 *     ausencia física y no probaba lo que yo cantaba;
 *   · `git check-ignore -v`, que informa de una coincidencia también para las
 *     reglas de NEGACIÓN, y me dijo que `.env.example` estaba ignorado cuando
 *     sí entraba al repo.
 *
 * Las dos veces el instrumento decía verde y yo me lo creí.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO SE CIERRA EL AGUJERO:
 *
 * Este fichero corre el parser contra CAPTURAS REALES de Avanza, guardadas en
 * `.cache/fixtures-reales/` — un directorio GITIGNORADO, porque republicar el
 * dato de una empresa privada en un repo público e indexado es redistribuirlo,
 * y el README promete que no lo hacemos.
 *
 * ⚠️ Y AQUÍ ESTÁ EL LÍMITE, DICHO CLARO: si no hay capturas, ESTE TEST SE SALTA.
 * En una clonación limpia del repo, o en un CI, no se ejecuta. Eso significa que
 * **un CI en verde NO demuestra que Avanza no haya cambiado su HTML.** Lo único
 * que lo demuestra es correr esto en local con capturas frescas, o el canario
 * de `scripts/canario.ts` (1 petición). No lo tapo: lo digo.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parsearPoste } from '@/sources/avanza/parse-poste';
import { respuestaPoste } from './dobles';

const DIR = '.cache/fixtures-reales';
const hayCapturas = existsSync(DIR) && readdirSync(DIR).filter((f) => f.endsWith('.json')).length > 0;

describe.skipIf(!hayCapturas)('⚠️ DERIVA: el parser contra respuestas REALES de Avanza', () => {
  const ficheros = hayCapturas ? readdirSync(DIR).filter((f) => f.endsWith('.json')) : [];

  it(`las ${ficheros.length} capturas reales se leen sin una sola contradicción`, () => {
    let conBuses = 0;
    let mudos = 0;
    let llegadas = 0;
    const rotos: string[] = [];

    for (const f of ficheros) {
      try {
        const r = parsearPoste(readFileSync(`${DIR}/${f}`, 'utf8'));
        llegadas += r.llegadas.length;
        if (r.llegadas.length === 0) mudos++;
        else conBuses++;
      } catch (e) {
        rotos.push(`${f}: ${(e as Error).message}`);
      }
    }

    // Si esto se pone rojo, o Avanza ha cambiado su HTML, o el parser está mal.
    // Las dos cosas hay que mirarlas A MANO. No se relaja el test.
    expect(rotos).toEqual([]);
    expect(conBuses + mudos).toBe(ficheros.length);
    expect(llegadas).toBeGreaterThan(0); // si no, no estaríamos probando nada
  });

  it('⭐ el CRUCE DE CANALES cuadra en TODAS las capturas reales', () => {
    // El invariante en el que se apoya toda la detección de degradación
    // silenciosa:  coches(tablatiempos) == coches(maquinas).
    // Si fallara en una sola captura real, la protección estaría de más y
    // habría que quitarla, no defenderla.
    for (const f of ficheros) {
      expect(() => parsearPoste(readFileSync(`${DIR}/${f}`, 'utf8')), f).not.toThrow(/se contradice/);
    }
  });

  it('⭐ MIS FIXTURES SINTÉTICOS TIENEN LA MISMA FORMA QUE LOS REALES', () => {
    // La comprobación que hace honesto a todo lo demás: ¿el HTML que me invento
    // se parece al que manda Avanza, o me lo he inventado a mi conveniencia?
    const real = ficheros
      .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as { tablatiempos?: string })
      .find((d) => (d.tablatiempos ?? '').includes('fParadas'));
    if (!real) return; // ninguna captura con buses; nada que comparar

    const mio = JSON.parse(
      respuestaPoste({ buses: [{ coche: '9001', linea: '039', destino: 'VADORREY', eta: 3 }] }),
    ) as { tablatiempos: string };

    // Las marcas estructurales de las que depende el parser, una a una.
    for (const marca of [
      '<strong>',
      '<i class="fa fa-long-arrow-right fa-fw"></i>',
      '<ul class="nav nav-second-level">',
      'https://gps.avanzabus.com/zaragoza/fParadas/',
      '<i class="fa fa-map-marker fa-fw"></i>',
      'mins]',
    ]) {
      expect(real.tablatiempos, `la captura REAL debería tener: ${marca}`).toContain(marca);
      expect(mio.tablatiempos, `mi fixture debería tener: ${marca}`).toContain(marca);
    }
  });
});

describe.skipIf(hayCapturas)('⚠️ SIN CAPTURAS REALES', () => {
  it('AVISO: los tests de deriva NO se han ejecutado', () => {
    // Este test existe para que el aviso SALGA EN LA SALIDA, en vez de que la
    // ausencia de comprobación pase desapercibida entre los verdes.
    //
    // Sin capturas reales en `.cache/fixtures-reales/`, todo lo demás corre
    // contra fixtures que escribí yo. Un verde aquí NO dice nada sobre si Avanza
    // ha cambiado su HTML. Para saberlo: `npm run canario`.
    expect(hayCapturas).toBe(false);
  });
});
