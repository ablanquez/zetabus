# Motor de horarios — documento maestro

**Estado:** especificación (Fase 0), **reescrita** tras encontrar la tabla web de Avanza.
**Código de producción escrito:** ninguno. **Fecha:** 2026-07-16.

> Esta versión sustituye a la anterior (que daba el GTFS como fuente única de horario). Las auditorías
> `AUDITORIA_Q1_FUENTE_DE_HORARIO.md` y `AUDITORIA_HORARIO_WEB_AVANZA.md` demostraron que **el GTFS
> miente sobre el alcance** (dice "44 hoy: 0 trips"; la 44 circula) y que **existe una tabla de
> horarios web, day-true y raspable**, que es la autoridad de alcance. El reparto de fuentes cambia de
> raíz. Las decisiones de abajo están **tomadas** (Antonio), no abiertas.

---

## 1 · Principio rector

**Ningún cálculo pregunta POR QUÉ pasa algo. Todo se deriva midiendo QUÉ pasa hoy.**

No se clasifica la causa (calendario, evento, obras, periodo escolar, temporada). Se mide la operación
del día y se enseña. Esto disuelve los casos que nos atascaron (44 terminal estacional, 34 extremo
ausente del GTFS, 23 doble terminal): no hay que razonar la causa, solo leer qué hace hoy.

⚠️ **El instrumento de "qué pasa hoy" es la TABLA WEB DE AVANZA, no el GTFS.** El GTFS resultó no ser
fiable para el alcance (miente sobre si una línea circula hoy y hasta dónde). La tabla web es
day-true: dice, para hoy, si la línea sale, sus primeras y últimas, y **el terminal de cada salida**.
El GTFS queda para el ritmo fino (los tramos de frecuencia), y solo los días que cubre la línea.

> **RITMO grueso + ALCANCE** = tabla web de hoy (fiable, day-true).
> **RITMO fino (tramos de frecuencia)** = GTFS de hoy, cuando cubre la línea, ignorando su alcance.
> El vivo (`tiempos_de_llegada`) es confirmación puntual, no fuente de horario.

---

## 2 · La recogida — origen único de todo

Un proceso **diario** (prod: cron ~03:00, hora tranquila para Avanza; dev: script regenerable a mano
desde Claude Code, con la fecha inyectada) produce, de una pasada, todo lo horneado. **En runtime no
se calcula nada: se lee lo horneado.**

### 2.1 · Fuentes, por orden de autoridad

| # | Fuente | Qué aporta | Naturaleza |
|---|---|---|---|
| **1** | **Tabla web de Avanza** `POST /lineas-y-horarios/?selectLinea={L}&selectSentido={-1\|-2}` body `times-date=YYYY-MM-DD` | **¿circula hoy?, primeras + últimas, TERMINAL por salida (col. "Hasta" = alcance), frecuencia media** (un nº por tipo de día) | server-rendered, day-true. ⚠️ ventana **solo hacia delante** (~hoy … +2-3 semanas); **no cubre búhos** |
| **2** | **Prosa "Información adicional"** (mismo HTML) | avisos y **terminales futuros** que la tabla no alcanza (ej. 44: terminal escolar Campus Río Ebro) | prosa irregular, line-dependent → **cita literal, sin razonar** |
| **3** | **GTFS** (`stop_times` resuelto a hoy) | **solo los TRAMOS de frecuencia** del centro (pieza 4). **Se ignora su alcance y su terminal.** | estructurado; **no fiable para "¿circula?" ni alcance** |
| **4** | **`get_stops_list`** | topología y nombres (ruta máxima), base del diff de desvíos | estática, no day-aware |
| **4** | **Vivo `tiempos_de_llegada`** | confirmación puntual (llegadas en tiempo real) | live; no es horario |

⚠️ **La tabla web y `get_stops_list` comparten `selectSentido` (-1/-2).** Se casan de forma nativa
(mismo parámetro de Avanza). El GTFS es el único que necesita el puente `-1→dir0 / -2→dir1` (medido,
solape ~85-93 %), y solo para la pieza 4.

