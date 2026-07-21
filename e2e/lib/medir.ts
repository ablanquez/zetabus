/**
 * EL INSTRUMENTO. Mide LA PANTALLA, no el código.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ EL ERROR QUE ESTE FICHERO EXISTE PARA NO REPETIR.
 *
 * En la auditoría de la referencia se afirmó que "pintaba autobuses en el golfo
 * de Guinea". Era FALSO. El `?? 0` estaba en el backend, sí — pero el mapa lo
 * filtraba antes de pintar. **Se leyó una capa y se afirmó sobre otra.**
 *
 * Verificar el JSON con `curl` NO ES haber mirado la pantalla.
 * Leer una clase de Tailwind NO ES haber visto el color.
 * Que el texto DIGA "articulado" NO PRUEBA que se vea.
 *
 * Aquí se le pregunta AL NAVEGADOR, y en algunos casos AL PÍXEL.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y LA REGLA QUE MÁS DUELE: `fullPage: false`. SIEMPRE.
 *
 * Una captura `fullPage` EXPANDE el documento hasta que cabe todo, y entonces
 * elementos que en un navegador real están FUERA DE PANTALLA aparecen en la
 * imagen tan tranquilos. La captura sale preciosa y la pantalla estaba rota.
 * Se captura EL VIEWPORT, que es lo que ve una persona.
 */

import { expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

// ─────────────────────────────────────────────────────────────────────────────
//  EL PÍXEL REAL. No el color declarado: el que el navegador acabó pintando.
// ─────────────────────────────────────────────────────────────────────────────

export interface Rgb { r: number; g: number; b: number }

export const aHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/**
 * Lee el color de UN PÍXEL de la pantalla, como lo ve un ojo.
 *
 * ⚠️ POR QUÉ NO VALE `getComputedStyle().backgroundColor`:
 *
 *     background: rgba(22, 163, 74, 0.18)   ← "verde"
 *     sobre un fondo gris #F1F5F9
 *
 * `getComputedStyle` devuelve "rgba(22, 163, 74, 0.18)" y uno se queda tan
 * ancho: hay verde, el dato está, el color está. **Y en pantalla es #DDE6DE.**
 * Que es GRIS. Un gris con un poquito de envidia.
 *
 * El alfa, la opacidad heredada, el `mix-blend-mode`, un `filter`, una capa
 * encima... todo eso ocurre DESPUÉS del CSS declarado. La única forma de saber
 * qué color hay ahí es MIRAR EL PÍXEL.
 */
export async function pixel(page: Page, x: number, y: number): Promise<Rgb> {
  const buf = await page.screenshot({ fullPage: false });
  const png = PNG.sync.read(buf);
  const escala = png.width / page.viewportSize()!.width; // DPR
  const px = Math.round(x * escala);
  const py = Math.round(y * escala);
  if (px < 0 || py < 0 || px >= png.width || py >= png.height) {
    throw new Error(`El punto (${x}, ${y}) está FUERA DEL VIEWPORT. No hay píxel que mirar.`);
  }
  const i = (png.width * py + px) << 2;
  return { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] };
}

/**
 * Muchos píxeles de una sola captura. Una captura por llamada, no N.
 *
 * ⚠️⚠️ ESTA FUNCIÓN MENTÍA EN SILENCIO, Y ME MORDIÓ MIDIENDO LOS NODOS (C6).
 *
 * `pixel()` (singular) revienta si el punto cae FUERA del viewport. Ésta NO lo
 * hacía: un punto por debajo de la línea de flotación daba un índice más allá de
 * `png.data`, y `png.data[i]` devolvía `undefined`. Resultado: un `Rgb` con
 * `{r: undefined, ...}` que parece un color y no lo es. `aHex` reventaba tres
 * llamadas después, lejos de la causa, con un "cannot read 'toString'" que no
 * dice nada. El instrumento tiene que fallar DONDE está el fallo, no arrastrarlo.
 *
 * ⇒ Ahora comprueba los límites igual que `pixel()`. Si de verdad quieres mirar
 *   un punto que está fuera de pantalla, primero haces scroll —como haría un ojo.
 */
