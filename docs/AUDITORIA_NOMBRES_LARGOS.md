# AUDITORÍA · los `longName` de las 44 líneas

**Pasada 1 de 3.** Solo el listado y la clasificación. **No se ha tocado una línea de
código.** Antonio marca a mano antes de corregir.

- Fuente del dato crudo: `src/generated/gtfs.json` (campo `route_long_name`, leído en
  `src/sources/gtfs-nap/adapter.ts:210`).
- «Destino corregido» = lo que hoy sale en la home / h1 / botonera (ver `engine/rumbo.ts`).
- Es el MISMO `ucwords()` que rompió las paradas y los destinos, ahora en otro campo.

## Resumen

| | Cuántas | Cuáles |
|---|---|---|
| ✅ **CORRECTO** | 34 | las 23 diurnas limpias + 58, 59 + Ci1–Ci4 + N1, N3, N4, N6, N7 |
| 🔧 **ROTO, forma evidente** | 8 | **21, 28, 34, 44, 53, 60, C1, C4** |
| ❓ **DUDOSA (preguntar)** | 2 | **N2, N5** (abreviaturas de ronda) |

---

## 🔧 LOS 8 ROTOS — con la fuente de cada forma propuesta

> ⚠️ «de dónde sale» es obligatorio. Ninguna es «yo creo»: todas salen de otro dato del
> propio proyecto (la parada terminal, el destino ya corregido, o el `longName` de otra
> línea que nombra el mismo sitio).

| Línea | `longName` crudo | Qué está roto | Forma propuesta | De dónde sale |
|---|---|---|---|---|
| **34** | `Estacion Delicias - Cementerio` | acento comido | `Estación Delicias - Cementerio` | destino ya corregido «Estación Delicias» · `longName` de la **51** («…Estación Delicias») · parada terminal «Estación Delicias / Acceso Llegadas» |
| **44** | `Estación Miraflores - Actur Rey Fernando` | guion perdido | `Estación Miraflores - Actur-Rey Fernando` | `longName` de la **42** y la **43** («Actur-Rey Fernando») · destino ya corregido |
| **53** | `Plaza Emperador Carlos Quinto - Miralbueno` | romano deletreado | `Plaza Emperador Carlos V - Miralbueno` | parada terminal «Plaza Emperador Carlos **V** / Intercambiador» · destino ya corregido |
| **60** | `Avda Estudiantes -  Actur Rey Fernando` | abreviatura + doble espacio + guion perdido | `Avenida Estudiantes - Actur-Rey Fernando` | destino ya corregido «Avenida Estudiantes» (el headsign viene limpio) · «Actur-Rey Fernando» de la 42/43 |
| **28** | `Coso - Montañana/Peñaflor` | espaciado de la barra | `Coso - Montañana / Peñaflor` | destino ya corregido «Montañana / Peñaflor» (decisión de campo de Antonio, ya en código) |
| **21** | `Barrio Jesús - Oliver - Miralbueno` | el 2.º guion es la ZONA, no un extremo | `Barrio Jesús - Oliver / Miralbueno` | destino ya corregido «Oliver / Miralbueno» (decisión de campo, ya en código) — ver «la trampa del guion» |
| **C1** | `Plaza de Las Canteras - Complejo Funerario` | `Las`→`las` (Antonio lo escribe en minúscula) | `Plaza de las Canteras - Complejo Funerario` | destino ya corregido «Plaza de **las** Canteras» (`DESTINO_DE_CAMPO`, Antonio) |
| **C4** | `Plaza de Las Canteras - Puerto Venecia` | `Las`→`las` | `Plaza de las Canteras - Puerto Venecia` | ídem C1 |

⚠️ **Dos de estas dependen de una decisión que YA tomaste** (no las doy por cerradas, las
marcas igual):
- **21 y 28** proponen alinear el `longName` con la ZONA con barra que definiste para el
  destino. Si prefieres que el `longName` siga listando los tres barrios con guion
  (`Oliver - Miralbueno`), dilo y no se tocan.
- **C1 y C4**: `de las Canteras` en minúscula es TU forma (la escribiste así). Ojo que
  choca con `Las Fuentes` / `Las Torres`, donde «Las» es nombre propio y va en mayúscula.
  Es tu criterio, ya dado; solo lo señalo.

---

## ❓ LAS 2 DUDOSAS — abreviaturas de ronda (búhos)

Son los únicos `longName` con abreviaturas, y son las listas de barrios de los búhos
—pensadas para ser COMPACTAS—. Expandirlas es una decisión tuya, no un arreglo de ucwords.

| Línea | `longName` crudo | Expansiones EVIDENTES (si decides expandir) |
|---|---|---|
| **N2** | `Pza. Aragón - La Almozara - Actur Rey F. - P. Goya - Arrabal` | `Pza.`→`Plaza` · `Actur Rey F.`→`Actur-Rey Fernando` · `P. Goya`→`Parque Goya` (línea 35) |
| **N5** | `Pza. Aragón - Las Fuentes - S José - La Paz - Parque Venecia` | `Pza.`→`Plaza` · `S José`→`San José` |

