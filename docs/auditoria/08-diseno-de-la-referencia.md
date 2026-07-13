# AUDITORÍA DE DISEÑO DE LA REFERENCIA

**Proyecto auditado:** `E:\PROYECTOS WEB\00 ZGZ RADAR` · módulo `moverme/bus`
**Fecha:** 13/07/2026
**Alcance:** LA INTERFAZ. (Los datos ya se auditaron en la Fase 1.)
**Regla aplicada:** *la referencia manda en lo visual; no manda en lo que miente.*

---

# ⚠️ EMPIEZO CORRIGIÉNDOTE, PORQUE SI NO EL INFORME NACE TORCIDO

Me diste cuatro acusaciones contra el motor de la referencia. **Dos no se sostienen tal como
las formulaste**, y hay **una quinta que no mencionaste y que es peor que las cuatro.**

| tu acusación | veredicto | qué pasa DE VERDAD en pantalla |
|---|---|---|
| «pintaba buses en el golfo de Guinea (`?? 0`)» | ⚠️ **FALSO EN PANTALLA** | El `?? 0` existe (`get-live-buses-by-poste.ts:163-164`), pero **el mapa lo filtra**: `isValidBusCoord()` exige `lat !== 0 && lon !== 0` (`BusStopMap.tsx:10-14`). Ningún bus se pinta en el mar. |
| «`tiempoMin` a `null` sin avisar si falla la regex» | ✅ **CIERTO** | Se pinta **`–`** (`BusStopArrivals.tsx`: `{bus.tiempoTexto ?? "–"}`). Sin error, sin banner. |
| «no distinguía "no pasa ningún bus" de "la petición falló"» | ⚠️ **FALSO** | **Sí lo distingue.** `LiveStatus = "ok" \| "error" \| "empty"` (`types.ts:141`) y un banner ámbar propio para `error` (`BusStopArrivals.tsx:69-81`). |
| «no tenía edad del dato» | ✅ **CIERTO** | No hay timestamp. Solo un texto **estático**: *"Se actualiza automáticamente cada 20 s"*. |

Y también: **la referencia SÍ valida el poste aguas arriba.** `getParadaByPoste()` lo busca en su
propio JSON y devuelve `null` → la página hace `notFound()` → 404. El poste inexistente **no** se
confunde con el poste vacío. Eso ya lo tenían resuelto, y por el mismo camino que nosotros (L4).

> ## ⭐ LA QUINTA, LA QUE NO ESTABA EN TU LISTA, Y ES LA GRAVE
>
> **El auto-refresco de 20 segundos FALLA EN SILENCIO.**
>
> ```ts
> // BusStopDetail.tsx:96-114
> const doRefresh = async () => {
>   if (document.hidden) return;
>   try {
>     const res = await fetch(`/api/moverme/bus/parada/${poste}/live`);
>     if (!res.ok) return;                       // ← se rinde. Sin decir nada.
>     ...
>   } catch {
>     // preserve last known state on network error   ← ni un aviso.
>   }
> };
> setInterval(doRefresh, 20_000);
> ```
>
> Si Avanza se cae mientras tienes la pantalla abierta, **no pasa nada visible**. Los autobuses
> siguen ahí, con sus minutos, tan tranquilos. Y debajo, un texto fijo que dice:
>
> > *«Se actualiza automáticamente cada 20 s»*
>
> **Ese texto es la mentira.** No es que el dato esté viejo: es que la pantalla AFIRMA
> ACTIVAMENTE una frescura que no está ocurriendo. Diez minutos después sigues viendo el bus
> de las 13:04 con el cartel de "se actualiza cada 20 s" debajo.
>
> El banner de error solo aparece en la **carga inicial** (server-side). En el refresco, no.

Esto es exactamente el fallo que perseguimos: **una pantalla coherente y falsa.** Y es la razón
por la que la edad del dato en ZetaBus **no es un adorno**: es lo único que convierte ese texto
en verdad.

