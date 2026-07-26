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
