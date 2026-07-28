# AUDITORÍA DE CIERRE · BLOQUE A — CÓDIGO

**Fecha:** 28/07/2026 · **Commit auditado:** `5ba78d4` · **Alcance:** todo el código ejecutable de `src/`, `scripts/` y la configuración con lógica.

> **Qué es esto.** El primero de seis bloques (A código · B interfaz/textos · C tests/guardianes · D documentación · E operación/datos · F experiencia) de la auditoría de puesta a punto antes de dejar ZetaBus quieto una temporada.
>
> **Qué NO es.** No es una tanda de arreglos: **no se ha tocado ni una línea de código**. Se descubre y se prioriza; decide Antonio qué entra y en qué orden.
>
> ⚠️ **REGISTRO HISTÓRICO FECHADO.** Describe el estado del repo en `5ba78d4`. **No se reescribe** si el código cambia después: si hace falta otra pasada, se hace otro fichero. (Misma regla que los históricos de `docs/auditoria/`.)
>
> **Nota de formato.** `docs/auditoria/` numera por FASE (`NN-tema.md`); esta auditoría de cierre es transversal, así que se nombra por BLOQUE (`A-codigo.md` … `F-experiencia.md`). Es deliberado: no continúa la serie de fases, es otra cosa.
>
> **Nota de `.gitignore`.** `docs/auditoriafinal/` **NO nace ignorado** (`docs/` está en la allowlist; `git check-ignore` sin match), a diferencia de lo que pasó con `CHANGELOG.md` y `SECURITY.md` en la raíz. No hace falta tocar el `.gitignore`.

---

## 1 · DECLARACIÓN DE COBERTURA

⚠️ La auditoría también puede mentir. Esto es lo que se miró **de verdad**, y lo que no.

