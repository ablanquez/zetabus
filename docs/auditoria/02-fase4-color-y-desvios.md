# AUDITORÍA DE FUENTES — ZETABUS

**Fase 4: el choque de colores y los desvíos**
Fecha: 13/07/2026
Continúa [AUDITORIA_FUENTES_ZETABUS_FASE3.md](AUDITORIA_FUENTES_ZETABUS_FASE3.md), que queda **corregido en dos puntos** (ver «Autocorrecciones»).

---

## RESUMEN EJECUTIVO

| Pregunta | Respuesta |
|---|---|
| ¿Los colores del JSON son otra paleta? | **No. Es la MISMA paleta transcrita dos veces.** Cero coincidencias exactas, mismo tono en las 44. |
| ¿Quién coincide con la calle? | **NO VERIFICADO.** El mapa oficial da empate técnico (16-16). Se retira la afirmación de la Fase 3. |
| ¿El color de línea choca con el semáforo? | **SÍ, y grave. 22 de 44 líneas.** La línea 31 es el mismo rojo que "retraso" (ΔE 3,0). **El estado NO puede ir en el tono.** |
| ¿La capa editorial de desvíos es obligatoria? | **OBLIGATORIA.** El GTFS no tiene mecanismo de desvío y enruta 5 líneas por una avenida cortada. |
| ¿Hay feed consumible de alteraciones? | **SÍ: RSS.** La capa editorial se mantiene *asistida*, no a ciegas. Coste: 2-3 revisiones/semana. |

---

# 1 · EL CHOQUE DE COLORES

## a) Cobertura — no hay huecos

```
Rutas de bus en el GTFS:      52
route_color VACÍO:             0
route_color FFFFFF / 000000:   0
```

**Cobertura 100 %.** Las 44 líneas con servicio real tienen color único. Las 8 que comparten `0052CC` son **exactamente las 8 rutas zombis sin viajes** (`CE, CEM, LAN, V1, V4, ES3, EM1, EM2`) — es su color de relleno.

**El JSON no rellena ningún hueco del GTFS.** Al contrario: el GTFS cubre 6 líneas que el JSON ni siquiera modela.

## b) Tabla completa de las 46

Distancia perceptual **ΔE (CIE76, espacio Lab)**. Umbral adoptado: **ΔE < 2 = imperceptible** (mismo color a efectos prácticos); ΔE 2-10 = mismo tono, matiz distinto; ΔE > 10 = diferencia visible.

| Línea | GTFS | JSON | ΔE | | Línea | GTFS | JSON | ΔE |
|---|---|---|---|---|---|---|---|---|
| 21 | `978685` | `93817E` | 2,28 | | 51 | `DE5250` | `DA5751` | 3,54 |
| 22 | `008A92` | `008C93` | **1,04** | | 52 | `0E6355` | `125F52` | 2,08 |
| 23 | `508A32` | `3A8C2F` | 7,98 | | 53 | `DD1466` | `D90F65` | **1,46** |
| 25 | `EAA200` | `E49500` | 6,41 | | 54 | `DA4319` | `D54A24` | 6,41 |
| 28 | `C58400` | `A37203` | 13,05 | | 55 | `563680` | `592B7A` | 6,05 |
| 29 | `F5C100` | `BDAB00` | **19,97** | | 56 | `00A993` | `1EAD97` | **1,90** |
| 30 | `00B7D4` | `3CBAD6` | 3,91 | | 57 | `00422B` | `053A27` | 4,91 |
| 31 | `D1221D` | `CE1828` | 7,29 | | 58 | `008145` | `008244` | **1,16** |
| 32 | `E6659F` | `E66799` | 4,07 | | 59 | `A5C715` | `8ECB1A` | 10,82 |
| 33 | `C5CE00` | `9EB808` | 13,95 | | 60 | `472565` | `46145C` | 7,63 |
| 34 | `7B1142` | `70023D` | 4,30 | | C1 | `91960B` | `80950E` | 7,53 |
| 35 | `445C9F` | `515799` | 4,94 | | C4 | `8B4896` | `8C4190` | 3,37 |
| 36 | `0094D1` | `0F95D0` | **1,25** | | Ci1 | `ED6B17` | `EA751F` | 6,26 |
| 38 | `8CA816` | `77A916` | 9,17 | | Ci2 | `702283` | `70057B` | 7,23 |
| 39 | `6F58A0` | `75539A` | 3,99 | | Ci3 | `91007E` | `AB007C` | 11,85 |
| 40 | `A61464` | `9E055F` | 2,71 | | Ci4 | `354887` | `3D4180` | 4,66 |
| 41 | `CF9E48` | `C7A04A` | 4,65 | | N1 | `90CA46` | `9DC418` | 14,43 |
| 42 | `1AB6C1` | `3AB8C4` | 3,29 | | N2 | `FF696B` | `ED6669` | 7,01 |
| 43 | `F8AD07` | `C28C0B` | **20,25** | | N3 | `00B9F2` | `009FE3` | 12,95 |
| 44 | `27A737` | `00AE35` | 6,61 | | N4 | `FB3199` | `E6007E` | 8,80 |
| 50 | `C13079` | `BE2874` | 2,03 | | N5 | `F89E2A` | `E9A200` | 11,44 |
| | | | | | N6 | `4DC287` | `4CB57C` | 5,22 |
| | | | | | N7 | `FFEB3D` | `FFED00` | 11,01 |
| | | | | | EM1/EM2 | `0052CC` | `FF0000` | **145,93** |

