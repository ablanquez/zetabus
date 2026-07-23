'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LlegadaViva } from '@/engine/llegadas';
import type { LatLon } from '@/core';
import { linea } from '@/engine/topologia';
import { tonosDeChip, llevaContorno } from './ChipLinea';

/**
 * ⭐ EL MAPA DE LA PARADA. ARRIBA, COMO EN LA REFERENCIA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ VA ARRIBA, Y POR QUÉ ANTES NO.
 *
 * En la Tanda 4 medí que el mapa de 288 px de la referencia empujaba el primer
 * tiempo de llegada a y=789 en un móvil de 360×780 — es decir, FUERA DE LA
 * PANTALLA. Y decidí bajarlo. La medida era correcta.
 *
 * ⛔ Y LA DECISIÓN ERA MÍA, QUE NO COJO EL BUS.
 *
 * Antonio la usa. Y dice que su usabilidad es la correcta: llegas a la parada,
 * miras el mapa, ves DÓNDE está tu autobús, y luego bajas a los minutos. El
 * mapa no es un adorno que estorba: es la primera pregunta.
 *
 * Medí una capa (la geometría) y afirmé sobre otra (el uso). Es la L7 otra vez.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LO QUE NO SE HACE, PASE LO QUE PASE:
 *
 *  ⛔ NO SE PROYECTA EL AUTOBÚS SOBRE EL TRAZADO. Avanza no da `trip_id`: no
 *     sabemos en qué sentido va. "Acercarlo" a la línea más próxima lo pintaría,
 *     la mitad de las veces, en la calzada contraria. Se pinta donde el GPS dice.
 *
 *  ⛔ NULL ISLAND. Un autobús sin coordenadas NO SE PINTA. Nada de `?? 0`, que
 *     lo mandaría al golfo de Guinea con toda la naturalidad del mundo. Y se
 *     DICE cuántos faltan: un mapa con 3 buses cuando la lista tiene 5 miente
 *     por omisión, y es la clase de mentira que nadie nota.
 */

