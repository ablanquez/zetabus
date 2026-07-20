# Líneas 25, 35, 38 y 41 — todo lo que hay hoy, en crudo

**Fecha de la captura:** 2026-07-20 (lunes), ~18:05 · **Peticiones a Avanza:** 20 · **Código tocado:** ninguno.
Mismo formato que [`DATOS_CRUDOS_LINEA_21.md`](DATOS_CRUDOS_LINEA_21.md), para poder ponerlos al lado.

> ⚠️ **Esto es DATO CRUDO, no una auditoría.** No hay conclusiones ni propuestas: solo lo que dice
> cada fuente, tal cual. Las llegadas vivas son de un instante concreto y no se pueden reproducir.

**Ahorro de peticiones:** los postes de muestra para comprobar los autobuses vivos salen del
**artefacto ya horneado** (`sentidosDe(...).official.stops`), no de `get_stops_list`. Son 8 páginas
web + 12 consultas de poste.

---

## Cuadro comparativo (las cuatro, más la 21 como referencia)

| | **25** | **35** | **38** | **41** | *21 (ref.)* |
|---|---|---|---|---|---|
| GTFS · viajes **hoy** | ✅ 80 + 82 | ✅ 122 + 121 | ✅ 128 + 124 | ✅ 45 + 46 | ⛔ **0** |
| GTFS · viajes en el feed | 838 | 1.190 | 1.292 | 581 | 1.109 |
| GTFS · días con servicio | **105/105** | 100/105 | **105/105** | **105/105** | 72/105 |
| Selector web de Avanza | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tabla web | ✅ | ✅ | ✅ | ✅ | ✅ |
| Frecuencia media publicada | ✅ | ✅ | ✅ | ✅ | ✅ |
| «Información adicional» | ⛔ no tiene | ⛔ no tiene | ✅ **sí** | ⛔ no tiene | ⛔ no tiene |
| ⭐ Autobuses en la calle | ✅ 6 vistos | ✅ 4 vistos | ✅ 4 vistos | ✅ 6 vistos | ✅ 2 vistos |
| Filas web (1ª / últ.), sent. −1 | 2 / 9 | 13 / 14 | 17 / 20 | **1 / 2** | 9 / 10 |
| Filas web (1ª / últ.), sent. −2 | 2 / 9 | 18 / 11 | 14 / 18 | **1 / 3** | 9 / 10 |

**Salidas reales de hoy frente a las que publica la web:**

```
  25 dir0    80 reales · 11 en web =  14 %      35 dir0   122 · 27 =  22 %
  25 dir1    82 reales · 11 en web =  13 %      35 dir1   121 · 29 =  24 %
  38 dir0   128 reales · 37 en web =  29 %      41 dir0    45 ·  3 =   7 %
  38 dir1   124 reales · 32 en web =  26 %      41 dir1    46 ·  4 =   9 %
```

---

## Días sin servicio en el feed

| línea | días sin servicio | patrón |
|---|---|---|
| **25** | 0 | — circula los 105 días |
| **38** | 0 | — circula los 105 días |
| **41** | 0 | — circula los 105 días |
| **35** | 5 | **cinco domingos sueltos**: 06/09, 13/09, 20/09, 27/09, 04/10 |
| *21* | *33* | *laborables del 16/07 al 31/08* |

Recuento por día de la semana:

```
  25 · lun:15 mar:15 mié:15 jue:15 vie:15 sáb:15 dom:15
  35 · lun:15 mar:15 mié:15 jue:15 vie:15 sáb:15 dom:10   ← 5 domingos menos
  38 · lun:15 mar:15 mié:15 jue:15 vie:15 sáb:15 dom:15
  41 · lun:15 mar:15 mié:15 jue:15 vie:15 sáb:15 dom:15
  21 · lun: 8 mar: 9 mié: 9 jue: 8 vie: 8 sáb:15 dom:15
```

⚠️ **El patrón del 35 no es el de la 21.** Son cinco domingos de septiembre y octubre, no laborables
de verano. Y no cae en hoy.

---

# LÍNEA 25 · La Cartuja — Puerta del Carmen

**GTFS hoy:** ✅ 80 salidas (dir 0) + 82 (dir 1) · **días con servicio:** 105/105

**Autobuses en la calle ahora:**
```
poste 1249 P. Pamplona n.º 15 / Puerta del Carmen → 4870  5 min → LA CARTUJA
                                                     4805 18 min → LA CARTUJA
poste 1122 Miguel Servet / Camino Enmedio         → 4801  4 min → LA CARTUJA
                                                     4870 10 min → LA CARTUJA
poste  278 Catorce de Septiembre n.º 29           → 4808  5 min → PUERTA DEL CARMEN
                                                     4801 17 min → PUERTA DEL CARMEN
```