export async function pixeles(page: Page, puntos: { x: number; y: number }[]): Promise<Rgb[]> {
  const buf = await page.screenshot({ fullPage: false });
  const png = PNG.sync.read(buf);
  const escala = png.width / page.viewportSize()!.width;
  return puntos.map(({ x, y }) => {
    const px = Math.round(x * escala);
    const py = Math.round(y * escala);
    if (px < 0 || py < 0 || px >= png.width || py >= png.height) {
      throw new Error(`El punto (${x}, ${y}) está FUERA DEL VIEWPORT. No hay píxel que mirar (¿falta un scroll?).`);
    }
    const i = (png.width * py + px) << 2;
    return { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTRASTE — WCAG 2.1, sobre el píxel REAL
// ─────────────────────────────────────────────────────────────────────────────

const luminancia = ({ r, g, b }: Rgb): number => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export function contraste(a: Rgb, b: Rgb): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** WCAG AA: 4,5:1 para texto normal · 3:1 para texto grande (≥18,66px o ≥14px bold). */
export const AA_TEXTO = 4.5;
export const AA_TEXTO_GRANDE = 3;

/**
 * ⭐ EL CONTRASTE REAL. SOLO PÍXELES. CERO MODELO.
 *
 * ⚠️ LA PRIMERA VERSIÓN DE ESTA FUNCIÓN ESTABA MAL, Y LA CAZÓ SU PROPIA
 *    CONTRAPRUEBA. Merece quedar escrito, porque es LA lección del fichero.
 *
 * Hacía esto: leer `color` con `getComputedStyle` y compararlo contra el píxel
 * del fondo. Parecía honesto —la mitad venía del píxel— y era una trampa:
 *
 *     **`getComputedStyle().color` NO INCLUYE EL `opacity` DEL ELEMENTO.**
 *
 * Un `<span style="color:#000; opacity:0.18">` sobre blanco devuelve
 * `rgb(0,0,0)`. Contraste calculado: **21:1. PERFECTO. APROBADO.**
 * Y en pantalla no se ve NADA.
 *
 * Es decir: mi propio detector tenía la enfermedad que perseguía — le
 * preguntaba al CSS y afirmaba sobre la pantalla. El mismo error que cometí al
 * auditar la referencia. Dos veces la misma piedra.
 *
 * ⇒ AHORA NO SE MODELA NADA. Se recortan los píxeles del elemento y se miran:
 *
 *     · el color de FONDO es el que MÁS SE REPITE (la moda)
 *     · el color del TEXTO es el más LEJANO en luminancia que aparezca lo
 *       bastante (≥3 píxeles: así no manda un píxel suelto de suavizado)
 *
 * Con eso, el alfa, la opacidad heredada, los degradados, los `filter`, los
 * `mix-blend-mode` y cualquier capa encima YA ESTÁN DENTRO DEL NÚMERO, porque
 * son el número. No hay nada que modelar: el navegador ya lo pintó.
 */
export async function contrasteReal(page: Page, selector: string) {
  const el = page.locator(selector).first();
  // ⚠️ Si está por debajo de la línea de flotación, NO HAY PÍXELES QUE MIRAR: la
  //    captura del viewport no lo contiene. Un usuario bajaría a verlo; el
  //    instrumento también. (La primera versión reventaba aquí, y era mi fallo:
  //    "está fuera del viewport" no es lo mismo que "no se ve nunca".)
  await el.scrollIntoViewIfNeeded();
  const caja = await el.boundingBox();
  if (!caja) throw new Error(`"${selector}" no tiene caja: no está en la página o está oculto.`);

  const estilo = await el.evaluate((n) => {
    const s = getComputedStyle(n as Element);
    return {
      colorDeclarado: s.color,
      opacidad: s.opacity,
      fontSize: parseFloat(s.fontSize),
      fontWeight: s.fontWeight,
      texto: (n as HTMLElement).innerText,
    };
  });

  const buf = await page.screenshot({ fullPage: false });
  const png = PNG.sync.read(buf);
  const escala = png.width / page.viewportSize()!.width;

  const x0 = Math.max(0, Math.round(caja.x * escala));
  const y0 = Math.max(0, Math.round(caja.y * escala));
  const x1 = Math.min(png.width, Math.round((caja.x + caja.width) * escala));
  const y1 = Math.min(png.height, Math.round((caja.y + caja.height) * escala));
  if (x1 <= x0 || y1 <= y0) {
    throw new Error(`"${selector}" está FUERA DEL VIEWPORT: no hay píxeles que mirar.`);
  }

  const cuenta = new Map<number, number>();
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (png.width * y + x) << 2;
      const clave = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2];
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    }
  }
  const deClave = (k: number): Rgb => ({ r: (k >> 16) & 255, g: (k >> 8) & 255, b: k & 255 });

  // FONDO = el color que más se repite dentro del elemento.
  let fondoClave = 0;
  let masVisto = -1;
  for (const [k, n] of cuenta) if (n > masVisto) { masVisto = n; fondoClave = k; }
  const bg = deClave(fondoClave);
  const lumBg = luminancia(bg);

  // TEXTO = el más lejano en luminancia que aparezca al menos 3 veces.
  // El umbral de 3 evita que mande un píxel suelto del antialiasing.
  let fgClave = fondoClave;
  let masLejos = 0;
  for (const [k, n] of cuenta) {
    if (n < 3) continue;
    const d = Math.abs(luminancia(deClave(k)) - lumBg);
    if (d > masLejos) { masLejos = d; fgClave = k; }
  }
  const fg = deClave(fgClave);

  const grande = estilo.fontSize >= 18.66 || (estilo.fontSize >= 14 && Number(estilo.fontWeight) >= 700);
  const minimo = grande ? AA_TEXTO_GRANDE : AA_TEXTO;
  const ratio = contraste(fg, bg);

  return {
    selector,
    texto: estilo.texto.slice(0, 40),
    /** Lo que el CSS DICE. Se devuelve solo para poder enseñar la diferencia. */
    colorDeclarado: estilo.colorDeclarado,
    opacidad: estilo.opacidad,
    /** ⭐ Lo que el navegador PINTÓ. */
    textoPintado: aHex(fg),
    fondoPintado: aHex(bg),
    ratio: Number(ratio.toFixed(2)),
    minimo,
    pasa: ratio >= minimo,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  GEOMETRÍA — lo que se ve, lo que se sale, lo que se corta, lo que se pisa
// ─────────────────────────────────────────────────────────────────────────────

export interface Culpable {
  etiqueta: string;
  texto: string;
  detalle: string;
}

/**
 * ⛔ ELEMENTOS QUE SE SALEN DEL VIEWPORT POR LOS LADOS.
 *
 * A 360 px, un chip que empieza en x=340 y mide 60 px está MEDIO FUERA. En una
 * captura `fullPage` saldría entero y precioso. En el móvil de una persona,
 * está cortado o provoca scroll horizontal — que en una app que se usa de pie,
 * en la calle, con una mano, es inaceptable.
 */
export async function desbordes(page: Page): Promise<Culpable[]> {
  return page.evaluate(() => {
    const ancho = window.innerWidth;
    const fuera: { etiqueta: string; texto: string; detalle: string }[] = [];

    /**
     * ⚠️ ESTA FUNCIÓN NACIÓ DE UN FALLO DEL PROPIO INSTRUMENTO.
     *
     * La primera versión solo se saltaba `position: fixed`. Al abrir la
     * referencia a 360 px cantó OCHO desbordes, y LOS OCHO ERAN FALSOS:
     *
     *   · 4 botones de filtro ("Circulares", "Búhos"...) dentro de una fila con
     *     `overflow-x: auto`. Están fuera de la pantalla porque HAY QUE
     *     DESLIZAR PARA VERLOS. Es el patrón correcto, no un defecto.
     *   · 4 `tiles` de Leaflet, recortados por el `overflow: hidden` de su
     *     propio contenedor. Nunca llegan a pintarse fuera de nada.
     *
     * Un detector que grita ocho veces por nada es un detector al que se deja
     * de hacer caso — y entonces el día que grite de verdad, nadie mirará.
     *
     * ⇒ Un elemento solo DESBORDA si NINGÚN ancestro lo recorta ni lo desliza.
     *   Si alguien lo recorta, el usuario no ve nada raro. Si alguien lo
     *   desliza, el usuario puede llegar a él.
     */
    const loGestionaUnAncestro = (n: HTMLElement): boolean => {
      let p = n.parentElement;
      while (p && p !== document.documentElement) {
        const s = getComputedStyle(p);
        const ox = s.overflowX;

        // DESLIZABLE → el usuario PUEDE llegar. No es un defecto.
        if (ox === 'auto' || ox === 'scroll') return true;

        if (ox === 'hidden' || ox === 'clip') {
          const rp = p.getBoundingClientRect();
          // ⚠️ Y AQUÍ ESTÁ EL MATIZ QUE SEPARA UN MARCO DE UNA AMPUTACIÓN:
          //
          //   · Si el que recorta ACABA DENTRO de la pantalla, el recorte es un
          //     MARCO intencionado: el contenedor del mapa, un avatar redondo,
          //     un carrusel. El usuario no ve nada raro. (Los `tiles` de Leaflet
          //     viven aquí: un mapa de teselas SIEMPRE dibuja más de lo que
          //     enseña.) → no es un defecto.
          //
          //   · Si el que recorta LLEGA AL BORDE DE LA PANTALLA (típicamente un
          //     `overflow-x: hidden` en el <body>, puesto como red de
          //     seguridad), entonces el corte ES el borde de la pantalla, y ahí
          //     hay CONTENIDO AMPUTADO que el usuario no puede recuperar de
          //     ninguna manera. → ESO SÍ SE CANTA.
          if (rp.right < ancho - 1) return true;
          return false;
        }
        p = p.parentElement;
      }
      return false;
    };

    for (const n of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
      if (s.position === 'fixed') continue; // barras fijas: viven ahí a propósito
      const r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= ancho + 0.5 && r.left >= -0.5) continue;
      if (loGestionaUnAncestro(n)) continue; // ← recortado o deslizable: legítimo

      fuera.push({
        etiqueta: n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? `.${n.className.split(/\s+/)[0]}` : ''),
        texto: (n.innerText ?? '').trim().slice(0, 40),
        detalle: `x: ${Math.round(r.left)} → ${Math.round(r.right)} (pantalla: 0 → ${ancho})`,
      });
    }
    return fuera;
  });
}

/** ⛔ SCROLL HORIZONTAL EN EL DOCUMENTO. Nunca, en ningún viewport. */
export async function scrollHorizontal(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/**
 * ⛔ TEXTO CORTADO.
 *
 * `scrollWidth > clientWidth` con `overflow: hidden` o `text-overflow: ellipsis`
 * significa que hay letras que NO SE LEEN. El test de "el texto dice
 * articulado" pasaría igual: el nodo está, el texto está, y en pantalla pone
 * "Articul…". Que el rótulo exista no prueba que se lea.
 */
export async function truncados(page: Page): Promise<Culpable[]> {
  return page.evaluate(() => {
    /**
     * ⚠️⚠️ EL DETECTOR ME MINTIÓ. Y ESTA VEZ EN LA DIRECCIÓN SEGURA (se puso rojo).
     *
     * Cazó siete "textos truncados" que decían cosas como:
     *     "Estos datos no constan en el registro of…"  → necesita 457px, tiene 1px
     *     "cabecera de línea"                          → necesita 123px, tiene 1px
     *
     * Son mis `sr-only`: contenido PARA LECTORES DE PANTALLA. Un `sr-only` es, por
     * definición, un elemento de 1×1 px con `overflow:hidden` — que es exactamente
     * la firma geométrica de "texto recortado". El detector medía bien y concluía
     * mal: eso no es un dato amputado en pantalla, es un dato que NO ESTÁ en la
     * pantalla, a propósito, para quien no la ve.
     *
     * ⚠️ Y SE EXCLUYE POR GEOMETRÍA, NO POR EL NOMBRE DE LA CLASE. Si mirara
     *    `.sr-only`, bastaría con que alguien usara otro nombre (o Tailwind lo
     *    renombrara) para que el detector volviera a gritar. La firma real de
     *    "visualmente oculto" es: posicionado fuera de flujo, 1 píxel, y recortado.
     *
     * ⚠️ Y NO ES UN AGUJERO: un texto de verdad NUNCA mide 1×1 px con overflow
     *    hidden. Si alguien recortara un nombre de parada, seguiría teniendo su
     *    ancho real y esto lo cazaría igual. Hay contraprueba en `instrumento.spec`.
     */
    const visualmenteOculto = (n: HTMLElement, s: CSSStyleDeclaration) =>
      (s.position === 'absolute' || s.position === 'fixed') &&
      n.clientWidth <= 1 &&
      n.clientHeight <= 1;

    const rotos: { etiqueta: string; texto: string; detalle: string }[] = [];
    for (const n of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      if (visualmenteOculto(n, s)) continue; // ← no está en la pantalla: no se juzga
      const t = (n.innerText ?? '').trim();
      if (!t) continue;

      /**
       * ⚠️⚠️ Y AQUÍ EL DETECTOR SE QUEDÓ CIEGO SIN QUE NADIE LO VIERA. Antes solo
       * miraba HOJAS ("las que llevan el texto"). Pero desde que los títulos meten su
       * texto en `<Cita>`/`<Toponimo>` —un `<span>`—, el texto YA NO es hoja del
       * contenedor: `<h1><span data-cita>Nombre</span></h1>`. Un `truncate` en el
       * `<h1>` (que es donde se pondría) recorta con puntos suspensivos, pero el `<h1>`
       * tiene un hijo, así que el filtro "solo hojas" lo saltaba. La LEY —"el texto
       * nunca se recorta con `…`"— se quedó sin vigilancia en todos los nombres que
       * envolvimos. Lo cazó el propio test, poniéndose rojo. Ver `revision.spec`.
       *
       * ⇒ EL ARREGLO: el `text-overflow: ellipsis` es la firma de esa ley, y solo la
       *   pone un texto amputado a propósito. Se juzga en CUALQUIER elemento —hoja o
       *   ENVOLTORIO—. El `overflow:hidden` A SECAS (sin puntos) se sigue juzgando solo
       *   en HOJAS: en un envoltorio casi siempre es recorte de layout (el mapa con sus
       *   tiles, un panel `rounded` con `overflow-hidden`, un contenedor con scroll), no
       *   un texto cortado — y marcarlo sería un falso positivo.
       */
      const hoja = n.children.length === 0;
      const recorta =
        s.textOverflow === 'ellipsis' || (hoja && (s.overflow === 'hidden' || s.overflowX === 'hidden'));
      if (recorta && n.scrollWidth > n.clientWidth + 1) {
        rotos.push({
          etiqueta: n.tagName.toLowerCase(),
          texto: t.slice(0, 40),
          detalle: `necesita ${n.scrollWidth}px, tiene ${n.clientWidth}px → se corta`,
        });
      }
    }
    return rotos;
  });
}

/** ⛔ DOS ELEMENTOS PISÁNDOSE. Uno tapa al otro y el usuario no lee ninguno. */
export async function solapes(page: Page, selector: string): Promise<Culpable[]> {
  return page.evaluate((sel) => {
    const nodos = Array.from(document.querySelectorAll<HTMLElement>(sel));
    const cajas = nodos.map((n) => ({ n, r: n.getBoundingClientRect() }));
    const malos: { etiqueta: string; texto: string; detalle: string }[] = [];
    for (let i = 0; i < cajas.length; i++) {
      for (let j = i + 1; j < cajas.length; j++) {
        const a = cajas[i].r, b = cajas[j].r;
        const ancho = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const alto = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ancho > 1 && alto > 1) {
          malos.push({
            etiqueta: `${cajas[i].n.tagName.toLowerCase()} × ${cajas[j].n.tagName.toLowerCase()}`,
            texto: `"${(cajas[i].n.innerText ?? '').trim().slice(0, 18)}" / "${(cajas[j].n.innerText ?? '').trim().slice(0, 18)}"`,
            detalle: `se pisan ${Math.round(ancho)}×${Math.round(alto)} px`,
          });
        }
      }
    }
    return malos;
  }, selector);
}

/**
 * ⚠️ ¿SE VE DE VERDAD? No "¿está en el DOM?".
 *
 * Un elemento puede existir, tener texto, tener color... y estar detrás de otro,
 * a opacidad 0, con 0 píxeles de alto, o fuera de la pantalla. Esto lo comprueba
 * con `elementFromPoint`: si en su centro el navegador devuelve OTRO elemento,
 * es que hay algo encima.
 */
export async function seVe(page: Page, selector: string): Promise<{ visible: boolean; motivo: string }> {
  return page.evaluate((sel) => {
    const n = document.querySelector<HTMLElement>(sel);
    if (!n) return { visible: false, motivo: 'no está en el DOM' };
    const s = getComputedStyle(n);
    if (s.display === 'none') return { visible: false, motivo: 'display: none' };
    if (s.visibility === 'hidden') return { visible: false, motivo: 'visibility: hidden' };
    if (parseFloat(s.opacity) < 0.05) return { visible: false, motivo: `opacity: ${s.opacity}` };
    const r = n.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return { visible: false, motivo: `mide ${r.width}×${r.height} px` };
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
      return { visible: false, motivo: `fuera del viewport (${Math.round(r.left)}, ${Math.round(r.top)})` };
    }
    const encima = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (encima && encima !== n && !n.contains(encima) && !encima.contains(n)) {
      return { visible: false, motivo: `tapado por <${encima.tagName.toLowerCase()}>` };
    }
    return { visible: true, motivo: 'se ve' };
  }, selector);
}

