/**
 * ⭐⭐ CAPA 2 · EL BARRIDO FINO. Los peores casos REALES, a los siete anchos.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  La Capa 1 barre 1.012 páginas con lo barato. Aquí se hace lo caro sobre POCAS
 *  páginas: la frontera exacta del corte, las zonas táctiles medidas, la regla del
 *  alto, el árbol de accesibilidad, el recorrido con TAB.
 *
 *  ⚠️ LOS CASOS SON REALES Y ESTÁN VERIFICADOS HOY, no heredados de una lista vieja.
 *     Al medirlos, TRES de los que se daban por peores habían CADUCADO:
 *       · la línea más larga NO es la 21 ni la 35: es **N7, con 120 paradas**;
 *       · C1 tiene **5** paradas, no 4;
 *       · el poste 1228 tiene **10** correspondencias (3+7), no 8.
 *     Probar la lista vieja habría sido probar el pasado. (Ver `scripts` de recon.)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LOS ANCHOS: 360 · 390 · 768 · **879 y 881** · 1280 · 1920, y **1280×720** (pantalla
 *    BAJA, donde manda el alto). Los 879/881 son la FRONTERA EXACTA del corte de 880: un
 *    salto de layout se rompe ahí, no en el medio. No están en `playwright.config.ts`
 *    (que tiene cinco) y NO se toca: se conducen con `setViewportSize` desde aquí.
 *
 * ⚠️ Este spec corre bajo UN SOLO proyecto y mueve él la ventana. Si corriera bajo los
 *    cinco, mediría cinco veces lo mismo y tardaría cinco veces más.
 */
import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { desbordes, truncados, scrollHorizontal, tactilesPequenos, capturar } from './lib/medir';

const SALIDA = 'e2e/.barrido';
const CAPTURAS = 'e2e/.capturas';

/** Los ocho encuadres. El nombre es el que sale en el informe. */
const VISTAS = [
  { n: '360', w: 360, h: 740 },
  { n: '390', w: 390, h: 844 },
  { n: '768', w: 768, h: 1024 },
  { n: '879', w: 879, h: 900 }, // ⚠️ justo ANTES del corte
  { n: '881', w: 881, h: 900 }, // ⚠️ justo DESPUÉS del corte
  { n: '1280', w: 1280, h: 800 },
  { n: '1280x720', w: 1280, h: 720 }, // pantalla BAJA: aquí manda el alto
  { n: '1920', w: 1920, h: 1080 },
] as const;

/** Los peores casos reales, medidos hoy. */
const CASOS = [
  { url: '/linea/N7?sentido=0&fingir=desviada', que: 'linea N7 · 120 paradas (el recorrido MÁS LARGO)', tipo: 'linea' },
  { url: '/linea/C1?sentido=0&fingir=desviada', que: 'linea C1 · 5 paradas (el MÁS CORTO: tiene que caber sin estirarse)', tipo: 'linea' },
  { url: '/linea/N2?sentido=0&fingir=desviada', que: 'linea N2 · nombre de 60 caracteres (el más largo)', tipo: 'linea' },
  { url: '/linea/30?sentido=0&fingir=desviada', que: 'linea 30 · CIRCULAR (no debe haber banda de destinos vacía)', tipo: 'linea' },
  { url: '/parada/823?fingir=solo-oficiales', que: 'parada 823 · nombre de 53 caracteres (el más largo)', tipo: 'parada' },
  { url: '/parada/1228?fingir=solo-oficiales', que: 'parada 1228 · 10 correspondencias, 7 provisionales (el máximo)', tipo: 'parada' },
  { url: '/parada/44?fingir=solo-oficiales', que: 'parada 44 · 8 normales y CERO provisionales (la hermana SIN recuadro)', tipo: 'parada' },
  { url: '/parada/744?fingir=sin-buses', que: 'parada 744 · SIN autobuses (el vacío se DICE)', tipo: 'parada' },
  { url: '/parada/744?fingir=caido', que: 'parada 744 · Avanza CAÍDA (una columna, aviso a todo el ancho)', tipo: 'parada' },
  { url: '/', que: 'la home', tipo: 'home' },
  { url: '/sobre-los-datos', que: 'sobre los datos', tipo: 'otra' },
  { url: '/interno/sistema-visual', que: 'la guía de estilo (superficie PÚBLICA)', tipo: 'guia' },
] as const;

