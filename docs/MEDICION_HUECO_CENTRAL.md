# Medición — ¿el hueco entre las dos tablas tiene cadencia estable?

**Fecha:** 2026-07-20 (lunes) · **Peticiones a Avanza:** 0 · **Código tocado:** ninguno.
Fuentes: el GTFS (día completo de hoy) y las tablas web ya capturadas en
[`DATOS_CRUDOS_LINEAS_25_35_38_41.md`](DATOS_CRUDOS_LINEAS_25_35_38_41.md). **No hizo falta pedir
nada nuevo.**

---

## El criterio, declarado ANTES de mirar los datos

> **«entre las HH:MM y las HH:MM, cada N minutos» es CIERTO si ≥ 90 % de los intervalos
> consecutivos del hueco caen dentro de ±2 minutos de la mediana.**

Es el que propuso Antonio, y se fija aquí para que no pueda elegirse después de ver el resultado.
Se reportan además el **±1 min**, el mínimo, el máximo y los outliers uno a uno.

⚠️ **Esta pregunta NO es la de [`PRUEBA_CADENCIA_Y_CORTE.md`](PRUEBA_CADENCIA_Y_CORTE.md).** Allí se
medía *el día entero* y se preguntaba si el corte coincidía con la estabilización (no coincidía).
Aquí se acepta el corte de la web como dado y se mira **solo lo de dentro**.

⚠️ **La 21 no se puede medir**: el GTFS le da 0 viajes hoy. Se salta.

---

## ⭐ Respuesta con el número delante: 8 de 8

```
  caso     │ hueco           │ salidas │ mediana │  ±1′ │  ±2′ │ veredicto │ web dice
  ─────────┼─────────────────┼─────────┼─────────┼──────┼──────┼───────────┼─────────
  25 dir0  │ 06:10 → 21:29   │      71 │    13′  │  97% │  99% │ ✅ CIERTO │   13′
  25 dir1  │ 06:10 → 21:30   │      72 │    13′  │  97% │  97% │ ✅ CIERTO │   13′
  35 dir0  │ 08:41 → 21:51   │      95 │     8′  │  95% │ 100% │ ✅ CIERTO │    9′
  35 dir1  │ 08:39 → 21:48   │      94 │     8′  │  84% │  94% │ ✅ CIERTO │    9′
  38 dir0  │ 07:29 → 20:30   │      93 │     8′  │  96% │  99% │ ✅ CIERTO │    8′
  38 dir1  │ 07:30 → 20:38   │      94 │     8′  │  97% │ 100% │ ✅ CIERTO │    8′
  41 dir0  │ 06:00 → 22:25   │      44 │    22′  │  93% │  95% │ ✅ CIERTO │   20′
  41 dir1  │ 06:00 → 22:22   │      44 │    22′  │  88% │  95% │ ✅ CIERTO │   20′
```

**Las 8 de 8 cumplen el criterio.** Ninguna se queda cerca del umbral: la peor es la 35 dir1 con
**94 %**, cuatro puntos por encima del 90 % exigido.

Y los huecos no son pequeños: van de **44 salidas** (41) a **95** (35). Son **entre 13 y 16 horas
de servicio** cada uno.

---

## 1 · LÍNEA 25 · hueco 06:10 → 21:29 (dir 0) y 06:10 → 21:30 (dir 1)

### dir 0 → Puerta del Carmen · 71 salidas · mediana **13′** (min 11, max 24)

```
  24 12 13 13 12 12 13 13 13 12 13 13 13 13 13
  12 13 13 14 13 13 13 13 14 13 13 13 13 13 13
  13 14 14 14 13 14 13 13 14 13 13 13 13 13 13
  13 13 13 13 13 13 13 13 13 13 13 13 13 13 13
  13 13 13 13 13 13 12 13 12 11

  11′ │█ 1
  12′ │███████ 7
  13′ │██████████████████████████████████████████████████████ 54
  14′ │███████ 7
  24′ │█ 1                      ← el ÚNICO outlier, y es el primer intervalo
```

**Outliers:** 1 — `06:10 → 06:34 = 24′`.

### dir 1 → La Cartuja · 72 salidas · mediana **13′** (min 0, max 24)

```
  24  0 12 13 12 13 13 12 13 13 13 13 13 13 13
  13 13 13 13 13 13 13 13 13 13 13 13 13 13 13
  13 13 13 13 14 14 14 14 14 13 13 14 13 13 13
  13 13 13 13 13 13 13 13 13 13 13 13 13 13 13
  13 13 13 13 13 13 12 13 12 12 12

   0′ │█ 1
  12′ │███████ 7
  13′ │████████████████████████████████████████████████████████ 56
  14′ │██████ 6
  24′ │█ 1
```

**Outliers:** 2 — `06:10 → 06:34 = 24′` y `06:34 → 06:34 = 0′`.

⚠️ **El intervalo de 0 minutos no es un error de medida**: la 25 dir 1 tiene **dos cabeceras**
(«P. Pamplona / Puerta del Carmen» y «Miguel Servet / Camino Enmedio») y a las 06:34 salen dos
autobuses, uno de cada una. Está en el dato crudo.