---

# 1 · LA NAVEGACIÓN

## Los caminos, con los toques contados

| camino | toques | ruta |
|---|---|---|
| **A · buscador de la home** | **2** (o 1 + Enter) | tocar input → escribir → tocar resultado |
| B · menú + buscador del módulo | 4 | Moverme → Autobús urbano → input → resultado |
| C · por lista de líneas | **5** + scroll | Moverme → Autobús → línea → *pestaña de sentido* → parada (scroll entre 30-60 paradas, **sin filtro**) |
| D · favoritos | 2-3 | (requiere haber guardado la parada antes) |
| E · **"cerca de mí"** | — | **NO EXISTE** |

**El camino A es bueno: dos toques.** El buscador indexa **líneas y paradas juntas**, permite
**buscar por número de poste** (`nPoste === q` → score 0, la señal más fuerte,
`build-bus-search-index.ts:170-176`), acepta **un solo dígito** si es numérico, y expande
abreviaturas de callejero (`Av→avenida`, `Pza→plaza`, `Pº→paseo`…,
`expand-abbreviations.ts:6-43`). Eso es trabajo pagado y bien hecho.

## ⚠️ Pero hay tres agujeros de navegación que NO hay que heredar

1. **`navigator.geolocation` NO SE USA EN TODO EL REPOSITORIO.** Cero llamadas. El chip
   *"Cerca de mí"* de la home es **decorativo**: un `<span aria-hidden>` sin `onClick`, con este
   comentario literal en `app/page.tsx:61`:
   > `// Chips de filtro — placeholder visual, sin lógica real`

   ⚠️ **Y ESA ES LA MÉTRICA QUE TÚ MISMO DEFINISTE: el usuario está EN LA CALLE, DE PIE, CON
   PRISA.** El camino más corto para alguien que está *físicamente en la marquesina* debería ser
   **cero toques**: abres y ves tu parada. La referencia le obliga a **teclear el nombre de la
   calle en la que está de pie.** Es el fallo de producto más grande de su interfaz, y no es un
   bug: es una función que nunca se construyó.

2. **El input de búsqueda de `/moverme` es FALSO**: `readOnly` + `aria-disabled="true"`
   (`IndexSectionHeader.tsx:96-103`). El usuario ve una caja de búsqueda, la toca, escribe... y
   no pasa nada. Hay **dos buscadores reales** (home y `/moverme/bus`) y **uno falso** en medio.

3. **La ruta `/buscar` está muerta**: renderiza *"La búsqueda estará disponible pronto."* y
   **ningún componente enlaza a ella**.

## El sentido de la línea: pestañas, y un deep-link roto

Se elige con **dos pestañas** (`aria-pressed`, `BusLineRoute.tsx:30-57`) sobre una sola lista.
El patrón es correcto. Pero `?sentido=sentido2` **se lee y nunca se genera** (0 coincidencias en
todo el repo): **no se puede enlazar al sentido 2.** El usuario siempre aterriza en el 1 y paga
un toque extra.

---

# 2 · LA PANTALLA DE PARADA

Orden vertical (`BusStopDetail.tsx:117-155`):