/**
 * ⚠️ ÁREA TÁCTIL. El usuario está DE PIE, EN LA CALLE, CON PRISA, con el pulgar.
 * WCAG 2.5.8 (AA) pide 24×24 CSS px como mínimo. Apple recomienda 44.
 */
export const TACTIL_MINIMO = 24;

export async function tactilesPequenos(page: Page): Promise<Culpable[]> {
  return page.evaluate((min) => {
    /**
     * ⚠️ LA EXCEPCIÓN "INLINE" DE LA WCAG 2.5.8. CITADA, NO INVENTADA.
     *
     * El criterio dice, literalmente, que NO se aplica cuando:
     *   *"Inline: The target is in a sentence or its size is otherwise
     *     constrained by the line-height of non-target text."*
     *
     * Es el caso de la atribución de Leaflet ("Leaflet | © OpenStreetMap"): son
     * enlaces DENTRO de una frase, y su altura la manda el interlineado del texto
     * que los rodea. Agrandarlos rompería la línea de texto.
     *
     * ⚠️ Y ESTO NO ES UNA PUERTA TRASERA PARA MIS BOTONES. La condición se
     *    comprueba de verdad: el enlace tiene que ser `display:inline` Y estar
     *    dentro de un padre que tenga OTRO texto además de él. Un chip, un botón o
     *    un marcador de mapa no cumplen ninguna de las dos, y siguen cazándose.
     *    (Mis marcadores del mapa medían 30×22 y este detector los pilló.)
     */
    const excepcionInline = (n: HTMLElement, s: CSSStyleDeclaration): boolean => {
      if (n.tagName !== 'A') return false;
      if (!s.display.startsWith('inline')) return false;
      const padre = n.parentElement;
      if (!padre) return false;
      const textoDelPadre = (padre.textContent ?? '').trim();
      const textoPropio = (n.textContent ?? '').trim();
      // ¿Hay MÁS texto alrededor? Entonces está "en una frase".
      return textoDelPadre.length > textoPropio.length;
    };

    const sel = 'a, button, [role="link"], [role="button"], input, select';
    const malos: { etiqueta: string; texto: string; detalle: string }[] = [];
    for (const n of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const r = n.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (excepcionInline(n, s)) continue;
      if (r.width < min || r.height < min) {
        malos.push({
          etiqueta: n.tagName.toLowerCase(),
          texto: (n.innerText ?? n.getAttribute('aria-label') ?? '').trim().slice(0, 30),
          detalle: `${Math.round(r.width)}×${Math.round(r.height)} px (mínimo ${min})`,
        });
      }
    }
    return malos;
  }, TACTIL_MINIMO);
}

