# Primeras y últimas salidas de TODA la red — dato crudo

**Fecha de la captura:** 2026-07-20 (lunes), tarde · **Peticiones a Avanza:** **88** · **Código tocado:** ninguno.
Mismo criterio que [`DATOS_CRUDOS_LINEAS_25_35_38_41.md`](DATOS_CRUDOS_LINEAS_25_35_38_41.md), pero para las 44 líneas.

> ⚠️ **Esto es DATO CRUDO, no una auditoría.** No hay conclusiones ni propuestas: solo lo que dice
> cada página, tal cual, y los recuentos que pediste. Las tablas de salidas son de reloj (no cambian
> por el instante); las llegadas vivas no se han tocado aquí.

**De dónde sale cada cosa y por qué 88 peticiones:**

- Las tablas de **primeras/últimas**, la **frecuencia media** y la **«Información adicional»** viven en
  la misma página, `/lineas-y-horarios/?selectLinea={L}&selectSentido={-1|-2}`. **No hay artefacto
  horneado de esto** —el GTFS trae los viajes, no la tabla pelada que publica Avanza—, así que hay que
  pedirla en vivo. Una petición por línea y sentido: **44 × 2 = 88**. Todas respondieron **HTTP 200**.
- La frecuencia media va en un `<p>` **fuera** de `#infoCaracteristicas`, que el parser del proyecto no
  captura; aquí se ha extraído del **mismo HTML** ya descargado, sin pedir nada más.
- La **deduplicación ×4** y el saneo de celdas son los mismos que usa
  [`src/sources/avanza/horario.ts`](../src/sources/avanza/horario.ts) (HTML, no regex; el HTML viene
  malformado y cada fila se repite cuatro veces por las copias responsive).
- La **etiqueta de sentido** se deduce de las columnas de la propia tabla: `<select id="selectSentido">`
  no trae opciones. Se toma el valor dominante de la columna **Hasta** → «Hacia X».

---

## ⭐ CUADRO RESUMEN — una fila por línea·sentido

Lee así: **«¿un solo DESDE?»** = todas las filas de ese sentido (primeras + últimas) salen del mismo
sitio. **«nº excepciones»** = filas cuyo DESDE **o** HASTA se sale del par dominante. `— / 0 filas` =
la web devolvió la página (200) pero **sin tabla** en ese sentido.

| línea·sentido | nº 1ª | nº últ. | ¿un solo DESDE? | ¿un solo HASTA? | nº excepciones |
|---|---:|---:|:---:|:---:|---:|
| **C1** `-1` | 1 | 1 | sí | sí | 0 |
| **C1** `-2` | 1 | 1 | sí | sí | 0 |
| **C4** `-1` | 1 | 2 | sí | sí | 0 |
| **C4** `-2` | 1 | 3 | sí | sí | 0 |
| **Ci1** `-1` | 5 | 3 | sí | sí | 0 |
| **Ci1** `-2` | 3 | 6 | sí | sí | 0 |
| **Ci2** `-1` | 15 | 12 | sí | sí | 0 |
| **Ci2** `-2` | 18 | 15 | **no** (2) | **no** (2) | 14 |
| **Ci3** `-1` | 11 | 13 | sí | sí | 0 |
| **Ci3** `-2` | — | — | — | — | *0 filas* |
| **Ci4** `-1` | 10 | 12 | sí | sí | 0 |
| **Ci4** `-2` | — | — | — | — | *0 filas* |
| **21** `-1` | 9 | 10 | **no** (2) | **no** (2) | 5 |
| **21** `-2` | 9 | 10 | **no** (2) | sí | 2 |
| **22** `-1` | 10 | 9 | sí | sí | 0 |
| **22** `-2` | 8 | 12 | sí | sí | 0 |
| **23** `-1` | 6 | 15 | **no** (2) | **no** (2) | 12 |
| **23** `-2` | 4 | 15 | **no** (2) | **no** (2) | 12 |
| **25** `-1` | 2 | 9 | sí | sí | 0 |
| **25** `-2` | 2 | 9 | sí | sí | 0 |
| **28** `-1` | 2 | 1 | sí | sí | 0 |
| **28** `-2` | 1 | 3 | sí | sí | 0 |
| **29** `-1` | 7 | 7 | sí | sí | 0 |
| **29** `-2` | 5 | 9 | sí | sí | 0 |
| **30** `-1` | 14 | 20 | sí | sí | 0 |
| **30** `-2` | — | — | — | — | *0 filas* |
| **31** `-1` | 9 | 12 | sí | sí | 0 |
| **31** `-2` | 10 | 14 | sí | sí | 0 |
| **32** `-1` | 14 | 15 | **no** (2) | **no** (2) | 5 |
| **32** `-2` | 11 | 14 | sí | sí | 0 |
| **33** `-1` | 21 | 21 | **no** (2) | sí | 3 |
| **33** `-2` | 21 | 22 | **no** (2) | sí | 3 |
| **34** `-1` | 5 | 10 | sí | sí | 0 |
| **34** `-2` | 6 | 9 | **no** (2) | sí | 3 |
| **35** `-1` | 13 | 14 | sí | **no** (2) | 2 |
| **35** `-2` | 18 | 11 | **no** (2) | sí | 10 |
| **36** `-1` | 16 | 16 | **no** (2) | sí | 5 |
| **36** `-2` | 11 | 19 | sí | sí | 0 |
| **38** `-1` | 17 | 20 | sí | **no** (2) | 6 |
| **38** `-2` | 14 | 18 | **no** (2) | sí | 6 |
| **39** `-1` | 11 | 9 | **no** (3) | sí | 7 |
| **39** `-2` | 12 | 8 | **no** (2) | **no** (2) | 7 |
| **40** `-1` | 20 | 14 | sí | sí | 0 |
| **40** `-2` | 21 | 16 | **no** (2) | sí | 4 |
| **41** `-1` | 1 | 2 | sí | sí | 0 |
| **41** `-2` | 1 | 3 | sí | **no** (2) | 2 |
| **42** `-1` | 9 | 9 | sí | sí | 0 |
| **42** `-2` | 11 | 9 | sí | sí | 0 |
| **43** `-1` | 2 | 2 | sí | sí | 0 |
| **43** `-2` | 2 | 1 | sí | sí | 0 |
| **44** `-1` | 8 | 4 | sí | sí | 0 |
| **44** `-2` | 6 | 7 | sí | sí | 0 |
| **50** `-1` | 2 | 1 | sí | sí | 0 |
| **50** `-2` | 1 | 1 | sí | sí | 0 |
| **51** `-1` | 5 | 9 | sí | sí | 0 |
| **51** `-2` | 2 | 12 | sí | sí | 0 |
| **52** `-1` | 13 | 11 | sí | **no** (2) | 4 |
| **52** `-2` | 14 | 9 | sí | sí | 0 |
| **53** `-1` | 16 | 11 | sí | sí | 0 |
| **53** `-2` | 14 | 12 | sí | sí | 0 |
| **54** `-1` | 3 | 2 | sí | sí | 0 |
| **54** `-2` | — | — | — | — | *0 filas* |
| **55** `-1` | 17 | 15 | sí | sí | 0 |
| **55** `-2` | — | — | — | — | *0 filas* |
| **56** `-1` | 3 | 7 | sí | sí | 0 |
| **56** `-2` | — | — | — | — | *0 filas* |
| **57** `-1` | 9 | 11 | sí | sí | 0 |
| **57** `-2` | — | — | — | — | *0 filas* |
| **58** `-1` | 1 | 2 | sí | sí | 0 |
| **58** `-2` | — | — | — | — | *0 filas* |
| **59** `-1` | 3 | 7 | sí | sí | 0 |
| **59** `-2` | — | — | — | — | *0 filas* |
| **60** `-1` | 4 | 4 | sí | sí | 0 |
| **60** `-2` | 5 | 5 | sí | sí | 0 |
| **N1** `-1` | — | — | — | — | *0 filas* |
| **N1** `-2` | — | — | — | — | *0 filas* |
| **N2** `-1` | — | — | — | — | *0 filas* |
| **N2** `-2` | — | — | — | — | *0 filas* |
| **N3** `-1` | — | — | — | — | *0 filas* |
| **N3** `-2` | — | — | — | — | *0 filas* |
| **N4** `-1` | — | — | — | — | *0 filas* |
| **N4** `-2` | — | — | — | — | *0 filas* |
| **N5** `-1` | — | — | — | — | *0 filas* |
| **N5** `-2` | — | — | — | — | *0 filas* |
| **N6** `-1` | — | — | — | — | *0 filas* |
| **N6** `-2` | — | — | — | — | *0 filas* |
| **N7** `-1` | — | — | — | — | *0 filas* |
| **N7** `-2` | — | — | — | — | *0 filas* |

---

## Los recuentos que pediste (solo cuenta, sin interpretar)

**Universo:** 88 páginas (44 × 2). **65 sentidos traen tabla**; **23 vienen a 0 filas** (7 búhos ×2 =
14, más 9 líneas cuyo sentido `-2` está vacío). Los recuentos de abajo son sobre los **65 con datos**,
salvo donde se diga otra cosa. Cada sentido con datos tiene **2 tablas** (primeras y últimas): **130
tablas** en total.

**1 · Distribución del nº de filas**

| | mínimo | mediana | máximo |
|---|---:|---:|---:|
| Primeras (65 tablas) | 1 | 8 | 21 |
| Últimas (65 tablas) | 1 | 9 | 22 |
| Las 130 tablas juntas | 1 | 9 | 22 |

- **35 de las 130 tablas** (27 %) tienen **entre 1 y 3 filas**. Solo **5 tablas** pasan de 20.
- **14 de los 65 sentidos** tienen **las dos tablas con ≤ 3 filas** (la línea entera cabe en seis
  renglones): C1, C4, 25, 28, 41, 43, 50, 58 y las lanzaderas/cortas del final.
- El máximo, 22 filas, es la **33** (últimas, ambos sentidos).

**2 · ⭐ ¿Cuántos tienen un único DESDE y un único HASTA?**

- Un solo **DESDE**: **50 de 65**.
- Un solo **HASTA**: **55 de 65**.
- **Un solo DESDE _y_ un solo HASTA a la vez: 46 de 65 (71 %).**

En 7 de cada 10 sentidos con datos, las columnas *Desde* y *Hasta* **repiten el mismo par en cada
fila**. Para casi tres cuartos de la red, esas dos columnas no añaden información fila a fila.

**3 · ⭐ Cuando hay excepción, ¿cuántas filas son y de qué tamaño?**

- **19 de 65 sentidos** tienen al menos una excepción. El reparto va del **7 % al 63 %**.
- **NO siempre es minoría.** Cuatro casos pasan del 40 %:

  | sentido | excepción | | sentido | excepción |
  |---|---:|---|---|---:|
  | **23** `-2` | **63 %** (12/19) | | Ci2 `-2` | 42 % (14/33) |
  | **23** `-1` | **57 %** (12/21) | | 39 (ambos) | 35 % (7/20) |
  | **41** `-2` | **50 %** (2/4) | | 35 `-2` | 34 % (10/29) |

  El resto sí son minoría clara (7–20 %): 33, 35`-1`, 21`-2`, 40`-2`, 36`-1`, 38, 32`-1`, 52`-1`, 34`-2`.
- **¿Reparto 50/50?** Sí, uno exacto: **41 `-2`**, 2 de 4 filas.
- **¿3+ valores distintos en una misma columna?** Uno solo: **39 `-1`**, con **tres orígenes** en la
  columna DESDE (`SAN JOSE 69` · `PINARES DE VENECIA` · `COSO 188`). Ninguna columna HASTA llega a tres:
  el techo en destinos es 2.

**4 · ⚠️ ¿Excepción en DESDE y en HASTA a la vez, dentro de la MISMA tabla?**

**Sí, y en un único caso: la línea 23, en los dos sentidos.** En sus *últimas salidas* varían a la vez
el origen (`PARQUE VENECIA` → `P. PAMPLONA, 12`) **y** el destino (`CDM. SIGLO XXI` → `CLARA CAMPOAMOR`).
Es el caso que rompe cualquier formato de una sola marca por tabla.

La **39** tiene dos orígenes **y** dos destinos en el mismo sentido, pero **repartidos entre las dos
tablas** (el origen alterna en *primeras*, el destino alterna en *últimas*): dentro de una sola tabla,
solo se mueve una columna. Es un caso distinto del de la 23.

**5 · ⚠️ Los casos raros**

- **Circulares Ci1–Ci4:** la web **no** las publica como «mismo sitio de ida y vuelta». Les pone **dos
  terminales distintos** (Ci1: `Estación Delicias` ↔ `Camino Las Torres`; Ci2 igual con excepciones).
  Ci1 y Ci2 traen los **dos** sentidos; **Ci3 y Ci4 solo el `-1`** (el `-2` viene a 0 filas).
- **Lanzaderas C1 y C4:** las dos con ambos sentidos, muy cortas (1–3 filas). La **C1** avisa de que es
  **gratuita** en «Información adicional».
- **Búhos N1–N7:** **los 14 sentidos vienen a 0 filas.** La web responde 200 pero **no publica ningún
  búho** en esta página. No hay primeras ni últimas que recoger.
- **TUR:** **no existe** como línea en la red (las 44 del feed no incluyen ninguna TUR). No se puede
  pedir lo que no está.
- **Líneas con un solo sentido en la web** (el `-2` a 0 filas): **Ci3, Ci4, 30, 54, 55, 56, 57, 58, 59** —
  nueve líneas, todas circulares/lanzadera al tranvía o de sentido único.

**6 · ¿Cuántas líneas traen «Información adicional»?**

**19 de las 44** (no una): **C1, Ci1, Ci2, 23, 29, 34, 36, 38, 39, 40, 44, 50, 51, 54, 55, 56, 57, 58,
59**. Corrige lo que se vio en la muestra pequeña (25/35/38/41), donde solo la 38 la tenía: en la red
entera es casi la mitad de las líneas.

