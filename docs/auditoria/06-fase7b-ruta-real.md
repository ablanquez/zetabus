# AUDITORÍA DE FUENTES — ZETABUS

**Fase 7B: la ruta real. El santo grial existe.**
Fecha: 13/07/2026 · 13:06–13:30 hora local (plena hora de servicio)

> # ⚠️ ESTA FASE RETIRA LA CONCLUSIÓN CENTRAL DE LA FASE 5.
> ## **"Solo se puede tachar, no se puede repintar" era FALSO.**
> ## **Sí se puede repintar. Con rigor. Sin transcribir nada y sin inventar el orden.**

**Antonio tenía razón otra vez. Las dos veces.**

---

# RESUMEN EJECUTIVO

| Pregunta | Respuesta |
|---|---|
| 1. ¿La API viva sirve la ruta REAL, no la teórica? | **SÍ.** Confirmado en 6 de 6 postes. Las líneas "extra" coinciden **exactamente** con las paradas habilitadas del comunicado. |
| 2. ¿Existe un endpoint con la SECUENCIA ORDENADA del recorrido actual? | **SÍ. `get_stops_list`.** Ordenada, por sentido, con el desvío aplicado. **45 de 46 líneas.** |
| 3. ¿Se retira la conclusión de la Fase 5? | **SÍ, ENTERA.** El desvío es **derivable**, no hay que transcribirlo. |
| 4. ¿Resuelve también las SUPRESIONES de parada? | **NO.** Siguen sin ser detectables. **La Fase 7 se mantiene íntegra.** |
| 5. ¿Y el trazado? | **SÍ. KML con la geometría actual**, desviada. Más basto que `shapes.txt`, pero correcto. |

---

# 1 · LA API VIVA SIRVE LA RUTA REAL — CONFIRMADO 6/6

Consulta a las **13:06**, hora de servicio. Antes descarté la explicación aburrida: releí `stops.txt` con cuidado para cada poste.

| Poste | Parada | **GTFS** (teórico) | **API VIVA** (ahora) | **DIFERENCIA** |
|---|---|---|---|---|
| **1258** | P. de la Mina / Centro de Mayores | `[40]` | `40, 21, 22, 30, 32, 35, 38` | **+21 +22 +30 +32 +35 +38** |
| **1228** | P. Constitución / Patio de la Infanta | `[25, 40, 51]` | `51, 25, 40, 21, 22, 30, 32, 35, 38` | **+21 +22 +30 +32 +35 +38** |
| **3032** | Asalto / Edificio Trovador | `[22]` | `22, 32, 35` | **+32 +35** |
| **1248** | P. de la Mina n.º 15 | `[30]` | `30, 21, 22, 38, 40` | **+21 +22 +38 +40** |
| **632** | P. Constitución n.º 11 / Plaza Aragón | `[25, 30, 51, N6]` | `25, 30, 51, 21, 22, 38, 40` | **+21 +22 +38 +40** |
| **634** | P. Constitución n.º 33 / Plaza de los Sitios | `[25, 30, 51, N6]` | `25, 30, 51, 21, 22, 38, 40` | **+21 +22 +38 +40** |

## Y ahora el contraste con el comunicado del Coso, LITERAL:

```
PARADAS HABILITADAS:
  Paseo La Mina/Centro Mayores      – Líneas 21, 22, 30, 32, 35, 38, N1 y N5    → poste 1258
  Constitución/Patio de La Infanta  – Líneas 21, 22, 30, 32, 35, 38, N1 y N5    → poste 1228
  Asalto/Trovador                   – Líneas 32 y 35                            → poste 3032
  Paseo La Mina 15                  – Líneas 21, 22, 38 y 40                    → poste 1248
  Constitución 11                   – Líneas 21, 22, 38 y 40                    → poste 632
  Constitución 33                   – Líneas 21, 22, 38 y 40                    → poste 634
```

