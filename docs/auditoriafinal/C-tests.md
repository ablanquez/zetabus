# AUDITORÍA DE CIERRE · BLOQUE C — TESTS Y GUARDIANES

**Fecha:** 28/07/2026 · **Commit auditado:** `8dd350e` · **Alcance:** `tests/` (47 ficheros vitest), `e2e/` (36 ficheros + `auditoria/` + `lib/`), dobles/fixtures, y la config de test (`vitest.config.ts`, `playwright.config.ts`, scripts `pretest`/`test`/`posttest`).

> **Qué es esto.** El segundo de seis bloques (A código ✅ · **C tests** · B · D · E · F) de la auditoría de cierre. Se destila hacia un **checklist maestro reutilizable** (§6).
>
> **Qué NO es.** No es una tanda de arreglos: **no se ha tocado ni un test.** La única escritura es este informe. Las mutaciones se hicieron y **se restauraron** (árbol limpio, verificado con `git status`).
>
> ⚠️ **REGISTRO HISTÓRICO FECHADO.** Describe el estado en `8dd350e`. No se reescribe.
>
> ⭐⭐⭐ **LA REGLA DE ESTE BLOQUE:** *un test verde no prueba nada por estar verde.* La única prueba de que un test vigila algo es verlo **ROJO** al romper lo vigilado. Por eso esto se auditó **rompiendo** (mutación), no solo leyendo.

---

## 1 · DECLARACIÓN DE COBERTURA

⚠️ La auditoría también miente. Esto es lo que se comprobó, y cómo.

**Inventario.** `tests/`: **47 ficheros vitest**, ~**565 tests** (la suite corre 565 + 1 skip). `e2e/`: **36 ficheros** `.spec.ts` (~166 tests únicos × 5 viewports = 831), más `e2e/auditoria/` (4, opt-in), `e2e/lib/` (`medir.ts`, `banco.ts`). Config: 2 ficheros + 3 scripts npm.

**Lectura.** **Los 47 vitest y los 36 e2e, leídos** (los 14 de `motor-vivo/`, los 30 de la raíz, los 36 e2e + `auditoria/` + `lib/` + `fingir.ts`, en tres barridos dirigidos; los guardianes-crux —ttl-recorrido, contraste, tranvia, nada-de-gtfs, desvios-no-miran, uno-por-proceso, readme-no-miente, horario-forma-cache— leídos a fondo a mano por quien firma). Config leída entera.

**MUTACIONES (lo que de verdad prueba este bloque).** Se rompió lo que 8 tests/guardianes dicen proteger y se midió el resultado. **Tres resultados: CAZADO / ESCAPADO / NO PROBADA.**

| # | Guardián / test | Mutación aplicada | Resultado |
|---|---|---|---|
| 1 | `ttl-recorrido` | descablear `TTL_RECORRIDO_MS` de `motorRecorrido` (`motor.ts:169`) | ✅ **CAZADO** (`expected 15 to be 3600`) |
| 2 | `tranvia-sin-tocar-el-nucleo` | meter `import '@/sources/...'` en el núcleo | ✅ **CAZADO** (offender: importa de sources/) |
| 3 | `uno-por-proceso` | `Symbol.for` → `Symbol` en `proceso.ts` (deja de ser registro global) | ✅ **CAZADO** (4 fallos: contador/caché no cruzan) |
| 4 | `horario-forma-cache` | quitar `f${FORMA_HORARIO}` de la clave (`horario.ts:67`) | ✅ **CAZADO** (la entrada vieja se sirve) |
| 5 | `contraste-una-sola-formula` | `ChipLinea.contraste` **divergente** (`×1.05`) | ✅ **CAZADO** (`3.355 ≠ 3.195`) |
| 6 | `contraste-una-sola-formula` | `ChipLinea.contraste` **copia CORRECTA** reescrita a mano | 🟠 **ESCAPADO** (9 verdes) — ver F4 |
| 7 | `nada-de-gtfs-en-el-cliente` | `import '@/generated';` (efecto lateral, sin `from`) en un `'use client'` | 🟠 **ESCAPADO** — ver F3 |
| 7c | (control del 7) | `import _g from '@/generated'` (con `from`) | ✅ **CAZADO** (arrastra el GTFS) — confirma que el hueco es el `import` sin `from` |

