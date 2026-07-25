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