```
┌──────────────────────────────────────────┐
│ ← Av. de Valencia n.º 8                  │  header sticky
│   Poste 262 · Avanza Zaragoza            │
├──────────────────────────────────────────┤
│ Guardar esta parada            [ ★ ]     │
├──────────────────────────────────────────┤
│                                          │
│           MAPA (Leaflet, h-72)           │  ← parada + buses vivos
│                                          │
├──────────────────────────────────────────┤
│  [21] [29] [39]        Todas | Ninguna   │  ← filtro por línea
│                        "sin llegadas"    │
├──────────────────────────────────────────┤
│ Próximas llegadas                        │
│ ┌──────────────────────────────────────┐ │
│ │ [39]  VADORREY              3 min    │ │  ← ORDENADO POR TIEMPO
│ │       ⬤Bus 4650 ⬤Articulado ⬤Diésel │ │     (no agrupado por línea)
│ ├──────────────────────────────────────┤ │
│ │ [29]  SAN GREGORIO          1 min ⚡ │ │  ← rojo + "YA LLEGA" + pulse
│ │       ⬤Bus 4132 ⬤Estándar  ⬤Híbrido│ │
│ └──────────────────────────────────────┘ │
│ Se actualiza automáticamente cada 20 s   │  ← ⚠️ LA MENTIRA
├──────────────────────────────────────────┤
│ ⓘ Información orientativa                │
└──────────────────────────────────────────┘
```

- **Ordenado por TIEMPO, no agrupado por línea.** Correcto: en la calle te da igual la línea, te
  importa **cuál llega antes**. (Los `null` van al final.)
- **La ficha del vehículo son tres chips bajo el destino**: `Bus 4650` · `Articulado` · `Diésel`.
- **`tiempoMin <= 1`** → número en rojo, `animate-pulse`, y la palabra **"YA LLEGA"**.
- **Mapa y lista están sincronizados en los dos sentidos**: tocas un bus en la lista → se
  selecciona en el mapa y hace `scrollIntoView`. Tocas el pin → se resalta la fila.

## Sin buses / cargando / error

| situación | qué se ve |
|---|---|
| sin llegadas | *"Sin llegadas disponibles en este momento."* |
| todas las líneas desactivadas | *"Selecciona una línea para ver próximas llegadas."* |
| el bus que habías seleccionado desaparece | *"El bus seleccionado ya no aparece en las próximas llegadas."* ⭐ |
| carga | **spinner de pantalla completa** (`app/loading.tsx`). **No hay skeleton** salvo el del mapa. **No hay `<Suspense>` en todo el módulo.** |
| error (carga inicial) | banner ámbar + **Y ADEMÁS** *"Sin llegadas disponibles"* ⚠️ |

⚠️ **El mensaje doble en fallo:** cuando `status === "error"`, se pinta el banner ámbar *y* la
tarjeta de vacío, porque la condición de vacío es solo `sorted.length === 0` sin mirar el estado
(`BusStopArrivals.tsx:102-112`). El usuario lee, a la vez: *"no se han podido cargar"* **y**
*"sin llegadas disponibles"*. Dos frases que se contradicen.

---

# 3 · LO QUE RESOLVIÓ BIEN — Y NO HAY QUE REDESCUBRIR

Voy a ser generoso, porque se lo ha ganado.

### ⭐ 1. El bus fantasma
> *"El bus seleccionado ya no aparece en las próximas llegadas."*

Habían pensado en el caso raro: seleccionas un bus, pasan 20 s, el bus ya ha pasado y desaparece
del refresco. **En lugar de que el pin se esfume sin más, te lo dicen.** Eso es un nivel de
cuidado que la mayoría de las apps no tiene. **Se copia.**

### ⭐ 2. El desvío vive DENTRO del recorrido, no en una cabecera
El recorrido es una unión discriminada:
```ts
type RecorridoItem = { tipo: "parada"; ... } | { tipo: "desvio"; titulo; texto }
```
y el aviso ámbar se pinta **en la posición de la línea temporal donde ocurre el desvío**
(`BusLineRoute.tsx:75-83`). No es un banner arriba que hay que correlacionar con nada: **está
donde pasa.** Es el hueco exacto que ZetaBus necesita.

### ⭐ 3. La parada anulada se TACHA y deja de ser clicable
```ts
const isStopDisabled = enObras || parada.anulada;   // BusRouteStop.tsx:33
```
→ `line-through decoration-black` + sin `role="link"`. **El lenguaje visual del diff de ZetaBus
ya está inventado.** No hay que diseñarlo: hay que conectarlo a un dato que no mienta.