---

## 2 · LÍNEA 35 · hueco 08:41 → 21:51 (dir 0) y 08:39 → 21:48 (dir 1)

### dir 0 → Seminario · 95 salidas · mediana **8′** (min 7, max 10)

```
   9  9  9  8  9  9  8  9  9  8  8  8  9  8  9
   8  8  8  9  9  9  9  9  8  8  9  8  9  8  8
   8  9  9  9  9  9  8  8  9  8  9  8  8  9  8
   8  9  9  9  8  8  8  8  8  8  8  9  8  8  8
   9  9  8  8  8  8  8  8  8  9  9  8  8  7  8
   8  7  7  8  8  8  8  8  8  8  8  7  8  8 10
  10 10 10 10

   7′ │████ 4
   8′ │█████████████████████████████████████████████████████ 53
   9′ │████████████████████████████████ 32
  10′ │█████ 5
```

**Outliers: NINGUNO.** Es el hueco más limpio de los ocho: **100 % dentro de ±2**.

### dir 1 → Parque Goya · 94 salidas · mediana **8′** (min 1, max 12)

```
  12 12  7  5 10  1  8  9  9  8  8  8  9  9  9
   9  8  8  8  9  8  9  8  8  8  9  9  9  9  9
   8  8  9  8  9  8  8  9  9  9  9  9  9  8  8
   8  8  9  8  8  9  8  8  8  9  9  8  8  8  8
   8  8  8  9  9  9  7  7  8  8  7  7  8  8  8
   8  8  8  8  8  7  8  9 10 10 10 10 10 10 11
  11 10 10

   1′ │█ 1
   5′ │█ 1
   7′ │██████ 6
   8′ │███████████████████████████████████████████ 43
   9′ │█████████████████████████████ 29
  10′ │█████████ 9
  11′ │██ 2
  12′ │██ 2
```

**Outliers:** 6 — `08:39→08:51 = 12′`, `08:51→09:03 = 12′`, `09:10→09:15 = 5′`,
`09:25→09:26 = 1′`, `21:06→21:17 = 11′`, `21:17→21:28 = 11′`.

⚠️ **Y aquí está la única rotura que merece señalarse.** Es el peor caso de los ocho (94 %) y **la
irregularidad NO está repartida: está en los dos bordes.** Los cuatro primeros outliers caen entre
las 08:39 y las 09:26 —el final de la rampa de mañana, que la web ya dio por terminada— y los dos
últimos entre las 21:06 y las 21:28, cuando empieza a degradarse la noche. **En el centro del hueco
no hay un solo outlier.**

---

## 3 · LÍNEA 38 · hueco 07:29 → 20:30 (dir 0) y 07:30 → 20:38 (dir 1)

### dir 0 → Valdefierro · 93 salidas · mediana **8′** (min 7, max 11)

```
   8  8  9  9  9  9  9  9  8  8  8  9  8  8  8
   8  9  9  9  9  9  8  8  8  8  8  8  9  9  9
   9  9  9  9  8  8  8  9  9  8  9  9  9  9  9
   9  9  8  9  9  9  8  8  9  9  9  9  8  8  8
   8  8  8  9  8  8  8  7  7  8  8  8  8  8  8
   8  8  8  8  8  8  8  8  8  8  8  9  9 10 11
  10 10

   7′ │██ 2
   8′ │████████████████████████████████████████████████ 48
   9′ │██████████████████████████████████████ 38
  10′ │███ 3
  11′ │█ 1
```

**Outliers:** 1 — `19:59 → 20:10 = 11′`.

### dir 1 → Bajo Aragón · 94 salidas · mediana **8′** (min 7, max 10)

```
  10 10 10  9  9  8  8  8  8  8  9  9  9  9  8
   8  8  9  8  8  8  9  9  9  9  9  9  8  8  8
   9  8  8  9  9  9  9  9  9  9  8  9  9  9  9
   8  9  9  9  9  8  8  8  8  8  9  9  8  8  9
   9  9  9  8  8  8  8  8  8  9  8  8  8  8  7
   8  8  8  8  8  8  8  8  8  8  8  8  8  9  8
   8  9  9

   7′ │█ 1
   8′ │██████████████████████████████████████████████████ 50
   9′ │███████████████████████████████████████ 39
  10′ │███ 3
```

**Outliers: NINGUNO.** 100 % dentro de ±2.

---

## 4 · LÍNEA 41 · hueco 06:00 → 22:25 (dir 0) y 06:00 → 22:22 (dir 1)

### dir 0 → Rosales del Canal · 44 salidas · mediana **22′** (min 21, max 36)

```
  36 21 21 22 22 22 22 22 22 22 22 22 22 23 23
  23 23 23 23 23 22 23 23 22 22 22 21 22 22 22
  23 22 22 23 22 22 22 22 22 22 23 24 36

  21′ │███ 3
  22′ │█████████████████████████ 25
  23′ │████████████ 12
  24′ │█ 1
  36′ │██ 2      ← los dos son los intervalos de los EXTREMOS
```

