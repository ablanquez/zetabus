# Auditoría — la tabla de horarios de la web de Avanza

**Fecha:** 2026-07-16. **Peticiones a Avanza:** ~12 (una línea/URL bien puesta + varias fechas + 4
líneas de cobertura). **Código tocado:** ninguno.

## ⚠️ Rectificación del spike Q1

El spike anterior concluyó *"no hay horario de día raspable, solo el widget en vivo"*. **Era falso, y
el error fue mío y tonto:** pedí `/lineas-y-horarios/?linea=34` cuando el parámetro real es
**`?selectLinea=44&selectSentido=-1`**. Con el nombre equivocado, la página venía sin tabla y deduje
"la rellena JS / es el vivo". **Sí hay una tabla de horarios del día, server-rendered y raspable.**
Rectifico entero abajo.

---

## Veredicto en una línea

> **Existe una tabla de horarios server-rendered, day-aware y con el ALCANCE REAL del día** (la 44 hoy
> sale a Pablo Ruiz Picasso, no a Campus Río Ebro — coincide con el vivo y con Antonio). Da
> **primeras + últimas** con su **terminal por salida**, una **frecuencia media** (un número por tipo
> de día) y un **texto de "Información adicional"**. **Resuelve el ALCANCE que el GTFS miente.** Pero
> **no da el día completo** (solo primeras/últimas) **ni frecuencia por tramos**, tiene **ventana de
> fechas hacia delante** (el pasado y el futuro lejano vienen vacíos) y **no cubre búhos**. → **No
> reemplaza al GTFS para el ritmo fino; lo COMPLEMENTA, y es la fuente de alcance que faltaba.**

---

## 1 · ¿La tabla está en el HTML directo o la rellena JS? → **HTML directo (server-rendered)**

`GET https://zaragoza.avanzagrupo.com/lineas-y-horarios/?selectLinea=44&selectSentido=-1` devuelve la
tabla **ya en el HTML crudo** (158 KB): "Primeras salidas", "Últimas salidas", horas, "Frecuencia
media", "Información adicional". No hace falta ejecutar JS. Clases estables:
`container-horarios-table`, `table-horarios`, `table-horarios-primeras-desc`,
`table-horarios-ultimas-desc`, `#infoHorarios`.

**44 dir −1, hoy (dedup):**

| Hora | Desde | Hasta |
|---|---|---|
| 05:15 / 05:36 / 05:56 / 06:18 / 06:36 / 06:55 / 07:12 / 07:28 | ESTACION MIRAFLORES | **PABLO R. PICASSO** |
| 21:30 / 21:51 / 22:15 / 22:42 | ESTACION MIRAFLORES | **PABLO R. PICASSO** |

⚠️ En el HTML cada fila aparece **×4** (copias responsive desktop/móvil). Se **deduplica** por
(hora, desde, hasta) — trivial. Hoy: 8 primeras + 4 últimas = **12 filas únicas**, todas a Pablo Ruiz
Picasso.

## 2 · ¿Es day-aware? ¿Cómo se pasa la fecha? → **Sí, por POST `times-date`, con VENTANA hacia delante**

- **Mecanismo:** `<form id="lines-form" method="post" action="/lineas-y-horarios/?selectLinea=44&selectSentido=-1">`
  con `<input type="date" name="times-date" value="2026-07-16">` (por defecto **hoy**). Se consulta
  otra fecha con **`POST times-date=YYYY-MM-DD`** a esa misma URL.
- **Cambia con la fecha (medido):**

  | `times-date` | Filas únicas | Terminal |
  |---|---|---|
  | 2026-07-16 (J) | 12 | Pablo Ruiz Picasso |
  | 2026-07-17 (V) | 12 | Pablo Ruiz Picasso |
  | 2026-07-18 (S) | **3** (sábado, menos servicio) | Pablo Ruiz Picasso |
  | 2026-07-20 (L) | 12 | Pablo Ruiz Picasso |
  | 2026-07-25 (S) | **3** | Pablo Ruiz Picasso |
  | 2026-07-15 (víspera) | **0 (vacío)** | — |
  | 2026-08-25 / 2026-09-15 | **0 (vacío)** | — |

  ⇒ Distingue **tipo de día** (laborable 12 vs sábado 3) → **es day-aware de verdad**. Pero **solo en
  una ventana hacia delante** desde hoy (≈ hoy … +2–3 semanas): el **pasado** (15 jul) y el **futuro
  lejano** (25 ago, 15 sep) vienen **vacíos**.