Verificados CAZADO en tandas anteriores (con su rojo mostrado): `dia-civil`, `fechas-en-zaragoza`, `desvios-no-miran-lo-vivo`. `readme-no-miente` trae su **propia** contraprueba de mutación interna (líneas 511-528: caza una cifra plantada y una frase reescrita) — auto-verificado.

**NO CONSTA (no mutados, leídos como sólidos pero sin ver el rojo):** `sistema-visual`, `marca-z-unica`, `sitemap`, `migas-no-miente`, `cita-guardian`, `coords-propagacion`, `regeneracion-cerrada`, y los unitarios de `motor-vivo/` no-guardián. La lectura los da por fuertes (contrapruebas incorporadas, sanity anti-vacío), pero **no se ha visto su rojo**. Si se quiere certeza, se mutan.

**Titular honesto.** El conjunto es **inusualmente riguroso**: el patrón dominante es comportamiento medido con reloj/transporte inyectado + contraprueba (rojo antes de verde) + sanity anti-verde-en-vacío. Los hallazgos no son «tests malos»: son **huecos concretos** en guardianes por lo demás buenos, y un puñado de tests-informe que corren en la suite por defecto sin aserción.

---

## 2 · TABLA DE HALLAZGOS

Gravedad: 🔴 el test no vigila algo crítico (o un guardián que no se pone rojo) · 🟠 deuda real · 🔵 cosmético/fragilidad. **(M)** = verificado por mutación · **(L)** = por lectura/estructura.

### 🔴 — Tests que corren y no pueden fallar

