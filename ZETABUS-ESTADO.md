# ZETABUS — Documento de estado del proyecto

> **Proyecto 003.** Visor en vivo de la red de autobuses urbanos de Zaragoza.
> Tercera pieza del portfolio, tras Linaje (001) y Turnia (002).
>
> Este documento es la **memoria del proyecto**. Se actualiza al cerrar cada tanda.

**Estado actual:** Tanda 4 **CERRADA** (pantalla + clon del vocabulario visual de la referencia).
**Siguiente:** **Tanda 5 — el mapa.**
⚠️ **Decisión pendiente:** mapa arriba (como la referencia) o llegadas arriba (como ahora).
**Última actualización:** 13/07/2026

---

## 1 · Identidad

**Nombre: ZetaBus**
- La **Z** de Zaragoza sin gritarla + el autobús.
- ⚠️ **Coste asumido conscientemente:** mete "bus" y "Zaragoza" en la marca. **Pero el CÓDIGO no
  lo hereda** — el motor no sabe que es un bus, y hay un test que lo obliga (ver §4).

**Color:** pendiente (Fase 5).
⚠️ **Restricción dura, y es peor de lo normal:** el color de las líneas **no lo elegimos** — lo
impone el operador. Y **22 de las 44 líneas caen en la franja rojo/ámbar/amarillo/lima/verde**.
**La línea 31 es literalmente el mismo rojo que "retraso"** (contraste 1,22:1 entre ambos).
→ **EL ESTADO NO PUEDE IR EN EL TONO.** Va en forma, borde, opacidad, palabra o movimiento.
→ **Y se verifica con una prueba de escala de grises:** se pinta la pantalla sin una gota de
  color y el estado tiene que seguir ahí. Si desapareciera, es que estaba en el tono.

---

## 2 · Qué es

**VISTA PARADA** *(el que espera en la marquesina)*
Parada → los próximos buses con sus **minutos**. De cada bus: modelo, combustible,
articulado/sencillo, **y su nivel de confianza**.
**+ filtros de línea** que apagan/encienden líneas **a la vez en el mapa y en la lista**.
⭐ Y hay **un solo estado**, no dos sincronizados: *"no se pueden desincronizar porque no hay
nada que desincronizar"*.

**VISTA LÍNEA** *(el que mira la red)*
**Itinerario vertical** con las paradas en orden, **chips de transbordo** (qué otras líneas
pasan por cada parada), nodos de búho, y **el recuento de buses circulando ahora**.

**LA CAPA QUE NADIE MÁS TIENE**
Desvíos detectados, supresiones con nota, **la contradicción del operador**, y la **edad real
del dato**.

### 🎬 Momento oro para la demo — YA FUNCIONA

> **"Detectamos 11 autobuses en la línea 35 ahora mismo. Los 11 de los que conocemos la ficha
> son ARTICULADOS."**
> *"Contado ahora, no declarado. 18 postes consultados de 67."*

⚠️ **Y el matiz que casi se come:** si de 11 detectados solo se conoce la ficha de 9, **no se
puede decir "los 11 son articulados"**. El denominador son **los que tienen ficha**, y los que
no la tienen **se dicen en la misma frase**.
*(L2 aplicada a sí misma: cambiar declarar por contar no te libra de decir la verdad sobre tu
recuento.)*

### ⛔ Fuera de alcance — CON SU MOTIVO

| Fuera | Por qué |
|---|---|
| **Proyectar el bus sobre el trazado** | **No hay `trip_id`.** Habría que inferir el sentido por texto y proyectar por proximidad. Con los dos sentidos por calles paralelas, **pintaría el bus en el sentido contrario**. No peta: PINTA |
| **Medir el servicio** (frecuencias, puntualidad) | Exige **histórico**, y el histórico no se deriva de nada. **V1 ENSEÑA, NO MIDE** |
| **Repintar la ruta desviada a mano** | Superado: `get_stops_list` la da hecha |
| **Tranvía / multimodal** | Es el **004**. ZetaBus talla el saliente, no lo construye |
| **"Cerca de mí"** | ⚠️ **Cabo abierto.** Para quien está en la marquesina, el camino correcto son **cero toques**, no dos. Primer candidato de la Tanda 5 |

---

## 3 · Las fuentes, y qué miente cada una

| Capa | Fuente | Estado |
|---|---|---|
| **Topología + shapes + colores** | **GTFS del NAP** (fichero 1176) | ✅ Fiable. ⚠️ **Miente cuando hay obras.** **Caduca el 05/10/2026** |
| **Recorrido REAL de hoy** | `get_stops_list` + **KML** | ✅ Secuencia ordenada por sentido, **con el desvío aplicado**. 45/46 líneas |
| **Tiempo real** (posición, ETA, nº bus) | `gps.avanzabus.com` | ✅ Única puerta. **No existe GTFS-RT en Zaragoza** (probado). ⚠️ **Se cae sola** |
| **Alteraciones** | `get_alteraciones_servicio` **por línea** | ⚠️ **No el RSS** — pierde 3 de 6 alteraciones vigentes |
| **Flota** | **Anexo 5 del pliego municipal** | ✅ Regenerado (403 vehículos: 350 oficiales + 53 `sin_verificar`) |