- ⚠️ **No pude OBSERVAR el "flip" a Campus Río Ebro.** Todas las fechas servibles caen dentro del
  verano (16 jul–31 ago), donde el terminal siempre es Pablo Ruiz Picasso. Las fechas escolares (que
  el texto dice = Campus Río Ebro) están **fuera de la ventana** → vacías. **El flip está confirmado
  por la PROSA y por que hoy coincide con la realidad (vivo + campo), no por una tabla alternativa
  observada.** Es el único fleco (ver §4, F12).

## 3 · ¿Qué da y para qué líneas?

**Da:**
- **Primeras + últimas salidas** con **Hora / Desde / Hasta**. El **"Hasta" es el TERMINAL de esa
  salida** → **el alcance del día, por salida**. (Estructuralmente soporta terminal dinámico: distintas
  salidas podrían tener distinto "Hasta"; hoy todas Pablo porque es verano.)
- **Frecuencia media:** un **único número por tipo de día**: *"laborables: 15, sábados: 23, domingos y
  festivos: 23 min"*. **NO son tramos** — es un promedio, y encima el mismo para cualquier fecha
  (no varía con `times-date`; es estático por tipo de día).
- **Información adicional (prosa):** cajón de texto libre. Para la 44 trae el oro:
  *"En sábados, domingos y festivos y del 16 de julio al 31 de agosto realiza terminal en Pablo Ruiz
  Picasso 34, en vez de en Campus Río Ebro. En periodo escolar, la primera salida … con terminal en
  Campus Río Ebro es a las 7:14h y la última a las 20:40h. El acceso sentido Miraflores podrá
  realizarse desde la parada de María Zambrano 48."* Es **irregular y line-dependent** (aparece donde
  hay algo que decir; en líneas simples, poco o nada). Raspable como texto, **no como campos**.

**NO da:**
- **El día completo.** Solo primeras + últimas; el centro no se lista (lo "cubre" la frecuencia media).
- **Frecuencia por tramos.** Un número, no "7:00–9:30 cada 6, 9:30–13:00 cada 15".

**Cobertura (medida, hoy):**

| Línea | ¿Tabla? | Frec. media |
|---|---|---|
| 44, 34, 23 (diurnas) | ✅ | 44:15 · 34:9 · 23:8 |
| Ci1 (circular) | ✅ | 8 |
| C1 (lanzadera) | ✅ (2 filas) | 15 |
| **N1 (búho)** | ❌ **0 filas** | — |

⇒ Diurnas, circulares y lanzaderas: sí. **Búhos: no.**

## 4 · Cómo se raspa (directo) + qué mirar en F12 para el fleco

### Raspado directo (no hace falta F12)

```
POST https://zaragoza.avanzagrupo.com/lineas-y-horarios/?selectLinea={LINEA}&selectSentido={-1|-2}
Content-Type: application/x-www-form-urlencoded
Body: times-date=YYYY-MM-DD          (por defecto hoy si se hace GET)

Parseo: node-html-parser sobre .table-horarios-primeras-desc / -ultimas-desc.
  Cada fila → (hora, desde, hasta). DEDUP por la terna (vienen ×4).
  Frecuencia: regex sobre "Frecuencia media: laborables: N, sábados: M, …".
  Info adicional: innerText del bloque #infoHorarios / "Información adicional".
```

Robusto-ish: clases estables, mismo patrón que ya usamos para `get_stops_list` (HTML, no regex a pelo).

### F12 — solo para cerrar el ÚNICO fleco: ¿la tabla muestra Campus Río Ebro en periodo escolar?

No pude verlo (fuera de ventana). Antonio, para confirmarlo desde el navegador:

1. Abre `https://zaragoza.avanzagrupo.com/lineas-y-horarios/?selectLinea=44&selectSentido=-1`.
2. F12 → pestaña **Network** → filtro **Doc** (o **Fetch/XHR**). Marca **Preserve log**.
3. En el selector **Fecha**, elige un día de **periodo escolar** (p.ej. **mediados de septiembre**) y
   dispara la consulta (botón/submit del formulario de horarios).
