# Línea 21 — todo lo que hay hoy, en crudo

**Fecha de la captura:** 2026-07-20 (lunes), ~17:40 · **Peticiones a Avanza:** 6 · **Código tocado:** ninguno.

> ⚠️ **Esto es DATO CRUDO, no una auditoría.** No hay conclusiones ni propuestas: solo lo que dice
> cada fuente, tal cual. Las llegadas vivas son de un instante concreto y no se pueden reproducir.

---

## 0 · Qué tiene cada fuente

| fuente | ¿tiene la 21 hoy? |
|---|---|
| **GTFS · viajes hoy** | ⛔ **0** |
| **GTFS · viajes en el feed** | ✅ 1.109 (72 de los 105 días) |
| **Selector web de Avanza** | ✅ `21 – BARRIO JESUS – OLIVER MIRALBUENO` |
| **Tabla web (primeras/últimas)** | ✅ los dos sentidos |
| **Frecuencia media publicada** | ✅ |
| **«Información adicional»** | ⛔ no tiene, en ninguno de los dos sentidos |
| **⭐ Autobuses en la calle AHORA** | ✅ **coches 4260 y 4232, circulando** |

**El GTFS dice que hoy no circula. Está circulando.** Comprobado en tres postes:

```
poste 1297 Cosuenda / Paseo de Longares  → 21 · coche 4260 ·  0 min → MIRALBUENO
                                            21 · coche 4232 ·  7 min → MIRALBUENO
poste 3022 Marqués de La Cadena n.º 40   → 21 · coche 4260 ·  2 min → MIRALBUENO
                                            21 · coche 4232 ·  8 min → MIRALBUENO
poste 1071 Plaza Mozart                  → 21 · coche 4260 ·  3 min → MIRALBUENO
                                            21 · coche 4232 · 11 min → MIRALBUENO
```

### Patrón de los días sin servicio en el feed (33 de 105) — no es aleatorio

```
  16/07 (jue) → 17/07 (vie)     2 días
  20/07 (lun) → 24/07 (vie)     5 días   ← HOY
  27/07 (lun) → 31/07 (vie)     5 días
  03/08 (lun) → 07/08 (vie)     5 días
  10/08 (lun) → 14/08 (vie)     5 días
  17/08 (lun) → 21/08 (vie)     5 días
  24/08 (lun) → 28/08 (vie)     5 días
  31/08 (lun)                   1 día
```

Del **16/07 al 31/08** el feed le quita **todos los laborables** y le deja sábados y domingos.
Días de la semana en que sí circula, contados: `lun:8 · mar:9 · mié:9 · jue:8 · vie:8 · sáb:15 · dom:15`.

---

## 1 · Tabla web · sentido `-1` = **Hacia MIRALBUENO**

*(desde Bº Jesús. Corresponde a `directionId` 0.)*

> **Frecuencia media: laborables: 7, sábados: 13, domingos y festivos: 14 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · 9 filas únicas (de 10 `<tr>`)

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

**Últimas salidas** · 10 filas únicas (de 11 `<tr>`)

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
| 00:05 | Bº JESUS | **S.V.PAUL, 3** |
| 00:32 | Bº JESUS | **S.V.PAUL, 3** |

---

## 2 · Tabla web · sentido `-2` = **Hacia BARRIO JESÚS**

*(desde Miralbueno. Corresponde a `directionId` 1.)*

> **Frecuencia media: laborables: 7, sábados: 13, domingos y festivos: 14 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · 9 filas únicas

| Hora | Desde | Hasta |
|---|---|---|
| 04:55 | **COSO, 126** | Bº JESUS |
| 05:10 | MIRALBUENO | Bº JESUS |
| 05:33 | MIRALBUENO | Bº JESUS |
| 05:55 | MIRALBUENO | Bº JESUS |
| 06:18 | MIRALBUENO | Bº JESUS |
| 06:41 | MIRALBUENO | Bº JESUS |
| 06:53 | MIRALBUENO | Bº JESUS |
| 06:59 | **COSO, 126** | Bº JESUS |
| 07:05 | MIRALBUENO | Bº JESUS |

**Últimas salidas** · 10 filas únicas

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

> ⚠️ Las etiquetas de sentido salen de las **columnas DESDE/HASTA de la propia tabla**. El
> `<select id="selectSentido">` de la página **no trae opciones**, así que no hay nombre publicado
> que citar: se deduce del contenido, que es dato.

---

## 3 · GTFS — el día completo, de los días que sí cubre

**No hay ninguno para hoy.** Los dos más útiles:

### Miércoles 15/07 — último **laborable** con servicio

**dir 0 → Miralbueno** · 124 salidas
*desde: «Coso N.º 55 / Teatro Principal» y «Cosuenda / Paseo De Longares»*

```
04:44  05:04  05:10  05:33  05:56  06:20  06:35  06:50  07:06  07:20
07:33  07:46  07:59  08:09  08:20  08:32  08:43  08:53  08:55  09:07
09:14  09:21  09:28  09:35  09:42  09:49  09:56  10:03  10:11  10:19
10:27  10:34  10:41  10:48  10:55  11:02  11:09  11:16  11:24  11:31
11:39  11:46  11:53  12:00  12:08  12:16  12:24  12:31  12:38  12:46
12:53  13:00  13:08  13:16  13:24  13:32  13:40  13:48  13:56  14:04
14:12  14:20  14:28  14:36  14:43  14:50  14:58  15:06  15:14  15:22
15:29  15:37  15:45  15:52  15:59  16:07  16:15  16:23  16:30  16:37
16:45  16:53  17:01  17:09  17:16  17:23  17:31  17:39  17:47  17:55
18:03  18:11  18:18  18:26  18:34  18:42  18:50  18:58  19:05  19:13
19:21  19:29  19:37  19:45  19:53  20:02  20:11  20:20  20:29  20:39
20:48  20:58  21:08  21:18  21:28  21:39  21:51  22:02  22:17  22:32
22:51  23:12  23:35  24:24
```