```
Coinciden EXACTAMENTE (ΔE = 0):   0
ΔE < 2 (imperceptible):           5
ΔE ≥ 2:                          41
```

**Cero coincidencias exactas. Pero el TONO se conserva en las 44.**

> **No son dos paletas: es la misma paleta transcrita dos veces desde fuentes distintas.**

*(EM1/EM2 son la excepción: `FF0000` rojo puro en el JSON es un relleno inventado frente al `0052CC` del GTFS, que también es un relleno. Ahí nadie tiene razón.)*

## c) ¿Hay patrón de transcripción? **NO**

El ΔRGB no es constante: va de `(0, -1, 1)` en la 58 a `(56, 22, 0)` en la 29. **No hay desplazamiento de canal, ni redondeo sistemático, ni cambio de espacio de color.**

Se probó la hipótesis *"el JSON viene de CMYK (imprenta/señalética) y el GTFS de pantalla"* contando cuántos canales CMYK caen en múltiplos de 5:

```
Canales CMYK "redondos":  JSON 65 %  |  GTFS 64 %   → EMPATE, hipótesis no confirmada
```

**Conclusión: no es un bug de conversión. Son dos transcripciones independientes del mismo manual de marca.** Ninguna deriva de la otra, y por tanto **no hay una "dirección correcta" que restaurar**.

> **Matiz a favor de la tesis de Antonio:** tres colores del JSON son **tintas de imprenta estándar exactas** — `E6007E` (magenta proceso), `FFED00` (amarillo proceso), `009FE3` (cian proceso). Los equivalentes del GTFS no lo son. Es **indicio** de origen impreso, pero son 3 de 44: **no es prueba**.

## d) EL ÁRBITRO — LA CALLE. **NO VERIFICADO**

Se descargó y rasterizó el material oficial:

- **Mapa de red**: `mapaweb-capas_Actualizado-agosto2025.pdf` (4,5 MB) — vectorial, **autoría en CMYK** (material de imprenta).
- **Plano de marquesina nocturna**: `Plano_marquesina-nocturna_abril2019.pdf` (2 MB) — literalmente el papel del poste.

Rasterizado con **PyMuPDF** (conversión CMYK→sRGB correcta, con perfil), 150 dpi, extracción de la paleta saturada dominante.

```
Líneas arbitradas: 42
GANA GTFS: 16  |  GANA JSON: 16  |  empate: 10
ΔE medio contra el mapa oficial:  GTFS 8,92  |  JSON 8,25
```

> # EMPATE TÉCNICO. El mapa oficial no distingue entre las dos paletas.

### Por qué el método no da para más

1. Del mapa solo se extraen **~30 colores saturados distinguibles para 44 líneas**. La asignación color→línea es ambigua (las líneas 33 y 38 caen ambas en `A5B429`; la 52 y la 57 en `0A6457`).
2. **El ΔE del mapa a cualquiera de las dos paletas (8-9) es MAYOR que la distancia entre ellas (mediana ~6).** El ruido de medición se come la señal.

### ⚠️ AUTOCORRECCIÓN 1 — se retira una afirmación de la Fase 3

La Fase 3 afirmaba:

> *"Los colores del manual **no son** los del operador. Usar los del GTFS."*

**Eso fue una extrapolación desde UN solo caso (la línea 21, y encima un gris). No se sostiene.**

**La afirmación de Antonio —que su paleta es la de la señalética— NO queda refutada. Tampoco probada.** Lo honesto es: **no se puede saber con material digital.**