> # **COINCIDENCIA EXACTA. LAS SEIS.**
> *(N1 y N5 son líneas búho: a las 13:06 no circulan. Por eso no aparecen. Todo lo demás casa carácter por carácter.)*

**La API viva sirve la RUTA REAL DE HOY, con el desvío aplicado.** El poste de la calle cortada enmudece; el poste del desvío habla, y habla de líneas que el GTFS no pone ahí.

**Es el mismo mecanismo de la Fase 7, visto por la otra cara.** Avanza actualiza su **ruta operativa** cuando desvía una línea — y esa ruta operativa es la que alimenta el sistema en vivo.

---

# 2 · ⭐ EL ENDPOINT: LA SECUENCIA ORDENADA REAL

## Existe. Lo he encontrado. Y es exactamente lo que hacía falta.

```http
POST https://zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php
Content-Type: application/x-www-form-urlencoded

action=get_stops_list&selectLinea=35&selectSentido=-2
```

**Devuelve, literal:**

```html
<option value="posteDefault">Seleccionar poste</option>
<option id="posteValue" value="209">209 - Av. Ramón Sainz de Varanda / Colegio</option>
<option id="posteValue" value="543">543 - Av. Juan Pablo II n.º 60</option>
<option id="posteValue" value="623">623 - Pedro III / Asín Y Palacios</option>
<option id="posteValue" value="25">25 - Asín Y Palacios n.º 8</option>
<option id="posteValue" value="861">861 - Violante de Hungría n.º 5</option>
<option id="posteValue" value="985">985 - Plaza Emperador Carlos V</option>
<option id="posteValue" value="863">863 - Violante de Hungría / Palacio de Deportes</option>
<option id="posteValue" value="864">864 - Violante de Hungría / Escuela de Idiomas</option>
<option id="posteValue" value="239">239 - Av. San Juan Bosco / Hospital Clínico</option>
<option id="posteValue" value="236">236 - Av. San Juan Bosco n.º 7</option>
<option id="posteValue" value="329">329 - Corona de Aragón n.º 51</option>     ← PARADA DEL DESVÍO
<option id="posteValue" value="277">277 - Carmen n.º 19</option>                ← PARADA DEL DESVÍO
<option id="posteValue" value="507">507 - Hernán Cortés n.º 35</option>
...
```

**Trae el número de poste, el nombre, y EN ORDEN.**

**Los sentidos se descubren con otro endpoint:**

```http
POST .../admin-ajax.php   action=get_direction_list&selectLinea=35
→ <option value="-1">PARQUE GOYA - SEMINARIO</option>
  <option value="-2">SEMINARIO - PARQUE GOYA</option>
```

## LA COMPARACIÓN CONTRA EL GTFS — LÍNEA 35

### Sentido −1 (Parque Goya → Seminario)

```
WEB (RECORRIDO REAL, 30 paradas):
  993 986 3507 36 33 3508 777 3510 775 3511 3023 771 800 798 433 432 720 710 505 698
  147 145 736 716 863 325 326 327 832 209

GTFS (recorrido TEÓRICO, 31 paradas):
  993 986 3507 36 33 3508 3509 777 3510 775 3511 3023 771 800 798 433 432 720 710 505 698
  262 263 237 238 862 325 326 327 832 209
```

| | Postes | Nombres |
|---|---|---|
| **+ AÑADE la web** | `147, 145, 736, 716, 863` | Av. Goya 83 · Av. Goya 59 · Fdo. El Católico · Fdo. El Católico 70 · Violante/Palacio Deportes |
| **− RETIRA la web** | `262, 263, 237, 238, 862, 3509` | **Av. Valencia 8 · Av. Valencia 38** · San Juan Bosco 10 · San Juan Bosco/Hospital Clínico · Violante/Facultad |
| **Orden de las comunes** | **IDÉNTICO** ✅ | |

**Y el comunicado de Avenida Valencia dice, LITERAL:**
> *"Línea 35 · Sentido Hispanidad: Desde Paseo Teruel por **Avenida Goya, Fernando El Católico**, Plaza Emperador Carlos V, **Violante de Hungría** a Condes de Aragón."*