⚠️ **Detalles de raspado (medidos):** las filas vienen **×4** en el HTML (copias responsive) → **dedup
por (hora, desde, hasta)**. El HTML está **malformado** (`<td>…</th>`) → parser tolerante
(node-html-parser, como en `get_stops_list`), nunca regex a pelo. El terminal ("Hasta") es **texto
libre en mayúsculas y abreviado** ("PABLO R. PICASSO"), **sin poste ni data-attr** → hay que casarlo a
un poste (ver §7-QN1).

### 2.2 · Qué precalcula y hornea (por línea × sentido, para HOY)

Forma propuesta (se fija en la Fase 1):

```
HorarioDeHoy {
  fecha: '20260716'
  circula: boolean                 // ¿la tabla web trae filas?  (44 hoy: sí; el GTFS decía que no)
  primeras: SalidaWeb[]            // { hora, desde, hasta, terminalPoste? }   (de la web)
  ultimas:  SalidaWeb[]            //   idem  (la web YA delimita primeras/últimas; nº variable)
  frecuenciaMedia: { laborable, sabado, festivo }   // minutos, un nº por tipo de día (de la web)
  tramos?:  BloqueCadencia[]       // del GTFS SI cubre la línea hoy; si no, AUSENTE (no se inventa)
  prosa?:   string                 // "Información adicional", cita literal (de la web)
  desvio:   Veredicto              // pieza 1: get_stops_list vs topología GTFS
  paradas:  NotaDeParada[]         // piezas 2/3: derivadas del terminal-por-salida + get_stops_list
}
```

⚠️ **El disparador de producción (cron en Hostinger, nº de workers) es despliegue, no diseño.** Este
documento fija QUÉ se recoge y QUÉ queda precalculado. En dev, la pasada es determinista (misma fecha
⇒ mismo resultado; la fecha se inyecta, no se lee del reloj).

⚠️ **Esto unifica las peticiones dispersas de build** (rutas, nombres) en **una recogida diaria**, que
ahora incluye además la tabla web.

---

## 3 · Las cinco piezas (con la fuente CORREGIDA)

### Pieza 1 · DESVÍOS (obras) — **existe, se conserva, se reencuadra** · fuente: `get_stops_list` vs GTFS

- **Responde:** ¿por dónde va?
- **Fuente:** SIN CAMBIO — cruce ruta teórica (GTFS `official.stops`) vs ruta real (`get_stops_list`).
  Ya en `engine/desvios.ts`. **Freno de mano** (>50 % caídas ⇒ "no lo sé") se conserva.
- ⚠️ **Reencuadre obligatorio (la distinción que hoy se confunde):**
  - **DESVÍO-INTERIOR:** se sale y **reengancha**, **mismo terminal**. → desvío de obras de verdad.
  - **DIFERENCIA-EN-EL-EXTREMO:** prefijo común y **bifurca al final** a terminal distinto, **sin
    reenganchar**. → **NO es desvío**: es alcance (piezas 2/3). Hoy se mezcla y por eso la 34 tacha
    Cementerio (ver `AUDITORIA_SERVICIOS_PROLONGADOS.md`).
  - **Criterio:** tras alinear por prefijo, ¿hay reenganche y coincide el terminal? → interior. ¿No
    reengancha y difieren los terminales? → extremo (piezas 2/3, no pieza 1).

### Pieza 2 · PROLONGACIÓN DE RECORRIDO (espacio) — **nuevo** · fuente: **WEB** (terminal por salida)

- **Responde:** ¿hasta dónde llega hoy?
- **Fuente:** el **terminal de las salidas de la web** (col. "Hasta"). El alcance de hoy = el conjunto
  de terminales que la web lista hoy. (44 hoy: solo **Pablo Ruiz Picasso**.)
- **Algoritmo:**
  1. Terminales de hoy = los "Hasta" distintos de la tabla web.
  2. Casar cada terminal a su **poste** (fuzzy contra los extremos del sentido de `get_stops_list`;
     §7-QN1).
  3. Las paradas de `get_stops_list` **más allá** del terminal de hoy → nota **"servicio no
     prolongado"**.
