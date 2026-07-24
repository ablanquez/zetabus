/**
 * ⭐⭐ CAPA 1 · EL BARRIDO TOTAL. Las ~1.000 páginas, a dos anchos, con lo BARATO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  PARA QUÉ EXISTE: **CAZAR EL CASO RARO.** La parada con el nombre imposible, la
 *  línea cuyo dato rompe el layout, el poste que da 500. Ninguna otra prueba de este
 *  repo puede encontrarlos, porque todas miran casos ELEGIDOS — y el caso raro, por
 *  definición, no está en la lista de nadie.
 *
 *  NO sustituye al barrido fino (Capa 2): aquí no se mide contraste, ni táctiles, ni
 *  teclado. Aquí se mira lo que se puede mirar 2.024 veces sin que cueste una tarde.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ CERO PETICIONES A AVANZA, Y NO ES UN DETALLE. El proyecto promete por escrito no
 *    abusar del operador. Cada URL lleva su `?fingir=`, que hace que `transporteDe()`
 *    devuelva el transporte FINGIDO: intercepta TODAS las peticiones. Las 2.024 cargas
 *    hacen exactamente **0** peticiones a Avanza. (Y `ZETABUS_DEMO=1` lo pone el
 *    webServer de playwright.config; sin eso `?fingir=` se ignoraría — ya mintió así.)
 *
 * ⚠️ Y CERO PETICIONES A OPENSTREETMAP. La página de parada lleva un mapa de Leaflet:
 *    934 paradas × sus teselas es machacar a un tercero igual que a Avanza. Se abortan
 *    TODAS las peticiones que salen de localhost. ⇒ El mapa sale gris. Se declara: este
 *    barrido NO juzga el interior del mapa, solo su caja.
 *
 * ⚠️ LOS DETECTORES SON LOS DE `lib/medir.ts`, NO COPIAS. Cada uno lleva dentro la
 *    cicatriz de sus falsos positivos (los 8 desbordes de la referencia, los 7 `sr-only`
 *    que parecían truncados). Reescribirlos aquí sería estrenar esos fallos otra vez.
 *
 * ⚠️ SU CONTRAPRUEBA VIVE EN `barrido-contraprueba.spec.ts`. Un barrido que dice
 *    "1.012 OK" puede estar simplemente sin mirar nada. Sin ese rojo, esto no vale.
 *
 *      npx playwright test e2e/barrido-total.spec.ts --project=360px --project=1280px
 *      BARRIDO_MUESTRA=20 ...   ← piloto, para medir el coste antes de lanzarlo entero
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { desbordes, truncados, scrollHorizontal } from './lib/medir';

interface Entrada { url: string; tipo: 'linea' | 'parada' | 'especial'; que: string }

const TODAS: Entrada[] = JSON.parse(readFileSync('e2e/lib/urls-barrido.json', 'utf8'));
/** Piloto: solo las N primeras de cada tipo, para medir el coste real. */
const MUESTRA = Number(process.env.BARRIDO_MUESTRA ?? 0);
const URLS: Entrada[] = MUESTRA > 0
  ? (['linea', 'parada', 'especial'] as const).flatMap((t) => TODAS.filter((e) => e.tipo === t).slice(0, MUESTRA))
  : TODAS;

/** En cuántos trozos se parte el barrido. Cada trozo es un test → un worker. */
const TROZOS = Number(process.env.BARRIDO_TROZOS ?? 8);
const SALIDA = 'e2e/.barrido';

/** Solo estos dos anchos: uno de cada lado del corte de 880, donde el layout cambia. */
const ANCHOS = ['360px', '1280px'];

export interface Hallazgo {
  url: string;
  tipo: string;
  que: string;
  ancho: string;
  /** La causa. Se AGRUPA por esto: 200 páginas con el mismo síntoma son UN hallazgo. */
  causa: string;
  detalle: string;
}