**Encaja al 100 %.** El endpoint devuelve el desvío **ya aplicado, ya ordenado**.

### Sentido −2 (Seminario → Parque Goya) — **los DOS desvíos a la vez**

| | Postes |
|---|---|
| **+ AÑADE** | `329` (Corona de Aragón) · `1228`, `1258`, `3032`, `660` **← estos cuatro son del COSO** |
| **− RETIRA** | `265, 264, 471` (Av. Valencia) · `707, 719, 338, 340` (Plaza Aragón, Plaza España, Coso 126, Coso 188) |
| **Orden de las comunes** | **IDÉNTICO** ✅ |

**El endpoint compone los DOS desvíos simultáneos (Coso + Avenida Valencia) en UNA secuencia coherente.** No hay que casar comunicados ni resolver conflictos. Ya viene hecho.

---

# 3 · ⭐ LA LÍNEA 38 — EL EJEMPLO QUE EN LA FASE 5 DECLARÉ "INVENCIÓN"

## Esto es lo que escribí en la Fase 5:

```
LÍNEA 38 · dir1 ("Bajo Aragón")

  681  P. Pamplona 1 (Plaza Paraíso)   🟢 CERTEZA
  ────────────── comienza el desvío ──────────────
  ???  ¿1228? ¿632? ¿634?              🔴 INVENTADO  (¿cuáles? ¿en qué orden?)
  ???  ¿1248? ¿1258?                   🔴 INVENTADO  (¿cuál de las dos?)
  ────────────── fin del desvío ──────────────
  585  Miguel Servet 28                🟢 CERTEZA
```

> *"De 4 tramos del recorrido desviado, 2 son CERTEZA y 2 son INVENCIÓN."*

## Y esto es lo que devuelve el endpoint, sin que yo ponga nada:

```
WEB · línea 38 · sentido −2 (Bajo Aragón), 34 paradas:
  806 3539 8 260 261 258 1318 1319 1166 604 439 3052 443 437 551 236 329 277 507 1079
  681 → 1228 → 1258 → 585
  588 590 593 602 3017 600 601 1122 598 8000
```

# **681 → 1228 → 1258 → 585.**
## **Dos paradas. En orden. En el sentido correcto. El agujero está tapado.**

Y el otro sentido:

```
WEB · línea 38 · sentido −1 (Valdefierro), 32 paradas:
  ... 584 → 1248 → 634 → 632 → 669 ...
```

**Las 5 paradas habilitadas se reparten 3 (Valdefierro) + 2 (Bajo Aragón), en orden.** Exactamente lo que dije que era **imposible de saber**.

**Diferencias completas de la línea 38 (los dos desvíos combinados):**

| Sentido | + AÑADE | − RETIRA |
|---|---|---|
| **−1** (Valdefierro) | `1248`, `634`, `632` *(Coso)* · `795`, `435`, `442` *(Av. Valencia)* | `744`, `334`, `664` *(Coso)* · `262`, `263`, `237`, `238`, `851` *(Av. Valencia)* |
| **−2** (Bajo Aragón) | `1228`, `1258` *(Coso)* · `329` *(Av. Valencia)* | `666`, `335`, `741` *(Coso)* · `265`, `264`, `471` *(Av. Valencia)* |

**Orden de las paradas comunes: IDÉNTICO al GTFS en los dos sentidos.** La secuencia es coherente, no es un revoltijo.

---

# 4 · ⚠️ PERO NO RESUELVE LAS SUPRESIONES DE PARADA — LA FASE 7 SIGUE EN PIE

**Esta era la pregunta trampa, y la respuesta es NO.**