- ⚠️ **Funciona aunque el extremo no exista en el GTFS (caso 34).** El terminal sale de la **web**, no
  del GTFS. Para 34, la web dirá "Cementerio" y `get_stops_list` lista 649→617 más allá → esas llevan
  "servicio no prolongado". No se necesita que el GTFS conozca Parque de Atracciones.
- **Dónde se muestra:** nota por parada en `Itinerario.tsx`.

### Pieza 3 · PROLONGACIÓN HORARIA (tiempo) — **nuevo** · fuente: **WEB** (salidas con su terminal) + prosa

- **Responde:** ¿hasta cuándo llega a cada terminal?
- **Fuente:** las salidas de la web con su "Hasta". La **última salida** hacia cada terminal da hasta
  qué hora ese terminal está vigente. Cuando un día tiene dos terminales (escolar: Campus Río Ebro
  hasta 20:40, luego Pablo), el "Hasta" por salida lo da directo.
  ⚠️ **Hoy no hay dos terminales** (verano, todo Pablo): la prolongación horaria de la 44 no se
  observa en tabla. El **detalle futuro** (Campus Río Ebro hasta las 20:40 en escolar) **solo vive en
  la PROSA** (§7-QC), que se cita literal, no se calcula.
- **Nota por parada:** para las paradas del tramo con terminal variable → **"servicio prolongado hasta
  las HH:MM"** (última salida de hoy que alcanza ese terminal); ninguna hoy → "no prolongado" (pieza 2).
- ⭐ **Unifica 23/34/44 bajo una regla:** por terminal, hasta qué hora lo alcanza la operación de hoy.

### Pieza 4 · FRECUENCIAS (tramos) — **nuevo** · fuente: **GTFS** (secundaria)