## Tabla web · sentido `-1` = **Hacia PUERTA DEL CARMEN** *(desde La Cartuja · `directionId` 0)*

> **Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · 2 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:45 | LA CARTUJA | PUERTA DEL CARMEN |
| 06:10 | LA CARTUJA | PUERTA DEL CARMEN |

**Últimas salidas** · 9 filas únicas (de 10 `<tr>`)

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

## Tabla web · sentido `-2` = **Hacia LA CARTUJA** *(desde Puerta del Carmen · `directionId` 1)*

> **Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · 2 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 05:25 | PUERTA DEL CARMEN | LA CARTUJA |
| 06:10 | PUERTA DEL CARMEN | LA CARTUJA |

**Últimas salidas** · 9 filas únicas (de 10 `<tr>`)

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

## GTFS · el día completo de HOY

**dir 0 → Puerta del Carmen** · 80 salidas · *desde «Catorce De Septiembre N.º 29»*

```
05:45  06:10  06:34  06:46  06:59  07:12  07:24  07:36  07:49  08:02
08:15  08:27  08:40  08:53  09:06  09:19  09:32  09:44  09:57  10:10
10:24  10:37  10:50  11:03  11:16  11:30  11:43  11:56  12:09  12:22
12:35  12:48  13:01  13:15  13:29  13:43  13:56  14:10  14:23  14:36
14:50  15:03  15:16  15:29  15:42  15:55  16:08  16:21  16:34  16:47
17:00  17:13  17:26  17:39  17:52  18:05  18:18  18:31  18:44  18:57
19:10  19:23  19:36  19:49  20:02  20:15  20:28  20:41  20:53  21:06
21:18  21:29  21:41  21:54  22:16  22:38  23:02  23:21  23:47  24:07
```

**dir 1 → La Cartuja** · 82 salidas · *desde «P. Pamplona N.º 15 / Puerta Del Carmen» y «Miguel Servet / Camino Enmedio»*

```
05:25  06:00  06:10  06:34  06:34  06:46  06:59  07:11  07:24  07:37
07:49  08:02  08:15  08:28  08:41  08:54  09:07  09:20  09:33  09:46
09:59  10:12  10:25  10:38  10:51  11:04  11:17  11:30  11:43  11:56
12:09  12:22  12:35  12:48  13:01  13:14  13:27  13:41  13:55  14:09
14:23  14:37  14:50  15:03  15:17  15:30  15:43  15:56  16:09  16:22
16:35  16:48  17:01  17:14  17:27  17:40  17:53  18:06  18:19  18:32
18:45  18:58  19:11  19:24  19:37  19:50  20:03  20:16  20:29  20:41
20:54  21:06  21:18  21:30  21:53  22:15  22:39  22:59  23:24  23:43
24:10  24:30
```

---

# LÍNEA 35 · Parque Goya — Seminario

**GTFS hoy:** ✅ 122 salidas (dir 0) + 121 (dir 1) · **días con servicio:** 100/105
**Sin servicio:** 5 domingos sueltos — 06/09, 13/09, 20/09, 27/09, 04/10

**Autobuses en la calle ahora:**
```
poste 209 Av. Ramón Sainz de Varanda / Colegio → 4864  6 min → PARQUE GOYA
                                                  4313 19 min → PARQUE GOYA
poste 340 Coso n.º 188                         → (6 llegadas, ninguna de la 35)
poste 993 La Fragua / Parque Tapices de Goya   → 4651  8 min → SEMINARIO
                                                  4684 20 min → SEMINARIO
```

## Tabla web · sentido `-1` = **Hacia SEMINARIO** *(desde Parque Goya · `directionId` 0)*

> **Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · 13 filas únicas (de 14 `<tr>`)

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

**Últimas salidas** · 14 filas únicas (de 15 `<tr>`)

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
| 00:11 | PARQUE GOYA | **P. MINA** |
| 00:27 | PARQUE GOYA | SEMINARIO |
| 00:51 | PARQUE GOYA | **P. MINA** |

## Tabla web · sentido `-2` = **Hacia PARQUE GOYA** *(desde Seminario / P. Mina · `directionId` 1)*

> **Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · 18 filas únicas (de 19 `<tr>`)

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

**Últimas salidas** · 11 filas únicas (de 12 `<tr>`)

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
| 00:31 | **P. MINA** | PARQUE GOYA |
| 01:09 | **P. MINA** | PARQUE GOYA |

