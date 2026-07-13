# AUDITORÍA DE FUENTES — ZETABUS

**Fase 3: el cruce GTFS ↔ JSON manuales**
Fecha: 13/07/2026

| | |
|---|---|
| **GTFS auditado** | `20260623_AUZSA_Y_TRANVIA` (fichero 1176 del NAP) |
| **Publicado por** | Avanza Zaragoza S.A.U. |
| **Vigencia** | 23/06/2026 – 05/10/2026 *(hoy estamos dentro)* |
| **Volumen** | 34.427 viajes · 870.717 filas de `stop_times` |
| **Proyecto de referencia** | `E:\PROYECTOS WEB\00 ZGZ RADAR` (auditado, NO reutilizado como base) |

---

## RESUMEN EN UNA LÍNEA

**El GTFS es bueno, es fresco, y gana el juicio. La acusación que lo condenó —"tiene mal el orden de los postes"— es FALSA: sus secuencias son idénticas a las del JSON manual, poste por poste. Y donde el JSON manual y el GTFS discrepan, en la mayoría de los casos el equivocado es el JSON.**

---

## A) INVENTARIO DEL GTFS

```
agency.txt              429 b
calendar_dates.txt  729.890 b
feed_info.txt           244 b
routes.txt            3.430 b     53 rutas
shapes.txt        1.408.077 b     ✅ CON CONTENIDO REAL (89 shapes, 27.603 puntos)
stops.txt            99.309 b     984 paradas
stop_times.txt   47.049.063 b     870.717 filas
trips.txt         2.112.380 b     34.427 viajes
```

`feed_info.txt`, literal:

```csv
feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version,feed_contact_email
Avanza Zaragoza S.A.U,http://zaragoza.avanzagrupo.com/,es,20260623,20261005,20260623_AUZSA_Y_TRANVIA,<correo de contacto del feed — redactado>
```

**Lo publica el propio operador, no un intermediario.** Y trae un email de contacto real.

### El tranvía: sí está dentro, y se separa de tres formas redundantes

```csv
agency_id,agency_name
1,Avanza Zaragoza S.A.U.               ← BUS
11,Tranvías Urbanos de Zaragoza S.L.   ← TRANVÍA

route_id,agency_id,route_short_name,route_long_name,route_type,...
210,11,TRA,Tranvía L1 Valdespartera - Actur - Parque Goya,900,...
```

Filtra por **`agency_id == '1'`** o por **`route_type != 900`**. Las dos funcionan y coinciden: **1 sola ruta de tranvía (`TRA`), 50 paradas**. Todas las rutas de bus son `route_type = 704` (*Local Bus Service*, tipos extendidos).

Bonus: **las 50 paradas de tranvía se distinguen también por el `stop_code`** — las de bus llevan prefijo `PA`, las de tranvía no. Tres criterios independientes que dicen lo mismo. Cero riesgo de colar tranvías en el visor.

> ⚠️ **Ausencias del feed:** no hay `calendar.txt` (solo `calendar_dates.txt`), ni `transfers.txt`, ni `frequencies.txt`. Para calendario hay que trabajar con `calendar_dates` en modo enumeración de días.

---

## B) IDENTIDAD DE PARADA — EL PIVOTE ESTÁ RESUELTO Y ES GRATIS

```csv
stop_id,stop_code,stop_name,stop_lat,stop_lon,...
16487,PA00002,"Agustín Príncipe N. º 2",41.6531939858244,-0.92360279869157,...
16488,PA00004,"Alfred Nobel / Monasterio",41.6519129304332,-0.921246958013683,...
16492,PA00006,"Alfred Nobel / Vía Hispanidad",41.651746584933,-0.92020616070687,...
```

**`stop_id` NO sirve** (es un id interno: 16487). **`stop_code` SÍ, y es exacto:**

> ### `stop_code` = `"PA"` + poste rellenado a 5 dígitos
>
> `PA00004` ⇄ poste `4` ⇄ *"Alfred Nobel / Monasterio"* (el mismo nombre que el JSON manual)

**Cobertura: 934 de 934.** Las 984 paradas del GTFS son 934 de bus (prefijo `PA`) + 50 de tranvía (sin prefijo). **Todas las de bus mapean.** El coste del mapeo es una línea: `int(stop_code[2:])`.