**7 · Longitud de los nombres de terminal**

El más largo mide **20 caracteres**. Hay tres empatados: `CAMINO LAS TORRES, 4`, `ECHEGARAY/MERCADO CE`
y `PZA.EMPERADOR CARLOS`. Los dos últimos **ya vienen truncados por la propia Avanza** (cortados en
seco, sin cerrar la palabra). Lo habitual está entre 10 y 18. Los de 18+:

```
20  CAMINO LAS TORRES, 4      19  ESTACION MIRAFLORES     18  PLAZA LAS CANTERAS
20  ECHEGARAY/MERCADO CE      19  C.B. LLUVIA-TRANVIA      18  COMPLEJO FUNERARIO
20  PZA.EMPERADOR CARLOS      19  P. DE LOS OLVIDADOS      18  PASEO DE LA RIBERA
                             19  AVENIDA ESTUDIANTES       18  PINARES DE VENECIA
                                                          18  ACTUR REY FERNANDO
```

Avanza **ya abrevia** por su cuenta: `Cº`, `P.`, `H. CORTES, 9`, `S.V.PAUL, 3`, números de portal. Lo
que se transcribe aquí es su abreviatura, tal cual.


---

# Tablas por línea

Cada línea, sus dos sentidos. Etiqueta de sentido deducida de la columna *Hasta*. Frecuencia media e «Información adicional», cita literal de Avanza.

---

# LÍNEA C1 · Plaza de Las Canteras - Complejo Funerario

## Sentido `-1` → **Hacia COMPLEJO FUNERARIO**  ·  desde PLAZA LAS CANTERAS

> Frecuencia media: laborables: 15, sábados: 15, domingos y festivos: 15 min.
>
> **Información adicional** (cita literal): «Línea sin costo para los pasajeros. En el recorrido desde Plaza de las Canteras a Cementerio, en la primera parada ubicada en la calle Fray Julián Garcés, solo está permitida la subida de viajeros, y no su bajada.»

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 08:00 | PLAZA LAS CANTERAS | COMPLEJO FUNERARIO |

**Últimas salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 19:45 | PLAZA LAS CANTERAS | COMPLEJO FUNERARIO |

## Sentido `-2` → **Hacia PLAZA LAS CANTERAS**  ·  desde COMPLEJO FUNERARIO

> Frecuencia media: laborables: 15, sábados: 15, domingos y festivos: 15 min.
>
> **Información adicional** (cita literal): «Línea sin costo para los pasajeros. En el recorrido desde Plaza de las Canteras a Cementerio, en la primera parada ubicada en la calle Fray Julián Garcés, solo está permitida la subida de viajeros, y no su bajada.»

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 08:07 | COMPLEJO FUNERARIO | PLAZA LAS CANTERAS |

**Últimas salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 19:52 | COMPLEJO FUNERARIO | PLAZA LAS CANTERAS |


---

# LÍNEA C4 · Plaza de Las Canteras - Puerto Venecia

## Sentido `-1` → **Hacia PUERTO VENECIA**  ·  desde PLAZA CANTERAS

> Frecuencia media: laborables: 17, sábados: 14, domingos y festivos: 30 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 09:15 | PLAZA CANTERAS | PUERTO VENECIA |

**Últimas salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:42 | PLAZA CANTERAS | PUERTO VENECIA |
| 22:00 | PLAZA CANTERAS | PUERTO VENECIA |

## Sentido `-2` → **Hacia PLAZA CANTERAS**  ·  desde PUERTO VENECIA

> Frecuencia media: laborables: 17, sábados: 14, domingos y festivos: 30 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 09:30 | PUERTO VENECIA | PLAZA CANTERAS |

**Últimas salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:43 | PUERTO VENECIA | PLAZA CANTERAS |
| 21:59 | PUERTO VENECIA | PLAZA CANTERAS |
| 22:15 | PUERTO VENECIA | PLAZA CANTERAS |


---

# LÍNEA Ci1 · Circular 1

## Sentido `-1` → **Hacia ESTACION DELICIAS**  ·  desde CAMINO LAS TORRES, 4

> Frecuencia media: laborables: 8, sábados: 10, domingos y festivos: 10 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. En los puntos de regulación fijados en Avda. de Las Torres y en la estación de Delicias, los usuarios podrán permanecer en el interior del bus con el mismo título de transporte.»

