# ZETABUS — Documento de estado del proyecto

> **Proyecto 003.** Visor en vivo de la red de autobuses urbanos de Zaragoza.
> Tercera pieza del portfolio, tras Linaje (001) y Turnia (002).
>
> Este documento es la **memoria del proyecto**. Se actualiza al cerrar cada tanda.

**Estado actual:** Tandas 1, 2 y 3 **CERRADAS**. El motor vivo está construido y estresado.
**Siguiente:** **Tanda 4 (primera pantalla)** — la primera vez que esto se ve.
**Última actualización:** 13/07/2026

---

## 1 · Identidad

**Nombre: ZetaBus**
- La **Z** de Zaragoza sin gritarla + el autobús.
- ⚠️ **Coste asumido conscientemente:** mete "bus" y "Zaragoza" en la marca. El día que entre
  el tranvía o Bilbao, el nombre se queda corto. Decisión tomada con los ojos abiertos.
- **Pero el CÓDIGO no lo hereda:** el motor no sabe que es un bus (ver §4).

**Color:** pendiente (Fase 5).
⚠️ **Restricción dura:** el mapa necesita **rojo/ámbar/verde** para el estado. La marca no
puede competir con la semántica de estado.
⚠️ **Y hay un problema añadido, único de este proyecto:** el color de las líneas **no lo
elegimos nosotros** — viene del operador. Y **22 de las 44 líneas caen en la franja
rojo/ámbar/amarillo/lima/verde**. La línea 31 es *literalmente* el mismo rojo que "retraso"
(ΔE 3,0).
→ **EL ESTADO NO PUEDE IR EN EL TONO.** Va en forma, anillo con borde blanco, opacidad o
movimiento.

---

## 2 · Qué es

**Dos vistas del mismo dato:**

**VISTA PARADA** *(el que espera)*
Línea → sentido → parada → los próximos buses con sus **minutos**, moviéndose en el mapa en su
coordenada GPS real. De cada bus: modelo, combustible, y si es **articulado o sencillo**.

**VISTA LÍNEA** *(el que mira la red)*
El **trazado real de hoy** + las paradas en orden + los buses detectados ahora, cada uno en su
GPS con su destino.

**LA CAPA QUE NADIE MÁS TIENE**
Desvíos marcados, supresiones con nota, y **la contradicción del operador enseñada** cuando la
haya.

### 🎬 Momento oro para la demo

> **"Circulan 12 buses en la línea 35 ahora mismo. Los 12 son articulados.
> El que llega en 3 minutos es un Volvo 7905 de 18 m."**

Ninguna app dice eso. Y **es un recuento, no una declaración** → no necesita permiso, no
miente en domingo, no caduca. *(Ver L2 en [`docs/LECCIONES.md`](docs/LECCIONES.md).)*

### ⛔ Fuera de alcance — CON SU MOTIVO

| Fuera | Por qué |
|---|---|
| **Proyectar el bus sobre el trazado** | **No hay `trip_id`.** Habría que inferir el sentido por texto y proyectar por proximidad. Con los dos sentidos yendo por calles paralelas, **pintaría el bus en el sentido contrario**. No peta: PINTA. |
| **Medir el servicio** (frecuencias, Índice de Puntualidad) | Exige **histórico**, y el histórico no se deriva de nada → base de datos + barredor de fondo. **V1 ENSEÑA, NO MIDE.** |
| **Repintar la ruta desviada a mano** | Superado: `get_stops_list` la da hecha. *(Ver §5.)* |
| **Tranvía / multimodal** | Es el **004**. ZetaBus talla el saliente (§4), no lo construye. |

---

## 3 · Las fuentes, y qué miente cada una