| Test | Resultado |
|---|---|
| **Línea 29, sentido −1** — ¿aparece **Plaza San Miguel (744)**? *(el comunicado dice que la 29 sentido San Gregorio **no para** ahí)* | **SÍ APARECE.** ❌ |
| **Líneas 32 y 52** — ¿aparece **César Augusto 4 (poste 82)**? *(suprimido desde el 10 de enero)* | **SÍ APARECE**, en 3 de 4 sentidos. ❌ |
| **Líneas 22 y 31** — ¿aparecen los **4 postes de Anselmo Clavé (49, 50, 51, 52)**? | **SÍ APARECEN LOS CUATRO.** ❌ |

> ## **El endpoint refleja los DESVÍOS DE RUTA. NO refleja las SUPRESIONES DE PARADA.**
> ## **Exactamente la misma asimetría que la API viva. La Fase 7 se mantiene íntegra.**

---

# 5 · EL MODELO QUE LO EXPLICA TODO

Después de siete fases, **todas las observaciones encajan en un único mecanismo:**

> ### Avanza mantiene **UNA sola definición de ruta operativa** (su SAE).
> ### Todo lo que la toca, se ve en todas partes. Todo lo que no la toca, no se ve en ninguna.

| | ¿Cambia la ruta operativa? | GTFS | **Web `get_stops_list`** | **API viva** | Comunicado |
|---|---|---|---|---|---|
| **DESVÍO DE RUTA** *(el bus no pasa)* | **SÍ** | ❌ no lo refleja | ✅ **lo refleja** | ✅ **lo refleja** | ✅ lo dice |
| **SUPRESIÓN DE PARADA** *(pasa y no para)* | **NO** — solo ponen un cartel | ❌ | ❌ | ❌ | ✅ **único sitio** |

**El GTFS es una foto congelada (23/06). La web y la API viva son la ruta operativa de HOY.**
**Y el cartel de la marquesina no está en ninguna base de datos.**

## El caso César Augusto, resuelto (pregunta 5)

**Encaja perfectamente y confirma a Antonio.**

- Avanza **nunca sacó el poste 82 de la ruta operativa** de las líneas 32 y 52.
- Por eso **el GTFS lo sigue teniendo**, **la web lo sigue listando** y **la API viva sigue anunciando llegadas**.
- Lo único que hicieron fue **poner un cartel en la marquesina** — y eso solo consta en el documento de "Paradas suprimidas".
- **Antonio, que pasa por delante, es la única fuente fiable que existe.**

> **No es un fantasma. Es una parada suprimida sobre el papel y viva en la base de datos.** Como dijo él: *"no han desconectado el poste"*.

---

# 6 · EL TRAZADO — TAMBIÉN ESTÁ, Y TAMBIÉN ESTÁ ACTUALIZADO

La página de línea carga un **KML** con Leaflet:

```javascript
var runLayer = omnivore.kml("/wp-content/uploads/2019/12/35-2.kml", null, lineaStyle)
```

**Patrón:** `https://zaragoza.avanzagrupo.com/wp-content/uploads/2019/12/{LINEA}-{1|2}.kml`
*(La carpeta `/2019/12/` es solo el directorio de subida de WordPress. **El fichero se sobrescribe en su sitio.**)*

**La prueba de que está actualizado:** el primer `<name>` del KML de la línea 35 es literalmente:

```xml
<name>35-2_obras2026</name>
```

**Verificación geométrica** — distancia mínima del trazado a cada poste (coordenadas reales de `stops.txt`):

| Postes | Distancia del trazado | Lectura |
|---|---|---|
| **Paradas que el desvío AÑADE** — 1228, 277, 1258, 329, 3032 | **4 m, 4 m, 12 m, 50 m, 72 m** | ✅ el trazado **pasa por encima** |
| **Paradas que el desvío RETIRA** — Av. Valencia 63, 41, 8, 38 | **69 m, 243 m, 122 m, 257 m** | ✅ el trazado **las esquiva** |
| **Control (no cambian)** — 236, 863, 3525, 54, 209 | **1 m, 3 m, 14 m, 17 m, 23 m** | ✅ coherente |

> **El KML es el recorrido ACTUAL, con el desvío aplicado.**

