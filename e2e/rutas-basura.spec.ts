/**
 * ⭐ A4 · LAS RUTAS QUE NADIE ESCRIBE A MANO. Y QUE UN BOT PRUEBA EN 3 SEGUNDOS.
 *
 * El repo es PÚBLICO E INDEXADO. `github.com/ablanquez/zetabus`. En cuanto esto
 * tenga dominio, los rastreadores van a probar `/wp-admin`, `/.env`,
 * `/parada/../../etc/passwd` y todo lo que se les ocurra.
 *
 * ⚠️ NINGUNA puede reventar. Ninguna puede enseñar nada. Y ninguna puede servir
 * una parada que el usuario no pidió — que es lo que pasaba con `0x2E8`.
 */
import { test, expect } from '@playwright/test';

/** Lo que un bot prueba. Y `0x2E8`, que es el que de verdad nos mordió. */
const BASURA = [
  ['/parada/abc', 'no es un número'],
  ['/parada/0x2E8', '⭐ Number("0x2E8") === 744. NO puede servir la parada 744'],
  ['/parada/1e3', 'notación científica: Number("1e3") === 1000'],
  ['/parada/999999', 'un poste que no existe'],
  ['/parada/-1', 'negativo'],
  ['/parada/0', 'el cero, que es lo que devuelve Number("")'],
  ['/parada/ 744 ', 'con espacios'],
  ['/parada/744.0', 'con decimales'],
  ['/linea/XX', 'una línea que no existe'],
  ['/linea/999', 'un número que no es línea'],
  ['/ruta-que-no-existe', 'una ruta inventada'],
  ['/wp-admin', 'lo primero que prueba un bot'],
  ['/.env', '⚠️ y lo segundo'],
] as const;

test.describe('⛔ RUTAS BASURA · ninguna revienta, ninguna enseña nada', () => {
  for (const [ruta, porque] of BASURA) {
    test(`${ruta} → 404 limpio  (${porque})`, async ({ page }) => {
      const res = await page.goto(ruta, { waitUntil: 'domcontentloaded' });

      // 1 · El código HTTP es 404. No 200 con una página vacía, no 500.
      expect(res?.status(), `${ruta} debería ser 404`).toBe(404);

      // 2 · ⛔ NO SE ESCAPA NADA. Ni un stack, ni una ruta del servidor, ni la
      //     ApiKey, ni el nombre de un fichero nuestro.
      const html = (await page.content()).toLowerCase();
      for (const veneno of [
        'at object.', // el principio de un stack trace de Node
        'node_modules',
        'f:\\', // una ruta absoluta de la máquina
        '/src/', // la estructura del proyecto
        'apikey',
        'econnrefused',
        '.ts:', // fichero:línea
      ]) {
        expect(html, `${ruta} está enseñando "${veneno}"`).not.toContain(veneno);
      }

      // 3 · Y es NUESTRA página, con salida. No el 404 pelado de Next.
      await expect(page.locator('[data-papel="volver-al-indice"]')).toBeVisible();
    });
  }

  /**
   * ⭐⭐ LA CONTRAPRUEBA. Y es la que importa, porque `0x2E8` NO es un caso
   * hipotético: `Number("0x2E8")` vale **744**, que es una parada REAL de Zaragoza.
   *
   * Si el guardia no exigiera dígitos, esta URL serviría la parada 744 con toda la
   * naturalidad del mundo — nombre, autobuses, mapa —. **No fallaría: MENTIRÍA.**
   * Y ese es el modo de fallo que este proyecto existe para no tener.
   */
  test('⭐ CONTRAPRUEBA · sin el guardia, /parada/0x2E8 SERVIRÍA la parada 744', async ({ page }) => {
    // Se demuestra el peligro con el propio JavaScript del navegador, que es el
    // que haría la conversión. No es una opinión sobre `Number`: es `Number`.
    const loQueHariaNumber = await page.evaluate(() => ({
      hex: Number('0x2E8'),
      cientifica: Number('1e3'),
      vacio: Number(''),
      espacios: Number(' 744 '),
    }));
    expect(loQueHariaNumber.hex).toBe(744); // ⛔ una parada REAL
    expect(loQueHariaNumber.cientifica).toBe(1000);
    expect(loQueHariaNumber.vacio).toBe(0); // ⛔ el vacío se colaría como poste 0
    expect(loQueHariaNumber.espacios).toBe(744);

    // Y ahora la realidad: NUESTRA app las rechaza las cuatro.
    for (const r of ['/parada/0x2E8', '/parada/1e3', '/parada/0', '/parada/ 744 ']) {
      const res = await page.goto(r, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `${r} NO puede resolver`).toBe(404);
    }

    // …y la de verdad sí, para que no estemos aprobando un 404 universal.
    const buena = await page.goto('/parada/744', { waitUntil: 'domcontentloaded' });
    expect(buena?.status()).toBe(200);
  });
});
