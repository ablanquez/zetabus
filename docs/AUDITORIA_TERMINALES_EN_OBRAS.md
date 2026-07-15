# Auditoría · Los extremos de las salidas parciales usan el punto TEÓRICO (GTFS), no el real de hoy

**Encargo:** Antonio corrigió el spike anterior — "P. Mina" (Paseo de la Mina) y "Coso n.º 126"
**no son el mismo sitio**: son dos puntos físicos distintos, y la causa es **obras** (el Coso
cortado). El bloque de "funcionamiento de terminal" enseña, como origen/destino de las salidas
parciales, la primera/última parada del **trip del GTFS** (recorrido teórico). Cuando esa parada
está suprimida por obras, apunta a un sitio por el que el bus **ya no pasa**. Es Avenida Valencia
otra vez, ahora en los extremos de las salidas parciales.

**No se ha tocado código.** Esto es medición.

> **TL;DR** — El fallo es **real y medido**: en la 35, el extremo "Coso n.º 126" **no está en la
> ruta real de hoy** (obras); el recorrido real pasa por **P. de La Mina**, no por el Coso.
> **Detectarlo es fácil y gratis** (cruzar con `get_stops_list`, que la página de línea ya pide).
> **Derivar el nombre real ("P. de La Mina") NO es fiable**: el punto de desvío no está en el trip
> teórico. Y la supresión es **por línea** (la 21 sí conserva el Coso 126), no una lista fija de
> "paradas del Coso".

---

## 1 · ¿Coso 126 y Paseo de la Mina son dos postes distintos? Sí

| Parada | stop_id | poste | Distancia a Coso 126 |
|---|---|---|---|
| **Coso n.º 126** | 17009 | **338** | — |
| P. de La Mina / Centro de Mayores | 18933 | **1258** | **242 m** |
| P. de La Mina n.º 15 | 17893 | 1248 | 291 m |
| P. de La Mina / Colegio | 18932 | 1263 | 483 m |

Son **postes distintos**, a ~240–480 m del Coso. Cerca, plausibles como sustituto por desvío de
obras. **Antonio tenía razón; mi asunción anterior (que eran el mismo sitio) era falsa.**

## 2 · ¿La ruta real de hoy (`get_stops_list`) usa P. de La Mina y NO el Coso? Sí — en la 35

Medido con `get_stops_list` en vivo (POST a `admin-ajax.php`, `action=get_stops_list`), 2 sentidos:

**Línea 35:**
- Sentido −2 (→Parque Goya): 36 paradas. **Coso 126 (338): NO está.** **P. de La Mina (1258): SÍ,
  posición 16 de 36.**
- Sentido −1 (→Seminario): 30 paradas. **Coso 126 (338): NO está.**

⇒ La ruta real de hoy **ha tachado el Coso** y pasa por **P. de La Mina**. El itinerario de la
página de línea ya lo refleja (usa `get_stops_list`). El **bloque de terminal, no**: sigue diciendo
"Coso n.º 126".

**⚠️ Pero la supresión es POR LÍNEA, no una regla fija.** Medido en la **línea 21**:
- Coso 126 (338): **SÍ está** en su ruta real. → para la 21, "Coso n.º 126" **es correcto**.
- Coso 55 (334): **NO está** (suprimido). → para la 21, el extremo "Coso N.º 55" **es el falso**.

El mismo poste (338) está **suprimido en la 35 y activo en la 21**. No vale una lista de "paradas
del Coso": **hay que cruzar la ruta real de CADA línea**.

## 3 · ¿El extremo sale del GTFS teórico o de la ruta real? Del **teórico** (ahí está el fallo)

En `terminal.ts`, el origen/destino de cada salida se calcula como la **primera/última parada del
trip** (`stop_times` de secuencia mínima/máxima), y el nombre se resuelve con la capa de nombres
(avanza-web). Es decir:

- **Identidad del extremo:** parada del **trip del GTFS** = recorrido **teórico**.
- **Nombre mostrado:** el de esa parada teórica ("Coso n.º 126").

Nunca se cruza con `get_stops_list`. Por eso enseña un punto que hoy está en obras. El itinerario,
en cambio, **sí** cruza (motor de desvíos) y por eso él sí acierta.

## 4 · ¿Cuántos extremos parciales, y cuántas paradas de itinerario, caen en parada suprimida?

**Línea 35 (medido):**
- Extremos parciales distintos que enseña el bloque: **3**. Suprimido por obras: **1** → "Coso n.º
  126" (338). Los otros dos —"Plaza de España" (720) y "Plaza de Ariño" (432)— **sí** están en la
  ruta real: correctos.
