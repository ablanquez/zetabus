# Bitácora — `/estado`, el panel de control público

> Bitácora EN CALIENTE de la construcción del panel `/estado` (primer remate de la Tanda 8).
> El campo estrella es **«qué dio verde mientras el fallo estaba vivo»**.

## Fase 0 · Diseño (antes de una línea de página)

### Lo que encontré mirando el repo (no suponiendo)

- **Ninguna página de este repo hace `fetch` de su propia API.** Todas leen el motor
  importándolo en el servidor (`from '@/engine/…'`): `home`, `/parada`, `/linea`,
  `/sobre-los-datos`. `/api/diag` es en sí un **envoltorio finito** de 40 líneas sobre
  `estadoIndice()`, `validez`, `lineas()`, `paradas()`.
- **La doc oficial de Next lo desaconseja explícitamente** — `production-checklist.md:65`:
  *«do not call Route Handlers from Server Components to avoid an additional server
  request.»* Así que fetchear `/api/diag` desde el server component de `/estado` iría
  contra el framework Y contra cómo lee datos todo el repo.
- **No existe token verde/«ok» en el sistema visual.** Los semánticos son
  `--color-alerta` (rojo), `--color-aviso` (ámbar) con su fondo/borde. No hay verde de
  éxito, y encaja con la ley del proyecto: *el estado no va en el tono, va en palabra/forma*.
  → «fresco» se dice con **palabra + forma sobre tinta neutra**, no con un verde inventado.
- `estadoIndice()` ya calcula `edadSegundos` (la frescura de la Ley 1) en el servidor, y
  modela el fallo como `presente:false / degradado:true` — la Ley 3 sin inventar nada.
- `feedStatus()` / `feedWarning()` ya dan la vigencia del feed en 4 estados, con texto
  honesto y con la zona `Europe/Madrid` bien resuelta.

### Costuras que llevo al checkpoint (no las decido solo)

1. **Cómo se lee `/api/diag`.** La doc de Next y el repo empujan a **importar las mismas
   funciones del motor** que `/api/diag` importa, no a fetchearlo por HTTP. Propuesto abajo
   con su porqué; espero OK.
2. **No hay verde en el sistema.** «fresco» = tinta neutra + palabra + forma. Espero OK.
3. **`datos.generadoEn` del GTFS y `feed.version`**: ante la duda, **fuera** por defecto.
   Preguntado.
4. **`degradado`**: ¿estado visible propio o plegado en «no lo sé»? Preguntado.

### Fase 1 · Parada nº 1 antes de codificar el clasificador (costura anti-fallo)

Al ir a escribir `clasificar(estado)` descubrí que **la fórmula de campos aprobada no
casa con lo que el motor produce**. `estadoIndiceDesde` (correspondencias.ts:264-274):

```
if (!indice) return { presente: false, degradado: true };   // índice FALTA
return { presente: true, degradado: false, generadoEn, edadSegundos, barrido };
```

⇒ `presente:true && degradado:true` **NO existe nunca**. Y `!presente` **es** la señal de
«índice falta» — es decir, el estado **Degradado**, no «No lo sé». Si codificara la fórmula
literal (Degradado ← `presente&&degradado`, No-sé ← `!presente`), pasarían dos cosas malas:
Degradado quedaría como **código muerto**, y el caso «índice falta» se pintaría como **«No lo
sé»** — exactamente el plegado que la Costura 4 rechazó.

**Parado y preguntado a Antonio** con la remap que preserva su intención de 4 estados.
Antonio confirmó la remap. *(Es una entrada para destilar al estado: corrige lo que él
había aprobado mal en la Costura 4.)*

### Fase 2 · Construcción, y qué dio verde mientras el fallo estaba vivo

- **Clasificador puro `clasificarEstado` + `construirModelo` + `modeloSeguro`** en
  `src/engine/panel-estado.ts`. La página `src/app/estado/page.tsx` solo pinta.
- **Las tres contrapruebas, con su ROJO demostrado antes del verde:**
  - Ley 1: rompí el clasificador (`return 'al-dia'` fijo) → **rojo**: «un índice de hace 3
    días es DESACTUALIZADO» falló con *expected 'al-dia' to be 'desactualizado'*. Revertido → verde.
  - Costura 4: `!presente → 'ilegible'` → **rojo**: el «índice falta» se plegaba en «no lo
    sé», justo lo que se rechazó. Revertido → verde.
  - Ley 3: quité el `try/catch` de `modeloSeguro` → **rojo**: la excepción se escapó (habría
    tumbado la página). Revertido → verde.

- ⭐ **QUÉ DIO VERDE MIENTRAS EL FALLO ESTABA VIVO — el bug del millar.**
  `incidencias.toLocaleString('es-ES')` pintó **«2034»**, no «2.034». Los 14 tests del panel
  estaban **en verde** —ninguno miraba ese formato— y el typecheck y el lint también: el fallo
  solo se vio **abriendo la página de verdad** a 360 px y leyendo el píxel. Causa: Node con ICU
  recortado (como el de Hostinger) no agrupa millares con `toLocaleString`. Arreglado con
  `formatearMillar` (agrupa a mano, determinista), y **ahora sí hay un test que lo mira**.
  *Lección viva: el verde de los tests no cubre lo que ningún test observa; abrir la página al
  tamaño real encontró lo que 14 tests en verde no.*

- **Fingir los 4 estados sin tocar la app:** manipulé el índice en disco (raspado, gitignorado,
  con copia). al-día = generadoEn reciente; desactualizado = hace 3 días; degradado = sin
  fichero; ilegible = `generadoEn` basura (JSON válido, fecha infechable). Tropiezo: el **caché
  por `mtime`** del lector no refrescaba entre sobrescrituras rápidas en Windows → forcé `mtime`
  creciente con `utimesSync`. (Es del arnés de prueba, no del código.)

### Fase 3 · Diagnóstico de las 9 paradas solo-barrido (solo lectura, sin tocar nada)

- ⭐⭐ **DESCUBRIMIENTO 1 — las coordenadas de las 9 NO hacen falta a mano: Avanza las
  da.** El feed crudo de poste (`gps.avanzabus.com/…/fRefrescaEmpresaExternos`) devuelve
  el `marcadorParada` (LAT/LON del poste), y el parser YA lo extrae
  (`parse-poste.ts:76`) y la app YA lo consume (`llegadas.ts:137`). Consulté los 9 en
  vivo: los 9 devuelven coordenada plausible de Zaragoza. El fichero manual
  (`data/postes-solo-barrido-coordenadas.json`) está VACÍO (0 resueltos). El barrido no
  las tiene porque usa `get_stops_list` (orden, no coords); la coord vive en OTRO feed
  que el barrido no consulta, y el guardia `paradaDelPoste` corta esos postes antes de
  pedirlo. ⇒ cambia el alcance del remate: puede sembrarse del feed, no observarse a mano.
- ⭐ **DESCUBRIMIENTO 2 — el `correspondencias.json` de disco NO es de hoy.** Su
  `generadoEn` es `2026-07-24T18:27:28.945Z` (el que yo dejé la sesión pasada), aunque su
  mtime es de hoy (25/07 10:27Z) y la puesta al día decía «regenerado hoy, generadoEn de
  hoy». La causa NO CONSTA (¿barrido a suelo? ¿cp?). No bloquea el diagnóstico (los 9 son
  estructurales). Reportado a estrategia.
- ⭐ **DESCUBRIMIENTO 3 — cabo VIVO, no teórico:** las 9 aparecen en el itinerario de sus
  líneas y se enlazan a `/parada/[poste]` sin mirar `sid` (`Itinerario.tsx:187`), que da
  404 (`paradaDelPoste` null → `notFound`). Verificado en vivo (11:11Z): las 4 líneas
  (34/35/52/28) están desviadas por esos postes AHORA. Un usuario los pincha hoy y cae al 404.

### Fase 4 · Tanda A — fijar las 9 coordenadas con procedencia honesta

- **El script** `scripts/coords-solo-barrido.ts` reutiliza `leerPoste` (parse-poste) y saca
  el `marcadorParada` de los 9. Caja de cordura de Zaragoza; si alguno diera coord ausente,
  mala o fuera de la caja, NO escribe nada y se para. Los 9 salieron limpios.
- ⭐⭐ **DESCUBRIMIENTO / choque de procedencia (para destilar al estado):** el fichero de
  coords y el barrido estaban modelados SOLO para `observacion_propia` (una persona a mano),
  con el barrido cableando `confidence: 'observacion_propia'` type-locked. Pero estas 9 vienen
  de un FEED (`avanza-web`), no de una persona. Fijarlas con el modelo viejo habría escrito una
  **mentira de procedencia**. Se remodeló el tipo a una unión `avanza-web | observacion_propia`
  y se extrajo `fijarCoordenada` (pura) para que el barrido PROPAGUE la fuente en vez de pisarla.
  ⇒ corrige lo que el estado decía sobre "buscar las coords a mano": ya no; las da Avanza.
