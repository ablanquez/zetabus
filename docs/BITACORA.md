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
