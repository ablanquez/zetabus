/**
 * VERIFICACIÓN VISUAL. Un navegador de verdad, a los tamaños de una persona.
 *
 * Playwright es lo que la documentación oficial de Next documenta para E2E
 * (`node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`), y de
 * paso dice algo que aquí importa:
 *
 *   > "Since async Server Components are new to the React ecosystem, some tools
 *   >  do not fully support them. In the meantime, we recommend using
 *   >  End-to-End Testing over Unit Testing for async components."
 *
 * Nuestras pantallas van a ser Server Components async que leen el motor vivo.
 * O sea: **esto no es un extra, es el único sitio donde se pueden probar.**
 *
 * ⚠️ Y CONTRA PRODUCCIÓN, NO CONTRA `dev`. También lo dice la doc:
 *   > "We recommend running your tests against your production code to more
 *   >  closely resemble how your application will behave."
 *   `next dev` no minifica, no hace tree-shaking y sirve CSS de otra manera.
 *   Un layout que aguanta en dev puede romperse en producción.
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * ⚠️ LOS TAMAÑOS SON LOS DEL USUARIO, NO LOS DE MI PANTALLA.
 *
 *   360 · el suelo. Un Android básico. Si aquí se rompe, está roto.
 *   390 · iPhone moderno. La mitad del tráfico real.
 *   768 · tablet / el breakpoint `md:` de Tailwind, justo donde cambia todo.
 *  1280 · portátil.
 *  1920 · escritorio.
 *
 * El de 360 NO es un caso extremo del que presumir: es un móvil normal de
 * alguien que está DE PIE, EN LA CALLE, CON PRISA. Es el caso principal.
 */
export const VIEWPORTS = {
  '360': { width: 360, height: 740 },
  '390': { width: 390, height: 844 },
  '768': { width: 768, height: 1024 },
  '1280': { width: 1280, height: 800 },
  '1920': { width: 1920, height: 1080 },
} as const;

export default defineConfig({
  testDir: './e2e',
  // Vitest se queda con `tests/**/*.test.ts`; Playwright, con `e2e/**/*.spec.ts`.
  // Los dos exportan un `test` global: si se cruzaran, uno cargaría los ficheros
  // del otro y fallaría con un error que no dice nada de lo que pasa.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // ⚠️ un test visual que pasa "al segundo intento" NO ha pasado
  reporter: [['list']],

  use: {
    baseURL: process.env.ZETABUS_URL ?? 'http://localhost:3000',
    // Una traza de la primera vez que algo falla. No de los reintentos: no hay.
    trace: 'retain-on-failure',
    screenshot: 'off', // las capturas se piden a mano y SIN fullPage
    // Un móvil real tiene DPR 2-3. Con DPR 1 se pierden los defectos de
    // subpíxel y los bordes de 0,5 px que en un teléfono se ven feísimos.
    deviceScaleFactor: 2,
  },

  projects: Object.entries(VIEWPORTS).map(([nombre, viewport]) => ({
    name: `${nombre}px`,
    use: { ...devices['Desktop Chrome'], viewport, deviceScaleFactor: 2 },
  })),

  // ⚠️ Contra el build de PRODUCCIÓN, como manda la doc oficial.
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    /**
     * ⚠️⚠️ `reuseExistingServer: !process.env.CI` ME MINTIÓ TRES VECES EN UN DÍA.
     *
     * Reutilizaba el `next start` que yo tenía levantado a mano en otra terminal.
     * Y ese servidor tenía OTRO BUILD. Consecuencias reales, las tres silenciosas:
     *
     *   1. Los tests del barrido medían el código de la tanda ANTERIOR: decían
     *      `"paso": 4, "total": 18` cuando el código ya barría los 67 postes.
     *   2. El servidor reutilizado no tenía ZETABUS_DEMO=1 → los `?fingir=` se
     *      ignoraban y los tests corrían contra Avanza REAL... y pasaban.
     *   3. Y al aparcar el barrido, el botón "seguía ahí" — en un build de hace
     *      media hora.
     *
     * Un test que aprueba código que no es el que has escrito no es un test.
     * Y lo peor es que las tres veces el fallo fue SILENCIOSO: verde, y falso.
     *
     * ⇒ SIEMPRE SU PROPIO SERVIDOR, CON ESTE BUILD. Si el puerto está ocupado,
     *   Playwright falla EN VOZ ALTA — que es exactamente lo que quiero: prefiero
     *   un error a un verde prestado.
     */
    reuseExistingServer: false,
    timeout: 120_000,
    /**
     * ⚠️⚠️ ESTO FALTABA, Y LOS TESTS PASABAN IGUAL. QUE ES LO GRAVE.
     *
     * Los tests visuales usan `?fingir=` para provocar los casos feos (Avanza
     * caída, un coche sin ficha, un dato sin verificar). Y `fingimientoDe()`
     * exige `ZETABUS_DEMO === '1'` — con razón: un modo demo que se pueda
     * encender desde la URL en producción es una fábrica de pantallas falsas.
     *
     * Pero este servidor se levantaba SIN la variable. ⇒ `fingir` era null, el
     * fingimiento NO OCURRÍA, y los tests corrían contra los datos REALES de
     * Avanza... y pasaban, porque estaban escritos con guardas del tipo
     * "si hay algún sin_verificar, compruébalo".
     *
     * Se me pasó porque yo tenía un `ZETABUS_DEMO=1 next start` levantado a mano
     * y `reuseExistingServer` lo reutilizaba. En cuanto Playwright levantó el
     * suyo, los fingimientos desaparecieron. El verde dependía de lo que hubiera
     * dejado abierto en otra terminal.
     *
     * ⇒ La variable va AQUÍ. Y además, los tests que fingen exigen ver la banda
     *   roja del modo demo: si no está, el fingimiento no ha ocurrido y el test
     *   TIENE que fallar en vez de aprobar mirando otra cosa.
     */
    env: { ZETABUS_DEMO: '1' },
  },
});
