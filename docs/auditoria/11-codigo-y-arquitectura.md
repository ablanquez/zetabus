# AUDITORÍA · CÓDIGO Y ARQUITECTURA — EL ESCAPARATE

**Fecha:** 24/07/2026 · **Estado del repo auditado:** `6d44eec` (Tanda 7 cerrada)
**Qué NO es este documento:** un informe. Es la **guía que se seguirá para implementar los
cambios**. Cada hallazgo trae dónde está, qué cuesta y qué riesgo tiene tocarlo.
**Qué NO se ha hecho aquí:** ⛔ **no se ha tocado ni una línea de código de producción.** Se
descubre; decide Antonio.

> **Por qué existe.** La Tanda 7 verificó que la app **funciona y no miente**. No dijo nada del
> **código**. Y el repositorio es público: lo que un reclutador ve en cinco minutos es la
> estructura, los nombres, el tamaño de los ficheros y si esto parece escrito por alguien que sabe
> lo que hace. **El código es el escaparate tanto como la app.**

---

## Método — y qué se ha MEDIDO frente a qué se ha MIRADO

| Bloque | Cómo se obtuvo | ¿Medido o mirado? |
|---|---|---|
| Código muerto | Script desechable (`scratchpad/muertos.mjs`): busca cada `export` y cuenta apariciones del identificador en **todo** el árbol versionado. **Cada candidato se verificó luego a mano con `git grep -w`.** | **Medido**, y contrastado por segundo método |
| Tamaño de ficheros | Script desechable (`scratchpad/densidad.mjs`): separa líneas de **código** de líneas de **comentario**. `wc -l` a secas miente en este repo, donde hay ficheros con 58 % de comentario | **Medido** |
| Duplicación | `git grep` de constantes numéricas de fórmulas, de nombres de tipo repetidos y de colores literales | **Medido** (las apariciones), **mirado** (si son la misma cosa) |
| Afirmaciones a mano (L42) | Recalculadas contra `src/generated/gtfs.json` con un método distinto del que las produjo | **Medido** |
| Idioma / estructura | Inventario de exportaciones por carpeta | **Medido** |
| Historial de commits | `git log --pretty` sobre los 173 commits | **Medido** |

⚠️ **Los scripts de análisis son DESECHABLES y viven fuera del repositorio**, en el scratchpad de
la sesión. No se han añadido a `scripts/`: no son producto, son andamio.

⚠️ **Sospecha del instrumento, aplicada a mí mismo.** El detector de código muerto sacó **64
candidatos**. Al verificarlos a mano quedaron **11**: los otros 53 eran falsos positivos (tipos
citados en prosa, `contentType` que Next lee por convención, barriles importados por su
directorio). **Si me hubiera creído la primera cifra, este documento pediría borrar código vivo.**
Y en sentido contrario: creí haber encontrado un número caducado (`≥ 4,58` en `ChipLinea.tsx`) y
resultó que **yo estaba midiendo otra cosa** — el suelo teórico sobre los 256 grises, no sobre las
44 líneas. Se retiró el hallazgo. El apartado *«Lo que está bien»* lo recoge ya como verificado.

---

# 1 · HALLAZGOS — ordenados por gravedad

## ⛔ A-F1 · FALLO · **El README dice que la aplicación NO EXISTE**

| | |
|---|---|
| **Dónde** | [`README.md:6-8`](../../README.md) y [`README.md:99`](../../README.md) |
| **Qué dice hoy** | *«**Estado: en construcción.** El repositorio contiene, por ahora, la auditoría de fuentes y el diseño aprobado. **Ni una línea de aplicación todavía.**»* · y en «Poner en marcha»: *«Todavía no hay aplicación que arrancar.»* |
| **Qué hay en realidad** | **12.973 líneas** en `src/`, 44 líneas de bus y 934 paradas servidas, 423 tests de Vitest y 806 de Playwright en verde |

