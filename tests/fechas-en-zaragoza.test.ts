/**
 * ⭐ LAS FECHAS SE RESUELVEN EN ZARAGOZA, NO EN EL HUSO DEL HOST.
 *
 * El día civil de negocio (la clave de caché del horario, el «hoy» que estampa el
 * script de coordenadas, la fecha de generación que se pinta en /sobre-los-datos)
 * es una FECHA CIVIL DE ZARAGOZA, no del servidor que ejecuta el código. En
 * Hostinger no sabemos qué huso tiene el host.
 *
 * ⚠️ POR QUÉ ESTE TEST Y NO SOLO `dia-civil.test.ts`. Aquél inyecta el reloj y
 *    caza el fallo de UTC (`toISOString().slice(0,10)`). Pero corre en un host que
 *    va en `Europe/Madrid`, así que NO cazaría una regresión a `getDate()` LOCAL:
 *    en Madrid, los getters locales y el día de Zaragoza COINCIDEN, y el test
 *    pasaría en verde sobre el fallo. Aquí se **fija el huso del host a otro**
 *    (Nueva York) para que la diferencia aparezca — que es justo el escenario del
 *    servidor de producción.
 *
 * Las dos formas INGENUAS de abajo son las que tenían los dos sitios que se
 * arreglaron (`scripts/coords-solo-barrido.ts` con getters locales;
 * `app/sobre-los-datos/page.tsx` con `toLocaleDateString` sin `timeZone`). Se
 * dejan aquí como testigo de POR QUÉ estaban mal, al modo de `dia-civil.test.ts`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { diaCivil } from '@/core';

/** Lo que hacía `hoy()` en el script: getters locales → depende del huso del host. */
function diaLocalIngenuo(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const TZ_ORIGINAL = process.env.TZ;
afterEach(() => {
  // Node relee `process.env.TZ` en cada operación de fecha: se restaura para no
  // contaminar otros tests del mismo proceso.
  if (TZ_ORIGINAL === undefined) delete process.env.TZ;
  else process.env.TZ = TZ_ORIGINAL;
});

describe('el día civil es el de Zaragoza, aunque el host vaya en otro huso', () => {
  // 00:30 del 1 de agosto EN MADRID (CEST, +2) = 22:30Z del 31 de julio
  //                                            = 18:30 del 31 de julio EN NUEVA YORK.
  // En ese instante, el día de Zaragoza es el 1 de agosto; el de Nueva York, el 31 de julio.
  const instante = new Date('2026-07-31T22:30:00Z');

  it('⭐ diaCivil da el día de Zaragoza con el host en Nueva York', () => {
    process.env.TZ = 'America/New_York';
    // ✅ La fuente única, con zona explícita: SIEMPRE Zaragoza, da igual el host.
    expect(diaCivil(instante)).toBe('2026-08-01');
  });

  it('⛔ y así se ve el fallo que se arregla: las formas ingenuas caen en el huso del host', () => {
    process.env.TZ = 'America/New_York';
    // Lo que hacía el script (getters locales) → el día de Nueva York.
    expect(diaLocalIngenuo(instante)).toBe('2026-07-31');
    // Lo que hacía /sobre-los-datos (`toLocaleDateString` SIN timeZone) → ídem.
    expect(instante.toLocaleDateString('en-CA')).toBe('2026-07-31');
    // …y con la zona explícita (el arreglo) vuelve a ser el de Zaragoza.
    expect(instante.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })).toBe('2026-08-01');
  });
});
