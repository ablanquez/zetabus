# Modelo estándar del bloque de primeras/últimas salidas

> **Un solo modelo para los 65 sentidos con tabla.** Sin modos, sin casos especiales.
> Verificado contra `docs/DATOS_CRUDOS_SALIDAS_RED_COMPLETA.md` (44 líneas, 88 peticiones, 20/07/2026).

---

## 1 · El problema que resuelve

La tabla actual usa **tres columnas para transportar una constante**. Medido sobre la red entera:

| | dato |
|---|---|
| Sentidos con tabla | **65** (de 88 línea·sentido) |
| Filas por sentido | mín. **2** · mediana **19** · máx. **43** (la 34 `-2`) |
| Sentidos donde `DESDE` y `HASTA` **no cambian nunca** | **46 de 65 (71 %)** |
| Sentidos con alguna excepción | 19 |
| De esos 19, **entrelazados** (la excepción no forma bloque contiguo) | **18** |

⚠️ **El 71 % de la red repite el mismo par origen→destino en cada fila.** Y en el 29 % restante, la
excepción va **entrelazada**, no agrupada: cualquier modelo que agrupe por servicio rompe el orden
cronológico, que es la información que el usuario necesita.

---

## 2 · El modelo

```
┌──────────────────────────────────────────────────────┐
│  HACIA {destino mayoritario}     desde {origen mayor.} │
│                                                        │
│  PRIMERAS                                              │
│  hh:mm · hh:mm · hh:mmᵃ · hh:mm · hh:mm · hh:mm        │
│                                                        │
│  Cada N min de media ({tipo de día}) · según Avanza    │
│                                                        │
│  ÚLTIMAS                                               │
│  hh:mm · hh:mm · hh:mm · hh:mmᵇ · hh:mmᵇ               │
│                                                        │
│  ᵃ {qué significa}          ← solo si hay excepciones  │
│  ᵇ {qué significa}                                     │
└──────────────────────────────────────────────────────┘
```

### Las cuatro reglas

1. **La cabecera lleva el par mayoritario**, calculado sobre **primeras + últimas JUNTAS**
   (no sobre cada tabla por separado).
2. **Las horas van en flujo**, separadas por `·`, en **orden cronológico estricto**. Siempre.
3. **Toda salida cuyo par se aparte del mayoritario lleva una letra volada.** Una letra distinta
   por cada valor distinto.
4. **Al pie, una línea por marca.** Si no hay excepciones, **no hay pie**.

⚠️ **Regla 1, el porqué:** en la 23 `-1` las primeras tienen tres pares empatados a 2 (`P.Pamplona→
Clara Campoamor`, `Parque Venecia→Clara Campoamor`, `Parque Venecia→CDM. Siglo XXI`). Sobre esa
tabla sola no hay mayoritario. Sumando las dos tablas, `Parque Venecia→Clara Campoamor` gana 9/21.

⚠️ **Regla 2, el porqué:** 18 de los 19 sentidos con excepción están **entrelazados**. En la 35 `-2`
las salidas desde P. Mina alternan con las de Seminario toda la mañana. Agruparlas rompería la
única pregunta útil: *"¿cuál es el siguiente?"*.

---

## 3 · Qué marca cada letra

La marca describe **en qué se aparta del par de cabecera**:

| caso | texto del pie |
|---|---|
| Destino distinto | `ᵃ termina en {destino}, no en {destino de cabecera}` |
| Origen distinto | `ᵃ sale de {origen}, no de {origen de cabecera}` |
| Ambos distintos | `ᵃ de {origen} a {destino}` |

Se asignan letras por **orden de primera aparición cronológica**, no alfabético.

---

## 4 · Casos verificados

### 4.1 · Sin excepciones — 46 de 65 (el 71 %)

**35 `-1`, primeras** — 13 filas × 3 columnas → **2 renglones**:

```
HACIA SEMINARIO                             desde Parque Goya

PRIMERAS
05:00 · 05:33 · 06:06 · 06:39 · 06:56 · 07:12 · 07:29
07:45 · 07:58 · 08:11 · 08:23 · 08:32 · 08:41
```

Sin marcas, sin pie.

### 4.2 · Excepción entrelazada — el caso mayoritario de los raros

**35 `-2`** — 29 filas → **5 renglones**. Ocho salidas desde P. Mina intercaladas:

```
HACIA PARQUE GOYA                            desde Seminario

PRIMERAS
04:40ᴹ · 05:11ᴹ · 05:40ᴹ · 05:49 · 06:22 · 06:29ᴹ
06:55 · 07:12 · 07:29 · 07:30ᴹ · 07:46 · 08:02ᴹ
08:03 · 08:15 · 08:20ᴹ · 08:27 · 08:36ᴹ · 08:39

Cada 9 min de media (laborables) · según Avanza

ÚLTIMAS
21:48 · 22:00 · 22:14 · 22:29 · 22:43 · 22:56
23:09 · 23:27 · 23:41 · 00:31ᴹ · 01:09ᴹ

ᴹ sale de P. Mina, no de Seminario
```

⭐ **El patrón se ve solo:** las `ᴹ` de la mañana intercaladas, y las dos del final agrupadas.
En la tabla de tres columnas eso hay que deducirlo comparando strings fila a fila.

### 4.3 · Tres pares, origen Y destino cambiando — el peor caso

**23 `-1`** — 21 filas → **6 renglones**:

```
HACIA CLARA CAMPOAMOR                     desde Parque Venecia

PRIMERAS
04:51ᴾ · 05:15ᴾ · 05:15 · 05:45 · 06:10ˢ · 06:35ˢ

Cada 8 min de media (laborables) · según Avanza

ÚLTIMAS
21:20ˢ · 21:32ˢ · 21:44ˢ · 21:56ˢ · 22:08ˢ · 22:20 · 22:32
22:46 · 23:02 · 23:16 · 23:30 · 00:00 · 00:10ᴾ · 00:40ᴾ · 01:10ᴾ

ˢ termina en CDM. Siglo XXI
ᴾ sale de P. Pamplona, 12
```

### 4.4 · Tabla mínima

**41 `-1`** — 3 filas → **2 renglones**, y no parece un formulario roto:

```
HACIA ROSALES DEL CANAL             desde Puerta del Carmen

PRIMERAS
06:00

Cada 20 min de media (laborables) · según Avanza

ÚLTIMAS
22:25 · 23:00
```

### 4.5 · ⚠️ Sin tabla — 23 sentidos

Los **14 búhos** (N1–N7, ambos sentidos) y **9 sentidos `-2` vacíos** (Ci3, Ci4, 30, 54, 55, 56,
57, 58, 59). La web responde 200 con tabla vacía.

**Hoy eso sería un bloque en blanco, y un bloque en blanco miente por omisión** (parece que no hay
servicio). Tiene que decir la verdad:

```
Avanza no publica los horarios de esta línea.
```

⚠️ Y **sin inventar el motivo**. No sabemos por qué no los publica.

---

## 5 · ⚠️ Casos límite y qué hacer

| caso | dónde ocurre | qué hacer |
|---|---|---|
| **Empate en el par mayoritario** | **1 caso en toda la red**: 42 `-2` (2 vs 2) | Desempata la salida **más temprana**. Determinista y explicable |
| **3 pares distintos** | 7 sentidos: Ci3 `-2`, 21 `-1`, 23 `-1`, 25 `-2`, 32 `-1`, 39 `-1`, 40 `-2` | Dos marcas. El modelo aguanta |
| **Excepción mayoritaria** | 23 (57 %), 41 `-2` (50 %), Ci2 `-2` (42 %) | Se marca igual. La cabecera sigue siendo el par más frecuente aunque no llegue al 50 % |
| **Horas iguales** | 23 `-1`: dos salidas a las 05:15 desde orígenes distintos | Se listan las dos, en el orden en que vienen. **No se deduplica por hora** |
| **Nombre de terminal largo** | máx. 20 car. (`CAMINO LAS TORRES, 4`, `PZA.EMPERADOR CARLOS`) | Solo aparece en el **pie**, nunca inline. No hay problema de ancho |
| **Terminal truncado por Avanza** | `PZA.EMPERADOR CARLOS`, `ECHEGARAY/MERCADO CE` | Se cita tal cual. **No se completa adivinando** |
| **Salidas después de medianoche** | 00:10, 01:10… | Van **al final**, en orden. No se reordenan a las 00:00 |

---

## 6 · La frecuencia

Se **cita**, no se calcula:

```
Cada {N} min de media ({tipo de día}) · según Avanza
```

⚠️ **Es una MEDIA del día entero, y tiene que verse que lo es.** Medido: en la 35 el día real va de
33′ al alba a 8′ en meseta y 38′ de noche; Avanza publica «9». No miente —lleva la palabra media—
pero describe mal cualquier momento concreto.

⚠️ **Y no siempre coincide con la realidad:** 4 de 8 medidas eran exactas; la 35 dice 9 y son 8;
**la 41 dice 20 y son 22** (promete menos espera de la que hay).

→ Se cita el número de Avanza **tal cual**, con su atribución. No se corrige ni se sustituye por
uno calculado: el GTFS no cubre 16 de 45 líneas ciertos días, así que un número calculado
desaparecería justo donde más falta hace.

→ **Los tres tipos de día** (laborables / sábados / festivos) se publican. Decidir si se enseñan
los tres o solo el de hoy — **pendiente**.

→ La explicación larga (que es media, que el ritmo real varía en rampa/meseta/noche) va en
**`/sobre-los-datos`**, no en el bloque.

---

## 7 · Lo que gana

| sentido | hoy | modelo |
|---|---|---|
| 34 `-2` (la peor) | 43 filas × 3 col. | ~7 renglones |
| 38 `-1` | 37 filas | ~6 renglones |
| 35 `-1` | 27 filas | ~4 renglones |
| 25 `-1` | 11 filas | ~3 renglones |
| 41 `-1` | 3 filas | 2 renglones |

**Y el mismo modelo para 2 filas que para 43.**

---

## 8 · ⚠️ Lo que NO se pierde

- **El orden cronológico**, intacto. Era lo que rompían los modelos por grupos.
- **El servicio parcial** — la información que más guerra ha dado del proyecto. Hoy hay que leer
  la tercera columna de 37 filas comparando strings; con la marca **el patrón salta a la vista**.
- **La procedencia**: «según Avanza» sigue en el bloque de frecuencia.

---

## 9 · Decisiones abiertas

- **El símbolo de marca.** Letra volada (`ᴹ`, `ˢ`, `ᴾ`) frente a otras opciones.
  ⚠️ **El asterisco `*` NO se puede usar**: ya significa *fuente secundaria* en la ficha de flota.
  Reutilizarlo sería un préstamo semántico — el mismo fallo que la clase `.es-rancio`.
- **¿Se enseñan los tres tipos de día** de la frecuencia, o solo el de hoy?
- **Ci3 `-2`**: 14 excepciones sobre 33 filas con 3 pares. El modelo aguanta, pero queda denso.
  Mirar cómo se ve antes de darlo por bueno.