| Capa | Fuente | Estado |
|---|---|---|
| **Topología teórica + shapes + colores** | **GTFS del NAP** (fichero 1176) | ✅ Fiable. ⚠️ **Miente cuando hay obras.** Caduca **05/10/2026** |
| **Recorrido REAL de hoy** | `get_stops_list` + **KML** (web de Avanza) | ✅ Secuencia ordenada por sentido, **con el desvío aplicado**. 45/46 líneas |
| **Tiempo real** (posición, ETA, nº de bus) | `gps.avanzabus.com` | ✅ Única puerta. **No existe GTFS-RT en Zaragoza** (probado) |
| **Alteraciones** | `get_alteraciones_servicio` **por línea** | ⚠️ **No el RSS** — pierde 3 de 6 alteraciones vigentes |
| **Flota** (modelo, combustible, longitud) | **Anexo 5 del pliego** | ✅ Regenerado. **Insustituible: el GTFS no puede tenerlo** |

**Puente de identidad — GRATIS:** `poste = int(stop_code[2:])`. Cobertura **934/934**.

### ⭐ LA ASIMETRÍA QUE LO GOBIERNA TODO

> **DESVÍO DE RUTA** *(el bus no pasa)* → la ruta operativa **CAMBIA** → se ve en
> `get_stops_list`, en el KML y en la API viva (el poste enmudece).
> **DERIVABLE Y AUTO-APAGABLE.**
>
> **SUPRESIÓN DE PARADA** *(pasa y no para)* → la ruta operativa **NO cambia**. Ponen el
> cartel en el metacrilato pero **NO desconectan el poste**. La API sigue anunciando buses ahí.
> **NO DETECTABLE POR NINGUNA FUENTE.**

**Prueba:** el comunicado del Coso dice que la 29 y la 39 *"realizan su recorrido habitual pero
sin parar en Plaza San Miguel"*. La API anuncia buses **a 0 minutos** en ese poste.

---

## 4 · Decisiones tomadas, con su porqué

| Decisión | Por qué | Qué se descartó |
|---|---|---|
| **Next.js + TypeScript** | Es el **escalón que falta**: JS/TS de verdad. El dominio es frontend con backend fino | **Laravel**: no hay usuarios, ni roles, ni auth. Sería matar moscas a cañonazos. **PHP vanilla**: ir hacia atrás. **Repetir el stack de Turnia**: no sube el escalón |
| **Leaflet + OpenStreetMap** | Gratis, sin clave, sin límite | Google/Mapbox: una demo pública permanente no puede depender de un contador |
| **Sin base de datos** | Todo se deriva. *Lo derivable no se guarda* | MySQL: no hay nada que persistir en la v1 |
| **Colores del GTFS** (`route_color`) | Cobertura 100%. Cubre 6 líneas que el JSON no tiene | Los del JSON heredado: **empate técnico, no se sabe quién tiene razón**. Se deja un fichero de override vacío |
| **El motor no sabe que es un bus** | Para que el **004 multimodal** sea un hito pequeño, no cirugía | Modelar "autobús" como tipo. *(Turnia: el motor no sabía qué era un bar.)* |
| **Caché de dos pisos** (memoria + disco con cerrojo) | Con 4 workers y sin el piso en disco: **1.020 req/min** contra Avanza, en silencio, hasta que bloqueen la IP. Con él: **255, pase lo que pase** | Depender de que Hostinger arranque un solo worker: *"nadie va a recordar mantener ese `1` dentro de dos años"* |
| **V1 enseña, no mide** | El 80% del valor sin el problema duro dentro | ⚠️ **Coste:** el histórico que no captures hoy **no se recupera nunca** |

---

## 5 · ⚠️ Decisiones que se DESHICIERON — no se borran

**Esta sección vale oro. Si no está escrita, alguien lo reabre — incluido yo dentro de tres
semanas.**