### 4. Ordenar por tiempo, no por línea. 5. El estado "ya llega" con color + texto + movimiento
(tres canales, no solo color — accesible). 6. Búsqueda por número de poste con la prioridad más
alta. 7. Filtro de líneas que actúa sobre mapa **y** lista a la vez. 8. Chips de flota compactos
que no roban protagonismo al tiempo. 9. `md:hidden` bottom-nav de 5 items con `pb-[120px]` de
compensación. 10. Un aviso honesto de que el dato es de un tercero.

---

# 4 · ⚠️ LO QUE COPIARÍA UNA MENTIRA

## 4.1 · El `–` que no explica nada

`{bus.tiempoTexto ?? "–"}`

El parser lee el HTML **con un regex** (`extractTdInfo2`: `/<td[^>]*class="td_info2"[^>]*>/g`).
El día que Avanza cambie esa clase, `cells` viene vacío y **para TODOS los buses**:

```
destino = ""  →  "Destino desconocido"
tiempoTexto = null  →  "–"
status = "ok"          ← porque buses.length > 0
```

**Pantalla resultante:** una lista perfectamente maquetada de 4 autobuses, cada uno con un chip
de línea de color, "Destino desconocido", y un guion. **Sin un solo error. Sin banner.** Y los
pines siguen en el mapa (las coordenadas vienen del JSON, no del HTML).

→ **Ese `"–"` es un hueco de datos disfrazado de dato.** ZetaBus no puede tener ese carácter.

## 4.2 · El mapa y la lista se contradicen en silencio

Un bus sin coordenadas: **está en la lista** (con su tiempo) y **NO está en el mapa** (el filtro
`isValidBusCoord` lo quita). La lista dice 4, el mapa enseña 3. **Nadie dice por qué.**

El filtro del mapa es correcto. Lo que falta es **decirlo**: *"1 autobús sin posición: llega, pero
no sabemos dónde está."*

## 4.3 · Los desvíos son un JSON escrito a mano

`lineas-avanza-zaragoza.json` → **2 incidencias declaradas a mano**, con `paradasAlternativas` y
`variaciones` escritas por una persona.

> **Un desvío que hay que acordarse de apagar acaba mintiendo. Siempre.**

Cuando Avanza restaure el Coso, ese JSON seguirá diciendo que hay obras hasta que alguien lo
edite. Y hoy hay **muchos más desvíos que dos**: mi diff de la Tanda 3 detectó desvíos en 21, 29,
35, 38, 39 y 41 **el mismo día**. Ese fichero está **desactualizado ahora mismo**.

→ **Se tira el mecanismo. Se queda el componente.**

## 4.4 · Qué partes del diseño ASUMEN un dato que puede ser falso

| pieza de la interfaz | asume |
|---|---|
| *"Se actualiza automáticamente cada 20 s"* | que el refresco **está funcionando** |
| el número grande del tiempo | que hay tiempo (o pone `–`) |
| el pin en el mapa | que hay coordenadas (aquí sí lo comprueban) |
| el chip `Articulado` / `Diésel` | ⚠️ **que la ficha de flota es CIERTA** |
| ausencia de chip | «no sabemos» y «es normal» **son lo mismo** |

⚠️ **El chip de flota es el que más me preocupa, y es donde la Tanda 2 nos dio la lección:**
`normalizeTamanio()` deriva el tamaño de `longitud`, y el fichero de flota heredado tenía
**62 longitudes mal, las 62 en la misma dirección** (nunca inventaba un articulado: los
**escondía**). O sea: **esa pantalla ha estado enseñando `Estándar` sobre autobuses de 18 metros.**
Y el usuario no tenía forma de saberlo, porque **el chip no lleva procedencia.**

Y cuando el coche no está en la flota → `flota: null` → **el chip simplemente no aparece.** No dice
"sin datos". Desaparece. **La ausencia de dato es indistinguible de la ausencia de rareza.**