**Solo lo zanja:** una foto de un poste real con carta de color al lado, o el manual de identidad corporativa de Avanza.

### Recomendación práctica (no depende de resolver el empate)

- **Base: `route_color` del GTFS.** Cubre el 100 %, incluye las 6 líneas que el JSON no tiene, y se mantiene solo.
- **+ fichero de override por línea**, vacío al principio, donde se meta el hex de cualquier línea cuyo color de calle se verifique físicamente.

Cuesta ~10 líneas de código y da la razón a quien la tenga, sin necesidad de decidirlo ahora.

---

## e) ⚠️ EL CHOQUE SEMÁNTICO — DECIDE EL DISEÑO

### Familias de color de las 44 líneas con servicio real (paleta GTFS)

| Familia | Nº | Líneas |
|---|---|---|
| **ROJO** | **4** | **31**, 51, 54, N2 |
| **NARANJA / ÁMBAR** | **6** | 25, 28, 41, 43, **Ci1**, **N5** |
| **AMARILLO** | **4** | 29, 33, C1, N7 |
| **LIMA** | **3** | 38, 59, N1 |
| **VERDE** | **5** | 23, **44**, 57, 58, **N6** |
| TURQUESA / CIAN | 7 | 22, 30, 36, 42, 52, 56, N3 |
| AZUL | 2 | 35, Ci4 |
| MORADO | 4 | 39, 55, 60, Ci2 |
| ROSA / MAGENTA | 8 | 32, 34, 40, 50, 53, C4, Ci3, N4 |
| Gris | 1 | 21 |

> # 22 de las 44 líneas — LA MITAD DE LA RED — caen en la franja rojo / ámbar / amarillo / lima / verde.

### Los choques concretos (contra un semáforo estándar)

**Contra ROJO = retraso (`D92D20`):**

```
  línea 31   D1221D   ΔE =  3,0   ←←← ES EL MISMO ROJO
  línea 54   DA4319   ΔE =  9,2   ← CHOCA
  línea 51   DE5250   ΔE = 22,2   ← riesgo
  línea N2   FF696B   ΔE = 27,3   ← riesgo
```

**Contra ÁMBAR = aviso (`F79009`):**

```
  línea N5   F89E2A   ΔE =  8,7   ← CHOCA
  línea 25   EAA200   ΔE = 15,3   ← CHOCA
  línea 43   F8AD07   ΔE = 16,9   ← CHOCA
  línea 28   C58400   ΔE = 19,1   ← CHOCA
  línea Ci1  ED6B17   ΔE = 19,7   ← CHOCA
```

**Contra VERDE = a tiempo (`12B76A`):**

```
  línea N6   4DC287   ΔE = 13,7   ← CHOCA
  línea 44   27A737   ΔE = 19,0   ← CHOCA
  línea 58   008145   ΔE = 22,2   ← riesgo
  línea 23   508A32   ΔE = 27,4   ← riesgo
```

### VEREDICTO DE DISEÑO

> # **EL ESTADO NO PUEDE CODIFICARSE CON EL TONO. Punto.**
>
> Un bus de la **línea 31** pintado con su color de marca **es indistinguible de un bus retrasado**.
> Un bus de la **N5** parece un aviso ámbar.
> Un bus de la **44** parece "a tiempo" aunque lleve 10 minutos de retraso.
>
> **El mapa mentiría con el color en la mitad de la red.**

### Canales que la paleta de líneas SÍ deja libres

- **Forma / icono** del marcador (el color queda para la línea).
- **Anillo o halo** de estado alrededor del marcador, **separado del relleno por un borde blanco de 2 px** que rompe la adyacencia cromática.
- **Opacidad / saturación** (bus sin dato = desaturado al 40 %).
- **Movimiento** (pulso para "sin dato").

La única franja realmente libre en la marca es el **AZUL** (solo 2 líneas: 35 y Ci4) y el **MORADO** (4). Pero **azul no significa "retraso" para nadie**: la salida buena es **cambiar de canal, no de tono**.

---

# 2 · LOS DESVÍOS

## a) ¿Hay algún mecanismo en el feed? **NO. NINGUNO.**

```
calendar_dates.txt:
  exception_type = 1 (AÑADIR servicio):  27.161
  exception_type = 2 (QUITAR servicio):       0     ← CERO
```

**No se suprime ni un solo viaje, nunca.** `calendar_dates` se usa solo como calendario positivo. No hay `transfers.txt`, no hay `frequencies.txt`, no hay ningún campo de alerta en `stops.txt` ni en `trips.txt`.