**Su límite honesto:** **153 puntos** en la línea 35, frente a los **300-440** de `shapes.txt`. **Es correcto pero más basto.** Trueque real:

| | `shapes.txt` (GTFS) | **KML (web)** |
|---|---|---|
| Resolución | **Alta** (3-4 m entre puntos) | Media (~100 m) |
| ¿Refleja el desvío? | **NO** | **SÍ** |

---

# 7 · COBERTURA Y COSTE

```
get_stops_list  →  45 de 46 líneas devuelven secuencia.  (Falla: TUR)
get_direction_list → funciona
KML             →  presente en todas las probadas (38, 29, 21, Ci1, N3-1).
                   N3 sentido −2 no tiene (búho de sentido único).
```

**El selector de la web ofrece 46 líneas, e incluye `EM3` y `TUR`** — que **el GTFS no tiene**. **Esta fuente es MÁS FRESCA que el GTFS.**

## Coste

```
46 líneas × 2 sentidos = 92 peticiones POST  →  el mapa de desvíos de TODA la red.
Cacheable. Un barrido diario basta.
```

## ⚠️ La trampa de la noche — **DESACTIVADA**

Planteabas: *"un poste puede estar mudo por SER DE NOCHE, no por estar desviado"*.

**Esa trampa afectaba al método del barrido de la API VIVA** (comparar 934 postes contra el GTFS). **Con el endpoint de la web, el problema desaparece:** `get_stops_list` **es dato estático, no depende de que haya autobuses circulando.** Devuelve lo mismo a las 3 de la madrugada.

**Ya no hace falta el barrido de la API viva para derivar desvíos.** El endpoint lo da directo, y mejor.
*(La API viva sigue valiendo como **verificación cruzada** independiente: los 6 postes de la §1 son exactamente eso.)*

---

# 8 · ⚠️ RETIRADA FORMAL: LA CONCLUSIÓN DE LA FASE 5

## **"SOLO SE PUEDE TACHAR, NO SE PUEDE REPINTAR" — RETIRADO.**

La Fase 5 decía:

> *"Los comunicados dan un conjunto de paradas habilitadas, sin orden y sin sentido. Reconstruir la secuencia exigiría inventarse el orden. **c) ¿Se puede reconstruir la secuencia de postes del recorrido desviado? → 0/6.** ❌"*

**Ese contador era correcto — para el método que estaba evaluando (transcribir los comunicados).**
**Pero la pregunta estaba mal planteada. No hay que transcribir nada: hay que PEDIRLO.**

| | Fase 5 | **Fase 7B** |
|---|---|---|
| ¿Secuencia del desvío? | ❌ 0/6 | ✅ **45/46 líneas, ordenada** |
| ¿Por sentido? | ❌ 0/6 | ✅ **sí** |
| ¿Paradas provisionales sin poste? | ⚠️ 7 de 30 sin ID | ✅ **el endpoint solo devuelve postes reales** |
| ¿Trazado? | ❌ | ✅ **KML actualizado** |
| **ZETABUS puede REPINTAR** | ❌ **NO** | ✅ **SÍ, con rigor** |

**Lo que sí se salva de la Fase 5:** la identificación de las paradas suprimidas contra `stops.txt` (100 %) y el texto del comunicado para enseñárselo al usuario. **Eso sigue siendo útil y correcto.**

---

# 9 · LA ARQUITECTURA NUEVA

| Capa | Fuente | Cambio |
|---|---|---|
| **Topología base** | **GTFS** | Sin cambios. Rico, validado, licenciado, con calendario y `trip_headsign`. |
| **⭐ RECORRIDO ACTUAL (con desvíos)** | **`get_stops_list` de la web** | 🆕 **NUEVO. Es el recorrido real.** El *diff* contra el GTFS **ES el desvío — derivado, no transcrito.** |
| **⭐ TRAZADO ACTUAL** | **KML `{linea}-{sentido}.kml`** | 🆕 **NUEVO.** Correcto aunque basto. Usar `shapes.txt` donde no haya desvío, KML donde lo haya. |
| **Tiempo real (ETA, nº vehículo)** | Scrape `gps.avanzabus.com` | Sin cambios. Única fuente. |
| **Supresiones de parada** | **Solo el comunicado** | ⚠️ **Sin cambios. Siguen sin ser verificables.** Mostrar, no adjudicar (Fase 7). |
| **Flota** | JSON propio | Sin cambios. |
| **Transcripción manual de desvíos** | — | 🗑️ **ELIMINADA DEL DISEÑO.** Ya no hace falta. |