**Por qué importa, y por qué va el primero de todo:** es **la primera frase que lee cualquiera**.
Un reclutador que abre este repositorio lee *«ni una línea de aplicación todavía»* y **cierra la
pestaña**. Todo el trabajo de siete tandas queda detrás de una frase que dice que no existe.

Es además el caso puro de la **afirmación duplicada** que este proyecto tiene fichada: prosa
escrita a mano que describe el estado del código y **dejó de coincidir con él** hace meses. Los
visuales no caducan; la prosa sí.

- **Coste de arreglarlo:** ~1 h (reescribir la cabecera, la sección «Poner en marcha» con el
  comando real, y añadir capturas + enlace a la demo).
- **Riesgo:** **nulo.** No toca código.

---

## ⛔ A-F2 · FALLO · **La promesa del correo de contacto en el `User-Agent` es falsa** — una causa, tres apariciones

| | |
|---|---|
| **Dónde está la causa** | [`src/sources/avanza/transporte.ts:37`](../../src/sources/avanza/transporte.ts#L37) |
| **Qué manda de verdad** | `ZetaBus/0.1 (+https://github.com/ablanquez/zetabus)` — **sin correo** |
| **Y la variable que lo llevaría** | `ZETABUS_CONTACT_EMAIL` está declarada en `.env.example:19` y **no la lee NADIE**. Verificado con `git grep`: una sola aparición en todo el repositorio, la de su propia declaración |

**Dónde se afirma lo contrario** (tres sitios, **un solo hallazgo**):

1. `README.md:76` — *«Cada petición lleva un `User-Agent` con un correo de contacto.»*
2. `.env.example:16-19` — describe la variable como si estuviera en uso.
3. `THIRD-PARTY-NOTICES.md:94` y `:109` — *«`User-Agent` identificable **con correo de
   contacto**»* y *«El correo de contacto va en cada petición precisamente para que puedan
   pedirlo antes de tener que bloquearnos.»*

**Por qué importa** — y esto no es cosmética. Es la **única promesa operativa que ZetaBus le hace
a Avanza**, y es la que sostiene todo el argumento del apartado «Sobre el scraping»: *si
molestamos, que puedan pedirnos que paremos antes de bloquearnos*. Hoy Avanza recibe peticiones de
un agente que **no deja ninguna vía de contacto**. El documento legal del proyecto afirma dos
veces algo que el código no hace.

- **Coste:** ~15 min (leer la variable en `transporte.ts` y componer el `AGENTE`), o **5 min** si
  se decide al revés: quitar la promesa de los tres documentos.
- **Riesgo:** bajo. `AGENTE` es una constante exportada que solo usa `transporteReal`. ⚠️ Ojo a
  `e2e/` y a los tests que puedan afirmar la cadena literal.
- **Decisión que hay que tomar antes de tocar:** ¿se pone el correo, o se retira la promesa? Las
  dos son defendibles. Lo que no es defendible es la pareja actual.

---

## ⛔ A-F3 · FALLO · **La fórmula de contraste WCAG está escrita CUATRO veces — y una de ellas calcula otra cosa**

| Copia | Fichero | ¿Qué calcula? |
|---|---|---|
| 1 | [`src/components/ChipLinea.tsx:54-61`](../../src/components/ChipLinea.tsx#L54) | Luminancia WCAG 2.x con corrección gamma sRGB ✔ |
| 2 | [`src/components/interno/TokensVivos.tsx:231-236`](../../src/components/interno/TokensVivos.tsx#L231) | La misma, reescrita ✔ |
| 3 | [`e2e/lib/medir.ts:101-106`](../../e2e/lib/medir.ts#L101) | La misma, reescrita ✔ |
| 4 | [`e2e/sentido.spec.ts:25`](../../e2e/sentido.spec.ts#L25) | ⛔ **`(0.2126·r + 0.7152·g + 0.0722·b) / 255`** — **sin corrección gamma.** Es una luminancia lineal ingenua, **no la WCAG** |

**Por qué importa.** Dos de las copias están en **producción** (`src/`), y `ChipLinea.tsx` ya
exporta `contraste()` — o sea, la versión buena estaba a un `import` de distancia y se reescribió
igualmente. Es exactamente el patrón que este proyecto ya pagó con *la cabecera que tenía su
propia tabla de colores*.

Y la cuarta copia es peor que una duplicación: **es una divergencia**. `e2e/sentido.spec.ts` juzga
qué sobrevive al quitarle el color a la pantalla con una fórmula que **no es la que rige el resto
del proyecto**. Hoy da el mismo veredicto por casualidad. El día que un tono caiga en la zona
donde las dos fórmulas discrepan, ese test dirá que sí y `ChipLinea` dirá que no, y nadie sabrá
cuál de los dos cree.

- **Coste:** ~1 h. Extraer `luminancia`/`contraste` a un módulo puro y hacer que las cuatro tiren
  de él. ⚠️ El instrumento (`e2e/`) y la producción (`src/`) no comparten bundle: hay que decidir
  si el módulo vive en `src/core` (y `e2e` lo importa) o se duplica **a propósito y con nota**.
- **Riesgo:** **medio.** Unificar la copia 4 **cambiará el resultado de `e2e/sentido.spec.ts`**.
  Puede ponerse roja — y si se pone, es información, no un problema.

---

## ⚠️ A-F4 · FALLO menor · El índice de `docs/` está desactualizado

`docs/README.md` referencia **7** informes de auditoría. En `docs/auditoria/` hay **10** (y con
este documento y sus dos hermanos, **13**). Y `README.md:58` dice *«Los **siete** informes están
en `docs/auditoria/`»*.

- **Coste:** 10 min. **Riesgo:** nulo. **Nota:** este documento **no lo ha arreglado** — se
  descubre, no se arregla.

---

## 🟡 A-D1 · DEUDA · `ParQuePasa`, la misma interfaz declarada dos veces

```
src/engine/correspondencias.ts:56          src/sources/avanza/correspondencias.ts:50
  export interface ParQuePasa {              export interface ParQuePasa {
    readonly linea: string;                    readonly linea: string;
    readonly sentido: 0 | 1;                   readonly sentido: 0 | 1;
  }                                          }
```

Idénticas, campo por campo, en dos ficheros que además **se llaman igual**. Es la **copia a mano**
en su forma más pura: el mismo dato descrito dos veces, sin que nada obligue a que sigan iguales.

- **Por qué importa:** el día que el índice necesite un tercer campo, hay que acordarse de tocar
  dos sitios. Y no hay ningún test que lo detecte si solo se toca uno.
- **Coste:** 30 min. **Riesgo: medio-alto, y por eso NO recomiendo tocarlo ahora.** La frontera
  `src/sources/` ↔ `src/engine/` es deliberada (la fuente no depende del motor). Unificarlas obliga
  a elegir quién es dueño del tipo, y esa es una decisión de arquitectura, no una limpieza.
  ⚠️ **Alternativa barata y sin riesgo:** dejar las dos y poner en cada una una nota que apunte a
  la otra. Cuesta 5 minutos y resuelve el 90 % del daño real (que es no enterarse).

---

## 🟡 A-D2 · DEUDA · Código muerto — **11 exportaciones, 1 fichero huérfano, 1 script con una ruta personal dentro**

**Verificadas a mano una por una** (cada identificador aparece **solo** en su línea de declaración
en todo el árbol versionado):

| Dónde | Qué | ¿Muerto o cabo suelto? |
|---|---|---|
| [`src/sources/avanza/kml.ts:69`](../../src/sources/avanza/kml.ts#L69) | `comprobarKml` | ⚠️ **CABO, no muerto.** El fichero entero **hace una petición de red y nadie lo importa**. Pero el README describe el KML como pieza de la investigación de fuentes. **Borrarlo perdería la intención.** Ver decisión abajo |
| [`src/core/entities.ts:89,110,121,139`](../../src/core/entities.ts) | `RouteDelta`, `Vehicle`, `Arrival`, `Advisory` | ⚠️ **CABO.** Son el modelo de dominio declarado en la Tanda 1. `Advisory` tiene un comentario que explica una regla de producto («no tacha ni oculta nada por sí solo») **que la app sí cumple, por otro camino** |
| [`src/core/profiles.ts:49`](../../src/core/profiles.ts#L49) | `RegisteredMode` | Muerto. Resto del andamiaje multi-modo |
| [`src/engine/topologia.ts:237`](../../src/engine/topologia.ts#L237) | `nombreDePoste` | **Muerto de verdad.** Función completa que nadie llama |
| [`src/sources/flota-zetabus/adapter.ts:251`](../../src/sources/flota-zetabus/adapter.ts#L251) | `asVehicleId` | Muerto |
| [`src/sources/gtfs-nap/identity.ts:28`](../../src/sources/gtfs-nap/identity.ts#L28) | `stopIdFromGtfs` | Muerto |
| [`e2e/lib/medir.ts:82`](../../e2e/lib/medir.ts#L82) | `pixeles` | Muerto (instrumento) |
| [`scripts/lib/zip-lectura.ts:9`](../../scripts/lib/zip-lectura.ts#L9) | `ficheroDelZip` | Muerto (build) |
| `src/modes/index.ts` | fichero entero | **Huérfano.** Nadie importa `@/modes`; todo el mundo va directo a `@/modes/bus/profile` |

⚠️ **Y uno que no es código muerto sino suciedad publicada:**
[`scripts/spike-suelo-zoom.ts:85`](../../scripts/spike-suelo-zoom.ts#L85) lleva escrita dentro una
ruta absoluta de **mi directorio temporal de sesión**, con el nombre de usuario de Windows y un
UUID. Está en el repositorio público. *(Se recoge también en el documento 12, § B3.)*

- **Coste total:** ~45 min si se borra todo. **Riesgo:** bajo para los 7 «muertos de verdad»,
  **alto para los cabos** — borrar `kml.ts` y `entities.ts` tira documentación de diseño.
- **Recomendación:** ver § 3.

---

## 🟡 A-D3 · DEUDA · `LlegadasVivas.tsx` — el único fichero que sí se ha vuelto grande

**El número honesto, no el bruto.** `wc -l` da 758 líneas, pero este repositorio comenta mucho, así
que la cifra que importa es la de **líneas de código**:

| Fichero | Código | Comentario | % com. | Total |
|---|---:|---:|---:|---:|
| **`src/components/LlegadasVivas.tsx`** | **505** | 198 | 28 % | 759 |
| `src/app/globals.css` | 365 | 431 | **54 %** | 842 |
| `src/app/sobre-los-datos/page.tsx` | 352 | 48 | 12 % | 424 |
| `src/components/MapaParada.tsx` | 346 | 360 | **51 %** | 755 |
| `src/components/Itinerario.tsx` | ~250 | ~70 | — | 322 |

⇒ **Se desmienten dos de los tres sospechosos del enunciado.** `globals.css` y `MapaParada.tsx`
**no son grandes: son comentados** (más de la mitad de cada uno es prosa). Y `Itinerario.tsx`, con
322 líneas totales, **ni siquiera entra en la lista**.

**La pregunta que pedía el encargo — ¿grande porque hace muchas cosas, o porque la cosa es
grande?** Para `LlegadasVivas.tsx`, la respuesta es **hace muchas cosas**, y se puede demostrar:

- **6 componentes en un fichero:** `LlegadasVivas`, `FiltroDeLineas` (:325), `BarraDeEdad` (:413),
  `Cuerpo` (:485), `Llegada` (:617), `Aviso` (:747).
- **6 piezas de estado y 5 efectos** en el componente principal, cubriendo **cuatro
  responsabilidades independientes**: el bucle de refresco de 15 s · el contador de edad · el
  filtro de líneas · la selección cruzada mapa↔lista.

⇒ **Sí se puede partir**, y por una costura limpia: `FiltroDeLineas` y `BarraDeEdad` no comparten
estado con la selección mapa↔lista.

- **Coste:** ~2 h. **Riesgo:** **medio-alto.** Es el componente cliente del que cuelga la rejilla
  de la vista de parada, y sobre él pesan `flotacion.spec`, `bloque-parada.spec`,
  `interaccion.spec` y `mapa.spec`. Un refactor aquí **invalida verificación recién pagada**.

---

## 🟡 A-D4 · DEUDA · `src/sources/gtfs-nap/` es código de BUILD viviendo en `src/`

Verificado: **`src/sources/gtfs-nap/` solo lo importan `scripts/`** (`build-data`,
`build-nombres`, `build-correspondencias`). No entra en el bundle de la aplicación ni en el
servidor: **es un compilador de datos alojado en la carpeta de la aplicación.** Son ~900 líneas.

Es coherente con que `fflate` esté correctamente en `devDependencies` — pero **quien abre `src/`
no lo sabe**, y asume que todo lo que hay ahí es la app.

- **Coste:** ~1 h (mover a `scripts/lib/gtfs/` y reapuntar 3 imports). **Riesgo:** bajo mecánicamente.
- ⚠️ **Alternativa de coste cero:** un `README.md` de dos líneas dentro de la carpeta. Resuelve el
  problema real, que es de **legibilidad**, no de arquitectura.

---

## 🟡 A-D5 · DEUDA · `parked/` — 1.926 líneas de código aparcado, en el repositorio público

`parked/barrido-de-linea/` contiene 6 ficheros versionados (`BuscarBuses.tsx` 480 líneas,
`barrido.ts` 453, `barrido-bajo-demanda.spec.ts` 392, `barrido-completo.test.ts` 379, `route.ts`,
`agrupar-flota.ts`). Está documentado en `docs/BARRIDO_APARCADO.md`.

**No es un fallo — es una decisión** que hay que revisar con los ojos de quien mira desde fuera. A
favor: enseña que se sabe **retirar** una función y dejar constancia. En contra: una carpeta
llamada «aparcado» en la raíz es lo tercero que se ve en la vista de ficheros de GitHub, y un
lector rápido no distingue *«retirado a propósito»* de *«a medias»*.

- **Coste de moverlo** (p. ej. a una rama `parked/barrido-de-linea` con un enlace desde el doc):
  20 min. **Riesgo:** nulo (nadie lo importa).

---

## 🟡 A-D6 · DEUDA · Dos idiomas conviviendo — y **la frontera no es la que parece**

El proyecto es en español. La hipótesis de partida —*«`src/core` está en inglés, el resto en
español»*— **es falsa**. El inventario de exportaciones por carpeta dice otra cosa:

| Carpeta | Estado |
|---|---|
| `src/engine`, `src/components`, `src/cache`, `src/modes` | **Español, coherente.** Sin islas |
| **`src/core`** | ⚠️ **Mezclado dentro del mismo fichero.** `Line`, `Stop`, `Vehicle`, `Arrival`, `Advisory`, `FeedValidity`, `Confidence` conviven con `Observacion`, `Fechado`, `ProcedenciaDelNombre`, `edadDe`, `tieneDatos` |
| **`src/sources`** | ⚠️ **Mezclado, pero con criterio visible:** el adaptador del GTFS habla inglés (`loadGtfs`, `parseCsv`, `readGtfsZip`, `hasColumn`) porque **el GTFS es un estándar en inglés**; todo lo de Avanza habla español |

⇒ En `src/sources` la mezcla **tiene una razón defendible** (el vocabulario del estándar). En
`src/core` **no la tiene**: es sedimento de haberse escrito primero.

- **Coste:** ~2 h con renombrado asistido. **Riesgo: alto y desproporcionado.** `Line`, `Stop` y
  `LineId` son los tipos más citados del proyecto; tocarlos mueve casi todos los ficheros y
  **destruye la legibilidad del `git blame`** a cambio de coherencia estética.

---

## 🔵 A-G1 · GUSTO · `Veredicto`, dos cosas distintas con el mismo nombre

`src/cache/limitador.ts:73` (`{concedida, fichasRestantes}`) y `src/engine/desvios.ts:67` (unión
etiquetada de comparación de recorridos). No colisionan —viven en módulos distintos— pero
«veredicto» acaba significando dos cosas en la misma cabeza. **Opinión, no defecto.**

## 🔵 A-G2 · GUSTO · La regla de `textoLegible` está documentada como general y ya solo aplica a los búhos

`ChipLinea.tsx:96-105` enuncia *«Si el color que manda el operador se lee (≥ AA), se respeta»* como
la regla del chip. El bloque siguiente (`:117-139`) la sustituye para las diurnas (blanco siempre +
contorno). Los dos son correctos y están en orden cronológico; leídos del tirón, **el primero
parece decir lo que ya no dice**. Coste de una nota: 5 min.

## 🔵 A-G3 · GUSTO · 78 de los 173 commits llevan `Co-Authored-By: Claude`

**Es visible desde fuera**, en cada commit. No es un defecto y ocultarlo sería peor. Pero es una
decisión de escaparate que conviene tomar **a propósito** y no descubrir en una entrevista: la
opción fuerte es **decirlo en el README** y quedarse con el mérito del método (auditoría antes que
código, contraprueba obligatoria, tres retractaciones documentadas) en vez de dejar que lo
descubran solos.

---

# 2 · LO QUE ESTÁ BIEN — y por tanto **NO se toca**

Un informe que solo lista defectos no permite decidir qué dejar en paz, y eso es la mitad de la
decisión.

**1 · Cero suciedad de trabajo en 15.641 líneas de código.** Medido: **0** `TODO`, **0** `FIXME`,
**0** `HACK`, **0** `@ts-ignore`, **0** `eslint-disable`. *(Los 20 aciertos de `grep TODO` son la
palabra española «todo».)* Y **un solo `console`** en `src/`: el `console.error` deliberado de
`error.tsx:41`. Esto es raro y se nota.

**2 · El historial de commits es impecable.** 173 commits, **173 siguen el convenio** (0
excepciones): 73 `feat`, 43 `fix`, 19 `docs`, 16 `test`, 7 `refactor`. Y **4.856 líneas de cuerpo
de commit** — una media de 28 líneas por commit explicando el *por qué*. El historial **es**
documentación.

**3 · Los números escritos a mano en el fichero más comentado del proyecto REPRODUCEN — los
tres.** Recalculados contra `src/generated/gtfs.json` con un método distinto del que los produjo:

| Afirmación | Dónde | Verificación |
|---|---|---|
| *«22 de las 44 líneas caen en la franja rojo/ámbar/verde»* | `ChipLinea.tsx:18` | **22 de 44** ✔ |
| *«26 DE 44 CHIPS ESTÁN POR DEBAJO DE WCAG AA»* | `ChipLinea.tsx:85` | **26 de 44** ✔ |
| *«`max(blanco, negro) ≥ 4,58` para CUALQUIER color»* | `ChipLinea.tsx:137` | Suelo real sobre los 256 grises: **4,58** ✔ (y el peor de las 44 reales, 4,80) |

**4 · `src/` es pequeño: 12.973 líneas en total.** Para una app con 1.012 páginas, mapa vivo,
caché de dos pisos y detección de desvíos, eso es contención, no carencia.

**5 · Un solo punto de salida al mundo.** `src/sources/avanza/transporte.ts` es el único sitio que
habla con Avanza, **a propósito y con el motivo escrito**: con dos, la promesa de
peticiones/minuto sería una estimación; con uno, es una medida. *(Ver el documento 12: hoy esa
medida no llega al endoscopio — pero el diseño que la hace posible es este, y es correcto.)*

**6 · El `.gitignore` es una lista blanca**, con el razonamiento escrito y una excepción estrecha
documentada (`!/src/cache/`). Es la decisión correcta y es rara de ver.

**7 · La duplicación que más miedo daba NO está.** Buscados a propósito: colores literales fuera
de `globals.css` (los de `ChipLinea` son **mediciones citadas en comentarios**, no valores en uso),
constantes de red repetidas, tablas de color paralelas. **No hay ninguna.**

---

# 3 · MI RECOMENDACIÓN — qué tocaría y qué NO

> El criterio: *el coste de tocar lo que funciona*. Acabamos de verificar la aplicación entera.
> Todo lo que se toque **hay que volver a verificarlo**.

### Lo tocaría YA (coste bajo, riesgo nulo, beneficio alto)

| # | Qué | Por qué ahora |
|---|---|---|
| **A-F1** | Reescribir el README | Es lo primero que ve todo el mundo y **hoy dice que el proyecto no existe**. Nada más de esta lista tiene ni la décima parte de este retorno |
| **A-F2** | Decidir el correo del `User-Agent`: ponerlo o retirar la promesa | Es la única promesa operativa a un tercero, y hoy no se cumple |
| **A-F4** | Actualizar `docs/README.md` y el «siete informes» del README | 10 min |
| **A-D2** (parcial) | Borrar los **7 muertos de verdad** (`nombreDePoste`, `asVehicleId`, `stopIdFromGtfs`, `RegisteredMode`, `pixeles`, `ficheroDelZip`, `src/modes/index.ts`) y limpiar la ruta personal de `spike-suelo-zoom.ts:85` | Riesgo nulo verificado a mano; `npm run typecheck` lo confirma en un minuto |
| **A-G2** | Una nota en `ChipLinea.tsx:96` diciendo que esa regla ya solo rige a los búhos | 5 min |

### Lo tocaría DESPUÉS, con la Tanda 7 relanzada detrás

| # | Qué | Condición |
|---|---|---|
| **A-F3** | Unificar la fórmula de luminancia | ⚠️ **Solo con tiempo para ver `e2e/sentido.spec.ts` ponerse roja** y decidir cuál de las dos fórmulas manda. Si se hace con prisa, se «arregla» apagando el test, que es lo peor posible |
| **A-D3** | Partir `LlegadasVivas.tsx` | Merece la pena por legibilidad, pero **cuesta re-verificar cuatro specs**. Es trabajo de una tarde entera, no de un hueco |
| **A-D5** | Sacar `parked/` a una rama | Cuando se decida la cara pública del repo, junto con el README |

### Lo que **NO tocaría**

| # | Qué | Por qué NO |
|---|---|---|
| **A-D6** | El inglés de `src/core` | Renombrar `Line`/`Stop`/`LineId` mueve casi todo el proyecto, **quema el `git blame`** y no arregla ningún defecto real. Un reclutador no penaliza que el modelo de dominio esté en inglés: es lo normal |
| **A-D1** | Unificar `ParQuePasa` | Obliga a romper la frontera `sources` ↔ `engine`, que es deliberada. **Una nota cruzada resuelve el daño real por 5 minutos y cero riesgo** |
| **A-D2** (cabos) | `kml.ts` y los tipos de `entities.ts` | **No son muertos: son cabos.** `kml.ts` sostiene una parte de la historia de fuentes que el README cuenta. Borrarlo perdería la intención. Si estorba, se marca como no usado; no se tira |
| **A-D4** | Mover `src/sources/gtfs-nap/` | El problema es de legibilidad, y se resuelve con un `README.md` de dos líneas dentro de la carpeta. Mover 900 líneas para eso es desproporcionado |
| — | `globals.css` y `MapaParada.tsx` | **No están grandes: están comentados.** El instrumento bruto (`wc -l`) los acusaba; el instrumento correcto los absuelve |

---

# 4 · LO QUE **NO** SE HA PODIDO AUDITAR

| Qué | Por qué |
|---|---|
| **Duplicación semántica** (dos funciones que hacen lo mismo con nombres distintos, como el caso histórico `transbordosDe` / `lineasQuePasanPor`) | `git grep` encuentra **nombres y literales**, no **intenciones**. Para esto haría falta leer las ~90 funciones exportadas una por una y compararlas de a pares. **NO CONSTA.** Es el hueco más grande de este documento y conviene saberlo |
| **Duplicación dentro de `globals.css`** (reglas que se pisan, especificidades que se cancelan) | Requiere resolver la cascada sobre el DOM real, no leer el fichero. **NO CONSTA** |
| Si los `data-papel` siguen un criterio o han crecido a parches | Hay ~60 valores distintos. Juzgar si el criterio es coherente exige compararlos contra el sistema visual, que es trabajo de diseño, no de auditoría de código. **NO CONSTA** |
| Complejidad ciclomática / profundidad de anidamiento | No se ha medido. Habría hecho falta una herramienta de análisis estático que este repo no tiene, y meterla habría sido tocar `package.json`. **NO CONSTA** |
| Si los 53 falsos positivos del detector de muertos esconden alguno verdadero | Se verificaron **los 11 candidatos fuertes** (`usos internos: 0`). Los otros 53 se descartaron por inspección del motivo, no uno a uno. **Riesgo residual admitido** |

---

# 5 · BITÁCORA — lo que este trabajo enseña sobre el método

**⚠️ Un `wc -l` mide el fichero; no mide el problema.** Tres de los ficheros «demasiado grandes»
resultaron ser **muy comentados**: `globals.css` (54 % prosa) y `MapaParada.tsx` (51 %). El
instrumento bruto habría mandado partir dos ficheros que no lo necesitan. **Lo que decide es la
línea de código, y hubo que construir el instrumento que las separa.**

**⚠️ Un detector de código muerto acierta 11 de 64.** Es una tasa de acierto del **17 %**. Creerse
la primera salida habría convertido este documento en una orden de borrar código vivo. *La regla:
si una herramienta dice que hay 64, verifica una a mano antes de creértela; y si dice que no hay
ninguna, sospecha igual.*

**⚠️ Y me pasó también en la otra dirección: fabriqué un hallazgo por medir otra cosa.** Di por
caducado el `≥ 4,58` de `ChipLinea.tsx:137` porque el peor de las 44 líneas reales daba 4,80. **La
afirmación no hablaba de las 44 líneas: hablaba del suelo teórico sobre los 256 grises**, y el
test lo dice explícitamente. El número era correcto y el equivocado era yo. **Se retiró el
hallazgo antes de escribirlo.** Es la misma clase de error que el detector del corte de 880 en la
Parte B: *un instrumento mal apuntado acusa a la app de su propio defecto*.

**⚠️ Y el hallazgo A-F1 dice algo incómodo sobre qué se verifica.** El README lleva meses
afirmando que la aplicación no existe. **Ni un solo test lo vio** — y no podían: 423 tests de
Vitest y 806 de Playwright miran el **código** y la **pantalla**. Nadie mira **la prosa que
describe el proyecto**. Es el mismo agujero que dejó a la home sin `<h1>`: *lo que no tiene una
pregunta general escrita, no lo encuentra ningún test por pantalla*.

---

*Documentos hermanos de esta ronda:*
[`12-perimetro-y-publicacion.md`](12-perimetro-y-publicacion.md) ·
[`13-rendimiento.md`](13-rendimiento.md)