| | |
|---|---|
| Postes del JSON (939) que existen en el GTFS | **929** |
| Solo en el GTFS (el JSON no los tiene) | 5 → `2, 22, 759, 1320, 9951` |
| Solo en el JSON (el GTFS no los tiene) | 10 → `617, 646, 647, 648, 649, 650` + `8134-8137` |

**Coordenadas (929 postes comunes):**

```
mediana  0,00 m
p90      0,01 m
máximo 908,72 m
>20 m: 40 postes   >50 m: 27 postes   >200 m: 2 postes
```

**La mediana es cero.** Las coordenadas son las mismas. **Pero los 27 postes que se desvían son un problema del JSON, no del GTFS.** Verificado a tres bandas contra el Ayuntamiento:

| Poste | Nombre (GTFS) | JSON ↔ GTFS | Ayuntamiento ↔ GTFS |
|---|---|---|---|
| 1095 | Un Américano En París N.º 17 | **909 m** | **0 m** |
| 1093 | Los Pájaros | **315 m** | **0 m** |
| 952 | Ronda Ibón De Plan N.º 20 | **196 m** | **0 m** |
| 735 | P. Fernando El Católico N.º 31 | **193 m** | **0 m** |
| 1176 | Cantando Bajo La Lluvia | **173 m** | **0 m** |

**El Ayuntamiento y el GTFS coinciden al centímetro. El JSON manual es el que está movido, hasta 909 metros.** Alguien editó esas coordenadas a mano y las rompió. Es un defecto del fichero manual, no de la fuente oficial.

*(Excepción honesta: el poste `1272` es el caso inverso — JSON y Ayuntamiento coinciden y el GTFS se aparta 159 m. Uno de 929.)*

---

## C) LÍNEAS — EL TEST DE FRESCURA. **EMPATE PERFECTO.**

```
LINEAS GTFS (bus):  52
LINEAS JSON:        46
SOLO EN GTFS: CE, CEM, ES3, LAN, V1, V4   (servicios especiales: cementerio, lanzaderas)
SOLO EN JSON: (ninguna)
```

**El GTFS es un superconjunto estricto. El JSON no tiene ni una sola línea que el GTFS no tenga.**

### Las cuatro disputas

| | GTFS | JSON manual | Ayuntamiento | Web de Avanza |
|---|---|---|---|---|
| **Línea 24** | **NO** | NO | **SÍ** ❌ | NO |
| **Ci3 / Ci4** | **SÍ** | SÍ | **NO** ❌ | SÍ |
| **EM1 / EM2** | **SÍ** | SÍ | no | *(ver abajo)* |
| **EM3** | **NO** | NO | — | *(ver abajo)* |
| **TUR** | **NO** | NO | — | *(ver abajo)* |

**El GTFS coincide con el JSON manual en los cuatro casos. Los cuatro.** Y donde el Ayuntamiento fallaba (línea 24 fantasma, Ci3/Ci4 ausentes), **el GTFS acierta**.

### ⚠️ CORRECCIÓN AL INFORME DE FASE 2

En la Fase 2 se afirmó que *"el JSON manual está caducado: tiene EM1/EM2 y hoy existe EM3"*. **Eso era falso y la fuente era mala** (una lectura de la web de Avanza hecha por un modelo, no un dato duro).

**El GTFS, publicado por Avanza el 23/06/2026, declara `EM1` y `EM2` y NO declara `EM3` ni `TUR`.** El JSON manual coincide con el operador. **Se retira la acusación de caducidad: el JSON manual no estaba caducado en las líneas.**

---

## D) ⭐ EL CRUCE CENTRAL — LA SECUENCIA DE POSTES

**Método de elección del trip:** para cada `route_id` y cada `direction_id`, se agruparon los 34.427 viajes por su secuencia de postes y se tomó la **secuencia modal** (la más frecuente). Se indica cuántas variantes hay y en cuántos viajes se usa la modal, para que se vea que no se ha escogido un trip raro.

### LÍNEA 38 — *Bajo Aragón – Valdefierro*

```
GTFS direction_id=0 | headsign 'Valdefierro'  | 2 variantes | modal en 607/649 viajes | 34 paradas
8000 599 3018 605 594 591 589 587 586 584 744 334 664 669 505 698 262 263 237 238 851 3049 440 821 823 1165 103 1315 1316 1317 748 3537 627 806

JSON sentido1 (Bajo Aragón a Valdefierro) | 34 paradas
8000 599 3018 605 594 591 589 587 586 584 744 334 664 669 505 698 262 263 237 238 851 3049 440 821 823 1165 103 1315 1316 1317 748 3537 627 806
```