**Inventario:** `src/` = **~80 ficheros `.ts/.tsx`** (excluidos los 4 de `src/generated/`, que son artefacto de build, no fuente); `scripts/` = **18 ficheros**; **config con lógica** = `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `package.json`.

**Método.** Cuatro barridos mecánicos en paralelo (grep símbolo-a-símbolo + lectura dirigida) sobre A1 código muerto, A2 duplicación/deps, A3+A8 tipos/seguridad, A4+A9 errores/fechas — **cada hallazgo verificado con evidencia fichero+línea**, y los hallazgos materiales **re-verificados a mano** por quien firma (regla «la auditoría también miente»: se cruzó cada agente). En paralelo, lectura humana directa de los ficheros-crux para A5 (patrones), A6 (estructura) y A7 (rendimiento), que piden juicio y no grep.

| | Cobertura |
|---|---|
| `src/` | **100 % barrido** (grep de 205 exports no triviales + patrones por todo el árbol). **~35 leídos a mano en detalle**: config (7), `core/{proceso,entities,index,observacion,contraste}`, `engine/{motor,llegadas,topologia,horario,desvios,fingir,grupos,paradas,correspondencias,barrido}`, `cache/dos-pisos`, `sources/avanza/{transporte}`, `migas`, las 4 páginas de ruta + `layout` + `robots`, `ChipLinea`, cabeceras de `LlegadasVivas`/`MapaParada`, y los parsers de Avanza (vía barrido detallado). |
| `scripts/` | **100 % barrido**; leídos a mano: `ensure-nombres`, `ensure-correspondencias`, `coords-solo-barrido`, `marco-movil`. |
| config | **100 % leído a mano.** |
| `src/generated/` | Artefacto de build. NO se audita como fuente (se declara así). |

**Lo que NO entra en este bloque (declarado, va en otros):**
- ⛔ `tests/` y `e2e/` → **bloque C**. (Se NOMBRAN cuando revelan código muerto, no se auditan.)
- ⛔ Textos de usuario, HTML semántico, accesibilidad, responsive → **bloque B**.
- ⛔ README, `docs/`, bitácora → **bloque D**.
- ⛔ Logs, variables de entorno, idempotencia de scripts → **bloque E**. (Sí se auditó la CALIDAD del código de los scripts.)

**Titular honesto:** el código está **notablemente limpio y defendido**. **Cero `any`, cero `@ts-ignore`, cero secretos cableados, cero `catch` que oculte un fallo, cero default que fabrique un silencio falso, un solo `dangerouslySetInnerHTML` (escapado y verificado).** El repo YA pasó por una poda (el caso `TTL_RECORRIDO_MS` se cerró ayer). Lo que sigue es deuda menor y afinado — **nada 🔴 que rompa o mienta en producción ahora mismo**.

---

## 2 · TABLA DE HALLAZGOS

Gravedad: 🔴 rompe o miente · 🟠 deuda real · 🔵 cosmético/opinable. Coste: trivial / acotado / tanda propia.

### 🔴 — Nada

No se encontró ningún hallazgo que rompa o mienta en producción hoy. Es un resultado, no una omisión: ver §1 cómo se comprobó.

### 🟠 — Deuda real

| # | Cat. | Fichero:línea | Qué es | Por qué importa | Coste | Producto |
|---|---|---|---|---|---|---|
| 1 | A9 | [`app/linea/[linea]/page.tsx:135`](../../src/app/linea/[linea]/page.tsx#L135) | `const hoy = new Date().toISOString().slice(0,10)` — **el día se calcula en UTC** y se usa como clave de caché del horario ([`horario.ts:67`](../../src/engine/horario.ts#L67)). | Entre medianoche de Madrid y las 01:00/02:00 la clave usa el día de **AYER**: la tabla rueda al día siguiente en horario UTC, no en `Europe/Madrid`. **Contradice la lección propia de [`feed-validity.ts`](../../src/core/feed-validity.ts)** (que sí resuelve el día civil en Madrid). El guardián `horas-malas` no lo caza (vive en `src/app/`, y es `toISOString`, no `toLocale*`). Impacto real bajo (a esas horas apenas hay servicio y el horario es casi estático), pero es un bug de corrección que el repo ya sabía evitar. | trivial (computar `hoy` en `Europe/Madrid`, reutilizando el helper de `feed-validity`) | no |
| 2 | A1d | [`scripts/marco-movil.mjs:34`](../../scripts/marco-movil.mjs#L34) | `import sharp from 'sharp'` — **usado pero NO declarado** en `package.json`. Funciona por transitiva (es `optionalDependency` de `next`). | El caso «peor» de dependencias. Al ser *optional* de Next, no está garantizado en toda plataforma: un `npm ci` en un runner sin ese binario dejaría el script roto **sin que `package.json` lo explique**. Es tooling (no runtime), por eso no es 🔴. | trivial (declararlo en `devDependencies`) | no |
| 3 | A2b | [`components/ChipLinea.tsx:67`](../../src/components/ChipLinea.tsx#L67) (+ `e2e/mapa.spec.ts:222`) | `export const AA = 4.5` **reteclado** cuando ya existe `AA_TEXTO = 4.5` en [`core/contraste.ts:93`](../../src/core/contraste.ts#L93) — y ChipLinea **ya importa** de ese módulo. | «La copia a mano», el patrón fundacional de `contraste.ts`: la constante buena está a un identificador de distancia en un import que ya existe, y aun así se reteclea el `4.5`. Hoy no divergen; el día que alguien mueva el umbral en un sitio y no en el otro, nada avisa. `contraste-una-sola-formula.test.ts` fija `AA_TEXTO===4.5` pero **no ata la `AA` de ChipLinea**. (Riesgo real bajo: 4.5 es constante del estándar WCAG.) | trivial (importar `AA_TEXTO`) | no |
| 4 | A1/A5 | [`core/index.ts:10`](../../src/core/index.ts#L10) y [`core/entities.ts:14`](../../src/core/entities.ts#L14) | Dos comentarios citan **`tests/core-agnostico.test.ts` como el guardián** que impide que `core/` importe de `sources/`. **Ese fichero NO existe.** El guardián real es `tranvia-sin-tocar-el-nucleo.test.ts` (bien citado en `proceso.ts:65` y `profiles.ts:13`). | Un comentario que nombra un guardián inexistente es un instrumento en verde sobre algo no comprobado: quien vaya a verificar la garantía busca un fichero fantasma y puede concluir que el guard falta. El guard SÍ existe, con otro nombre. | trivial (corregir los dos comentarios) | no |

### 🔵 — Cosmético / opinable

| # | Cat. | Fichero:línea | Qué es | Nota | Coste | Producto |
|---|---|---|---|---|---|---|
| 5 | A1e | [`core/entities.ts`](../../src/core/entities.ts) `:89 RouteDelta`, `:110 Vehicle`, `:121 Arrival`, `:139 Advisory` | **Cuatro interfaces del núcleo declaradas y consumidas en NINGÚN sitio** (grep en `src/` → solo su definición). Modelo declarado por adelantado (los comentarios citan «Tanda 3»). | Son TIPOS: coste de runtime **cero** (se borran al compilar). Es «declarado y nunca cableado» a nivel de tipo. **Decisión de producto:** ¿se retiran (superficie muerta en un repo público) o se conservan como modelo futuro a propósito? No la tomo. | trivial (borrarlas) | **SÍ** |
| 6 | A1c | [`sources/avanza/kml.ts`](../../src/sources/avanza/kml.ts) (módulo entero) | `comprobarKml`/`urlKml`/`BASE_KML`/`EstadoKml` no los importa nadie; `parsearKml`/`KmlIlegible` solo los mantiene vivo un test. **Módulo efectivamente muerto.** | **Cabo deliberado YA documentado** en `docs/auditoria/11` («CABO, no muerto»). No es un descuido. **Decisión de producto:** retirarlo o dejarlo parado. | acotado (retirar módulo + su test) | **SÍ** |
| 7 | A1a | `core/observacion.ts:69 tieneDatos`, `:73 edadDe`; `engine/barrido.ts:175 barridoEnCursoDesdeMs` | Exports de producción **sin llamador en `src/`**: solo los usa un test. | Categoría «código de producción que solo un test mantiene vivo». O son helpers legítimos para el arnés (aceptable), o superficie a recolocar. Bajo. | trivial | no |
| 8 | A9 | [`engine/desvios.ts:264`](../../src/engine/desvios.ts#L264) | Si **todos** los sentidos fallan al leerse, el sobre sale `estado:'ok', observadoEn:ahora, edadSegundos:0` — parece «recién observado» cuando no se observó nada. | Mitigado: cada `veredicto` individual es `indeterminado` con motivo (la pantalla sigue honesta por sentido). **Verificado que la página NO lee `edadSegundos`/`observadoEn` del sobre** → sin impacto de pantalla HOY (latente: mordería a un consumidor futuro que leyera la frescura global). | acotado (envolver en `indeterminado` global si todo falla) | no |
| 9 | A3 | [`engine/topologia.ts:61`](../../src/engine/topologia.ts#L61), `app/sobre-los-datos/page.tsx:63` | `artefacto as unknown as Artefacto` — doble aserción que **apaga el compilador** sobre el artefacto GTFS horneado; **sin guarda de forma en runtime**. | Es dato **propio** (build output), no de terceros; la forma la garantizan `build-data.ts` y los tests. Si el build produjera una forma distinta sin cambiar el tipo, no habría red en runtime (sí en tests). Es la aserción más fuerte del repo, pero de bajo riesgo. | acotado | no |
| 10 | A9 | `app/sobre-los-datos/page.tsx:113`, `scripts/coords-solo-barrido.ts:76` | Fechas sin `timeZone` explícito: `toLocaleDateString('es-ES')` (render en servidor, usa el huso del host) y `hoy()` con hora local (script). | Cosmético: al borde de medianoche pueden pintar el día ±1. Otros scripts (`paso.ts`, `campo.ts`, `canario.ts`) **sí** nombran `Europe/Madrid`; la incoherencia es la señal. | trivial | no |
| 11 | A3 | `cache/dos-pisos.ts:123,257,286`, `limitador.ts:139` | `JSON.parse(readFileSync(...)) as Entrada<T>` — relee **caché propia de disco** sin validar forma. | Riesgo bajo (fichero escrito por el propio proceso), mitigado por la **versión de forma en la clave** (`FORMA_HORARIO`). Una entrada corrupta o de versión vieja se serviría con forma incorrecta. Documentado en la cabecera de `dos-pisos.ts`. | acotado | no |
| 12 | A2/A5 | `engine/horario.ts:22`, `engine/desvios.ts`, `engine/barrido.ts:63` | El mapa `SENTIDO_AVANZA = { 0:-1, 1:-2 }` está **duplicado en tres ficheros**. | Calco deliberado con cross-referencia en comentarios («mismo mapeo que en `desvios.ts`»). 2 entradas; extraer un `@/engine/sentido-avanza` es opinable. | trivial | no |
| 13 | A5 | `engine/motor.ts:37` vs `:22` | `TTL_RECORRIDO_MS` se `export`a (para su contraprueba) pero `TTL_HORARIO_MS` no. Asimetría entre dos TTL hermanos. | Inofensivo; solo coherencia. | trivial | no |
| 14 | A3 | `tsconfig.json` | Falta `noUncheckedIndexedAccess` (y `exactOptionalPropertyTypes`). `strict:true` ya está. | Flag más estricto que cazaría accesos a índice que devuelven `undefined`. Activarlo hoy destaparía trabajo; opinable si compensa en un proyecto que cierra. | tanda propia | **SÍ** |

### Reportado por completitud (NO arreglar)

- **`ParQuePasa` duplicado** (`sources/avanza/correspondencias.ts:64` ≈ `engine/correspondencias.ts:74`): duplicación **deliberada y documentada** (`docs/auditoria/11 · A-D1`), con nota cruzada que obliga a tocarlas juntas. La frontera `sources/ ↔ engine/` es a propósito. No es defecto.

---

## 3 · LO QUE ESTÁ BIEN (y por qué merece repetirse)

Esto es material directo para el checklist maestro: patrones que en los siguientes proyectos hay que **conservar**.

1. **Los datos de terceros se VALIDAN en runtime, nunca se confían al tipo.** Todo lo de Avanza (`parse-poste`, `recorrido`, `horario`, `nombres`, adapters) castea a una forma `unknown` y valida campo a campo (`Number.isFinite`, guardas `typeof`/`in`, contadores de control cruzados que gritan ante contradicción). Un tipo no valida en ejecución, y aquí se sabe.
2. **Fallo cerrado consistente.** `null` = «no lo sé / no se pinta», jamás `?? 0` que fabrique un dato. Hay comentarios explícitos contra `?? 0` en coordenadas (`parse-poste`, `MapaParada`, `gtfs-nap/adapter`). Los `catch` devuelven estado degradado honesto, nunca tragan.
3. **Fuente única, vigilada por tests.** Dominio (`URL_SITIO`), marca (`NOMBRE_MARCA`), versión (`VERSION`→User-Agent), colores (con allowlist motivada para los hex que un asset no puede leer de CSS). Las pocas escrituras a mano están en el allowlist de un guardián (`sistema-visual`, `marca-z-unica`, `contraste-una-sola-formula`).
4. **Disciplina de bundle de cliente.** Ningún `'use client'` alcanza `@/generated` (1,9 MB de GTFS); `esBuho`/grupos viven en `grupos.ts` sin tocar la topología. Vigilado por `nada-de-gtfs-en-el-cliente.test.ts`.
5. **Estado por proceso, no por módulo** (`core/proceso.ts`): `globalThis` + `Symbol.for`, con la cicatriz medida (`/api/diag` contaba 0 peticiones mientras pedía). Es la vía que documenta Next.
6. **La caché como decisión de honestidad** (`dos-pisos.ts`): dos pisos, vuelo único, TTL 15 s razonado, **cero peticiones cuando nadie mira** (no hay `setInterval`), y **versión de forma en la clave** para que ampliar el tipo no sirva datos mancos en silencio.
7. **Fechas con zona explícita** (`feed-validity.ts`): día civil en `Europe/Madrid` vía `Intl`, reloj inyectable, DST-safe, con test de borde de medianoche. Es la referencia (y el hallazgo #1 es justo dónde se olvidó aplicarla).
8. **Errores tipados**: subclases (`IngestError`, `HorarioIlegible`, `PosteIlegible`…) para lo que se lanza; uniones discriminadas (`{estado, motivo}`) para lo blando. Cero `throw 'string'`.
9. **Config que no miente**: `playwright` contra producción con `reuseExistingServer:false` + `retries:0` + `ZETABUS_DEMO=1` (cada uno con su cicatriz documentada); `next.config` con cinco cabeceras, cada una con el daño concreto que evita; `tsconfig` en `strict`.
10. **Validación de entrada en la frontera**: `[poste]`/`[linea]`/`?sentido=`/`?fingir=` pasan por `unknown`→validación (`numeroDePoste`, lista cerrada, doble cerrojo `ZETABUS_DEMO`). Un poste basura → 404 **sin preguntar a Avanza**.

---

## 4 · RECOMENDACIÓN DE ORDEN

**Arreglaría primero (trivial + real), una tanda pequeña de «higiene»:**
1. **#4 test fantasma** — un comentario que miente sobre su guardián es lo más barato de arreglar y lo más caro de dejar (mina la confianza en TODO comentario de guard).
2. **#2 `sharp` sin declarar** — una línea en `devDependencies`; cierra una dependencia frágil.
3. **#3 `AA` reteclado** — importar `AA_TEXTO`; cierra la última «copia a mano» viva.
4. **#1 `hoy` en UTC** — corrección de fecha; el repo ya tiene el helper bueno.

Las cuatro son triviales, ninguna toca lógica de negocio, y las cuatro cierran una mentira o una deuda concreta. Cabrían en un solo commit atómico de «higiene de código» o en cuatro.

**Decisión de producto (no la tomo yo):** #5 (4 interfaces muertas) y #6 (módulo KML) — retirar superficie muerta de un repo público **o** conservarla como modelo/cabo a propósito. #14 (`noUncheckedIndexedAccess`) — endurecer tipos en un proyecto que cierra puede no compensar.

**NO tocaría** (el coste de tocar lo que funciona): los componentes grandes cohesivos (`LlegadasVivas` 770, `MapaParada` 760, `fingir` 468) — son grandes porque enumeran casos reales con su estado, no porque hagan cosas ajenas; partirlos dispersa la decisión y arriesga regresión sin beneficio claro. Y la duplicación **deliberada** (`ParQuePasa`, `SENTIDO_AVANZA`) ya tiene su nota cruzada.

---

## 5 · PARA EL CHECKLIST MAESTRO (genérico — vale para cualquier proyecto)

> Extraíble a un checklist reutilizable. Redactado sin nombres de ZetaBus.

**Código muerto**
- [ ] Cruzar CADA `export` no trivial contra grep en todo el repo. Distinguir cuatro clases: usado en producción · usado solo por tests (¿helper legítimo o producción que solo un test respira?) · usado solo por scripts de build (pipeline, no muerto) · huérfano.
- [ ] ⭐ **«Declarado y nunca cableado»**: constantes de config, flags, opciones de un objeto de opciones, parámetros ignorados en el cuerpo, **y tipos/interfaces** declarados por adelantado que nadie consume. Es código muerto que además insinúa una intención que no existe.
- [ ] Descartar explícitamente las convenciones del framework (exports mágicos) antes de declarar algo muerto. Ante uso dinámico/reflexión posible → NO CONSTA, no «muerto».

**La copia a mano (fuente única)**
- [ ] Todo valor que aparezca dos veces (color, dominio, umbral, versión, mapeo, formato de fecha, texto de estado) debe salir de UNA constante. Buscar la copia reteclada **junto a** un import que ya trae la buena.
- [ ] Un test de «este valor es UNO» solo vale si ata TODAS las copias, no solo la canónica.

**Tipos que no mienten**
- [ ] Cero `any`, cero `@ts-ignore`. Cada `as unknown as` y cada `!` justificado por una guarda cercana, no por pereza.
- [ ] ⭐ **Datos de terceros validados en runtime**, nunca `as TipoBonito` y a consumir. El tipo se comprueba en la frontera con guardas, no se asume.
- [ ] Modelar la incertidumbre en el tipo (`T | null`, uniones discriminadas), no con opcionales que siempre están.

**Fallo cerrado**
- [ ] Ante un fallo, estado seguro/honesto («no lo sé»), nunca un default que parezca dato. Cazar cada `?? 0`, `|| []`, `?? ''`: ¿el vacío es de verdad «no hay», o enmascara un fallo?
- [ ] `catch` que no relance o no degrade honestamente = sospechoso. Los `throw` con tipo, no `string`.
- [ ] Promesas: sin flotantes; `void promesa` solo si la promesa maneja su propio error dentro.

**Fechas / zonas**
- [ ] Un solo sitio resuelve el «día civil» en la zona correcta (`Intl`, no el huso del host). Prohibir `toISOString().slice(0,10)` como «hoy» de negocio.
- [ ] Edades y «hace X» con reloj monótono, sin mezclar reloj de servidor y de cliente.
- [ ] Casos de borde: medianoche, DST, fin de año, bisiesto — y un test que los fije.

**Seguridad estructural**
- [ ] Inventariar cada `dangerouslySetInnerHTML`/`innerHTML` con su escape. Datos de terceros al DOM solo como children de React (escapados).
- [ ] Entradas (rutas, query, buscador) validadas en la frontera; un valor absurdo cae cerrado.
- [ ] Cero secretos en fuente; nada de servidor que llegue al bundle de cliente (vigilado por test del grafo de imports).

**Estructura (con contrapeso)**
- [ ] Señalar funciones que hacen demasiado y patrones repetidos sin extraer — **y también** dónde agrupar sería PEOR (abstracción prematura, unir dos cosas que solo se parecen hoy). No refactorizar por refactorizar.

**Meta (la auditoría también miente)**
- [ ] Declarar cobertura: total / revisado / no revisado y por qué. Un «todo bien» sin decir qué se miró es un verde sobre algo no comprobado.
- [ ] Lo incierto es NO CONSTA, no «limpio». Cruzar los hallazgos de cualquier barrido automático con verificación a mano.
