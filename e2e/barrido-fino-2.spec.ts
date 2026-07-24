/**
 * ⭐⭐ CAPA 2 (segunda parte) · LAS REGLAS QUE NO SE VEN EN UNA CAPTURA.
 *
 * La primera parte mide geometría bruta (desbordes, truncados, táctiles) en los ocho
 * encuadres. Aquí van las reglas CONCRETAS del encargo, que exigen medir una relación
 * —no un elemento—: la regla del alto, el scroll interno anunciado, la copia única en el
 * árbol de accesibilidad, el suelo táctil de 44 (no el 24 de WCAG), y el recorrido con TAB.
 *
 * ⚠️ Todo se le pregunta AL NAVEGADOR sobre la página ya pintada. Ninguna de estas
 *    comprobaciones lee CSS ni clases: leen cajas, `scrollHeight` y el árbol de a11y.
 */
import { test, expect, type Page } from '@playwright/test';

const sinRed = async (page: Page) => {
  await page.route('**/*', (r) => {
    const u = r.request().url();
    return u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')
      ? r.continue() : r.abort();
  });
};

const soloUnaVez = () => test.skip(test.info().project.name !== '1280px', 'corre una vez');

test.describe('⭐ CAPA 2 · las reglas', () => {
  test.setTimeout(10 * 60_000);

  test('⭐ LA REGLA DEL ALTO del recorrido: C1 se ajusta, N7 se topa en la ventana', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    for (const [w, h] of [[1280, 720], [1280, 800], [1920, 1080]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const [linea, cabe] of [['C1', true], ['N7', false]] as const) {
        await page.goto(`/linea/${linea}?sentido=0&fingir=desviada`, { waitUntil: 'load' });
        const m = await page.evaluate(() => {
          // La caja del recorrido: el contenedor que scrollea la lista de paradas.
          const ol = document.querySelector('ol');
          if (!ol) return null;
          let n: HTMLElement | null = ol as HTMLElement;
          while (n && n !== document.body) {
            const s = getComputedStyle(n);
            if (s.overflowY === 'auto' || s.overflowY === 'scroll') break;
            n = n.parentElement;
          }
          const caja = (n && n !== document.body ? n : (ol as HTMLElement)).getBoundingClientRect();
          const cont = n && n !== document.body ? n : null;
          return {
            alto: Math.round(caja.height),
            ventana: window.innerHeight,
            scrollea: cont ? cont.scrollHeight > cont.clientHeight + 1 : false,
            contenido: cont ? cont.scrollHeight : 0,
          };
        });
        expect(m, `${linea} no tiene <ol> de recorrido`).not.toBeNull();
        const holgura = m!.ventana - m!.alto;
        console.log(`   ${linea} @${w}×${h}: caja ${m!.alto}px · ventana ${m!.ventana}px · holgura ${holgura}px · scroll interno=${m!.scrollea}`);
        if (cabe) {
          // ⚠️ Cabe entero → NO se estira: la caja tiene que ser MENOR que la ventana.
          expect(m!.alto, `${linea} debería ajustarse a su contenido, no estirarse`).toBeLessThan(m!.ventana);
          expect(m!.scrollea, `${linea} cabe entero: no debería scrollear por dentro`).toBe(false);
        } else {
          // ⚠️ No cabe → se topa en la ventana y scrollea por DENTRO (no la página).
          expect(m!.alto, `${linea} no cabe: la caja no puede pasarse de la ventana`).toBeLessThanOrEqual(m!.ventana);
          expect(m!.scrollea, `${linea} no cabe: tiene que scrollear por dentro`).toBe(true);
        }
      }
    }
  });

  test('⭐ EL SUELO TÁCTIL DEL PROYECTO son 44, no los 24 de WCAG — medido', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    const flojos: string[] = [];
    for (const [w, h] of [[360, 740], [881, 900], [1280, 720]] as const) {
      await page.setViewportSize({ width: w, height: h });
      for (const url of ['/', '/parada/1228?fingir=solo-oficiales', '/linea/N7?sentido=0&fingir=desviada']) {
        await page.goto(url, { waitUntil: 'load' });
        const malos = await page.evaluate(() => {
          const out: string[] = [];
          for (const n of Array.from(document.querySelectorAll<HTMLElement>('a, button, input, select, [role="button"], [role="link"]'))) {
            const s = getComputedStyle(n);
            if (s.display === 'none' || s.visibility === 'hidden') continue;
            const r = n.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            // la excepción inline de WCAG 2.5.8: enlaces dentro de una frase
            if (n.tagName === 'A' && s.display.startsWith('inline')) {
              const p = n.parentElement;
              if (p && (p.textContent ?? '').trim().length > (n.textContent ?? '').trim().length) continue;
            }
            if (r.width < 44 || r.height < 44) {
              out.push(`${n.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)} "${(n.innerText || n.getAttribute('aria-label') || '').trim().slice(0, 28)}"`);
            }
          }
          return out;
        });
        for (const m of malos) flojos.push(`[${w}×${h}] ${url.split('?')[0]} → ${m}`);
      }
    }
    console.log(`\n   zonas táctiles por debajo de 44: ${flojos.length}`);
    for (const f of [...new Set(flojos)].slice(0, 20)) console.log(`     ${f}`);
  });

  test('⭐ "Información adicional": UNA sola copia anunciada, en cada ancho', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    // La 23 es la que tiene info adicional con viñetas (la del fixture de tests).
    for (const w of [360, 768, 879, 881, 1280, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/linea/23?sentido=0&fingir=desviada', { waitUntil: 'load' });
      // ⚠️ SE CUENTA EN EL ÁRBOL DE ACCESIBILIDAD, no en el CSS: si hubiera dos copias y
      //    una estuviera oculta con `hidden`/`display:none`, aquí saldría UNA. Si las dos
      //    se anuncian, salen DOS — que es justo el defecto que se persigue.
      const n = await page.getByRole('heading', { name: /Información adicional/i }).count();
      console.log(`   @${w}px → ${n} "Información adicional" anunciadas`);
      expect(n, `a ${w}px hay ${n} copias anunciadas de "Información adicional"`).toBeLessThanOrEqual(1);
    }
  });

  test('⭐ RECORRIDO CON TAB: se llega a todo y el foco SE VE', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    for (const url of ['/', '/parada/744?fingir=dos-lineas', '/linea/35?sentido=0&fingir=desviada']) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: 'load' });
      const visitados: string[] = [];
      let sinFoco = 0;
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement | null;
          if (!a || a === document.body) return null;
          const s = getComputedStyle(a);
          const r = a.getBoundingClientRect();
          // ¿el foco se VE? outline, box-shadow o un borde distinto
          const seVe = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
          return { et: a.tagName.toLowerCase(), txt: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 24), seVe, w: Math.round(r.width), h: Math.round(r.height) };
        });
        if (!f) break;
        visitados.push(`${f.et}:${f.txt}`);
        if (!f.seVe) sinFoco++;
      }
      console.log(`   ${url.split('?')[0]}: ${visitados.length} paradas de tabulación · ${sinFoco} SIN foco visible`);
      expect(visitados.length, 'no se llega a nada con TAB').toBeGreaterThan(3);
      expect(sinFoco, `${sinFoco} elementos enfocables no enseñan el foco`).toBe(0);
    }
  });
});
