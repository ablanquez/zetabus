/**
 * EL BANCO DE PRUEBAS DEL INSTRUMENTO.
 *
 * Una pantalla de la que SÉ EXACTAMENTE lo que le pasa, porque la rompo yo.
 * Sirve para una sola cosa, y es la más importante de todas:
 *
 *     ⇒ COMPROBAR QUE EL INSTRUMENTO CAZA LO QUE DICE CAZAR.
 *
 * Si rompo la pantalla y el test sigue verde, EL TEST NO PRUEBA NADA. Y yo me
 * habría quedado tan tranquilo, con mis cinco viewports y mis capturas bonitas,
 * dando por buena una pantalla rota.
 *
 * Ya me ha pasado tres veces en este proyecto: el "discriminador" del poste 333,
 * `git check-ignore -v`, y mi propio test del barrido. Que no pase una cuarta.
 *
 * ⚠️ La maqueta imita a propósito la fila de llegadas de ZetaBus (chip de línea
 *    + destino + tiempo + chips de flota), porque es la fila que va a sufrir:
 *    a 360 px hay que meter ahí el número de coche, la clase, el combustible,
 *    LA CONFIANZA y el SIN DATOS. Es donde va a romperse de verdad.
 */

export type Defecto =
  | 'fuera-de-pantalla'
  | 'texto-cortado'
  | 'contraste-ilegible'
  /**
   * ⭐ EL DEFECTO QUE CAZÓ A MI PROPIO INSTRUMENTO.
   *
   * Texto NEGRO PURO (#000) sobre fondo BLANCO. El CSS no puede declarar un
   * contraste mejor: **21:1, el máximo posible.** Y encima, `opacity: 0.06`.
   *
   * La primera versión de `contrasteReal` leía el color con `getComputedStyle`
   * —que NO incluye el `opacity`—, veía `rgb(0,0,0)` sobre casi blanco, y daba
   * **21:1. APROBADO.** Sobre un texto que en pantalla NO SE VE.
   *
   * Si el instrumento nuevo no caza esto, es que sigue preguntándole al CSS.
   */
  | 'contraste-perfecto-en-el-css-invisible-en-pantalla'
  | 'solape'
  | 'tactil-diminuto';

/**
 * @param defectos Los desperfectos a inyectar. Vacío = la pantalla SANA.
 */
export function banco(defectos: Defecto[] = []): string {
  const tiene = (d: Defecto) => defectos.includes(d);

  // ⚠️ EL DEFECTO DE CONTRASTE ES EL DE ANTONIO, LITERAL:
  //    "un verde al 18% sobre gris da #DDE6DE. Que es GRIS."
  //    El CSS declara `color: #16A34A` (verde) — pero encima le pone una
  //    opacidad del 18%. `getComputedStyle` seguiría diciendo "#16A34A" y uno se
  //    quedaría convencido de que hay verde. En pantalla no hay nada.
  const chipConfianza = tiene('contraste-perfecto-en-el-css-invisible-en-pantalla')
    ? // #000 sobre #FFF = 21:1, el contraste MÁXIMO que existe... al 6%.
      `<span id="confianza" style="color:#000000;background:#FFFFFF;opacity:0.06;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px">sin verificar</span>`
    : tiene('contraste-ilegible')
    ? `<span id="confianza" style="color:#16A34A;opacity:0.18;background:#F1F5F9;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px">sin verificar</span>`
    : `<span id="confianza" style="color:#166534;background:#DCFCE7;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px">sin verificar</span>`;

  // Un chip empujado FUERA del viewport por la derecha.
  const chipFuera = tiene('fuera-de-pantalla')
    ? `<span id="fuera" style="position:absolute;left:340px;width:120px;background:#FEE2E2;color:#991B1B;font-size:11px;padding:2px 8px;border-radius:6px;white-space:nowrap">SIN DATOS de flota</span>`
    : `<span id="fuera" style="background:#FEE2E2;color:#991B1B;font-size:11px;padding:2px 8px;border-radius:6px;white-space:nowrap">SIN DATOS</span>`;

  // Un destino que NO CABE y se corta con puntos suspensivos.
  const destino = tiene('texto-cortado')
    ? `<p id="destino" style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:15px;margin:0">PARQUE GOYA / ACTUR SUR</p>`
    : `<p id="destino" style="font-weight:700;font-size:15px;margin:0">VADORREY</p>`;

  // El tiempo pisando al destino.
  const tiempo = tiene('solape')
    ? `<p id="tiempo" style="position:absolute;left:60px;top:14px;font-size:22px;font-weight:900;color:#2563EB;margin:0">3 min</p>`
    : `<p id="tiempo" style="font-size:22px;font-weight:900;color:#2563EB;margin:0">3 min</p>`;

  // Un botón que el pulgar no acierta.
  const boton = tiene('tactil-diminuto')
    ? `<button id="refrescar" style="width:16px;height:16px;padding:0;border:0;background:#E5E7EB;border-radius:4px">↻</button>`
    : `<button id="refrescar" style="width:44px;height:44px;padding:0;border:0;background:#E5E7EB;border-radius:8px">↻</button>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,sans-serif;background:#F8FAFC;color:#0F172A}
  .pantalla{padding:16px}
  .fila{position:relative;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px}
  .cabecera{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .izq{display:flex;align-items:center;gap:12px;min-width:0}
  .linea{width:40px;height:40px;border-radius:12px;background:#F97316;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0}
  .chips{display:flex;gap:6px;flex-wrap:wrap;padding-left:52px}
  .chip{background:#F1F5F9;color:#475569;font-size:11px;font-weight:500;padding:2px 8px;border-radius:6px;white-space:nowrap}
  .edad{color:#64748B;font-size:12px;margin:8px 0 0}
</style></head><body>
<div class="pantalla">
  <div class="fila">
    <div class="cabecera">
      <div class="izq">
        <div class="linea">35</div>
        ${destino}
      </div>
      ${tiempo}
    </div>
    <div class="chips">
      <span class="chip">Bus 4889</span>
      <span class="chip">Articulado</span>
      <span class="chip">Diésel</span>
      ${chipConfianza}
      ${chipFuera}
    </div>
    <p class="edad" id="edad">actualizado hace 18 s</p>
  </div>
  ${boton}
</div>
</body></html>`;
}