| # | Cat | Fichero:línea | Qué es | Por qué importa | Coste |
|---|---|---|---|---|---|
| **F1** | C1e | [`e2e/barrido-fino-2.spec.ts:69-100`](../../e2e/barrido-fino-2.spec.ts#L69) **(M)** | El test «EL SUELO TÁCTIL son 44» recorre 3 viewports × 3 URLs, acumula en `flojos[]` cada zona táctil < 44 px, y termina en **`console.log` — CERO `expect` sobre `flojos`**. Verificado: los 8 `expect` del fichero están en OTROS tests. | **No puede fallar nunca**, y corre en `npm run visual` (suite por defecto). Su propia razón de ser —«el suelo táctil son 44»— queda sin vigilar: mide las infracciones y las tira a la consola. Es exactamente el patrón que el resto del repo persigue. | trivial (`expect([...new Set(flojos)]).toEqual([])`) |
| **F2** | C1e/C1c | [`e2e/barrido-fino.spec.ts:78-103`](../../e2e/barrido-fino.spec.ts#L78), [`barrido-total.spec.ts:207`](../../e2e/barrido-total.spec.ts#L207) **(M)** | Los barridos de geometría escriben los hallazgos (desbordes/truncados/táctiles) a `e2e/.barrido/*.json` y **no assertan sobre ellos**. Verificado por grep: **NADIE lee esos JSON de salida** (solo se lee `urls-barrido.json`, la lista de ENTRADA). | El «veredicto de las ~2.024 cargas» depende de que un humano lea el JSON. Es un **informe, no un test**. `barrido-fino` corre por defecto; `barrido-total` es opt-in (`BARRIDO=1`) con contraprueba — menos grave, pero el agregador que cierra el lazo **no existe**. | acotado (script agregador que asserte `0 hallazgos`) |

### 🟠 — Guardianes que protegen menos de lo que dicen · dependencias de entorno

| # | Cat | Fichero:línea | Qué es | Por qué importa | Coste |
|---|---|---|---|---|---|
| **F3** | C4c/C1 | [`nada-de-gtfs-en-el-cliente.test.ts:73`](../../tests/nada-de-gtfs-en-el-cliente.test.ts#L73) **+** [`desvios-no-miran-lo-vivo.test.ts:74`](../../tests/desvios-no-miran-lo-vivo.test.ts#L74) **(M)** | El regex de `importaciones()` exige `\bfrom\b`, así que un **import de efecto lateral** (`import '@/generated';`, sin `from`) **evade el BFS**. CAZADO con `from`, ESCAPADO sin él. El mismo regex está **copiado en los dos** guardianes de grafo (el segundo lo construí yo en el Bloque A). | Los dos guardianes de import prometen «ningún camino alcanza X». Un `import '@/engine/topologia';` de efecto lateral en un `'use client'` arrastraría 1,9 MB **sin ponerse rojo**; y `desvios` podría tocar el canal vivo por la misma vía. Riesgo real BAJO (nadie importa un módulo de datos por efecto lateral), pero es un hueco en dos guardianes críticos, y **compartido**. | trivial (aceptar `import '…'` sin `from` en el regex) |
| **F4** | C4d | [`contraste-una-sola-formula.test.ts:28-30, 104-118`](../../tests/contraste-una-sola-formula.test.ts#L104) **(M)** | La cabecera promete: *«si alguien vuelve a escribir la fórmula a mano en un componente, esto se pone rojo»*. **FALSO:** el cruce (líneas 110-113) compara `ChipLinea.contraste` con el núcleo **por valor numérico** (`toBeCloseTo(…,12)`). Mutación: una copia **divergente** → CAZADO; una copia **CORRECTA reescrita a mano** → **ESCAPADO (9 verdes)**. Además solo importa `ChipLinea` (línea 34): las otras copias históricas (`e2e/lib/medir.ts`, `e2e/sentido.spec.ts`) **no se atan** —hoy están bien por disciplina, no por el guardián—. Línea 118 `expect(AA_TEXTO).toBe(4.5)` es C1b (declara la constante, no ata consumidores). | «Una sola fórmula» no está garantizada: está garantizado «todos dan el mismo número HOY». Una copia correcta hoy es la copia divergente de mañana (se edita una y no la otra) — que es **el bug original de este fichero**, el que se cazó *contando `0.03928`* a mano y que «ninguna prueba automática podía ver». Sigue sin poder verla. | acotado (grep de la fórmula sobre `src/`+`e2e/`, como el conteo que cazó el bug) |
| **F5** | C3b | [`tranvia-sin-tocar-el-nucleo.test.ts:17`](../../tests/tranvia-sin-tocar-el-nucleo.test.ts#L17) **(L)** | `readGtfsZip('data/gtfs/zaragoza-gtfs.zip')` **a nivel de módulo**. El zip está **gitignored** (no viaja en el repo). En un clon limpio/CI sin `gtfs:fetch`, el fichero **lanza al importar** y el test entero **errora** — NO se salta (a diferencia de `readme-no-miente`, que sí usa `it.skipIf`). | Es **la clase de fallo que acaba de morder en el Bloque A**: un test cuyo verde depende de que alguien haya bajado un artefacto antes. En el servidor (clon limpio) no probaría el modelo agnóstico: reventaría. | trivial (`describe.skipIf(!existsSync(zip))`) |
| **F6** | C3b | [`readme-no-miente.test.ts:461-476`](../../tests/readme-no-miente.test.ts#L461) **(L)** | La contraprueba «lo que existe en disco pero no en el repo es rojo» **exige** en disco `capturas/zetabus/ZOOM-14-poste47.png` (gitignored, se regenera con `npm run visual`) y **lanza** si no está (línea 468). El resto del fichero sí usa `it.skipIf` (`gtfsMb`, línea 483); esta contraprueba no. | En un checkout que no haya corrido `npm run visual`, este test **falla** por entorno, no por defecto. Un guardián que da falso rojo enseña a no mirarlo. | trivial (`it.skipIf(!existsSync(ignorado))`) |
| **F7** | C3b/C5d | e2e de vista de línea **sin `?fingir=`**: [`sentido.spec.ts:57,84,126,140,151`](../../e2e/sentido.spec.ts#L57), `recorrido-y-terminal:41,98,127`, `interaccion:139,169`, `revision:219`, `acuse-de-toque:127`, `rutas-basura:112` **(L)** | Navegan `/linea/N` o `/parada/744` **sin fingir** → la detección de desvío / las llegadas llaman a **Avanza REAL** (`get_stops_list`). Sus aserciones son sobre contenido derivado del GTFS, así que **pasan con Avanza arriba o abajo**. | Hacen **peticiones reales** a un tercero en cada corrida (con `networkidle` → candidatas a lentitud/flake), y **no aportan nada** que `?fingir=caido` no diera igual — incoherente con las ~10 specs cuyo encabezado presume de no tocar Avanza. Es el «verde que pasa igual con y sin lo que dice probar». | trivial (añadir `?fingir=`) |
| **F8** | C1e | [`motor.test.ts:234, 360, 385`](../../tests/motor-vivo/motor.test.ts#L234) **(L)** | Aserciones dentro de `if (r.estado==='ok')` / `if (v.tipo==='comparado')` **sin** un `expect(...).toBe(...)` de guarda antes (a diferencia de casi todos los demás tests del fichero, que sí lo llevan). | Si el estado/tipo no fuera el esperado, las aserciones se saltan y el test pasa en **verde vacío**. Tres casos, en el fichero más grande del repo. | trivial (añadir el `expect` de guarda) |
| **F9** | C1e | [`horas-malas.test.ts:113, 195`](../../tests/motor-vivo/horas-malas.test.ts#L113) **(L)** | Dos tests cuyo cuerpo es prosa + `expect(true).toBe(true)`. El comentario lo admite («el test es el comentario»). | Literalmente no prueban nada; ocupan un hueco en la suite con un verde de relleno. | trivial (quitar o convertir en aserción) |

### 🔵 — Fragilidad / estructural / cosmético

| # | Cat | Fichero:línea | Qué es | Nota | Coste |
|---|---|---|---|---|---|
| **F10** | C1e | `deriva.test.ts:87` **(L)** | `if (!real) return;` puede dejar el test sin aserciones si ninguna captura trae buses. | Reconocido en el comentario; el `describe` ya se salta sin capturas (`:44`). Bajo. | trivial |
| **F11** | C4c | `coords-solo-barrido:41,69` (`.toBe(9)` + lista de 9), `paradas-frontera:18` (`NUEVE`), `romperlo:254-285` (coches/confianza reales), `lineas-que-pasan:78` (relaciones poste↔línea del GTFS), `procedencia-de-la-flota` (403/350/36) **(L)** | Candados sobre datos reales: en cuanto el dato cambie (un 10º poste, un bus nuevo en el maestro) → **falso rojo** sin que haya bug. `romperlo` ya se puso rojo una vez por esto (comentario `:278`). | Coste asumido a propósito en varios; señalado por si se prefiere un suelo (`>0`) al candado exacto. | trivial c/u |
| **F12** | C4c | `readme-no-miente:149,156` (`/(\d+) líneas/g`, `/(\d+) paradas/g`) **(L)** | El patrón global asume que **toda** aparición de «N líneas/paradas» es el total de la red. Hoy cierto (44/934). | El día que la prosa diga «las 18 líneas diurnas» → falso rojo contra un README verídico. Latente. | trivial (anclar el patrón) |
| **F13** | C1f | `pantalla-no-miente.test.ts` (mayoría: `:35-53, 58-79, 243-307`), `tailwind-solo-src.test.ts` (todo) **(L)** | Vigilan la **forma del código fuente** por regex (que un fichero *contenga* `performance.now()` y no `Date.now()`, que no haya `truncate`…), no el comportamiento en runtime. La extracción del `catch` (`pantalla:86-90`) **depende de 4 espacios de indentación**. | Evadibles por aliasing (`obj['getHours']()`) y frágiles ante un reformateo (falso rojo). Los propios ficheros lo admiten. Aceptable donde el runtime solo se ve en build, pero **no son lo que aparentan**. | acotado (donde se pueda, medir runtime) |
| **F14** | C1f | `horas-malas.test.ts:49-63, 179-184` **(L)** | Guards por grep de fuente (`.getHours(`, `/calendar\|festivo/`) — atan «el motor no mira el reloj local» por coincidencia de texto. | Un alias evade el regex sin ponerse rojo. Protege menos de lo que aparenta. | acotado |
| **F15** | C1b/sobre-especif. | `cache.test.ts:203-205` (`toBe(8_300)`), `ttl-recorrido` (cableado por lectura de propiedad, no por medición del caché de `motorRecorrido()`), `motor.test.ts:110-121` (reloj real para el timeout) **(L)** | Números mágicos exactos y una dependencia de reloj de pared. | Todos **atenuados**: el `8_300` se computa de constantes reales; el TTL tiene el `.not.toBe` de la línea 108; el timeout es difícil de inyectar. Bajo. | trivial |
| **F16** | C5 | `e2e/auditoria/referencia.spec.ts:29` (`:3100` vs `:3002` del resto) **(L)** | Drift de puerto entre specs de la carpeta `auditoria/`. Y `npm run auditoria` usa `--grep-invert=NUNCA`, pero **no existe ningún test titulado «NUNCA»** → hoy es un no-op (guarda para el futuro). | `auditoria/` es opt-in (excluida de la suite por `testIgnore`), así que impacto bajo. | trivial |

### Reportado por completitud (no es defecto)
- **`e2e/auditoria/`** (comparadas, diseccion, jugar, referencia): **informan, no afirman** (`expect(true).toBe(true)`), pero son **opt-in** (excluidos por `playwright.config.ts:63 testIgnore`, se lanzan con `npm run auditoria`). Abren la **app de referencia viva** (no una imagen guardada) y se **saltan solos** si el server no responde. La comparación píxel se retiró el 23/07 (documentado). No es un test roto: es un instrumento manual.
- **`momento-oro.spec.ts`**: generador de PNGs que corre ×5 en la suite por defecto, pero sus asserts (`:29,34,35`) **sí** son de contenido real. Trabajo de captura, no test débil.

---

## 3 · LO QUE ESTÁ BIEN (y por qué repetirlo)

Material directo para el maestro. Patrones a conservar:

1. **La contraprueba incorporada (rojo antes de verde), dentro del propio test.** `ttl-recorrido` (mide el «antes» del bug con el TTL viejo), `readme-no-miente` (planta una cifra falsa y exige cazarla), `contraste` (mide el daño de la fórmula ingenua con su número), `instrumento.spec` (rompe el mock de 6 formas y exige que cada detector cace su defecto). Un test que trae su propio rojo demuestra que sabe ponerse rojo.
2. **Medir el CABLEADO, no la constante.** `ttl-recorrido` lee el TTL de la instancia REAL que entrega `motorRecorrido()`, con reloj inyectado — no `expect(CONSTANTE).toBe(...)`. Es la respuesta exacta al bug del TTL declarado-y-no-cableado.
3. **Reproducir la FORMA de un fallo que no cabe en el test.** `uno-por-proceso` recrea «dos grafos de módulos» con `vi.resetModules()` + doble `import()`, y exige identidad de objeto y que el contador **suba** (contra el «cero plausible»).
4. **Sanity anti-verde-en-vacío.** Casi todos los guardianes de barrido comprueban primero que **encontraron algo que vigilar** (`>40 líneas`, `>=5 componentes cliente`, «el fixture tiene centinelas»). Sin esto, mover un fichero deja el guardián verde sobre cero comprobaciones.
5. **Conciencia de entorno hecha BIEN.** `fechas-en-zaragoza` fija `process.env.TZ='America/New_York'` **a propósito**, porque el host va en Madrid y si no, no cazaría la regresión a getters locales. Restaura en `afterEach`. Es la cara buena del C3b.
6. **Fallo cerrado probado.** `regeneracion-cerrada` (sin token → 503 y **cero** programado, con un doble de `after` que apunta en vez de ejecutar), `panel-estado` (ataca los estados «no lo sé»: rancio, degradado, ilegible, futuro).
7. **El instrumento se prueba a sí mismo.** `instrumento.spec` + `e2e/lib/medir.ts` miden el **píxel**, no el CSS, y `medir` lleva las cicatrices de sus propios falsos positivos. La credibilidad de toda la geometría e2e cuelga de aquí.
8. **Config que no miente.** `playwright`: `reuseExistingServer:false` + `retries:0` + `ZETABUS_DEMO=1`, contra un build de producción, cada flag con su cicatriz. `pretest:lint` + `posttest:vigía`.
9. **Declarar el techo.** `readme-no-miente` enumera en un test lo que **NO** puede verificar (la prosa sin número) y por qué; `cita-guardian` dice qué renders no cubre y a quién los delega. Un guardián que dice lo que no cubre no enseña a no mirar.

---

## 4 · RECOMENDACIÓN DE ORDEN

**Arreglaría primero (trivial + corre en la suite por defecto sin vigilar):**
1. **F1** `barrido-fino-2` — un `expect` sobre `flojos`. Hoy no puede fallar y corre por defecto.
2. **F3** el regex de los dos guardianes de grafo — aceptar `import '…'` sin `from`. Cierra un hueco compartido, uno de ellos recién construido.
3. **F5/F6** los dos `skipIf` que faltan (`tranvia`, `readme-no-miente`) — es LA clase de fallo que acaba de morder en producción (verde que depende de un artefacto previo).
4. **F8/F9** los `expect` de guarda que faltan y los dos `expect(true).toBe(true)`.

**Acotado (cierra un hueco real, pide diseño):**
5. **F2** el agregador que asserte 0 hallazgos sobre `e2e/.barrido/*.json` — sin él, el barrido es un informe.
6. **F4** el conteo de la fórmula de contraste sobre `src/`+`e2e/` — el guardián no impide una copia, solo una copia divergente.

**Decisión (no la tomo):** **F7** ¿se convierten las vistas de línea e2e a `?fingir=`? (quita red y flake, pero alguien pudo quererlas contra Avanza real como humo de integración). **F11** ¿candado exacto o suelo en los tests atados a datos reales? — compensación entre cazar una regresión y aguantar una actualización de dato.

**NO tocaría:** los guardianes estructurales (`pantalla-no-miente`, `tailwind-solo-src`) donde el runtime solo se ve en build — su alternativa es cara y ellos ya declaran su naturaleza; y `auditoria/` (instrumento manual, opt-in, documentado).

---

## 5 · PARA EL CHECKLIST MAESTRO (genérico — vale para cualquier proyecto)

> Redactado sin nombres del proyecto. Extraíble tal cual.

**La prueba de un test es su rojo**
- [ ] ⭐⭐ Un test verde no prueba nada por estar verde. La única prueba de que vigila algo es **verlo rojo** al romper lo vigilado. Para los guardianes y los tests de garantía crítica: **múta**los (rompe lo protegido, exige el rojo, restaura). Tres resultados, no dos: **CAZADO · ESCAPADO · NO PROBADA** (revienta con error ≠ cazó el bug).
- [ ] Mejor aún: que el test traiga su **propia contraprueba** incorporada (mide el «antes» del bug, o planta el defecto y exige cazarlo).

**Tests que no prueban nada**
- [ ] Un test que **acumula defectos y solo los imprime** (sin `expect`) no puede fallar. Cazar los `console.log` finales sin aserción.
- [ ] Un barrido que **escribe hallazgos a un fichero** necesita un **agregador que asserte 0**; si nadie lee ese fichero, es un informe, no un test.
- [ ] Aserciones dentro de un `if` **sin un `expect` de guarda antes**: si la condición no se cumple, el test pasa en verde vacío. `expect(true).toBe(true)` y `if (!x) return` antes del único assert: lo mismo.
- [ ] `expect(CONSTANTE).toBe(valor)` prueba la **declaración**, no el **cableado**. Mide el efecto de la constante en la instancia real, no su literal.

**Guardianes (los que vigilan que doc/datos/arquitectura no mientan)**
- [ ] ⭐ Un guardián de «fuente única» tiene que atar **TODAS las copias**, no una. Comparar por resultado numérico solo caza la copia *divergente*, no la *existencia* de una copia — y una copia correcta hoy diverge mañana. Si el bug original se cazó *contando* apariciones, automatiza ese conteo.
- [ ] Un guardián que promete algo en su cabecera: comprueba que **cumple la promesa**, no solo que existe. Mútalo.
- [ ] Un comentario del código que promete «lo comprueba un test»: verifica que ese test **existe Y comprueba eso**.
- [ ] Guardián por **grep del código fuente** (que el fichero *contenga* cierto string): protege la FORMA, no el comportamiento; evadible por aliasing, frágil ante reformateo. Sábelo y dilo.
- [ ] Sanity **anti-verde-en-vacío**: el guardián debe comprobar primero que encontró algo que vigilar (`>N` elementos), o mover un fichero lo deja verde sobre cero.

**Dependencia de entorno (el verde que depende de «si alguien compiló antes»)**
- [ ] ⭐ Un test que lee un **artefacto de build / fichero gitignored / la red / la hora del host** a nivel de módulo **errora en un clon limpio**. O se defiende (`skipIf` a la vista, nunca `catch`→verde) o se aísla. Un `skipped` honesto vale más que un rojo por entorno o un verde prestado.
- [ ] Tests de integración que llaman a un **tercero real** cuando un doble daría el mismo verde: quitan determinismo y añaden flake sin probar de más.
- [ ] Candado sobre **dato real exacto** (`toBe(N)`): cada actualización del dato es un falso rojo. Elegir entre candado (caza regresión) y suelo (`>0`, aguanta el dato) a conciencia.

**Config de test**
- [ ] ¿Qué corre en la suite por defecto? ¿Hay tests que **no los ejecuta nadie** (fuera de todo script)? Un test que nadie corre no existe.
- [ ] `reuseExistingServer` / reintentos / timeouts: ¿ocultan que se prueba contra un build viejo, o que algo es inestable?

---

*Fin del Bloque C. Los arreglos se deciden y se hacen aparte, en tandas. Este documento no se reescribe.*
