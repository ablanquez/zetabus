# VERIFICACIÓN · BLOQUE A — CÓDIGO

**Fecha:** 28/07/2026 · **Commit verificado:** `5a55610` · **Verifica contra:** [`A-codigo.md`](./A-codigo.md) @ `5ba78d4` · **ahead:** 18 sobre `origin/main`.

> **Qué es esto.** La pasada de verificación del Bloque A: comprobar, **con evidencia re-corrida sobre el árbol actual**, que lo que se arregló está cerrado, que los arreglos no introdujeron nada nuevo, y que los barridos mecánicos siguen limpios.
>
> ⚠️ **La verificación la hace quien hizo los arreglos.** Es el auditor auditándose. Por eso NO vale «lo arreglé, está bien»: cada estado se comprueba **ahora** (el grep vuelve vacío, la línea nueva está, el fichero existe), no «lo cambié en el commit X».
>
> ⚠️ **REGISTRO HISTÓRICO FECHADO.** Describe el estado en `5a55610`. No se reescribe. Y **NO reescribe `A-codigo.md`** (histórico de `5ba78d4`): es otro fichero, como manda la regla.

---

## 1 · VEREDICTO

**El Bloque A está cerrado de verdad.** Los 6 hallazgos accionables (los 4 🟠 + #5 + #8) están **CERRADOS con evidencia re-corrida**; el guardián fantasma que faltaba (`desvios-no-miran-lo-vivo`) **existe y vigila**; los 8 restantes están **DEJADOS A PROPÓSITO** según la decisión registrada. **Suite completa verde.** Un consumidor de `desviosDeLinea` que la costura señaló como riesgo (`campo.ts`) **ya estaba blindado** y ahora se comporta mejor. **Una discrepancia con el informe** (no un defecto nuevo): el #9 contaba 2 `as unknown as` y hay 3 — el tercero es **preexistente** (fichero no tocado por estas tandas). Ver §4.

**Suite (re-corrida sobre `5a55610`):** `tsc` **0 errores** · `vitest` **565 pasan** (1 skip, 47 ficheros) · `eslint` **0 errores** (3 warnings previos) · `playwright` **831 pasan** (94 skip). Guardián `desvios-no-miran-lo-vivo` **3/3**.

---

## 2 · LOS 14 HALLAZGOS, UNO A UNO

Estado: **CERRADO** (con evidencia del estado ACTUAL) · **DEJADO** (decisión registrada) · **NO CONSTA**.

| # | Cat | Estado | Evidencia re-corrida (árbol en `5a55610`) |
|---|---|---|---|
| **1** | A9 | ✅ CERRADO | `page.tsx:146` → `const hoy = diaCivil(new Date())`; import en `:21`. **Cero** `toISOString().slice(0,10)` como «hoy». |
| **2** | A1d | ✅ CERRADO | `package.json:55` → `"sharp": "^0.34.5"`. Barrido de deps: los 8 imports externos declarados, **ninguno sin declarar**. |
| **3** | A2b | ✅ CERRADO | `ChipLinea.tsx:6` importa `AA_TEXTO`; `:106` → `if (suyo >= AA_TEXTO)`. **No existe** `export const AA`. Único `4.5` en todo `src/`: un comentario en `ChipLinea.tsx:44` (prosa, no umbral). |
| **4** | A1/A5 | ✅ CERRADO | `grep core-agnostico` en `src`+`tests`+`e2e` → **VACÍO**. `index.ts:10` y `entities.ts:13` citan `tranvia-sin-tocar-el-nucleo.test.ts` (existe). |
| **5** | A1e | ✅ CERRADO | `grep \b(RouteDelta\|Vehicle\|Arrival\|Advisory)\b` en `src` → **VACÍO**. Imports de `entities.ts` sin huérfanos (`VehicleId`/`VehicleProfile` retirados de ahí; siguen exportados por `ids.ts`/`profiles.ts` y usados por `llegadas.ts`/`adapter.ts`). |
| **6** | A1c | ⏸️ DEJADO | `src/sources/avanza/kml.ts` **existe, sin commits desde `5ba78d4`**. Cabo deliberado (decisión de producto, `docs/auditoria/11`). |
| **7** | A1a | ⏸️ DEJADO | `observacion.ts` y `barrido.ts` **sin commits desde `5ba78d4`** → `tieneDatos`/`edadDe`/`barridoEnCursoDesdeMs` en el mismo estado que el informe. 🔵, sin decisión pendiente. |
| **8** | A9 | ✅ CERRADO | `desvios.ts:271` → `if (resultados.length > 0 && observadoEn === null)` → `estado: 'caido'`. Contraprueba: test «todos fallan → caido» (rojo demostrado con el código viejo); caso parcial fijado; e2e con la caja visible (rojo demostrado en 5 viewports). |
| **9** | A3 | ⏸️ DEJADO | `as unknown as` sigue en `topologia.ts:61` y `sobre-los-datos:63`. ⚠️ **Y un tercero preexistente** en `adapter.ts:156` que el informe no listó — ver §4. Riesgo bajo (dato propio), como razonó el informe. |
| **10** | A9 | ✅ CERRADO | `sobre-los-datos:113` → `toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })`. `coords-solo-barrido.ts:84` → `return diaCivil(new Date())`. **Barrido re-corrido:** ningún otro `toLocale*` sin `timeZone` (el único hit es un comentario en `feed-validity.ts:46`), ningún `new Date().getFullYear/Month/Date` como «hoy». |
| **11** | A3 | ⏸️ DEJADO | `dos-pisos.ts` **sin commits desde `5ba78d4`**. Relee caché propia; mitigado por versión-de-forma en la clave. |
| **12** | A2/A5 | ⏸️ DEJADO | `SENTIDO_AVANZA = { 0: -1, 1: -2 }` en `barrido.ts:63`, `desvios.ts:201`, `horario.ts:22`. Calco deliberado con nota cruzada. |
| **13** | A5 | ⏸️ DEJADO | `motor.ts:37` `export const TTL_RECORRIDO_MS`; `:22` `const TTL_HORARIO_MS` (sin export). Asimetría inofensiva. |
| **14** | A3 | ⏸️ DEJADO | `grep noUncheckedIndexedAccess tsconfig.json` → **ausente**, como se dejó (decisión de producto). |
| *rep.* | — | ⏸️ DEJADO | `ParQuePasa` duplicado: no arreglar (duplicación deliberada con nota cruzada). No tocado. |
| **+guardián** | C | ✅ CERRADO | `tests/desvios-no-miran-lo-vivo.test.ts` **existe** y pasa **3/3** (el que el comentario de `desvios.ts:57` prometía y nunca existió). |

---

## 3 · BARRIDOS MECÁNICOS, RE-CORRIDOS

Sobre el árbol en `5a55610`, comparado con el informe:

- **`any` / `@ts-ignore` / `@ts-nocheck`** en `src`: **CERO** (igual que el informe).
- **`as unknown as`**: **3** — `topologia.ts:61`, `sobre-los-datos:63` (los dos del #9) **+ `adapter.ts:156`** (preexistente, no listado en el informe; ver §4).
- **`dangerouslySetInnerHTML`**: **1** — `page.tsx:165` (`migasJsonLd`, el breadcrumb JSON-LD, escapado). Igual que el informe.
- **Secretos cableados**: **ninguno** (`NAP_API_KEY`/`ZETABUS_REGEN_TOKEN`/api-keys literales → vacío).
- **`catch` vacío que trague**: **ninguno** (el único hit es prosa en un comentario de `LlegadasVivas.tsx:18` que advierte CONTRA ello).
- **Defaults `?? 0` / `|| []` / `?? ''`**: todos son o avisos-contra (comentarios en `MapaParada`, `fingir`, `parse-poste`) o defaults de parseo legítimos (`?? ''` al leer query/atributos; `?? 0` en un acumulador de conteo `salidas.ts:76`). **Ninguno enmascara un fallo como dato.**
- **Fechas**: `toLocale*` sin `timeZone` → **cero en código** (solo un comentario). `new Date()` local como «hoy» de negocio → **cero**.
- **Deps usadas sin declarar**: **ninguna** (los 8 externos declarados; `sharp` ya está).
- **Copias del umbral de contraste**: **ninguna** (`4.5` como umbral vive solo en `core/contraste`; nadie reteclea).
- ⭐ **Citas a tests/guardianes en comentarios de `src/`**: **las 12 resuelven a un fichero existente** (0 fantasmas). Antes: 11 resolvían y 1 no (`desvios-no-miran-lo-vivo`, ya creada).

---

## 4 · ZONAS TOCADAS + HALLAZGOS

**Ficheros tocados por el Bloque A** (`git diff --name-only 5ba78d4..HEAD -- src scripts`): exactamente 8 —
`coords-solo-barrido.ts`, `linea/[linea]/page.tsx`, `sobre-los-datos/page.tsx`, `ChipLinea.tsx`,
`entities.ts`, `feed-validity.ts`, `index.ts`, `desvios.ts`— y ninguno más. Cada uno corresponde a un arreglo; nada colateral.

**`core/entities.ts` (−70 líneas):** imports = `{ Hex, LatLon, LineId, Mode, StopId }` + `{ Provenance, ProcedenciaDelNombre }`, **todos usados** por las 4 interfaces que quedan (`Stop`, `Line`, `RouteShape`, `Direction`). **Sin huérfanos** (confirmado además por `eslint` 0 errores). Ningún comentario cuelga hablando de lo retirado.

**`feed-validity.ts` + `diaCivil`:** **una sola** `Intl.DateTimeFormat` en todo `src/` (`:53`). Consumidores de la fuente única: `page.tsx:146` y `coords-solo-barrido.ts:84`. **No hay una segunda forma** de resolver el día.

**`desvios.ts` + `page.tsx` (el camino `caido`):** revisados **TODOS** los consumidores de `desviosDeLinea` —
- `page.tsx:116`: mapea `caido → veredicto indeterminado` (con su motivo). ✔
- **`scripts/campo.ts:137`**: ⭐ **ya hacía `if (r.estado !== 'ok') { log(estado + motivo); continue; }`** — con `caido` imprime «línea X: caido — motivo» y sigue. **NO rompe en silencio; es más honesto que antes.** ✔ (Era el riesgo que señaló la costura: despejado.)
- `motor.ts`: solo lo menciona en un comentario. Tests: `motor.test.ts` (los nuevos lo cubren) y `pantalla-no-miente.test.ts` (regex sobre el código fuente, no runtime). Ninguno asume `ok` a ciegas.

**`ChipLinea.tsx` + `contraste.ts`:** sin copia del umbral (§3).

**`package.json`:** árbol coherente; `sharp` declarado; sin deps sin usar detectadas en el barrido.

**`tests/desvios-no-miran-lo-vivo.test.ts`:** re-corrido **3/3**, incluida su contraprueba interna (el rastreador encuentra el camino desde un fichero que sí llega al canal vivo).

### HALLAZGOS NUEVOS / DISCREPANCIAS (no arreglados — se deciden aparte)

- 🔵 **`as unknown as` en `src/sources/flota-zetabus/adapter.ts:156`** — `(v as unknown as Record<string, unknown>)[campo]`. **El informe #9 listaba 2, hay 3.** **NO es un defecto nuevo de estas tandas:** `adapter.ts` **no tiene commits desde `5ba78d4`** (preexistente). Es una **imprecisión de recuento del informe original**, misma categoría y riesgo que el #9 (dato propio, no de terceros). Se reporta por completitud; no se toca (histórico no se reescribe).

**Nada más.** Ningún arreglo introdujo un problema nuevo; ningún hallazgo dado por cerrado quedó abierto.

---

## 5 · MÉTODO

Todo lo de §2–§4 es **estado actual comprobado ahora**, no «lo cambié en el commit X». Cada `✅` viene de un grep que vuelve vacío / una línea que está / un fichero que existe, re-corrido sobre `5a55610`. Los `⏸️ DEJADO` se confirman por **ausencia de commits desde `5ba78d4`** en su fichero (estado idéntico al informe) o por su presencia esperada. Suite completa re-ejecutada, no heredada. Escepticismo activo: se buscó el consumidor que rompería (`campo.ts`) y el recuento que no cuadra (`as unknown as`), y se dice lo que se encontró.