/**
 * ⭐⭐ B3 · EL ZOOM. Y AQUÍ **NO OBEDEZCO AL PIE DE LA LETRA**, Y HAY QUE DECIRLO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL FALLO ERA REAL. `fitBounds` sobre la parada + TODOS los autobuses no tiene
 *  suelo: la 35 tiene 12 km de recorrido, y un autobús anunciado a 12 minutos está
 *  a ~3,6 km. El encuadre se abría hasta caberlo → **zoom 12 → medio Zaragoza**, y
 *  la parada y el autobús que tienes encima quedaban a tres píxeles uno del otro.
 *  El mapa perdía su función justo cuando más importa.
 *
 *  ⛔ PERO LA ORDEN ERA *"zoom centrado en la parada"*, Y MEDIDA NO SE SOSTIENE.
 *
 *  ⚠️ La tabla va en ANCHO VISIBLE REAL, no en un radio teórico: el contenedor del
 *     mapa mide **326×288 px a 360 px de pantalla** (medido en /parada, no supuesto),
 *     y a 41,65° de latitud sale así:
 *
 *      zoom 16 →   582 m de ancho       zoom 13 → 4.656 m   ← EL SUELO
 *      zoom 15 → 1.164 m                zoom 12 → 9.310 m   ← el bug de la Tanda 7
 *      zoom 14 → 2.328 m
 *
 *      un autobús a  1 min está a ~0,3 km      a  7 min → ~2,1 km
 *      un autobús a  3 min está a ~0,9 km      a 12 min → ~3,6 km
 *
 *      Y medido de verdad sobre 82 paradas, la distancia al autobús MÁS LEJANO:
 *      mediana 2.377 m · p75 3.354 m · p90 5.511 m · max 13.611 m (Peñaflor).
 *
 *  ⇒ Abrir SIEMPRE en la parada a zoom 16 enseñaría, casi siempre, **el pin y nada
 *    más**. Y B5 —la orden de la línea siguiente— dice que el usuario tiene que ver
 *    *"SU posición RESPECTO AL BUS"*. Obedecer B3 al pie de la letra **rompería B5**.
 *
 *  LA REGLA, QUE CUMPLE LAS DOS: se encuadra la parada CON los autobuses, pero el
 *  zoom tiene SUELO y TECHO.
 *
 *      · si todo cabe entre el suelo y 16 → se encuadra todo.
 *      · si para caberlo todo habría que bajar del suelo → **NO SE BAJA**. Se planta
 *        en el suelo CENTRADO EN LA PARADA, que es exactamente lo que Antonio pedía
 *        para el caso que le molestaba: el del autobús lejano.
 *
 * ⚠️ Y ESO DEJA AUTOBUSES FUERA DEL ENCUADRE, QUE ES UNA MENTIRA POR OMISIÓN: el
 *    mapa parecería decir "no viene ninguno". **No se calla: se cuenta cuántos hay
 *    fuera y se da el botón para encuadrarlos.**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⭐⭐ EL SUELO ERA 14 Y AHORA ES 13. EL PRINCIPIO NO CAMBIA; EL NÚMERO SÍ.
 *
 *  Antonio: *"cuando hay varias líneas el zoom es muy grande y no se ven todos los
 *  buses"*. Se midió antes de tocar nada — `docs/SPIKE_SUELO_DE_ZOOM.md`, 90 paradas
 *  repartidas por toda la red, con el `getBoundsZoom` del Leaflet de verdad sobre un
 *  contenedor del tamaño real (326×288 a 360 px):
 *
 *      con suelo 14 → se recortan  58 de 82   **70,7 %**
 *      con suelo 13 → se recortan  18 de 82   **22,0 %**   (−69 % de los recortes)
 *
 *  ⚠️ O SEA QUE EL CASO RARO ERA EL NORMAL: siete de cada diez aperturas ocultaban
 *     autobuses, y el aviso que lo confesaba es texto pequeño gris. Y la MEDIANA del
 *     zoom necesario cae **exactamente en 13**: el caso típico no estaba un poco por
 *     debajo de 14, estaba justo un peldaño. Por eso un solo escalón se lleva tanto.
 *
 *  ⭐ Y EL MIEDO DE ENTONCES —"la parada se vuelve un punto"— NO SE CONFIRMA A 13,
 *     porque el pin es un `divIcon` de TAMAÑO FIJO EN PÍXELES: mide 22 px a 14 y 22 px
 *     a 13. **No encoge.** Lo que cambia es el contexto: se baja de nivel calle a
 *     nivel barrio (a 13 se siguen leyendo Torrero, La Paz, Casablanca, la Ronda
 *     Hispanidad). El zoom 12 del bug original abría a **9,3 km de ancho, cuatro veces
 *     el área de 13** — por eso 13 no es "un poco de aquello": es otra cosa.
 *
 *  ⛔ Y UN SUELO DE 13,5 NO EXISTE: `zoomSnap` vale 1, así que `getBoundsZoom`
 *     devuelve ENTEROS y 13,5 se comporta idéntico a 14. Medido, no supuesto.
 *
 *  ⚠️ LA LIMITACIÓN, DICHA: la medición es UNA FOTO, un lunes ~13:15. En hora punta
 *     hay más autobuses por parada, así que el 70,7 % es probablemente un SUELO y no
 *     un techo — el problema era, si acaso, mayor. Se vuelve a medir con el mismo
 *     script cuando haga falta: `npx tsx scripts/spike-suelo-zoom.ts`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const ZOOM_SUELO = 13;
const ZOOM_TECHO = 16;

/**
 * ⭐ EL VECINDARIO, EN METROS — NO EN ZOOM (dirección 1). A `ZOOM_SUELO`, el contenedor de
 * referencia que se midió en el SPIKE (326×288 px) enseña 4,66 km × 4,11 km alrededor de la
 * parada: ESE es "el barrio" que el suelo dibuja. Lo fijamos como un LADO en metros —y no
 * como un zoom— para que "dentro del encuadre" NO dependa del tamaño del mapa.
 *
 * ⚠️ POR QUÉ EL CAMBIO: el suelo de zoom se pensó para un mapa de tamaño FIJO. Al meter el
 *    mapa en una rejilla que lo estira arriba del corte, `getBoundsZoom` (que depende del
 *    contenedor) dejaba que un mapa ancho cupiera un autobús a 7,5 km SIN bajar del suelo —y
 *    revivía el "media provincia" que B3 mató—. Con el vecindario en metros, un contenedor
 *    más grande hace ZOOM sobre el mismo barrio (más nítido), nunca abre más área: B3 se
 *    comporta IGUAL a cualquier ancho. Ver docs/SPIKE_SUELO_DE_ZOOM.md.
 */
const LADO_VECINDARIO_M = 4100;

/**
 * ⭐ «A 7,5 KM», NO «A 7.523 M». La cifra está para DECIDIR, no para presumir.
 *
 * La pregunta que se contesta es *"¿me merece la pena pulsar «Encuadrarlos»?"*, y
 * para eso 7,5 km y 7.523 m valen exactamente lo mismo — pero el segundo se lee
 * peor y, sobre todo, **finge una precisión que el dato no tiene**: la posición
 * viene de un GPS que Avanza refresca cada pocos segundos y el autobús se mueve
 * mientras lo lees. Un metro de resolución sería una mentira de precisión.
 *
 * ⚠️ Se redondea SIN inventar hacia abajo: 950 m se dice «a 1 km», no «a 900 m».
 *    Y por debajo del kilómetro se va de 50 en 50, que es el orden de lo que un
 *    peatón distingue.
 */