## GTFS · el día completo de HOY

**dir 0 → Seminario / Coso 126** · 122 salidas · *desde «La Fragua / Parque Tapices De Goya» y «Plaza De España»*

```
05:00  05:33  06:06  06:39  06:40  06:56  07:12  07:29  07:45  07:58
08:11  08:23  08:32  08:41  08:50  08:59  09:08  09:16  09:25  09:34
09:42  09:51  10:00  10:08  10:16  10:24  10:33  10:41  10:50  10:58
11:06  11:14  11:23  11:32  11:41  11:50  11:59  12:07  12:15  12:24
12:32  12:41  12:49  12:57  13:05  13:14  13:23  13:32  13:41  13:50
13:58  14:06  14:15  14:23  14:32  14:40  14:48  14:57  15:05  15:13
15:22  15:31  15:40  15:48  15:56  16:04  16:12  16:20  16:28  16:36
16:45  16:53  17:01  17:09  17:18  17:27  17:35  17:43  17:51  17:59
18:07  18:15  18:23  18:32  18:41  18:49  18:57  19:04  19:12  19:20
19:27  19:34  19:42  19:50  19:58  20:06  20:14  20:22  20:30  20:38
20:45  20:53  21:01  21:11  21:21  21:31  21:41  21:51  22:01  22:12
22:22  22:32  22:42  22:54  23:06  23:20  23:35  23:54  24:11  24:27
24:51  25:29
```

**dir 1 → Parque Goya** · 121 salidas · *desde «Coso N.º 126» y «Av. Ramón Sainz De Varanda / Colegio»*

```
04:40  05:11  05:40  05:49  06:22  06:29  06:55  07:12  07:29  07:30
07:46  08:02  08:03  08:15  08:20  08:27  08:36  08:39  08:51  09:03
09:10  09:15  09:25  09:26  09:34  09:43  09:52  10:00  10:08  10:16
10:25  10:34  10:43  10:52  11:00  11:08  11:16  11:25  11:33  11:42
11:50  11:58  12:06  12:15  12:24  12:33  12:42  12:51  12:59  13:07
13:16  13:24  13:33  13:41  13:49  13:58  14:07  14:16  14:25  14:34
14:43  14:51  14:59  15:07  15:15  15:24  15:32  15:40  15:49  15:57
16:05  16:13  16:22  16:31  16:39  16:47  16:55  17:03  17:11  17:19
17:27  17:36  17:45  17:54  18:01  18:08  18:16  18:24  18:31  18:38
18:46  18:54  19:02  19:10  19:18  19:26  19:34  19:42  19:49  19:57
20:06  20:16  20:26  20:36  20:46  20:56  21:06  21:17  21:28  21:38
21:48  22:00  22:14  22:29  22:43  22:56  23:09  23:27  23:41  24:31
25:09
```

---

# LÍNEA 38 · Bajo Aragón — Valdefierro

**GTFS hoy:** ✅ 128 salidas (dir 0) + 124 (dir 1) · **días con servicio:** 105/105

**Autobuses en la calle ahora:**
```
poste 8000 Instalaciones Az        → 4119  1 min → VALDEFIERRO
                                      4116  7 min → VALDEFIERRO
poste  263 Av. de Valencia n.º 38  → (0 llegadas)
poste  806 Tulipán n.º 67          → 4271  0 min → BAJO ARAGON
                                      4984  9 min → BAJO ARAGON
```

## Tabla web · sentido `-1` = **Hacia VALDEFIERRO** *(desde Bajo Aragón · `directionId` 0)*

> **Frecuencia media: laborables: 8, sábados: 12, domingos y festivos: 14 min.**
>
> **Información adicional** (literal): *«**Antes de terminal.** El acceso dirección Bajo Aragón podrá
> realizarse desde la calle Biel / Dalia. **Después de terminal.** Los usuarios podrán continuar con
> el mismo título de transporte hasta la parada de Avda. de Valdefierro 1 (bar Pato Rojo).»*

