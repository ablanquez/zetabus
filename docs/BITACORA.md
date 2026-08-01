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
- **#5 (A1e) · Las cuatro interfaces del núcleo sin cablear** (`refactor(core)`). `RouteDelta`, `Vehicle`,
  `Arrival` y `Advisory` estaban declaradas en `core/entities.ts` y **consumidas en NINGÚN sitio** —el
  «declarado y nunca cableado» que este proyecto lleva dos tandas persiguiendo—. Grep exacto (`\bNombre\b`)
  en `src/`, `scripts/`, `tests/`, `e2e/` y `docs/`: **cero uso en código**; solo aparecen en su declaración
  y en tres documentos que las DESCRIBEN (el diseño de la Tanda 1, la auditoría histórica `11-...`, y
  `A-codigo.md` —el hallazgo mismo—). Documentación histórica, no consumo. Se retiran (git las conserva si
  algún día hacen falta), con sus comentarios, y se limpian los imports que quedaban huérfanos (`VehicleId`,
  `VehicleProfile`, que solo usaban esas interfaces). **NO se toca ningún doc** (son registros históricos,
  incluido `A-codigo.md`). Verde: tsc 0 (imports huérfanos cazados) · vitest **563** (el guardián
  `tranvia-sin-tocar-el-nucleo` sigue verde) · lint (0 err) · playwright **831**. NO push.

- **#8 (A9) · El sobre de desvíos deja de afirmar frescura falsa** (`fix(desvios)`, Opción B). Si TODOS los
  sentidos de una línea fallaban al leerse, `desviosDeLinea` devolvía `estado:'ok'`, `observadoEn: ahora`,
  `edadSegundos: 0` — «recién observado» cuando **no se observó nada**. Silencio falso latente (hoy nadie
  lee esa frescura; grep confirmado), pero esperando a un consumidor futuro. La condición es limpia:
  `observadoEn` sigue `null` ⟺ ningún sentido se leyó. Ahora, en ese caso, el sobre dice la verdad:
  `{ estado:'caido', motivo }` con motivo honesto (por qué no respondió la fuente). **El caso PARCIAL
  —algún sentido bien— NO se toca:** sigue `ok` con su frescura REAL.
  ⚠️ **El riesgo del cambio, y cómo se evita:** con `estado:'ok'` la página SÍ pintaba el aviso honesto por
  sentido; con `caido` podría quedarse muda. Se evita **mapeando en la página** `caido` → el MISMO veredicto
  `indeterminado` (con su motivo) — así el sobre puede decir la verdad sin que la pantalla pierda el mensaje,
  y sin tocar `Observacion` (que era la opción C, descartada). El subcomponente no cambia.
  · **Caso intermedio detectado y manejado con precisión:** una línea con CERO sentidos también deja
    `observadoEn` null; la guarda lleva `resultados.length > 0` para no confundir «no había nada que leer»
    con «se cayó todo». No cambia el caso degenerado.
  · **Contrapruebas:** ROJO enseñado (todos fallan → antes `ok`, `expected 'ok' to be 'caido'`); caso PARCIAL
    fijado (un sentido cae con 500, el otro lee → `ok`, frescura real, los dos veredictos). **E2E con dientes:**
    `/linea/35?fingir=caido` DEBE mostrar la caja "No hemos podido comprobar…"; demostrado que **se pone rojo
    en los 5 viewports** si el aviso desaparece (rompiendo el mapeo a propósito).
  · **La página, ABIERTA y MIRADA** (build propio, `?fingir=caido`): la caja está, con el motivo honesto
    («…de ninguno de los 2 sentidos de la línea 35: … ECONNREFUSED (fingido)»), y CERO acordeón de desvío.
  · Verde: tsc 0 · vitest **565** (+2) · lint (0 err, 3 warnings previos) · playwright **831** (94 skipped).
    Commit atómico. NO push.