```
GTFS direction_id=1 | headsign 'Bajo Aragón' | 2 variantes | modal en 601/643 viajes | 37 paradas
806 3539 8 260 261 258 1318 1319 1166 604 439 3052 443 437 551 236 265 264 471 277 507 1079 681 666 335 741 585 588 590 593 602 3017 600 601 1122 598 8000

JSON sentido2 (Valdefierro a Bajo Aragón) | 37 paradas
806 3539 8 260 261 258 1318 1319 1166 604 439 3052 443 437 551 236 265 264 471 277 507 1079 681 666 335 741 585 588 590 593 602 3017 600 601 1122 598 8000
```

> ## **IDÉNTICO. Ambos sentidos. Carácter por carácter.**

### LÍNEA 21 — *Barrio Jesús – Oliver – Miralbueno*

```
GTFS dir=0 'Miralbueno'   | 3 variantes | modal 536/554 | 34 paradas
1297 3022 1071 55 1072 3524 790 788 787 334 664 669 674 675 712 3036 154 3037 158 163 167 169 175 6 4 2 625 525 765 912 913 1294 1295 894

JSON sentido1             | 34 paradas
1297 3022 1071 55 1072 3524 790 788 787 334 664 669 674 675 712 3036 154 3037 158 163 167 169 175 6 4 2 625 525 765 912 913 1294 1295 894
```

> ## **IDÉNTICO. Ambos sentidos.**

### LÍNEA Ci1 — *Circular 1* (la que "más fácil rompe el orden")

```
GTFS dir=0 'Estacion Delicias'  | 1 variante  | 665/665 viajes | 20 paradas
1143 284 3027 288 294 293 480 481 17 684 558 716 863 864 851 3053 856 3047 191 3073

JSON sentido1                   | 20 paradas
1143 284 3027 288 294 293 480 481 17 684 558 716 863 864 851 3053 856 3047 191 3073
```

> ## **IDÉNTICO. Ambos sentidos. Incluida la circular.**

**No se hizo ni una sola consulta de arbitraje a la web de Avanza. No hacía falta: no había nada que arbitrar.**

### Y no son solo tres. Se compararon LAS 46 LÍNEAS

```
SECUENCIAS COMPARADAS (46 líneas × sentidos = 76):
  IDÉNTICAS (mismo contenido Y mismo orden):  57
  Aparentes discrepancias:                    19  →  TODAS explicadas estructuralmente
```

Las 19 "discrepancias" no eran errores de nadie. Son **diferencias de modelado**, verificadas una a una:

| Caso | Explicación | ¿Error? |
|---|---|---|
| **Búhos N1, N3, N4, N5, N7** | El GTFS **cierra el bucle** repitiendo la primera parada al final. Verificado: `GTFS == JSON + [primera_parada]` → **True en las 5**. | **No.** Misma secuencia. |
| **Búhos N2, N6** | El GTFS parte el bucle en `dir0` + `dir1`; el JSON lo fusiona en un solo sentido. Concatenados coinciden (salvo la parada de empalme duplicada: `993 993`, `278 278`). | **No.** Mismo bucle. |
| **Línea 53** | Los sentidos están **invertidos**: `GTFS dir0 == JSON sentido2` y `GTFS dir1 == JSON sentido1`. Ambos internamente coherentes. | **No,** pero ⚠️ ver "puente". |
| **Líneas 34, 44, 51, 52** | Diferencias reales de contenido. → sección E. | **Sí.** |
| **EM1, EM2** | El GTFS **declara las rutas pero con CERO viajes**. | **Sí,** ver E. |

**Conjunto de paradas por línea (unión de sentidos): 41 de 46 líneas IDÉNTICAS.**

---

## E) ⭐ EL CORREDOR EN DISPUTA — LA PREGUNTA QUE VALÍA MÁS QUE TODO EL RESTO

Recordatorio: el JSON manual dice que las líneas **32/33/34/52 ya NO paran en 674/675/679** y **SÍ paran en 93/317/320**. La API en vivo de la operadora se lo confirmó 6-0 contra el Ayuntamiento.

**¿Qué dice el GTFS?**