**Primeras salidas** · 17 filas únicas (de 18 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:45 | BAJO ARAGON | **P MINA** |
| 05:00 | BAJO ARAGON | VALDEFIERRO |
| 05:10 | BAJO ARAGON | **P MINA** |
| 05:22 | BAJO ARAGON | **P MINA** |
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

**Últimas salidas** · 20 filas únicas (de 21 `<tr>`)

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
| 00:10 | BAJO ARAGON | **P MINA** |
| 00:35 | BAJO ARAGON | **P MINA** |
| 01:05 | BAJO ARAGON | **P MINA** |

## Tabla web · sentido `-2` = **Hacia BAJO ARAGÓN** *(desde Valdefierro / P. Mina · `directionId` 1)*

> **Frecuencia media: laborables: 8, sábados: 12, domingos y festivos: 14 min.**
>
> **Información adicional**: la misma, literal, que en el sentido `-1`.

**Primeras salidas** · 14 filas únicas (de 15 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 04:56 | **P MINA** | BAJO ARAGON |
| 05:20 | VALDEFIERRO | BAJO ARAGON |
| 05:22 | **P MINA** | BAJO ARAGON |
| 05:34 | **P MINA** | BAJO ARAGON |
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

**Últimas salidas** · 18 filas únicas (de 19 `<tr>`)

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
| 00:25 | **P MINA** | BAJO ARAGON |
| 00:35 | VALDEFIERRO | BAJO ARAGON |
| 00:50 | **P MINA** | BAJO ARAGON |
| 01:15 | **P MINA** | BAJO ARAGON |

## GTFS · el día completo de HOY

**dir 0 → Plaza San Miguel / Valdefierro** · 128 salidas · *desde «Instalaciones Az»*

```
04:45  05:00  05:10  05:22  05:34  05:47  05:59  06:10  06:22  06:31
06:40  06:49  06:57  07:05  07:13  07:21  07:29  07:37  07:45  07:54
08:03  08:12  08:21  08:30  08:39  08:47  08:55  09:03  09:12  09:20
09:28  09:36  09:44  09:53  10:02  10:11  10:20  10:29  10:37  10:45
10:53  11:01  11:09  11:17  11:26  11:35  11:44  11:53  12:02  12:11
12:20  12:28  12:36  12:44  12:53  13:02  13:10  13:19  13:28  13:37
13:46  13:55  14:04  14:13  14:21  14:30  14:39  14:48  14:56  15:04
15:13  15:22  15:31  15:40  15:48  15:56  16:04  16:12  16:20  16:28
16:37  16:45  16:53  17:01  17:08  17:15  17:23  17:31  17:39  17:47
17:55  18:03  18:11  18:19  18:27  18:35  18:43  18:51  18:59  19:07
19:15  19:23  19:31  19:40  19:49  19:59  20:10  20:20  20:30  20:41
20:52  21:03  21:14  21:25  21:37  21:49  22:02  22:14  22:27  22:40
22:53  23:06  23:19  23:33  23:50  24:10  24:35  25:05
```

**dir 1 → Bajo Aragón** · 124 salidas · *desde «Plaza San Miguel N.º 5» y «Tulipán N.º 67»*

```
04:56  05:20  05:22  05:34  05:36  05:53  06:09  06:23  06:34  06:46
06:57  07:09  07:20  07:30  07:40  07:50  08:00  08:09  08:18  08:26
08:34  08:42  08:50  08:58  09:07  09:16  09:25  09:34  09:42  09:50
09:58  10:07  10:15  10:23  10:31  10:40  10:49  10:58  11:07  11:16
11:25  11:33  11:41  11:49  11:58  12:06  12:14  12:23  12:32  12:41
12:50  12:59  13:08  13:17  13:25  13:34  13:43  13:52  14:01  14:09
14:18  14:27  14:36  14:45  14:53  15:01  15:09  15:17  15:25  15:34
15:43  15:51  15:59  16:08  16:17  16:26  16:35  16:43  16:51  16:59
17:07  17:15  17:23  17:32  17:40  17:48  17:56  18:04  18:11  18:19
18:27  18:35  18:43  18:51  18:59  19:07  19:15  19:23  19:31  19:39
19:47  19:55  20:04  20:12  20:20  20:29  20:38  20:47  20:57  21:09
21:21  21:34  21:47  22:00  22:13  22:27  22:44  23:04  23:27  23:50
24:25  24:35  24:50  25:15
```

---

# LÍNEA 41 · Puerta del Carmen — Rosales del Canal

**GTFS hoy:** ✅ 45 salidas (dir 0) + 46 (dir 1) · **días con servicio:** 105/105

**Autobuses en la calle ahora:**
```
poste 1274 Hernán Cortés n.º 10                     → 4625 15 min → ROSALES DEL CANAL
                                                       4875 43 min → ROSALES DEL CANAL
poste  120 Av. de La Ilustración / Iglesia          → 4635 11 min → ROSALES DEL CANAL
                                                       4625 33 min → ROSALES DEL CANAL
poste 1036 Johan Sebastian Bach / Clínica Montecanal→ 4875 10 min → PUERTA DEL CARMEN
                                                       4635 23 min → PUERTA DEL CARMEN
```

## Tabla web · sentido `-1` = **Hacia ROSALES DEL CANAL** *(desde Puerta del Carmen · `directionId` 0)*

> **Frecuencia media: laborables: 20, sábados: 20, domingos y festivos: 20 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · **1 fila única** (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:00 | PUERTA DEL CARMEN | ROSALES DEL CANAL |

**Últimas salidas** · 2 filas únicas (de 3 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:25 | PUERTA DEL CARMEN | ROSALES DEL CANAL |
| 23:00 | PUERTA DEL CARMEN | ROSALES DEL CANAL |

## Tabla web · sentido `-2` = **Hacia PUERTA DEL CARMEN** *(desde Rosales del Canal · `directionId` 1)*

> **Frecuencia media: laborables: 20, sábados: 20, domingos y festivos: 20 min.**
> Información adicional: — *no tiene*

**Primeras salidas** · **1 fila única** (de 2 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 06:00 | ROSALES DEL CANAL | PUERTA DEL CARMEN |

**Últimas salidas** · 3 filas únicas (de 4 `<tr>`)

| Hora | Desde | Hasta |
|---|---|---|
| 22:22 | ROSALES DEL CANAL | PUERTA DEL CARMEN |
| 22:55 | ROSALES DEL CANAL | **H. CORTES, 9** |
| 23:30 | ROSALES DEL CANAL | **H. CORTES, 9** |

## GTFS · el día completo de HOY

**dir 0 → Rosales del Canal** · 45 salidas · *desde «Hernán Cortés N.º 10»*

```
06:00  06:36  06:57  07:18  07:40  08:02  08:24  08:46  09:08  09:30
09:52  10:14  10:36  10:58  11:21  11:44  12:07  12:30  12:53  13:16
13:39  14:01  14:24  14:47  15:09  15:31  15:53  16:14  16:36  16:58
17:20  17:43  18:05  18:27  18:50  19:12  19:34  19:56  20:18  20:40
21:02  21:25  21:49  22:25  23:00
```

**dir 1 → Puerta del Carmen** · 46 salidas · *desde «Johan Sebastian Bach / Clínica Montecanal»*

```
06:00  06:32  07:05  07:26  07:48  08:10  08:32  08:54  09:16  09:38
10:00  10:22  10:44  11:06  11:29  11:52  12:15  12:39  13:02  13:25
13:48  14:11  14:33  14:55  15:17  15:38  16:00  16:22  16:44  17:06
17:28  17:50  18:13  18:35  18:57  19:20  19:42  20:04  20:26  20:48
21:11  21:35  21:58  22:22  22:55  23:30
```

---

## Qué falta

**¿Existe el día completo de hoy en algún sitio? SÍ, en las cuatro.** A diferencia de la 21, el
GTFS cubre hoy las cuatro líneas, así que el día entero está disponible en el feed, salida a salida.

**Lo que la web publica frente al día real:**

| línea·sentido | salidas reales hoy | publicadas en web | % |
|---|---:|---:|---:|
| 25 · dir 0 | 80 | 11 | 14 % |
| 25 · dir 1 | 82 | 11 | 13 % |
| 35 · dir 0 | 122 | 27 | 22 % |
| 35 · dir 1 | 121 | 29 | 24 % |
| 38 · dir 0 | 128 | 37 | 29 % |
| 38 · dir 1 | 124 | 32 | 26 % |
| 41 · dir 0 | 45 | **3** | **7 %** |
| 41 · dir 1 | 46 | **4** | **9 %** |

**Notas sobre el dato, sin interpretarlo:**

- Las horas `24:xx` y `25:xx` son del GTFS y **no son un error**: el estándar deja pasar de las 24
  para los viajes que empiezan un día y siguen en el siguiente.
- Las salidas son las de **cabecera** (el primer `stop_time` de cada viaje).
- Las etiquetas de sentido salen de las **columnas DESDE/HASTA de la propia tabla web**: el
  `<select id="selectSentido">` no trae opciones en ninguna de las ocho páginas.
- Varias líneas tienen **más de una cabecera** en el mismo sentido, y aparece tanto en la web como
  en el GTFS: la 35 sale de Seminario **y** de P. Mina; la 38 de Valdefierro **y** de P. Mina; la 25
  dir 1 de dos paradas distintas. Se transcribe tal cual.
- En el poste 340 (Coso n.º 188) había 6 llegadas y **ninguna de la 35**; en el poste 263 (Av. de
  Valencia n.º 38), **0 llegadas**. Se anota tal cual, sin deducir nada de ello.
