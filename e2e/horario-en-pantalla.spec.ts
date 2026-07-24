/**
 * ⭐⭐ EL HORARIO Y LA "INFORMACIÓN ADICIONAL", EJERCITADOS DE VERDAD POR PRIMERA VEZ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ HASTA `?fingir=horario`, **NINGUNA PRUEBA AUTOMÁTICA HABÍA TOCADO NUNCA ESTA PARTE
 *  DE LA PANTALLA.** El transporte fingido daba a la petición del horario un cuerpo de
 *  poste —"neutro" para los autobuses, ILEGIBLE para el horario—: `parsearHorarioWeb`
 *  lanzaba, la caché lo volvía `{tipo:'fallo'}`, `horarioDeLinea` devolvía `null`, y las
 *  dos cajas no se pintaban. El test que vigilaba "una sola copia de Información
 *  adicional" contaba **CERO** y pasaba: un verde que no probaba nada.
 *
 *  Y es justo la pieza donde el informe dio verde y la pantalla de Antonio dijo que no:
 *  **el horario flotando a media altura en vez de ir arriba** (L36).
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ SE MIDE LA GEOMETRÍA (dónde acabaron las cajas), no el CSS. Y la copia única se
 *    cuenta en el ÁRBOL DE ACCESIBILIDAD, no con un selector: la pregunta es "¿cuántas
 *    ANUNCIA?", no "¿cuántas hay escritas?" —hay dos en el DOM a propósito, una por
 *    ancho, y lo que importa es que solo una llegue al lector de pantalla—.
 */
import { test, expect, type Page } from '@playwright/test';

const CORTE = 880;

const sinRed = async (page: Page) => {
  await page.route('**/*', (r) => {
    const u = r.request().url();
    return u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')
      ? r.continue() : r.abort();
  });
};

/** Corre una sola vez: los anchos los mueve el propio test. */
const soloUnaVez = () => test.skip(test.info().project.name !== '1280px', 'corre una vez');

const caja = async (page: Page, sel: string) => page.locator(sel).first().boundingBox();

test.describe('⭐ el horario en pantalla', () => {
  test('⭐⭐ SIN desvío: el horario va ARRIBA, a la misma altura que el recorrido — SIN HUECO', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    for (const w of [881, 1280, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/linea/35?sentido=0&fingir=horario', { waitUntil: 'load' });

      // No hay desvío: la zona de desvíos no debe ocupar sitio arriba.
      const horario = await caja(page, '[data-papel="terminal"]');
      const recorrido = await caja(page, '.rejilla-linea > [class*="recorrido"], .rejilla-linea ol');
      expect(horario, `a ${w}px no se pintó la caja del horario`).not.toBeNull();
      expect(recorrido, `a ${w}px no se pintó el recorrido`).not.toBeNull();

      const desfase = Math.round(horario!.y - recorrido!.y);
      console.log(`   @${w}px · horario y=${Math.round(horario!.y)} · recorrido y=${Math.round(recorrido!.y)} · desfase ${desfase}px`);

      // ⚠️ ESTE ES EL FALLO QUE SE PERSIGUE: el horario "flotando" más abajo que la
      //    columna de al lado. Sin desvío no hay nada que lo empuje: arranca con él.
      expect(Math.abs(desfase), `el horario arranca ${desfase}px por debajo del recorrido: está flotando, no pegado arriba`)
        .toBeLessThanOrEqual(24);
    }
  });

  test('⭐ CON desvío: el horario va DEBAJO del aviso, y la columna queda compacta', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/linea/35?sentido=0&fingir=desviada', { waitUntil: 'load' });

    const desvio = await caja(page, '.zona-desvios-linea');
    const horario = await caja(page, '[data-papel="terminal"]');
    expect(desvio, 'no se pintó el aviso de desvío').not.toBeNull();
    expect(horario, 'no se pintó el horario').not.toBeNull();

    // Debajo del aviso, no encima ni al lado.
    expect(horario!.y, 'el horario no está debajo del aviso de desvío').toBeGreaterThan(desvio!.y);

    // Y COMPACTA: el hueco entre el pie del aviso y la cabeza del horario es pequeño.
    // (La cicatriz: hubo un hueco de ~180 px en esta misma columna.)
    const hueco = Math.round(horario!.y - (desvio!.y + desvio!.height));
    console.log(`   hueco desvío→horario: ${hueco}px`);
    expect(hueco, `hueco de ${hueco}px entre el aviso y el horario`).toBeLessThanOrEqual(48);
  });

  test('⭐ "Información adicional": UNA sola copia ANUNCIADA, y en el sitio de cada ancho', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    for (const w of [360, 390, 768, 879, 881, 1280, 1920]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto('/linea/35?sentido=0&fingir=horario', { waitUntil: 'load' });

      const n = await page.getByRole('heading', { name: /Información adicional/i }).count();
      expect(n, `a ${w}px se anuncian ${n} copias de "Información adicional"`).toBe(1);

      // ⚠️ Y EN EL SITIO QUE TOCA, medido por geometría:
      //    · por encima del corte → columna DERECHA (empieza pasada la mitad);
      //    · por debajo → dentro del recorrido (columna única, pegada a la izquierda).
      // ⚠️ `:visible` NO ES ADORNO. Hay DOS copias en el DOM a propósito (una por
      //    ancho) y la de móvil va PRIMERA. Con `.first()` a secas, por encima del corte
      //    se cogía la oculta y `boundingBox()` devolvía null: el test cantaba "no hay
      //    caja de info adicional" a 881 con la caja perfectamente pintada a la derecha.
      //    Medía la copia equivocada. Se pide la que SE VE, que es la que ocupa sitio.
      const c = await caja(page, '[data-papel="info-adicional"]:visible');
      expect(c, `a ${w}px no hay caja de info adicional VISIBLE`).not.toBeNull();
      const enDerecha = c!.x > w / 2;
      console.log(`   @${w}px · info en x=${Math.round(c!.x)} → ${enDerecha ? 'columna derecha' : 'columna única'}`);
      expect(enDerecha, `a ${w}px la info adicional está ${enDerecha ? 'a la derecha' : 'a la izquierda'}`)
        .toBe(w > CORTE);
    }
  });

  test('⭐ una línea SIN horario no deja hueco ni caja vacía', async ({ page }) => {
    soloUnaVez();
    await sinRed(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    // `solo-oficiales` no sirve página de horario → `horarioDeLinea` devuelve null.
    await page.goto('/linea/N1?sentido=0&fingir=solo-oficiales', { waitUntil: 'load' });
    expect(await page.locator('[data-papel="terminal"]').count(), 'sin horario no debe pintarse la caja').toBe(0);
    expect(await page.getByRole('heading', { name: /Información adicional/i }).count()).toBe(0);
  });
});