- **Responde:** ¿cada cuánto pasa, por tramos?
- **Fuente:** GTFS `stop_times` de hoy — headways de las salidas del sentido → **bloques de cadencia
  constante**. La web solo da un **promedio** ("cada 15 min"); los **tramos** ("cada 6 en punta, cada
  15 en valle") **solo salen del GTFS**.
- ⚠️ **DECISIÓN FIRME — los días que el GTFS deja caer la línea (44 hoy: 0 trips): NO hay tramos.** Se
  enseña **solo la frecuencia media de la web** ("cada 15 min de media"), sin desglose. **NO se
  aproxima con un día equivalente.** No se inventa una precisión que ese día no existe.
- **Algoritmo (propuesto, calibración en §7-Q3):** mediana móvil de headways; **banda proporcional**
  `tol = max(2, round(mediana × 0.25))` min; **sostenimiento** N=3 headways fuera de banda para abrir
  régimen (un pico aislado no parte el bloque); cada bloque = **franja [desde, hasta] + rango [min,
  max]** (honesto, no promedio).
- ⚠️ **La trampa, con dato real (16 jul):** en la 35, `06:39 -1- 06:40` (dos buses casi a la vez) es
  **ruido**, no un régimen "cada 1"; la regla de sostenimiento lo absorbe. La 34 valida el caso bueno:
  bloque `08:30–20:14 · cada 8–9 min` limpio 12 h. **No hay corte garantizado en líneas raras**
  (búhos, Ci): §7-Q3.

### Pieza 5 · TABLA DE HOY — **nuevo; reemplaza el bloque de terminal** · fuente: **WEB**

- **Responde:** las salidas concretas de hoy, sin prometer horario de paso.
- **Fuente:** **directamente la tabla web** — ya trae **primeras + últimas** delimitadas, day-true,
  con **terminal por salida**. El nº de filas **no es fijo** (44 laborable: 8+4; sábado: 3). El centro
  no se lista (lo cubre la pieza 4, o la frecuencia media).
- **PRIMERAS:** las de la web. ⚠️ **NO se marca el origen. SIN EXCEPCIÓN.** (Entierra el índice "1".)
- **ÚLTIMAS:** las de la web.
  - **"*" + "no se realiza el servicio completo"** solo en las que **no llegan al TERMINAL VIGENTE A
    SU HORA**.
- ⚠️⚠️ **Terminal vigente DINÁMICO — sale del "Hasta" de la web, no del GTFS:**
  - **Terminal vigente a la hora `t`** = el terminal **más lejano** entre las salidas de la web que
    salen a `t` o después. (Ventana exacta: §7-Q4.)
  - Una salida lleva "*" solo si su "Hasta" queda corto respecto al vigente a su hora. **Ejemplo (44,
    día escolar):** si la última a Campus Río Ebro es 20:40, a partir de ahí el vigente es Pablo Ruiz
    Picasso; un servicio de 21:30 a Pablo Ruiz Picasso **hace su recorrido completo de esa hora → NO
    lleva "*"**. El acortamiento es esperado (lo dice la pieza 2/3), no anómalo. **Hoy (verano) todo es
    Pablo → ningún "*".**
- **Dónde se muestra:** reemplaza `Terminal.tsx`.

⚠️ **Ya no hay "un solo criterio de estabilización".** El viejo diseño calculaba los bordes
primeras/centro/últimas con la detección de bloques del GTFS. Ahora **la web ya da el corte** (sus
primeras/últimas). Los tramos del GTFS (pieza 4) son un enriquecimiento **independiente** del centro;
no definen los bordes de la tabla. Es más simple, y desacopla las dos cosas.

---

## 4 · Los tres casos que TIENEN que funcionar

⚠️ **No comparten fecha.** Hoy (16 jul) la web sirve 34, 35, 23, 44 (44 con terminal Pablo); el GTFS
solo cubre 34/35 (deja caer 44 y 23). Cada caso se lee de la **web** el día que aplique.

### Caso 44 — el que rompió el GTFS

- **Dato (medido, hoy):** **web** 44 −1 = 8 primeras (05:15→07:28) + 4 últimas (21:30→22:42), **todas
  Hasta Pablo Ruiz Picasso**; freq media laborables 15. **GTFS: 0 trips** (miente). **Vivo:** 44 →
  Miraflores, sí circula.
- **Resultado esperado:** `circula = true` (de la web, no del GTFS). Tabla de hoy con esas primeras/
  últimas, terminal Pablo Ruiz Picasso. **Sin tramos** (el GTFS no cubre hoy) → solo "cada 15 de
  media". Paradas más allá de Pablo Ruiz Picasso hacia Campus Río Ebro → **"servicio no prolongado"**.
  El terminal escolar (Campus Río Ebro, primera 7:14) → **cita literal de la prosa**, no afirmado como
  horario.

### Caso 34 — no prolongado + extremo ausente del GTFS

- **Dato:** **web** da terminal **Cementerio** hoy (freq media laborables 9). `get_stops_list` extiende
  a 649→617 (**Parque de Atracciones, ausente del GTFS**). **GTFS** cubre hoy (111 trips) → **sí hay
  tramos** (bloque 8–9 min).
- **Resultado esperado:** itinerario hasta **Cementerio**; las paradas 649→617 → **"servicio no
  prolongado"** (no "provisional·desvío"). Tabla de hoy con primeras/últimas de la web; **tramos del
  GTFS** en el centro. Cementerio **no se tacha** (reencuadre pieza 1).

### Caso 23 — doble terminal por el tiempo

- **Dato:** **web** dará las salidas con su "Hasta" (Noria Siria pleno / Clara Campoamor corto).
- **Resultado esperado:** paradas entre Clara Campoamor y Noria Siria → **"servicio prolongado hasta
  las HH:MM"** (última salida de la web a Noria Siria). En la tabla, una salida a Clara Campoamor lleva
  "*" solo si a su hora el vigente sigue siendo Noria Siria. Ni "provisional·desvío" ni "no llega".

---

## 5 · Qué se jubila y qué se conserva

### Jubilar — **borrar, no dejar muerto**

| Qué | Dónde |
|---|---|
| Bloque "Funcionamiento de terminal" por tipo de día | `src/components/Terminal.tsx` (todo) |
| Índices 1/2 ("no viene desde principio" / "no llega a final") y su render/leyenda | `Terminal.tsx` |
| **Todo `calcularTerminales`**: primeras/últimas por GTFS, cabecera **modal**, `noViene/noLlega`, fechas representativas (3 tipos de día) | `src/sources/gtfs-nap/terminal.ts` (el grueso del fichero) |
| Tipo `SalidaDeTerminal` (`noViene/noLlega`) y re-exports | `terminal.ts`, `engine/topologia.ts` |
| Tests del aparato viejo | `tests/motor-vivo/parciales-de-terminal.test.ts`; partes de `cruces.test.ts` y `e2e/recorrido-y-terminal.spec.ts` que asserten índices |

⚠️ **El GTFS deja de ser la fuente del horario.** De `terminal.ts` **solo se recicla la idea** de
"servicios activos en una fecha", y **únicamente** para el nuevo módulo de **tramos** (pieza 4), que
lee `stop_times` de hoy. La maquinaria de "fechas representativas" y de cabeceras se jubila entera.

### Conservar

- **Pieza 1** (`engine/desvios.ts`, freno de mano) — reencuadrada (extremo vs interior).
- **`Itinerario.tsx`** — se conserva; se le añaden las notas por parada (piezas 2/3); se le quita el
  `provisional·desvío` mal aplicado al extremo.
- **Capa de nombres** (`sources/avanza/nombres.ts`, `aplicar-nombres.ts`, `recorrido.ts`) — integrada
  en la recogida diaria.
- **`transporte.ts`** (cuello único a Avanza), cachés, `get_stops_list`, el vivo.
- Todo lo demás de la vista de línea: itinerario, transbordos, búhos, chips, rumbo.

---

## 6 · Plan de fases (reordenado: la WEB primero, el GTFS al final)

- **Fase 1 · Recogida y parseo de la tabla web de hoy.**
  `POST` a `/lineas-y-horarios/` con `times-date`; dedup ×4; parsear primeras/últimas (hora, desde,
  hasta), frecuencia media y prosa; **casar el terminal ("Hasta") a un poste** (§7-QN1). Hornear
  `HorarioDeHoy`. **Verificable aislado:** dump de 44/34/23 = lo medido en `AUDITORIA_HORARIO_WEB_AVANZA.md`.
  *Depende de:* nada. **Es la nueva base** (antes era "resolver GTFS a hoy").

- **Fase 2 · Tabla de hoy (pieza 5) desde la web, sin "*", + prosa como cita.**
  Render que reemplaza `Terminal.tsx`: primeras/últimas de la web, terminal por salida; bloque de
  frecuencia media; "Información adicional" como cita literal marcada. **Verificable aislado:** coincide
  con la tabla de Avanza a ojo. *Depende de:* Fase 1.

- **Fase 3 · Prolongación (piezas 2 y 3) + reencuadre de la pieza 1.**
  Terminal-por-salida (web) + `get_stops_list` → notas "servicio no prolongado" / "prolongado hasta
  HH:MM" en el itinerario; separar desvío-interior de diferencia-en-extremo en `desvios.ts` (34 deja de
  tachar Cementerio). **Verificable aislado:** 34 (no prolongado), 23 (prolongado hasta), 44 (Pablo hoy;
  Campus solo en prosa). *Depende de:* Fase 1.