---

# 5 · ⭐ DÓNDE VIVIRÍA LO QUE ZETABUS TIENE Y ELLOS NO

Esta es la pregunta que decide si su maqueta sirve.

| lo que ZetaBus tiene | ¿hay hueco en su diseño? |
|---|---|
| **Edad del dato** ("hace 18 s") | ⚠️ **HAY SITIO, PERO OCUPADO POR UNA MENTIRA.** Justo donde pone *"Se actualiza cada 20 s"* (texto estático). Se **sustituye**, no se añade. Es un cambio de una línea con un significado enorme. |
| **Confianza de la ficha de flota** (`oficial` / `sin_verificar`) | ⚠️ **NO HAY HUECO.** El chip es `[Articulado]`, punto. No hay dónde meter "según el pliego" vs "sin verificar". Hay que **rediseñar el chip**, no reutilizarlo. |
| **SIN DATOS de flota** | ⚠️ **NO HAY HUECO.** Hoy el chip **desaparece**. Hace falta un estado visible: `[flota: sin datos]`. |
| **El recuento** ("los 11 de la 35 son articulados") | ⛔ **NO EXISTE LA PANTALLA.** Su página de línea es **una lista de paradas**, nada más. **No hay ninguna vista "la línea AHORA".** El recuento no cabe en ningún sitio: hay que **crear una pantalla nueva**. |
| **Desvíos detectados + paradas que caen** | ✅ **HUECO PERFECTO.** `BusRouteDeviationNotice` (aviso en la línea temporal) + `line-through` en la parada. **La forma ya está; hay que cambiarle el motor.** |
| **La contradicción del operador** | ⛔ **NO HAY HUECO, Y ES LO MÁS DIFÍCIL.** Decir *"Avanza declara esta parada suprimida, pero su propio sistema anuncia un bus en 3 minutos"* no es un aviso: es **un dato enfrentado a otro dato**. Su interfaz no tiene ningún componente que enfrente dos fuentes. Hay que inventarlo. |
| **Feed caducado** | ⚠️ **medio hueco.** El banner ámbar de `liveStatus === "error"` es del sitio adecuado, pero es **de parada**. La caducidad del GTFS es **global** (afecta a los recorridos de toda la app) y necesita vivir en el layout, no en una pantalla. |

## ⭐ El agujero estructural: SU APP NO TIENE PANTALLA DE "LÍNEA AHORA"

Su `/moverme/bus/[lineaId]` es **el recorrido estático**: una lista de paradas en orden. **Cero
datos vivos.** No hay ni un autobús en esa pantalla.

Y ahí es donde vive **la mitad del producto de ZetaBus**:

- el barrido (11 autobuses detectados en la 35)
- el recuento (*"los 11 son articulados"*) — **la L2, el corazón del proyecto**
- el mapa de la línea con sus buses moviéndose
- el trazado real (KML) vs el oficial (shapes)

**Nada de eso cabe en su maqueta, porque su maqueta no contempla que una línea tenga presente.**
Para ellos una línea es un objeto de catálogo. Para nosotros es **algo que está pasando ahora**.

---

# 6 · RESPONSIVE