- Paradas del **itinerario** fuera de la ruta real: **dir1 7 de 38 · dir0 6 de 31** (13 en total).
  *Pero el itinerario ya pinta la ruta real, así que ahí no es un bug — la magnitud dice lo gordas
  que son las obras en la 35.*

**Línea 21 (medido):** 1 extremo suprimido ("Coso N.º 55", 334); "Coso n.º 126" (338) correcto.

**Red (inventariado sin peticiones, desde el artefacto):** hay **32 extremos parciales distintos**.
De ellos, **4 están en la zona del Coso** (candidatos a supresión): 338 (líneas 21, 32, 35), 334
(21), 340 (39), 335 (39). **Pero "candidato" ≠ "suprimido"**: la 21 conserva el 338. Saber el
número exacto exige `get_stops_list` de cada línea afectada (~28 peticiones), que no se han hecho
(petición mínima). Nota aparte: 2 "extremos" son códigos sin poste ("2101"/"2102", de una ruta que
no está en el listado de líneas — no llegan a pantalla).

## 5 · Recomendación: ¿se puede derivar el punto real cruzando con `get_stops_list`?

**Detectar que el extremo es falso: SÍ, fiable y gratis.**
Cruzar el **poste** del extremo parcial con la ruta real (`get_stops_list`). Si no está → suprimido.
La página de línea **ya pide** esas 2 rutas (motor de desvíos), así que **no cuesta peticiones
nuevas**: basta con que el bloque de terminal reciba el veredicto que ya se calcula. Requiere que
`terminal.ts` guarde el **poste** del extremo (hoy solo guarda el nombre).

**Derivar el nombre REAL ("P. de La Mina"): NO, con fiabilidad.**
El punto de desvío (P. de La Mina) **no está en el trip teórico** — el desvío mete paradas nuevas
que el trip del GTFS no visita. Cruzar los stops del trip con la ruta real **no** devuelve "P. de La
Mina" (no es una parada del trip). La correspondencia "Coso teórico → P. Mina real" solo se podría
adivinar por cercanía geométrica, y para un trip parcial "dónde empieza de verdad" es aún más
difuso. Sería un cálculo a ojo, y a ojo no se casa con certeza.

**⇒ Recomendación (para un arreglo futuro, no ahora):** aplicar la doctrina de Avenida Valencia al
bloque de terminal.
1. Guardar el **poste** de cada extremo parcial en `terminal.ts`.
2. En la página de línea, cruzar cada extremo con la ruta real que **ya se pide** (sin peticiones
   extra).
3. Si el extremo **está** en la ruta real → enseñar su nombre (es correcto: la 21 con Coso 126, la
   35 con Plaza de España/Ariño).
4. Si **no** está (suprimido por obras) → **no** afirmar el nombre teórico. O se omite la marca, o
   se dice "empieza/acaba a mitad — punto afectado por obras" (sin nombrar un sitio por el que el
   bus no pasa). **No** inventar "P. de La Mina".

Con esto, cero peticiones nuevas, y nunca se enseña un extremo por el que el bus ya no circula.

---

## Método y peticiones (mínimas)

- **Sin peticiones:** análisis del GTFS horneado (`src/generated/gtfs.json`) — postes, distancias,
  recorridos teóricos, inventario de extremos de la red.
- **Con peticiones (4 en total):** `get_stops_list` de las líneas 35 y 21, dos sentidos cada una,
  al mismo `admin-ajax.php` que ya usa el proyecto para el itinerario.
- **Descartadas por no fiables:** la página "Primeras y últimas salidas" de Avanza solo enlaza
  **PDFs de 2020**; no hay ningún `action` de horarios en su `admin-ajax` (solo `get_stops_list`,
  `get_direction_list`, `get_alteraciones_servicio`, `tiempos_de_llegada`).

## Caveats

- La ruta real (`get_stops_list`) es **de hoy**: cuando acaben las obras, el Coso volverá y esto se
  auto-corrige (el cruce lo detecta solo). No hay nada cableado a una obra concreta.
- La supresión es **por línea y sentido**: el mismo poste puede estar activo en una línea y cortado
  en otra. Cualquier arreglo debe cruzar **por línea**, no por lista de paradas.
- El conteo exacto a nivel de red no se ha medido (habría costado ~28 peticiones); se han medido 2
  líneas y se ha inventariado el resto sin afirmarlo.