**¿Se puede DEDUCIR un desvío comparando variantes de trip? NO:**

```
línea 38  dir0: 2 variantes, 649 viajes → PASAN por Av. Valencia: 607 (94 %)
línea 35  dir0: 5 variantes, 588 viajes → PASAN por Av. Valencia: 568 (97 %)
línea 41  dir0: 1 variante,  291 viajes → PASAN por Av. Valencia: 291 (100 %)
línea N4  dir0: 2 variantes,  20 viajes → PASAN por Av. Valencia:  20 (100 %)
```

Las "variantes" son **servicios cortos** (`Route_70`/`Route_71` = recorrido reducido), **no desvíos**. **Ningún `shape` esquiva la calle en obras.**

## b) LA PRUEBA — **EL GTFS MIENTE**, demostrado tres veces

### Prueba 1 — Avenida Valencia

**Avanza publica (aviso vigente):**

> *"ACTUALIZACIÓN Obras Avenida Valencia — **Líneas: 35, 38, 41, N4, N6**"* (16/06/2026)

**El GTFS enruta por los postes de Avenida de Valencia:**

```
poste 262  Av. De Valencia N.º 8    →  líneas 35, 38, 41, N4, N6
poste 263  Av. De Valencia N.º 38   →  líneas 35, 38, 41, N4
poste 264  Av. De Valencia N.º 41   →  líneas 35, 38, 41
poste 265  Av. De Valencia N.º 63   →  líneas 35, 38
```

**Las mismas cinco líneas. Exactamente.** El GTFS las pinta bajando por una avenida cortada.

### Prueba 2 — C/ Oviedo (publicado el 13/07/2026, el mismo día de esta auditoría)

> *"Debido a los trabajos en calzada… en la calle Oviedo, previsiblemente **desde el 13 de julio hasta el 24 de julio**, las líneas **23, 31 y C4** se desviarán desde Cuarta Avenida por Cuarta Avenida a Pablo Parellada. **PARADA SUPRIMIDA: Oviedo 175**"*

**El GTFS se congeló el 23 de junio (`feed_start = 20260623`). No puede saberlo.** Sigue pintando la parada `Oviedo N.º 175` (**poste 609**) como operativa en esas 3 líneas.

### Prueba 3 — la definitiva: **una LÍNEA ENTERA que el GTFS no tiene**

> *"**Nueva lanzadera EM3** – Conciertos en Estadio Modular Ibercaja"* — **25 de junio de 2026**

**Creada DOS DÍAS después de que se congelara el GTFS.** No está en `routes.txt`. No estará hasta la próxima regeneración del feed.

### ⚠️ AUTOCORRECCIÓN 2 — la Fase 3 se desdijo por error

| Fase | Lo que dije | Veredicto |
|---|---|---|
| **Fase 2** | *"EM3 existe, el JSON manual está caducado"* | ✅ **Era CIERTO** |
| **Fase 3** | *"Me retracto: el GTFS tiene EM1/EM2 y no EM3, luego mi fuente era mala"* | ❌ **La retractación estaba MAL** |
| **Fase 4** | El RSS con fecha lo prueba: **EM3 nació el 25/06/2026, dos días después del corte del GTFS** | ✅ **La Fase 2 acertaba** |

**Ni el GTFS ni el JSON manual tienen EM3.** Y esa cadena de errores es, irónicamente, **la mejor prueba del punto de fondo**: incluso auditando esto a fondo, un fichero estático te engaña sobre el estado real de la calle.

## VEREDICTO SOBRE LOS DESVÍOS

> # LA CAPA EDITORIAL ES **OBLIGATORIA**. No es un adorno: es un requisito de corrección.
>
> Sin ella, ZETABUS le dirá al usuario **"tu bus para en Oviedo 175"** mientras esa parada está suprimida, y **"la 38 baja por Avenida Valencia"** mientras está desviada.
>
> **La app mentiría, y el usuario lo vería con sus propios ojos en la calle.**

## c) ¿Formato consumible? **SÍ — RSS. Mejor de lo esperado.**

**Feed RSS con categoría:**

```
https://zaragoza.avanzagrupo.com/category/alteraciones-del-servicio/feed/
→ HTTP 200 · 12 items · <category>Alteraciones del servicio</category>
```

**Endpoint AJAX filtrable por línea (devuelve HTML):**

```
POST https://zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php
     action=get_alteraciones_servicio&lineaAfectada=<linea>&paged=1
```

**Cadencia real (últimas 4 semanas): 10 alteraciones ≈ 2-3 por semana.**