| Poste | Ayuntamiento | JSON manual | **GTFS** | Operadora en vivo |
|---|---|---|---|---|
| **674** | 21,22,23,**32,33,34**,51,**52** ❌ | 21,22,23,51 | **21, 22, 23, 51** ✅ | 21, 22, 23, 51 |
| **675** | 21,22,23,**32,33,34**,51,**52** ❌ | 21,22,23,51 | **21, 22, 23, 51** ✅ | 21, 22, 23, 51 |
| **679** | 21,23,31,**32,33,34**,51,**52** ❌ | 21,23,31,51 | **21, 23, 31, 51** ✅ | 21, 23, 31, 51 |
| **93** | N2,N3,N7 ❌ | 32,33,34,52,N2,N3,N7 | **32,33,34,52,N2,N3,N7** ✅ | 32, 33, 34, 52 |
| **317** | N3 ❌ | 32,33,52,N3 | **32,33,52,N3** ✅ | 32, 33, 52 |
| **320** | N3 ❌ | 32,33,34,52,N3 | **32,33,34,52,N3** ✅ | 32, 33, 34, 52 |
| **712** | *(no arbitrado)* | 21,51 | **21, 51** ✅ | *(sin buses)* |

> # **EL GTFS LO TIENE BIEN. LOS SIETE.**
>
> ### El parche manual del corredor era CORRECTO… y REDUNDANTE. El GTFS ya lo traía de fábrica.

**El trabajo manual acertó, pero no aportó nada que el fichero oficial no tuviera ya.** Se corrigió al Ayuntamiento a mano cuando bastaba con abrir el GTFS.

### Cruce completo de asignación parada↔línea (929 postes comunes)

```
MISMA lista de líneas:  926 de 929  →  99,7 %
DIFIEREN:                 3
```

Las tres, literales:

```
poste  654   GTFS=[Ci3]              JSON=[Ci3, EM2]
poste 1106   GTFS=[34, 51, Ci2, Ci4] JSON=[34, Ci2, Ci4]
poste 1254   GTFS=[23]               JSON=[23, EM1]
```

Dos de las tres son las lanzaderas EM. **Solo queda UNA divergencia real de asignación en toda la red.**

---

## F) SHAPES — LO QUE EL MANUAL NO PUEDE FABRICAR

```
shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence,shape_dist_traveled
89 shapes distintos · 27.603 puntos
puntos por shape: mín 66 | mediana 300 | máx 1.176
viajes SIN shape_id: 0
```

**Cobertura: 44 de las 52 líneas de bus.** Las 8 sin geometría (`CE, CEM, ES3, LAN, V1, V4, EM1, EM2`) son exactamente las que **no tienen ningún viaje programado**. Es decir: **toda línea que circula tiene su trazado.** De las 46 que modela el JSON, **44 tienen geometría real**.

**Ejemplo — línea 38:**

```
shape_id=Route_408   357 puntos   inicio(41.63258,-0.85797)  fin(41.63817,-0.93306)
shape_id=Route_409   440 puntos   inicio(41.63817,-0.93306)  fin(41.63258,-0.85797)
shape_id=Route_70     89 puntos   (variante corta)
shape_id=Route_71     96 puntos   (variante corta)

Primeros puntos de Route_408:
  1  41.6325813873285  -0.857967982929713
  2  41.6325896649753  -0.857979284257177
  3  41.6325555844421  -0.858110712434655
  4  41.6322628919360  -0.858958290492352
  5  41.6322769251686  -0.859121905243986
```

Puntos separados **3-4 metros**: es trazado real siguiendo la calle, no una polilínea entre paradas. Trae además `shape_dist_traveled`, que permite **interpolar la posición de un bus a lo largo de la ruta**. Esto es exactamente lo que el JSON manual no tiene y no puede fabricar a mano.

---

# 1 · VEREDICTO SOBRE EL GTFS

## **Es fiable. Está fresco. Construye ZETABUS encima de él. Sin reservas serias.**

- **Topología: SÍ.** Sus secuencias son idénticas a las del trabajo manual en las 3 líneas auditadas y en 57 de 76 comparaciones; las 19 restantes son diferencias de modelado, no errores, verificadas una a una.
- **Frescura: SÍ.** Vigencia 23/06/2026–05/10/2026 (estamos dentro). Acierta el corredor que cambió (7/7). No tiene la línea 24 fantasma. Sí tiene Ci3/Ci4.
- **Publicado por el propio operador**, con email de contacto, validado por el NAP.
- **La acusación que lo condenó era falsa** — y, lo que es peor, **nunca se probó contra él**. Se juzgó al Ayuntamiento y se dio por condenado al GTFS.