## Lo que ZETABUS puede hacer ahora, y no podía hace dos horas

1. ✅ **Pintar el recorrido REAL de cada línea**, con el desvío aplicado, en orden y por sentido.
2. ✅ **Dibujar el trazado real** por la calle (KML).
3. ✅ **Derivar el desvío automáticamente**: `diff(GTFS, web)` → paradas que entran y paradas que salen. **Cero transcripción, cero invención.**
4. ✅ **Detectar cuándo termina un desvío**: cuando el *diff* se vacía. **Auto-apagable.**
5. ✅ **Enseñar el texto del comunicado** enganchado al tramo desviado.
6. ⚠️ **Las paradas suprimidas siguen sin verificarse.** Mostrar el aviso y su fecha, sin adjudicar.

---

# 10 · NO VERIFICADO / RIESGOS

- **Licencia y legitimidad.** `admin-ajax.php` es un endpoint interno de WordPress, **no documentado, sin licencia, sin términos revisados**. Mismo terreno legal que el scrape de `gps.avanzabus.com`. **No es una API pública: es su web por dentro.**
- **Estabilidad.** Puede cambiar sin aviso. Devuelve **HTML** (`<option>`), no JSON. Hay que parsearlo.
- **Solo he comparado 2 líneas contra el GTFS** (la 35 y la 38). **No he validado las 45.** El barrido completo está pendiente.
- **La línea TUR no devuelve secuencia.** No sé por qué.
- **El KML tiene resolución baja** (153 puntos en la 35). No he medido las demás.
- **No sé con qué frecuencia actualiza Avanza el `get_stops_list`.** Que hoy esté al día no garantiza que lo esté siempre. **Hay que verificarlo contra la API viva periódicamente** — que es justo lo que hace la §1.
- **No sé si el endpoint refleja desvíos MUY recientes** (el de C/ Oviedo, publicado hoy). **No lo he comprobado.**

---

# CONCLUSIÓN

**Tres informes retirados en este proyecto, y las tres veces la corrección vino de fuera de los datos: de alguien que conoce la ciudad.**

Esta vez la observación de Antonio no era una objeción: era una **puerta**. "En el poste 1258 salen líneas que no son las suyas" — eso, que parecía una anomalía, era el sistema diciéndonos que **sabe cuál es la ruta de hoy**. Y si la sabe, la puede contar.

**Y la cuenta.** El endpoint estaba ahí, en su propia web, alimentando el desplegable de paradas que cualquiera usa para mirar cuándo pasa su bus.

> ## **El desvío no hay que transcribirlo. Hay que pedirlo.**
> ## `diff(ruta teórica del GTFS, ruta real de la web) = el desvío`
>
> **Sin orden inventado. Sin sentido supuesto. Sin paradas fantasma.**

Queda **una sola cosa** sin resolver en todo el proyecto, y es la misma que quedó en la Fase 7: **una parada suprimida donde el autobús pasa sin detenerse no está en ninguna base de datos del mundo.** Solo en un cartel de metacrilato y en los ojos de quien pasa por delante.

**Para eso, ZETABUS no puede ser más listo que Avanza. Solo puede ser honesto: decir quién lo dice y cuándo lo dijo.**

---

*Fase 7B realizada en horario de servicio (13:06–13:30). **Retira la conclusión central de la Fase 5.** Confirma y mantiene íntegra la Fase 7. Lo no verificado está marcado.*