**Outliers:** 2 — `06:00 → 06:36 = 36′` (el primero) y `21:49 → 22:25 = 36′` (el último).

### dir 1 → Puerta del Carmen · 44 salidas · mediana **22′** (min 21, max 33)

```
  32 33 21 22 22 22 22 22 22 22 22 22 22 23 23
  23 24 23 23 23 23 22 22 22 21 22 22 22 22 22
  22 23 22 22 23 22 22 22 22 23 24 23 24

  21′ │██ 2
  22′ │█████████████████████████ 25
  23′ │███████████ 11
  24′ │███ 3
  32′ │█ 1
  33′ │█ 1
```

**Outliers:** 2 — `06:00 → 06:32 = 32′` y `06:32 → 07:05 = 33′`. Los dos, al principio.

---

## 5 · ⭐ El patrón que atraviesa las ocho: la irregularidad está en los BORDES

De los **14 outliers** de las ocho mediciones, **12 caen en el primer o el último intervalo del
hueco**. En el centro casi no hay ninguno.

Y se ve mejor quitando solo **el primer intervalo** (el de transición entre la última «primera
salida» que la web publica y el arranque del ritmo):

```
  caso    │ 1er intervalo │ ±2 con él │ ±2 sin él │ ±1 sin él
  25 dir0 │           24′ │       99% │      100% │       99%
  25 dir1 │           24′ │       97% │       99% │       99%
  35 dir0 │            9′ │      100% │      100% │       95%
  35 dir1 │           12′ │       94% │       95% │       85%
  38 dir0 │            8′ │       99% │       99% │       96%
  38 dir1 │           10′ │      100% │      100% │       98%
  41 dir0 │           36′ │       95% │       98% │       95%
  41 dir1 │           32′ │       95% │       98% │       90%
```

Con ese único recorte, **seis de los ocho pasan del 98 %** y tres llegan al 100 %.

---

## 6 · ⚠️ La frecuencia publicada por Avanza, contra la mediana del hueco

```
  caso    │ web (laborables) │ mediana real │ diferencia
  25 dir0 │              13′ │          13′ │ EXACTA
  25 dir1 │              13′ │          13′ │ EXACTA
  35 dir0 │               9′ │           8′ │ +1′  (la web dice MÁS espera de la que hay)
  35 dir1 │               9′ │           8′ │ +1′  (la web dice MÁS espera de la que hay)
  38 dir0 │               8′ │           8′ │ EXACTA
  38 dir1 │               8′ │           8′ │ EXACTA
  41 dir0 │              20′ │          22′ │ −2′  (la web dice MENOS espera de la que hay)
  41 dir1 │              20′ │          22′ │ −2′  (la web dice MENOS espera de la que hay)
```

**Cuatro de ocho son exactas.** Las otras cuatro fallan por poco, pero **no en la misma dirección**:

- La **35** se pasa por arriba (dice 9, son 8): quien la lea espera un poco más de lo que toca.
- La **41** se queda corta (dice 20, son 22): quien la lea **espera menos de lo que va a esperar**.

⚠️ Y el matiz que ya estaba en la medición anterior sigue en pie: la cifra de la web es **la media
del día entero**, no la del hueco. Que en cuatro casos coincida con la mediana del hueco es un
resultado, no una definición.

---

## Veredicto

**Sí: el hueco que la web no publica tiene cadencia estable. En las 8 de 8 medidas, con el criterio
declarado de antemano (≥ 90 % dentro de ±2 min de la mediana).**

**«Entre las 06:10 y las 21:29, cada 13 minutos» sería CIERTO para la 25 dir 0** — y el equivalente
para las otras siete.

Con dos matices que salen del propio dato y no se pueden omitir:

1. ⚠️ **El primer intervalo del hueco no pertenece al ritmo.** Es de transición y llega a ser de
   36′ donde la mediana es 22′ (41 dir 0). Una frase que empiece exactamente en la última «primera
   salida» estaría incluyendo un intervalo que no cumple.
2. ⚠️ **La 35 dir 1 es el caso más flojo (94 %)** y su irregularidad está concentrada en los dos
   bordes: cuatro outliers entre 08:39 y 09:26, dos entre 21:06 y 21:28. En el centro, ninguno.

---

## Limitaciones, dichas

- **Un día (lunes 20/07/2026) y un feed.** Sábados, domingos y festivos no se han medido, y la
  propia web publica frecuencias distintas para ellos (17′ en la 25, 16′ en la 35…).
- **4 líneas × 2 sentidos = 8 mediciones, de 74 sentidos que tiene la red.** Suficiente para
  responder la pregunta en estas cuatro; **no** para afirmar que se cumple en toda la red.
- **La 21 no se ha podido medir** (GTFS 0 viajes hoy), y era justo la que abrió esta línea de
  investigación.
- Las salidas son las de **cabecera** (primer `stop_time` de cada viaje). El intervalo en una parada
  intermedia puede diferir por el tráfico.