| Se creyó | Por qué se creyó | Por qué se dejó de creer |
|---|---|---|
| **"Solo se puede tachar, no repintar"** | Los comunicados dan las paradas del desvío **sin orden y sin sentido**, y 7 de 30 no existen en el GTFS | ⭐ **Existe `get_stops_list`**, que da la secuencia ordenada del recorrido real. *"El desvío no hay que transcribirlo: hay que pedirlo."* **Lo encontró Antonio mirando 3 postes** |
| **"7 paradas fantasma"** (listadas como suprimidas pero con buses) | La API viva devolvía llegadas ahí | ⭐ **El oráculo era falso.** La API **no refleja las supresiones**: ponen el cartel pero no desconectan el poste. **Lo dijo Antonio, que conoce la ciudad** |
| **"Esta línea lleva articulados"** | Es cierto, y está en el pliego | El pliego que lo dice **NO está en vigor** (pendiente de adjudicar). Y la dotación **cambia en domingo**. → **Sustituido por un recuento en vivo**, que no necesita permiso |
| **"El tranvía es una ficha aparte del NAP"** | Parecía lógico | **Falso. Ya está dentro del ZIP** (`agency_id=11`). El 004 se abarata |
| **"Los colores del JSON no son los oficiales"** | Un solo caso (línea 21, y encima gris) | **Extrapolación desde un caso.** Empate técnico 16-16 contra el mapa oficial. **No se sabe** |
| **"El JSON de flota es oro puro"** | El GTFS no puede tener esos datos | ✅ Sigue siendo insustituible… **pero tenía 62 longitudes mal, todas en el mismo sentido.** Regenerado desde el Anexo 5 |

---

## 6 · Lo que NO se puede saber — y qué se le dice al usuario

| No se sabe | Qué se dice |
|---|---|
| **Si una parada suprimida sigue suprimida** | **No se adjudica.** *"Avanza declaró esta parada suprimida el 10/01. Su sistema sigue anunciando buses aquí. Confirma en la marquesina."* La contradicción es del operador |
| **Qué expedición es un bus** (`trip_id`) | No se proyecta sobre el trazado. **El bus se pinta donde está** |
| **Todos los buses de una línea** | **"Buses detectados"**, nunca *"todos los buses"*. La API da los que **se acercan** a una parada |

---

## 7 · Mapa de tandas