**Puente de identidad — GRATIS:** `poste = int(stop_code[2:])`. Cobertura **934/934**, verificada
en cada build.

### ⭐ LA ASIMETRÍA QUE LO GOBIERNA TODO

> **DESVÍO DE RUTA** *(el bus no pasa)* → la ruta operativa **CAMBIA** → se ve en
> `get_stops_list`, en el KML y en la API viva. **DERIVABLE Y AUTO-APAGABLE.**
>
> **SUPRESIÓN DE PARADA** *(pasa y no para)* → la ruta operativa **NO cambia**. Ponen el cartel
> pero **no desconectan el poste**. **NO DETECTABLE POR NINGUNA FUENTE.**

**Y ambas ocurren en la misma plaza.** Plaza San Miguel tiene dos postes:
- **745** (Camino Las Torres) → **desvío**. ZetaBus lo detecta y lo tacha solo.
- **744** (San Gregorio) → **supresión**. La API anuncia buses **a 0 minutos** en una parada donde
  el comunicado dice por escrito que no paran.

---

## 4 · Decisiones tomadas, con su porqué

| Decisión | Por qué | Qué se descartó |
|---|---|---|
| **Next.js 16 + TypeScript** | El **escalón que falta**: JS/TS de verdad. Frontend con backend fino | **Laravel**: no hay usuarios, ni roles, ni auth. **Repetir el stack de Turnia**: no sube el escalón |
| **Leaflet + OpenStreetMap** | Gratis, sin clave, sin límite | Google/Mapbox: una demo pública permanente no puede depender de un contador |
| **Sin base de datos** | Todo se deriva | MySQL: no hay nada que persistir en la v1 |
| **Colores del GTFS** | Cobertura 100% | Los del JSON heredado: **empate técnico, no se sabe quién tiene razón** |
| **El motor no sabe que es un bus** | Para que el **004 multimodal** sea un hito pequeño | ⭐ **Hay un TEST que lo obliga:** falla si aparece la palabra "bus" en `src/core/`. **Tumbó el modelo que yo había aprobado** |
| **Caché de dos pisos** (memoria + disco con cerrojo) | Sin el piso en disco y con 4 workers: **1.020 req/min** contra Avanza, en silencio. Con él: **255, pase lo que pase** | Forzar un solo worker: *"nadie va a recordar mantener ese `1` dentro de dos años"* |
| **V1 enseña, no mide** | El 80% del valor sin el problema duro dentro | ⚠️ **Coste:** el histórico que no captures hoy **no se recupera nunca** |
| **Se clona el vocabulario visual de la referencia** | Antonio la **usa**; nosotros solo la medíamos. **En usabilidad manda quien la usa** | ⛔ Salvo **dos cosas: la promesa de frescura y los chips que mienten**. Eso no es estructura: es verdad |

---

## 5 · ⚠️ Decisiones que se DESHICIERON — no se borran

| Se creyó | Por qué se dejó de creer |
|---|---|
| **"Solo se puede tachar, no repintar"** | ⭐ **Existe `get_stops_list`.** *"El desvío no hay que transcribirlo: hay que pedirlo."* **Lo encontró Antonio mirando 3 postes** |
| **"7 paradas fantasma"** | ⭐ **El oráculo era falso.** La API **no refleja las supresiones**. **Lo dijo Antonio, que conoce la ciudad** |
| **"Esta línea lleva articulados"** | El pliego que lo dice **no está en vigor**, y la dotación **cambia en domingo**. → **Sustituido por un recuento en vivo** |
| **"El tranvía es una ficha aparte del NAP"** | **Falso. Ya está dentro del ZIP** (`agency_id=11`) |
| **"El JSON de flota es oro puro"** | Tenía **62 longitudes mal, todas en el mismo sentido**. Regenerado desde el Anexo 5 |
| **"La referencia pinta buses en el golfo de Guinea"** | ⚠️ **Falso. Lo dije yo leyendo su backend y afirmando sobre su pantalla.** Su mapa sí filtra. **L7** |
| **"Su pantalla de parada está bien resuelta"** | Lo escribió el ejecutor **leyendo el código**. Con Chromium a 360 px, **el primer tiempo caía en y=789** |
| **"Su pantalla de parada está mal, no se clona"** | ⚠️ **Y luego resultó que su usabilidad SÍ es buena.** Los filtros de línea sincronizados son excelentes — **y nadie los había visto porque nadie la había PULSADO** |

---

## 6 · Lo que NO se puede saber — y qué se le dice al usuario