> ## ⭐ ADENDA (13/07/2026, después de montar la verificación visual)
>
> **YA LO HE ABIERTO. Y CORRIJO LO QUE ESCRIBÍ ARRIBA.**
>
> En la sección 2 dije que su pantalla de parada estaba **"bien resuelta"**. Lo dije leyendo el
> orden de los componentes en el código, que es razonable. **Con un Chromium de 360 px delante,
> no lo está.** Medido, no visto a ojo:
>
> ```
>    cabecera (nombre de la parada)     y=  32
>    barra "Guardar esta parada"        y= 183
>    el MAPA                            y= 249   alto = 288 px   ← 39 % del viewport
>    filtro "Líneas en esta parada"     y= 562
>    "Próximas llegadas"                y= 736   (asoma 4 px)
>    ⭐ EL PRIMER TIEMPO DE LLEGADA      y= 789   ⛔ 49 px POR DEBAJO DE LA PANTALLA
> ```
>
> ### **A 360 px, la primera pantalla NO ENSEÑA NI UNA SOLA LLEGADA.**
>
> Lo primero que ve alguien que está **de pie en la marquesina, con prisa**, es un botón de
> *"Guardar esta parada"* y un mapa de 288 píxeles. **El dato por el que ha abierto la app está
> fuera de la pantalla.**
>
> Y el mapa es precioso. Y el diseño es coherente. Y está mal.
>
> ⚠️ **Esto no se ve leyendo el código.** El orden de los componentes era defendible; lo que no es
> defendible es lo que produce ese orden a 360 px. Es la L7, en carne viva, sobre mi propio
> informe: **leí una capa y afirmé sobre otra.**
>
> ⇒ **CONSECUENCIA PARA ZETABUS:** en la pantalla de parada, **las llegadas van ARRIBA**. El mapa,
> debajo. Si hace falta, plegado. La métrica es *"¿ve su bus sin tocar la pantalla?"*, y se mide
> con `e2e/flotacion.spec.ts` en cada tanda.

## Lo que dice el CSS, y lo que dice el navegador

Ya no hace falta creerse el CSS: hay un Chromium real midiendo. Pero el análisis de clases sigue
siendo correcto y ahora está **confirmado con la geometría renderizada**.

## Lo que sí puedo afirmar leyendo el CSS

**Es mobile-first de verdad, no de boquilla.** El inventario completo de breakpoints en
`components/moverme/bus/**` es:

```
BusLineCard      w-11 h-11 md:w-12 md:h-12  ·  text-[15px] md:text-[16px]
BusLineGroups    grid-cols-1 md:grid-cols-2  ·  px-5 py-6 md:py-8  ·  max-w-3xl
BusLineRoute     flex-col md:flex-row (BusRouteStop)
BusStopMap       h-72 md:h-[340px] lg:h-[360px]
```

**Cero `sm:`. Cero `xl:`. Cero override desktop-first.** La base ES el móvil y `md:` solo añade.
Eso está bien hecho y es la estructura correcta.

- **Ninguna `<table>`** en todo el módulo.
- `grid-cols-1 md:grid-cols-2` → a 360 px, **una columna**. Correcto.
- Fila de chips de filtro: `overflow-x-auto` + `scrollbar-hide`. **El patrón correcto.**
- Red de seguridad: `overflow-x-hidden` en el `<body>`.
- Bottom-nav `md:hidden fixed h-[72px]` + `pb-[120px]` en el `<main>`. Correcto.

### La fila de chips: ya no es una sospecha, es una medida

Escribí que la sub-fila de chips (`pl-[52px]` fijo) *"aguanta con flex-wrap, pero va justo"*. Eso
era **aritmética sobre una clase de CSS**. Ahora se lo he preguntado al navegador:

```
   fila de chips de flota a 360 px:  x 37 → 323   ·   alto 21 px   ·   CABE en una línea
   [Bus 4650] [Articulado] [Diésel]  →  286 px usados de ~307 disponibles
```

**Cabe. Con 21 píxeles de margen.** Mi predicción era correcta en el diagnóstico y ahora tiene un
número detrás.

⚠️ **Y ese margen es exactamente el problema.** ZetaBus quiere meter en esa misma fila la
**confianza** (`sin verificar` ≈ 90 px) y el **`SIN DATOS`**. 286 + 90 = **376 > 307**.

> **Esa fila NO aguanta lo que ZetaBus le quiere meter. Está medido, no intuido.**
> Hay que rediseñarla, no heredarla.

### Y dos hallazgos menores, reales