| | Tanda | Estado |
|---|---|---|
| — | **Auditoría de fuentes** (7 fases) | ✅ |
| **1** | **Modelo de datos y capas** | ✅ **APROBADA** |
| — | Repositorio | ✅ Público — [github.com/ablanquez/zetabus](https://github.com/ablanquez/zetabus) |
| **2** | **Capa de datos** (GTFS, flota, puente de identidad) | ✅ 44 líneas · 934 paradas · puente 934/934 · flota 403 |
| **3** | **Motor vivo** (scrape, caché, barrido, diff de desvíos) | ✅ **157 tests** · 3 bugs reales cazados por ellos |
| **4** | Primera pantalla (parada → tiempos) | ⬜ ← **AQUÍ** |
| **5** | El mapa (Leaflet, buses, trazado) | ⬜ |
| **6** | Capa editorial (desvíos, supresiones, contradicción) | ⬜ |
| **7** | Endurecimiento + **responsive** | ⬜ ⚠️ *Responsive DESDE EL BRIEFING, no ocho tandas después* |
| **8** | Despliegue + demo pública | ⬜ |

---

## 7bis · Lo que el motor vivo YA SABE HACER (Tanda 3)

| | |
|---|---|
| **Peticiones a Avanza** | 1 usuario: **4/min**. 10 usuarios en la misma parada: **4/min**. Una línea en pantalla: **72/min**. Techo duro: **4 req/s**, compartido entre workers. **Cero cuando nadie mira.** |
| **Caché** | Dos pisos (memoria + disco con cerrojo `O_EXCL`). 20 peticiones concurrentes = **1 llamada**. **Expone la edad** del dato: "actualizado hace 18 s". |
| **Barrido** | Paso 4: **18 peticiones en vez de 67**, y encuentra **los 11 autobuses**. Cobertura 100% (medido sobre una sola captura → cero deriva. Ver L6). |
| **Desvíos** | Diff GTFS ↔ `get_stops_list`. **Se auto-apaga** cuando restauran la ruta. Verificado sobre desvíos reales del Coso y Avenida Valencia. |
| **Estados** | `ok` · `rancio` · `ilegible` · `caido` · `desconocido`. El proyecto viejo tenía **uno**, y se comía cuatro situaciones distintas. |

### ⭐ La asimetría, demostrada EN VIVO (13/07/2026, Plaza San Miguel)

Dos postes, uno por sentido. Misma plaza, mismas líneas:

| poste | sentido | el diff dice | la API viva dice |
|---|---|---|---|
| **745** | Camino Las Torres / Pinares | **DESVÍO** — la parada cae | (el autobús no pasa) |
| **744** | San Gregorio / Vadorrey | **sin desvío** — la ruta no cambia | **"029 SAN GREGORIO, 1 min"** |

Y el comunicado de Avanza dice **por escrito** que la 29 y la 39 en sentido San Gregorio/Vadorrey
*"realizan su recorrido habitual **pero sin realizar parada** en Plaza San Miguel"*.

→ El **745 es un desvío**: ZetaBus lo detecta y lo tacha solo.
→ El **744 es una supresión**: **no lo detecta ninguna fuente**, y la API sigue anunciando ahí un
autobús que no va a parar.

**Misma plaza. Dos sentidos. Uno se puede saber y el otro no.** Eso es el proyecto entero.

---

## 8 · Cabos abiertos

- ⚠️ **Workers de Hostinger** — sin verificar. La caché ya no depende de ello, pero **hay que
  medirlo**. `/api/diag` ya devuelve `process.pid`: bastan 30 curl concurrentes en el despliegue.
- ⚠️ **Los fixtures de los tests son SINTÉTICOS.** Un CI en verde **no demuestra** que Avanza no
  haya cambiado su HTML. Lo único que lo demuestra es `npm run canario` (1 petición).
- ⚠️ **La subida de la ráfaga de 8 a 40** (para que quepa el barrido de la N7, 31 peticiones)
  **debilita la protección de ráfaga**. El techo sostenido (4/s) no cambia. Ver L5.
- ⚠️ **2 vulnerabilidades moderadas de `postcss`**, transitivas de Next. `npm audit fix --force`
  tocaría la versión de Next. Sin resolver, y dicho.
- ⚠️ **El GTFS caduca el 05/10/2026** (84 días). **La app tiene que decirlo en pantalla.**
- **Plaza Europa** y **Caspe 48** — dos supresiones sin resolver.
- **El histórico** — si algún día se quiere medir, **el reloj empieza el día que se encienda**.
  Lo que no captures hoy, no se recupera.
- **Solo se compararon 2 líneas de 45** contra `get_stops_list`. Y no se sabe con qué
  frecuencia Avanza lo actualiza.

---

## 9 · Índice de documentos

| Documento | Para qué se abre |
|---|---|
| **[Auditorías, fases 1-7B](docs/auditoria/)** | Cómo se llegó aquí. Qué miente cada fuente y cómo se probó |
| **[`docs/diseno/tanda1-modelo-de-datos.md`](docs/diseno/tanda1-modelo-de-datos.md)** | El modelo, las capas, la caché. **APROBADO con enmiendas** |
| **[`docs/diseno/tanda1-cierre-de-cabos.md`](docs/diseno/tanda1-cierre-de-cabos.md)** | Las enmiendas al diseño. **Prevalece sobre el anterior** |
| **[`docs/LECCIONES.md`](docs/LECCIONES.md)** | Método. Vale más allá de ZetaBus (L1 contador de control, L2 contar vs declarar, L3 regenerar vs parchear) |
| **[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md)** | La posición legal: *consumir ≠ redistribuir* |

---

## 10 · La frase que resume el proyecto

> **El GTFS oficial da la topología, pero miente cuando hay obras.**
> **La API viva da la ruta real, pero no las supresiones.**
> **El comunicado da las supresiones, pero no caduca.**
> **ZetaBus cruza las tres, y enseña la contradicción en vez de fingir que no existe.**