| No se sabe | Qué se dice |
|---|---|
| **Si una parada suprimida sigue suprimida** | **No se adjudica.** *"Avanza la declaró suprimida el 10/01. Su sistema sigue anunciando buses. Confirma en la marquesina."* La contradicción es del operador |
| **Qué expedición es un bus** (`trip_id`) | No se proyecta sobre el trazado. **El bus se pinta donde está** |
| **Todos los buses de una línea** | **"Buses DETECTADOS"**, nunca *"todos"*. Avanza anuncia como mucho los dos siguientes de cada línea y sentido |
| **Si Avanza responde** | ⭐ *"No hemos podido contar los autobuses. **Esto NO significa que no haya: significa que no lo sabemos.**"* |
| **Si el usuario apagó todas las líneas** | ⚠️ *"Has ocultado todas las líneas"* **≠** *"no hay autobuses"*. Confundirlas sería fabricar un **silencio falso en la propia interfaz**, con el motor diciendo la verdad justo debajo |

---

## 7 · Mapa de tandas

| | Tanda | Estado |
|---|---|---|
| — | Auditoría de fuentes (7 fases + diseño) | ✅ |
| **1** | Modelo de datos y capas | ✅ |
| — | Repositorio público | ✅ `github.com/ablanquez/zetabus` |
| **2** | **Capa de datos** (GTFS, flota, puente de identidad) | ✅ 10 contadores de control cuadrados |
| **3** | **Motor vivo** (scrape, caché, barrido, diff de desvíos) | ✅ Cerrado y estresado **antes** de la interfaz |
| — | **Verificación visual** (Playwright) | ✅ El instrumento **se cazó a sí mismo dos veces** |
| **4** | **Pantalla + clon del vocabulario visual** | ✅ **CERRADA** |
| **5** | **El mapa** (Leaflet, buses, trazado) | ⬅️ **SIGUIENTE** |
| **6** | Capa editorial (desvíos, supresiones, contradicción) | ⬜ |
| **7** | Endurecimiento | ⬜ |
| **8** | Despliegue + demo pública | ⬜ |

*(El responsive va dentro de cada tanda — la lección de Turnia se paga una sola vez.)*

---

## 8 · Cabos abiertos

- ⚠️ **DECISIÓN PENDIENTE:** ¿**mapa arriba** (como la referencia) o **llegadas arriba** (como
  ahora)? Si es lo primero, hay que **retirar `flotacion.spec.ts` a mano**. El ejecutor lo dejó
  a decisión de Antonio — **no lo hizo a escondidas**.
- **"Cerca de mí"** — cero toques para el que está en la marquesina. **El mejor candidato de la
  Tanda 5.**
- **Workers de Hostinger** — sin medir. `/api/diag` ya devuelve `process.pid`; faltan 30 curl
  concurrentes en el despliegue.
- **El GTFS caduca el 05/10/2026.** La lógica del aviso está probada con fecha inyectada, pero
  **la banda real no la ha visto nadie**.
- **2 vulnerabilidades moderadas de `postcss`** (transitivas de Next). El fix tocaría la versión
  de Next. → Endurecimiento.
- **El histórico** — si algún día se quiere medir, **el reloj empieza el día que se encienda**.
- **Solo se compararon 2 líneas de 45** contra `get_stops_list`.
- **La sincronía mapa↔lista no está probada contra un mapa**, porque no hay mapa. El estado ya
  está listo; la prueba real es la Tanda 5.

---

## 9 · Lecciones de método nacidas aquí

*(Detalle en `docs/LECCIONES.md`. Van a la guía maestra al cerrar el proyecto.)*

**L1 · Todo extractor necesita un contador de control INDEPENDIENTE.**
El parser del Anexo 5 devolvió **349 de 350 en silencio** por un carácter invisible. Se pilló
contando matrículas (otra señal, otro formato). *Si cuentas con la misma regex con la que
extraes, no has verificado nada.*

**L2 · En cuanto dejas de declarar y empiezas a contar, el problema desaparece.**
*Contar no necesita permiso. Declarar sí.* — Pero: *cambiar declarar por contar no te libra de
decir la verdad sobre tu recuento.*

**L3 · Un dato heredado sin procedencia no se corrige: se sustituye.**
*"El coste real del parche no es que deje errores sin encontrar: es que **deja la causa viva**."*
Y el sesgo es una señal: **62 errores, los 62 en la misma dirección**, no es ruido — tiene una
causa única.

**L7 · Verificar una capa y afirmar sobre otra.**
Cometida cuatro veces en un mes, por los dos. *Leer el código no es usar la app. **Medirla
tampoco. Hay que tocarla.*** Los filtros de línea sincronizados —lo mejor de la referencia— no
los vio nadie hasta que alguien los **pulsó**.

**Y una que sale del fallo real de hoy:**
*Un test que solo pasa cuando la fuente ajena está sana **no es un test: es un test de Avanza**.*

---

## 10 · La frase que resume el proyecto

> **El GTFS oficial da la topología, pero miente cuando hay obras.**
> **La API viva da la ruta real, pero no las supresiones.**
> **El comunicado da las supresiones, pero no caduca.**
> **Y a veces no responde ninguno de los tres.**
>
> **ZetaBus los cruza. Y cuando no sabe algo, LO DICE.**

*(Probado el 13/07/2026: **Avanza se cayó de verdad** a mitad de una tanda. La pantalla dijo
"no hemos podido contar los autobuses; esto NO significa que no haya, significa que no lo
sabemos". **Nadie lo forzó. Pasó.**)*