**dir 1 → Barrio Jesús** · 130 salidas
*desde: «Coso N.º 126» y «Camino Del Pilón / Lagos De Coronas»*

```
04:54  05:10  05:17  05:34  05:57  06:20  06:43  06:55  07:02  07:07
07:17  07:27  07:38  07:49  08:01  08:13  08:25  08:37  08:49  08:56
09:01  09:08  09:09  09:17  09:20  09:25  09:33  09:40  09:47  09:54
10:01  10:08  10:15  10:22  10:29  10:36  10:43  10:50  10:57  11:04
11:12  11:20  11:28  11:35  11:42  11:50  11:57  12:04  12:11  12:19
12:26  12:34  12:41  12:48  12:55  13:03  13:11  13:19  13:27  13:34
13:42  13:49  13:56  14:04  14:12  14:20  14:28  14:35  14:43  14:51
14:58  15:05  15:13  15:21  15:29  15:36  15:43  15:51  15:59  16:07
16:15  16:22  16:29  16:37  16:44  16:51  16:59  17:07  17:15  17:22
17:30  17:38  17:46  17:54  18:02  18:09  18:16  18:24  18:32  18:40
18:48  18:55  19:03  19:10  19:18  19:25  19:32  19:40  19:47  19:55
20:04  20:13  20:23  20:33  20:43  20:53  21:04  21:14  21:24  21:34
21:44  21:55  22:06  22:20  22:34  22:50  23:05  23:21  23:39  24:00
```

### Sábado 25/07 — el día con servicio **más cercano a hoy**

**dir 0 → Miralbueno** · 71 salidas

```
04:48  05:18  05:48  06:16  06:44  07:12  07:32  07:52  08:12  08:30
08:47  09:05  09:24  09:43  09:46  10:03  10:20  10:35  10:50  11:04
11:18  11:33  11:48  12:03  12:18  12:33  12:48  13:02  13:17  13:32
13:47  14:02  14:17  14:32  14:46  15:00  15:14  15:27  15:41  15:54
16:08  16:22  16:36  16:51  17:05  17:19  17:33  17:47  18:01  18:16
18:31  18:46  19:00  19:13  19:25  19:37  19:50  20:05  20:21  20:43
21:03  21:23  21:44  22:06  22:28  22:54  23:28  24:06  24:40  25:02
25:32
```

**dir 1 → Barrio Jesús** · 70 salidas

```
05:07  05:34  06:03  06:31  06:59  07:29  07:59  08:13  08:19  08:39
08:59  09:17  09:34  09:49  10:01  10:14  10:28  10:42  10:57  11:12
11:27  11:42  11:57  12:12  12:27  12:42  12:57  13:12  13:27  13:42
13:56  14:10  14:25  14:40  14:54  15:08  15:21  15:35  15:49  16:03
16:16  16:30  16:44  16:58  17:12  17:27  17:42  17:57  18:09  18:21
18:33  18:45  18:57  19:10  19:24  19:38  19:52  20:08  20:27  20:50
21:15  21:37  21:58  22:18  22:39  23:00  23:20  23:50  24:21  24:51
```

> ⚠️ Las horas `24:xx` y `25:xx` son del GTFS y **no son un error**: el estándar deja pasar de las
> 24 para los viajes que empiezan un día y siguen en el siguiente.
> Las salidas son las de **cabecera** (el primer `stop_time` de cada viaje).

---

## 4 · Qué falta

**¿Existe en algún sitio el día completo de la 21 para hoy? NO.**

- El GTFS **niega** que circule hoy — y hay dos autobuses en la calle.
- La web da **19 salidas por sentido** (9 primeras + 10 últimas) de un día que, a 7 minutos de
  frecuencia media, tiene del orden de **124–130**.

**Lo máximo que se puede saber hoy de la 21:**

1. **Que circula** — por las llegadas vivas, poste a poste.
2. **Sus primeras y últimas salidas de hoy**, con origen y destino — de la tabla web.
3. **Su frecuencia media declarada**: 7 min en laborables.
4. **Su recorrido real de hoy** — de `get_stops_list`.
5. **La forma de un día completo**, pero de **otro día** (15/07 o 25/07), no de hoy.

**Lo que no hay por ninguna vía: las salidas intermedias de hoy.** Entre las 07:04 y las 21:30
(sentido Miralbueno) la web no publica ni una hora, y el GTFS no tiene el día.

---

## Nota sobre una medición anterior

La 21 aparecía en [`PRUEBA_CADENCIA_Y_CORTE.md`](PRUEBA_CADENCIA_Y_CORTE.md) entre las 16 rutas
«que el GTFS deja caer hoy». Con esto queda a la vista que **no es un descarte aleatorio del feed,
sino la reducción de verano** (laborables sin servicio del 16/07 al 31/08) — salvo por el detalle de
que **hoy hay autobuses circulando igualmente**.

Las dos cosas son datos y las dos están comprobadas. **No se interpretan aquí.**