- **Contraprueba red-first (el corazón):** con `co.fuente='avanza-web'`, `fijarCoordenada` debe
  devolver `coordProc.fuente='avanza-web'`. Reintroduje el cableado viejo (`{...co, fuente:
  'observacion_propia'}`) → **rojo**: *expected 'observacion_propia' to be 'avanza-web'* ("el
  barrido pisó avanza-web"). Revertido → verde. Y verificado en un índice **regenerado en vivo**:
  9/9 salen `avanza-web`, no supuesto.
- ⚠️ **Cabo menor, NO tocado (dejo constancia):** `build-correspondencias.ts` sigue imprimiendo
  *"9 poste(s) solo-barrido con coordenada ya resuelta a mano"* — «a mano» ya no es del todo
  cierto (vienen del feed). Es un log de presentación, no dato ni pantalla; lo dejé fuera del
  alcance de las 5 zonas. Cabo para estrategia (una palabra).

- ⭐ **DESCUBRIMIENTO para destilar al estado — un guardián que grepea CRUDO.**
  Al arreglar el millar, el comentario que explicaba *por qué* evito el formateo de locale
  contenía la sintaxis de llamada de ese método, y **`tests/motor-vivo/horas-malas.test.ts` se
  puso rojo**: su primer escaneo (el que prohíbe métodos de fecha/locale en `src/engine`) lee el
  fichero **sin quitar comentarios** y cazó la frase, no una llamada. Es exactamente la lección
  que el proyecto ya tiene escrita en otros guardianes (*«un test que no distingue el código de
  la prosa hace grep»*) — y su propio bloque hermano de la misma línea 180 SÍ usa
  `sinComentarios`. Lo esquivé reescribiendo mi comentario (no toqué el guardián: está fuera de
  alcance). Pero **el guardián tiene esa costura**: sobre-caza comentarios. No es peligroso (solo
  falsos positivos, nunca falsos negativos), pero es un cabo para estrategia.

### Fase 5 · Tanda B — hacer visitables las 9 solo-barrido (el puente)

- **El puente, sin StopId falso (Vía 3).** Un tipo discriminado `ParadaVisitable` =
  `{clase:'gtfs', paradaId, poste}` | `{clase:'solo-barrido', poste, coord}`, en
  `src/engine/paradas.ts` (NO en `topologia.ts`, que sigue GTFS-puro). El `clase` obliga al
  COMPILADOR a bifurcar en cada consumidor: la disciplina (se olvida) pasó a tipo (no se puede).
  Se rechazó el StopId sintético por lo de siempre —una mentira estructural en el núcleo, mismo
  tufillo que `observacion_propia` sobre un dato de feed en la Tanda A—.
- **La frontera es un fichero, no el índice.** `resolverParada` prueba primero el GTFS
  (`paradaDelPoste`, intacto) y luego el whitelist estático de 9 claves. `numeroDePoste` se
  EXTRAJO de `paradaDelPoste` (comportamiento idéntico) para que las dos puertas normalicen los
  dígitos igual: el agujero de `0x2E8` no vuelve por la puerta nueva. Un 99999 no es de ninguna
  clase → null → 404.
- **Las 5 contrapruebas, con su ROJO demostrado antes del verde:**
  - **1 · frontera:** metí `99999` en el fichero → `resolverParada('99999')` dejó de ser null →
    **rojo** («expected {clase:'solo-barrido'} to be null»). Quitado → verde.
  - **2 · las 9 visitables:** vacié el fichero → las 9 no resuelven → **rojo**. Restaurado → verde.
  - **3 · degradado:** rompí el manejo del índice nulo (`degradado:false`) →
    `correspondenciasDePoste(null,617)` → **rojo**. Revertido → verde. Y **verde de verdad**:
    con el índice movido a un lado, un `next start` degradado sirve `/parada/617` en **200** con
    la nota tenue y SIN caja de desvío.
  - **4 · regresión GTFS:** rompí la rama GTFS del resolver → `744` dejó de ser `gtfs` →
    **rojo**. Revertido → verde. (Y la suite entera lo respalda: playwright 826, vitest 527.)
  - **5 · honestidad del nombre:** forcé `nombreProc='gtfs-marcado'` en la página, reconstruí, y
    `/parada/617` **pintó el aviso «nombre sin confirmar»** y cambió `data-nombre-fuente` →
    **rojo**. Revertido a `avanza-web` + rebuild → verde. Es la mentira que el tipo impide: una
    solo-barrido la nombra Avanza, no el GTFS roto.
- ⭐⭐ **DESCUBRIMIENTO (destilar al estado) — el feed ya traía el nombre y lo tirábamos.**
  `parse-poste.ts` sacaba del marcador (`maquinas[0]`) solo la coordenada; su `info`/`title`
  («Parque de Atracciones») se descartaba. Era la única fuente de runtime del nombre de las 9
  (el GTFS no las conoce). Ahora se captura —en la rama del marcador, sin rozar el cruce L1 de
  `tablatiempos`↔`maquinas`, que es sagrado—. Decisión de Antonio (Opción B): el nombre de las 9
  viene del feed, degradado-proof y fresco.
- ⚠️ **Cabo confirmado (la costura (e) del diseño):** en degradado **y** con el feed también mudo
  (p.ej. `?fingir=sin-buses` sin índice), el nombre cae a `«poste 617»` —ni feed ni índice de
  donde sacarlo—. Es el fallback honesto, no un bug: con Avanza en vivo (el caso real) el feed da
  el nombre aunque no haya índice. Lo vi porque el `grep "Parque de Atracciones"` del curl en
  degradado salió **vacío** mientras el test (que solo miraba el 200 y la nota) estaba en verde:
  el output me dijo lo que la aserción no miraba. Está dicho, no tapado.

### Fase 6 · El sitemap (estático, coherente con robots)

- **Tres piezas, un dominio.** `src/sitio.ts` (`URL_SITIO`) es la ÚNICA fuente del dominio, que hasta
  hoy solo vivía en comentarios y `.env.example`. La leen tres: `metadataBase` del layout, el
  `Sitemap:` de robots, y las URLs del `app/sitemap.ts`. Sin copia a mano.
- **Estático de verdad.** `next build` lista `/sitemap.xml` como `○ (Static)`: no usa API de
  request-time, así que se hornea. El conjunto (portada + 44 líneas de `lineas()`) sale del GTFS del
  bundle → cambia con el deploy, que es cuando el estático se rehace. El cron NO lo toca (regeneraría
  algo idéntico e invitaría a `lastmod=hoy`).
- **El sitemap renderizado, medido (no supuesto):** 47 `<url>`, **0 localhost, 0 `/parada/`, 0
  `?sentido=`, 0 `<priority>`, 0 `<changefreq>`**; 44 `<lastmod>` (solo las líneas), todos =
  `2026-07-25T10:48:05.567Z`, que es exactamente el `generatedAt` del GTFS. Las 3 fijas (`/`,
  `/sobre-los-datos`, `/estado`) sin `<lastmod>`. `robots.txt` mantiene sus allow/disallow intactos y
  añade `Sitemap: https://zetabus.antonioblanquez.es/sitemap.xml`.
- **Las contrapruebas, con su ROJO antes del verde:**
  - **coherencia sitemap↔robots (la más cara):** metí `/parada/617` en el sitemap → **rojo**
    («el sitemap lista "/parada/617", bloqueado por robots "/parada/"»). Quitado → verde.
  - **lastmod honesto:** cambié `generadoEn` por `new Date()` → **rojo** (el test fija el esperado al
    `generadoEn`). Revertido → verde.
  - Y sin rojo pero fijados: las 44 líneas salen de `lineas()` (no número mágico), ninguna con
    `?sentido=`, todas absolutas contra el dominio.
- **Aclaración honesta (no es bug):** el sitemap emite URLs absolutas porque las compone con
  `URL_SITIO` directamente, NO porque dependa de `metadataBase`. Así que el test de "URLs absolutas"
  pasaría aunque faltara `metadataBase` — su verdadero cometido es OG/canónicas y callar el aviso de
  build de Next. Los dos beben de la misma `URL_SITIO`, así que no divergen.
- **Cabos para estrategia (ya reportados):** faltaba `metadataBase`/constante de dominio (resuelto con
  `@/sitio`); y `robots.ts:33` sigue diciendo «74 páginas» de `/linea` cuando son **44** (74 son
  sentidos, que van por `?sentido=`) — no lo toqué, es prosa de un comentario ajeno a esta tanda.

### Fase 7 · La OG image (la tarjeta al compartir)

- **`app/opengraph-image.tsx`** (convención Next 16 · `ImageResponse`): 1200×630, marca (Z + poste +
  bandera, dos tonos violeta) desde la **fuente única** `Z_PATH` —interpolada como en `icon.tsx`, NO
  redibujada: `marca-z-unica.test.ts` sigue verde—, "ZetaBus", subtítulo, y pie con
  `zetabus.antonioblanquez.es` + `44 líneas · 934 paradas` **derivado de `lineas()`/`paradas()`** (no a
  mano, no se pudre). La marca va como `<img>` data-URI SVG (Satori no pinta `<svg>` inline).
- **Subtítulo elegido por Antonio (A):** «Autobuses de Zaragoza en tiempo real. Y cuando no lo sabe, lo
  dice.» — la tesis del proyecto (función + sello de honestidad delante).
- **Hex a pelo, con el motivo del favicon:** Satori no lee `var(--color-…)`, así que los tokens van por
  valor y su copia está en el allowlist de `tests/sistema-visual.test.ts` (`opengraph-image.tsx`).
- **`openGraph`/`twitter` en el layout:** tipo, url, siteName, locale y `summary_large_image`; el
  título/descripción se **heredan** (no se reescriben) y la **imagen la añade Next sola** (og:image +
  twitter:image absolutas vía `metadataBase`). Verificado en vivo: `/opengraph-image` → **200 image/png**,
  y las meta tags salen con URL absoluta contra el dominio (no localhost). Miré el PNG a ojo: legible,
  on-brand.
- ⚠️⚠️ **HALLAZGO (para destilar al estado):** `npm run lint` del repo **llevaba ROJO desde el 24/07 sin
  que se viera** — 6 errores en `src/components/interno/TokensVivos.tsx` (`react-hooks/set-state-in-effect`,
  último commit del fichero `6aa5ae9`, 24/07). Por qué no se vio: las tandas corrían `eslint <ficheros
  concretos>` en vez del lint completo, así que el «eslint verde» reportado era **parcial** —solo los
  ficheros tocados—, no el repo entero. Mis 3 ficheros de la OG están limpios; el rojo es pre-existente y
  ajeno. Se commitea la OG aparte (atomicidad); `TokensVivos` va como su propia tanda.

### Fase 8 · Cerrar los 6 errores de lint Y la causa raíz (el CI que no corría eslint)

- ⚠️⚠️ **EL CAMPO ESTRELLA — un instrumento que mentía por omisión.** El `npm test` era `vitest` +
  vigía-README: **no ejecutaba `eslint`**. Y el «verde» de cada tanda era `eslint <ficheros tocados>`,
  parcial por diseño. Resultado: el lint completo llevaba rojo **sin que nada lo cazara**. La suite decía
  «todo bien» porque **no miraba** — no porque estuviera bien. Un guardián que no se ejecuta no es un
  guardián; es una promesa. Se cierra enganchando el lint al comando de test.
- **Corrección al hallazgo de la Fase 7 (con evidencia):** el rojo **no** entró el 24/07 con `6aa5ae9`.
  El blame lo desmiente: las 6 líneas son de `5c2cda8` (15/07), `332e588` (15/07) y `ac51123` (20/07);
  `6aa5ae9` solo fue **el último commit que tocó el fichero**, no las líneas. Y la regla no es nueva:
  `eslint-plugin-react-hooks@7.1.1` (que trae `set-state-in-effect`) entró con el install de Next 16.2
  (`a53df4d`). El rojo es tan viejo como el código (**15/07**), no del 24.
- **Orden = contraprueba (rojo antes que verde).** (1) `pretest: npm run lint` en `package.json` → (2)
  `npm test` **aborta en rojo** cazando los 6 dentro del comando (antes daba verde ignorándolos): la
  causa raíz demostrada. (3) arreglo → (4) `npm test` verde.
- **Diagnóstico previo (con evidencia):** las 6 son **legítimas**, no antipatrón. El mismo gesto —
  `useState(null)` → `useEffect(setState(leído del navegador), [])`— porque leen **CSSOM/DOM que no
  existe en SSR** (`getComputedStyle`, `styleSheets`, `getBoundingClientRect`). `deps []`, un disparo,
  sin cascada; el doble render placeholder→valor es **intencionado y SSR-safe**. Es el caso que la regla
  no distingue del malo. **Ninguna es bug latente.**
- **El arreglo: encapsular, no silenciar.** Hook **`useLecturaDelDom(fn)`** —el patrón una sola vez— con
  **UN** `eslint-disable-next-line react-hooks/set-state-in-effect` justificado (el único del repo). Las
  6 repeticiones (Paleta/Escala/Radios/Control/Superficies/Espaciado) pasan a una llamada al hook. La
  regla **no se relaja** en la config: desaparecen porque hay un punto legítimo, no porque se silencie.
- ⚠️ **Un segundo `disable`, de OTRA regla:** `react-hooks/exhaustive-deps` en el hook. Inevitable al
  encapsular —`fn` entra como parámetro y la regla lo pediría en `deps`, y queremos `[]` a propósito—.
  Comprobado con `--report-unused-disable-directives`: **ninguno de los dos es un directive muerto**.
- **Comportamiento idéntico:** verificado a ojo (`/interno/sistema-visual`, capturas 390px: paleta con
  valores reales, radios 6/8/12/16, control 24/44/48/56) + `e2e/sistema-visual.spec.ts` verde. Mismo
  placeholder, misma lectura, mismo doble render.
- **Descubrimiento menor (ajeno, NO tocado):** enganchar el lint destapa **2 warnings** pre-existentes
  —`.tmp/commits.mjs` y `e2e/nombres.spec.ts`, `no-unused-vars`—. Son *warnings*, no rompen el lint
  (sale 0), y son de otra deuda. Se dejan.
- **Verde antes de commitear:** tsc 0 · lint completo (pretest) verde · vitest 537 · playwright 826 ·
  vigía. Dos commits atómicos: el refactor+hook, y el enganche del CI.

### Fase 9 · Tres textos que se quedaron rancios (misma familia que el «no existe todavía»)

Prosa que fue cierta y nadie actualizó. Cero lógica, cero comportamiento: literal/log/comentario de
cara a humano. Los números, verificados contra el motor/estado real antes de tocar (no de memoria):
`lineas()` = **44**; las 9 solo-barrido = **`avanza-web`** las 9 (lo dice el `_meta` del propio
`postes-solo-barrido-coordenadas.json`: «NO de observación manual»).

- **README · hoja de ruta:** el «Panel de estado» estaba en *Previsto, sin fechas* — pero `/estado` YA
  está desplegado y vivo (`app/estado/`). Se mueve a la línea **✅ Hoy**. ⚠️ El otro previsto —«avisos
  de parada suprimida en la vista de parada»— **sigue pendiente de verdad** y se deja intacto.
- **`scripts/build-correspondencias.ts` (log):** «coordenada ya resuelta **a mano**» → «resuelta **desde
  el feed de Avanza**». Desde la Tanda A las 9 vienen del feed (avanza-web), no de una persona. Es un log
  de consola, ni dato ni pantalla.
- **`src/app/robots.ts` (comentario):** «Son **74** páginas —no 934—» → «Son **44** —una por línea; los
  74 **sentidos** van como `?sentido=`, query y no URLs aparte—». 44 líneas = 44 URLs; los 74 son
  sentidos, no páginas distintas (el sitemap ya emite 44, una por `lineas()`).
- **Guardián:** `readme-no-miente.test.ts` sigue verde (24 ✓) — el reword no tocó ninguna cifra que
  vigile. npm test completo (con lint) verde.
- **Descubrimiento (ajeno, NO tocado):** en el MISMO log (`build-correspondencias.ts`, unas líneas
  arriba) queda otra frase de la misma familia: «poste(s) solo-barrido **SIN coordenada a mano**
  todavía». El «a mano» arrastra la misma inexactitud (hoy se resuelven desde el feed). Fuera de alcance
  de esta tanda; se reporta para valorar aparte. Y los **warnings del lint son 3, no 2** como dije en la
  Fase 8 (me comí el de `src/engine/fingir.ts` al truncar la salida): los tres pre-existentes y ajenos.

### Fase 10 · La gemela de «a mano» + barrido de mentiras del README (solo lectura)

- **Parte 1 (corregida):** la gemela que reporté en la Fase 9. `build-correspondencias.ts:106`, log:
  «poste(s) solo-barrido SIN coordenada **a mano** todavía» → «SIN coordenada **del feed de Avanza**
  todavía». Grep previo: solo esa (la otra «a mano» del fichero, línea 28, es «ejecución a mano» =
  correr el script a mano, otro sentido; **no se toca**). npm test (con lint) verde.
- **Parte 2 (informe, README NO tocado):** barrido entero buscando SOLO mentiras (no estilo). Verificado
  contra el repo: 44 líneas · 934 paradas ✅ · pliego 350 / busesmadrid 43 / total 403 ✅ (guardados) ·
  13 informes de auditoría = «trece» ✅ · UA `ZetaBus/0.1 (+…/zetabus)` exacto (`transporte.ts:56`) ✅ ·
  503 sin token en `/api/regenerar` ✅ · stack (Next 16 / React 19 / TS 5 / Tailwind 4 / Leaflet /
  Vitest / Playwright) ✅ · todos los pantallazos y enlaces (`.env.example`, `LICENSE`,
  `THIRD-PARTY-NOTICES.md`, `LECCIONES.md`, `data/gtfs/README.md`) existen ✅.
- **UN hallazgo (para Antonio, tanda aparte):** README:182 «**Sumadas** dan los 403 vehículos» — 350+43
  = **393**, no 403. Las tres cifras son correctas por separado (guardián verde), pero «Sumadas» implica
  una suma que no cuadra: los 10 que faltan vienen de `observacion-propia` y `json-heredado-sin-verificar`
  (fuentes que la tabla no lista como filas de conteo). No se toca aquí (es diagnóstico).

### Fase 11 · Corregir el «Sumadas» (la suma que no sumaba)

- **Reword escueto (decisión de Antonio):** «**Sumadas** dan los 403 vehículos» → «Las dos fuentes
  principales dan **393**; con algunas fuentes menores se llega a los **403** vehículos que ZetaBus
  reconoce». Honesta: ya no afirma que 350+43=403. Sin filas nuevas en la tabla, sin nombrar las fuentes
  menores (ese detalle vive en `/sobre-los-datos` y en el dato), sin tocar 350/43/403.
- ⚠️ **El guardián se puso rojo, y NO era una mentira nueva:** `readme-no-miente` vigila la cadena
  literal `los **403 vehículos** que ZetaBus reconoce` con espacios simples. Al reajustar el párrafo
  partí «que\nZetaBus» en dos líneas y el patrón dejó de casar («vigilando un texto que ya no existe»).
  Era un artefacto de salto de línea de mi propio reword, no un choque semántico. Arreglo: mantener la
  frase vigilada contigua en una sola línea. Cifra y afirmación, intactas. **Lección:** un guardián que
  ancla en cadenas literales es sensible al ajuste de línea del Markdown — al reescribir cerca de una
  frase vigilada, no la partas.
- **Verde:** npm test (con lint) · readme-no-miente 24 ✓ · vitest 537. Commit atómico (solo README).

### Fase 12 · Cierre: versión 1.0.0 + CHANGELOG (remate de presentación)

- **Decisión (Antonio):** ZetaBus está desplegado y completo → es una **v1 real**, no 0.1.0 de
  andamiaje. CHANGELOG **limpio**: solo `[1.0.0]`, solo `Added` (en una primera versión no hay historia
  previa que `Changed`/`Fixed` — inventarla sería mentir).
- **Contraprueba REAL del User-Agent:** no basta con `package.json`. Importé la constante `AGENTE` (la
  que se usa literal en `'User-Agent': AGENTE`, `transporte.ts:63`) y confirmé que la petición sale con
  **`ZetaBus/1.0`**, no solo que el `package.json` diga 1.0.0.
- ⚠️⚠️ **DESCUBRIMIENTO — la versión NO vive en 3 sitios, vive en 6+, y cableada por separado.** El
  diagnóstico contaba 3 (`package.json`, `transporte.ts`, README); el barrido de `ZetaBus/0.1` encontró
  también `THIRD-PARTY-NOTICES.md:94` y **dos docs históricos** (`docs/auditoria/11-…:69`,
  `docs/diseno/tanda1-…:706`). Criterio aplicado: se suben a 1.0 los **4 de estado actual** (package.json,
  el UA real, README:207, THIRD-PARTY:94 — este último lo **manda** la cicatriz de `transporte.ts`:
  «actualizar README y THIRD-PARTY § 4 EN EL MISMO COMMIT»). Los **2 históricos NO se tocan**: son
  informes de fase que describen lo que se auditó entonces; reescribirlos falsearía el registro (mismo
  principio «no inventar historia» del CHANGELOG). **Para destilar al estado:** la versión está cableada
  a mano en N sitios sin fuente única, y no hay guardián que vigile el desfase (ningún test mira el UA).
- **NO se unifica (a mano, y anotado como cabo):** README y THIRD-PARTY son prosa (no pueden leer de una
  fuente), y unificar el código metería un import de `package.json` + lógica `major.minor` en un módulo
  de red, contra el «cero lógica» de esta tanda. El repo ya trata esto como disciplina manual (la propia
  cicatriz). Un guardián que cruce `AGENTE` con `package.json` sería el arreglo de fondo — queda como
  cabo para valorar.
- ⚠️ **CHANGELOG.md nacía IGNORADO.** El `.gitignore` usa «denegar todo en la raíz (`/*`) + allowlist»;
  los docs de raíz se rescatan con `!/…`. CHANGELOG no estaba en la lista, así que `git add` lo rechazaba
  y el guardián de enlaces (`readme-no-miente`, resuelve con `git ls-files`) marcó el enlace
  README→CHANGELOG como roto **antes** de dejarme commitear un enlace a un fichero fantasma. Se rescató
  con `!/CHANGELOG.md` junto a sus hermanos. El guardián hizo exactamente su trabajo.
- **Un commit de release atómico** (no troceado): la cicatriz obliga a README+THIRD-PARTY+UA juntos, y
  el enlace del README al CHANGELOG obliga a que CHANGELOG viaje en el mismo commit. Todo atado.
- **Verde:** npm test (con lint) · readme-no-miente 24 ✓ · vitest 537 · lint 0 errors.

### Fase 13 · Badge de versión en el README (escaparate honesto)

- **Un badge, y solo los ciertos.** Se añade en la cabecera un shield `versión 1.0.0` (del release real,
  no inventado), enlazado al CHANGELOG. Color **`4E22B8`** (violeta-poste de la marca) para que no
  colisione con el de licencia (`7048E8`) — badge distinto, misma familia de marca. Licencia (Apache-2.0,
  ya presente y = `LICENSE`) y stack (Next/TS/Leaflet, ya presentes) NO se duplican.
- ⛔ **Ningún badge de build/CI/coverage:** no hay infra pública que los respalde; un badge así sería una
  mentira en el escaparate, justo lo contrario del proyecto.
- ⚠️ **Casi toco el resto:** al principio recoloreé el badge de licencia para que el de versión fuera el
  violeta principal. Lo revertí: la tanda dice no tocar el resto del README. El badge de versión lleva el
  tono de marca oscuro y punto; licencia queda como estaba.
- **Verificado que se ve:** el shield renderiza (HTTP 200, image/svg+xml) y el SVG contiene «versión» y
  «1.0.0» (el acento sale bien con `versi%C3%B3n`). readme-no-miente verde (el enlace a CHANGELOG resuelve
  —ya trackeado— y el shields.io externo no lo vigila el guardián de enlaces).
- **Cabo conocido, no empeorado:** el «1.0.0» del badge es otro sitio a mano de la versión (ver Fase 12).
  Es texto estático; al subir a 1.1 se cambia aquí también. No crea acoplamiento oculto nuevo: es visible
  y queda anotado con los demás sitios de la versión (Fase 12).

### Fase 14 · Momento oro — el GIF «Avanza cae → no lo sabemos» (Fase 5, escaparate)

- **El diferenciador, VISTO.** El reclutador leía «cuando no sabe, lo dice» pero no podía verlo (el
  estado caído se dispara con `?fingir=caido` + `ZETABUS_DEMO=1`, que no está en producción). Ahora un
  GIF en el README lo muestra: parada 744 con autobuses en vivo → Avanza deja de responder → «Avanza no
  responde · no lo sabemos» (copy REAL de `LlegadasVivas.tsx`, no maqueta).
- **Reproducible, no un binario caído del cielo:** `e2e/momento-oro.spec.ts` captura los dos estados
  reales (con el `?fingir=` de verdad); `scripts/gif-momento-oro.mjs` los monta con **ffmpeg** (normal
  2 s → fundido 0,5 s → caído 3 s, 12 fps, bucle). Un comando regenera todo.
- **Dos decisiones de honestidad (Antonio), y por qué:** (1) la **banda de demo** («los datos son
  inventados») SE QUEDA dentro del GIF — quitarla presentaría un dato falso como real en la pieza que
  demuestra la honestidad; es el mecanismo de honestidad EN ACCIÓN. (2) la **coletilla técnica**
  (`ECONNREFUSED (fingido)`) SE QUEDA — el `(fingido)` suma transparencia; no se edita el copy (sería
  inventar). Pie de imagen honesto que lo marca como estado **simulado**.
- **Verificado mirándolo, no fiándome del verde:** abrí el GIF (primer frame = normal con banda) y
  extraje el último frame (= caído con «no lo sabemos» + `(fingido)`) → la transición está entera.
- **Peso:** móvil 787 KB, escritorio 756 KB — los dos < 1 MB. No inflado.
- **Descubrimiento (menor):** el **escritorio aporta poco**. `/parada` es una columna `max-w-2xl` a
  cualquier ancho, así que en 1280px es la misma columna centrada con márgenes grises. Se genera igual
  como extra (`<details>` «Verlo en escritorio», secundario) por pedirlo Antonio, pero el móvil es el
  que cuenta —se vive como una marquesina—.
- **`docs/capturas/` SÍ estaba allowlisted** (`!/docs/`), así que el GIF se trackea sin rescate (a
  diferencia del CHANGELOG). Aun así se añadió al índice ANTES de `npm test`: el guardián de enlaces
  resuelve con `git ls-files`, y un README que enlaza a una imagen no trackeada da rojo.
- **Verde:** npm test (con lint) · readme-no-miente 24 ✓ · vitest 537.

### Fase 15 · Quitar el GIF de escritorio + diagnóstico de marcos de las imágenes

- **Parte 1 (hecha):** fuera el `<details>` «Verlo en escritorio» del README, `git rm` de
  `docs/capturas/momento-oro-escritorio.gif`, y el script/spec dejan de generar el 1280px (solo móvil).
  El GIF móvil intacto. npm test (con lint) verde, readme-no-miente 24 ✓.
- **Parte 2 (diagnóstico, sin tocar imágenes):** inventario mirando las 8 de verdad. **Hay un sistema
  coherente: móvil → marco de teléfono; escritorio → a pelo.** Con marco: `home-movil`, `parada-movil`,
  `desvio-abierto-movil`. A pelo: `home-escritorio`, `parada-escritorio`, `desvio-abierto`,
  `linea-recorrido`. **La excepción es el GIF:** es formato móvil pero SIN marco → rompe la regla. La
  impresión de Antonio era correcta.
- **Cómo se hizo el marco (commit `f7a642d`):** dibujado DENTRO del PNG (fondo transparente, sombra en
  el alfa; el README solo lleva `<img>`, GitHub no tiene CSS). `#0F172A` (--color-tinta) + aro de 1,5 px
  al 16 % blanco (para no desaparecer sobre el fondo oscuro de GitHub), bisel 4,35 %, radio 14,67 %,
  margen de sombra 9 %. **NO hay script que lo componga: se aplicó a mano.** La receta está en el mensaje
  del commit, así que es reproducible… pero hoy no lo está.
- **Recomendación (para decisión de Antonio):** enmarcar SOLO el GIF (el móvil que falta), para que case
  con los otros tres móviles y se respete la regla ya existente. Coste: 1 imagen. Viabilidad: componer el
  bisel sobre un GIF animado es factible con ffmpeg/sharp, pero hay que verificar peso y nitidez (el
  bisel es plano y oscuro → barato en paleta). Sería, además, la ocasión de SCRIPTAR el marco (desde la
  receta de `f7a642d`) y dejarlo reproducible. Va en tanda aparte.

### Fase 16 · El GIF se queda a pelo; el marco, scriptado (para PNG)

- ⚠️⚠️ **HALLAZGO (para destilar al estado): enmarcar un GIF animado es prohibitivo en peso.** El marco
  necesita transparencia (esquinas redondeadas + sombra suave sobre fondo agnóstico de tema: GitHub
  claro/oscuro), y la transparencia **rompe la compresión entre-frames** — cada frame se guarda casi
  entero. Medido sobre `momento-oro.gif` (787 KB a pelo): GIF enmarcado con dither **5,7 MB**, APNG con
  sombra **5,0 MB**, GIF sin dither/128 colores **4,9 MB**. Todos ~5-6× el techo de 1 MB. Y un GIF solo
  tiene alfa de 1 bit → ni siquiera reproduce la sombra suave. **Decisión (Antonio): el GIF se queda A
  PELO** (787 KB, nítido) — el propio fallback «mejor a pelo nítido que enmarcado gordo/borroso». La
  única captura de móvil sin marco es una **excepción justificada por el peso**, no un descuido.
- ⭐ **DESCUBRIMIENTO (para el estado): el marco de móvil ya NO es a mano.** `scripts/marco-movil.mjs`
  scripta la receta de `f7a642d` (bisel 4,36 %, radio 14,67 %, margen 9 %, `#0F172A`, aro al 16 % blanco)
  como constantes con nombre. Verificado sobre una captura cruda → PNG de la misma familia que
  `home-movil.png`, ~160 KB. **Solo PNG** (rechaza GIF a propósito, con el porqué en la cabecera). Queda
  disponible para re-enmarcar los 3 PNG de móvil en el futuro de forma reproducible; **hoy no se aplica**
  (ya tienen marco). El GIF (`momento-oro.gif`) y el README quedan intactos.

### Fase 17 · El CDN sirve HTML viejo tras deploy — Vía 2 (`revalidate`) DESCARTADA, purga a mano

- **El problema (26/07):** tras un re-deploy, ZetaBus cargaba **sin estilos**. Causa: Next marca el HTML
  prerenderizado con `s-maxage=31536000` (un año); el CDN de Hostinger lo cachea y **no lo purga al
  desplegar** → sirve el HTML viejo, que apunta a `/_next/static/*` con hash **antiguo** que el build
  nuevo ya borró → 404 en los assets → página a pelo.
- **Vía 2 probada y medida: `revalidate` en las 3 estáticas (`/`, `/sobre-los-datos`,
  `/interno/sistema-visual`) para bajar el `s-maxage` y que el CDN se autocure.** El header SÍ cambiaba
  bien (`s-maxage=30`/`300`, assets `immutable` intactos, `/estado` `no-store` intacta). **Pero rompía 2
  e2e** (`momento-oro`, `linea-sin-barrido`, las de `networkidle`) de forma **determinista**.
- ⚠️⚠️ **HALLAZGO (para destilar al estado): `revalidate` NO es solo cache del CDN — es también el
  stale-time del router de cliente de Next, y NO es afinable por TTL.** Cualquier ruta con `revalidate`
  enlazada desde el pie (`/` y `/sobre-los-datos` lo están en TODAS las páginas) dispara un **burst de
  prefetch `?_rsc=` al montar**. Medido en `/parada/744?fingir=caido` (misma sonda, ventana 15 s):
  baseline **16** peticiones `_rsc` → con `revalidate` **24** (9× `/` + 15× `/sobre-los-datos`). **Subir
  el TTL de 30 a 300 NO lo calma:** el burst es de montaje, no de expiración. Ese tráfico mantiene el
  `goto {networkidle}` abierto los 30 s → timeout. Contraprueba limpia: stash → rebuild baseline → **20
  passed**; con el cambio → **10 failed**. No es fragilidad del test: es tráfico de fondo REAL y mayor
  para todos los visitantes.
- **Decisión (Antonio): Vía 2 descartada, NO se automatiza.** El `revalidate` cobra un peaje de prefetch
  a cada visitante; una API de purga (`hosting_clearWebsiteCacheV1`) es un token + un *action* que
  mantener. **ZetaBus está cerrado y se despliega poquísimo** → no compensa. **La purga MANUAL del CDN es
  el procedimiento oficial** tras cada deploy: panel de Hostinger → Caché → Borrar caché.
- **Hecho:** los 3 cambios de `revalidate` **revertidos** (nunca se commitearon), árbol limpio. La purga
  manual documentada en `README.md` → «Poner en marcha» → **Desplegar**, como checklist visible.

### Fase 18 · Vulnerabilidades de dependencias — grupos A+B aceptados y documentados (`SECURITY.md`)

- **Punto de partida:** `npm audit` = **12 high**, todas transitivas. Grupo A = cadena de ESLint (9,
  dev-only); grupo B = `next` + sus transitivas `postcss` / `sharp` (3).
- ⚠️⚠️ **LECCIÓN (para destilar al estado): `next@16.2.12` NO limpia el grupo B.** El diagnóstico asumió
  que `npm audit fix` subiría Next a 16.2.12 y arreglaría postcss+sharp de golpe. **Falso, por dos
  motivos encadenados:** (1) Next está **clavado exacto** (`"next": "16.2.10"`), así que `npm audit fix`
  sin `--force` lo deja "fuera de rango" y no hace nada; (2) probado con `npm install next@16.2.12
  --save-exact`: 16.2.12 **empaqueta las MISMAS** `postcss@8.4.31` y `sharp@0.34.5` vulnerables que
  16.2.10 (verificado con `npm ls`), y tras el bump el audit seguía en 12 y su "fix available" pasaba a
  sugerir un **downgrade absurdo a `next@9.3.3`**. No hay parche no-breaking de Next que suba esas
  transitivas. **Todo revertido**, árbol a baseline (next@16.2.10).
- **Decisión (Antonio): aceptar A+B documentado, NO forzar dependencias.** `overrides` metería versiones
  que Next no ha probado (riesgo real de romper build/runtime) para tapar **CVEs no explotables** en el
  uso de ZetaBus. Coste/beneficio malo.
- **Hecho: `SECURITY.md` en la raíz**, honesto por diseño — **no afirma «no nos afecta», lo demuestra:**
  cada CVE lleva la feature que necesita + que ZetaBus no la tiene + el **comando** para comprobarlo.
  Verificado con grep ANTES de escribir: sin `'use server'`, sin `middleware.*`, sin `next/image`, sin
  `rewrites`/`i18n` en la config; `postcss` solo build-time (Tailwind), `sharp` solo en
  `scripts/marco-movil.mjs`. Añadido `!/SECURITY.md` al allowlist del `.gitignore` (misma trampa que
  CHANGELOG: `/*` lo ignoraba). Incluye vía de reporte (GitHub Security Advisories).
- **Cabo menor arreglado:** el `package-lock.json` tenía `"version": "0.1.0"` (rancio del bump a 1.0.0).
  Sincronizado a `1.0.0` tocando **solo** ese campo — `git diff` del lock = 2 líneas, cero cambios de
  dependencias, `npm audit` sin alterar (sigue 12).
- **Verde:** tsc · lint · vitest 537 · playwright · vigía-README. Sin cambios funcionales (solo doc +
  gitignore + campo version del lock).

### Fase 19 · El barrido pedía sin nonce → 403 (degradado). Arreglado: nonce de WordPress

- ⚠️⚠️ **CORRECCIÓN DEL DIAGNÓSTICO (era L75): NO era Radware.** El 403 de `get_stops_list` lo ponía
  **WordPress por falta de un `nonce`** que Avanza añadió a sus AJAX (jul/26). Aislando variables (Node
  plano): sin nonce → 403; con nonce → 200, **incluso con el UA de ZetaBus y sin cookies**. `rdwr_response:
  allowed` decía literal que Radware dejaba pasar. El nonce vive en el HTML de `lineas-y-horarios/` como
  `<input hidden id="avz_bus_ajax_nonce">`, lo baja un GET normal, es de ventana temporal (~12 h). **El
  asistente/bookmarklet queda descartado por innecesario:** el servidor cruza el «muro» él solo.
- **El arreglo (`recorrido.ts`):** `leerNonce` (GET + scrape del campo, HTML no regex), y `leerRecorrido`
  pasa a exigir el `nonce` como parámetro (guardarraíl en compilación). Dos estrategias, a propósito:
  - **Build** (`pedirNombres`): un nonce **fresco por barrido**, sacado antes del bucle y reusado en los
    74 POST. Si el GET del nonce falla → todo-fallido → degradado honesto (0% < suelo → índice de ayer).
  - **Runtime** (`desviosDeLinea` → `leerRecorridoRuntime`): nonce **memoizado por proceso** (TTL 30 min ≪
    validez ~12 h) para no pagar un GET por cada vista de línea. Y **fallback**: si el cacheado da 403
    (rotó antes del TTL), se invalida, se re-pide UNA vez y se reintenta; si el fresco también da 403,
    sube → `indeterminado`. Sin bucle, sin reventar.
- **Demo:** la página de horario fingida (`fingir.ts`) ahora lleva el `avz_bus_ajax_nonce`, **igual que la
  real** (es la misma página; `URL_NONCE` también es `lineas-y-horarios`). Sin esto, `?fingir=desviada`
  saldría `indeterminado` y su e2e caería. Con esto, `desvio-acordeon` sigue verde (30 ✓).
- **Tests (sin falsear):** el doble sirve la página del nonce (`respuestaNonce`/`conNonce`); se destapó un
  **verde falso** —el test de desvíos pasaba vacío porque el doble no servía el nonce y todo caía a
  `indeterminado`, saltándose la aserción real—; se arregló. Nuevo test del fallback 403→reintento.
- **Contraprueba:** aislado, sin nonce → **403** / con nonce fresco → **32 postes reales** (Cosuenda,
  Marqués de La Cadena…). **Barrido real en local: 74/74 respondieron, 0 fallaron → índice publicado (927
  postes, 93 KB).** El degradado se cura. Verde: tsc · vitest **539** · lint (0 err) · playwright **829**.
- **Cabo (reportado, no tocado):** un `probe.tmp.ts` **untracked** en la raíz (leftover con la firma vieja)
  rompía `next build`; se **movió al scratchpad** (no se borró: no era mío). Y `TTL_RECORRIDO_MS` sigue
  siendo código muerto (declarado, no usado) — ajeno a esta tanda.

### Fase 20 · La tabla de nombres llega al build — `nombres:ensure` (el aviso deja de ser ruido)

- **El problema:** en producción **TODAS las 934 paradas** salían «nombre sin confirmar». La tabla
  (`src/generated/nombres.json`) existía y funcionaba (`nombres:build`, ya con el nonce de la Fase 19) pero
  **no estaba enganchada a nada**, y está **gitignorada** (raspado de Avanza: no se versiona). Un aviso que
  salta en todas es ruido — no se lee.
- **La solución (Diseño C):** `scripts/ensure-nombres.ts`, **calcado de `ensure-correspondencias.ts`**:
  genera la tabla **solo si falta** (proceso hijo a `build-nombres`, no reimplementa nada), **no-fatal** (si
  Avanza cae o no llega al suelo del 80%, el build sigue y avisa con recuadro). Enganchado en el `build`
  **ANTES de `data:build`** — orden **crítico**: la tabla es **entrada** del horneado (`data:build` la lee y
  cuece los nombres en `gtfs.json`; en runtime nadie relee `nombres.json`). Si fuera después, nacería tarde.
- **Se DESCARTÓ unificar los dos barridos (Diseño B):** los nombres son **entrada** de `data:build` y el
  barrido de correspondencias necesita la **topología ya horneada** (`topologia.ts` importa `@/generated`) →
  corren en fases distintas **por necesidad**. Unir exigiría partir `barrerCorrespondencias` (el órgano que
  funciona en prod) y arriesgar que el índice regrese. No compensa: los nombres son **estables** (una vez por
  build) y las correspondencias las **refresca el cron cada noche** — ciclos de vida distintos.
- **Contraprueba del ensure (dos direcciones):** con `nombres.json` presente → **se salta en 3 s** (no
  rebarre); sin él → **lo genera** (barrido real 2m24s, **74/74 respondieron, 927 nombres**).
- **Contraprueba del efecto real** (`npm run build` en frío, borrando la tabla): el log de `data:build` pasó
  de *«NO hay tabla… TODAS sin confirmar»* a **`918/934 con nombre de Avanza (98%)` · `16/934 marcadas`**.
  El aviso baja de **934 → 16**, y las 16 son el corredor de desvíos de hoy (Coso, Av. Valencia, P.
  Independencia, San Vicente de Paúl): Avanza no las da porque las líneas van desviadas fuera → aviso
  **legítimo**, no ruido.
- **Página mirada (no solo el log):** `/parada/2` y `/parada/55` → sin aviso, `avanza-web`, nombre bien
  escrito («Av. de Cataluña n.º 51»); `/parada/264` y `/parada/333` (en desvío) → con aviso, `gtfs-marcado`,
  nombre roto del GTFS («Av. **De** Valencia», «Coso **N.º** 54»). El contraste es exacto.
- **Coste medido:** build en frío completo **con los DOS barridos** = **5m54s** (nombres 141s + correspondencias
  141s + resto). Dentro del ~6,5 min previsto. Hostinger no publica límite: si se cortara, el deploy falla
  visible y la web se queda con la versión anterior.
- **Alcance:** solo `scripts/ensure-nombres.ts` + el orden en `package.json`. **Cero cambios** a `barrido.ts`,
  el aviso de la UI, el parser o los consumidores. Verde: tsc · vitest **539** · lint (0 err) · playwright **831**.

### Fase 21 · README: documentada la capa de nombres (cerrado el hueco de la Fase 20)

- El README describía la capa de **correspondencias** en el build pero **no la de nombres** (hueco reportado
  al cerrar la Fase 20). Añadida una sección `### La capa de nombres`, **paralela** a la de correspondencias
  (mismo sitio, tono y longitud): qué es (el `ucwords()` del export rompe los nombres → se **piden** a
  `get_stops_list`), cuándo corre (`nombres:ensure` **antes** de `data:build`, y por qué ese orden), el
  resultado **medido** (918 de 934 con nombre de Avanza, 98 %; 16 marcadas, que son el corredor de desvíos
  del día → varía) y el fail-safe (Avanza caída → todas al GTFS marcado, el build lo dice).
- ⚠️ El guardián `readme-no-miente` ancla `/(\d+) paradas/`==934 y `/(\d+) líneas/`==44: el texto se redactó
  para que **solo «934» quede pegado a «paradas»** y **ningún número a «líneas»** («sus líneas van desviadas»).
  Verde: `readme-no-miente` **24** ✓ · `npm test` **539** · vigía verde.
- **Alcance:** solo `README.md` (+ esta bitácora). Cero código. El hueco queda cerrado.

### Fase 22 · Cabeceras de seguridad: +X-Frame-Options, +HSTS, +Permissions-Policy (perímetro, Fase 2 de la guía)

- `securityheaders.com` daba **C**: faltaban `Strict-Transport-Security`, `X-Frame-Options` y
  `Permissions-Policy`. Añadidas en `next.config.ts` → `headers()`. **Sin tocar la CSP** (la
  `upgrade-insecure-requests` que ve el escáner **viene del hosting, no de la app** — confirmado: 0
  coincidencias de CSP en el código) ni el `Cache-Control`.
- ⚠️ **Permissions-Policy INFORMADA, no copiada a ciegas:** grep confirmó que `navigator.geolocation` **no
  se usa ni una vez** (el chip «Cerca de mí» es decorativo, [Buscador.tsx:26]), ni cámara, ni micrófono, y
  que Leaflet no pide nada del navegador → `camera=(), microphone=(), geolocation=()` (apaga las tres,
  incluida la propia página). El día que se haga el «cerca de mí», se abre `geolocation=(self)`.
- ⚠️ **HSTS es pegajosa:** el `max-age` fuerza HTTPS un año AUNQUE se retire la cabecera; si el SSL cayera,
  el sitio quedaría inaccesible para quien ya la recibió. Se asume porque el SSL de Hostinger es estable y
  es lo estándar (decisión escrita en el commit).
- **Revisa una decisión anterior:** `docs/auditoria/12·B-D1` anotaba las tres como «adorno/teatro» (informe
  **histórico**, se queda como está); el comentario de `next.config.ts` se actualizó para no contradecirse.
- **Contraprueba (la cabecera que LLEGA):** *antes* (producción) = solo `referrer-policy` +
  `x-content-type-options` + CSP del hosting; *después* (local `build`+`start`) = las **tres nuevas
  presentes** en `/`, `/parada/744` y `/linea/35`. **Mapa:** `/parada/744` renderiza `.leaflet-container`,
  **16 teselas OSM 200 / 0 fallidas, 0 errores y 0 avisos de consola** en las tres rutas. Verde: tsc ·
  vitest **539** · lint (0 err) · playwright **830** (+1 flaky de red, re-pasado 15/15).
- **Alcance:** solo `next.config.ts`. No CSP, no `Cache-Control`, no código de app.

### Fase 23 · Limpieza (parcial): puntero de lecciones corregido; el chip y el TTL, PARADOS por descubrimiento

De tres limpiezas pedidas, **solo una se pudo hacer limpia**; las otras dos chocan con lo que dice el
código, y pararse era lo correcto.

- **✅ Puntero de lecciones (README).** [README.md:366-367] apuntaba las lecciones a `docs/LECCIONES.md`
  (que tiene **L1–L9**) sin decir que de la **L10 en adelante** viven en `ZETABUS-ESTADO.md`. No era falso
  —no decía «todas»— pero era un puntero incompleto. Corregido con el enlace al ESTADO. Guardián
  `readme-no-miente` verde (**24**); el enlace nuevo resuelve.
- **⛔ Chip «Cerca de mí»: NO EXISTE en el código.** El render de `Buscador.tsx` (43-106) es label + input
  + pista + lista de resultados; el `aria-hidden` de la 87 es el **badge del número** de cada resultado.
  Las únicas menciones a «Cerca de mí» en `src/` son **comentarios que dicen lo contrario**: *«ZetaBus
  TAMPOCO lo tiene todavía»* [page.tsx:44], *«NO ESTÁ HECHO AQUÍ TAMPOCO»* [Buscador.tsx:29] (describen el
  chip de la app de REFERENCIA, no el nuestro). **Ningún test lo cubre** (nada que ponerse rojo). No se
  puede «quitar» lo que no está: parado. (La nota del ESTADO·2255 apunta a `Buscador.tsx:26`, que es una
  LÍNEA DE COMENTARIO, no un elemento — a reconciliar.)
- **⛔ TTL_RECORRIDO_MS: muerto Y con un test que afirma algo FALSO.** Nadie lo importa (código muerto,
  cierto). PERO el recorrido se cachea de verdad con `motor().cache`, TTL por defecto **15 s**
  [motor.ts:95 → dos-pisos.ts:45] (2 s en `fingir`), **no 30 min**. El comentario de [desvios.ts:204] («la
  caché del recorrido: 30 min») y el test [pantalla-no-miente.test.ts:440] («son 30 minutos… si bajara a
  15 s ×120 tráfico») afirman un caché de 30 min **que no existe**: el recorrido YA está a los 15 s que el
  test dice temer. Borrar la constante pondría rojo un test que no vigilaba algo real. Parado: ¿solo
  cosmético (borrar const + test), o había intención de cachear recorridos 30 min que nunca se cableó
  (cabo de eficiencia: hoy se pide `get_stops_list` cada 15 s por sentido)? Lo decide Antonio.
- **Diagnóstico de la versión:** entregado aparte, solo lectura, sin implementar.

### Fase 24 · El TTL del recorrido, cableado de verdad a 1 h (caché dedicada, patrón `motorHorario`)

- **El hallazgo (Fase 23):** `TTL_RECORRIDO_MS` estaba **declarada (30 min) y nunca cableada** → la caché
  del recorrido caía al TTL por defecto (15 s), y un test afirmaba en verde que eran 30 min. Un cartel
  correcto sobre una tubería inexistente. Consecuencia real: `get_stops_list` cada 15 s por sentido en la
  vista de línea. Un desvío no cambia en 15 s.
- **Decisión A vs B (con mandato de rebatir):** (A) TTL por llamada en `CacheDosPisos.obtener` —toca la
  clase que sirve el vivo en producción—; (B) caché dedicada `motorRecorrido()`, patrón `motorHorario`.
  **Rebatida hecha** (5 puntos, fichero+línea): `motorHorario` es buen precedente; la 3ª caché es acotada
  (≤74 claves, sin rotación, `.cache/` gitignorado); **el techo YA es por instancia** ([dos-pisos.ts:110])
  —`motorHorario` ya tiene su cubo separado en prod—; **tres** llamantes de `desviosDeLinea` (page, campo,
  y un test que inyecta su caché); y nada NECESITA compartir instancia (dedup es por-clave, `/api/diag` ya
  omite el horario). **B se sostiene** → adelante con B.
- **Cableado:** `motorRecorrido()` en `motor.ts` (instancia aparte, `DIR_RECORRIDO`, `TTL_RECORRIDO_MS =
  60*60_000`, rama `fingir` a 2 s como `motor()`). La constante se **movió** de `desvios.ts` a `motor.ts`,
  junto a `TTL_HORARIO_MS` (su hermana; el TTL es asunto de la construcción de la caché, no del dominio).
  Hilados los dos llamantes reales: la vista de línea (`motor`→`motorRecorrido`) y `scripts/campo.ts`.
- **El vivo, a salvo por CONSTRUCCIÓN:** las llegadas siguen en `motor().cache` (15 s). Otra instancia: el
  TTL de 1 h no puede tocarlas. `/api/diag` lo confirma (`ttlSegundos: 15`).
- **El test que mentía, corregido:** `pantalla-no-miente.test.ts` ya no grepea la constante
  (`TTL_RECORRIDO_MS = 30*60_000`); verifica el **cableado** (que la vista use `motorRecorrido`). Y se
  ajustó el patrón `motor\(`→`motor\w*\(` de otro test que, al renombrar, dejaba de reconocer la vista de
  línea. Comentarios «30 min» corregidos a «1 h».
- **Las cuatro contrapruebas (reloj inyectado):** (a) ANTES: con 15 s el recorrido caduca a los 20 s. (b)
  DESPUÉS: con 1 h, fresco a los 30 min, caduca pasada la hora. (c) MUTACIÓN: descablado `motorRecorrido`
  (sin `ttlMs`) → el test se pone **ROJO** (`expected 15 to be 3600`), restaurado. (d) LLEGADAS: `motor().
  cache` a 15 s (test + `/api/diag`). Nuevo `tests/motor-vivo/ttl-recorrido.test.ts` (6 tests).
- **Verde:** tsc · vitest **545** (+6) · lint (0 err) · playwright **831** (`desvio-acordeon` y `mapa`
  incluidos). Páginas abiertas: `/linea/35`, demo `?fingir=desviada`, `/parada/744`.
- **Por descubrimiento:** al separar, el recorrido sale de `/api/diag` (que solo lee `motor().cache`) —
  igual que ya pasaba con `motorHorario`. Si se quiere ver su salud, es un follow-up pequeño (añadir su
  `instantanea()` a diag). No entra en esta tanda.

### Fase 25 · Cierre B — tres cabos pequeños (diag, comentarios «Cerca de mí», versión)

- **Cabo 1 · `/api/diag` vuelve a ver la caché del recorrido.** Al separarla en `motorRecorrido()` (Fase
  24) el diag dejó de verla: solo leía `motor().cache`. Ahora el bloque `cache` tiene DOS entradas CON
  NOMBRE: `llegadas` (TTL 15 s) y `recorrido` (TTL 3600 s) — sin nombre serían dos bloques idénticos.
  Contraprueba en vivo: recién arrancado, `recorrido` a cero; tras abrir `/linea/35`, sus contadores se
  mueven (`clavesEnMemoria: 2`, `llamadasAlOrigen: 2`, `techo.concedidas: 2`) → lee la caché correcta. Solo
  `route.ts`; `motorHorario` NO se metió (sigue igual de invisible, a propósito, pendiente de decisión).
- **Cabo 2 · los comentarios «Cerca de mí» dicen la verdad de la decisión.** `Buscador.tsx` y `page.tsx`
  describían el chip decorativo de la app de REFERENCIA y lo presentaban como *«el primer cabo de la Tanda
  5»* de ZetaBus. La decisión es otra: la geolocalización va al **proyecto 004 (Desplázame)** y, si procede,
  se trae hecha. Se ACTUALIZA el estado (no se borra: lo que cuentan de la referencia sigue siendo cierto y
  útil). Solo comentarios; cero runtime. Guardián `readme-no-miente` verde.
- **Cabo 3 · la versión, de una fuente única (código) y vigilada (docs).** Vivía cableada en 6+ sitios, en
  dos formas: semver `1.0.0` (package.json, badge, CHANGELOG) y `1.0` del User-Agent (transporte.ts, README,
  THIRD-PARTY). Nadie la leía desde código.
  - **Código → fuente única:** `data:build` hornea `src/generated/version.ts` (`export const VERSION`) desde
    `package.json`; `transporte.ts` compone el `AGENTE` con `VERSION.split('.').slice(0,2)` (major.minor). Se
    HORNEA a un fichero propio —no se importa `package.json` en el código— para que la lista de dependencias
    no viaje a ningún bundle (`version.ts` = solo la versión, y gitignorado). Contraprueba del UA REAL: bump
    temporal de `package.json` a 1.1.0 → el UA pasa a `ZetaBus/1.1`; restaurado → `ZetaBus/1.0`. Se mide el
    UA, no el código.
  - **Docs → vigilados:** markdown no ejecuta, así que el badge y el UA citado se **cruzan** con
    `package.json` en `readme-no-miente` (dos `it` nuevos, comparación de CADENA: el REGISTRO numérico no
    sabe leer un semver de dos puntos). **Contraprueba en ROJO demostrada las dos:** badge 1.0.0→1.1.0 →
    *«el badge dice 1.1.0 y package.json es 1.0.0»*; UA de THIRD-PARTY →9.9 → *«dice ZetaBus/9.9 y major.minor
    es 1.0»*. Restaurados, verde. (No se sube la versión: sigue 1.0.0; esto unifica de dónde se lee.)
- **Verde en los tres:** tsc · vitest **547** (+2 del guardián) · lint (0 err) · playwright **831**.

### Fase 26 · Cerrar la observabilidad del diag — la caché del horario (`motorHorario`)

- **El cabo tonto que se cierra:** desde la Fase 24 (y en realidad desde siempre) `motorHorario` era la
  única caché del sistema que `/api/diag` **no veía**. La Fase 25 dejó el diag con DOS entradas
  (`llegadas`, `recorrido`) y anotó ésta como pendiente de decisión; Antonio aprueba meterla — es la misma
  línea, y cierra la observabilidad completa en vez de dejar un cabo anotado para dentro de seis meses.
- **El cambio, una línea:** el bloque `cache` pasa a TRES entradas con nombre —`llegadas` (TTL 15 s),
  `recorrido` (TTL 3600 s) y **`horario` (TTL 86400 s = 1 día)**—, cada una su `instantanea()` con su
  `ttlSegundos`, contador y techo propios. Solo `route.ts`; no se toca `motorHorario` ni su TTL.
- **Contraprueba en vivo (contadores moviéndose, no un bloque de ceros):** recién arrancado el dev,
  `horario` a cero (`ttlSegundos: 86400`, todo lo demás 0). Tras abrir `/linea/35` —la vista que consume el
  horario web—, sus contadores **se mueven**: `clavesEnMemoria 0→1`, `aciertosDisco 0→1`, `fallosDeCache
  0→1` (mem-miss → **disk-hit**: el horario estaba caliente en disco de una corrida previa, por eso acierto
  de disco y no `llamadasAlOrigen`; en ambos casos es una lectura REAL de esa caché) → lee la caché
  correcta, no un instrumento decorativo.
- **Las otras dos, intactas:** `llegadas` sigue a **cero** tras abrir `/linea` (correcto: la vista de línea
  no toca el vivo) y `recorrido` se movió como en la Fase 25 (`clavesEnMemoria: 2`) — añadir la tercera no
  rompió las dos que ya estaban.
- **Verde:** tsc 0 · vitest **547** · lint (0 err) · playwright **831** · vigía-README. Commit atómico.

### Fase 27 · Dos comentarios que mentían + eliminar el silencio del script de coords

Viene del diagnóstico de la Fase anterior (integridad de las coords solo-barrido). El veredicto fue: la
preocupación de Antonio ("que no tiremos un dato íntegro en cada barrido") es **teórica hoy** —nada corre
`coords-solo-barrido.ts` automáticamente—, pero destapó tres cosas. Se arreglan las que no son
sobre-ingeniería: los dos comentarios, y el silencio. **NO se construye la jerarquía de procedencia**
(resolvería un escenario sin disparador); solo se hace VISIBLE lo que ya pasa.

- **Comentario 1 · `.gitignore` mentía.** Decía que las coords eran `observacion_propia`, *"alguien las
  resuelve mirando la calle"*. **Falso desde la Tanda A:** son `avanza-web`, las da el `marcadorParada` del
  feed de llegadas y las fija el script una vez. Ahora el comentario dice la procedencia real y conserva el
  porqué del versionado (sobrevivir al borrado diario del índice + viajar con el deploy). Misma familia que
  el "a mano" que ya se corrigió en `build-correspondencias`.
- **Comentario 2 · `coords-solo-barrido.ts:45` era aspiracional.** Decía que un poste nuevo *"se pasa por
  argv"*, pero `main()` usa `POSTES_POR_DEFECTO` y **no lee argv**. Ahora dice la verdad: se AÑADE a la
  constante a mano, y sin coordenada fijada un solo-barrido no es visitable (404). ⚠️ NO se implementa argv
  (solo el comentario dice la verdad).
- **El silencio, eliminado (NO la semántica).** El script SIGUE sobrescribiendo el fichero entero —esa es
  la decisión: una parada no se mueve, se re-fija—. Lo que cambia: antes de escribir, **LEE lo que había y
  ANUNCIA** qué postes son NUEVOS, cuáles IGUALES, y —lo que importa— cuáles CAMBIAN de coordenada, con
  `anterior → nueva` y la **distancia en metros** (haversine). También avisa de los que DESAPARECEN (estaban
  y ya no se escriben). Es la regla del proyecto: *ante un silencio falso, elimina el silencio manteniendo
  la semántica* — anuncia, no bloquea, no decide. La caja de cordura frena lo absurdo; esto hace visible lo
  plausible-pero-peor (una coord distinta dentro de Zaragoza pasaba la caja y pisaba la buena **sin avisar**).
- **Colocación con cuidado:** el anuncio va **DESPUÉS del todo-o-nada** (tras el `process.exit(1)` de los
  fallos), para que no mienta anunciando un cambio que al final no se escribe. El todo-o-nada y la caja
  siguen intactos.
- **Contraprueba (scratchpad, fichero de PRUEBA — el real NO se toca):** ejercité el anuncio con las cuatro
  ramas. Salida real: `＋ NUEVO 646`; `~ CAMBIA 736  41.655,-0.878 → 41.6548,-0.87765 (Δ ~37 m)`;
  `= IGUALES 1: 617`; `✗ DESAPARECE 8138`. El caso (c), el del cambio con `anterior→nueva`+distancia, es el
  que prueba que el trabajo está hecho. `git status` confirma `data/postes-solo-barrido-coordenadas.json`
  **intacto**.
- **Verde:** tsc 0 · vitest **547** · lint (0 err) · playwright **831** · vigía-README. Dos commits atómicos
  (el comentario del `.gitignore`; y el script: comentario argv + anuncio).

### Fase 28 · schema.org — el `BreadcrumbList` (y por qué NADA más)

Último cabo. La auditoría del 27/07 midió *"no se ha detectado ningún elemento"*: ZetaBus no tenía datos
estructurados. Se propuso como "beneficio tangible". El diseño en papel lo midió y **tumbó la propuesta
grande**, que es tan valioso como lo que se implementa:

- **Por qué NO `BusStop`/`BusTrip`/`Place`/`GeoCoordinates`:** (1) **no están en el catálogo de rich
  results de Google** → marcar las 934 paradas no dibujaría NADA en los resultados, es peso muerto; (2)
  vivirían en `/parada/*`, que `robots.ts` **bloquea a propósito** —indexar unos minutos que caducan en 15 s
  sería "publicar una mentira", lo dice el propio comentario—; (3) la **tabla de honestidad** lo prohíbe: 16
  nombres «sin confirmar» (`gtfs-marcado`), 9 paradas provisionales de desvío, correspondencias con fecha de
  caducidad, y sobre todo las **llegadas** —marcar una estimación volátil como `Schedule`/`departureTime`
  sería la peor mentira posible—. En JSON-LD no hay sitio para el matiz que la pantalla sí pone al lado.
- **Descartados también** (decisión de Antonio): `WebSite`/`Organization` (invisible en un subdominio
  personal), `FAQPage` (inventar una FAQ para una ficha bonita es la trampa que este proyecto no hace, y
  además Google solo las muestra de sitios gov/salud), `SearchAction` (deprecado por Google, y el buscador de
  ZetaBus es de cliente: no hay endpoint GET al que apuntar → declararlo sería mentir).
- **Sobrevive UNA pieza y es la que se implementa: `BreadcrumbList` en `/linea/[linea]`.** Cumple las cuatro
  a la vez: es VERDAD (Inicio › Línea 35), Google lo DIBUJA (está en el catálogo), va en una página que
  `robots.ts` SÍ permite indexar, y NO ENVEJECE (se deriva de `l.shortName` en cada render, no se cablea).
- **Cómo, al modo del repo:** builder puro en **`src/migas.ts`** (fuente única, peer de `sitio.ts`) →
  `migasDeLinea` (objeto) + `migasJsonLd` (string ya escapado). Se inyecta con un `<script
  type="application/ld+json">` NATIVO (no `next/script`: JSON-LD es dato, no código — doc oficial de Next
  `json-ld.md`), en un fragmento fuera del grid. El último ítem (la página actual) va **sin `item`**, como
  pide schema.org.
- **Escape anti-XSS (aunque el dato sea controlado):** `JSON.stringify` NO sanea → `.replace(/</g,
  '\\u003c')`. Hoy el único dato es `shortName` del GTFS («35», «Ci3», «N1»); el escape va igual por
  disciplina. Contraprueba con entrada sintética `a</script><b` → sale `a</script><b`: **cero `<`
  crudos**, imposible cerrar el `<script>`.
- **HTML SERVIDO verificado** (`build` + `next start`, no el código): `/linea/35`, `/linea/Ci3`, `/linea/N1`
  emiten el `BreadcrumbList` correcto, con `item2.name` = «Línea 35/Ci3/N1» y sin `item` en el último. El
  render `force-dynamic` no cambió (el breadcrumb es puro).
- **Guardián `tests/migas-no-miente.test.ts` (rojo antes de verde):** cruza el marcado con `l.shortName` de
  las **44 líneas** (incluidos los casos raros 35/Ci3/N1), más estructura y escape. **ROJO demostrado:**
  cableé `name: 'Línea 999'` → *«NO MIENTE · C1: expected 'Línea 999' to be 'Línea C1'»* (5/7 en rojo).
  Restaurado → verde. Un JSON-LD que diga una línea y la página otra sería una mentira invisible para el
  humano y visible para la máquina; el guardián la hace imposible.
- **Validación externa (pendiente para Antonio):** pegar el fragmento servido en `validator.schema.org`
  (estándar) y en `search.google.com/test/rich-results` (que Google lo dibuje). No tengo salida a esas
  herramientas desde aquí; el fragmento es un `BreadcrumbList` de manual y `BreadcrumbList` es tipo de rich
  result soportado.
- **No se solapa con nada:** OG/Twitter del layout conviven (mecanismos distintos); no había ningún JSON-LD
  previo en `src` (verificado). No se tocó `robots.ts`, ni el sitemap, ni `/parada`.
- **Verde:** tsc 0 · vitest **554** (+7 del guardián) · lint (0 err) · playwright **831** · vigía-README.
  Commit atómico.

### Fase 29 · Auditoría de cierre · Bloque A — código (solo lectura)

Primera de seis auditorías de puesta a punto (A código · B interfaz · C tests · D docs · E operación · F
experiencia), de las que se destilará un checklist maestro para los siguientes proyectos. **Solo lectura:
la única escritura fue el informe** en `docs/auditoriafinal/A-codigo.md` (carpeta nueva; **NO nace
ignorada** —`docs/` está en la allowlist—, a diferencia de CHANGELOG/SECURITY). Commit auditado `5ba78d4`.
El informe es **registro histórico fechado**: no se reescribe.

- **Método:** cuatro barridos mecánicos en paralelo (código muerto · duplicación/deps · tipos/seguridad ·
  errores/fechas), cada hallazgo con fichero+línea, y los materiales **re-verificados a mano** (la regla de
  la tanda: «la auditoría también miente» → se cruzó cada agente). Lectura humana directa de ~35
  ficheros-crux para patrones/estructura/rendimiento. **Cobertura declarada** en el informe: `src/` 100 %
  barrido + ~35 leídos a fondo, `scripts/` 100 %, config 100 %.
- **Titular honesto:** el código está muy limpio. **Cero `any`, cero `@ts-ignore`, cero secretos, cero
  `catch` que oculte, cero default que fabrique un silencio, un solo `dangerouslySetInnerHTML` (el JSON-LD,
  escapado). Nada 🔴** que rompa o mienta en producción hoy — y se dice CÓMO se comprobó, no a secas.
- **Deuda real (🟠), toda trivial:** (1) `linea/page.tsx:135` calcula `hoy` en **UTC** para la clave de
  caché del horario → al borde de medianoche Madrid usa el día de ayer, **contradiciendo la lección de
  `feed-validity.ts`**; (2) `sharp` **usado sin declarar** en `package.json` (marco-movil.mjs, por
  transitiva opcional de next); (3) `ChipLinea.AA = 4.5` **reteclado** cuando `core/contraste.AA_TEXTO` ya
  existe en el módulo que ya importa (la «copia a mano»); (4) dos comentarios (`core/index.ts:10`,
  `entities.ts:14`) citan un **guardián que no existe** (`core-agnostico.test.ts`; el real es
  `tranvia-sin-tocar-el-nucleo`).
- **Cosmético/opinable (🔵):** 4 interfaces del núcleo declaradas y nunca cableadas (decisión de producto:
  retirar o conservar como modelo); el módulo `kml.ts` efectivamente muerto (cabo ya documentado);
  exports que solo respira un test; el sobre de desvíos «ok/edad 0» cuando todo falla (sin consumidor de
  pantalla hoy); fechas sin `timeZone` en dos sitios; el `as unknown as Artefacto`; `noUncheckedIndexedAccess`
  ausente. Detalle y coste en el informe.
- **Lo que está bien** (para el maestro): terceros validados en runtime, fallo cerrado consistente, fuente
  única vigilada por tests, disciplina de bundle de cliente, `feed-validity` como referencia de zona horaria,
  caché-como-honestidad con versión-de-forma. El informe cierra con un **checklist maestro en genérico**.
- Nada al estado por mi parte: es diseño/diagnóstico, lo destila Antonio. Commit atómico del informe +
  bitácora. NO push.

### Fase 30 · Arreglar los cuatro 🟠 del Bloque A (cuatro commits atómicos)

Los cuatro son **la misma familia**: algo declarado que no corresponde con la realidad (como los dos de la
mañana y el `TTL_RECORRIDO_MS` de ayer). Se arreglan uno por commit, sin tocar el informe histórico.

- **1 · El día en Zaragoza, no en UTC** (`fix(horario)`). `linea/page.tsx` calculaba `hoy` con
  `toISOString().slice(0,10)` (UTC) para la clave de caché del horario → entre medianoche y la 01:00/02:00
  de Madrid usaba el día de AYER (horario de ayer una jornada entera, TTL de un día). **El repo ya lo sabía:**
  `feed-validity` resuelve el día civil en `Europe/Madrid`. Se **exporta `diaCivil`** (la fuente única, NO una
  segunda forma) y la página tira de ella. **Contraprueba con reloj inyectado** (`tests/dia-civil.test.ts`):
  verano, invierno y la noche del cambio de hora, 23:30Z → día de Madrid; **ROJO demostrado** poniendo la forma
  vieja (UTC) en `diaCivil` → 3/4 en rojo (`expected '2026-08-31' to be '2026-09-01'`). Restaurado → verde.
- **2 · `sharp` declarado** (`build(deps)`). Lo usaba `marco-movil.mjs` sin estar en `package.json`
  (funcionaba por transitiva *opcional* de next). Declarado en `devDependencies` a su versión real (0.34.5).
  El árbol NO cambia más allá de la declaración (sharp + `@img/colour` + `semver` pasan de `optional` a
  `devOptional`, misma versión/hash; `npm audit` sigue en 12 high). Verificado que sharp carga y opera.
  **Barrido:** era el ÚNICO paquete usado sin declarar.
- **3 · El umbral AA, de una sola fuente** (`refactor(contraste)`). ChipLinea reteclaba `AA = 4.5` teniendo
  `AA_TEXTO = 4.5` en `core/contraste` —el módulo que ya importaba—. Se elimina la copia; ChipLinea usa
  `AA_TEXTO`, y los consumidores externos (`contraste-de-los-chips`, `cruces`, y el `4.5` literal de
  `e2e/mapa.spec.ts`) pasan a la fuente única. Grep de cierre: **cero `4.5` como umbral en código**, nadie
  importa `AA` de ChipLinea, el umbral vive solo en `core/contraste`.
- **4 · El guardián citado existe** (`docs`/comentarios). `core/index.ts:10` y `entities.ts:14` citaban
  `tests/core-agnostico.test.ts` —que NO existe—; el real es `tranvia-sin-tocar-el-nucleo.test.ts`
  (verificado que existe **y** que su test comprueba lo que el comentario afirma: núcleo sin importar de
  `sources/` y sin la palabra «bus» salvo como literal `Mode`). Corregidas las dos citas.
- ⚠️ **Reportado, NO arreglado (el patrón del día otra vez):** al barrer citas a ficheros de test, apareció
  **un segundo fantasma** — `desvios.ts:57` cita `tests/desvios-no-miran-lo-vivo.test.ts`, que **no existe**
  (no hay ningún fichero `*desvio*` en `tests/`). No lo toco: es un descubrimiento nuevo, fuera del alcance
  de esta tanda. Antonio decide si la garantía («el motor de desvíos no mira lo vivo») está cubierta en otro
  test (¿`pantalla-no-miente`?) o si falta el guard. Y de dependencias sin declarar / copias del umbral: **no
  hay más** (barridas todas).
- **Verde tras cada uno:** tsc 0 · vitest **558** (+4 del test de fecha) · lint (0 err, 3 warnings previos) ·
  playwright **831** · vigía. Cuatro commits atómicos. NO push.

### Fase 31 · El guardián que faltaba: `tests/desvios-no-miran-lo-vivo.test.ts`

El segundo fantasma de la Fase 30, resuelto por diagnóstico primero y creación después. El comentario de
`desvios.ts:56-59` prometía **desde siempre** que este test existía —«la disciplina se olvida. Un test,
no.»— y **nunca existió**. La garantía que protege es la tesis del proyecto: un poste callado puede ser un
desvío, las 4 de la mañana, o un poste sin dar de alta; la API devuelve lo mismo en los tres. **Deducir un
desvío de un silencio es inventárselo.** Estaba protegida solo por que nadie se equivocara.

- **Diagnóstico (solo lectura) antes de tocar nada.** Veredicto **(b) protección inexistente**: (a) ningún
  test vigila los imports de `desvios.ts` —barrido por CONTENIDO, no por nombre—; (b) no lo cubre ningún
  guardián genérico, y se cazó el **falso amigo**: `horas-malas.test.ts` **sí lee** `desvios.ts` (está en su
  `CAMINO_VIVO`) pero comprueba OTRA garantía (que no razone con el calendario); (c) `git log --diff-filter=D/A`
  sin rastro: no fue una promesa que fue cierta, **no lo fue jamás**; (d) ✅ la garantía **es cierta hoy**,
  verificado el cierre INDIRECTO (ni `desvios.ts` ni nada de lo que importa alcanza `llegadas`/`poste`);
  (e) de 12 citas a tests en comentarios de `src/`, **11 resuelven** — este es el único fantasma, la racha
  del patrón «declarado que no corresponde» termina aquí.
- **El guardián.** Reutiliza la maquinaria probada de `nada-de-gtfs-en-el-cliente.test.ts` (`resolver`,
  `importaciones` que salta `import type`, BFS) — **copiada, no compartida por import**: duplicar un rastreador
  probado es menos malo que tocar un guardián que funciona en un proyecto que cierra. **BFS y no regex** porque
  el peligro es el import indirecto (la cicatriz de los 1,9 MB al cliente). **Diana PRECISA**
  (`engine/llegadas.ts`, `sources/avanza/poste.ts`, `parse-poste.ts`) y no «todo `sources/`»: `desvios` importa
  `recorrido` (la ruta de hoy) legítimamente, y un falso rojo enseña a no mirar el guardián.
- **Las DOS contrapruebas.** (1) **Que caza:** import DIRECTO temporal de `llegadas` en `desvios.ts` → ROJO
  con ruta `desvios.ts → llegadas.ts`; import INDIRECTO (puente intermedio) → ROJO con ruta de 3 nodos
  `desvios.ts → _puente-vivo.ts → llegadas.ts` (el caso que un regex NO vería). Restaurado; `git diff` de
  `desvios.ts` vacío. (2) **Que el rastreador anda** (contraprueba del instrumento, como la del test hermano):
  desde la página de parada, que sí pinta llegadas, DEBE encontrar el camino — un `null` roto daría falso verde.
  Más un tercer test: la diana apunta a ficheros que existen (si no, «verde en vacío»).
- **La cita del comentario de `desvios.ts` pasa a ser verdad sin haberlo tocado.** No se toca el comentario ni
  el código: con el guard creado, la promesa deja de mentir sola.
- **Verde:** tsc 0 · vitest **561** (+3 del guardián) · lint (0 err, 3 warnings previos) · playwright **831**
  (94 skipped). Commit atómico (test + bitácora). NO push.

### Fase 32 · Cerrar el Bloque A — los tres últimos hallazgos

Los tres que quedaban del informe `A-codigo.md`. Commits atómicos, uno por hallazgo. #10 y #5 directos;
el #8 se diseña aparte (cambia un contrato) y se decide antes de tocar código.

- **#10 (A9) · Las fechas, en Zaragoza y no en el huso del host** (`fix(fechas)`). Dos sitios calculaban
  el día/fecha civil con el reloj del SERVIDOR (que en Hostinger no sabemos cuál es), **el mismo patrón que
  el `hoy` en UTC de la Fase 30**: `app/sobre-los-datos/page.tsx:113` (`toLocaleDateString('es-ES')` **sin
  `timeZone`**, render de servidor) y `scripts/coords-solo-barrido.ts:76` (`hoy()` con `getFullYear/Month/Date`
  locales). La incoherencia lo delataba: `paso.ts`, `campo.ts` y `canario.ts` **sí** nombran `Europe/Madrid`.
  Arreglo: sobre-los-datos añade `{ timeZone: 'Europe/Madrid' }` (el patrón que ya usan los otros tres);
  coords **reutiliza `diaCivil`** —la fuente única de `feed-validity`—, NO una tercera forma. **Barrido:** son
  los DOS únicos sitios; el resto de `new Date()` (barrido, estado, diag, AvisoFeed) son INSTANTES
  (`toISOString`/`feedStatus`), correctos. **Contraprueba enseñada** (`tests/fechas-en-zaragoza.test.ts`): con
  el host fijado a `America/New_York` y un instante que en Madrid ya es el día siguiente, `diaCivil` da el día
  de Zaragoza; **ROJO** demostrado poniendo getters locales en `diaCivil` → `expected '2026-07-31' to be
  '2026-08-01'`. ⚠️ **Este test cubre una laguna de `dia-civil.test.ts`:** aquél corre en host Madrid, donde
  getters-locales y Zaragoza COINCIDEN, así que NO cazaría una regresión al huso del host; éste sí, fijando el
  huso.
  Verde: tsc 0 · vitest **563** (+2) · lint (0 err, 3 warnings previos) · playwright **831**. NO push.