- Los enlaces de atribución de Leaflet (`Leaflet`, `OpenStreetMap`) miden **51×14** y **85×14 px**:
  por debajo del mínimo táctil de 24 px (WCAG 2.5.8). Es de la propia librería, y es menor.
- El texto *"Se actualiza automáticamente cada 20 s"* tiene un contraste real de **4,47:1** sobre
  un mínimo de 4,5. **Falla por 0,03.** Da igual: lo grave de ese texto no es que se lea regular,
  es que **es mentira cuando el refresco falla**.

---

# 7 · ⭐ VEREDICTO

> ## Su diseño sirve como **VOCABULARIO VISUAL**. NO sirve como **ESTRUCTURA**.
>
> **Y no porque esté mal hecho: porque ZETABUS TIENE MÁS QUE DECIR.**

## Lo que se REUTILIZA (como conocimiento, no como código)

1. **La pantalla de parada, entera.** Mapa arriba, filtro de líneas, lista ordenada por tiempo,
   sincronización bidireccional mapa↔lista. Está bien resuelta. No la redescubras.
2. **El "ya llega"**: rojo + pulso + palabra. Tres canales, no solo color.
3. **El aviso de desvío EN la línea temporal** y **la parada tachada y no clicable.** El lenguaje
   visual del diff de ZetaBus **ya está inventado aquí**. Solo hay que darle un motor que no mienta.
4. **El bus fantasma.** Ese cuidado se copia.
5. **El buscador que indexa paradas y líneas juntas, con el número de poste como señal fuerte.**
6. **La estructura mobile-first**: `max-w-3xl`, una columna, bottom-nav, sin tablas.

## Lo que se TIRA

1. **El texto *"Se actualiza cada 20 s"*.** Es una afirmación que la app no cumple cuando falla el
   refresco. **Se sustituye por la edad real del dato.** Esto no es un cambio estético: es la
   diferencia entre una caché honesta y una caja negra.
2. **El `–` del tiempo.** Un hueco no es un dato.
3. **El JSON de desvíos a mano.** Se queda el componente; se tira la fuente.
4. **El chip de flota sin procedencia y que desaparece cuando no hay dato.** Ha estado enseñando
   `Estándar` sobre autobuses de 18 metros, y nadie podía saberlo.
5. **La fila de chips con `pl-[52px]`.** No cabe lo que ZetaBus quiere poner.
6. **Los buscadores falsos** (`readOnly` en `/moverme`, la ruta `/buscar` muerta) y los **chips
   decorativos** de la home. Un control que no hace nada es peor que no tenerlo.

## ⛔ Lo que hay que CONSTRUIR DESDE CERO, porque su maqueta no tiene hueco

| | por qué |
|---|---|
| **La pantalla "LÍNEA AHORA"** | Su página de línea es un catálogo estático. **Aquí vive la mitad del producto**: el barrido, el mapa de la línea, y **el recuento** (*"los 11 de la 35 son articulados"*) — que es la L2 y el corazón del proyecto. |
| **El componente de CONTRADICCIÓN** | *"Avanza declara esta parada suprimida, pero su sistema anuncia un bus en 3 min."* No es un aviso: es **un dato contra otro dato**. No tienen nada parecido. |
| **La procedencia visible** | Confianza de la flota, edad del dato, `SIN DATOS` explícito. Su diseño asume que **todo dato que se pinta es cierto**, y por eso no tiene dónde poner un asterisco. |
| **"Cerca de mí"** | **Cero toques** para quien está en la marquesina. La métrica que tú mismo definiste, y que ellos nunca construyeron. |

---

## La frase que resume esta auditoría

> Su interfaz está diseñada para **enseñar un dato**.
> ZetaBus necesita una interfaz que sepa enseñar **un dato, su edad, su procedencia, y la
> posibilidad de que sea falso.**
>
> **Eso no es una capa encima. Es otra estructura.**