**Primeras salidas** · 5 filas únicas (de 5 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:10 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |
| 06:30 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |
| 06:50 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |
| 07:10 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |
| 07:20 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |

**Últimas salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 23:02 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |
| 23:23 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |
| 23:40 | CAMINO LAS TORRES, 4 | ESTACION DELICIAS |

## Sentido `-2` → **Hacia CAMINO LAS TORRES, 4**  ·  desde ESTACION DELICIAS

> Frecuencia media: laborables: 8, sábados: 10, domingos y festivos: 10 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. En los puntos de regulación fijados en Avda. de Las Torres y en la estación de Delicias, los usuarios podrán permanecer en el interior del bus con el mismo título de transporte.»

**Primeras salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:39 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 06:59 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 07:19 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |

**Últimas salidas** · 6 filas únicas (de 6 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:47 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 22:57 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 23:10 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 23:27 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 23:48 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |
| 00:05 | ESTACION DELICIAS | CAMINO LAS TORRES, 4 |


---

# LÍNEA Ci2 · Circular 2

## Sentido `-1` → **Hacia ESTACIÓN DELICIAS**  ·  desde CAMINO LAS TORRES

> Frecuencia media: laborables: 9, sábados: 11, domingos y festivos: 13 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. En los puntos de regulación fijados en Avda. de Las Torres frente Silvestre Pérez, y en la estación de Delicias, los usuarios podrán permanecer en el interior del bus con el mismo título de transporte. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El viaje de retirada a cocheras se realiza desde la parada de Camino de Las Torres 3.»

**Primeras salidas** · 15 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:10 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 06:32 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 06:54 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 07:11 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 07:23 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 07:34 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 07:45 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 07:56 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:06 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:14 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:22 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:31 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:39 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:48 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 08:57 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |

**Últimas salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:00 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 21:09 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 21:18 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 21:28 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 21:38 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 21:49 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 22:02 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 22:16 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 22:31 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 22:46 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 23:09 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |
| 23:29 | CAMINO LAS TORRES | ESTACIÓN DELICIAS |

## Sentido `-2` → **Hacia CAMINO LAS TORRES**  ·  desde 2 orígenes

> Frecuencia media: laborables: 9, sábados: 11, domingos y festivos: 13 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. En los puntos de regulación fijados en Avda. de Las Torres frente Silvestre Pérez, y en la estación de Delicias, los usuarios podrán permanecer en el interior del bus con el mismo título de transporte. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El viaje de retirada a cocheras se realiza desde la parada de Camino de Las Torres 3.»

⚠️ No es un único origen/destino: DESDE {Cº LAS TORRES 3 · ESTACIÓN DELICIAS} — HASTA {CAMINO LAS TORRES · Cº LAS TORRES 3}. 14 fila(s) de excepción.

**Primeras salidas** · 18 filas únicas (de 18 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:08 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 06:30 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 06:40 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 06:52 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 07:02 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 07:21 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 07:24 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 07:41 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 07:43 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 07:53 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 08:04 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 08:05 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 08:16 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 08:16 | Cº LAS TORRES 3 | CAMINO LAS TORRES |
| 08:26 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 08:35 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 08:44 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 08:52 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |

**Últimas salidas** · 15 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:05 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 21:14 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 21:22 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |
| 21:30 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 21:38 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |
| 21:47 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 21:57 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 22:07 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 22:17 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |
| 22:29 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |
| 22:42 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 22:59 | ESTACIÓN DELICIAS | CAMINO LAS TORRES |
| 23:16 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |
| 23:34 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |
| 23:54 | ESTACIÓN DELICIAS | Cº LAS TORRES 3 |


---

# LÍNEA Ci3 · Circular 3

## Sentido `-1` → **Hacia LAS FUENTES**  ·  desde LAS FUENTES

> Frecuencia media: laborables: 8, sábados: 14, domingos y festivos: 17 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:05 | LAS FUENTES | LAS FUENTES |
| 05:25 | LAS FUENTES | LAS FUENTES |
| 05:45 | LAS FUENTES | LAS FUENTES |
| 05:58 | LAS FUENTES | LAS FUENTES |
| 06:10 | LAS FUENTES | LAS FUENTES |
| 06:20 | LAS FUENTES | LAS FUENTES |
| 06:30 | LAS FUENTES | LAS FUENTES |
| 06:40 | LAS FUENTES | LAS FUENTES |
| 06:50 | LAS FUENTES | LAS FUENTES |
| 07:01 | LAS FUENTES | LAS FUENTES |
| 07:09 | LAS FUENTES | LAS FUENTES |

**Últimas salidas** · 13 filas únicas (de 13 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:36 | LAS FUENTES | LAS FUENTES |
| 20:45 | LAS FUENTES | LAS FUENTES |
| 20:55 | LAS FUENTES | LAS FUENTES |
| 21:05 | LAS FUENTES | LAS FUENTES |
| 21:14 | LAS FUENTES | LAS FUENTES |
| 21:23 | LAS FUENTES | LAS FUENTES |
| 21:34 | LAS FUENTES | LAS FUENTES |
| 21:47 | LAS FUENTES | LAS FUENTES |
| 22:01 | LAS FUENTES | LAS FUENTES |
| 22:15 | LAS FUENTES | LAS FUENTES |
| 22:30 | LAS FUENTES | LAS FUENTES |
| 22:50 | LAS FUENTES | LAS FUENTES |
| 23:15 | LAS FUENTES | LAS FUENTES |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA Ci4 · Circular 4

## Sentido `-1` → **Hacia PASEO DE LA RIBERA**  ·  desde PASEO DE LA RIBERA

> Frecuencia media: laborables: 7, sábados: 14, domingos y festivos: 17 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 10 filas únicas (de 10 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:05 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 05:25 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 05:40 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 05:52 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 06:04 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 06:15 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 06:26 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 06:37 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 06:47 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 06:56 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |

**Últimas salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:37 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 20:47 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 20:57 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 21:08 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 21:20 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 21:33 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 21:48 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 22:03 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 22:22 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 22:42 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 23:08 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |
| 23:30 | PASEO DE LA RIBERA | PASEO DE LA RIBERA |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 21 · Barrio Jesús - Oliver - Miralbueno

## Sentido `-1` → **Hacia MIRALBUENO**  ·  desde 2 orígenes

> Frecuencia media: laborables: 7, sábados: 13, domingos y festivos: 14 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {Bº JESUS · P. MINA} — HASTA {MIRALBUENO · S.V.PAUL, 3}. 5 fila(s) de excepción.

**Primeras salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:10 | Bº JESUS | MIRALBUENO |
| 05:33 | Bº JESUS | MIRALBUENO |
| 05:56 | Bº JESUS | MIRALBUENO |
| 06:19 | Bº JESUS | MIRALBUENO |
| 06:19 | P. MINA | MIRALBUENO |
| 06:41 | Bº JESUS | MIRALBUENO |
| 06:43 | P. MINA | MIRALBUENO |
| 07:03 | P. MINA | MIRALBUENO |
| 07:04 | Bº JESUS | MIRALBUENO |

**Últimas salidas** · 10 filas únicas (de 10 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:30 | Bº JESUS | MIRALBUENO |
| 21:41 | Bº JESUS | MIRALBUENO |
| 21:54 | Bº JESUS | MIRALBUENO |
| 22:10 | Bº JESUS | MIRALBUENO |
| 22:31 | Bº JESUS | MIRALBUENO |
| 22:58 | Bº JESUS | MIRALBUENO |
| 23:20 | Bº JESUS | MIRALBUENO |
| 23:43 | Bº JESUS | MIRALBUENO |
| 00:05 | Bº JESUS | S.V.PAUL, 3 |
| 00:32 | Bº JESUS | S.V.PAUL, 3 |

## Sentido `-2` → **Hacia Bº JESUS**  ·  desde 2 orígenes

> Frecuencia media: laborables: 7, sábados: 13, domingos y festivos: 14 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {COSO, 126 · MIRALBUENO} — HASTA {Bº JESUS}. 2 fila(s) de excepción.

**Primeras salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:55 | COSO, 126 | Bº JESUS |
| 05:10 | MIRALBUENO | Bº JESUS |
| 05:33 | MIRALBUENO | Bº JESUS |
| 05:55 | MIRALBUENO | Bº JESUS |
| 06:18 | MIRALBUENO | Bº JESUS |
| 06:41 | MIRALBUENO | Bº JESUS |
| 06:53 | MIRALBUENO | Bº JESUS |
| 06:59 | COSO, 126 | Bº JESUS |
| 07:05 | MIRALBUENO | Bº JESUS |

**Últimas salidas** · 10 filas únicas (de 10 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:29 | MIRALBUENO | Bº JESUS |
| 21:40 | MIRALBUENO | Bº JESUS |
| 21:51 | MIRALBUENO | Bº JESUS |
| 22:03 | MIRALBUENO | Bº JESUS |
| 22:15 | MIRALBUENO | Bº JESUS |
| 22:31 | MIRALBUENO | Bº JESUS |
| 22:46 | MIRALBUENO | Bº JESUS |
| 23:01 | MIRALBUENO | Bº JESUS |
| 23:22 | MIRALBUENO | Bº JESUS |
| 23:50 | MIRALBUENO | Bº JESUS |


---

# LÍNEA 22 · Las Fuentes - Bombarda

## Sentido `-1` → **Hacia BOMBARDA**  ·  desde LAS FUENTES

> Frecuencia media: laborables: 11, sábados: 16, domingos y festivos: 20 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 10 filas únicas (de 10 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:03 | LAS FUENTES | BOMBARDA |
| 05:30 | LAS FUENTES | BOMBARDA |
| 05:50 | LAS FUENTES | BOMBARDA |
| 06:10 | LAS FUENTES | BOMBARDA |
| 06:30 | LAS FUENTES | BOMBARDA |
| 06:45 | LAS FUENTES | BOMBARDA |
| 07:01 | LAS FUENTES | BOMBARDA |
| 07:18 | LAS FUENTES | BOMBARDA |
| 07:35 | LAS FUENTES | BOMBARDA |
| 07:50 | LAS FUENTES | BOMBARDA |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:02 | LAS FUENTES | BOMBARDA |
| 21:16 | LAS FUENTES | BOMBARDA |
| 21:32 | LAS FUENTES | BOMBARDA |
| 21:50 | LAS FUENTES | BOMBARDA |
| 22:09 | LAS FUENTES | BOMBARDA |
| 22:28 | LAS FUENTES | BOMBARDA |
| 22:50 | LAS FUENTES | BOMBARDA |
| 23:11 | LAS FUENTES | BOMBARDA |
| 23:39 | LAS FUENTES | BOMBARDA |

## Sentido `-2` → **Hacia LAS FUENTES**  ·  desde BOMBARDA

> Frecuencia media: laborables: 11, sábados: 16, domingos y festivos: 20 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 8 filas únicas (de 8 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:46 | BOMBARDA | LAS FUENTES |
| 06:13 | BOMBARDA | LAS FUENTES |
| 06:33 | BOMBARDA | LAS FUENTES |
| 06:51 | BOMBARDA | LAS FUENTES |
| 07:13 | BOMBARDA | LAS FUENTES |
| 07:29 | BOMBARDA | LAS FUENTES |
| 07:42 | BOMBARDA | LAS FUENTES |
| 07:55 | BOMBARDA | LAS FUENTES |

**Últimas salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:02 | BOMBARDA | LAS FUENTES |
| 21:14 | BOMBARDA | LAS FUENTES |
| 21:27 | BOMBARDA | LAS FUENTES |
| 21:41 | BOMBARDA | LAS FUENTES |
| 21:54 | BOMBARDA | LAS FUENTES |
| 22:07 | BOMBARDA | LAS FUENTES |
| 22:22 | BOMBARDA | LAS FUENTES |
| 22:39 | BOMBARDA | LAS FUENTES |
| 22:55 | BOMBARDA | LAS FUENTES |
| 23:15 | BOMBARDA | LAS FUENTES |
| 23:40 | BOMBARDA | LAS FUENTES |
| 00:23 | BOMBARDA | LAS FUENTES |


---

# LÍNEA 23 · Parque Venecia - Siglo XXI

## Sentido `-1` → **Hacia CLARA CAMPOAMOR**  ·  desde 2 orígenes

> Frecuencia media: laborables: 8, sábados: 10, domingos y festivos: 14 min.
>
> **Información adicional** (cita literal): «Realiza terminal en José Atarés (Pabellón Siglo XXI) en las siguientes franjas horarias: * Laborables – 6:42h primera salida de Pabellón Siglo XXI a 22:58h última salida de Pabellón Siglo XXI. * Sábados – 7:26h primera salida de Pabellón Siglo XXI a 20:23h última salida de Pabellón Siglo XXI. * Festivos y domingos – 7:46h primera salida de Pabellón Siglo XXI a 14:23h última salida de Pabellón Siglo XXI. En el resto de horarios, la línea realiza terminal en Clara Campoamor / Centro Comercial Gran Casa.»

⚠️ No es un único origen/destino: DESDE {P. PAMPLONA, 12 · PARQUE VENECIA} — HASTA {CLARA CAMPOAMOR · CDM. SIGLO XXI}. 12 fila(s) de excepción.

**Primeras salidas** · 6 filas únicas (de 6 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:51 | P. PAMPLONA, 12 | CLARA CAMPOAMOR |
| 05:15 | P. PAMPLONA, 12 | CLARA CAMPOAMOR |
| 05:15 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 05:45 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 06:10 | PARQUE VENECIA | CDM. SIGLO XXI |
| 06:35 | PARQUE VENECIA | CDM. SIGLO XXI |

**Últimas salidas** · 15 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:20 | PARQUE VENECIA | CDM. SIGLO XXI |
| 21:32 | PARQUE VENECIA | CDM. SIGLO XXI |
| 21:44 | PARQUE VENECIA | CDM. SIGLO XXI |
| 21:56 | PARQUE VENECIA | CDM. SIGLO XXI |
| 22:08 | PARQUE VENECIA | CDM. SIGLO XXI |
| 22:20 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 22:32 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 22:46 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 23:02 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 23:16 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 23:30 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 00:00 | PARQUE VENECIA | CLARA CAMPOAMOR |
| 00:10 | P. PAMPLONA, 12 | CLARA CAMPOAMOR |
| 00:40 | P. PAMPLONA, 12 | CLARA CAMPOAMOR |
| 01:10 | P. PAMPLONA, 12 | CLARA CAMPOAMOR |

## Sentido `-2` → **Hacia PARQUE VENECIA**  ·  desde 2 orígenes

> Frecuencia media: laborables: 8, sábados: 10, domingos y festivos: 14 min.
>
> **Información adicional** (cita literal): «Realiza terminal en José Atarés (Pabellón Siglo XXI) en las siguientes franjas horarias: * Laborables – 6:42h primera salida de Pabellón Siglo XXI a 22:58h última salida de Pabellón Siglo XXI. * Sábados – 7:26h primera salida de Pabellón Siglo XXI a 20:23h última salida de Pabellón Siglo XXI. * Festivos y domingos – 7:46h primera salida de Pabellón Siglo XXI a 14:23h última salida de Pabellón Siglo XXI. En el resto de horarios, la línea realiza terminal en Clara Campoamor / Centro Comercial Gran Casa.»

⚠️ No es un único origen/destino: DESDE {CLARA CAMPOAMOR · CDM. SIGLO XXI} — HASTA {PARQUE VENECIA · P. PAMPLONA, 12}. 12 fila(s) de excepción.

**Primeras salidas** · 4 filas únicas (de 4 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:05 | CLARA CAMPOAMOR | PARQUE VENECIA |
| 05:30 | CLARA CAMPOAMOR | PARQUE VENECIA |
| 05:55 | CLARA CAMPOAMOR | PARQUE VENECIA |
| 06:25 | CLARA CAMPOAMOR | PARQUE VENECIA |

**Últimas salidas** · 15 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:16 | CDM. SIGLO XXI | PARQUE VENECIA |
| 21:28 | CDM. SIGLO XXI | PARQUE VENECIA |
| 21:41 | CDM. SIGLO XXI | PARQUE VENECIA |
| 21:54 | CDM. SIGLO XXI | PARQUE VENECIA |
| 22:07 | CDM. SIGLO XXI | PARQUE VENECIA |
| 22:19 | CDM. SIGLO XXI | PARQUE VENECIA |
| 22:31 | CDM. SIGLO XXI | PARQUE VENECIA |
| 22:44 | CDM. SIGLO XXI | PARQUE VENECIA |
| 22:56 | CDM. SIGLO XXI | PARQUE VENECIA |
| 23:10 | CLARA CAMPOAMOR | PARQUE VENECIA |
| 23:23 | CLARA CAMPOAMOR | PARQUE VENECIA |
| 23:38 | CLARA CAMPOAMOR | PARQUE VENECIA |
| 23:52 | CLARA CAMPOAMOR | P. PAMPLONA, 12 |
| 00:25 | CLARA CAMPOAMOR | P. PAMPLONA, 12 |
| 00:55 | CLARA CAMPOAMOR | P. PAMPLONA, 12 |


---

# LÍNEA 25 · La Cartuja - Puerta del Carmen

## Sentido `-1` → **Hacia PUERTA DEL CARMEN**  ·  desde LA CARTUJA

> Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:45 | LA CARTUJA | PUERTA DEL CARMEN |
| 06:10 | LA CARTUJA | PUERTA DEL CARMEN |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:29 | LA CARTUJA | PUERTA DEL CARMEN |
| 21:41 | LA CARTUJA | PUERTA DEL CARMEN |
| 21:54 | LA CARTUJA | PUERTA DEL CARMEN |
| 22:16 | LA CARTUJA | PUERTA DEL CARMEN |
| 22:38 | LA CARTUJA | PUERTA DEL CARMEN |
| 23:02 | LA CARTUJA | PUERTA DEL CARMEN |
| 23:21 | LA CARTUJA | PUERTA DEL CARMEN |
| 23:47 | LA CARTUJA | PUERTA DEL CARMEN |
| 00:07 | LA CARTUJA | PUERTA DEL CARMEN |

## Sentido `-2` → **Hacia LA CARTUJA**  ·  desde PUERTA DEL CARMEN

> Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:25 | PUERTA DEL CARMEN | LA CARTUJA |
| 06:10 | PUERTA DEL CARMEN | LA CARTUJA |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:30 | PUERTA DEL CARMEN | LA CARTUJA |
| 21:53 | PUERTA DEL CARMEN | LA CARTUJA |
| 22:15 | PUERTA DEL CARMEN | LA CARTUJA |
| 22:39 | PUERTA DEL CARMEN | LA CARTUJA |
| 22:59 | PUERTA DEL CARMEN | LA CARTUJA |
| 23:24 | PUERTA DEL CARMEN | LA CARTUJA |
| 23:43 | PUERTA DEL CARMEN | LA CARTUJA |
| 00:10 | PUERTA DEL CARMEN | LA CARTUJA |
| 00:30 | PUERTA DEL CARMEN | LA CARTUJA |


---

# LÍNEA 28 · Coso - Montañana/Peñaflor

## Sentido `-1` → **Hacia PEÑAFLOR**  ·  desde P. ECHEGARAY

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:25 | P. ECHEGARAY | PEÑAFLOR |
| 05:55 | P. ECHEGARAY | PEÑAFLOR |

**Últimas salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 23:15 | P. ECHEGARAY | PEÑAFLOR |

## Sentido `-2` → **Hacia P. ECHEGARAY**  ·  desde PEÑAFLOR

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:00 | PEÑAFLOR | P. ECHEGARAY |

**Últimas salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 23:00 | PEÑAFLOR | P. ECHEGARAY |
| 23:30 | PEÑAFLOR | P. ECHEGARAY |
| 00:00 | PEÑAFLOR | P. ECHEGARAY |


---

# LÍNEA 29 · Camino de Las Torres - San Gregorio

## Sentido `-1` → **Hacia SAN GREGORIO**  ·  desde CAMINO LAS TORRES

> Frecuencia media: laborables: 14, sábados: 17, domingos y festivos: 17 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Camino de Las Torres podrá realizarse desde la parada de la Autovía de Huesca.»

**Primeras salidas** · 7 filas únicas (de 7 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:30 | CAMINO LAS TORRES | SAN GREGORIO |
| 05:50 | CAMINO LAS TORRES | SAN GREGORIO |
| 06:15 | CAMINO LAS TORRES | SAN GREGORIO |
| 06:31 | CAMINO LAS TORRES | SAN GREGORIO |
| 06:52 | CAMINO LAS TORRES | SAN GREGORIO |
| 07:16 | CAMINO LAS TORRES | SAN GREGORIO |
| 07:29 | CAMINO LAS TORRES | SAN GREGORIO |

**Últimas salidas** · 7 filas únicas (de 7 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:13 | CAMINO LAS TORRES | SAN GREGORIO |
| 21:34 | CAMINO LAS TORRES | SAN GREGORIO |
| 21:48 | CAMINO LAS TORRES | SAN GREGORIO |
| 22:02 | CAMINO LAS TORRES | SAN GREGORIO |
| 22:16 | CAMINO LAS TORRES | SAN GREGORIO |
| 22:37 | CAMINO LAS TORRES | SAN GREGORIO |
| 23:03 | CAMINO LAS TORRES | SAN GREGORIO |

## Sentido `-2` → **Hacia CAMINO LAS TORRES**  ·  desde SAN GREGORIO

> Frecuencia media: laborables: 14, sábados: 17, domingos y festivos: 17 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Camino de Las Torres podrá realizarse desde la parada de la Autovía de Huesca.»

**Primeras salidas** · 5 filas únicas (de 5 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:59 | SAN GREGORIO | CAMINO LAS TORRES |
| 06:20 | SAN GREGORIO | CAMINO LAS TORRES |
| 06:45 | SAN GREGORIO | CAMINO LAS TORRES |
| 07:04 | SAN GREGORIO | CAMINO LAS TORRES |
| 07:22 | SAN GREGORIO | CAMINO LAS TORRES |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:16 | SAN GREGORIO | CAMINO LAS TORRES |
| 21:29 | SAN GREGORIO | CAMINO LAS TORRES |
| 21:44 | SAN GREGORIO | CAMINO LAS TORRES |
| 22:07 | SAN GREGORIO | CAMINO LAS TORRES |
| 22:23 | SAN GREGORIO | CAMINO LAS TORRES |
| 22:33 | SAN GREGORIO | CAMINO LAS TORRES |
| 22:47 | SAN GREGORIO | CAMINO LAS TORRES |
| 23:10 | SAN GREGORIO | CAMINO LAS TORRES |
| 23:33 | SAN GREGORIO | CAMINO LAS TORRES |


---

# LÍNEA 30 · Las Fuentes - Plaza Aragón

## Sentido `-1` → **Hacia LAS FUENTES**  ·  desde LAS FUENTES

> Frecuencia media: laborables: 8, sábados: 9, domingos y festivos: 10 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:00 | LAS FUENTES | LAS FUENTES |
| 05:15 | LAS FUENTES | LAS FUENTES |
| 05:30 | LAS FUENTES | LAS FUENTES |
| 05:46 | LAS FUENTES | LAS FUENTES |
| 06:00 | LAS FUENTES | LAS FUENTES |
| 06:15 | LAS FUENTES | LAS FUENTES |
| 06:28 | LAS FUENTES | LAS FUENTES |
| 06:45 | LAS FUENTES | LAS FUENTES |
| 07:00 | LAS FUENTES | LAS FUENTES |
| 07:08 | LAS FUENTES | LAS FUENTES |
| 07:19 | LAS FUENTES | LAS FUENTES |
| 07:27 | LAS FUENTES | LAS FUENTES |
| 07:35 | LAS FUENTES | LAS FUENTES |
| 07:44 | LAS FUENTES | LAS FUENTES |

**Últimas salidas** · 20 filas únicas (de 20 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:52 | LAS FUENTES | LAS FUENTES |
| 21:01 | LAS FUENTES | LAS FUENTES |
| 21:09 | LAS FUENTES | LAS FUENTES |
| 21:18 | LAS FUENTES | LAS FUENTES |
| 21:26 | LAS FUENTES | LAS FUENTES |
| 21:34 | LAS FUENTES | LAS FUENTES |
| 21:42 | LAS FUENTES | LAS FUENTES |
| 21:50 | LAS FUENTES | LAS FUENTES |
| 21:59 | LAS FUENTES | LAS FUENTES |
| 22:07 | LAS FUENTES | LAS FUENTES |
| 22:14 | LAS FUENTES | LAS FUENTES |
| 22:22 | LAS FUENTES | LAS FUENTES |
| 22:30 | LAS FUENTES | LAS FUENTES |
| 22:38 | LAS FUENTES | LAS FUENTES |
| 22:51 | LAS FUENTES | LAS FUENTES |
| 22:59 | LAS FUENTES | LAS FUENTES |
| 23:26 | LAS FUENTES | LAS FUENTES |
| 00:00 | LAS FUENTES | LAS FUENTES |
| 00:30 | LAS FUENTES | LAS FUENTES |
| 01:00 | LAS FUENTES | LAS FUENTES |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 31 · Puerto Venecia - Aljafería

## Sentido `-1` → **Hacia ALJAFERIA**  ·  desde PUERTO VENECIA

> Frecuencia media: laborables: 12, sábados: 14, domingos y festivos: 21 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:20 | PUERTO VENECIA | ALJAFERIA |
| 05:53 | PUERTO VENECIA | ALJAFERIA |
| 06:23 | PUERTO VENECIA | ALJAFERIA |
| 06:44 | PUERTO VENECIA | ALJAFERIA |
| 07:05 | PUERTO VENECIA | ALJAFERIA |
| 07:26 | PUERTO VENECIA | ALJAFERIA |
| 07:45 | PUERTO VENECIA | ALJAFERIA |
| 08:01 | PUERTO VENECIA | ALJAFERIA |
| 08:17 | PUERTO VENECIA | ALJAFERIA |

**Últimas salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:59 | PUERTO VENECIA | ALJAFERIA |
| 21:15 | PUERTO VENECIA | ALJAFERIA |
| 21:30 | PUERTO VENECIA | ALJAFERIA |
| 21:45 | PUERTO VENECIA | ALJAFERIA |
| 21:59 | PUERTO VENECIA | ALJAFERIA |
| 22:13 | PUERTO VENECIA | ALJAFERIA |
| 22:27 | PUERTO VENECIA | ALJAFERIA |
| 22:41 | PUERTO VENECIA | ALJAFERIA |
| 22:55 | PUERTO VENECIA | ALJAFERIA |
| 23:09 | PUERTO VENECIA | ALJAFERIA |
| 23:22 | PUERTO VENECIA | ALJAFERIA |
| 23:35 | PUERTO VENECIA | ALJAFERIA |

## Sentido `-2` → **Hacia PUERTO VENECIA**  ·  desde ALJAFERIA

> Frecuencia media: laborables: 12, sábados: 14, domingos y festivos: 21 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 10 filas únicas (de 10 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:20 | ALJAFERIA | PUERTO VENECIA |
| 05:51 | ALJAFERIA | PUERTO VENECIA |
| 06:12 | ALJAFERIA | PUERTO VENECIA |
| 06:33 | ALJAFERIA | PUERTO VENECIA |
| 06:54 | ALJAFERIA | PUERTO VENECIA |
| 07:10 | ALJAFERIA | PUERTO VENECIA |
| 07:26 | ALJAFERIA | PUERTO VENECIA |
| 07:42 | ALJAFERIA | PUERTO VENECIA |
| 07:58 | ALJAFERIA | PUERTO VENECIA |
| 08:17 | ALJAFERIA | PUERTO VENECIA |

**Últimas salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:52 | ALJAFERIA | PUERTO VENECIA |
| 21:07 | ALJAFERIA | PUERTO VENECIA |
| 21:21 | ALJAFERIA | PUERTO VENECIA |
| 21:35 | ALJAFERIA | PUERTO VENECIA |
| 21:50 | ALJAFERIA | PUERTO VENECIA |
| 22:05 | ALJAFERIA | PUERTO VENECIA |
| 22:20 | ALJAFERIA | PUERTO VENECIA |
| 22:34 | ALJAFERIA | PUERTO VENECIA |
| 22:48 | ALJAFERIA | PUERTO VENECIA |
| 23:02 | ALJAFERIA | PUERTO VENECIA |
| 23:15 | ALJAFERIA | PUERTO VENECIA |
| 23:28 | ALJAFERIA | PUERTO VENECIA |
| 23:41 | ALJAFERIA | PUERTO VENECIA |
| 23:54 | ALJAFERIA | PUERTO VENECIA |


---

# LÍNEA 32 · Santa Isabel - Bombarda

## Sentido `-1` → **Hacia BOMBARDA**  ·  desde 2 orígenes

> Frecuencia media: laborables: 10, sábados: 15, domingos y festivos: 15 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {PLAZA ESPAÑA · SANTA ISABEL} — HASTA {BOMBARDA · PLAZA ARAGON}. 5 fila(s) de excepción.

**Primeras salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:00 | PLAZA ESPAÑA | BOMBARDA |
| 05:15 | SANTA ISABEL | BOMBARDA |
| 05:49 | SANTA ISABEL | BOMBARDA |
| 05:57 | PLAZA ESPAÑA | BOMBARDA |
| 06:04 | SANTA ISABEL | BOMBARDA |
| 06:18 | SANTA ISABEL | BOMBARDA |
| 06:32 | SANTA ISABEL | BOMBARDA |
| 06:46 | SANTA ISABEL | BOMBARDA |
| 07:00 | SANTA ISABEL | BOMBARDA |
| 07:14 | SANTA ISABEL | BOMBARDA |
| 07:29 | SANTA ISABEL | BOMBARDA |
| 07:32 | PLAZA ESPAÑA | BOMBARDA |
| 07:44 | SANTA ISABEL | BOMBARDA |
| 07:56 | SANTA ISABEL | BOMBARDA |

**Últimas salidas** · 15 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:42 | SANTA ISABEL | BOMBARDA |
| 20:56 | SANTA ISABEL | BOMBARDA |
| 21:11 | SANTA ISABEL | BOMBARDA |
| 21:27 | SANTA ISABEL | BOMBARDA |
| 21:44 | SANTA ISABEL | BOMBARDA |
| 22:00 | SANTA ISABEL | BOMBARDA |
| 22:15 | SANTA ISABEL | BOMBARDA |
| 22:30 | SANTA ISABEL | BOMBARDA |
| 22:50 | SANTA ISABEL | BOMBARDA |
| 23:11 | SANTA ISABEL | BOMBARDA |
| 23:31 | SANTA ISABEL | BOMBARDA |
| 23:50 | SANTA ISABEL | BOMBARDA |
| 00:22 | SANTA ISABEL | BOMBARDA |
| 00:46 | SANTA ISABEL | PLAZA ARAGON |
| 01:22 | SANTA ISABEL | PLAZA ARAGON |

## Sentido `-2` → **Hacia SANTA ISABEL**  ·  desde BOMBARDA

> Frecuencia media: laborables: 10, sábados: 15, domingos y festivos: 15 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:00 | BOMBARDA | SANTA ISABEL |
| 05:27 | BOMBARDA | SANTA ISABEL |
| 05:55 | BOMBARDA | SANTA ISABEL |
| 06:10 | BOMBARDA | SANTA ISABEL |
| 06:25 | BOMBARDA | SANTA ISABEL |
| 06:40 | BOMBARDA | SANTA ISABEL |
| 06:55 | BOMBARDA | SANTA ISABEL |
| 07:10 | BOMBARDA | SANTA ISABEL |
| 07:24 | BOMBARDA | SANTA ISABEL |
| 07:39 | BOMBARDA | SANTA ISABEL |
| 07:54 | BOMBARDA | SANTA ISABEL |

**Últimas salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:38 | BOMBARDA | SANTA ISABEL |
| 20:49 | BOMBARDA | SANTA ISABEL |
| 21:02 | BOMBARDA | SANTA ISABEL |
| 21:18 | BOMBARDA | SANTA ISABEL |
| 21:36 | BOMBARDA | SANTA ISABEL |
| 21:50 | BOMBARDA | SANTA ISABEL |
| 22:04 | BOMBARDA | SANTA ISABEL |
| 22:18 | BOMBARDA | SANTA ISABEL |
| 22:36 | BOMBARDA | SANTA ISABEL |
| 22:56 | BOMBARDA | SANTA ISABEL |
| 23:16 | BOMBARDA | SANTA ISABEL |
| 23:36 | BOMBARDA | SANTA ISABEL |
| 00:00 | BOMBARDA | SANTA ISABEL |
| 00:36 | BOMBARDA | SANTA ISABEL |


---

# LÍNEA 33 · Pinares de Venecia - Delicias

## Sentido `-1` → **Hacia DELICIAS**  ·  desde 2 orígenes

> Frecuencia media: laborables: 6, sábados: 11, domingos y festivos: 13 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {P.PAMPLONA, 4 · PINARES DE VENECIA} — HASTA {DELICIAS}. 3 fila(s) de excepción.

**Primeras salidas** · 21 filas únicas (de 21 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:44 | P.PAMPLONA, 4 | DELICIAS |
| 05:00 | PINARES DE VENECIA | DELICIAS |
| 05:01 | P.PAMPLONA, 4 | DELICIAS |
| 05:19 | PINARES DE VENECIA | DELICIAS |
| 05:37 | PINARES DE VENECIA | DELICIAS |
| 05:55 | PINARES DE VENECIA | DELICIAS |
| 06:12 | PINARES DE VENECIA | DELICIAS |
| 06:30 | PINARES DE VENECIA | DELICIAS |
| 06:32 | P.PAMPLONA, 4 | DELICIAS |
| 06:42 | PINARES DE VENECIA | DELICIAS |
| 06:54 | PINARES DE VENECIA | DELICIAS |
| 07:06 | PINARES DE VENECIA | DELICIAS |
| 07:16 | PINARES DE VENECIA | DELICIAS |
| 07:26 | PINARES DE VENECIA | DELICIAS |
| 07:35 | PINARES DE VENECIA | DELICIAS |
| 07:43 | PINARES DE VENECIA | DELICIAS |
| 07:52 | PINARES DE VENECIA | DELICIAS |
| 08:01 | PINARES DE VENECIA | DELICIAS |
| 08:08 | PINARES DE VENECIA | DELICIAS |
| 08:16 | PINARES DE VENECIA | DELICIAS |
| 08:24 | PINARES DE VENECIA | DELICIAS |

**Últimas salidas** · 21 filas únicas (de 21 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:35 | PINARES DE VENECIA | DELICIAS |
| 20:44 | PINARES DE VENECIA | DELICIAS |
| 20:54 | PINARES DE VENECIA | DELICIAS |
| 21:04 | PINARES DE VENECIA | DELICIAS |
| 21:14 | PINARES DE VENECIA | DELICIAS |
| 21:24 | PINARES DE VENECIA | DELICIAS |
| 21:34 | PINARES DE VENECIA | DELICIAS |
| 21:43 | PINARES DE VENECIA | DELICIAS |
| 21:52 | PINARES DE VENECIA | DELICIAS |
| 22:02 | PINARES DE VENECIA | DELICIAS |
| 22:12 | PINARES DE VENECIA | DELICIAS |
| 22:23 | PINARES DE VENECIA | DELICIAS |
| 22:34 | PINARES DE VENECIA | DELICIAS |
| 22:46 | PINARES DE VENECIA | DELICIAS |
| 22:59 | PINARES DE VENECIA | DELICIAS |
| 23:13 | PINARES DE VENECIA | DELICIAS |
| 23:28 | PINARES DE VENECIA | DELICIAS |
| 23:51 | PINARES DE VENECIA | DELICIAS |
| 00:12 | PINARES DE VENECIA | DELICIAS |
| 00:32 | PINARES DE VENECIA | DELICIAS |
| 01:02 | PINARES DE VENECIA | DELICIAS |

## Sentido `-2` → **Hacia PINARES DE VENECIA**  ·  desde 2 orígenes

> Frecuencia media: laborables: 6, sábados: 11, domingos y festivos: 13 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {P.PAMPLONA 1 · DELICIAS} — HASTA {PINARES DE VENECIA}. 3 fila(s) de excepción.

**Primeras salidas** · 21 filas únicas (de 21 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:44 | P.PAMPLONA 1 | PINARES DE VENECIA |
| 05:00 | DELICIAS | PINARES DE VENECIA |
| 05:04 | P.PAMPLONA 1 | PINARES DE VENECIA |
| 05:18 | DELICIAS | PINARES DE VENECIA |
| 05:35 | DELICIAS | PINARES DE VENECIA |
| 05:53 | DELICIAS | PINARES DE VENECIA |
| 06:11 | DELICIAS | PINARES DE VENECIA |
| 06:29 | DELICIAS | PINARES DE VENECIA |
| 06:46 | DELICIAS | PINARES DE VENECIA |
| 06:57 | DELICIAS | PINARES DE VENECIA |
| 06:59 | P.PAMPLONA 1 | PINARES DE VENECIA |
| 07:07 | DELICIAS | PINARES DE VENECIA |
| 07:18 | DELICIAS | PINARES DE VENECIA |
| 07:29 | DELICIAS | PINARES DE VENECIA |
| 07:41 | DELICIAS | PINARES DE VENECIA |
| 07:48 | DELICIAS | PINARES DE VENECIA |
| 07:55 | DELICIAS | PINARES DE VENECIA |
| 08:02 | DELICIAS | PINARES DE VENECIA |
| 08:10 | DELICIAS | PINARES DE VENECIA |
| 08:18 | DELICIAS | PINARES DE VENECIA |
| 08:25 | DELICIAS | PINARES DE VENECIA |

**Últimas salidas** · 22 filas únicas (de 22 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:40 | DELICIAS | PINARES DE VENECIA |
| 20:49 | DELICIAS | PINARES DE VENECIA |
| 20:58 | DELICIAS | PINARES DE VENECIA |
| 21:07 | DELICIAS | PINARES DE VENECIA |
| 21:16 | DELICIAS | PINARES DE VENECIA |
| 21:25 | DELICIAS | PINARES DE VENECIA |
| 21:34 | DELICIAS | PINARES DE VENECIA |
| 21:43 | DELICIAS | PINARES DE VENECIA |
| 21:52 | DELICIAS | PINARES DE VENECIA |
| 22:02 | DELICIAS | PINARES DE VENECIA |
| 22:12 | DELICIAS | PINARES DE VENECIA |
| 22:21 | DELICIAS | PINARES DE VENECIA |
| 22:31 | DELICIAS | PINARES DE VENECIA |
| 22:41 | DELICIAS | PINARES DE VENECIA |
| 22:50 | DELICIAS | PINARES DE VENECIA |
| 23:00 | DELICIAS | PINARES DE VENECIA |
| 23:14 | DELICIAS | PINARES DE VENECIA |
| 23:35 | DELICIAS | PINARES DE VENECIA |
| 23:55 | DELICIAS | PINARES DE VENECIA |
| 00:25 | DELICIAS | PINARES DE VENECIA |
| 00:45 | DELICIAS | PINARES DE VENECIA |
| 01:05 | DELICIAS | PINARES DE VENECIA |


---

# LÍNEA 34 · Estacion Delicias - Cementerio

## Sentido `-1` → **Hacia CEMENTERIO**  ·  desde ESTACIÓN DELICIAS

> Frecuencia media: laborables: 9, sábados: 11, domingos y festivos: 12 min.
>
> **Información adicional** (cita literal): «Amplía su recorrido hasta la entrada del parque de atracciones los días de apertura del mismo, de marzo a diciembre. En el resto, la terminal se realiza en Fray Julián Garcés (Cementerio).»

**Primeras salidas** · 5 filas únicas (de 5 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:29 | ESTACIÓN DELICIAS | CEMENTERIO |
| 06:00 | ESTACIÓN DELICIAS | CEMENTERIO |
| 06:23 | ESTACIÓN DELICIAS | CEMENTERIO |
| 06:45 | ESTACIÓN DELICIAS | CEMENTERIO |
| 07:00 | ESTACIÓN DELICIAS | CEMENTERIO |

**Últimas salidas** · 10 filas únicas (de 10 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:16 | ESTACIÓN DELICIAS | CEMENTERIO |
| 21:27 | ESTACIÓN DELICIAS | CEMENTERIO |
| 21:39 | ESTACIÓN DELICIAS | CEMENTERIO |
| 21:50 | ESTACIÓN DELICIAS | CEMENTERIO |
| 22:02 | ESTACIÓN DELICIAS | CEMENTERIO |
| 22:14 | ESTACIÓN DELICIAS | CEMENTERIO |
| 22:26 | ESTACIÓN DELICIAS | CEMENTERIO |
| 22:44 | ESTACIÓN DELICIAS | CEMENTERIO |
| 23:00 | ESTACIÓN DELICIAS | CEMENTERIO |
| 23:16 | ESTACIÓN DELICIAS | CEMENTERIO |

## Sentido `-2` → **Hacia ESTACIÓN DELICIAS**  ·  desde 2 orígenes

> Frecuencia media: laborables: 9, sábados: 11, domingos y festivos: 12 min.
>
> **Información adicional** (cita literal): «Amplía su recorrido hasta la entrada del parque de atracciones los días de apertura del mismo, de marzo a diciembre. En el resto, la terminal se realiza en Fray Julián Garcés (Cementerio).»

⚠️ No es un único origen/destino: DESDE {P. PAMPLONA 12 · CEMENTERIO} — HASTA {ESTACIÓN DELICIAS}. 3 fila(s) de excepción.

**Primeras salidas** · 6 filas únicas (de 6 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:10 | P. PAMPLONA 12 | ESTACIÓN DELICIAS |
| 06:04 | P. PAMPLONA 12 | ESTACIÓN DELICIAS |
| 06:05 | CEMENTERIO | ESTACIÓN DELICIAS |
| 06:36 | CEMENTERIO | ESTACIÓN DELICIAS |
| 06:59 | CEMENTERIO | ESTACIÓN DELICIAS |
| 07:04 | P. PAMPLONA 12 | ESTACIÓN DELICIAS |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:21 | CEMENTERIO | ESTACIÓN DELICIAS |
| 21:35 | CEMENTERIO | ESTACIÓN DELICIAS |
| 21:46 | CEMENTERIO | ESTACIÓN DELICIAS |
| 21:56 | CEMENTERIO | ESTACIÓN DELICIAS |
| 22:06 | CEMENTERIO | ESTACIÓN DELICIAS |
| 22:20 | CEMENTERIO | ESTACIÓN DELICIAS |
| 22:36 | CEMENTERIO | ESTACIÓN DELICIAS |
| 22:52 | CEMENTERIO | ESTACIÓN DELICIAS |
| 23:27 | CEMENTERIO | ESTACIÓN DELICIAS |


---

# LÍNEA 35 · Parque Goya - Seminario

## Sentido `-1` → **Hacia SEMINARIO**  ·  desde PARQUE GOYA

> Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {PARQUE GOYA} — HASTA {SEMINARIO · P. MINA}. 2 fila(s) de excepción.

**Primeras salidas** · 13 filas únicas (de 13 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:00 | PARQUE GOYA | SEMINARIO |
| 05:33 | PARQUE GOYA | SEMINARIO |
| 06:06 | PARQUE GOYA | SEMINARIO |
| 06:39 | PARQUE GOYA | SEMINARIO |
| 06:56 | PARQUE GOYA | SEMINARIO |
| 07:12 | PARQUE GOYA | SEMINARIO |
| 07:29 | PARQUE GOYA | SEMINARIO |
| 07:45 | PARQUE GOYA | SEMINARIO |
| 07:58 | PARQUE GOYA | SEMINARIO |
| 08:11 | PARQUE GOYA | SEMINARIO |
| 08:23 | PARQUE GOYA | SEMINARIO |
| 08:32 | PARQUE GOYA | SEMINARIO |
| 08:41 | PARQUE GOYA | SEMINARIO |

**Últimas salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:51 | PARQUE GOYA | SEMINARIO |
| 22:01 | PARQUE GOYA | SEMINARIO |
| 22:12 | PARQUE GOYA | SEMINARIO |
| 22:22 | PARQUE GOYA | SEMINARIO |
| 22:32 | PARQUE GOYA | SEMINARIO |
| 22:42 | PARQUE GOYA | SEMINARIO |
| 22:54 | PARQUE GOYA | SEMINARIO |
| 23:06 | PARQUE GOYA | SEMINARIO |
| 23:20 | PARQUE GOYA | SEMINARIO |
| 23:35 | PARQUE GOYA | SEMINARIO |
| 23:54 | PARQUE GOYA | SEMINARIO |
| 00:11 | PARQUE GOYA | P. MINA |
| 00:27 | PARQUE GOYA | SEMINARIO |
| 00:51 | PARQUE GOYA | P. MINA |

## Sentido `-2` → **Hacia PARQUE GOYA**  ·  desde 2 orígenes

> Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {P. MINA · SEMINARIO} — HASTA {PARQUE GOYA}. 10 fila(s) de excepción.

**Primeras salidas** · 18 filas únicas (de 18 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:40 | P. MINA | PARQUE GOYA |
| 05:11 | P. MINA | PARQUE GOYA |
| 05:40 | P. MINA | PARQUE GOYA |
| 05:49 | SEMINARIO | PARQUE GOYA |
| 06:22 | SEMINARIO | PARQUE GOYA |
| 06:29 | P. MINA | PARQUE GOYA |
| 06:55 | SEMINARIO | PARQUE GOYA |
| 07:12 | SEMINARIO | PARQUE GOYA |
| 07:29 | SEMINARIO | PARQUE GOYA |
| 07:30 | P. MINA | PARQUE GOYA |
| 07:46 | SEMINARIO | PARQUE GOYA |
| 08:02 | P. MINA | PARQUE GOYA |
| 08:03 | SEMINARIO | PARQUE GOYA |
| 08:15 | SEMINARIO | PARQUE GOYA |
| 08:20 | P. MINA | PARQUE GOYA |
| 08:27 | SEMINARIO | PARQUE GOYA |
| 08:36 | P. MINA | PARQUE GOYA |
| 08:39 | SEMINARIO | PARQUE GOYA |

**Últimas salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:48 | SEMINARIO | PARQUE GOYA |
| 22:00 | SEMINARIO | PARQUE GOYA |
| 22:14 | SEMINARIO | PARQUE GOYA |
| 22:29 | SEMINARIO | PARQUE GOYA |
| 22:43 | SEMINARIO | PARQUE GOYA |
| 22:56 | SEMINARIO | PARQUE GOYA |
| 23:09 | SEMINARIO | PARQUE GOYA |
| 23:27 | SEMINARIO | PARQUE GOYA |
| 23:41 | SEMINARIO | PARQUE GOYA |
| 00:31 | P. MINA | PARQUE GOYA |
| 01:09 | P. MINA | PARQUE GOYA |


---

# LÍNEA 36 · Picarral - Valdefierro

## Sentido `-1` → **Hacia VALDEFIERRO**  ·  desde 2 orígenes

> Frecuencia media: laborables: 9, sábados: 20, domingos y festivos: 20 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Picarral podrá realizarse desde Calle Orquídea, poste 1306. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios podrán continuar con el mismo título de transporte hasta la parada de Avda. de Valdefierro 1 (bar Pato Rojo).»

⚠️ No es un único origen/destino: DESDE {ECHEGARAY/MERCADO CE · PICARRAL} — HASTA {VALDEFIERRO}. 5 fila(s) de excepción.

**Primeras salidas** · 16 filas únicas (de 16 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:40 | ECHEGARAY/MERCADO CE | VALDEFIERRO |
| 05:08 | ECHEGARAY/MERCADO CE | VALDEFIERRO |
| 05:29 | ECHEGARAY/MERCADO CE | VALDEFIERRO |
| 05:35 | PICARRAL | VALDEFIERRO |
| 06:06 | PICARRAL | VALDEFIERRO |
| 06:08 | ECHEGARAY/MERCADO CE | VALDEFIERRO |
| 06:28 | PICARRAL | VALDEFIERRO |
| 06:49 | PICARRAL | VALDEFIERRO |
| 07:03 | PICARRAL | VALDEFIERRO |
| 07:16 | PICARRAL | VALDEFIERRO |
| 07:29 | PICARRAL | VALDEFIERRO |
| 07:41 | PICARRAL | VALDEFIERRO |
| 07:54 | PICARRAL | VALDEFIERRO |
| 08:00 | ECHEGARAY/MERCADO CE | VALDEFIERRO |
| 08:07 | PICARRAL | VALDEFIERRO |
| 08:17 | PICARRAL | VALDEFIERRO |

**Últimas salidas** · 16 filas únicas (de 16 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:35 | PICARRAL | VALDEFIERRO |
| 20:44 | PICARRAL | VALDEFIERRO |
| 20:53 | PICARRAL | VALDEFIERRO |
| 21:02 | PICARRAL | VALDEFIERRO |
| 21:12 | PICARRAL | VALDEFIERRO |
| 21:22 | PICARRAL | VALDEFIERRO |
| 21:32 | PICARRAL | VALDEFIERRO |
| 21:43 | PICARRAL | VALDEFIERRO |
| 21:54 | PICARRAL | VALDEFIERRO |
| 22:06 | PICARRAL | VALDEFIERRO |
| 22:19 | PICARRAL | VALDEFIERRO |
| 22:33 | PICARRAL | VALDEFIERRO |
| 22:47 | PICARRAL | VALDEFIERRO |
| 23:02 | PICARRAL | VALDEFIERRO |
| 23:16 | PICARRAL | VALDEFIERRO |
| 23:30 | PICARRAL | VALDEFIERRO |

## Sentido `-2` → **Hacia PICARRAL**  ·  desde VALDEFIERRO

> Frecuencia media: laborables: 9, sábados: 20, domingos y festivos: 20 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Picarral podrá realizarse desde Calle Orquídea, poste 1306. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios podrán continuar con el mismo título de transporte hasta la parada de Avda. de Valdefierro 1 (bar Pato Rojo).»

**Primeras salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:59 | VALDEFIERRO | PICARRAL |
| 05:30 | VALDEFIERRO | PICARRAL |
| 05:52 | VALDEFIERRO | PICARRAL |
| 06:13 | VALDEFIERRO | PICARRAL |
| 06:32 | VALDEFIERRO | PICARRAL |
| 06:50 | VALDEFIERRO | PICARRAL |
| 07:09 | VALDEFIERRO | PICARRAL |
| 07:27 | VALDEFIERRO | PICARRAL |
| 07:43 | VALDEFIERRO | PICARRAL |
| 07:56 | VALDEFIERRO | PICARRAL |
| 08:09 | VALDEFIERRO | PICARRAL |

**Últimas salidas** · 19 filas únicas (de 19 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:30 | VALDEFIERRO | PICARRAL |
| 20:41 | VALDEFIERRO | PICARRAL |
| 20:52 | VALDEFIERRO | PICARRAL |
| 21:02 | VALDEFIERRO | PICARRAL |
| 21:12 | VALDEFIERRO | PICARRAL |
| 21:22 | VALDEFIERRO | PICARRAL |
| 21:32 | VALDEFIERRO | PICARRAL |
| 21:42 | VALDEFIERRO | PICARRAL |
| 21:53 | VALDEFIERRO | PICARRAL |
| 22:04 | VALDEFIERRO | PICARRAL |
| 22:14 | VALDEFIERRO | PICARRAL |
| 22:25 | VALDEFIERRO | PICARRAL |
| 22:36 | VALDEFIERRO | PICARRAL |
| 22:49 | VALDEFIERRO | PICARRAL |
| 23:03 | VALDEFIERRO | PICARRAL |
| 23:17 | VALDEFIERRO | PICARRAL |
| 23:33 | VALDEFIERRO | PICARRAL |
| 23:53 | VALDEFIERRO | PICARRAL |
| 00:10 | VALDEFIERRO | PICARRAL |


---

# LÍNEA 38 · Bajo Aragón - Valdefierro

## Sentido `-1` → **Hacia VALDEFIERRO**  ·  desde BAJO ARAGON

> Frecuencia media: laborables: 8, sábados: 12, domingos y festivos: 14 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Bajo Aragón podrá realizarse desde la calle Biel / Dalia. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios podrán continuar con el mismo título de transporte hasta la parada de Avda. de Valdefierro 1 (bar Pato Rojo).»

⚠️ No es un único origen/destino: DESDE {BAJO ARAGON} — HASTA {P MINA · VALDEFIERRO}. 6 fila(s) de excepción.

**Primeras salidas** · 17 filas únicas (de 17 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:45 | BAJO ARAGON | P MINA |
| 05:00 | BAJO ARAGON | VALDEFIERRO |
| 05:10 | BAJO ARAGON | P MINA |
| 05:22 | BAJO ARAGON | P MINA |
| 05:34 | BAJO ARAGON | VALDEFIERRO |
| 05:47 | BAJO ARAGON | VALDEFIERRO |
| 05:59 | BAJO ARAGON | VALDEFIERRO |
| 06:10 | BAJO ARAGON | VALDEFIERRO |
| 06:22 | BAJO ARAGON | VALDEFIERRO |
| 06:31 | BAJO ARAGON | VALDEFIERRO |
| 06:40 | BAJO ARAGON | VALDEFIERRO |
| 06:49 | BAJO ARAGON | VALDEFIERRO |
| 06:57 | BAJO ARAGON | VALDEFIERRO |
| 07:05 | BAJO ARAGON | VALDEFIERRO |
| 07:13 | BAJO ARAGON | VALDEFIERRO |
| 07:21 | BAJO ARAGON | VALDEFIERRO |
| 07:29 | BAJO ARAGON | VALDEFIERRO |

**Últimas salidas** · 20 filas únicas (de 20 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:30 | BAJO ARAGON | VALDEFIERRO |
| 20:41 | BAJO ARAGON | VALDEFIERRO |
| 20:52 | BAJO ARAGON | VALDEFIERRO |
| 21:03 | BAJO ARAGON | VALDEFIERRO |
| 21:14 | BAJO ARAGON | VALDEFIERRO |
| 21:25 | BAJO ARAGON | VALDEFIERRO |
| 21:37 | BAJO ARAGON | VALDEFIERRO |
| 21:49 | BAJO ARAGON | VALDEFIERRO |
| 22:02 | BAJO ARAGON | VALDEFIERRO |
| 22:14 | BAJO ARAGON | VALDEFIERRO |
| 22:27 | BAJO ARAGON | VALDEFIERRO |
| 22:40 | BAJO ARAGON | VALDEFIERRO |
| 22:53 | BAJO ARAGON | VALDEFIERRO |
| 23:06 | BAJO ARAGON | VALDEFIERRO |
| 23:19 | BAJO ARAGON | VALDEFIERRO |
| 23:33 | BAJO ARAGON | VALDEFIERRO |
| 23:50 | BAJO ARAGON | VALDEFIERRO |
| 00:10 | BAJO ARAGON | P MINA |
| 00:35 | BAJO ARAGON | P MINA |
| 01:05 | BAJO ARAGON | P MINA |

## Sentido `-2` → **Hacia BAJO ARAGON**  ·  desde 2 orígenes

> Frecuencia media: laborables: 8, sábados: 12, domingos y festivos: 14 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Bajo Aragón podrá realizarse desde la calle Biel / Dalia. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios podrán continuar con el mismo título de transporte hasta la parada de Avda. de Valdefierro 1 (bar Pato Rojo).»

⚠️ No es un único origen/destino: DESDE {P MINA · VALDEFIERRO} — HASTA {BAJO ARAGON}. 6 fila(s) de excepción.

**Primeras salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:56 | P MINA | BAJO ARAGON |
| 05:20 | VALDEFIERRO | BAJO ARAGON |
| 05:22 | P MINA | BAJO ARAGON |
| 05:34 | P MINA | BAJO ARAGON |
| 05:36 | VALDEFIERRO | BAJO ARAGON |
| 05:53 | VALDEFIERRO | BAJO ARAGON |
| 06:09 | VALDEFIERRO | BAJO ARAGON |
| 06:23 | VALDEFIERRO | BAJO ARAGON |
| 06:34 | VALDEFIERRO | BAJO ARAGON |
| 06:46 | VALDEFIERRO | BAJO ARAGON |
| 06:57 | VALDEFIERRO | BAJO ARAGON |
| 07:09 | VALDEFIERRO | BAJO ARAGON |
| 07:20 | VALDEFIERRO | BAJO ARAGON |
| 07:30 | VALDEFIERRO | BAJO ARAGON |

**Últimas salidas** · 18 filas únicas (de 18 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:38 | VALDEFIERRO | BAJO ARAGON |
| 20:47 | VALDEFIERRO | BAJO ARAGON |
| 20:57 | VALDEFIERRO | BAJO ARAGON |
| 21:09 | VALDEFIERRO | BAJO ARAGON |
| 21:21 | VALDEFIERRO | BAJO ARAGON |
| 21:34 | VALDEFIERRO | BAJO ARAGON |
| 21:47 | VALDEFIERRO | BAJO ARAGON |
| 22:00 | VALDEFIERRO | BAJO ARAGON |
| 22:13 | VALDEFIERRO | BAJO ARAGON |
| 22:27 | VALDEFIERRO | BAJO ARAGON |
| 22:44 | VALDEFIERRO | BAJO ARAGON |
| 23:04 | VALDEFIERRO | BAJO ARAGON |
| 23:27 | VALDEFIERRO | BAJO ARAGON |
| 23:50 | VALDEFIERRO | BAJO ARAGON |
| 00:25 | P MINA | BAJO ARAGON |
| 00:35 | VALDEFIERRO | BAJO ARAGON |
| 00:50 | P MINA | BAJO ARAGON |
| 01:15 | P MINA | BAJO ARAGON |


---

# LÍNEA 39 · Pinares de Venecia - Vadorrey

## Sentido `-1` → **Hacia VADORREY**  ·  desde 3 orígenes

> Frecuencia media: laborables: 6, sábados: 12, domingos y festivos: 16 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Vadorrey podrá realizarse desde la calle Mesones de Isuela.»

⚠️ No es un único origen/destino: DESDE {SAN JOSE 69 · PINARES DE VENECIA · COSO 188} — HASTA {VADORREY}. 7 fila(s) de excepción.

**Primeras salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:42 | SAN JOSE 69 | VADORREY |
| 05:57 | SAN JOSE 69 | VADORREY |
| 06:00 | PINARES DE VENECIA | VADORREY |
| 06:15 | PINARES DE VENECIA | VADORREY |
| 06:23 | SAN JOSE 69 | VADORREY |
| 06:29 | PINARES DE VENECIA | VADORREY |
| 06:43 | PINARES DE VENECIA | VADORREY |
| 06:55 | PINARES DE VENECIA | VADORREY |
| 07:05 | PINARES DE VENECIA | VADORREY |
| 07:15 | PINARES DE VENECIA | VADORREY |
| 07:25 | PINARES DE VENECIA | VADORREY |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:08 | PINARES DE VENECIA | VADORREY |
| 22:20 | PINARES DE VENECIA | VADORREY |
| 22:31 | PINARES DE VENECIA | VADORREY |
| 22:42 | PINARES DE VENECIA | VADORREY |
| 22:53 | PINARES DE VENECIA | VADORREY |
| 22:54 | COSO 188 | VADORREY |
| 23:27 | COSO 188 | VADORREY |
| 23:46 | COSO 188 | VADORREY |
| 00:00 | COSO 188 | VADORREY |

## Sentido `-2` → **Hacia PINARES DE VENECIA**  ·  desde 2 orígenes

> Frecuencia media: laborables: 6, sábados: 12, domingos y festivos: 16 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Vadorrey podrá realizarse desde la calle Mesones de Isuela.»

⚠️ No es un único origen/destino: DESDE {SAN JOSE 70 · VADORREY} — HASTA {PINARES DE VENECIA · COSO 188}. 7 fila(s) de excepción.

**Primeras salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:49 | SAN JOSE 70 | PINARES DE VENECIA |
| 06:00 | VADORREY | PINARES DE VENECIA |
| 06:04 | SAN JOSE 70 | PINARES DE VENECIA |
| 06:16 | VADORREY | PINARES DE VENECIA |
| 06:16 | SAN JOSE 70 | PINARES DE VENECIA |
| 06:32 | VADORREY | PINARES DE VENECIA |
| 06:43 | VADORREY | PINARES DE VENECIA |
| 06:52 | VADORREY | PINARES DE VENECIA |
| 07:01 | VADORREY | PINARES DE VENECIA |
| 07:10 | VADORREY | PINARES DE VENECIA |
| 07:19 | VADORREY | PINARES DE VENECIA |
| 07:27 | VADORREY | PINARES DE VENECIA |

**Últimas salidas** · 8 filas únicas (de 8 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:01 | VADORREY | PINARES DE VENECIA |
| 22:10 | VADORREY | PINARES DE VENECIA |
| 22:20 | VADORREY | PINARES DE VENECIA |
| 22:33 | VADORREY | COSO 188 |
| 22:45 | VADORREY | PINARES DE VENECIA |
| 23:08 | VADORREY | COSO 188 |
| 23:27 | VADORREY | COSO 188 |
| 23:41 | VADORREY | COSO 188 |


---

# LÍNEA 40 · San José - Plaza Aragón

## Sentido `-1` → **Hacia P CONSTITUCION**  ·  desde SAN JOSÉ

> Frecuencia media: laborables: 8, sábados: 11, domingos y festivos: 15 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. La validez del título de transporte finaliza en el terminal de San José.»

**Primeras salidas** · 20 filas únicas (de 20 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:59 | SAN JOSÉ | P CONSTITUCION |
| 05:43 | SAN JOSÉ | P CONSTITUCION |
| 05:57 | SAN JOSÉ | P CONSTITUCION |
| 06:12 | SAN JOSÉ | P CONSTITUCION |
| 06:26 | SAN JOSÉ | P CONSTITUCION |
| 06:40 | SAN JOSÉ | P CONSTITUCION |
| 06:55 | SAN JOSÉ | P CONSTITUCION |
| 07:05 | SAN JOSÉ | P CONSTITUCION |
| 07:15 | SAN JOSÉ | P CONSTITUCION |
| 07:25 | SAN JOSÉ | P CONSTITUCION |
| 07:34 | SAN JOSÉ | P CONSTITUCION |
| 07:43 | SAN JOSÉ | P CONSTITUCION |
| 07:52 | SAN JOSÉ | P CONSTITUCION |
| 08:01 | SAN JOSÉ | P CONSTITUCION |
| 08:11 | SAN JOSÉ | P CONSTITUCION |
| 08:20 | SAN JOSÉ | P CONSTITUCION |
| 08:29 | SAN JOSÉ | P CONSTITUCION |
| 08:38 | SAN JOSÉ | P CONSTITUCION |
| 08:47 | SAN JOSÉ | P CONSTITUCION |
| 08:56 | SAN JOSÉ | P CONSTITUCION |

**Últimas salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:34 | SAN JOSÉ | P CONSTITUCION |
| 21:43 | SAN JOSÉ | P CONSTITUCION |
| 21:52 | SAN JOSÉ | P CONSTITUCION |
| 22:01 | SAN JOSÉ | P CONSTITUCION |
| 22:11 | SAN JOSÉ | P CONSTITUCION |
| 22:21 | SAN JOSÉ | P CONSTITUCION |
| 22:31 | SAN JOSÉ | P CONSTITUCION |
| 22:44 | SAN JOSÉ | P CONSTITUCION |
| 22:58 | SAN JOSÉ | P CONSTITUCION |
| 23:14 | SAN JOSÉ | P CONSTITUCION |
| 23:28 | SAN JOSÉ | P CONSTITUCION |
| 23:42 | SAN JOSÉ | P CONSTITUCION |
| 00:23 | SAN JOSÉ | P CONSTITUCION |
| 01:02 | SAN JOSÉ | P CONSTITUCION |

## Sentido `-2` → **Hacia SAN JOSÉ**  ·  desde 2 orígenes

> Frecuencia media: laborables: 8, sábados: 11, domingos y festivos: 15 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. La validez del título de transporte finaliza en el terminal de San José.»

⚠️ No es un único origen/destino: DESDE {SAN JOSE 70 · P CONSTITUCION} — HASTA {SAN JOSÉ}. 4 fila(s) de excepción.

**Primeras salidas** · 21 filas únicas (de 21 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:50 | SAN JOSE 70 | SAN JOSÉ |
| 05:21 | P CONSTITUCION | SAN JOSÉ |
| 05:44 | SAN JOSE 70 | SAN JOSÉ |
| 06:06 | P CONSTITUCION | SAN JOSÉ |
| 06:20 | P CONSTITUCION | SAN JOSÉ |
| 06:35 | P CONSTITUCION | SAN JOSÉ |
| 06:49 | P CONSTITUCION | SAN JOSÉ |
| 06:53 | SAN JOSE 70 | SAN JOSÉ |
| 07:03 | P CONSTITUCION | SAN JOSÉ |
| 07:18 | P CONSTITUCION | SAN JOSÉ |
| 07:19 | SAN JOSE 70 | SAN JOSÉ |
| 07:29 | P CONSTITUCION | SAN JOSÉ |
| 07:39 | P CONSTITUCION | SAN JOSÉ |
| 07:49 | P CONSTITUCION | SAN JOSÉ |
| 07:58 | P CONSTITUCION | SAN JOSÉ |
| 08:07 | P CONSTITUCION | SAN JOSÉ |
| 08:16 | P CONSTITUCION | SAN JOSÉ |
| 08:25 | P CONSTITUCION | SAN JOSÉ |
| 08:35 | P CONSTITUCION | SAN JOSÉ |
| 08:44 | P CONSTITUCION | SAN JOSÉ |
| 08:53 | P CONSTITUCION | SAN JOSÉ |

**Últimas salidas** · 16 filas únicas (de 16 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:38 | P CONSTITUCION | SAN JOSÉ |
| 21:47 | P CONSTITUCION | SAN JOSÉ |
| 21:56 | P CONSTITUCION | SAN JOSÉ |
| 22:05 | P CONSTITUCION | SAN JOSÉ |
| 22:14 | P CONSTITUCION | SAN JOSÉ |
| 22:23 | P CONSTITUCION | SAN JOSÉ |
| 22:33 | P CONSTITUCION | SAN JOSÉ |
| 22:43 | P CONSTITUCION | SAN JOSÉ |
| 22:53 | P CONSTITUCION | SAN JOSÉ |
| 23:06 | P CONSTITUCION | SAN JOSÉ |
| 23:20 | P CONSTITUCION | SAN JOSÉ |
| 23:35 | P CONSTITUCION | SAN JOSÉ |
| 23:50 | P CONSTITUCION | SAN JOSÉ |
| 00:03 | P CONSTITUCION | SAN JOSÉ |
| 00:42 | P CONSTITUCION | SAN JOSÉ |
| 01:21 | P CONSTITUCION | SAN JOSÉ |


---

# LÍNEA 41 · Puerta del Carmen - Rosales del Canal

## Sentido `-1` → **Hacia ROSALES DEL CANAL**  ·  desde PUERTA DEL CARMEN

> Frecuencia media: laborables: 20, sábados: 20, domingos y festivos: 20 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:00 | PUERTA DEL CARMEN | ROSALES DEL CANAL |

**Últimas salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:25 | PUERTA DEL CARMEN | ROSALES DEL CANAL |
| 23:00 | PUERTA DEL CARMEN | ROSALES DEL CANAL |

## Sentido `-2` → **Hacia PUERTA DEL CARMEN**  ·  desde ROSALES DEL CANAL

> Frecuencia media: laborables: 20, sábados: 20, domingos y festivos: 20 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {ROSALES DEL CANAL} — HASTA {PUERTA DEL CARMEN · H. CORTES, 9}. 2 fila(s) de excepción.

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:00 | ROSALES DEL CANAL | PUERTA DEL CARMEN |

**Últimas salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:22 | ROSALES DEL CANAL | PUERTA DEL CARMEN |
| 22:55 | ROSALES DEL CANAL | H. CORTES, 9 |
| 23:30 | ROSALES DEL CANAL | H. CORTES, 9 |


---

# LÍNEA 42 · La Paz - Actur-Rey Fernando

## Sentido `-1` → **Hacia VALLE DE BROTO**  ·  desde LA PAZ

> Frecuencia media: laborables: 8, sábados: 18, domingos y festivos: 18 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:15 | LA PAZ | VALLE DE BROTO |
| 06:35 | LA PAZ | VALLE DE BROTO |
| 06:53 | LA PAZ | VALLE DE BROTO |
| 07:12 | LA PAZ | VALLE DE BROTO |
| 07:28 | LA PAZ | VALLE DE BROTO |
| 07:39 | LA PAZ | VALLE DE BROTO |
| 07:49 | LA PAZ | VALLE DE BROTO |
| 07:57 | LA PAZ | VALLE DE BROTO |
| 08:06 | LA PAZ | VALLE DE BROTO |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:27 | LA PAZ | VALLE DE BROTO |
| 21:43 | LA PAZ | VALLE DE BROTO |
| 21:57 | LA PAZ | VALLE DE BROTO |
| 22:11 | LA PAZ | VALLE DE BROTO |
| 22:26 | LA PAZ | VALLE DE BROTO |
| 22:40 | LA PAZ | VALLE DE BROTO |
| 22:53 | LA PAZ | VALLE DE BROTO |
| 23:06 | LA PAZ | VALLE DE BROTO |
| 23:20 | LA PAZ | VALLE DE BROTO |

## Sentido `-2` → **Hacia LA PAZ**  ·  desde VALLE DE BROTO

> Frecuencia media: laborables: 8, sábados: 18, domingos y festivos: 18 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:25 | VALLE DE BROTO | LA PAZ |
| 05:48 | VALLE DE BROTO | LA PAZ |
| 06:06 | VALLE DE BROTO | LA PAZ |
| 06:25 | VALLE DE BROTO | LA PAZ |
| 06:41 | VALLE DE BROTO | LA PAZ |
| 06:57 | VALLE DE BROTO | LA PAZ |
| 07:12 | VALLE DE BROTO | LA PAZ |
| 07:28 | VALLE DE BROTO | LA PAZ |
| 07:44 | VALLE DE BROTO | LA PAZ |
| 07:56 | VALLE DE BROTO | LA PAZ |
| 08:07 | VALLE DE BROTO | LA PAZ |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:22 | VALLE DE BROTO | LA PAZ |
| 21:36 | VALLE DE BROTO | LA PAZ |
| 21:50 | VALLE DE BROTO | LA PAZ |
| 22:05 | VALLE DE BROTO | LA PAZ |
| 22:20 | VALLE DE BROTO | LA PAZ |
| 22:36 | VALLE DE BROTO | LA PAZ |
| 22:50 | VALLE DE BROTO | LA PAZ |
| 23:03 | VALLE DE BROTO | LA PAZ |
| 23:15 | VALLE DE BROTO | LA PAZ |


---

# LÍNEA 43 · Juslibol - Actur-Rey Fernando

## Sentido `-1` → **Hacia ACTUR REY FERNANDO**  ·  desde JUSLIBOL

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 07:00 | JUSLIBOL | ACTUR REY FERNANDO |
| 07:30 | JUSLIBOL | ACTUR REY FERNANDO |

**Últimas salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:30 | JUSLIBOL | ACTUR REY FERNANDO |
| 23:00 | JUSLIBOL | ACTUR REY FERNANDO |

## Sentido `-2` → **Hacia JUSLIBOL**  ·  desde ACTUR REY FERNANDO

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:45 | ACTUR REY FERNANDO | JUSLIBOL |
| 07:15 | ACTUR REY FERNANDO | JUSLIBOL |

**Últimas salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:45 | ACTUR REY FERNANDO | JUSLIBOL |


---

# LÍNEA 44 · Estación Miraflores - Actur Rey Fernando

## Sentido `-1` → **Hacia PABLO R. PICASSO**  ·  desde ESTACION MIRAFLORES

> Frecuencia media: laborables: 15, sábados: 23, domingos y festivos: 23 min.
>
> **Información adicional** (cita literal): «En sábados, domingos y festivos y del 16 de julio al 31 de agosto realiza terminal en Pablo Ruiz Picasso 34, en vez de en Campus Río Ebro. En periodo escolar, la primera salida desde la Estación Miraflores con terminal en Campus Río Ebro es a las 7:14h y la última a las 20:40h. El acceso sentido Miraflores podrá realizarse desde la parada de María Zambrano 48.»

**Primeras salidas** · 8 filas únicas (de 8 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:15 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 05:36 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 05:56 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 06:18 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 06:36 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 06:55 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 07:12 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 07:28 | ESTACION MIRAFLORES | PABLO R. PICASSO |

**Últimas salidas** · 4 filas únicas (de 4 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:30 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 21:51 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 22:15 | ESTACION MIRAFLORES | PABLO R. PICASSO |
| 22:42 | ESTACION MIRAFLORES | PABLO R. PICASSO |

## Sentido `-2` → **Hacia ESTACION MIRAFLORES**  ·  desde PABLO R. PICASSO

> Frecuencia media: laborables: 15, sábados: 23, domingos y festivos: 23 min.
>
> **Información adicional** (cita literal): «En sábados, domingos y festivos y del 16 de julio al 31 de agosto realiza terminal en Pablo Ruiz Picasso 34, en vez de en Campus Río Ebro. En periodo escolar, la primera salida desde la Estación Miraflores con terminal en Campus Río Ebro es a las 7:14h y la última a las 20:40h. El acceso sentido Miraflores podrá realizarse desde la parada de María Zambrano 48.»

**Primeras salidas** · 6 filas únicas (de 6 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:56 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 06:17 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 06:37 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 06:59 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 07:18 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 07:36 | PABLO R. PICASSO | ESTACION MIRAFLORES |

**Últimas salidas** · 7 filas únicas (de 7 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:22 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 21:38 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 21:54 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 22:11 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 22:32 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 22:52 | PABLO R. PICASSO | ESTACION MIRAFLORES |
| 23:19 | PABLO R. PICASSO | ESTACION MIRAFLORES |


---

# LÍNEA 50 · Vadorrey - San Gregorio

## Sentido `-1` → **Hacia SAN GREGORIO**  ·  desde VADORREY

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> **Información adicional** (cita literal): «𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios procedentes de Vadorrey podrán continuar con el mismo título de transporte hasta la segunda parada de Cristo Rey.»

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:40 | VADORREY | SAN GREGORIO |
| 07:03 | VADORREY | SAN GREGORIO |

**Últimas salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 23:05 | VADORREY | SAN GREGORIO |

## Sentido `-2` → **Hacia VADORREY**  ·  desde SAN GREGORIO

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> **Información adicional** (cita literal): «𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios procedentes de Vadorrey podrán continuar con el mismo título de transporte hasta la segunda parada de Cristo Rey.»

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 07:10 | SAN GREGORIO | VADORREY |

**Últimas salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:30 | SAN GREGORIO | VADORREY |


---

# LÍNEA 51 · Pabellón Príncipe Felipe - Estación Delicias

## Sentido `-1` → **Hacia ESTACION DELICIAS**  ·  desde PRINCIPE FELIPE

> Frecuencia media: laborables: 12, sábados: 15, domingos y festivos: 12 min.
>
> **Información adicional** (cita literal): «Los miércoles y domingos en los que tiene lugar el mercadillo en el parking Sur de la Expo, realiza parada en Av. Expo 2008 / Av. Pablo Gargallo. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios podrán continuar después de la terminal de Estación Delicias (Llegadas) con el mismo título de transporte hasta la parada de la Estación Delicias / Autobuses.»

**Primeras salidas** · 5 filas únicas (de 5 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:45 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 06:10 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 06:27 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 06:44 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 06:57 | PRINCIPE FELIPE | ESTACION DELICIAS |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:01 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 22:14 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 22:26 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 22:41 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 22:59 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 23:22 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 23:51 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 00:13 | PRINCIPE FELIPE | ESTACION DELICIAS |
| 01:04 | PRINCIPE FELIPE | ESTACION DELICIAS |

## Sentido `-2` → **Hacia PRINCIPE FELIPE**  ·  desde ESTACION DELICIAS

> Frecuencia media: laborables: 12, sábados: 15, domingos y festivos: 12 min.
>
> **Información adicional** (cita literal): «Los miércoles y domingos en los que tiene lugar el mercadillo en el parking Sur de la Expo, realiza parada en Av. Expo 2008 / Av. Pablo Gargallo. 𝗗𝗲𝘀𝗽𝘂𝗲́𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Los usuarios podrán continuar después de la terminal de Estación Delicias (Llegadas) con el mismo título de transporte hasta la parada de la Estación Delicias / Autobuses.»

**Primeras salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:19 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 06:44 | ESTACION DELICIAS | PRINCIPE FELIPE |

**Últimas salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:56 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 22:08 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 22:21 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 22:33 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 22:45 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 22:56 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 23:11 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 23:29 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 23:51 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 00:20 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 00:42 | ESTACION DELICIAS | PRINCIPE FELIPE |
| 01:33 | ESTACION DELICIAS | PRINCIPE FELIPE |


---

# LÍNEA 52 · Miralbueno - Puerta del Carmen

## Sentido `-1` → **Hacia PUERTA DEL CARMEN**  ·  desde MIRALBUENO

> Frecuencia media: laborables: 12, sábados: 15, domingos y festivos: 15 min.
>
> Información adicional: — _no tiene_

⚠️ No es un único origen/destino: DESDE {MIRALBUENO} — HASTA {PUERTA DEL CARMEN · C.AUGUSTO 3}. 4 fila(s) de excepción.

**Primeras salidas** · 13 filas únicas (de 13 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:40 | MIRALBUENO | PUERTA DEL CARMEN |
| 06:06 | MIRALBUENO | PUERTA DEL CARMEN |
| 06:32 | MIRALBUENO | PUERTA DEL CARMEN |
| 06:58 | MIRALBUENO | PUERTA DEL CARMEN |
| 07:27 | MIRALBUENO | PUERTA DEL CARMEN |
| 07:47 | MIRALBUENO | PUERTA DEL CARMEN |
| 08:06 | MIRALBUENO | PUERTA DEL CARMEN |
| 08:20 | MIRALBUENO | PUERTA DEL CARMEN |
| 08:34 | MIRALBUENO | PUERTA DEL CARMEN |
| 08:49 | MIRALBUENO | PUERTA DEL CARMEN |
| 09:04 | MIRALBUENO | PUERTA DEL CARMEN |
| 09:18 | MIRALBUENO | PUERTA DEL CARMEN |
| 09:32 | MIRALBUENO | PUERTA DEL CARMEN |

**Últimas salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:34 | MIRALBUENO | PUERTA DEL CARMEN |
| 21:48 | MIRALBUENO | PUERTA DEL CARMEN |
| 22:03 | MIRALBUENO | PUERTA DEL CARMEN |
| 22:18 | MIRALBUENO | PUERTA DEL CARMEN |
| 22:32 | MIRALBUENO | PUERTA DEL CARMEN |
| 22:46 | MIRALBUENO | C.AUGUSTO 3 |
| 23:00 | MIRALBUENO | PUERTA DEL CARMEN |
| 23:14 | MIRALBUENO | C.AUGUSTO 3 |
| 23:29 | MIRALBUENO | PUERTA DEL CARMEN |
| 23:50 | MIRALBUENO | C.AUGUSTO 3 |
| 00:18 | MIRALBUENO | C.AUGUSTO 3 |

## Sentido `-2` → **Hacia MIRALBUENO**  ·  desde PUERTA DEL CARMEN

> Frecuencia media: laborables: 12, sábados: 15, domingos y festivos: 15 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:15 | PUERTA DEL CARMEN | MIRALBUENO |
| 05:41 | PUERTA DEL CARMEN | MIRALBUENO |
| 06:07 | PUERTA DEL CARMEN | MIRALBUENO |
| 06:33 | PUERTA DEL CARMEN | MIRALBUENO |
| 06:59 | PUERTA DEL CARMEN | MIRALBUENO |
| 07:19 | PUERTA DEL CARMEN | MIRALBUENO |
| 07:38 | PUERTA DEL CARMEN | MIRALBUENO |
| 07:58 | PUERTA DEL CARMEN | MIRALBUENO |
| 08:18 | PUERTA DEL CARMEN | MIRALBUENO |
| 08:36 | PUERTA DEL CARMEN | MIRALBUENO |
| 08:50 | PUERTA DEL CARMEN | MIRALBUENO |
| 09:04 | PUERTA DEL CARMEN | MIRALBUENO |
| 09:19 | PUERTA DEL CARMEN | MIRALBUENO |
| 09:30 | PUERTA DEL CARMEN | MIRALBUENO |

**Últimas salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:34 | PUERTA DEL CARMEN | MIRALBUENO |
| 21:49 | PUERTA DEL CARMEN | MIRALBUENO |
| 22:03 | PUERTA DEL CARMEN | MIRALBUENO |
| 22:17 | PUERTA DEL CARMEN | MIRALBUENO |
| 22:31 | PUERTA DEL CARMEN | MIRALBUENO |
| 22:45 | PUERTA DEL CARMEN | MIRALBUENO |
| 23:02 | PUERTA DEL CARMEN | MIRALBUENO |
| 23:24 | PUERTA DEL CARMEN | MIRALBUENO |
| 23:52 | PUERTA DEL CARMEN | MIRALBUENO |


---

# LÍNEA 53 · Plaza Emperador Carlos Quinto - Miralbueno

## Sentido `-1` → **Hacia MIRALBUENO**  ·  desde PZA.EMPERADOR CARLOS

> Frecuencia media: laborables: 11, sábados: 17, domingos y festivos: 17 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 16 filas únicas (de 16 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:20 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 05:38 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 05:55 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 06:11 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 06:27 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 06:43 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 06:59 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 07:11 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 07:23 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 07:36 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 07:49 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 08:02 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 08:15 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 08:29 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 08:42 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 08:56 | PZA.EMPERADOR CARLOS | MIRALBUENO |

**Últimas salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:48 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 20:59 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 21:11 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 21:24 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 21:40 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 22:00 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 22:25 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 22:51 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 23:16 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 23:40 | PZA.EMPERADOR CARLOS | MIRALBUENO |
| 00:05 | PZA.EMPERADOR CARLOS | MIRALBUENO |

## Sentido `-2` → **Hacia PZA.EMPERADOR CARLOS**  ·  desde MIRALBUENO

> Frecuencia media: laborables: 11, sábados: 17, domingos y festivos: 17 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 14 filas únicas (de 14 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:45 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 06:02 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 06:19 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 06:35 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 06:51 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 07:07 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 07:23 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 07:36 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 07:49 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 08:02 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 08:15 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 08:29 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 08:43 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 08:56 | MIRALBUENO | PZA.EMPERADOR CARLOS |

**Últimas salidas** · 12 filas únicas (de 12 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 20:45 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 20:58 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 21:14 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 21:33 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 21:52 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 22:10 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 22:28 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 22:53 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 23:18 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 23:42 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 00:05 | MIRALBUENO | PZA.EMPERADOR CARLOS |
| 00:30 | MIRALBUENO | PZA.EMPERADOR CARLOS |


---

# LÍNEA 54 · Rosales del Canal - Tranvía

## Sentido `-1` → **Hacia C.B. LLUVIA-TRANVIA**  ·  desde C.B. LLUVIA-TRANVIA

> Frecuencia media: laborables: 11, sábados: 22, domingos y festivos: 22 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. La validez del título de transporte finaliza en el terminal de Cantando bajo la lluvia.»

**Primeras salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:10 | C.B. LLUVIA-TRANVIA | C.B. LLUVIA-TRANVIA |
| 06:31 | C.B. LLUVIA-TRANVIA | C.B. LLUVIA-TRANVIA |
| 06:42 | C.B. LLUVIA-TRANVIA | C.B. LLUVIA-TRANVIA |

**Últimas salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 23:46 | C.B. LLUVIA-TRANVIA | C.B. LLUVIA-TRANVIA |
| 00:10 | C.B. LLUVIA-TRANVIA | C.B. LLUVIA-TRANVIA |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 55 · Montecanal - Tranvía

## Sentido `-1` → **Hacia P. DE LOS OLVIDADOS**  ·  desde P. DE LOS OLVIDADOS

> Frecuencia media: laborables: 10, sábados: 20, domingos y festivos: 20 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. La validez del título de transporte finaliza en el terminal de Pº de los Olvidados.»

**Primeras salidas** · 17 filas únicas (de 17 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 06:20 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 06:40 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 06:50 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 07:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 07:10 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 07:20 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 07:30 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 07:40 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 07:50 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 08:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 08:10 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 08:20 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 08:30 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 08:40 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 08:50 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 09:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |

**Últimas salidas** · 15 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 21:10 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 21:20 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 21:30 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 21:40 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 21:50 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 22:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 22:10 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 22:20 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 22:40 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 23:00 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 23:21 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 23:42 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 00:03 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |
| 00:24 | P. DE LOS OLVIDADOS | P. DE LOS OLVIDADOS |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 56 · Valdespartera - Tranvía

## Sentido `-1` → **Hacia C. KANE/ C.SALUD**  ·  desde C. KANE/ C.SALUD

> Frecuencia media: laborables: 21, sábados: 21, domingos y festivos: 21 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Línea circular. En la terminal ubicada en la calle Ciudadano Kane los usuarios podrán permanecer en el interior del bus con el mismo título de transporte.»

**Primeras salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:05 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 06:26 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 06:47 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |

**Últimas salidas** · 7 filas únicas (de 7 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:01 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 22:23 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 22:45 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 23:07 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 23:28 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 23:49 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |
| 00:10 | C. KANE/ C.SALUD | C. KANE/ C.SALUD |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 57 · Casablanca - Tranvía

## Sentido `-1` → **Hacia FANLO**  ·  desde FANLO

> Frecuencia media: laborables: 9, sábados: 15, domingos y festivos: 15 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. Línea circular. En la terminal ubicada en la calle Fanlo los usuarios podrán permanecer en el interior del bus con el mismo título de transporte.»

**Primeras salidas** · 9 filas únicas (de 9 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:58 | FANLO | FANLO |
| 05:11 | FANLO | FANLO |
| 05:24 | FANLO | FANLO |
| 05:37 | FANLO | FANLO |
| 05:50 | FANLO | FANLO |
| 06:03 | FANLO | FANLO |
| 06:16 | FANLO | FANLO |
| 06:29 | FANLO | FANLO |
| 06:36 | FANLO | FANLO |

**Últimas salidas** · 11 filas únicas (de 11 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:08 | FANLO | FANLO |
| 22:16 | FANLO | FANLO |
| 22:29 | FANLO | FANLO |
| 22:43 | FANLO | FANLO |
| 22:57 | FANLO | FANLO |
| 23:11 | FANLO | FANLO |
| 23:24 | FANLO | FANLO |
| 23:37 | FANLO | FANLO |
| 23:50 | FANLO | FANLO |
| 00:03 | FANLO | FANLO |
| 00:16 | FANLO | FANLO |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 58 · Fuente de La Junquera - Tranvía

## Sentido `-1` → **Hacia FUENTE LA JUNQUERA**  ·  desde FUENTE LA JUNQUERA

> Frecuencia media: laborables: 30, sábados: 30, domingos y festivos: 30 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. La validez del título de transporte finaliza en el terminal de Fuente de La Junquera.»

**Primeras salidas** · 1 filas únicas (de 1 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:00 | FUENTE LA JUNQUERA | FUENTE LA JUNQUERA |

**Últimas salidas** · 2 filas únicas (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 00:00 | FUENTE LA JUNQUERA | FUENTE LA JUNQUERA |
| 00:30 | FUENTE LA JUNQUERA | FUENTE LA JUNQUERA |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 59 · Arcosur - Tranvía

## Sentido `-1` → **Hacia C.B. LLUVIA**  ·  desde C.B. LLUVIA

> Frecuencia media: laborables: 16, sábados: 30, domingos y festivos: 30 min.
>
> **Información adicional** (cita literal): «𝗔𝗻𝘁𝗲𝘀 𝗱𝗲 𝘁𝗲𝗿𝗺𝗶𝗻𝗮𝗹. El acceso dirección Arcosur podrá realizarse desde la calle Lista de Schindler.»

**Primeras salidas** · 3 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:08 | C.B. LLUVIA | C.B. LLUVIA |
| 05:38 | C.B. LLUVIA | C.B. LLUVIA |
| 06:08 | C.B. LLUVIA | C.B. LLUVIA |

**Últimas salidas** · 7 filas únicas (de 7 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 21:45 | C.B. LLUVIA | C.B. LLUVIA |
| 22:15 | C.B. LLUVIA | C.B. LLUVIA |
| 22:45 | C.B. LLUVIA | C.B. LLUVIA |
| 23:15 | C.B. LLUVIA | C.B. LLUVIA |
| 23:45 | C.B. LLUVIA | C.B. LLUVIA |
| 00:15 | C.B. LLUVIA | C.B. LLUVIA |
| 00:45 | C.B. LLUVIA | C.B. LLUVIA |

## Sentido `-2` · ⚫ **sin tabla** — 0 filas (HTTP 200). La web no publica este sentido.


---

# LÍNEA 60 · Avda Estudiantes -  Actur Rey Fernando

## Sentido `-1` → **Hacia VALLE DE BROTO**  ·  desde AVENIDA ESTUDIANTES

> Frecuencia media: laborables: 12, sábados: 22, domingos y festivos: 20 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 4 filas únicas (de 4 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:50 | AVENIDA ESTUDIANTES | VALLE DE BROTO |
| 07:20 | AVENIDA ESTUDIANTES | VALLE DE BROTO |
| 07:46 | AVENIDA ESTUDIANTES | VALLE DE BROTO |
| 07:58 | AVENIDA ESTUDIANTES | VALLE DE BROTO |

**Últimas salidas** · 4 filas únicas (de 4 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:08 | AVENIDA ESTUDIANTES | VALLE DE BROTO |
| 22:26 | AVENIDA ESTUDIANTES | VALLE DE BROTO |
| 22:46 | AVENIDA ESTUDIANTES | VALLE DE BROTO |
| 23:05 | AVENIDA ESTUDIANTES | VALLE DE BROTO |

## Sentido `-2` → **Hacia AVENIDA ESTUDIANTES**  ·  desde VALLE DE BROTO

> Frecuencia media: laborables: 12, sábados: 22, domingos y festivos: 20 min.
>
> Información adicional: — _no tiene_

**Primeras salidas** · 5 filas únicas (de 5 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:22 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 06:51 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 07:17 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 07:45 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 08:00 | VALLE DE BROTO | AVENIDA ESTUDIANTES |

**Últimas salidas** · 5 filas únicas (de 5 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:04 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 22:18 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 22:34 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 22:52 | VALLE DE BROTO | AVENIDA ESTUDIANTES |
| 23:12 | VALLE DE BROTO | AVENIDA ESTUDIANTES |


---

# LÍNEA N1 · Plaza Aragón - La Jota - Vadorrey - Santa Isabel

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.

---

# LÍNEA N2 · Pza. Aragón - La Almozara - Actur Rey F. - P. Goya - Arrabal

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.

---

# LÍNEA N3 · Paseo Pamplona - Delicias - Valdefierro - Miralbueno

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.

---

# LÍNEA N4 · Paseo Pamplona - Romareda - Rosales del Canal - Arcosur

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.

---

# LÍNEA N5 · Pza. Aragón - Las Fuentes - S José - La Paz - Parque Venecia

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.

---

# LÍNEA N6 · Paseo Pamplona - Plaza Roma - Vía Hispanidad - La Cartuja

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.

---

# LÍNEA N7 · Plaza Aragón - Arrabal - San Gregorio - Peñaflor

> ⚫ **La web no publica esta línea en ninguno de los dos sentidos** (0 filas en `-1` y en `-2`). HTTP 200 en ambos.