```
13 jul  Obras C/ Oviedo – Desvíos en 3 líneas          → 23, 31, C4
09 jul  Trabajos en C/ Lugo – desvío bus urbano
07 jul  Manifestaciones y eventos julio 2026           → 21, 22, 29, 32, 50, 60, Ci1, Ci2
29 jun  Fiestas barrio La Jota – Afecciones bus urbano
26 jun  Obras en Reyes de Aragón – Desvío bus urbano
25 jun  Nueva lanzadera EM3                            ← LÍNEA NUEVA
18 jun  Fiestas Rosales del Canal
17 jun  Fiestas de Parque Venecia
17 jun  Fiestas barrio de la Almozara
16 jun  ACTUALIZACIÓN Obras Avenida Valencia           → 35, 38, 41, N4, N6
```

### El cuerpo es prosa, pero está SEMI-ESTRUCTURADO y engancha con el GTFS

- **Las líneas afectadas vienen explícitas:** *"las líneas 23, 31 y C4"*.
- **Las paradas vienen con su nombre EXACTO del GTFS.** Verificado:

| Texto del aviso | `stop_name` en el GTFS | Poste |
|---|---|---|
| *"Oviedo 175"* | `Oviedo N.º 175` | **609** |
| *"Cuarta Avenida 21"* | `Cuarta Avenida N.º 21` | **425** |
| *"Pablo Parellada 27"* | `Pablo Parellada N.º 27` | **610** |

**Casan.**

> ### La capa editorial **no se mantiene a ciegas: se mantiene ASISTIDA por RSS.**
>
> Un job lee el feed, extrae líneas y nombres de parada, los casa contra `stops.txt` y **presenta un borrador que un humano confirma en 2 minutos.**
>
> **Coste real: 2-3 revisiones por semana.** No es cero, y hay que asumirlo conscientemente: **si nadie mira el RSS, la app se degrada sola, en silencio, en cuestión de días.**

---

# RESPUESTAS DIRECTAS

1. **¿Mismo color mal transcrito, o paletas distintas?**
   → **Mismo color, transcrito dos veces desde fuentes distintas.** Mismo tono en las 44, cero coincidencias exactas, sin patrón de conversión.
   **¿Quién coincide con la calle? NO VERIFICADO** — empate 16-16 contra el mapa oficial, y el ruido del método supera la diferencia. **Se retira la afirmación de la Fase 3.**

2. **Líneas que chocan con el semáforo:**
   **31** (rojo idéntico, ΔE 3,0), **54, 51, N2** (rojo) · **N5, 25, 43, 28, Ci1** (ámbar) · **N6, 44, 58, 23** (verde).
   **22 de 44 líneas en la franja de peligro. El estado NO puede ir codificado en el tono.**

3. **¿La capa editorial es obligatoria?**
   → **OBLIGATORIA.** Cero exclusiones en `calendar_dates`, 5 líneas enrutadas por una avenida cortada, y una línea (EM3) creada 2 días después de la congelación del feed. **Sin esa capa, la app miente.** Buena noticia: hay **RSS** y se puede semiautomatizar.

4. **NO VERIFICADO:** cuál de las dos paletas es la de la señalética física. Hace falta una foto de un poste con carta de color, o el manual de marca de Avanza. **No se ha deducido y no se va a fingir.**

---

# IMPACTO EN LA ARQUITECTURA (actualiza el apéndice de la Fase 3)

| Capa | Fuente | Cambio respecto a la Fase 3 |
|---|---|---|
| **Colores de línea** | `route_color` del GTFS **+ fichero de override** | ⚠️ **Cambiado.** La Fase 3 decía "usa el GTFS y punto". Ahora: GTFS como base, con override por línea para lo que se verifique en la calle. |
| **Color de ESTADO en el mapa** | **NO usar el tono** | 🆕 **Nuevo requisito duro.** Usar forma / anillo con borde blanco / opacidad. |
| **Desvíos y paradas suprimidas** | **Capa editorial propia, alimentada por el RSS de Avanza** | ⬆️ **Sube de "conservar" a OBLIGATORIA.** Con vía de semiautomatización identificada. |
| **Líneas nuevas de evento** (EM3…) | Solo el RSS | 🆕 **Ninguna fuente estructurada las tiene.** Ni GTFS ni JSON. |

---

*Auditoría realizada sobre datos reales y verificados. Lo no verificable está marcado como tal. Las dos autocorrecciones a informes anteriores están señaladas de forma explícita.*
