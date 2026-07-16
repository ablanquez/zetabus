# Auditoría Q1 — ¿de qué fuente sale el horario (y el alcance) de hoy?

**Fecha:** 2026-07-16, ~17:41 (hora real del servidor de Avanza, confirmada). **Peticiones a Avanza:**
8 (1 página de línea ya cacheada + 1 JS + 4 `tiempos_de_llegada` + 2 `get_stops_list` previas).
**Código tocado:** ninguno.

Resuelve la **pregunta abierta Q1** de `docs/MOTOR-HORARIOS.md`: el principio rector ("medir qué pasa
hoy") descansa en que el GTFS-de-hoy = realidad-de-hoy. Antonio aportó conocimiento de campo que lo
contradice. Verificado contra el dato.

---

## Veredicto en una línea

> **El GTFS MIENTE sobre el alcance de hoy** (dice "44: 0 trips el 16 jul"; la 44 está pasando por la
> calle, confirmado en vivo). **No existe un horario de día completo raspable en la web de Avanza**:
> lo que Antonio vio son los **tiempos en vivo** (próximos buses en tiempo real, no una tabla del día).
> ⇒ **El GTFS sirve para el RITMO (cuándo, cada cuánto, primeras/últimas), NO para el ALCANCE (si
> circula, hasta dónde). Y ninguna fuente da el alcance del día por adelantado en un cron nocturno.**
> El principio rector necesita una muleta explícita: para el alcance, **avisar/consultar en vivo, no
> afirmar desde el GTFS.**

---

## La prueba, punto por punto

### 1 · ¿Hay horario real de hoy en la web de Avanza, raspable? → **NO** (no como tabla del día)

Miré más a fondo que el spike anterior (no solo los 4 *actions*): la página de línea, su JS
(`ajax-script.js`) y lo que rellena `.table-horarios` / `#tiemposLlegada`.

- Lo que **rellena las "horas" de la página** es la acción **`tiempos_de_llegada`** — *"Próximos
  autobuses en el poste seleccionado **en tiempo real**"*. Es **live**, no una tabla del día.
- Los únicos ficheros "horarios" en la página son **imágenes de marketing** genéricas
  (`...lineas-y-horarios_mayo_26_7.png`, `AvanzaZaragoza...Creatividad-37.webp`) — banners, no datos,
  no *day-aware*, no raspables como horario.
- El set completo de la API sigue siendo **4 acciones** (`get_stops_list`, `tiempos_de_llegada`,
  `get_direction_list`, `get_alteraciones_servicio`); **ninguna acepta fecha ni devuelve una tabla del
  día.**

⇒ **"Las horas puestas en la URL" = el widget de tiempos en vivo.** Es real y es de hoy, pero es
*"los próximos 2-3 buses ahora"*, **no** el horario completo del día. **No hay fuente web de horario de
día completo.**

### 2 · ¿`get_stops_list` sabe "hasta dónde hoy"? → **NO**, da la ruta máxima estática

`get_stops_list` de la 44 (hoy) sigue devolviendo la ruta **hasta Campus Río Ebro (445)** en −1 y
arrancando en 445 en −2 — **la ruta máxima**, aunque hoy la 44 **no** llega allí (ver §3). No depende
de la fecha. Sirve para topología y nombres, **no** para el alcance del día.

### 3 · ¿Los tiempos en vivo confirman que la 44 circula hoy y hasta dónde? → **SÍ, rotundo**

`tiempos_de_llegada` a las 17:41 del 16 jul, en los postes clave:

| Poste | Qué es | Buses en vivo |
|---|---|---|
| **616 · Pablo Ruiz Picasso n.35** | terminal de hoy (según Antonio) | **44 → ESTACIÓN MIRAFLORES, 8 min**; +50 |
| **1260 · Estación Miraflores** | terminal 44 | **44, 3 min; 44, 16 min** |
| **611 · Pablo Ruiz Picasso n.2** | tramo 44 | **44, 12 min; 44, 30 min**; +50 |
| **445 · Campus Río Ebro** | la extensión | **solo 43** (8/40 min) — **NINGÚN 44** |

⇒ **La 44 circula hoy** (contra el GTFS que dice 0). Y llega a **Miraflores / Pablo Ruiz Picasso**,
**no a Campus Río Ebro** (445 no tiene 44). Los tiempos en vivo **sí** dan el alcance —vía presencia
por poste + el string de destino ("ESTACIÓN MIRAFLORES")— **pero solo AHORA**, y solo los próximos
buses. No es una tabla del día.

### 4 · ¿Por qué el GTFS dice 0 trips de la 44 hoy? → **NO es feed caduco; es el calendario del feed**

- **`feed_info` validez: 20260623 … 20261005.** Hoy (16 jul) **está dentro**. El feed **no** está
  caducado.
- **La 44 en julio** está activa el 01–15, **salta el 16 y el 17**, sigue el 18–19, 25–26. Es un
  **hueco en el calendario del feed** justo en jueves-viernes 16-17.
- **No es solo la 44.** Nº de líneas con servicio por día:

  | Día | Líneas | 44 | 23 | 34 |
  |---|---|---|---|---|
  | 13–15 (L-M-X) | 37 | ✅ | ✅ | ✅ |
  | **16–17 (J-V)** | **28** | **❌** | **❌** | ✅ |
  | 18–19 (S-D) | 44 | ✅ | ✅ | ✅ |
  | 20 (L) | 28 | ❌ | ❌ | ✅ |

  El patrón es **incoherente** (fin de semana con MÁS líneas que entre semana). El feed **deja caer**
  ~9 líneas —entre ellas 44 y 23— los jueves-viernes, y la realidad (vivo) las desmiente. **El
  calendario del GTFS no es fiable a nivel de fecha para "¿circula hoy?".**

---

## 5 · Recomendación — el reparto de fuentes

**Separar RITMO de ALCANCE. Son fuentes distintas y fiabilidades distintas.**

| Necesidad | Pregunta | Fuente fiable | Fuente NO fiable |
|---|---|---|---|
| **RITMO** | ¿cuándo, cada cuánto, primeras/últimas, secuencia? | **GTFS** (única con tabla del día estructurada) | — |
| **ALCANCE** | ¿circula hoy? ¿hasta dónde? | **tiempos en vivo** (presencia + destino), AHORA | **GTFS** (miente: 44), **get_stops_list** (ruta máxima) |
| **TOPOLOGÍA/NOMBRES** | ¿qué paradas existen y cómo se llaman? | `get_stops_list` | — |

- **El GTFS se queda como fuente de RITMO.** Cuando el GTFS dice que una línea circula, sus horas
  sirven (34 hoy: 111 trips, bloque 8-9 min limpio — bien). El ritmo del GTFS es bueno.
- **El GTFS NO decide el ALCANCE.** No se puede afirmar "hoy no hay 44" ni "hoy la 44 llega hasta X"
  desde el GTFS. Está probado que se equivoca.
- **El alcance fiable de hoy solo lo dan los tiempos en vivo** —y solo en el momento de mirar—. La web
  de Avanza **no** aporta una tabla del día que reemplace al GTFS; el widget que Antonio vio **es** el
  vivo.
- **`get_stops_list` no reemplaza nada de horario:** es ruta máxima. Vale para topología y para saber
  qué paradas hay "más allá" (pieza 2), no para el alcance.

### 6 · ⚠️ Ninguna fuente da el ALCANCE del día por adelantado — el principio rector necesita muleta

Este es el hueco que hay que diseñar, y lo digo claro:

- **En un cron a las 03:00 no hay forma de saber el alcance del día que viene.** Los tiempos en vivo a
  las 03:00 no tienen buses; el GTFS predice pero su alcance no es fiable. **El modelo "precalcular
  TODO de noche" funciona para el RITMO, no para el ALCANCE.**
- ⇒ **El ALCANCE no puede ser un dato horneado afirmativo.** Dos vías honestas (a decidir):
  - **(a) Avisar en vez de afirmar.** Nunca "hoy no circula la 44" por silencio del GTFS. Si el GTFS no
    cubre la línea hoy pero la línea existe → *"el dato oficial no cubre hoy esta línea; consulta
    tiempos en vivo"*, no *"no circula"*. Y el "hasta dónde" se enseña como **potencial** (ruta máxima)
    con la coletilla de que el alcance real del momento lo dan las llegadas en vivo.
  - **(b) Comprobación viva ligera en tiempo de vista.** Al abrir una línea, una consulta live barata
    (`tiempos_de_llegada` en los postes-terminal candidatos: 616 vs 445) confirma presencia y alcance
    **ahora**. Es *view-time*, no *precalc* — rompe el "no se calcula nada en runtime", pero es la
    única verdad de alcance que existe. Encaja con que ZetaBus **ya** consulta vivo (llegadas).
- **Lo que NO se puede hacer:** hornear "hoy la 44 llega a Pablo Ruiz Picasso" como hecho. No hay
  fuente que lo sepa a las 03:00.

### Consecuencia para el documento maestro (a aplicar cuando toque, no ahora)

El principio rector se **matiza**, no se tira:

> **RITMO:** medir qué pasa hoy = leer el GTFS-de-hoy (bien).
> **ALCANCE:** medir qué pasa hoy = **mirar el vivo en el momento**, o **avisar** —nunca afirmar
> alcance desde el GTFS, que miente—.

Las piezas 4 y 5 (frecuencias, tabla) son **ritmo** → GTFS, en pie. Las piezas 2 y 3 (prolongación
espacio/tiempo) son **alcance** → dependen del vivo o del aviso, **no** del GTFS solo. Y el estado
"sin servicio hoy" (Q5 del maestro) **no** se decide con el GTFS: si el GTFS dice 0 pero el vivo
tiene buses, hay servicio.

---

## Preguntas que esto deja sobre la mesa (para decidir con Antonio)

- **QA · ¿Vía (a) avisar o (b) consultar en vivo en tiempo de vista?** (b) da la verdad pero mete una
  petición viva por vista de línea; (a) es honesto y barato pero enseña menos. ¿Híbrido: horneo el
  ritmo + un aviso, y una comprobación viva opcional?
- **QB · ¿Cuánto vale el ritmo del GTFS cuando el GTFS "no cubre" el día?** Hoy la 44 no tiene horario
  GTFS pero circula. ¿De dónde sacamos SU ritmo (frecuencias, primeras/últimas) ese día? El vivo no lo
  da (solo próximos buses). ¿Usamos el ritmo de un día equivalente del GTFS (el viernes anterior que sí
  tiene 44) como aproximación, avisando de que es orientativo? **Esto es gordo: el ritmo también falta
  los días que el GTFS deja caer la línea.**
- **QC · ¿El hueco 16-17 jul es puntual o recurrente?** El feed deja caer ~9 líneas jueves-viernes con
  un patrón raro. ¿Es un defecto de este feed concreto o pasa cada semana? Si es recurrente, el problema
  de alcance es **estructural**, no un caso borde. (Sospecho recurrente por lo limpio del patrón; habría
  que mirar más semanas.)
- **QD · Los tiempos en vivo dan el destino como texto ("ESTACIÓN MIRAFLORES").** ¿Es fiable y estable
  ese string para derivar el terminal de hoy, o varía/abrevia? Si sirve, es la señal de alcance más
  directa que hay.