- **Fase 4 · El "*" dinámico (cierre de la pieza 5).**
  Terminal vigente a cada hora desde el "Hasta" de la web; "*" solo en las últimas que se quedan cortas.
  **Verificable aislado:** hoy la 44 no lleva ningún "*" (todo Pablo). *Depende de:* Fase 3.

- **Fase 5 · Tramos de frecuencia (pieza 4) desde el GTFS.**
  Detección de bloques sobre `stop_times` de hoy, **solo los días que el GTFS cubre la línea**; si no,
  se queda la frecuencia media de la web. **Verificable aislado:** 34/35 (bloque 8–9; ruido 06:39/06:40
  no parte). *Depende de:* Fase 1 (no de 2–4). Es **el único trozo de GTFS**.

- **Fase 6 · Jubilación y limpieza.**
  Borrar lo de §5 (no antes: mientras se construye, el viejo bloque es la red). Tests viejos fuera,
  nuevos dentro. *Depende de:* Fases 2–5 en verde.

---

## 7 · Preguntas abiertas

**Resueltas por el nuevo reparto (ya NO son preguntas):** la vieja **Q1** (fuente de horario → la web,
day-true), la vieja **Q5** (sin servicio → lo dice la web: `circula`), la vieja **Q6** (surface prosa →
sí, cita literal). El **alcance** ya no necesita muleta "avisar/vivo".