**Mi criterio (para que lo confirmes o lo tumbes):**
- En las líneas de **dos extremos** (diurnas / lanzaderas) → expandir y normalizar SIEMPRE,
  porque su `longName` se lee como título y debe casar con los destinos. (Por eso 60 «Avda»
  va en los 🔧, no aquí.)
- En las **rondas de búho** (N2, N5) → **dejarlas como están**. Son listas de 5 barrios que
  ya rozan el ancho a 360 px; expandir «Pza. Aragón» a «Plaza Aragón» las hace desbordar, y
  el búho enseña su `longName` tal cual en el `<h1>` (ver inventario). Si aun así las
  quieres expandidas, marca N2 y N5.

> N1, N3, N4, N6, N7 no tienen abreviaturas → van en ✅.

---

## ✅ LOS 34 CORRECTOS (nada que tocar)

`22` Las Fuentes - Bombarda · `23` Parque Venecia - Siglo XXI · `25` La Cartuja - Puerta del
Carmen · `29` Camino de Las Torres - San Gregorio · `30` Las Fuentes - Plaza Aragón · `31`
Puerto Venecia - Aljafería · `32` Santa Isabel - Bombarda · `33` Pinares de Venecia -
Delicias · `35` Parque Goya - Seminario · `36` Picarral - Valdefierro · `38` Bajo Aragón -
Valdefierro · `39` Pinares de Venecia - Vadorrey · `40` San José - Plaza Aragón · `41`
Puerta del Carmen - Rosales del Canal · `42` La Paz - Actur-Rey Fernando · `43` Juslibol -
Actur-Rey Fernando · `50` Vadorrey - San Gregorio · `51` Pabellón Príncipe Felipe - Estación
Delicias · `52` Miralbueno - Puerta del Carmen · `54` Rosales del Canal - Tranvía · `55`
Montecanal - Tranvía · `56` Valdespartera - Tranvía · `57` Casablanca - Tranvía · `Ci1`–`Ci4`
Circular 1–4 · `N1` Plaza Aragón - La Jota - Vadorrey - Santa Isabel · `N3` Paseo Pamplona -
Delicias - Valdefierro - Miralbueno · `N4` Paseo Pamplona - Romareda - Rosales del Canal -
Arcosur · `N6` Paseo Pamplona - Plaza Roma - Vía Hispanidad - La Cartuja · `N7` Plaza Aragón
- Arrabal - San Gregorio - Peñaflor

**⚠️ 58 y 59 están en ✅ pero con un cabo del OTRO lado:**
- `58` `Fuente de La Junquera - Tranvía` → el `longName` está bien; el roto es el DESTINO
  (headsign «Fuente Junquera», sin «de la»). Hoy la home dice «Fuente de La Junquera» y el
  h1 «Circular por Fuente Junquera». Cabo para la pasada de destinos, no de nombres.
- `59` `Arcosur - Tranvía` → igual: el `longName` está bien; el destino es «Tranvia-Arcosur»
  (headsign raro). El roto es el destino.
- Detalle menor en 58: `de La Junquera` (La en mayúscula). Puede ser ucwords sobre «la»,
  pero coincide con la parada, así que lo dejo en ✅ y lo apunto por si acaso.

---

## Patrones buscados (lo que pediste rastrear, uno a uno)

- **Acentos comidos**: solo **34** (`Estacion`). El resto de `longName` YA traían el acento
  bien (`Aljafería`, `San José`, `Aragón`, `Príncipe`, `Vía`, `Bajo Aragón`…). El ucwords
  destrozó los HEADSIGNS, no estos nombres largos.
- **Preposiciones capitalizadas** (`Del`, `De`): **ninguna** en los `longName`. Van todas en
  minúscula (`Puerta del Carmen`, `Pinares de Venecia`, `Camino de Las Torres`). Fue un
  problema de headsign, no de nombre largo. La única mayúscula discutible es `de Las Canteras`
  (C1/C4), y ahí es «Las Canteras» = nombre propio (tú lo bajas a `las`).
- **Romanos**: solo **53** (`Carlos Quinto`). `Siglo XXI` (23) ya está bien en el `longName`.
  Ningún `Iii`, `Xxi`, etc. en este campo.
- **Abreviaturas**: `Avda` (60, 🔧) · `Pza.` (N2, N5) · `S José` (N5) · `Actur Rey F.` /
  `P. Goya` (N2). Criterio arriba.
- **Guiones inconsistentes de «Actur-Rey Fernando»**: `Actur-Rey Fernando` (42, 43 ✅) vs
  `Actur Rey Fernando` sin guion (44, 60 🔧) vs `Actur Rey F.` (N2 ❓). Forma unificada:
  `Actur-Rey Fernando`.