async function revisarUna(page: Page, e: Entrada, ancho: string): Promise<{ hallazgos: Hallazgo[]; ms: number }> {
  const hallazgos: Hallazgo[] = [];
  const anota = (causa: string, detalle: string) =>
    hallazgos.push({ url: e.url, tipo: e.tipo, que: e.que, ancho, causa, detalle });

  // La consola y las excepciones de React, recogidas SOLO de esta página.
  //
  // ⚠️⚠️ EL INSTRUMENTO SE DELATÓ EN EL PILOTO: 112 de 116 "errores de consola" eran
  //    MÍOS. Al abortar las teselas de OSM (para no machacar a un tercero), el navegador
  //    escribe `Failed to load resource: net::ERR_FAILED` — y yo lo estaba contando como
  //    defecto de la página. Un detector que grita 112 veces por su propia mano es un
  //    detector apagado: con ese ruido, el ÚNICO hallazgo real (la home sin <h1>) estaba
  //    enterrado. Se filtran los fallos de RECURSO, que son consecuencia del bloqueo...
  const consola: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => {
    const t = m.text();
    if (t.startsWith('Failed to load resource')) return; // ← causado por el bloqueo, no por la página
    if (m.type() === 'error') consola.push(t.slice(0, 200));
  };
  const onError = (err: Error) => consola.push(`pageerror: ${err.message.slice(0, 200)}`);
  // ...y a cambio se vigilan a mano las peticiones a LOCALHOST que fallan, que ésas SÍ
  // son de la app y no las aborta nadie. Así el filtro de arriba no abre un agujero.
  const onFallo = (req: { url(): string; failure(): { errorText: string } | null }) => {
    if (!req.url().startsWith('http://localhost')) return;
    // ⚠️ Y AQUÍ SE DELATÓ OTRA VEZ: 1.471 "recursos propios caídos" eran los PREFETCH de
    //    Next (`_next/static/chunks`, `?_rsc=`) que MI PROPIA navegación cancelaba al
    //    pasar a la siguiente URL. `ERR_ABORTED` = "lo aborté yo", no "la app falló".
    const err = req.failure()?.errorText ?? '';
    if (err.includes('ERR_ABORTED')) return;
    consola.push(`recurso propio caído (${err}): ${req.url().slice(-60)}`);
  };
  page.on('console', onConsole);
  page.on('pageerror', onError);
  page.on('requestfailed', onFallo);

  const t0 = Date.now();
  let estado = 0;
  try {
    const r = await page.goto(e.url, { waitUntil: 'load', timeout: 30_000 });
    estado = r?.status() ?? 0;
  } catch (err) {
    anota('la página no carga', (err as Error).message.slice(0, 160));
  }
  const ms = Date.now() - t0;

  const esperado = e.que === '404' ? 404 : 200;
  if (estado !== 0 && estado !== esperado) anota(`estado HTTP ${estado}`, `se esperaba ${esperado}`);

  if (estado === esperado) {
    /**
     * ⚠️⚠️ SE MIDE DOS VECES, Y NO ES PARANOIA: ES UN FALLO QUE YA COMETIÓ ESTE BARRIDO.
     *
     * La primera corrida cantó 168 desbordes (`rect`/`path` a x≈455 en 84 paradas). Al ir
     * a mirarlos UNO A UNO, en secuencial, salieron **0 de 18**. No existían: con 6
     * workers en paralelo el servidor va cargado, `load` dispara ANTES de que Leaflet
     * termine de colocar su panel de marcadores, y el detector fotografiaba el mapa a
     * medio montar. Medía bien un estado que el usuario no llega a ver.
     *
     * ⇒ Si la primera medida encuentra algo, se deja respirar y se VUELVE A MEDIR. Solo
     *   se reporta lo que SIGUE ahí. Un defecto de verdad no se cura solo en 250 ms; un
     *   transitorio, sí. Y el coste se paga únicamente cuando hay algo que confirmar.
     */
    let [fuera, cortados, scroll] = await Promise.all([
      desbordes(page), truncados(page), scrollHorizontal(page),
    ]);
    if (fuera.length > 0 || cortados.length > 0 || scroll > 0) {
      await page.waitForTimeout(250);
      [fuera, cortados, scroll] = await Promise.all([
        desbordes(page), truncados(page), scrollHorizontal(page),
      ]);
    }
    if (scroll > 0) anota('scroll horizontal', `${scroll} px de más`);
    for (const c of fuera) anota('se sale de la pantalla', `${c.etiqueta} · ${c.detalle} · "${c.texto}"`);
    for (const c of cortados) anota('texto cortado', `${c.etiqueta} · ${c.detalle} · "${c.texto}"`);

    // Los elementos clave que TIENEN que existir en toda página con contenido.
    if (e.que !== '404') {
      const clave = await page.evaluate(() => ({
        h1: document.querySelectorAll('h1').length,
        marca: !!document.querySelector('[data-papel="marca-wordmark"]'),
        pie: !!document.querySelector('footer'),
        titulo: document.title,
      }));
      if (clave.h1 !== 1) anota('h1 que no es exactamente uno', `hay ${clave.h1}`);
      if (!clave.marca) anota('falta la marca', 'no hay [data-papel="marca-wordmark"]');
      if (!clave.pie) anota('falta el pie', 'no hay <footer>');
      if (!clave.titulo.startsWith('ZetaBus')) anota('título que no empieza por ZetaBus', clave.titulo.slice(0, 80));
    }
  }

  for (const c of consola) anota('error de consola', c);

  page.off('console', onConsole);
  page.off('pageerror', onError);
  page.off('requestfailed', onFallo);
  return { hallazgos, ms };
}

test.describe('⭐ CAPA 1 · barrido total', () => {
  // ⚠️ Sin timeout de test: un trozo son ~130 páginas. El límite real es el del `goto`.
  test.setTimeout(30 * 60_000);

  for (let i = 0; i < TROZOS; i++) {
    test(`trozo ${i + 1}/${TROZOS}`, async ({ page }, info) => {
      const ancho = info.project.name;
      test.skip(!ANCHOS.includes(ancho), 'la Capa 1 barre a 360 y 1280 (los dos lados del corte)');

      // ⚠️ Nada sale de localhost: ni teselas de OSM, ni fuentes, ni analítica.
      await page.route('**/*', (ruta) => {
        const u = ruta.request().url();
        if (u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) return ruta.continue();
        return ruta.abort();
      });

      const mias = URLS.filter((_, n) => n % TROZOS === i);
      const hallazgos: Hallazgo[] = [];
      const tiempos: { que: string; ms: number }[] = [];

      for (const e of mias) {
        const r = await revisarUna(page, e, ancho);
        hallazgos.push(...r.hallazgos);
        tiempos.push({ que: `${e.tipo}:${e.que}`, ms: r.ms });
      }

      mkdirSync(SALIDA, { recursive: true });
      writeFileSync(
        `${SALIDA}/${ancho}-${i}.json`,
        JSON.stringify({ ancho, trozo: i, paginas: mias.length, hallazgos, tiempos }),
      );

      console.log(`  [${ancho}] trozo ${i + 1}/${TROZOS}: ${mias.length} páginas · ${hallazgos.length} hallazgos`);
      // El test NO falla por hallazgos: su trabajo es RECOGERLOS todos. El veredicto
      // se da al agregar (si fallara aquí, el barrido se pararía en la primera y no
      // sabríamos si el síntoma está en 1 página o en 200).
      expect(mias.length).toBeGreaterThan(0);
    });
  }
});