**Siguen vivas / nuevas:**

- **Q3 · Calibración de la pieza 4 (banda 0.25, sostenimiento N=3).** Propuesta con 34/35 (frecuencia
  media, alta densidad). **No probada** en búhos (pocas salidas, sin centro), circulares, C1. ¿Aguanta
  un cambio real "cada 20 → cada 30"? **Barrer la red antes de fijar números.** Puede no haber corte
  limpio en líneas raras.

- **Q4 · Ventana del "terminal vigente a la hora t".** ¿"alguna salida a t o después", o dentro de una
  ventana (±30 min)? Afecta a qué lleva "*". Ahora se calcula sobre el "Hasta" de la web. Sin decidir.

- **QN1 · Casar el terminal de la web a un poste.** El "Hasta" es **texto libre, mayúsculas,
  abreviado** ("PABLO R. PICASSO"), **sin poste**. Las piezas 2/3 necesitan el poste para anotar el
  itinerario. Propuesta: fuzzy-match contra los **extremos del sentido** de `get_stops_list` (conjunto
  pequeño: 1-de-pocos). ¿Robusto ante abreviaturas/acentos ("ESTACION" sin tilde, "R." por "Ruiz")?
  **Riesgo de casado; hay que probarlo línea a línea.**

- **QN2 · Búhos (N1–N7): la web no los trae** (0 filas). ¿De dónde sale su tabla de hoy? ¿GTFS (con su
  alcance no fiable) o vivo? ¿O se aceptan sin tabla de primeras/últimas? **Sin decidir.**

- **QN3 · Casado de sentido web/GTFS para la pieza 4.** La web y `get_stops_list` comparten
  `selectSentido` (-1/-2) → nativo. Pero cruzar la pieza 4 (GTFS, `direction_id`) con el resto usa el
  puente `-1→dir0 / -2→dir1` (solape ~85-93 %, no 100 %). **Verificar que alinea línea a línea** para
  no meter tramos del sentido equivocado. (Antes era la Q8; ahora importa **solo** para la pieza 4.)

- **QC · ⚠️ El alcance FUTURO no es raspable de tabla, solo de prosa.** La ventana de la web es corta
  (~hoy … +2-3 semanas); el periodo escolar queda fuera. El terminal largo de la 44 (Campus Río Ebro)
  **solo vive en la "Información adicional"**, que se cita pero **no se razona**. Consecuencia: el motor
  **no puede afirmar** el terminal de una fecha futura; solo repetir lo que dice Avanza. **Documentado
  como límite, no como bug.** (Fleco pendiente de confirmar con F12: ¿el date-picker de la UI alcanza
  septiembre y muestra Campus Río Ebro en tabla, o también viene vacío? Ver `AUDITORIA_HORARIO_WEB_AVANZA.md` §4.)

- **Q2 (revisada) · Definición del "tramo prolongable".** Ahora el terminal de hoy lo da la web; las
  paradas "más allá" salen de ordenar `get_stops_list`. Falta el criterio de **hasta dónde** marcar (todo
  lo posterior al terminal, o solo el tramo entre terminales conocidos), sin marcar media línea por un
  refuerzo. Relacionado con el freno de mano de la pieza 1. **Menor, pero sin cerrar.**

- **QN4 · Robustez del raspado.** HTML malformado (`<td>…</th>`), filas ×4, clases estables hoy pero de
  un tema WordPress que puede cambiar. ¿Cuánto blindaje (contadores de control, "freno de mano" si la
  tabla viene rara) igual que en `desvios.ts`? **A definir en la Fase 1.**