- **Barras `/`**: en el `longName` solo la **28** (`Montañana/Peñaflor`, pegada). Es zona, no
  se parte; solo el espaciado. La 21 lleva la zona escrita con guion (`Oliver - Miralbueno`)
  en vez de barra. **No hay más barras.**

---

## ⭐ La trampa gorda: el guion `A - B` no siempre separa DOS EXTREMOS

- **21** `Barrio Jesús - Oliver - Miralbueno`: **dos** guiones, **dos** extremos. El 2.º
  guion (`Oliver - Miralbueno`) NO separa extremos: es la zona «Oliver / Miralbueno». Quien
  parta este `longName` por los guiones se inventa un tercer destino.
- **Búhos N1–N7**: 3–4 guiones que NO son «origen - destino», son la LISTA de barrios de la
  ronda (`Plaza Aragón - La Jota - Vadorrey - Santa Isabel`). El guion aquí significa «pasa
  por», no «de… a…». Estructuralmente correctos; solo no hay que leerlos como A→B.
- **`Actur-Rey Fernando`**: contiene un guion que es parte del NOMBRE (`Actur`-`Rey
  Fernando`), no un separador. Aparece en 42, 43, 44, 60. ⚠️ No partir por ese guion.

---

## Las dos preguntas

### 1 · ¿El `longName` corregido debe COINCIDIR con los destinos ya corregidos?

**Sí, y hoy se contradicen en 10 líneas.** Ese es exactamente el cabo que abrió esta pasada
(la 53 dice «Carlos V» en la home y «Carlos Quinto» en el buscador).

- **8 líneas donde el roto es el `longName`** (esta pasada las arregla): **21, 28, 34, 44,
  53, 60, C1, C4**.
- **2 líneas donde el roto es el DESTINO**, y el `longName` está bien: **58, 59** (el headsign
  de la circular viene mal). Éstas NO se tocan aquí; son cabo para la pasada de destinos.

Recomendación: sí, que casen. Y como el destino ya sale de un solo sitio (`destinoDeSentido`),
lo natural sería que el `longName` corregido **derive del mismo** o comparta el mapa de
correcciones, para que no puedan volver a divergir.

### 2 · ¿Dónde se usa el `longName`, aparte del buscador?

| Sitio | Uso | ¿Corregir lo cambia? |
|---|---|---|
| **Buscador** (`page.tsx:27` → `Buscador.tsx`) | Se MUESTRA (`<Cita>{titulo}`) y forma parte del texto de BÚSQUEDA | ⚠️ matiz: `normalizar()` ya pliega acentos y mayúsculas, así que arreglar `Estacion`→`Estación` **no cambia** qué se encuentra, solo lo que se ve. Pero `Carlos Quinto`→`Carlos V` **sí** cambia: dejaría de encontrarse por «quinto» (eso lo arregla la **pasada 2**, con sinónimos) |
| **Buscador · orden** (`Buscador.tsx:83`) | Desempate por LONGITUD de `titulo` | Cambios de longitud reordenan empates. Efecto mínimo |
| **Home · tarjeta de una línea** (`page.tsx:124`) | Se MUESTRA (`<Cita>`) en circulares (Ci1–4, 30, 54–59) y búhos (N1–7) | Sí: lo que se lee en esas tarjetas |
| **Home · orden de los dos destinos** (`dosDestinos`, `rumbo.ts`) | ⚠️ La POSICIÓN del destino dentro del `longName` decide **qué renglón va arriba** | ⚠️ **Sí**: arreglar la 53 subiría «Carlos V» al primer renglón; 44 y 60 igual. (La 34 ya la resolví con el plegado de acentos.) |
| **`<h1>` de la vista de línea** (`linea/[linea]/page.tsx:80–81`) | Solo los búhos de bucle (N1, N3, N4, N5, N7) enseñan el `longName` como título; + el degradado de emergencia | Sí para esos búhos: por eso expandir N5 cambiaría su `<h1>` |
| **`rumboDe`** (`rumbo.ts`) | Nombre del búho / circular | Igual que arriba |
| **Orden de la LISTA de líneas en la home** | — | **NO** se ordena por `longName` (va en el orden natural de `A.lines`). Corregir NO reordena la lista |
| **La fuente** (`sources/gtfs-nap/adapter.ts:210`) | Donde se LEE del GTFS | Es donde habría que enganchar la corrección (mapa como `CORRECCIONES`, o al hornear) |

**En una frase:** corregir el `longName` cambia (a) lo que se **muestra** en buscador y home,
(b) el **orden de los dos renglones** de la home en 53/44/60, y (c) el `<h1>` de los búhos si
se expanden. **No** cambia qué se **encuentra** por acento (el buscador ya lo pliega) ni el
orden de la lista de líneas.

---

## Lo que NO he hecho

No he tocado código, ni el GTFS, ni he corregido un solo nombre. Este documento es para que
marques a mano cuáles de los 🔧 entran, qué haces con los 2 ❓, y si 21/28/C1/C4 se alinean
con la zona/minúscula. Con eso hago la pasada 1 de verdad.
