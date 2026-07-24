/**
 * ⭐⭐ LA CONTRAPRUEBA DEL BARRIDO TOTAL. Sin esto, la Capa 1 no vale nada.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL PROBLEMA QUE RESUELVE: un barrido puede decir **"1.012 páginas OK"** simplemente
 *  porque NO ESTÁ MIRANDO NADA. Es el mismo verde vacío que el `getByRole('heading')
 *  === 1` de esta semana: mide algo cierto y no prueba lo que uno cree.
 *
 *  ⇒ Aquí se ROMPE una página REAL de las que barre la Capa 1, con los defectos que la
 *    Capa 1 dice cazar, y se exige que los detectores los canten. Si no los cantan, el
 *    barrido es decorativo y hay que tirarlo.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ SE USAN LAS MISMAS FUNCIONES QUE EL BARRIDO (`lib/medir.ts`), no unas parecidas.
 *    Probar una copia demostraría que la copia funciona. (L42: una copia a mano es una
 *    afirmación, no código.)
 *
 * ⚠️ Y CADA DEFECTO SE PRUEBA POR SUS DOS LADOS: primero la página LIMPIA no lo tiene
 *    (si lo tuviera, el rojo de abajo no probaría nada — estaría cazando otra cosa),
 *    luego se inyecta y TIENE que aparecer, y al quitarlo tiene que desaparecer.
 */
import { test, expect } from '@playwright/test';
import { desbordes, truncados, scrollHorizontal } from './lib/medir';

/** Una de las páginas que la Capa 1 barre de verdad, con su mismo `?fingir=`. */
const PAGINA = '/parada/744?fingir=solo-oficiales';

test.describe('⭐ CONTRAPRUEBA · el barrido caza lo que dice cazar', () => {
  test.beforeEach(async ({ page }) => {
    // Mismo bloqueo que el barrido: nada sale de localhost.
    await page.route('**/*', (r) => {
      const u = r.request().url();
      return u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')
        ? r.continue()
        : r.abort();
    });
    await page.goto(PAGINA, { waitUntil: 'load' });
  });

  test('⭐ TEXTO CORTADO · limpia no tiene; inyectado se caza; quitado desaparece', async ({ page }) => {
    // 1 · LIMPIA. Si ya hubiera truncados, el rojo de después no probaría nada.
    expect(await truncados(page), 'la página limpia NO debe tener texto cortado').toHaveLength(0);

    // 2 · SE ROMPE: un nombre largo en una caja estrecha con ellipsis. Es EXACTAMENTE
    //     el defecto prohibido: "Hu…" puede ser Hugo o Humberto.
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'veneno-truncado';
      d.style.cssText = 'width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      d.textContent = 'Vía Hispanidad n.º 73 / Nuestra Señora de Los Ángeles';
      document.body.appendChild(d);
    });
    const cazados = await truncados(page);
    expect(cazados.length, 'el barrido TIENE que cazar el texto cortado').toBeGreaterThan(0);
    expect(cazados.some((c) => c.texto.includes('Hispanidad'))).toBe(true);
    console.log(`  ⛔ CAZADO texto cortado: ${cazados[0].detalle}`);

    // 3 · SE QUITA y vuelve a estar limpio (el detector no se queda "encendido").
    await page.evaluate(() => document.getElementById('veneno-truncado')?.remove());
    expect(await truncados(page)).toHaveLength(0);
  });

  test('⭐ DESBORDE Y SCROLL HORIZONTAL · limpia no tiene; inyectado se caza', async ({ page }) => {
    expect(await desbordes(page), 'la página limpia NO debe desbordar').toHaveLength(0);
    expect(await scrollHorizontal(page), 'la página limpia NO debe tener scroll horizontal').toBe(0);

    // Un bloque que se sale por la derecha, sin ancestro que lo recorte ni lo deslice.
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.id = 'veneno-desborde';
      d.style.cssText = 'position:relative;left:0;width:3000px;height:30px;background:#c00';
      d.textContent = 'me salgo de la pantalla';
      document.body.appendChild(d);
    });

    const fuera = await desbordes(page);
    const scroll = await scrollHorizontal(page);
    // ⚠️ No basta "algo saltó": tiene que cazar MI defecto, por su texto. Si solo
    //    comprobara `length > 0`, un falso positivo cualquiera daría el test por bueno.
    expect(fuera.some((c) => c.texto.includes('me salgo')), 'tiene que cazar EL bloque inyectado').toBe(true);
    expect(scroll, 'y el scroll horizontal exacto que provoca (3000 − 360)').toBe(2640);
    console.log(`  ⛔ CAZADO desborde: ${fuera[0].detalle}  ·  scroll horizontal: ${scroll} px`);

    // 3 · Y se vuelve a la página limpia RECARGANDO, no quitando el nodo.
    //     ⚠️ Quitarlo no basta, y el matiz es del propio instrumento: al ensanchar el
    //     documento a 3.000 px, Leaflet redibuja sus marcadores SVG en coordenadas
    //     nuevas y NO los recoloca al estrecharlo (le haría falta un `invalidateSize`).
    //     Quedaban dos `<rect>/<path>` del mapa fuera de pantalla y el detector los
    //     cantaba — CON RAZÓN: estaban fuera. Era mi inyección lo que los puso ahí, no
    //     la app. Un usuario no inyecta un bloque de 3.000 px; se recarga y se mide la
    //     página de verdad, en vez de dar por bueno un estado que yo mismo he ensuciado.
    await page.reload({ waitUntil: 'load' });
    expect(await desbordes(page)).toHaveLength(0);
    expect(await scrollHorizontal(page)).toBe(0);
  });

  test('⭐ ERROR DE CONSOLA · una excepción de verdad SÍ se recoge (el filtro no la tapa)', async ({ page }) => {
    // ⚠️ El barrido filtra `Failed to load resource` porque son SUS PROPIOS abortos de
    //    teselas. Hay que probar que ese filtro NO se ha comido también los errores de
    //    verdad — si no, el filtro habría creado un punto ciego.
    const recogidos: string[] = [];
    page.on('console', (m) => {
      const t = m.text();
      if (t.startsWith('Failed to load resource')) return; // el MISMO filtro del barrido
      if (m.type() === 'error') recogidos.push(t);
    });
    page.on('pageerror', (e) => recogidos.push(`pageerror: ${e.message}`));

    await page.evaluate(() => {
      console.error('esto es un error de verdad de la aplicación');
      setTimeout(() => { throw new Error('excepción no capturada de verdad'); }, 0);
    });
    await page.waitForTimeout(200);

    expect(recogidos.some((r) => r.includes('de verdad de la aplicación')), 'el console.error real NO puede filtrarse').toBe(true);
    expect(recogidos.some((r) => r.includes('excepción no capturada')), 'la excepción real NO puede filtrarse').toBe(true);
    console.log(`  ⛔ CAZADOS ${recogidos.length} errores reales pese al filtro de recursos`);
  });
});