function distanciaCorta(metros: number): string {
  if (metros >= 1000) {
    const km = Math.round(metros / 100) / 10;
    return `${km.toFixed(1).replace('.', ',')} km`;
  }
  return `${Math.round(metros / 50) * 50} m`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  B4 · EL MARCADOR DE AUTOBÚS. CLONADO DE LA REFERENCIA, PÍXEL A PÍXEL.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ B4 · ICONO + NÚMERO + PUNTA. Y LA PUNTA NO ES ADORNO.
 *
 * Medido sobre su captura (ampliada ×8): píldora de ~47×22 px, borde blanco de 2,
 * radio ~9, glifo de autobús blanco a la izquierda, número blanco en negrita, y una
 * **punta triangular centrada** debajo.
 *
 * ⭐ LA PUNTA ES LO QUE HACE QUE EL MARCADOR **SEÑALE**. Nuestro marcador anterior
 *   se anclaba por el CENTRO: el chip tapaba el punto GPS exacto y el autobús podía
 *   estar en cualquier lugar bajo esos 30×24 px. Con punta, el ancla es la punta, y
 *   la punta ES la coordenada. Un marcador de mapa que no señala nada es un adorno.
 *
 * ⚠️ DOS DESVIACIONES DE SU DISEÑO, Y LAS DOS SE JUSTIFICAN:
 *
 *   1. Su píldora mide 22 px de alto. **WCAG 2.5.8 exige 24×24** y esto SE PULSA
 *      (aísla el autobús y salta a su fila). La nuestra mide 26. Dos píxeles.
 *
 *   2. ⭐⭐ EL NÚMERO NO VA EN BLANCO PORQUE SÍ: VA EN EL COLOR QUE SE LEE. Es el
 *      mismo fallo D1 que Antonio cazó en los chips, y aquí estaba a punto de
 *      repetirse — la línea 33 es #C5CE00, y su número en blanco da **1,72:1**.
 *      Los tonos salen de `tonosDeChip`, EL MISMO sitio que los calcula en la
 *      lista, en el índice y en el itinerario. Un búho es azul noche aquí también.
 */
function glifoBus(color: string): string {
  return (
    `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="${color}" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<rect x="3.6" y="2.4" width="12.8" height="13" rx="2.6"/>` +
    `<line x1="3.6" y1="9.6" x2="16.4" y2="9.6"/>` +
    `<line x1="6.2" y1="15.4" x2="6.2" y2="17.4"/>` +
    `<line x1="13.8" y1="15.4" x2="13.8" y2="17.4"/>` +
    `</svg>`
  );
}

/** ⭐ La punta. Con reborde blanco, como la suya. Y ES el ancla del marcador. */
function punta(fondo: string): string {
  return (
    `<svg width="18" height="10" viewBox="0 0 18 10" style="display:block;margin-top:-2px" aria-hidden="true">` +
    `<path d="M1 0 L9 9 L17 0 Z" fill="${fondo}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>` +
    `</svg>`
  );
}

const ANCHO_ICONO = 64;
const ALTO_ICONO = 34;

function iconoBus(
  etiqueta: string,
  fondo: string,
  texto: string,
  { seleccionado, inminente }: { seleccionado: boolean; inminente: boolean },
): L.DivIcon {
  /**
   * ⚠️ DOS ESTADOS, DOS SEÑALES DISTINTAS. Antes compartían una, y eso era un fallo
   *    real: el anillo se pintaba con `seleccionado || inminente`, así que un
   *    autobús a 1 minuto **parecía seleccionado** y uno seleccionado **parecía a
   *    punto de llegar**. Dos significados en un canal es un canal que no dice nada.
   *
   *      SELECCIONADO → anillo oscuro   (foco: "este es el que estás mirando")
   *      INMINENTE    → LATIDO          (estado: "este está entrando")
   *
   * ⭐ Y el latido va en la ESCALA, no en la opacidad — la misma corrección que en
   *   la lista: el desvanecido de la referencia deja el dato a 2,4:1 media vida de
   *   cada ciclo. El movimiento sobrevive al gris; la opacidad se lleva el contraste.
   *
   * ⚠️ Y LA ANIMACIÓN VA EN EL `<span>` DE DENTRO, NUNCA EN LA RAÍZ DEL MARCADOR:
   *    Leaflet posiciona el marcador con `transform: translate3d(...)`. Animar el
   *    `transform` de la raíz le pisaría la posición y el autobús se TELETRANSPORTA.
   */
  const anillo = seleccionado
    ? 'box-shadow:0 0 0 3px #111827,0 2px 6px rgba(0,0,0,.45);'
    : 'box-shadow:0 1px 3px rgba(0,0,0,.45);';

  return L.divIcon({
    className: 'zb-bus',
    html:
      `<span style="display:flex;flex-direction:column;align-items:center;width:${ANCHO_ICONO}px">` +
      `<span class="${[inminente ? 'zb-late' : '', llevaContorno(texto) ? 'zb-num-contorno' : ''].filter(Boolean).join(' ')}" style="display:inline-flex;align-items:center;gap:4px;` +
      `height:26px;padding:0 8px;border-radius:9px;background:${fondo};color:${texto};` +
      `border:2px solid #fff;font:900 13px/1 system-ui,sans-serif;white-space:nowrap;${anillo}">` +
      `${glifoBus(texto)}<span>${etiqueta}</span></span>` +
      punta(fondo) +
      `</span>`,
    iconSize: [ANCHO_ICONO, ALTO_ICONO],
    // ⭐ EL ANCLA ES LA PUNTA. Ahí está el autobús, y ahí apunta el marcador.
    iconAnchor: [ANCHO_ICONO / 2, ALTO_ICONO],
  });
}

/**
 * ⭐ B5 · LA PARADA ES UN **PIN**. Y NO SE CLONA SU CÍRCULO AZUL — CON MOTIVO.
 *
 * Lo que había era un ROMBO anclado por el centro: no señalaba, y en escala de
 * grises se parecía demasiado a un chip de autobús girado.
 *
 * ⚠️ Y su marcador de parada TAMPOCO se copia, aunque la regla sea clonar. Mira su
 *    captura ampliada: su círculo azul **queda medio tapado por dos marcadores de
 *    la 39**. El propósito declarado de este marcador es *"que el usuario vea SU
 *    posición respecto al bus"* — un marcador enterrado bajo un bus no cumple
 *    exactamente eso. Aquí el pin va SIEMPRE ENCIMA (`zIndexOffset`), y tiene punta,
 *    que es lo que convierte un adorno en una coordenada.
 *
 * ⚠️ Y NO LLEVA COLOR DE LÍNEA, ni se le acerca: el color es IDENTIDAD de línea y
 *    ese canal está gastado. El pin es tinta. En gris se distingue de un autobús por
 *    la FORMA (cabeza redonda + punta larga vs. píldora horizontal), no por el tono.
 */
const ICONO_PARADA = L.divIcon({
  className: 'zb-parada',
  html:
    '<svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true" style="display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.45))">' +
    // ⭐ El pin lee `--color-tinta`, NO un `#0F172A` congelado: si la tinta de marca
    //    cambia, el pin se entera. La var cae por herencia dentro del SVG del divIcon.
    '<path d="M14 35C14 35 25 22.2 25 14A11 11 0 1 0 3 14c0 8.2 11 21 11 21Z" fill="var(--color-tinta)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="14" cy="13.6" r="4.4" fill="#fff"/>' +
    '</svg>',
  iconSize: [28, 36], // WCAG 2.5.8: de sobra sobre los 24×24.
  iconAnchor: [14, 36], // ⭐ La punta del pin. Ahí está la parada.
});

// ─────────────────────────────────────────────────────────────────────────────

/** Los tonos del marcador salen del MISMO sitio que los del chip de la lista. */
function tonosDeBus(l: LlegadaViva): { fondo: string; texto: string } {
  const suya = l.lineaId ? linea(l.lineaId) : null;
  // Sin color de línea (un bus cuya línea no está en el GTFS): el par de tokens,
  // el mismo que usan el chip de la lista y el de filtro. Ver globals.css.
  if (!suya) return { fondo: 'var(--color-sin-color)', texto: 'var(--color-sin-color-tinta)' };
  const t = tonosDeChip(suya);
  return { fondo: t.fondo, texto: t.texto };
}

type Encuadrable = 'parada' | 'foco' | 'todos';

/**
 * ⭐ EL ENCUADRE. Y LA REGLA QUE NADIE PONE Y HACE FALTA:
 *
 * ⚠️ **EL MAPA NO SE REENCUADRA SOLO CADA 15 SEGUNDOS.** Los autobuses se refrescan;
 *    si el encuadre siguiera a los autobuses, el mapa DARÍA UN TIRÓN cada refresco y
 *    el usuario no podría ni arrastrarlo: estaría peleándose con él. Se encuadra
 *    cuando cambia la PARADA, cuando cambia el FOCO, o cuando el usuario LO PIDE.
 *    Nunca porque el GPS se haya movido tres metros.
 */
/**
 * ⭐ R3 · CUANDO EL MAPA CRECE, LEAFLET TIENE QUE ENTERARSE.
 *
 * Arriba del corte el marco del mapa iguala la columna derecha (grid + flex), y al
 * desplegar un `<details>` de la derecha esa columna crece → el marco crece con ella.
 * Pero Leaflet mide su tamaño AL MONTAR y no se entera de un cambio de alto por CSS:
 * dejaría teselas grises en la zona nueva. `invalidateSize` lo obliga a recalcular.
 * Un `ResizeObserver` sobre su contenedor lo dispara en TODOS los casos —desplegar,
 * cruzar el corte al redimensionar la ventana— sin medir anchos a mano ni suponer.
 */
function AjustaAlCambiarTamano() {
  const map = useMap();
  useEffect(() => {
    const cont = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(cont);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function Encuadre({
  parada,
  foco,
  puntos,
  orden,
}: {
  parada: LatLon | null;
  foco: LatLon | null;
  puntos: readonly LatLon[];
  /** Un contador: sube cuando el usuario pulsa «Ver todos». No es un booleano
   *  porque hay que poder pedirlo DOS VECES SEGUIDAS. */
  orden: number;
}) {
  const map = useMap();
  const hecho = useRef<string>('');

  /**
   * ⭐ EL SUELO DE ZOOM, EN UNA FUNCIÓN. Encuadra lo que le den, pero **nunca se
   * aleja más allá de `ZOOM_SUELO`**: si para caberlo todo hiciera falta bajar más,
   * se planta en el suelo Y SE CENTRA EN LA PARADA — no en el centroide de un
   * autobús que está en Parque Goya.
   *
   * ⚠️ `getBoundsZoom` pregunta a Leaflet QUÉ zoom haría falta, sin aplicarlo. Es la
   *    única manera de decidir esto sin dar primero un tirón feo y corregirlo después.
   */
  const encuadrarCon = useCallback(
    (ps: readonly LatLon[], relleno: number, techo: number) => {
      if (ps.length === 0) return;
      const b = L.latLngBounds(ps.map((p) => [p.lat, p.lon] as [number, number]));
      const relle = L.point(relleno, relleno);
      const necesario = map.getBoundsZoom(b, false, relle);

      if (necesario >= ZOOM_SUELO) {
        map.fitBounds(b, { padding: [relleno, relleno], maxZoom: techo });
        return;
      }
      // ⭐ Aquí muerde el suelo. El ancla es LA PARADA, que es la referencia del usuario.
      const ancla = parada ?? ps[0];
      map.setView([ancla.lat, ancla.lon], ZOOM_SUELO);
    },
    [map, parada],
  );

  const encuadrar = useCallback(
    (que: Encuadrable) => {
      if (que === 'foco' && foco) {
        // Un solo autobús + la parada. Aquí el techo sube: si el bus está encima,
        // que se vea que está encima.
        encuadrarCon(parada ? [foco, parada] : [foco], 48, 17);
        return;
      }
      /**
       * ⛔ Y AQUÍ EL SUELO **SE ROMPE A PROPÓSITO**. Casi cuelo un botón que no hacía
       *    nada: si «Encuadrarlos» respetara el suelo de zoom, no podría encuadrar
       *    precisamente a los autobuses que están fuera POR CULPA del suelo. Sería un
       *    botón que se pulsa, parpadea y no mueve el mapa.
       *
       *    El suelo protege al usuario de un alejamiento que NO HA PEDIDO. Cuando lo
       *    pide, se le da: `fitBounds` a pelo, sin suelo. Su mapa, su decisión.
       */
      if (que === 'todos') {
        if (puntos.length > 0) {
          map.fitBounds(
            L.latLngBounds(puntos.map((p) => [p.lat, p.lon] as [number, number])),
            { padding: [40, 40], maxZoom: ZOOM_TECHO },
          );
        }
        return;
      }

      // ⭐ REPOSO · EL VECINDARIO ES FIJO EN METROS (dirección 1). La parada + los
      //    autobuses que caen DENTRO del vecindario; los de más allá NO estiran el
      //    encuadre —los cuenta el aviso—. Como el vecindario se mide en metros y no en
      //    zoom, un mapa más grande ACERCA (mismo barrio), no enseña más provincia.
      if (parada) {
        const caja = L.latLng(parada.lat, parada.lon).toBounds(LADO_VECINDARIO_M);
        const cerca = puntos.filter((p) => caja.contains([p.lat, p.lon]));
        // Con vecinos, se ajusta a ellos (puede ACERCAR por debajo del techo); sin
        // vecinos, el barrio entero. Nunca se aleja MÁS que el vecindario: `cerca` ⊆ caja.
        const objetivo =
          cerca.length > 1
            ? L.latLngBounds(cerca.map((p) => [p.lat, p.lon] as [number, number]))
            : caja;
        map.fitBounds(objetivo, { padding: [40, 40], maxZoom: ZOOM_TECHO });
      } else if (puntos.length > 0) {
        // Sin posición de parada (raro): se cae al encuadre de antes, con su suelo.
        encuadrarCon(puntos, 40, ZOOM_TECHO);
      }
    },
    [map, parada, foco, puntos, encuadrarCon],
  );

  // Reposo / foco: solo cuando REALMENTE cambia la situación, no en cada refresco.
  useEffect(() => {
    const clave = foco
      ? `foco:${foco.lat},${foco.lon}`
      : `parada:${parada ? `${parada.lat},${parada.lon}` : 'sin'}`;
    if (clave === hecho.current) return;
    hecho.current = clave;
    encuadrar(foco ? 'foco' : 'parada');
  }, [foco, parada, encuadrar]);

  // A petición del usuario. Y `orden === 0` es el arranque: ahí no se toca nada.
  useEffect(() => {
    if (orden === 0) return;
    hecho.current = `todos:${orden}`;
    encuadrar('todos');
  }, [orden, encuadrar]);

  return null;
}

/**
 * ⭐ EL CONTADOR DE LO QUE NO SE VE. Sin esto, B3 sería una mentira por omisión:
 * el mapa abriría en la parada, un autobús quedaría a 4 km fuera del encuadre, y la
 * pantalla estaría diciendo *"no viene ninguno"* sin decirlo.
 *
 * ⚠️ Se cuenta contra los límites REALES del mapa (`getBounds`), no contra una
 *    distancia inventada. Y se recuenta cuando el usuario mueve el mapa.
 */
function ContarFuera({
  posiciones,
  parada,
  onContar,
}: {
  posiciones: readonly LatLon[];
  /** El origen desde el que se mide «lejos». Es la referencia del usuario. */
  parada: LatLon | null;
  onContar: (r: { n: number; lejos: number | null }) => void;
}) {
  const map = useMap();

  const contar = useCallback(() => {
    const b = map.getBounds();
    const fuera = posiciones.filter((p) => !b.contains([p.lat, p.lon]));
    /**
     * ⚠️ La distancia la calcula LEAFLET (`map.distance`, gran círculo del CRS), no
     *    una fórmula mía. Mismo criterio que con `getBoundsZoom`: reimplementarla
     *    sería medir mi aritmética en vez de la del mapa que el usuario está viendo.
     */
    const lejos =
      parada && fuera.length > 0
        ? Math.max(...fuera.map((p) => map.distance([parada.lat, parada.lon], [p.lat, p.lon])))
        : null;
    onContar({ n: fuera.length, lejos });
  }, [map, posiciones, parada, onContar]);

  useMapEvents({ moveend: contar, zoomend: contar, resize: contar });
  useEffect(contar, [contar]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export function MapaParada({
  parada,
  llegadas,
  seleccionado,
  onSeleccionar,
}: {
  parada: LatLon | null;
  /** YA FILTRADAS. El mapa no filtra: lee el mismo estado único que la lista. */
  llegadas: readonly LlegadaViva[];
  /** El coche resaltado. Es el MISMO estado que resalta la fila de la lista. */
  seleccionado: string | null;
  onSeleccionar: (coche: string | null) => void;
}) {
  // ⭐ NULL ISLAND: se separan los que TIENEN posición de los que no. Y los que
  //    no la tienen NO se pintan — pero SE CUENTAN, y se dice cuántos son.
  const conPosicion = useMemo(() => llegadas.filter((l) => l.posicion !== null), [llegadas]);
  const sinPosicion = llegadas.length - conPosicion.length;

  const enfocado = useMemo(
    () => (seleccionado ? (conPosicion.find((l) => String(l.coche) === seleccionado) ?? null) : null),
    [conPosicion, seleccionado],
  );

  /**
   * ⭐ B6 · AL SELECCIONAR, EL MAPA **AÍSLA**. Se pinta ESE autobús y la parada, y
   * nada más. Es lo que hace útil el gesto: con seis marcadores encima no se ve
   * cuál es el tuyo por mucho que le pongas un anillo.
   *
   * ⚠️ Y si el seleccionado NO TIENE POSICIÓN, aislar dejaría el mapa vacío y
   *    parecería una avería. En ese caso NO se aísla: se enseñan todos y se DICE
   *    que a ese autobús Avanza no le da coordenadas. (Ver el aviso de abajo.)
   */
  const pintados = enfocado ? [enfocado] : conPosicion;

  const puntos = useMemo(() => {
    const ps: LatLon[] = conPosicion.map((l) => l.posicion!);
    if (parada) ps.push(parada);
    return ps;
  }, [conPosicion, parada]);

  const posicionesBus = useMemo(() => conPosicion.map((l) => l.posicion!), [conPosicion]);

  const [fuera, setFuera] = useState<{ n: number; lejos: number | null }>({ n: 0, lejos: null });
  const [orden, setOrden] = useState(0);

  /** «Ver todos» = quitar el foco Y devolver el encuadre a LOS FILTRADOS. */
  const verTodos = useCallback(() => {
    onSeleccionar(null);
    setOrden((n) => n + 1);
  }, [onSeleccionar]);

  // Sin NADA que pintar (ni siquiera la parada) no se monta un mapa vacío: se dice.
  if (!parada && conPosicion.length === 0) {
    return (
      <div
        className="es-sin-datos mb-4 px-3 py-3 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
        data-papel="mapa-sin-datos"
      >
        No podemos dibujar el mapa: no tenemos la posición de esta parada ni la de ningún autobús.
        <strong className="not-italic"> No la inventamos.</strong>
      </div>
    );
  }

  const centro: [number, number] = parada
    ? [parada.lat, parada.lon]
    : [conPosicion[0].posicion!.lat, conPosicion[0].posicion!.lon];

  /** El seleccionado existe en la lista pero el mapa no puede pintarlo. */
  const seleccionadoSinMapa =
    seleccionado !== null && !enfocado && llegadas.some((l) => String(l.coche) === seleccionado);

  return (
    <div data-papel="mapa" data-aislado={enfocado ? 'si' : 'no'}>
      {/* `marco-mapa`: alto fijo (18rem) en móvil; arriba del corte lo estira la rejilla
          (flex:1) para igualar la columna derecha. Ver globals.css · R1/R3. */}
      <div className="marco-mapa relative overflow-hidden rounded-panel border border-[var(--color-borde)] shadow-sm">
        <MapContainer
          center={centro}
          zoom={ZOOM_TECHO}
          scrollWheelZoom={false}
          className="h-full w-full"
          /**
           * ⛔ AQUÍ HABÍA UN `data-papel="lienzo-mapa"`. **NO LLEGABA AL DOM.**
           *
           * `MapContainer` de react-leaflet NO reenvía los `data-*` a su `<div>`: los
           * consume y los tira. Ese gancho llevaba puesto desde la Tanda 4, con pinta
           * de punto de medida, y cualquier test que lo hubiera usado habría estado
           * midiendo `null` — es decir, aprobando sin mirar nada.
           *
           * Lo cazó el primer test que intentó usarlo de verdad. Un `data-papel` que
           * no se renderiza es una mentira escrita en el código fuente: fuera. Para
           * medir el lienzo se usa `.leaflet-container`, que es lo que Leaflet pone.
           */
        >
          <TileLayer
            // ⚠️ ATRIBUCIÓN OBLIGATORIA (ODbL). La fórmula EXACTA es «© colaboradores de
            //    OpenStreetMap», no «© OpenStreetMap» a secas: la exige la licencia y la cita
            //    THIRD-PARTY-NOTICES.md · §5. Es el ÚNICO mapa de la app (un solo TileLayer),
            //    así que esta es la única copia del texto: no hay divergencia posible.
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Encuadre parada={parada} foco={enfocado?.posicion ?? null} puntos={puntos} orden={orden} />
          <ContarFuera posiciones={posicionesBus} parada={parada} onContar={setFuera} />
          <AjustaAlCambiarTamano />

          {/* ⭐ LA PARADA, SIEMPRE ENCIMA. Es la referencia del usuario: si un autobús
              la tapa, el mapa deja de contestar «¿dónde está respecto A MÍ?». */}
          {parada && (
            <Marker
              position={[parada.lat, parada.lon]}
              icon={ICONO_PARADA}
              /**
               * ⭐ SIEMPRE ENCIMA, A CUALQUIER ZOOM. Leaflet apila los marcadores por su
               * `y` en píxeles (los del sur, encima); `zIndexOffset` se SUMA a esa `y`.
               * El `1000` de antes bastaba a zoom 13 —donde un bus lejano estaba a ~500
               * px— pero se quedaba corto en cuanto el encuadre acercaba: a zoom 16 ese
               * mismo bus está a miles de px y adelantaba a la parada. Con el suelo en
               * metros el mapa ahora acerca más, así que el desnivel tiene que ser tan
               * grande que NINGÚN autobús de la red (máx. ~14 km) lo remonte: 100000 px
               * de ventaja son ~119 km a zoom 16. La parada no vuelve a quedar debajo.
               */
              zIndexOffset={100000}
              alt="Tu parada"
            />
          )}

          {pintados.map((l) => {
            const coche = String(l.coche);
            const etiqueta = l.linea ?? l.etiquetaCruda;
            const { fondo, texto } = tonosDeBus(l);
            const activo = coche === seleccionado;
            return (
              <Marker
                key={coche}
                position={[l.posicion!.lat, l.posicion!.lon]}
                icon={iconoBus(etiqueta, fondo, texto, {
                  seleccionado: activo,
                  inminente: l.etaMinutos <= 1,
                })}
                zIndexOffset={activo ? 500 : 0}
                // ⭐ LA SINCRONÍA MAPA → LISTA. Es el MISMO estado, no dos copias.
                //    Y TECLADO, AL MODO DE LEAFLET: el marcador es focusable (role=button)
                //    pero por sí solo no se activa con teclado. Leaflet reenvía el `keydown`
                //    del icono ENFOCADO como evento de capa; se escucha y se hace lo MISMO
                //    que el clic. Enter y Espacio; en Espacio, `preventDefault` para que la
                //    página no haga scroll bajo el dedo. (Antes: Tab llegaba, Enter no hacía
                //    nada — el marcador mentía sobre ser operable.)
                eventHandlers={{
                  click: () => onSeleccionar(activo ? null : coche),
                  keydown: (e) => {
                    const k = (e.originalEvent as KeyboardEvent).key;
                    if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
                      e.originalEvent.preventDefault();
                      onSeleccionar(activo ? null : coche);
                    }
                  },
                }}
                alt={`Línea ${etiqueta}, coche ${coche}, a ${l.etaMinutos} min`}
              />
            );
          })}
        </MapContainer>

        {/* ⭐ B6 · «VER TODOS». Y devuelve LOS FILTRADOS, no todos: si el usuario ha
            apagado la línea 39, «todos» no puede resucitarla — sería el filtro
            desobedeciéndose a sí mismo. El mapa recibe `visibles`, y eso es lo que
            vuelve. */}
        {seleccionado !== null && (
          <button
            type="button"
            onClick={verTodos}
            data-papel="ver-todos"
            className="absolute right-2 top-2 z-[500] min-h-[var(--control)] rounded-full border border-[var(--color-borde)] bg-[var(--color-papel)] px-4 text-menor font-bold shadow-md"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* ⚠️ LO QUE EL MAPA NO PUEDE ENSEÑAR, SE DICE. Un mapa con 3 autobuses
          cuando la lista tiene 5 miente por omisión, y nadie lo nota. */}
      {sinPosicion > 0 && (
        <p
          className="mt-1.5 text-nota leading-snug text-[var(--color-aviso)] sin-recortar"
          data-papel="sin-posicion"
        >
          ⚠ {sinPosicion === 1 ? 'Un autobús no sale' : `${sinPosicion} autobuses no salen`} en el mapa:
          Avanza no da su posición. Sí {sinPosicion === 1 ? 'está' : 'están'} en la lista de abajo.
        </p>
      )}

      {seleccionadoSinMapa && (
        <p
          className="mt-1.5 text-nota font-semibold leading-snug text-[var(--color-aviso)] sin-recortar"
          data-papel="seleccionado-sin-mapa"
          role="status"
        >
          ⚠ El autobús que has marcado no sale en el mapa: Avanza no da su posición. El mapa sigue
          enseñando los demás.
        </p>
      )}

      {/* ⭐ EL PRECIO DE B3, PAGADO A LA VISTA. Abrimos en la parada, y eso deja
          autobuses fuera del encuadre. Se dice cuántos, y se ofrece verlos. */}
      {/* ⚠️ ESTO SOLO SE VE MIRANDO. La primera versión ponía el texto y el botón en
          un `flex-wrap`, y a 360 px el botón caía a una tercera línea él solo: un
          botonazo de 44 px compitiendo con el mapa por la atención. Ningún test lo
          habría cazado — HTML válido, contraste correcto, nada truncado. Ahora el
          texto ocupa su ancho y el botón se queda al lado, sin robar protagonismo. */}
      {/* ⭐⭐ Y AHORA PESA, PORQUE AHORA ES UNA EXCEPCIÓN. Con el suelo en 14 esto
          saltaba en el **70,7 %** de las aperturas (medido: `docs/SPIKE_SUELO_DE_ZOOM.md`):
          era un cartel permanente, y un cartel permanente se vuelve parte del
          decorado — por eso era texto gris pequeño, y por eso no se veía. Con el
          suelo en 13 salta en el **22 %**, y eso es lo que le da derecho a llamar la
          atención sin convertirse en ruido.

          ⚠️ ÁMBAR Y NO ROJO, como en las paradas suprimidas: el rojo es ALERTA y
             exige acción (el "YA LLEGA"). Que un autobús quede fuera del encuadre
             CUESTA pero no rompe — hay un botón al lado que lo arregla. Es AVISO.

          ⚠️ Y DESTACA SIN GRITAR, que aquí es media batalla: esto vive JUSTO DEBAJO
             del mapa, que ya está lleno de información. Por eso el peso lo llevan el
             fondo ámbar y un borde de 1 px —no de 2, como el bloque de suprimidas,
             que no compite con nada— y por eso el texto sigue siendo `text-nota`. */}
      {!enfocado && fuera.n > 0 && (
        <div
          className="mt-1.5 flex items-center gap-2 rounded-caja border border-[var(--color-aviso)] bg-[var(--color-aviso-fondo)] px-2.5 py-1.5"
          data-papel="fuera-del-encuadre"
          data-lejos-m={fuera.lejos === null ? undefined : Math.round(fuera.lejos)}
        >
          <p className="min-w-0 flex-1 text-nota leading-snug text-[var(--color-tinta)] sin-recortar">
            <span aria-hidden>⚠ </span>
            <strong className="font-black">
              {fuera.n === 1 ? '1 autobús' : `${fuera.n} autobuses`} fuera del encuadre
            </strong>
            {/* ⭐ EL DATO QUE FALTABA. "Está más lejos" no dice si merece la pena
                pulsar; "a 7,5 km" sí. Y sale de las posiciones que `contar()` ya
                tiene en la mano: ni una petición más. */}
            {fuera.lejos !== null && (
              <>
                {' · el más lejano, a '}
                <strong className="font-black tabular-nums">{distanciaCorta(fuera.lejos)}</strong>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => setOrden((n) => n + 1)}
            data-papel="encuadrar-todos"
            // ⚠️ 44 px de alto NO son negociables (WCAG 2.5.8 pide 24, y un pulgar
            //    en la calle pide más). Lo que se baja es el PESO VISUAL, no el
            //    tamaño del objetivo: es lo contrario de lo que suele hacerse.
            // ⚠️ El borde pasa a ámbar para que el botón PERTENEZCA al aviso: es su
            //    salida, no un control suelto que ha caído al lado. El relleno sigue
            //    siendo papel, que sobre el ámbar claro lo hace obvio como pulsable.
            className="min-h-[var(--control)] shrink-0 rounded-full border border-[var(--color-aviso)] bg-[var(--color-papel)] px-3 text-nota font-semibold text-[var(--color-aviso)]"
          >
            {/* Con un solo autobús, «Encuadrarlos» chirriaba justo al lado de un
                «1 autobús». Concuerda, como concuerda el resto del aviso. */}
            {fuera.n === 1 ? 'Encuadrarlo' : 'Encuadrarlos'}
          </button>
        </div>
      )}
    </div>
  );
}
