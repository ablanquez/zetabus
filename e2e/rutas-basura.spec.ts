/**
 * ⭐ A4 · LAS RUTAS QUE NADIE ESCRIBE A MANO. Y QUE UN BOT PRUEBA EN 3 SEGUNDOS.
 *
 * El repo es PÚBLICO E INDEXADO. `github.com/ablanquez/zetabus`. En cuanto esto
 * tenga dominio, los rastreadores van a probar `/wp-admin`, `/.env`,
 * `/parada/../../etc/passwd` y todo lo que se les ocurra.
 *
 * ⚠️ NINGUNA puede reventar. Ninguna puede enseñar nada. Y ninguna puede servir
 * una parada que el usuario no pidió — que es lo que pasaba con `0x2E8`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SI ALGUNA VEZ VES ESTE SPEC EN ROJO EN UNA SUITE COMPLETA (p. ej. `/linea/999
 *    → 404` a 1920), NO EMPIECES DE CERO: ya se investigó. Veredicto: ENTORNO, no el
 *    test. La evidencia, para que no se re-investigue:
 *      · La ruta es un 404 DETERMINISTA: `/linea/999` hace `notFound()` ANTES de tocar
 *        Avanza (lookup fallido), y responde en ~79 ms en frío. No depende de datos, ni
 *        de red, ni de hidratación. No hay estado que se pueda quedar a medias.
 *      · Se corrió >100 veces en aislamiento y en contención máxima (30× a 1920, y 15×
 *        en los 5 viewports a la vez = 1050 casos): CERO fallos.
 *      · El único fallo se vio en la SUITE COMPLETA, donde ~14 workers martillean un
 *        único server Node en Windows. El fallo está en el TRANSPORTE (el `goto`), no en
 *        lo que el test mide: churn de conexiones cortas / stall del event-loop del
 *        server por el trabajo síncrono de otra ruta. Es carga, no lógica.
 *    ⇒ NO se le pone retry: la config es `retries: 0` a propósito (*"un test que pasa al
 *      segundo intento no ha pasado"*). Un retry aquí escondería un 404 que de verdad
 *      fallara. Si reaparece, mira la carga del server, no este fichero.
 * ═══════════════════════════════════════════════════════════════════════════
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
        // ⚠️ LA RUTA REAL DE LA MÁQUINA, NO un genérico "f:\". El genérico daba un
        //    FALSO POSITIVO: el stream RSC de React Flight numera sus filas en hex
        //    (`1:`, `2:`… `f:`, `10:`…), y la fila `f:` seguida de `\"` produce la
        //    subcadena "f:\" sin que se filtre ninguna ruta. Cuando la carga del 404
        //    creció (fuente Inter + <Marca>) llegó por primera vez a la fila 15 y el
        //    test se puso rojo por el protocolo, no por un leak. Se comprueba lo que
        //    de verdad importa: que NO aparezca el path absoluto de ESTE proyecto.
        process.cwd().toLowerCase(),
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