// ─────────────────────────────────────────────────────────────────────────────

export function informar(titulo: string, culpables: Culpable[]): void {
  if (culpables.length === 0) return;
  console.log(`\n  ⛔ ${titulo} (${culpables.length})`);
  for (const c of culpables.slice(0, 12)) {
    console.log(`     ${c.etiqueta.padEnd(28)} ${c.detalle}`);
    if (c.texto) console.log(`     ${' '.repeat(28)} "${c.texto}"`);
  }
  if (culpables.length > 12) console.log(`     ... y ${culpables.length - 12} más`);
}

/** La revisión completa de una pantalla. Geometría, no rótulos. */
export async function revisar(page: Page, nombre: string) {
  const [fuera, cortados, scroll, tactil] = await Promise.all([
    desbordes(page), truncados(page), scrollHorizontal(page), tactilesPequenos(page),
  ]);
  informar(`${nombre}: se salen de la pantalla`, fuera);
  informar(`${nombre}: texto cortado`, cortados);
  informar(`${nombre}: áreas táctiles pequeñas`, tactil);
  if (scroll > 0) console.log(`\n  ⛔ ${nombre}: SCROLL HORIZONTAL de ${scroll} px`);
  return { fuera, cortados, scroll, tactil };
}

/** ⚠️ Captura del VIEWPORT. `fullPage` está prohibido, y por eso no es opción. */
export async function capturar(page: Page, ruta: string): Promise<void> {
  await page.screenshot({ path: ruta, fullPage: false });
}

export { expect };