Con esto, **el Bloque A del informe `A-codigo.md` queda cerrado**: los 4 🟠 + el guardián fantasma + estos
tres (#10, #5, #8). Lo deliberadamente dejado (`kml.ts`, `noUncheckedIndexedAccess`, los 🔵) sigue
documentado en el informe, sin tocar.

### Fase 33 · El orden del build: `version.ts` se generaba tarde (regresión en producción)

**El fallo.** Desde la unificación de versión (`e7614a6`), `transporte.ts` importa `@/generated/version`.
Ese fichero lo generaba `data:build` — pero **`nombres:ensure` corre ANTES** de `data:build` y lanza
`build-nombres`, que arrastra `transporte.ts`. En un clon limpio (el servidor), `version.ts` aún no
existe → `build-nombres` no compila (`Cannot find module '@/generated/version'`), el fail-safe de
`ensure-nombres` lo toma por «Avanza caída», y la app arranca con **las 934 paradas «sin confirmar»**.
`correspondencias:ensure` no falló porque va DESPUÉS de `data:build`.

**El arreglo** (`fix(build)`). Se extrae la generación de `version.ts` a su propio script
[`scripts/build-version.ts`](../scripts/build-version.ts), que corre **EL PRIMERO** del `build` (antes
incluso de `gtfs:fetch`; solo depende de `package.json`, que siempre está). `nombres:ensure` **se queda
donde está** (tiene que ir antes de `data:build`, que LEE la tabla y hornea los nombres).

- **Decisión sobre la generación que hacía `data:build`: se QUITA (un solo generador), no se deja
  redundante.** Motivos: (1) `version.ts` es un sello de `package.json`, no dato GTFS — no pertenece a la
  «ingesta de datos»; (2) dejarla sería **dos scripts horneando el mismo fichero** desde `package.json`, la
  «copia a mano» que el proyecto persigue; (3) el orden del build ya garantiza que existe antes de que nadie
  la importe; (4) la copia en `data:build` **no protegía de nada**: `data:build` corre DESPUÉS de
  `nombres:ensure`, así que su copia nunca llegaba a tiempo al sitio que mordía. Se deja una nota en
  `build-data.ts` apuntando al nuevo script, para que nadie la re-añada.
- **¿Más casos del patrón? NO.** Barrido de `@/generated/*`: el único que un paso anterior a `data:build`
  importa es `version.ts` (vía `transporte`). Los otros dos importadores (`topologia`, `sobre-los-datos`)
  usan el `gtfs.json` y solo corren en `next build`, después. Reportado; no había nada que arreglar.

**Las dos lecciones** (por las que esto se registra):
1. ⚠️ **El aviso EXISTÍA y no se cruzó.** Al unificar la versión ya se anotó que «en un clon limpio,
   `transporte.ts` no compila hasta correr `data:build`». Lo que no se cruzó fue con que `nombres:ensure`
   va ANTES. La lección estaba escrita y no llegó al sitio donde mordía.
2. ⚠️⚠️ **En local pasó en verde porque `version.ts` ya existía** de builds anteriores. Es la ley del
   proyecto: *un verde que depende de si alguien compiló antes NO prueba nada*. El fallo **solo aparece en
   un build limpio** — o sea, en el servidor. Por eso la contraprueba de esta tanda **fue un build desde
   cero** (`src/generated/` borrado), no un `npm run build` normal.

**Contrapruebas (build limpio, `src/generated/` borrado):**
- 🔴 **Orden VIEJO:** `nombres:ensure` → `Error: Cannot find module '@/generated/version'`
  (`requireStack: build-nombres → nombres → recorrido → transporte`), fail-safe «NO SE PUDO GENERAR LA
  TABLA», y `data:build` → «⚠️ NO hay tabla de nombres · 934/934 sin confirmar».
- 🟢 **Orden NUEVO:** `version:build` primero («✅ Versión horneada: 1.0.0»), `build-nombres` compila y
  barre (74/74 respondieron), y `data:build` → «✅ **918/934** paradas con nombre de Avanza (98%)». El
  build llega al final (`next build` ✓ Compiled). ~4-6 min con los dos barridos.

**El fail-safe NO se toca:** siguió funcionando (avisó a gritos, el build no murió). Solo dejó de
dispararse por la causa equivocada.

**Guardián — PROPUESTO, no implementado** (decide Antonio). Un test decorativo («`version:build` va antes
que `nombres:ensure`») no vale: hardcodea este caso y no generaliza. El honesto sería un test que, por
cada paso del `build`, **rastree el grafo de imports** (reutilizando el resolver de
`nada-de-gtfs-en-el-cliente` / `desvios-no-miran-lo-vivo`) **siguiendo también los `spawnSync('tsx',
['scripts/…'])`** (aquí está la dificultad: `ensure-nombres` no importa `transporte`, lo SPAWNea vía
`build-nombres`), y compruebe que todo `@/generated/*` consumido por un paso lo genera un paso ANTERIOR.
Habría cazado esto. Coste: **acotado, no trivial** (por el spawn) — casi una tanda propia. La alternativa
—un build limpio en CI— es la prueba de verdad pero es cara y depende de Avanza. No lo construyo: lo dejo
para que se decida si compensa.

### Fase 34 · Arreglar los siete hallazgos triviales del Bloque C (siete commits atómicos)

El Bloque C (`docs/auditoriafinal/C-tests.md`) auditó tests y guardianes **rompiendo lo que dicen
proteger** (8 mutaciones: 5 cazadas, 2 escapadas, 1 control). Veredicto general bueno —*«el conjunto es
inusualmente riguroso; los hallazgos son huecos concretos, no tests malos»*—. Antonio aprueba cerrar **los
siete triviales**. **F2** (barridos que escriben JSON que nadie agrega) y **F4** (el guardián del contraste
caza copias divergentes pero no una copia correcta reescrita) quedan **fuera**, se deciden aparte.

- **F1 · El suelo táctil MIDE Y AFIRMA** (`a360aba`). `barrido-fino-2.spec.ts` recogía cada zona <44 px en
  `flojos` y las tiraba a `console.log`: medía el suelo y no lo vigilaba. Se le pone el `expect`. Al afirmar,
  **ROJO real: 401 zonas por debajo de 44 px**, ⚠️ **TODAS en la lista de recorrido de `/linea/*`** — 338
  filas de parada (ancho completo × 24 px de alto) + 63 chips de correspondencia (24×24). **Ni una** en la
  home ni en `/parada/*`. El suelo de 44 es criterio **AAA que el proyecto se puso a sí mismo** (los 24×24
  cumplen el mínimo AA de WCAG 2.5.8). **NO se tapó el umbral**: el arreglo es de interfaz → **espera al
  BLOQUE B**. Va en `test.fixme` (con nota completa y cómo reactivar) para no dejar la suite roja —*una suite
  que vive roja no distingue un fallo nuevo del conocido*—.
- **F3 · El rastreador de imports ve los de EFECTO LATERAL** (`939535a`). El regex de `importaciones()`
  exigía `from`, así que `import '@/generated';` (sin binding) se le escapaba pese a arrastrar el grafo igual.
  Segunda pasada que los caza, sin doble-contar los de `from`. El hueco estaba **copiado en los dos**
  guardianes de grafo → arreglados los dos. **Rojo de mutación demostrado en ambos** (`error.tsx` +
  `import '@/generated'` → cazado; `desvios.ts` + `import '@/engine/llegadas'` → cazado), restaurados.
  Reportado, NO arreglado: `dynamic(() => import('./MapaParada'))` en `LlegadasVivas.tsx:43` — el regex
  tampoco ve el `import()` dinámico ni `require()` (no hay `require` en `src/`).
- **F5/F6 · Saltar en vez de reventar en un clon limpio** (`f50a024`). Dos tests leían un artefacto que **no
  viaja en el repo** y petaban al importar en un clon limpio —la misma clase de fallo que la Fase 33: un
  verde que depende de que alguien descargara/compilara antes—. F5 `tranvia`: leía el zip del GTFS a nivel de
  módulo (reventaba el fichero entero, incluido el test del núcleo que ni lo toca). F6 `readme-no-miente`: la
  contraprueba del «cambio de universo» LANZABA si faltaba un PNG gitignored. Los dos con `skipIf` (patrón que
  `readme-no-miente:483` ya usaba). **Dos direcciones demostradas en ambos:** con el artefacto se ejecutan,
  sin él se SALTAN (y ya no revientan).
- **F7 · Las vistas de línea/parada fingen, ya no le pegan a Avanza real** (`d394078`). Varios e2e cargaban
  `/linea/*` y `/parada/744` **sin `?fingir=`** → en cada corrida le pedían el recorrido/horario/llegadas a
  Avanza REAL, y pasaban con Avanza arriba o abajo (el repo tiene promesa escrita de no abusar de Avanza).
  Cada uno recibe el fingido que **no cambia lo que mide**: vistas de línea (sentido, recorrido-y-terminal,
  interaccion, revision) → `?fingir=horario` (línea sana, ruta oficial tal cual; NO `desviada`, que cambiaría
  el recorrido medido); `/parada/744` (acuse-de-toque, rutas-basura) → `?fingir=solo-oficiales`. En acuse, el
  `test.skip(sin llegadas)` —el «verde/skip según lo que Avanza tenga ahora»— pasa a **aserción** de que las
  llegadas están. **Prueba discriminante** contra la API en modo demo: `/api/llegadas/744?fingir=solo-oficiales`
  devuelve el fixture (035 PARQUE GOYA); **sin fingir** devuelve las líneas REALES del 744 (29, 39). 45
  passed / 1 skipped en los seis specs.
- **F8 · Guarda antes del `if`** (`84e2271`). Tres tests de `motor.test.ts` metían sus aserciones dentro de
  `if (estado === 'ok')` / `if (tipo === 'comparado')` sin afirmar antes el estado: si cambiara, el `if` se
  saltaría y el test pasaría con CERO comprobaciones. `expect(...).toBe(...)` antes del `if` (que se queda
  para el narrowing), al modo que el fichero ya usaba (línea 258).
- **F9 · Fuera los dos `expect(true).toBe(true)`** (`a59e5c2`). Dos `it(...)` de `horas-malas.test.ts` eran
  prosa + `expect(true)`. Su contenido real está cubierto en `motor.test.ts` (el paso del ETA, «poste mudo →
  ok vacío»); afirmarlo aquí duplicaría, y no hay nada nuevo comprobable sin arrastrar esa maquinaria. Se
  quitan los tests huecos y su razonamiento se conserva como comentario donde aporta (nota del `describe`).
- **Verde tras la tanda:** tsc 0 · vitest **563** (−2 de F9, +las guardas de F8) · lint (0 err, 3 warnings
  previos, ninguno en ficheros tocados) · playwright **175 passed / 10 skipped** en 1280px · el `fixme` del
  F1 a la vista. **README revisado** (tarea de cierre): sus recuentos de pruebas son *suelos* explícitos
  («más de 470» / «más de 800»), no los desmiente nada; **no se toca**. Siete commits atómicos. NO push.

### Fase 35 · Arreglar los cuatro hallazgos baratos del Bloque B (tres commits atómicos)

El Bloque B (`docs/auditoriafinal/B-interfaz.md`, commit `f61b45a`) auditó la interfaz ABRIENDO las 9
rutas × 5 anchos × estados. Nueve hallazgos, **ningún 🔴**. Antonio aprueba arreglar los **cuatro baratos**;
los gordos (B-01 `div`-en-`button`, B-03 404 sin JS, B-05 error boundary, B-07 las 401 táctiles, B-09) se
deciden aparte.

- **B-02 + B-08 · `aria-label` que el lector SÍ oye** (`767ab56`). Un `aria-label` en un `<span>`/`<div>`
  genérico lo **ignora** el lector: parecía informar y no informaba. Se aplica el patrón que YA existe en
  el repo (los chips de giro de la home son `role="img"`): `Terminal.tsx` (salidas marcadas, `role` solo
  cuando hay marca), el chip de poste (`role="img"`), y el placeholder del mapa (`role="status"`, que es
  un estado de carga, no una imagen). **Contraprueba W3C: `/parada` pasa de 10 a 8 errores** (los 2 de
  `aria-label` fuera; los 8 restantes son `div`-en-`button`, que es B-01). Los 10 de `/linea` vienen de
  `Terminal` con datos REALES de Avanza y no se reproducen en demo: el `role` los mata por la misma regla,
  pero queda **sin verificar en vivo** —se dice, no se da por bueno—.
- **B-04 · fuera la jerga de los estados "no lo sé"** (`383c66f`). Caído / ilegible / desvío-no-comprobable
  tenían un titular humano impecable y luego un paréntesis que volcaba crudo la URL de Avanza, el
  `ECONNREFUSED` o el HTML `<h1>502 Bad Gateway</h1>`. El titular ya lleva el "por qué" en lenguaje humano,
  así que el paréntesis solo repetía eso y añadía jerga → se quita (Opción A). El detalle técnico NO se
  pierde: en la parada sigue en el JSON de `/api/llegadas` (superficie de diagnóstico legítima); en la
  línea, que no tiene JSON, va a `console.error` en el servidor (verificado en el log: la URL sigue ahí,
  fuera de pantalla). Abiertas las tres pantallas y leídas: **siguen honestas** —dicen qué Y por qué— sin
  una URL a la vista.
  - ⚠️ **CORRECCIÓN DE LA PREMISA, y es importante: esto es UX, NO seguridad.** El informe B decía que la
    jerga "publica el endpoint interno de Avanza" y que era incoherente con `robots.ts`. **Falso.** El
    repositorio es PÚBLICO: esa URL ya está en el código, en los comentarios y en el estado. No se revela
    nada oculto, y `robots.ts` bloquea `/parada` y `/api` para que no se **indexe un dato que caduca en
    15 s**, no por secreto. Sigue mereciendo arreglo (nadie entiende `ECONNREFUSED`), pero el argumento de
    seguridad **no vale y no se usa**. Se traza el flujo antes de afirmar.
  - El **refresco-fallido se deja como está**, con nota en el código: su motivo es del NAVEGADOR («Failed
    to fetch»), nunca de Avanza (solo salta cuando falla el fetch a nuestra propia API). Y limpiarlo
    «bien» chocaba con el hallazgo de abajo.
- **B-06 · `<meta description>` propia donde faltaba** (`de9f64b`→`f82d182`). Era la misma genérica en
  home, línea, parada, 404 y sistema-visual; solo estado y sobre tenían la suya (los `<title>` sí eran
  propios). Se le da descripción a las dos INDEXABLES: `/linea` (por línea, veraz y ESTABLE —recorrido,
  paradas, correspondencias, origen→destino—; **nada de tiempos ni de "en vivo"**) y la home. Verificado
  en el HTML servido.
  - ⚠️ **`/parada` se deja con la genérica A PROPÓSITO, y esto se registra porque alguien podría
    "corregirlo" sin entenderlo:** está en `robots` disallow porque su valor (los minutos) caduca en 15 s.
    Una descripción tipo *"Llegadas en tiempo real a Plaza San Miguel"*, cacheada o compartida, **sería la
    misma mentira que `robots.ts` evita** en cuanto pasan 15 segundos. Dejarla genérica es coherencia con
    la tesis, no pereza.

⭐⭐ **EL HALLAZGO QUE VALE MÁS QUE LOS CUATRO ARREGLOS: el lint estaba en verde por la razón equivocada.**
Al ir a quitar el paréntesis del refresco-fallido «bien» —simplificando la unión de tipos `Estado` de
`LlegadasVivas`— el analizador de `react-hooks` empezó a marcar **dos problemas PREEXISTENTES** que no
había tocado nadie: `:94` lee un `ref` durante el render, `:239` hace `setState` dentro de un efecto.
Llevaban ahí desde siempre, y el analizador **no los veía porque la complejidad de la unión le hacía
rendirse antes de llegar a ellos**.

> **El verde no significaba "esto está bien": significaba "no he podido mirarlo".**

Es lo mismo que llevamos cazando —un instrumento que se calla en vez de avisar— en una forma **nueva**: no
un test que no prueba nada, sino **un analizador que se rinde en silencio**. Y lo revelador: **solo se
destapó al intentar simplificar**; cualquier limpieza futura de ese componente los habría sacado igual. Se
**reportan como cabo de código (bloque A), no se arreglan** aquí (`:239`, `setState` en efecto, es un
refactor de comportamiento con riesgo, fuera de una tanda de "baratos"). Se descartó de plano el atajo de
dejar un campo en el estado que nadie lee solo para que el analizador se rinda: eso sería **silenciar el
instrumento a propósito** y dejar una trampa cargada para el que lo quite mañana.

⚠️ **Y una piedra propia, cazada por un guardián:** el comentario de B-06 que escribí decía `` `/linea/*` ``
y `` `/parada/*` ``. El `sinComentarios` de `pantalla-no-miente` interpreta esas secuencias `/*` como
apertura de comentario de bloque y **se comió el código real** hasta el siguiente `*/` —incluida la llamada
`await desviosDeLinea`—, y dos tests se pusieron rojos. Es EXACTAMENTE la trampa que ya mordió con
`Date.now()` y `truncate` dentro de comentarios que los prohíben. Reescrito sin el `*`.

**Verde tras la tanda:** tsc 0 · vitest **563** / 1 skip · lint (0 err, 3 warnings previos) · playwright
**175 passed / 10 skipped** en 1280px · W3C `/parada` **10→8**. Tres commits atómicos. NO push. B-01, B-03,
B-05, B-07, B-09 y los dos `react-hooks` **fuera** (reportados).

---

### Fase 36 · Arreglar E-01, E-03 y E-06 del Bloque E

Tres hallazgos de la auditoría de operación (`docs/auditoriafinal/E-operacion.md`), en commits atómicos.
E-02 (¿alerta del cron o se acepta documentado?) y E-04 (un derivado versionado entre los curados) quedan
**fuera**: son decisiones de Antonio.

⭐⭐ **E-01 arregla la CLASE, no la instancia.** Ayer se arregló el ORDEN del build —`version:build` el
primero— y eso cerró **ese** disparador: el `MODULE_NOT_FOUND` de `version.ts` que desplegó las 934
paradas «sin confirmar». Pero la **confusión seguía viva**: los `ensure-*` hacían `spawnSync(build-*)` y,
ante **cualquier** `status != 0`, pintaban el mismo recuadro *"Avanza caída → arranca degradado"*. El
próximo fallo interno —otro módulo que no resuelve, un error de sintaxis, una excepción— habría vuelto a
desplegarse degradado en silencio, **culpando a Avanza de algo nuestro**. Y en un proyecto cuya tesis es
*"cuando no sabe, lo dice"*, eso es peor que callar: es **decir algo falso sobre por qué no sabe**.

> El arreglo distingue los dos casos. Y lo hace por una asimetría que lo vuelve robusto: **el error
> interno no se detecta, se DEDUCE por complemento.** Un `MODULE_NOT_FOUND` mata al hijo antes de que
> corra una línea nuestra —nunca podría elegir un código de salida—, así que se marca en positivo solo la
> ÚNICA caída benigna (Avanza no llegó al suelo → `CODIGO_FUENTE_CAIDA = 3`, una rama deliberada de
> nuestro código) y **todo lo demás es, por descarte, fallo propio.** Parsear la salida de texto habría
> sido el instrumento frágil que este repo rechaza.

**La decisión: ante un error interno, el build PARA.** No es obvia —sin nombres SÍ hay app (degradada)—,
pero lo que se despliega no es «la capa de nombres coja»: es **un fallo que no entendemos, de radio
desconocido, disfrazado de caída de Avanza**. El precedente lo sella: **`fetch-gtfs` ya mata el build si
falta `NAP_API_KEY`**, *"porque una configuración a medias es un build mal configurado; seguir dejaría el
despliegue congelado para siempre sin que nadie se entere"*. Misma familia: fallo **propio y permanente**,
no ajeno y pasajero. Continuar sería el *"congelado para siempre"* que `fetch-gtfs` rechaza —y «continuar
pero ruidoso» ya es el status quo que falló, porque un aviso de build a las 02:00 en un panel remoto **no
se lee**—. Sin válvula de escape (nada de un `FORZAR_DEPLOY=1`): sería el silenciador de siempre. Si está
roto, se arregla. El mensaje nuevo lo dice entero: qué pasó, que por eso para, que bloquea **cualquier**
deploy hasta arreglarlo (ése es el punto), y qué hacer.

⚠️ **Un supuesto que sostiene todo esto, y que NO está verificado:** que **un build fallido en Hostinger
deja la versión anterior sirviendo**. Es lo razonable (el proceso corre desde `~/nodejs` con el build
previo), pero **nunca se ha comprobado**: todos los builds han llegado al final, incluso los que fallaron
por dentro. No se verifica provocando un build roto en producción; se deja **escrito como supuesto** en el
propio mensaje del `ensure` y aquí. Si algún día se confirma, se anota.

**Contraprueba, los dos casos en los dos `ensure`:** error interno reproducido borrando `version.ts` (la
SIM-1) → sale el recuadro **NUEVO** y el `ensure` **sale 1 (build PARA)**; fuente caída simulada con el
hijo saliendo `exit 3` → sale el recuadro **de hoy, idéntico** (verificado md5, ni una coma cambia) y el
`ensure` **sale 0 (build CONTINÚA)**. Restaurado todo, `git status` limpio.

⚠️ **Piedra propia, cazada leyendo `git status`:** para restaurar el hijo tras stubbearlo usé
`git checkout scripts/build-nombres.ts` — y eso **también borró mi edición de E-01 sin commitear** de ese
mismo fichero. Lo pilló que `git status` dejó de listarlo como modificado, no la fe. Lección: **commitea
antes de stubbear, o restaura desde un backup, no con `git checkout` sobre un fichero con cambios vivos.**

**E-03** — el cron nocturno, en `README → Desplegar`: el `curl` con el token como marcador `<TOKEN>` (jamás
el valor), el horario `0 2 * * *` marcado como operativo no derivable, dónde se configura (panel de
Hostinger, cuenta de Linaje) y cómo saber que corrió (`/api/diag → correspondencias`, `edadSegundos`). Cada
dato verificado en el repo; `readme-no-miente` verde (26 tests). **E-06** — las tres `ZETABUS_*_DIR` en
`.env.example`, avanzadas, con nombres leídos de `motor.ts`; **comentadas, no vacías**, porque el código cae
al default con `?? '.cache/…'` (nullish) y una var declarada-y-vacía no es nullish.

**Verde:** tsc 0 · lint 0 err · vitest **563** / 1 skip · `readme-no-miente` 26/26. Cuatro commits atómicos
(E-01 / E-03 / E-06 / esta bitácora). NO push.

---

### Fase 37 · B-01 · la tarjeta de llegada, HTML válido dentro del `<button>`

Último pendiente de la auditoría que **mueve una nota externa** (el resto —táctiles, cron, react-hooks—
son mejoras reales que ningún escáner ve). En `/parada`, la tarjeta de llegada metía `<div>` y `<p>`
dentro de un `<button>`, que solo admite **contenido de frase**. HTML no conforme: un `<button>` con
contenido de bloque **no está definido** por la especificación, así que cada navegador y cada lector
decide por su cuenta. Funcionaba por convención, no por contrato.

**El arreglo mínimo:** los `<div>`/`<p>` de dentro del botón pasan a `<span>`, con las mismas clases. Las
clases `flex`/`flex-col` fijan `display` igual sobre un span, y como son *flex items* se blockifican →
**mismo layout, cero cambio visual, cero cambio de comportamiento** (sigue siendo un `<button>` nativo).

⭐⭐ **LA LECCIÓN TRANSFERIBLE: por qué se DESCARTÓ `<div role="button">`.** Es la vía que parece la fácil,
y es una trampa. Un `<div role="button">` **pierde todo el comportamiento nativo**: deja de ser enfocable
(haría falta `tabIndex`), deja de activarse con Enter y Espacio (hay que implementarlo a mano), no
participa en formularios, pierde los defaults de móvil. Sería **cambiar HTML inválido por HTML válido y
MENOS accesible** — mejorar la nota **empeorando justo lo que la nota intenta medir**. Eso es exactamente
lo que este proyecto no hace: el `role` es para describir lo que un elemento ES, no para disfrazar un
`<div>` de algo que el navegador ya te da gratis y mejor.

⚠️ **Y un dato que el informe contaba de otra forma —ni bien ni mal, distinto—: el "8".** El informe B
decía «8 `<div>` dentro de un `<button>`». Al validar salieron **4** en mi demo local. No era un
descuadre: el validador reporta **un error por `<button>`** y *«suprime el resto del subárbol»*. O sea,
no eran 8 div en un botón —eran **1 error por tarjeta de llegada**, y producción mostraba 8 tarjetas; mi
demo `solo-oficiales`, 4—. La estructura que leí (5 `div` + 2 `p` por botón) era correcta; el validador
solo cuenta el primero. Tras el arreglo cada botón da 0, sean las tarjetas que sean.

**Contrapruebas:** W3C `/parada` **4 → 0**, y **home · `/linea` · `/estado` · `/sobre-los-datos` · 404
siguen en 0** (ninguna regresión). Comportamiento verificado **abriendo la página** a 360 y 1280:
`tagName === BUTTON`, foco visible, **Enter Y Espacio Y ratón** togglean `aria-pressed`, aspecto idéntico,
y el **nombre accesible no cambia** ("35 PARQUE GOYA 1min YA LLEGA Bus 4889 Articulado · 18 m Híbrido" —
se computa del texto, que div/p→span no toca). Suite: tsc 0 · vitest 563/1 skip · lint 0 err · playwright
**830 passed / 95 skipped / 0 failed** (incluye `acuse-de-toque`, que exige `BUTTON` en la tarjeta).

⚠️ **Los 10 de `/linea`, dicho honesto:** validé `/linea/35?fingir=horario` en vivo → **0 errores**, con el
Terminal renderizado. Pero el elemento concreto que ayer se arregló (`Terminal.tsx:94`, el `aria-label`
de la salida MARCADA) **no se ejercitó**: ningún modo `fingir` produce salidas marcadas (`data-marca: 0`
en las 7 líneas probadas) —solo aparecen con datos reales de Avanza que traigan una salida desviada del
par mayoritario—. Así que sigue **verificado por construcción** (`<span role="img" aria-label>` es HTML
válido), no en vivo. Se dice, no se da por bueno.

---

### Fase 38 · B-05 · `?fingir=error`: por fin se ve la pantalla del 500

El hallazgo no era que `error.tsx` estuviera mal: era que **nadie la había visto nunca**. Existía,
estaba escrita, y no había forma de provocarla → NO CONSTA. `?fingir=error` (solo en demo) lanza un error
en el **render del servidor** que escapa hasta el boundary. No es un modo de transporte —un throw en el
transporte lo captura la ingesta y sale la pantalla de «Avanza caído», que NO es el boundary—, así que
vive en un helper aparte (`dispararErrorFingido`), fuera de la unión `Fingimiento`, bajo la misma guarda.

⭐ **QUÉ SE VIO AL ABRIRLA POR PRIMERA VEZ (el valor de la tanda).** Una pantalla **buena**, a 360 y 1280:
cabecera y pie de ZetaBus (identidad, no la pantalla pelada de Next), un titular rojo honesto —«ALGO SE
HA ROTO» / «No hemos podido pintar esta pantalla»—, un texto que **tranquiliza sin mentir** («el fallo es
nuestro, no tuyo, y no tiene nada que ver con los autobuses: puede que estén llegando con normalidad»),
**dos salidas** (botón «Volver a intentarlo» + enlace «Ver todas las líneas») y una «Referencia del
fallo» (el digest, sin filtrar nada). Impresión honesta: **ayuda**, no es un callejón.

⚠️ **PERO UN DEFECTO REAL, CONFIRMADO EN VIVO (se reporta, NO se arregla — no se toca `error.tsx`):** el
botón «Volver a intentarlo» **no recupera** de un error de render de servidor. Usa `reset` (sin
re-fetch): re-renderiza los mismos hijos que ya reventaron → vuelve a reventar. Lo comprobé pulsándolo:
la pantalla de error **se queda**. La doc de esta versión (v16.2.0) añade `unstable_retry` (re-fetch +
re-render) justo para esto y deja `reset` «para casos específicos». O sea: la salida que de verdad
funciona hoy es **el enlace a la home**, no el botón. Por eso el e2e exige el enlace, no solo el botón.

⚠️ **SIN BANDA DE DEMO, Y A PROPÓSITO (me lo corrigió Antonio y tiene razón).** El GIF del momento oro
llevaba banda porque enseñaba un estado **de producto** (la app diciendo «no lo sé»). Aquí se quiere ver
el **500 real** —el que ve un usuario cuando algo revienta—; una banda haría que estuviéramos mirando una
pantalla **que no existe en producción**, y eso invalida el propósito. La página además revienta antes de
pintar `<Fingiendo>`, y `error.tsx` no pinta `error.message` (Next lo redacta en un server-throw). La
honestidad se **traslada**: (a) lo disparas tú a propósito, (b) queda `[ZETABUS DEMO] error fingido` en el
log del servidor. ⚠️ **Y cualquier captura de esta pantalla que acabe en documentación, README o
portfolio DEBE declararse simulada en su pie** —como el GIF—: la pantalla es real, pero el fallo lo
provocamos nosotros.

**`global-error.tsx` SIGUE NO CONSTA, y ahora se sabe POR QUÉ es estructural:** solo salta si revienta el
**root layout**, y en App Router los layouts **no reciben `searchParams`** → no hay forma de que vean el
`?fingir=`. No se fuerza; queda escrito que sigue sin verificarse y por qué.

**Guarda verificada:** sin `ZETABUS_DEMO=1`, `/parada/744?fingir=error` → **HTTP 200** (no revienta) y
**cero** marcador en el log. No se puede tumbar producción con él. **e2e visto en ROJO** (quitando el
`dispararErrorFingido` → la página da 200, no aparece la pantalla, el test cae) **y en verde**. Suite:
tsc 0 · vitest 563/1 skip · lint 0 err · playwright **835 passed / 95 skipped / 0 failed**.

---

### Fase 39 · `error.tsx` usa `unstable_retry`: el botón recupera de verdad

Consecuencia directa del B-05: al hacer alcanzable la pantalla del 500, se vio **en vivo** (pulsando) que
su botón «Volver a intentarlo» usaba `reset` —limpia estado y re-renderiza **sin re-fetch**—, y eso
**recupera de un error de CLIENTE pero NO de uno de SERVIDOR** (re-renderiza lo que ya reventó → vuelve a
reventar). La salida principal de la pantalla era **decorativa en el caso más probable**. Y peor por la
asimetría: dos salidas ofrecidas, solo una funcionando, sin que nada lo dijera.

Se adopta **`unstable_retry`** (Next 16.2.0), que re-FETCHEA y re-renderiza el segmento. Los dos props
**conviven** (la doc no los enfrenta); se usa el que recupera. **Quitar el botón no era opción:** `reset`
sí sirve para errores de cliente, así que borrarlo rompería el caso donde funciona.

⚠️ **SE ADOPTA UNA API `unstable_`, A SABIENDAS, Y SE ESCRIBE POR QUÉ.** El riesgo de que una API con
prefijo `unstable_` cambie bajo los pies está **acotado** porque `next` va **clavado a `16.2.10` en
package.json, SIN `^`**: no se mueve hasta que alguien suba de versión a propósito. El coste de NO hacerlo
(un botón que miente en el 500) es real y permanente; el riesgo es teórico mientras no se toque la
versión. ⇒ **Qué revisar AL SUBIR NEXT** (está también en el comentario de `error.tsx`): que
`unstable_retry` siga existiendo con esa firma; si se estabilizó (p. ej. pasó a `retry` sin prefijo),
migrar; si desapareció, volver a la doc. La doc leída: `error.md` y `getting-started/error-handling.md`
de esta versión.

**Verificado PULSANDO, no leyendo el diff** (el arreglo no se puede probar de otra forma):
- **(a) error que persiste** (`?fingir=error` sigue): pulsar hace **una petición nueva** a `/parada/744`
  (1→2) → re-fetchea de verdad; y como la causa sigue, vuelve a fallar —**correcto**, lo que se verifica
  es que reintentó, no que se arregló—. Se distingue de «no hizo nada» por la petición nueva en la red.
- **(b) causa retirada** (el antes/después que importa): con la pantalla de error delante, se retira la
  causa y se pulsa → **la página se recupera y pinta la parada** (2 tarjetas de llegada, error boundary
  desaparecido). **Con `reset` esto NO pasaba.**
- **(c) error de cliente:** **NO CONSTA** —no hay forma fácil de provocar un throw de render de cliente
  (`?fingir=error` revienta en servidor)—. Pero **sin regresión posible**: `unstable_retry` re-renderiza
  igual que `reset` y además re-fetchea, así que no puede ser peor para el caso de cliente.

**No se rediseñó la pantalla:** identidad, titular, texto y las dos salidas siguen igual; solo cambió
**qué hace el botón**. `global-error.tsx` no se tocó (sigue NO CONSTA, estructural). Suite: tsc 0 · vitest
563/1 skip · lint 0 err · playwright **835 passed / 95 skipped / 0 failed** (el e2e del 500, verde en los
5 viewports).

---

### Fase 40 · B-03: se DECIDE no arreglar el 404 en blanco sin JS, y se escribe en el código

Diagnóstico de solo lectura (build local + `curl` = sin JS) con veredicto **DOCUMENTAR, no arreglar**,
aprobado por Antonio. No se arregla nada: solo comentarios donde alguien se lo va a encontrar.

**El mecanismo, medido:** `notFound()` lanzado dentro de una página `force-dynamic` (`/parada/[poste]`,
`/linea/[linea]`) sirve el not-found por **streaming** → el HTML inicial es un shell `__next_error__` y la
UI («Aquí no hay nada») viaja en el payload RSC → **blanco hasta que hidrata**. La doc lo distingue:
`not-found.md` dice que la respuesta *streamed* se comporta distinto de la *non-streamed*.

⚠️ **DOS CORRECCIONES AL INFORME B-interfaz** (que se queda como está, describe su momento):
1. **El 404 de una ruta INEXISTENTE (`/una-ruta-que-no-existe`) SÍ renderiza en servidor** —`Aquí no hay
   nada` está en el DOM real, HTTP 404, con `noindex`—. El informe decía «el 404 sale en blanco» a secas,
   y eso era **falso**: solo falla el `notFound()` de `/parada` y `/linea`, no el de ruta inexistente.
2. **`error.tsx` (el 500) TAMBIÉN sale en blanco sin JS** (hallazgo nuevo) — pero es **inherente y no
   arreglable**: una error boundary de React es cliente por definición, su contenido no está ni en el
   payload RSC. No es incoherencia; es lo que es. Por eso NO se le pone comentario (su caso no invita a
   ningún «arreglo» equivocado).

⭐ **El factor de confusión, aislado y escrito:** `/estado` es `force-dynamic` **sin** `notFound()` y
renderiza perfecto → **`force-dynamic` por sí solo NO causa el blanco**; hace falta la combinación. Ese
dato es el que impide el diagnóstico equivocado de «quito el `force-dynamic` y arreglo el 404», y va
escrito en los comentarios precisamente para eso.

**Las cuatro vías, descartadas (y por qué):** quitar `force-dynamic` **rompe el dato en vivo** (y no es la
causa) · `loading.tsx` cambia el blanco por un spinner que sin JS no acaba nunca y **mete estado de carga
en toda la app** · `global-not-found` es **experimental** y solo cubre las rutas inexistentes (que ya
funcionan) · pintar inline sin `notFound()` **no puede fijar el 404** (se perdería el estado que hoy sí
está bien). Todas rompen el dato, degradan la app o se pelean con el framework.

**Impacto real, dicho sin alarmismo:** status **404 + `noindex`** en los dos casos → **SEO intacto**; el
único afectado es alguien con JS desactivado en una URL de parada o línea **equivocada**. Marginal de lo
marginal.

**Dónde quedan los comentarios (4):** el razonamiento completo, junto al `notFound()` de
`parada/[poste]/page.tsx`; una versión compacta con puntero a ése, junto al de `linea/[linea]/page.tsx`
(no se duplica el porqué entero); y una **miga de una línea** sobre cada `export const dynamic =
'force-dynamic'` de ambas rutas —que es el sitio donde alguien iría a «arreglarlo» quitándolo— avisando de
que no es la causa. `error.tsx` no se tocó.

Solo comentarios: tsc 0 · lint 0 · vitest **563/1 skip** (los guardianes de comentarios, `sinComentarios`,
no mordieron: comentarios `//` sin secuencias `/*`···`*/`). Sin push.

---

### Fase 41 · B-07: se RENUNCIA al suelo táctil de 44 (AAA) y el guardián baja a 24 (AA) y VIGILA

Al arreglar el test que medía el suelo táctil y no lo afirmaba (Bloque C · F1) salieron **361 zonas por
debajo de 44 px** en `/linea/N7` a 360 px: **120 filas de parada** (24 px de alto) + **241 chips** de
correspondencia (24×24), TODAS en la lista de recorrido de `/linea/*` (ni una en la home ni en
`/parada/*`). El test quedó en `test.fixme` esperando esta decisión.

**DECISIÓN DE ANTONIO — renunciar al AAA + bajar el guardián.** Los 44 px eran un objetivo **AAA (WCAG
2.5.5) que el proyecto se autoimpuso**, no una norma; los 24×24 **CUMPLEN el mínimo AA (2.5.8)**. Las tres
alternativas eran peores que la enfermedad:
- **filas a 44** → **+2.400 px de scroll** en N7, en la lista que la gente recorre buscando su parada;
- **agrandar los chips** → fuerza salto de línea a 360 px y **rompe la composición donde más importa**;
- **área táctil ampliada sin agrandar lo visible** → **aquí NO aplica**: filas y chips van apilados y
  adyacentes, así que ampliar el área de uno **invade la del vecino** (esa técnica pide aire alrededor, y
  aquí no lo hay).

Lo respalda la regla del propio proyecto: *"declara el techo en voz alta — cuando un límite es físico, hay
que decirlo, para que no se lea como pereza"*.

⚠️ **EL MATIZ HONESTO, ESCRITO PARA NO VENDER HUMO: 24 px es el MÍNIMO, no lo cómodo.** En un autobús en
marcha una fila de 24 px se falla. La renuncia es **real**, no un tecnicismo — por eso se escribe el
porqué, no solo la decisión.

⭐⭐ **Por qué NO basta con documentar — el guardián BAJA a 24 y SALE del `fixme`.** Un `test.fixme`
permanente es **un instrumento dormido en la suite**, justo lo que el Bloque C entero se dedicó a
eliminar; dejarlo así sería recrear a sabiendas lo que acabábamos de limpiar. Con el umbral en 24 la
afirmación pasa de *"nos pusimos una meta y no llegamos"* a **"nos comprometemos con el AA y lo
vigilamos"**: el día que alguien meta un chip de 18 px, **salta**.

**Verificado como manda el método** (un guardián que nunca se ha visto rojo no vigila nada):
- **Verde a 24, y ninguna zona por debajo:** el test recorre 3 anchos (360/881/1280) × 3 URLs (`/`,
  `/parada/1228?fingir=solo-oficiales`, `/linea/N7?sentido=0&fingir=desviada`) → *"zonas táctiles por
  debajo de 24: **0**"*. Las 361 eran <44, no <24: **no se incumple el AA**.
- ⭐ **ROJO de la mutación, visto:** inyectando temporalmente un `<button>` de 10×10 px en cada página, el
  test **falla** y lo reporta en las 9 cargas (3 anchos × 3 URLs). Restaurado (sin rastro, `git status`
  limpio). El guardián vigila de verdad.

**NO se tocó ni CSS ni diseño:** la decisión es **no** cambiar la interfaz. El informe `B-interfaz.md`
sigue diciendo 361 (describe su momento). El delta de la suite es el esperado: el test salió del `fixme`
→ **playwright 836 passed / 94 skipped** (antes 835/95: +1 passed, −1 skipped).

**Y de paso, el cabo menor en `error.tsx`:** una línea junto a donde ya se explica que es un client
component, diciendo que **esa pantalla también sale en blanco sin JS** pero es **INHERENTE** (una error
boundary de React es cliente por definición), **no arreglable**, y **NO es el caso del B-03** (aquél es el
`notFound()` de `/parada` y `/linea`). Es para que el siguiente que audite no lo redescubra como hallazgo.

Suite: tsc 0 · lint 0 · vitest 563/1 skip · playwright **836/94 skip / 0 fallos**. Sin push.

---

### Fase 42 · B-09: fuera la promesa temporal del rótulo del panel

El panel `/estado` titulaba una tarjeta **"Desvíos y correspondencias DE HOY"**, pero el índice se
regenera de noche y puede llevar **más de 26 h** (hasta ~2 días si el barrido falló). Cuando eso pasa, el
banner ámbar **"Datos desactualizados"** de arriba y ese rótulo **"de hoy"** **conviven en la misma
pantalla, contradiciéndose literalmente** — un aviso que dice "esto es de hace días" debajo... no, ENCIMA
de un título que dice "de hoy".

**DECISIÓN DE ANTONIO: quitar la promesa temporal del rótulo.** Se cambian las dos cadenas de esa tarjeta
(que se pinta en `al-dia` **y** en `desactualizado`): título *"Desvíos y correspondencias de hoy"* →
**"Desvíos y correspondencias"**, y la cifra *"líneas con desvío hoy"* → **"líneas con desvío"**. Sigue
diciendo QUÉ es; deja de afirmar CUÁNDO.

⭐⭐ **Por qué NO se condicionó al aviso de rancio** (era la otra vía, y la que sugería el informe): **el
título no es donde vive la frescura.** El banner ámbar ya la comunica —y bien—, con su *"actualizado hace
X"* al lado. Un título dinámico añadiría **una pieza más que puede desincronizarse** con el dato real; uno
que no promete nada temporal **no puede mentir nunca**. Menos código y menos superficie para equivocarse.
Es la misma lógica que en `/parada`: la `description` se dejó genérica a propósito porque prometer "tiempo
real" era justo la mentira que `robots.ts` evita.

⭐ **El barrido de otras promesas temporales, hecho** (distinguiendo canal vivo de índice nocturno):
- **Dejado, porque es CIERTO:** el resumen `al-dia` *"los recorridos y los desvíos que ves son los de
  hoy"* solo se pinta cuando la edad ≤ 26 h (es la definición de `al-dia`), así que es honesto —no es un
  título fijo, es una frase condicionada a la frescura real—.
- **Dejado, porque es NEUTRO a propósito:** el rótulo *"Líneas que pasan por aquí"* de `LineasQuePasan`
  (su propio comentario ya razona que no promete "ahora" ni "siempre").
- ⚠️ **REPORTADO, NO tocado** (borderline · pido antes de cambiar):
  · *"correspondencias vigentes"* (misma tarjeta): *"vigentes"* es una afirmación de validez actual más
    suave que "de hoy", pero bajo el banner de rancio también roza. No la toqué solo.
  · el pie *"los desvíos de hoy, de un barrido nocturno automático"*: prosa que describe la FUENTE,
    siempre presente; suaviza menos que un título, pero es la misma promesa.
  · *"Hoy, por un desvío"* (la caja punteada de `/parada`): **es índice y dice "Hoy"**, pero es un caso
    distinto —diseño deliberado (el recuadro no aparece en degradado), sin banner de frescura al lado, y
    con un e2e que ancla en ese texto exacto (`lineas-que-pasan.spec.ts`)—. Cambiarlo es más grande y
    afecta a la página principal: se reporta para decidir aparte, no se toca por inercia.

**Verificado ABRIENDO el panel** (el índice estaba a ~70 h → veredicto `desactualizado`, así que se pudo
ver el banner ámbar Y el rótulo nuevo a la vez): a **360 y 1280**, el título dice "Desvíos y
correspondencias" (sin "de hoy") justo debajo del *"Datos desactualizados · actualizado hace 2 días y
22 h"*, la rejilla 2×2 intacta, nada desbordado. Ningún test anclaba en las cadenas viejas (grep). Un
comentario junto a la tarjeta deja escrito el porqué para que nadie re-añada "de hoy" ni lo condicione.

Suite: tsc 0 · lint 0 · vitest **563/1 skip** · playwright **836/94 skip / 0 fallos**. Sin push.

---

### Fase 43 · B-09: cerrados los tres borderline (uno se toca, uno se deja, uno se documenta)

Los tres casos que la Fase 42 reportó sin tocar, decididos por Antonio:

**(1) "correspondencias vigentes" → SE CIERRA (era el mismo caso).** Se trazó de dónde sale la cifra: es
`modelo.barrido.incidencias`, que viene de `fundirCorrespondencias` (`sources/avanza/correspondencias.ts`)
y cuenta **cada par (poste, línea, sentido) del ÍNDICE NOCTURNO** (`incidencias += normales.length +
provisionales.length`). **NO es la vigencia del feed GTFS** —ésa es OTRA tarjeta, "Datos oficiales de
recorrido · Vigentes hasta 2026-10-05", que sí tiene fechas de validez declaradas—. O sea: "vigentes"
aquí era sinónimo de "las de ahora" sobre un índice que puede tener días → **el mismo caso que "de hoy",
en la misma tarjeta**. Se cierra igual: *"correspondencias vigentes"* → **"correspondencias"** (dice QUÉ,
no CUÁNDO). Verificado con el banner ámbar delante (índice a ~71 h): la tarjeta lee "14 líneas con desvío
/ 2.034 correspondencias", sin promesa temporal.

**(2) El pie "los desvíos de hoy, de un barrido nocturno automático" → SE DEJA.** Describe la FUENTE (qué
va a buscar el barrido, y que es nocturno y automático), no la frescura de lo que hay en pantalla. Es
prosa sobre el mecanismo, no una etiqueta sobre el dato. No contradice nada. No se toca.

**(3) "Hoy, por un desvío" (caja punteada de `/parada`) → SE DOCUMENTA, no se toca. Y es "se valoró y se
acepta", no "se olvidó".** Es distinto del rótulo del panel: aquél contradecía un banner que tenía JUSTO
debajo; éste no tiene banner al lado **porque el proyecto decidió a propósito** no pintar la edad del
índice en la parada (*"sería ruido para quien espera el autobús; vive en /api/diag y en el panel"*). Y —lo
que sostiene la decisión— **la limitación YA ESTÁ DECLARADA con todas las letras en `/sobre-los-datos`**
(verificado, líneas 310-326): *"un desvío que empieza hoy puede no aparecer hasta esta noche, y uno que
terminó de madrugada puede seguir listado hasta la siguiente reconstrucción"*. El "Hoy" de esa caja es la
**abreviatura de algo ya explicado**, no una afirmación sin respaldo. Cambiarlo tocaría la página
principal y un e2e (`lineas-que-pasan.spec.ts:81`) por un matiz **ya cubierto**. ⇒ Se deja un comentario
`//` junto a la caja (full en `CajaProvisionales`, puntero en `CajaProvisionalesDePoste`) que dice: que el
"Hoy" viene del índice nocturno y puede tener días, que se acepta a propósito (edad no pintada aquí + la
limitación explicada en `/sobre-los-datos`), y que **NO se intente "arreglar" sin releer eso**. Comentario
`//`, sin secuencias de bloque, para no despertar al guardián.

Ningún test anclaba en "correspondencias vigentes" (grep); el texto "Hoy, por un desvío" no se tocó, así
que su e2e sigue verde. Suite: tsc 0 · lint 0 · vitest **563/1 skip** · playwright **836/94 skip / 0
fallos**. Sin push.

---

### Fase 44 · E-02: se acepta que el cron pueda fallar en silencio. No se monta alerta.

El cron nocturno que regenera el índice de correspondencias **falla en silencio**: si no corre, nadie se
entera automáticamente (la propia ruta ya lo admitía: *"un cron mal puesto no deja rastro aquí"*). Antonio
decide **aceptarlo y documentarlo, sin montar alerta**.

⭐ **PRIMERO, LA COMPROBACIÓN — que la documentación no sea teórica.** Se pidió
`https://zetabus.antonioblanquez.es/api/diag` (**producción**, no el índice local que estaba a ~71 h
porque aquí nadie lo regenera): `correspondencias.generadoEn = 2026-07-30T02:00:02Z`, **edad 11,3 h**. El
`generadoEn` clavado en las 02:00:02 confirma que el `0 2 * * *` disparó esta madrugada. ⇒ **El cron
funciona.** Documentar "aceptamos que pueda fallar" es honesto porque el mecanismo está vivo — no es
tapar un fallo activo.

**Los tres argumentos de la decisión:**
1. **La señal YA EXISTE**, en dos sitios: `/api/diag → correspondencias.edadSegundos`, y el panel
   `/estado`, que se pone **ámbar a las 26 h** (`FRESCURA_MAX_HORAS`). Lo que falta no es la señal, es que
   alguien la mire — y para eso no hace falta una alerta, hace falta saber DÓNDE mirar (que es justo lo
   que documenta esto).
2. **La degradación es grácil:** si el cron no corre, se sirve el índice anterior; los desvíos van un día
   por detrás —limitación ya explicada en `/sobre-los-datos`—. No se rompe nada.
3. ⭐⭐ **Una alerta es, ella misma, una pieza que puede fallar en silencio.** ¿Quién avisa cuando el que
   avisa deja de avisar? Montarla sería añadir **exactamente la clase de instrumento que estas tandas
   llevan días cazando** —con la agravante de que su fallo es invisible por definición— y una pieza móvil
   más (correo, webhook, monitor) en un proyecto que se quiere dejar quieto una temporada.

**Documentado en dos sitios, con el DÓNDE SE MIRA bien visible** (que es lo más útil: que el día que se
sospeche, no haya que reconstruirlo): un bullet nuevo en el README (§El cron nocturno, donde el E-03 ya
documentó el cron) con la decisión durable y los tres motivos; y un puntero en el JSDoc de
`api/regenerar/route.ts`, extendiendo la admisión que ya estaba ahí. Los dos dicen: qué puede pasar, por
qué se acepta, y **dónde se mira** (`/estado` ámbar a las 26 h + `/api/diag`). La verificación fechada
(11,3 h) vive aquí, no en el README —que envejecería—.

⛔ No se montó nada: ni alerta, ni latido, ni un log "por si acaso". Solo texto. tsc 0 · lint 0 · vitest
**563/1 skip** (`readme-no-miente` verde: el añadido no disparó ningún patrón ni el chequeo de enlaces) ·
playwright **836/94 skip / 0 fallos**. Sin push.

---

### Fase 45 · E-04: declarada la excepción de clasificación, y cerrado el 🔵 de la atomicidad

`data/flota-avanza-zaragoza.json` está **versionado** en `data/` (junto a los curados) pero **es un
derivado** —lo genera `build-flota.ts`, y su `_meta.generadoPor` ya se autodeclara "⛔ NO EDITAR A MANO"—.
La convención implícita *"`data/` = curado, `src/generated/` = derivado"* tenía aquí una **excepción sin
declarar**. Antonio decide **declararla (no reclasificar)** y **cerrar el 🔵 hermano de la atomicidad
documentándolo**.

⭐ **EL BARRIDO PEDIDO — ¿hay más derivados versionados en `data/`?** Se comprobó `git ls-files data/` +
el `_meta` de cada JSON + qué scripts escriben ahí. Resultado: **este es el ÚNICO.** `writeFileSync` a
`data/` **solo** lo hace `build-flota.ts` (grep). Los demás no son derivados sin declarar: `flota-observada`
y `referencia/` son **curados** (observación humana / material de auditoría), y `postes-solo-barrido-
coordenadas` **ya está declarado** en el `.gitignore` como "se fija una vez, no se deriva cada noche". ⇒ La
nota puede ser específica de este fichero, presentando el concepto de las dos clases en general.

**(a) La excepción, declarada donde ya se explica que el fichero entra al repo** (`.gitignore` §4, la nota
que decía "GENERADO por build-flota… No se edita a mano" — se **amplía**, no se duplica el `_meta`):
`data/` alberga **dos clases** —datos **curados** (los escribió una decisión humana) y **derivados caros de
regenerar** cacheados en el repo— y este es de la segunda. Por qué versionado y no en `src/generated/`:
regenerarlo **raspa Avanza** y cambia rarísimamente; en `generated/` estaría ignorado → habría que
rehacerlo en **cada build**, más peticiones a Avanza por deploy, justo lo que el proyecto evita por ética
escrita. **No es una violación de la convención: es una TERCERA categoría que la convención no contemplaba.**

**(b) La atomicidad, cerrada documentándola** (comentario junto al `writeFileSync` de `build-flota.ts`,
que es donde alguien la "arreglaría"): se sobrescribe **directo, a propósito**, sin `.bak` ni escritura
atómica. ⭐ **Al estar versionado, GIT ES EL RESPALDO** —`git diff` enseña qué cambió, `git checkout` lo
restaura, con historial—. Un `.bak` **duplicaría** una protección que ya existe y dejaría un fichero
huérfano en el repo. Y el script corre **a mano**, fuera del pipeline, leyendo solo fuentes curadas: nadie
lo pisa por sorpresa (por eso E-04 se dio por inofensivo). ⛔ Escrito para que nadie añada esa atomicidad
innecesaria dentro de seis meses.

Solo texto (ninguna reclasificación, ningún `.bak`, nada funcional): tsc 0 · lint 0 · vitest **563/1 skip**
(la flota no se tocó: `procedencia-de-la-flota` y los recuentos de `/sobre-los-datos` verdes) · playwright
**836/94 skip / 0 fallos**. Con esto quedan cerradas **todas las decisiones pendientes de los bloques B y
E**. Sin push.

---

### Fase 46 · F4: el guardián del contraste vigila la FORMA, no el resultado

⭐⭐ **LA REGLA GENERAL, que es lo que se lleva uno de aquí:** *un guardián de fuente única tiene que
vigilar la **FORMA** (que no exista otra copia), no el **RESULTADO** (que todas coincidan). Comparar
resultados solo detecta el síntoma **cuando ya divergió** — o sea, cuando el bug ya está en producción.*
Y su corolario: **los límites del guardián van declarados en su cabecera** —un guardián que promete de más
es peor que no tenerlo, porque quien lo lee confía en una red que no está—.

**EL HALLAZGO.** `contraste-una-sola-formula` prometía en su cabecera *"si alguien vuelve a escribir la
fórmula a mano en un componente, esto se pone rojo"*. Era **falso**: comparaba por VALOR
(`toBeCloseTo(…, 12)`), así que solo cazaba **divergencias**, no la EXISTENCIA de una copia. Una copia
**correcta reescrita a mano** escapaba —y es la copia divergente de mañana, cuando se edite una y no la
otra: el bug ORIGINAL de ese mismo fichero, el que se cazó *contando `0.03928` a mano*—.

**EL ARREGLO — se automatiza lo que funcionó a mano** (contar apariciones en el árbol):
- **Vigila la FORMA:** grepea el código git-trackeado de `src/`+`e2e/`+`scripts/`+`tests/` (SIN
  comentarios, con un `soloCodigo` que preserva el nº de línea) buscando la **firma** de la luminancia —el
  coeficiente verde **`0.7152`** (lo lleva TODA implementación, correcta o ingenua → caza más) y el umbral
  **`0.03928`** (el token exacto de la cicatriz)—. Debe aparecer SOLO en los **dos sitios sancionados**: el
  núcleo `core/contraste.ts` y este guardián (que conserva la copia ingenua a propósito). El rojo dice
  **qué firma y en qué fichero:línea**, para arreglarse solo con leerlo.
- **Falsos positivos resueltos:** comentarios que citan la fórmula (cabecera del núcleo, nota histórica de
  `sentido.spec`) → se quitan antes de grepear (verificado que están en JSDoc); los dos sancionados →
  excluidos por nombre.
- **Falsos negativos DECLARADOS en la cabecera** (es lo que hace honesto el arreglo): una copia con el
  número en otra forma (`7152e-4`, tabla de lookup) o que duplique solo la razón `(max+.05)/(min+.05)`. La
  firma tolera el cero de más (`.7152`), no reescrituras exóticas.
- **El `toBeCloseTo` NO se elimina, se REENCUADRA** como *red de respaldo*: verifica que el número es el
  correcto (núcleo vs WCAG, la ingenua diverge, `ChipLinea` == núcleo sobre 44 líneas). Cubre los huecos
  declarados de la firma. Lo que se corrige es la **promesa**, no la comprobación.

**Verificado con las CINCO mutaciones** (`git status` limpio tras cada una, restaurado desde backup, no con
`git checkout`):
1. ⭐ **Copia CORRECTA a mano en `ChipLinea`** (la que escapaba) → **ROJO** por la FORMA
   (`ChipLinea.tsx:69 → coeficiente verde 0.7152`), y el value-check **siguió VERDE** —que es la prueba de
   que la comparación de valores NO la veía y la forma SÍ—.
2. **Copia DIVERGENTE** (ingenua sin linealizar) → **ROJO por las dos**: la forma (`0.7152`) y el valor
   (`la línea C1 da distinto`: 1,77 vs 3,20).
3. **Sin mutación** → verde (10 tests; nada de falsos rojos).
4. Restaurado, `git status` solo el guardián.
5. ⭐ **Copia correcta con `.7152`** (sin el cero inicial) → **cazada** igual (la tolerancia que promete la
   cabecera, demostrada).

⚠️ **La cabecera es parte del arreglo:** antes mentía; ahora dice **exactamente qué vigila y qué NO**. Y
no se autodispara —lleva `0.7152`/`0.03928` en prosa, pero el guardián es sitio sancionado (excluido) y
además se quitan comentarios—: comprobado que la suite entera sigue verde.

**Otros guardianes con el mismo defecto:** no se hizo auditoría dedicada (fuera de alcance) y **no se
tropezó con ninguno** —los que se han visto (`pantalla-no-miente`, `marca-z-unica`, `horas-malas`) ya
vigilan FORMA por grep; `readme-no-miente` compara valores, pero ahí ES su trabajo (cotejar la cifra
escrita con la calculada), no el defecto de este—.

tsc 0 · lint 0 · vitest **564/1 skip** (+1: el nuevo test de la forma) · playwright **836/94 skip / 0
fallos**. NO se tocó `core/contraste.ts` ni ningún consumidor (no hay copias hoy: esto es blindar). Sin
push.

---

### Fase 47 · F2: las sondas de `barrido-fino` dejan de fingir ser test (opt-in)

⭐⭐ **LA REGLA:** *un test que recoge y no afirma es un informe disfrazado —cuesta tiempo, da sensación de
cobertura y no puede fallar nunca—. Y el arreglo NO siempre es ponerle un `expect`: a veces es
**reclasificarlo como lo que es**.* Aquí lo era: el F2 **NO era el F1**. En el F1 el `expect` que faltaba
destapó 401 infracciones reales; aquí no había defectos que destapar (**0 hallazgos reales** hoy), así que
afirmar habría **fabricado un guardián flaky** —el falso rojo que enseña a no mirar la suite—.

**EL DIAGNÓSTICO (turno anterior), con datos:** `barrido-fino` tiene cuatro sub-pruebas. `EL CORTE de 880`
**afirma** (`expect(fallos).toEqual([])`) → es un guardián. `geometría`, `títulos` y `capturas`
**recogen** (escriben `e2e/.barrido/*.json` y PNGs) y **NO afirman**. Verificado que geometría da 0
hallazgos reales —los 2 que salieron una vez eran el mapa de Leaflet a medio montar (`rect`/`path` fuera
de pantalla, texto vacío), y al re-correr, 0—; `barrido-total` remide a 250 ms para descartar ese
transitorio, `barrido-fino` no.

**EL ARREGLO (opción D apoyada en B):** las tres sondas van **opt-in con `BARRIDO=1`** —el **mismo
interruptor** que `barrido-total`, no uno nuevo (dos formas de gatear lo mismo sería la copia a mano en
versión configuración)—, con un `soloSonda()` por-test. El corte 880 **NO** lo lleva: sigue en la suite
por defecto. La cabecera se reescribe para decir qué afirma y qué solo sondea, cómo se lanzan, dónde dejan
su salida, y **el transitorio del mapa** (para que quien lea el JSON no persiga fantasmas). Por qué B y no
C (borrarlas): la sonda tiene valor exploratorio real —12 casos curados × 8 anchos, incluida la frontera
879/881 y 1280×720, que `barrido-total` no cubre—; lo que sobra no es la sonda, es que finja ser guardián.

**Verificado con las tres contrapruebas:**
- **Sin `BARRIDO`** → las 3 sondas se saltan, el corte 880 corre: `barrido-fino` pasa de **4 tests a 1**
  (el guardián), ~50 s → ~14 s. En la suite entera: playwright **833 passed / 97 skipped** (antes 836/94:
  los 3 se mueven de passed a skipped).
- **Con `BARRIDO=1`** (solo el fichero fino) → las 4 corren y **producen su salida**: `fino-geometria.json`
  (0 hallazgos), `fino-titulos.json`, 24 PNGs en `e2e/.capturas/`. No quedan muertas.
- **El corte 880 intacto** en la suite por defecto (verde a 1280px).

⚠️ **Dos cosas que me tropecé y NO arreglé (fuera de alcance), reportadas:**
1. **Un test flaky ajeno:** `linea-sin-barrido.spec.ts:69` ("CERO peticiones a Avanza") **falló una vez**
   en el run completo y **pasó al re-correr** (aislado 15/15, y el full siguiente 833/0 fallos). Es
   `networkidle` + espera de 20 s bajo contención de 6 workers —el propio test avisa de que el contador
   global está "contaminado por los otros workers"—. Pre-existente, no lo toca esta tanda.
2. **La cabecera de `barrido-fino`** describe "la regla del alto, el árbol de accesibilidad, el recorrido
   con TAB" como si vivieran aquí, pero viven en `barrido-fino-2`. Imprecisión menor; no se arregla en
   esta tanda (no era el encargo).

tsc 0 · lint 0 · vitest **564/1 skip** · playwright **833/97 skip / 0 fallos**. NO se tocó el corte 880, ni
`barrido-total`, ni `barrido-contraprueba`, ni `barrido-fino-2`. No se escribió ningún agregador ni
aserción. Sin push.

### Fase 48 · react-hooks: `:94` arreglado (ref en render), `:250` documentado (setState en efecto)

⭐⭐ **LO IMPORTANTE, Y LO QUE DEJO ESCRITO PARA EL FUTURO:** **el lint sigue CIEGO en este fichero.** El
analizador de `react-hooks` se rinde con la unión de tipos de `Estado` (`LlegadasVivas.tsx:65-69`) antes de
llegar a estos dos avisos —por eso llevaban ahí desde siempre en verde—. **El verde aquí no significa "está
bien": significa "no he podido mirar".** La verificación buena de esta tanda **no fue el lint**, fue abrir
la página. Y seguirá ciego mientras la unión no se simplifique (lo que se descartó en el **B-04**, decisión
de Antonio): no hay vía barata para recuperar la vigilancia.

**Los dos hallazgos venían del Bloque A (vía B-04), invisibles por lo de arriba. Diagnóstico del turno
anterior, con evidencia, y el veredicto: uno se arregla y el otro no.**

**`:94` — se ARREGLA (`56b6f9a`).** El `useState` del contador de edad se inicializaba con
`edadAlLlegar.current`: leer un ref **en render**, que es regla dura de React (rompe con render
concurrente). Hoy era inofensivo —el inicializador de `useState` solo corre en el primer render, y ahí el
ref acaba de nacer una línea antes con ese mismo valor—, pero la cura es una **sustitución algebraica** de
riesgo cero: una constante `edadInicial` alimenta el `useRef` **y** el `useState`, y nadie lee `.current`
en render. Beneficio a futuro: el día que la unión se simplifique y el analizador despierte, ya solo
levantará el `:250` —y ese estará documentado como aceptado, no como cabo suelto—.

⭐ **Verificado ABRIENDO LA PÁGINA** (`next dev` con el código nuevo, navegador de verdad, `/parada/744?
fingir=sin-verificar`), que es lo único que vale aquí: la barra de edad **arranca en la edad del dato**
(«ahora mismo»), **sube 1/s** (Δ=3 en 3 s), y el **botón ↻ la resetea** a una edad fresca que vuelve a
subir. El valor de arranque baila un segundo entre corridas porque la edad del fixture demo se calcula de
un timestamp —exactamente lo que `edadInicial` refleja—.

**`:250` — NO se toca, se DOCUMENTA (`3e24b19`).** Es un `setState` dentro de un efecto (soltar la
selección cuando el coche caduca de la lista). `react-hooks` lo marca por costumbre, pero **aquí es el
patrón correcto**: (1) está **guardado contra bucle** —al soltar pone `seleccionado = null` y el `return`
corta en seco al render siguiente—; (2) el render extra ocurre **una vez** y solo al caducar una selección.
Las dos alternativas «idiomáticas» son **peores**: ajustar el estado en el cuerpo del render obliga a
setters crudos —sutil y frágil en la pantalla estrella—; y derivar un `seleccionadoEfectivo` **cambia el
comportamiento observable** —hoy, al apagar la línea del coche seleccionado el foco se suelta **para
siempre**; derivándolo, **reaparecería** al reencender la línea—. Se documenta **para que el día que el
lint despierte ese aviso no parezca un cabo suelto** y nadie lo "arregle" con la peor de las dos.

⭐ **La regla:** *un `setState` en un efecto no es un error por sí mismo: es un patrón sospechoso. Cuando
está guardado y expresa una intención que no se puede derivar sin cambiar el comportamiento, el arreglo no
es tocarlo —es dejar escrito por qué es el bueno, antes de que un guardián dormido lo despierte y otro lo
"corrija".*

tsc 0 · lint 0 (3 warnings preexistentes, ninguno en este fichero) · vitest **564/1 skip** · playwright
**833/97 skip / 0 fallos** (build reconstruido para que el e2e probara el código nuevo, no el del 30-jul).
NO se tocó el contador (`:101`), el refresco (`:147`), `edadAlLlegar`, `llegoEn`, el cálculo de la edad, la
unión de `Estado`, ni el `:250` en lo funcional. **Último pendiente de código de la lista.** Sin push.

### Fase 49 · Bloque F: tres arreglos puestos (#1, #2, #3-enlace) y dos frenados por conflicto

De los cuatro arreglos aprobados del Bloque F, **tres se ponen enteros y dos se frenan** — porque al abrir
el código aparecieron dos conflictos que la aprobación no conocía. ⭐ **La regla de la tanda:** *cuando lo
aprobado choca con una decisión ya documentada o con un guardián, el arreglo no es hacerlo igual: es
pararse y devolver la decisión con la información que faltaba.*

**PUESTOS (con la página abierta y mirada a 360 y 1280):**
- **#1 · la ciudad, visible (`10b60d3`).** Un `<p aria-hidden>` bajo el `<h1 sr-only>` y antes del
  buscador: *"El autobús urbano de Zaragoza, línea a línea."* —verbatim el arranque de la `description`—.
  Verificado a 360: **no empuja el buscador** fuera de la primera pantalla; el `<h1>` oculto no se toca; el
  `aria-hidden` evita que el lector lo oiga dos veces.
- **#2 · enlace "Código" (`64df23c`)** y **#3 · enlace "Estado del servicio" (`c4f85c0`)**, los dos en el
  pie, patrón exacto de los que ya había. A 360 el pie **envuelve limpio** a dos filas; ≥44 px de zona
  táctil (sobre el suelo de 24 del B-07). Antes no había **ningún** camino del sitio al código, y `/estado`
  —la pantalla que mejor enseña la tesis— solo se alcanzaba tecleando la URL.

**FRENADOS Y DEVUELTOS A ANTONIO (no se tocan):**
- **#5 · "← volver" en parada/línea → PARADO.** [parada/[poste]/page.tsx:121](../src/app/parada/[poste]/page.tsx)
  lleva una decisión **explícita**: *"⛔ NO hay flecha «←» de volver … sería ruido con la llegada arriba."*
  Y esa pantalla tiene un principio medido —lo primero es CUÁNDO llega el bus— **vigilado por
  `e2e/flotacion.spec.ts`** (el primer tiempo tiene que caber sin scroll a 360). Un "← volver" arriba
  empuja la llegada hacia abajo: es justo lo que el ⛔ evita. La aprobación del #5 salió de una propuesta
  que **no advertía de ese ⛔** (aún no se había leído el fichero). Como el #5 es un hallazgo único ("sin
  volver en parada **y** línea"), se frena **entero** —no media parte— y se devuelve para que se decida con
  esto delante: ¿solo en línea (que no tiene ese conflicto), otra colocación en la parada, o se respeta el
  ⛔?
- **#3 · `/estado` en el `disallow` de robots → PARADO.** La decisión aprobada era *"enlazar pero no
  indexar"*. Pero `/estado` **está hoy en el sitemap a propósito** ([sitemap.ts:49](../src/app/sitemap.ts)),
  y `tests/sitemap.test.ts:42` afirma que **ninguna URL del sitemap cae bajo un `disallow`**: meter
  `/estado` en `disallow` **rompería ese test y contradiría el sitemap**. Arreglarlo pide **tocar el
  sitemap**, que no entra en esta tanda. ⇒ **Por qué se enlaza pero NO se mete en el `disallow` todavía:**
  el enlace arregla el hallazgo real (era inalcanzable); la indexación es una segunda decisión que hoy se
  contradice consigo misma y la resuelve Antonio (disallow **y** quitarla del sitemap **y** ajustar su
  test, o dejarla indexable). El `robots.txt` servido se comprobó: `/estado` **sigue fuera** del `disallow`.

**REPORTES (medidos, sin tocar nada):**
- **(A) Radio de "Estado del servicio":** pequeño. Solo dos sitios de cara al usuario —el `title`
  ([estado/page.tsx:39](../src/app/estado/page.tsx)) y el `<h1>` (`:142`)—, más una frase de error interna
  (`:105`). **Ningún e2e** afirma esa cadena. Si se renombrara, está contenido; de momento se usa el nombre
  actual en el pie. **No se renombra** (decisión de Antonio).
- **(B) `/estado` en el sitemap:** sí, y a propósito (ver arriba). Es la contradicción que frena el
  `disallow`. No se ha encontrado ninguna otra ruta con choque sitemap↔robots.

tsc 0 · lint 0 · vitest **564/1 skip** · playwright **833/97 skip / 0 fallos** (build reconstruido). NO se
tocó robots, sitemap, el `<h1 sr-only>`, la parada ni la línea. Commits atómicos, uno por arreglo. Sin push.

### Fase 50 · Bloque F: los dos frenados, decididos; y el diagnóstico de escritorio

Antonio decide los dos que la Fase 49 frenó, y de paso pregunta algo que **ningún bloque había medido**:
¿`/estado` y `/sobre-los-datos` están *aprovechadas* en escritorio, o solo *no se rompen*?

**LAS TRES DECISIONES (dos eran de no hacer):**
- **#5 · el "← volver" NO se pone (opción c).** La auditoría F redescubrió **la ausencia** sin ver **la
  decisión**: ya estaba documentada y razonada en las DOS páginas —`parada:121` y, más completa,
  `linea:194-198`, que hasta cita el enlace compartido—. Se **revalida y se mantiene**: el guardián
  `flotacion.spec.ts` exige que el primer tiempo quepa sin scroll a 360, y una salida arriba lo empujaría;
  el logo ya da salida, y una miga tendría el MISMO problema físico. Se amplió el ⛔ de la parada (`8543e31`)
  para que no se vuelva a levantar. La línea ya lo explica de sobra; **no se toca** (se reporta).
- **#3 · `/estado` queda ENLAZADA pero INDEXABLE. No entra en el `disallow`.** ⚠️ Antonio **se corrige a sí
  mismo**: aprobó el `disallow` por analogía con `/parada`, sin recordar que `/estado` ya estaba en el
  sitemap **a propósito**. Y la analogía era floja: lo que caduca en `/parada` son **los minutos (15 s)**;
  el contenido de `/estado` (estado del feed, nº de líneas, vigencia) cambia despacio y **su valor es ser
  público**. Verificado en el servido: `robots.txt` **sin** `/estado` en `disallow`, y el sitemap **con**
  `/estado`. Cero cambios: robots, sitemap y `sitemap.test.ts` intactos.
- **El nombre "Estado del servicio" NO se toca.** Radio pequeño (title + h1 + una frase de error; ningún
  e2e), pero el nombre no está mal; cambiarlo por un matiz no compensa en un proyecto que se quiere dejar
  quieto. Queda como opinable.

**⭐ EL DIAGNÓSTICO DE ESCRITORIO (solo lectura, medido a 1280 y 1920, mirado como imagen):**
Medido el ancho del bloque de contenido más ancho dentro de `<main>`:

| Página | bloque más ancho | ¿aprovecha el ancho? |
|---|---|---|
| home · línea · parada | **1152 px** (rompen la columna) | Sí — diseñadas para escritorio |
| **/sobre-los-datos** | 640 px (columna de lectura) | **Correcto** — es prosa |
| **/estado** | 640 px (columna de lectura) | **NO** — es un panel de datos encajonado |

⭐ **La regla, y la calibración que evita el falso hallazgo:** *desaprovechar el ancho solo es un defecto
cuando el contenido lo pediría.* `/sobre-los-datos` es **prosa**, y una columna de ~640 px es la medida de
línea correcta: los márgenes vacíos en escritorio son el resultado natural y **bueno** de una página de
lectura. **No es hallazgo.** `/estado`, en cambio, es un **panel de 4 tarjetas** que a 1920 se ve como una
**isla de móvil centrada** (~640 px vacíos a cada lado) y **no se reorganiza** al ensanchar — mientras que
home, línea y parada **sí rompen** a 1152 px. Eso es lo significativo: **no es el ancho en sí, es la
incoherencia** —cuatro de cinco páginas usan un ancho adecuado a su contenido; `/estado` es la única en el
lado malo, y encima es la que más ganaría—. 🔵 severidad baja (funciona y se lee), **coste bajo** si se
arregla: el patrón de romper el ancho ya existe (`ml-[50%] w-[min(72rem,…)]` en la home) y las tarjetas ya
están en un grid. **NO se arregla aquí: es diagnóstico.** Queda para que Antonio decida.

tsc 0 · lint 0 · vitest **564/1 skip** (el cambio es un comentario). NO se tocó robots, sitemap,
`sitemap.test.ts`, el nombre de `/estado`, la línea, ni el ancho de ninguna página. Sin push.