4. En Network, busca la request a **`/lineas-y-horarios/?selectLinea=44&selectSentido=-1`** (método
   **POST**). Cópiame:
   - **Request:** URL, método, y el **body** (debería salir `times-date=2026-09-…`; mira si manda
     algo más que yo no vi).
   - **Response:** un trozo de la tabla — en concreto la columna **"Hasta"**: ¿dice **CAMPUS RÍO
     EBRO** o viene vacía?
5. Si con el date-picker de la UI **sí** salen filas a Campus Río Ebro para septiembre, entonces la
   ventana es más ancha por la UI que por mi POST y **el flip queda confirmado en tabla**. Si también
   sale vacío, la ventana es real y el flip solo vive en la prosa (habría que raspar la prosa para el
   futuro).

## 5 · Diagnóstico honesto — ¿reemplaza al GTFS, lo complementa, o tiene límites?

**Lo COMPLEMENTA, y arregla justo lo que el GTFS miente — pero no lo sustituye para el ritmo fino.**

| Necesidad | Fuente que gana | Por qué |
|---|---|---|
| **¿Circula hoy?** | **Web** | Hoy da tabla llena a Pablo; el GTFS dice 0 trips (miente). |
| **¿Hasta dónde hoy? (terminal por salida)** | **Web** ("Hasta") | Day-true; el GTFS no lo sabe y `get_stops_list` da la ruta máxima. |
| **Primeras / últimas del día** | **Web** | Ya vienen dadas, day-true, con terminal. |
| **Frecuencia por TRAMOS** (mañana pico vs valle) | **GTFS** | La web da un solo promedio; el GTFS tiene todas las salidas → bloques. |
| **Todas las salidas del día (centro)** | **GTFS** | La web no lista el centro. |
| **Búhos** | GTFS / vivo | La web no los trae. |

### Reparto recomendado

- ⭐ **La web es el ESQUELETO day-true:** ¿circula?, primeras, últimas, **terminal por salida
  (alcance)**, frecuencia media. Es la **autoridad de alcance** y de primeras/últimas — y **funciona
  los días que el GTFS deja caer la línea** (44 hoy: GTFS 0, web tabla completa).
- **El GTFS baja a ENRIQUECIMIENTO del ritmo:** los **tramos de frecuencia** del centro (pieza 4), y
  el detalle de todas las salidas — **ignorando su alcance** (que ya lo da la web) y **solo cuando
  cubre la línea ese día**.
- **Ojo al conflicto de días:** los días que el GTFS deja caer la línea (44 el 16-17 jul), **tampoco
  hay tramos de GTFS**. Ese día el ritmo fino no existe: o se aproxima con un día equivalente, o se
  vive con la frecuencia media de la web. **Decisión de diseño (§ maestro Q-B).**

### Límites que hay que conocer (no esconderlos)

1. **Ventana hacia delante:** no se puede raspar el pasado ni el futuro lejano. Para el cron diario
   (que calcula **hoy**) es indiferente — hoy siempre está en ventana—. Pero **no se puede
   precomputar mañana o septiembre**.
2. **Frecuencia = un promedio**, no tramos. Si Antonio quiere los tramos honestos, siguen saliendo del
   GTFS.
3. **Solo primeras + últimas**, no el día entero.
4. **Búhos fuera.**
5. **Info adicional = prosa irregular**, line-dependent. Útil como aviso literal (encaja con §Q6 del
   maestro), no como campos estructurados.
6. **Filas ×4** (dedup obligatorio).
7. **El flip a Campus Río Ebro no lo observé** (fuera de ventana); confirmado por prosa + coincidencia
   con la realidad de hoy. Fleco a cerrar con el F12 (§4).

### Consecuencia para el documento maestro (a aplicar cuando toque, no ahora)

Esto **mejora la respuesta a Q1**: ya no hace falta la muleta "avisar o consultar vivo" para el
alcance — **la web da el alcance day-true**. El principio rector se puede mantener casi entero:

> **RITMO grueso + ALCANCE:** medir qué pasa hoy = **raspar la tabla web de hoy** (fiable, day-aware).
> **RITMO fino (tramos):** GTFS de hoy, cuando cubre la línea, e ignorando su alcance.
> El vivo (`tiempos_de_llegada`) queda como confirmación puntual, no como fuente del horario.

Las piezas 2/3/5 (alcance, terminal dinámico, primeras/últimas) pasan a apoyarse en la **web**; la
pieza 4 (tramos) sigue en el **GTFS**. Pendiente de decidir: el ritmo de los días que el GTFS deja
caer, y si raspar la prosa para avisos.