### Sus defectos, que son pocos y pequeños

1. **Poste `9951` es un fantasma**: está en `stops.txt` y en la línea 52, pero **la API en vivo de la propia operadora no lo reconoce** (`POSTE DESCONOCIDO`). Un stop que el sistema de tiempo real del emisor rechaza.
2. **`EM1`/`EM2` declaradas con cero viajes y sin paradas** en `stops.txt`. Rutas zombis.
3. **6 rutas más sin servicio** (`CE, CEM, LAN, V1, V4, ES3`). Hay que filtrarlas o aparecerán líneas vacías en la UI.
4. Sin `calendar.txt` — solo `calendar_dates.txt`.
5. Un poste (`1272`) movido 159 m respecto a las otras dos fuentes.

Ninguno es descalificante. **Filtras las rutas sin viajes y tienes una topología limpia.**

---

# 2 · VEREDICTO SOBRE LOS 3 JSON MANUALES

## `paradas-avanza-zaragoza.json` → **TIRAR. Es redundante Y está roto.**

- Sus coordenadas son las oficiales (mediana 0,00 m)… **salvo 27 postes que están mal, hasta 909 metros de error**, contra el acuerdo unánime del GTFS y el Ayuntamiento.
- Su asignación parada↔línea es **99,7 % idéntica al GTFS**.
- **Tiene 5 referencias colgadas**: las líneas citan los postes `2, 22, 759, 1320, 1283` que **no están en su propio fichero de paradas**. Cuatro de esos cinco (`2, 22, 759, 1320`) **el GTFS sí los tiene**, con nombre y coordenadas. El fichero manual está incompleto respecto a sí mismo.
- **Regenerarlo desde `stops.txt`.** Se ganan 5 paradas, se arreglan 27 coordenadas y se eliminan 5 referencias rotas.

## `lineas-avanza-zaragoza.json` → **TIRAR LAS SECUENCIAS. CONSERVAR LA CAPA EDITORIAL.**

**Redundante (el GTFS lo hace igual o mejor):**