interface H { caso: string; vista: string; causa: string; detalle: string }
const HALLAZGOS: H[] = [];
const anota = (caso: string, vista: string, causa: string, detalle: string) =>
  HALLAZGOS.push({ caso, vista, causa, detalle });

async function sinRed(page: Page) {
  await page.route('**/*', (r) => {
    const u = r.request().url();
    return u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')
      ? r.continue() : r.abort();
  });
}

test.describe('⭐ CAPA 2 · barrido fino', () => {
  test.setTimeout(20 * 60_000);
  /** Corre UNA vez: los anchos los mueve el propio test, no los proyectos. */
  const soloUnaVez = () => test.skip(test.info().project.name !== '1280px', 'corre una vez; los anchos los mueve el test');

  test('geometría en los OCHO encuadres, sobre los peores casos reales', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    mkdirSync(CAPTURAS, { recursive: true });

    for (const caso of CASOS) {
      for (const v of VISTAS) {
        await page.setViewportSize({ width: v.w, height: v.h });
        await page.goto(caso.url, { waitUntil: 'load' });

        const [fuera, cortados, scroll, tactil] = await Promise.all([
          desbordes(page), truncados(page), scrollHorizontal(page), tactilesPequenos(page),
        ]);
        if (scroll > 0) anota(caso.que, v.n, 'scroll horizontal', `${scroll} px`);
        for (const c of fuera) anota(caso.que, v.n, 'se sale de la pantalla', `${c.etiqueta} ${c.detalle} "${c.texto}"`);
        for (const c of cortados) anota(caso.que, v.n, 'texto cortado', `${c.etiqueta} ${c.detalle} "${c.texto}"`);
        // ⚠️ El suelo táctil del proyecto es 44, pero `tactilesPequenos` usa el mínimo
        //    WCAG 2.5.8 (24). Se reportan los <24 como FALLO y los 24-43 aparte.
        for (const c of tactil) anota(caso.que, v.n, 'zona táctil < 24 (WCAG 2.5.8)', `${c.etiqueta} ${c.detalle} "${c.texto}"`);
      }
    }

    writeFileSync(`${SALIDA}/fino-geometria.json`, JSON.stringify(HALLAZGOS));
    console.log(`\n  CAPA 2 · geometría: ${CASOS.length} casos × ${VISTAS.length} encuadres = ${CASOS.length * VISTAS.length} comprobaciones · ${HALLAZGOS.length} hallazgos`);
    for (const h of HALLAZGOS.slice(0, 25)) console.log(`   ⛔ [${h.vista}] ${h.caso}\n      ${h.causa}: ${h.detalle}`);
  });

  test('⭐ EL CORTE de 880: una columna a 879, DOS a 881 — la frontera exacta', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    const fallos: string[] = [];

    for (const url of ['/parada/1228?fingir=solo-oficiales', '/linea/N7?sentido=0&fingir=desviada']) {
      for (const v of [{ n: '879', w: 879 }, { n: '881', w: 881 }]) {
        await page.setViewportSize({ width: v.w, height: 900 });
        await page.goto(url, { waitUntil: 'load' });

        /**
         * ⚠️ SE MIDE DÓNDE ACABARON LAS CAJAS, no `grid-template-areas`.
         *
         * ⚠️⚠️ Y LA PRIMERA VERSIÓN DE ESTE DETECTOR DIO UN FALSO ROJO. Miraba los hijos
         *    de `<main>` y exigía que midieran >100 px de alto. En /parada funcionaba (su
         *    columna derecha es UN bloque alto), pero en /linea la derecha son VARIOS
         *    bloques bajos —desvío, horario, info— y ninguno llegaba al umbral: cantó
         *    "una columna" a 881, a 1280 y hasta a 1920. Fui a mirarlo y `div.rejilla-linea`
         *    estaba en `grid` con `cols=752px 380px` en TODAS las líneas: las dos columnas
         *    estaban ahí desde el principio. **El defecto era del instrumento, no de la
         *    página** — y habría entrado en la lista de fallos como si fuera de la app.
         *
         * ⇒ Ahora se mide LA REJILLA (el contenedor que de verdad reparte) y se cuentan
         *   las COLUMNAS DISTINTAS que ocupan sus hijos, sin exigirles altura.
         */
        const cols = await page.evaluate(() => {
          const rej = document.querySelector<HTMLElement>('[class*="rejilla-"]');
          if (!rej) return -1;
          const xs = Array.from(rej.children)
            .map((c) => c.getBoundingClientRect())
            .filter((b) => b.width > 40 && b.height > 10)
            .map((b) => Math.round(b.left));
          // columnas distintas = grupos de x separados por más de 80 px
          const unicas: number[] = [];
          for (const x of xs) if (!unicas.some((u) => Math.abs(u - x) <= 80)) unicas.push(x);
          return unicas.length;
        });
        const esperado2col = v.n === '881';
        const hay2col = cols >= 2;
        console.log(`   ${url.split('?')[0]} @${v.n}px → ${hay2col ? 'DOS columnas' : 'una columna'}`);
        if (hay2col !== esperado2col) {
          fallos.push(`${url} @${v.n}: ${hay2col ? 'dos columnas' : 'una columna'}, se esperaba ${esperado2col ? 'dos' : 'una'}`);
        }
      }
    }
    for (const f of fallos) anota('corte 880', 'frontera', 'el corte no cae donde debe', f);
    expect(fallos, `la frontera del corte falla:\n${fallos.join('\n')}`).toEqual([]);
  });

  test('⭐ LOS TÍTULOS, leídos del navegador (no del código)', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    const vistos: { url: string; titulo: string }[] = [];
    for (const url of ['/', '/sobre-los-datos', '/interno/sistema-visual',
      '/linea/N7?sentido=0&fingir=desviada', '/parada/823?fingir=solo-oficiales', '/esta-ruta-no-existe-jamas']) {
      await page.goto(url, { waitUntil: 'load' });
      vistos.push({ url, titulo: await page.title() });
    }
    for (const v of vistos) console.log(`   ${v.url.padEnd(46)} "${v.titulo}"`);
    for (const v of vistos) {
      if (!v.titulo.startsWith('ZetaBus')) anota(v.url, '-', 'título que no empieza por ZetaBus', v.titulo);
    }
    writeFileSync(`${SALIDA}/fino-titulos.json`, JSON.stringify(vistos));
  });

  test('⭐ CAPTURAS de página entera (viewport), para MIRARLAS con los ojos', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    mkdirSync(CAPTURAS, { recursive: true });
    // ⚠️ `capturar` usa fullPage:false A PROPÓSITO: una captura fullPage expande el
    //    documento y enseña como visible lo que en un navegador real está fuera.
    const quiero: { url: string; n: string; v: (typeof VISTAS)[number] }[] = [];
    for (const [url, n] of [
      ['/linea/N7?sentido=0&fingir=desviada', 'linea-N7'],
      ['/linea/C1?sentido=0&fingir=desviada', 'linea-C1'],
      ['/parada/1228?fingir=solo-oficiales', 'parada-1228'],
      ['/parada/823?fingir=solo-oficiales', 'parada-823'],
      ['/', 'home'],
      ['/interno/sistema-visual', 'guia'],
    ] as const) {
      for (const v of VISTAS) {
        if (!['360', '881', '1280x720', '1920'].includes(v.n)) continue;
        quiero.push({ url, n, v });
      }
    }
    for (const q of quiero) {
      await page.setViewportSize({ width: q.v.w, height: q.v.h });
      await page.goto(q.url, { waitUntil: 'load' });
      await capturar(page, `${CAPTURAS}/${q.n}-${q.v.n}.png`);
    }
    console.log(`   ${quiero.length} capturas de viewport en ${CAPTURAS}/`);
  });
});