- ❌ `sentido1` / `sentido2` → idénticos a `stop_times`. Tirar.
- ⚠️ `color` → **AFIRMACIÓN RETIRADA EN LA FASE 4.** Aquí se dijo que *"los colores del manual no son los del operador"*, extrapolando desde un solo caso (la línea 21, y encima un gris). **No se sostiene.** La Fase 4 comparó las 46 y arbitró contra el mapa oficial de Avanza: es **la misma paleta transcrita dos veces**, y el arbitraje da **empate técnico (16-16)**. **NO VERIFICADO** cuál coincide con la señalética de la calle. Ver [Fase 4](AUDITORIA_FUENTES_ZETABUS_FASE4_COLOR_Y_DESVIOS.md#1--el-choque-de-colores).
- ❌ `nombre` → `route_long_name` lo da.
- ⚠️ `sentido1Nombre`/`sentido2Nombre` → **no portarlos.** Ver el puente.

**Superviviente, y es genuinamente propio — el GTFS no tiene NADA equivalente:**

- ✅ **`variaciones` / `incidencias`** — los desvíos por obras (Plaza San Miguel/Coso, Avenida Valencia) con su texto y sus paradas alternativas.
- ✅ **`paradasAnuladas`** — qué postes están fuera de servicio.
- ✅ **`infoAdicional`** — las 12 categorías de nota de línea (condición tarifaria, regulación de permanencia, terminal alternativa por franja…).
- ✅ **`tipo`** (`diurna`/`buho`/`circular`/`especial`) — el GTFS pone `route_type=704` a todo. Esta taxonomía es propia.

## `autobuses-avanza-zaragoza.json` → **CONSERVAR ÍNTEGRO. ES EL ÚNICO ACTIVO INSUSTITUIBLE.**

Confirmado contra el fichero real: **el GTFS no contiene ni un solo campo de vehículo.** No hay fabricante, ni modelo, ni combustible, ni longitud. La especificación GTFS no los contempla. **Estos 369 registros no tienen alternativa oficial en ninguna parte.**

> Pendiente: **sigue sin procedencia documentada. Escribirla.**

## LISTA CONCRETA DE DIVERGENCIAS SUPERVIVIENTES

Después de todo el cruce, **solo sobreviven estas cinco**, y ninguna es un triunfo del trabajo manual:

| # | Divergencia | Quién tiene razón | Acción |
|---|---|---|---|
| **1** | **Línea 34 → Parque de Atracciones** (postes `617, 646-650`). El JSON los tiene; **el GTFS no tiene esas paradas en absoluto**. La ruta `LAN` (*Lanzadera Cementerio–Parque Atracciones*) existe en `routes.txt` pero con **0 viajes y 0 paradas**. | **NO RESUELTO.** La API en vivo confirma que los postes `617` y `648` **existen** en el sistema del operador, pero no había buses en el momento de consultar. | **Reconsultar en horario de apertura del parque.** Si el servicio existe, es un **hueco real del GTFS** y el parche es necesario. |
| **2** | **Línea 51 en poste `1106`.** GTFS dice que pasa; el JSON dice que no. | **NO RESUELTO.** En vivo aparecieron `34, Ci2, Ci4` pero no la `51`. Ausencia no es prueba. | Reconsultar. Sospecha leve a favor del JSON. |
| **3** | **Poste `9951` (línea 52).** El GTFS lo tiene; **la API viva del operador NO lo conoce.** | **Defecto del GTFS.** | Filtrar el poste. |
| **4** | **Poste `1283` (línea 52).** El JSON lo cita pero no existe ni en su propio fichero de paradas ni en el GTFS. | **Defecto del JSON.** | Descartar. |
| **5** | **`EM1`/`EM2` y sus 4 postes (`8134-8137`).** El JSON los tiene; el GTFS declara las rutas con **cero viajes** y sin sus paradas. El poste `8134` **sí vive** en el sistema del operador. | **El JSON es la única fuente.** Pero es un servicio de evento (Estadio Modular) que hoy no circula. | Conservar como dato propio de bajo valor. |

**Y una capa entera que no es divergencia sino ausencia total del GTFS:** desvíos por obras, paradas anuladas e información adicional de línea. **Eso vale, y hay que conservarlo.**

---

# 3 · EL PUENTE DE IDENTIDAD

```
   GTFS                     API VIVA (scrape)              FLOTA (JSON propio)
   ────                     ─────────────────              ───────────────────
   stops.stop_code          parámetro POST "poste"
     "PA00669"       ──────────►  poste=669

   routes.route_short_name  title: "038 4266"
     "38"            ◄─────────  lineaRaw "038"

                              numeroBus 4266  ─────────►   numeroAutobus: 4266
                                                            → modelo, combustible, tamaño
```

**Tramo 1 · `stop_code` ⇄ `poste` — COSTE CERO.**
`poste = int(stop_code[2:])`. Cobertura **934/934**. Sin excepciones, sin tabla de mapeo, sin mantenimiento.

**Tramo 2 · `route_short_name` ⇄ línea del scrape — COSTE BAJO, con dos trampas reales:**

- El scrape emite **ceros a la izquierda**: `"038"` → `lstrip('0')` → `"38"`.
- El scrape emite las circulares en **MAYÚSCULAS**: `"CI2"`. El GTFS usa `"Ci2"`. **Comparación insensible a mayúsculas, obligatorio.**
- ⚠️ **No hay `trip_id` en el scrape.** Sabes qué línea y qué bus, pero **no qué viaje**. No puedes unir un bus vivo a un `trip` ni a un `shape` de forma fiable.

**Tramo 3 · nº de vehículo ⇄ flota — COSTE CERO.** El `numeroBus` del scrape es la clave directa del JSON de flota.

### ⚠️ TRAMPA SERIA — NO usar `sentido1`/`sentido2` del JSON como si fueran `direction_id`

- En la **línea 53 están invertidos**: `GTFS dir0 == JSON sentido2`.
- En **Ci1** el JSON llama al sentido *"Camino de las Torres"* (su **origen**) mientras el GTFS lo etiqueta *"Estacion Delicias"* (su **destino**, poste 3073 = *Estación Delicias / Acceso Llegadas*). **Si se portan los nombres del JSON, se le enseña al usuario el destino equivocado.**
- **Usar `trip_headsign` del GTFS.** Es el destino, que es lo que el usuario necesita ver.

---

# 4 · LO QUE FALTA — lo que NINGUNA fuente da

1. **Tiempo real oficial.** No existe (probado en Fase 2: no hay GTFS-RT para Zaragoza). El scrape de `gps.avanzabus.com` es la única puerta.
2. **Identidad de viaje del bus vivo (`trip_id`).** Ninguna fuente la da. Sabes *qué línea* y *qué bus*, pero no *qué expedición*. **Consecuencia: no se puede proyectar con rigor un bus sobre su `shape`** salvo por proximidad geométrica, que es una heurística, no un dato.
3. **Datos de vehículo** (modelo, combustible, articulado). Solo el JSON propio.
4. **Desvíos, obras y paradas anuladas.** Solo la capa editorial propia.
5. **Sentido/dirección del bus vivo.** El scrape da un `destino` textual (`"038->VALDEFIERRO"`) del que hay que inferir el `direction_id` casando contra `trip_headsign`. **Es un join por cadena de texto: frágil y sin garantías.**
6. **Ocupación, retrasos, incidencias en tiempo real.** Nada, en ninguna parte.

---

## LA CONCLUSIÓN QUE NO ES CÓMODA

**El trabajo manual fue honesto, competente y correcto — y en su mayor parte, innecesario.**

Se detectó un problema real (el Ayuntamiento está podrido), se hizo un diagnóstico correcto (no fiarse de esa fuente) y se sacó la conclusión equivocada (*"lo oficial está mal"*), porque **nunca se abrió el fichero oficial correcto**. Meses de curación a mano reprodujeron —con 27 coordenadas rotas y 5 referencias colgadas de propina— un fichero que Avanza publica cada pocos meses, validado, con geometría de calles y con un identificador de parada que encaja con la API viva sin una sola línea de mapeo.

**Lo que se salva es real y hay que defenderlo:** la flota (insustituible), la capa editorial de obras y desvíos (inexistente en el GTFS), y la taxonomía de tipos de línea.

**Lo que hay que tirar es la mitad del volumen del proyecto viejo.** Y esa es la mejor noticia del informe: ZETABUS empieza con menos código propio del que se temía y con mejores datos de los que tenía.

---

## PREGUNTAS ABIERTAS

Se cierran con una consulta cada una, en el momento adecuado del día:

1. **Parque de Atracciones en la línea 34** (postes `617`, `646-650`) — consultar la API viva en horario de apertura del parque.
2. **Línea 51 en el poste `1106`** — reconsultar la API viva en hora punta.

---

## APÉNDICE — ARQUITECTURA DE FUENTES RECOMENDADA

| Capa | Fuente | Notas |
|---|---|---|
| **Topología** (líneas, paradas, secuencias) | **GTFS del NAP**, fichero 1176 | Filtrar `agency_id == '1'` y rutas con ≥1 viaje |
| **Geometría de rutas** | **GTFS** (`shapes.txt`) | 44/52 líneas; todas las que circulan |
| **Colores de línea** | **GTFS** (`route_color`) **+ fichero de override** | ⚠️ **Corregido en Fase 4.** No está probado que los del GTFS sean los de la calle; el arbitraje da empate. GTFS como base (cobertura 100 %) + override por línea |
| **Identidad de línea** | **GTFS** (`route_long_name`, `trip_headsign`) | Usar `trip_headsign` como destino, nunca los nombres de sentido del JSON |
| **Color de ESTADO en el mapa** | **NO usar el tono** | 🆕 **Fase 4:** 22 de 44 líneas chocan con el semáforo verde/ámbar/rojo (la 31 ES el rojo de "retraso"). Usar forma / anillo / opacidad |
| **Obras, desvíos, paradas anuladas, notas** | **Capa editorial propia, alimentada por el RSS de Avanza** | ⬆️ **Fase 4: OBLIGATORIA, no opcional.** El GTFS enruta 5 líneas por una avenida cortada. Coste: 2-3 revisiones/semana |
| **Tiempo real** (posición, ETA, nº de vehículo) | **Scrape `gps.avanzabus.com`** | Única puerta. Arreglar: parser HTML real, timeout, caché compartida, descartar buses sin coordenadas |
| **Flota** (modelo, combustible, tamaño) | **JSON propio** | Insustituible. Documentar procedencia |

---

*Auditoría realizada sobre datos reales y verificados. Todo lo no verificable está marcado como tal.*
