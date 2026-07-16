# Motor de horarios — documento maestro

**Estado:** especificación (Fase 0). **Código de producción escrito:** ninguno.
**Fecha de redacción:** 2026-07-16. **Autor de la decisión de alcance:** Antonio.

Este documento se escribe **antes** de implementar. Las fases posteriores se construyen contra él.
Si al implementar el dato real contradice lo aquí escrito, se corrige el documento —no se fuerza el
código para que cuadre—.

> ⚠️ **Correcciones de premisa detectadas al redactar (detalle en §7):**
> 1. **Avanza no expone un horario diario.** Su API (`admin-ajax.php`) solo tiene cuatro acciones:
>    `get_stops_list`, `tiempos_de_llegada`, `get_direction_list`, `get_alteraciones_servicio`.
>    Ninguna acepta fecha. **El "horario completo del día" solo existe en el GTFS**, resuelto a la
>    fecha de hoy. La recogida diaria de Avanza aporta la RUTA y los avisos, no el horario.
> 2. **Hoy (16 jul) ni la 23 ni la 44 circulan.** Los tres casos de prueba (23/34/44) no comparten
>    fecha. Cada uno se valida en un día en que su línea opere.
> Ninguna de las dos rompe el diseño, pero cambian de dónde sale cada pieza. Van marcadas en el texto.

---

## 1 · Principio rector

**Ningún cálculo pregunta POR QUÉ pasa algo. Todo se deriva midiendo QUÉ pasa hoy en el horario del
día.**

No se clasifica la causa (calendario, evento, obras, periodo escolar, temporada de parque). Se mide
la operación del día y se enseña. Esto es lo que disuelve los casos que nos han tenido atascados:

- **44 (terminal calendar-gated):** no preguntamos "¿qué días llega a Campus Río Ebro?". Miramos los
  trips de hoy: si hoy ninguno llega, hoy no se prolonga. Fin.
- **34 (extremo ausente del GTFS):** no necesitamos que la topología teórica conozca Parque de
  Atracciones. El horario de hoy dice hasta qué parada opera; lo de más allá, no prolongado.
- **23 (doble terminal):** no preguntamos "¿a qué horas acaba en cada sitio?". Cada parada del tramo
  mira qué trips de hoy la alcanzan y hasta qué hora.

⚠️ **Matiz que hay que decir en voz alta.** El instrumento con el que "medimos qué pasa hoy" es el
**GTFS resuelto a la fecha de hoy** (los `service_id` activos hoy, con sus `stop_times`). Es la única
fuente estructurada con trips × paradas × horas. El principio se sostiene **si y solo si el
GTFS-de-hoy coincide con la operación real de hoy**. Dónde eso puede fallar (34 sin la parada; 44 sin
servicio hoy) está en §7. No es un detalle: es el supuesto sobre el que descansa todo lo demás.

---

## 2 · La recogida — origen único de todo

Un proceso **diario** (prod: cron ~03:00, hora tranquila para Avanza; dev: script regenerable a mano
desde Claude Code) produce, **de una sola pasada**, todo lo que el runtime necesita. **En runtime no
se calcula nada: se lee lo horneado.**

### 2.1 · Qué recoge, y de qué fuente

| Dato | Fuente | Naturaleza |
|---|---|---|
| **Horario del día** (todos los trips: horas + secuencia de paradas/postes) | **GTFS** `stop_times`/`trips`/`calendar_dates`, resuelto a la fecha de hoy | estructurado, con horas. **Única fuente de horario.** |
| **Ruta real de hoy** (secuencia de postes con desvío ya aplicado) | Avanza `get_stops_list` (por línea y sentido) | ⚠️ **estática, sin fecha** — es la ruta máxima, no la operativa de hoy (ver §3, pieza 1/2) |
| **Nombres de parada** de Avanza | se derivan de `get_stops_list` (trae `poste - nombre`) | unifica la capa de nombres que hoy se pide aparte |
| **Avisos de alteración** (texto humano) | Avanza `get_alteraciones_servicio` (por línea) | pasarela opcional, **no** carga lógica (ver §7-Q6) |

⚠️ **Esto unifica las peticiones dispersas de build.** Hoy se piden en momentos distintos: rutas
(desvíos), nombres, KML. Se juntan en **una recogida diaria**. El GTFS se refresca en la misma pasada
(`gtfs:fetch`) y se resuelve a hoy.

⚠️ **El disparador de producción (cron en Hostinger, nº de workers) es despliegue, no diseño.** Este
documento fija QUÉ se recoge y QUÉ queda precalculado. En dev, la pasada se lanza a mano y es
determinista (misma fecha ⇒ mismo resultado; la fecha se inyecta, no se lee del reloj — como ya hace
`calcularTerminales(desde)`).

### 2.2 · Qué precalcula y hornea (por línea × sentido, para HOY)

Forma propuesta del dato horneado (borrador, se fija en la fase de recogida):

```
HorarioDeHoy {
  fecha: '20260716'
  sinServicio: boolean            // hoy esta línea/sentido no opera (44 y 23 hoy)
  primeras:  Salida[]             // arranque irregular (pieza 5)
  frecuencia: BloqueCadencia[]    // centro (pieza 4): {desde, hasta, minMin, maxMin}
  ultimas:   Salida[]             // cierre irregular (pieza 5); Salida.incompleta? (el "*")
  paradas:   NotaDeParada[]       // por poste del tramo prolongable (piezas 2 y 3):
                                  //   { poste, prolongadoHasta: 'HH:MM' | null }
                                  //   null = servicio no prolongado (pieza 2)
  desvio:    Veredicto            // pieza 1, reencuadrada (extremo vs interior)
}
```

---

## 3 · Las cinco piezas

Todas salen del **mismo esnifado**: horario-de-hoy (GTFS) + ruta-real (`get_stops_list`).

### Pieza 1 · DESVÍOS (obras) — **existe, se conserva, se reencuadra**

- **Responde:** ¿por dónde va?
- **Fuente:** cruce ruta teórica (GTFS `official.stops`) vs ruta real (`get_stops_list`). Ya
  implementado en `engine/desvios.ts` (`compararRecorrido`): `fuera` (cae) + `hacia` (provisional).
- **Algoritmo:** el existente. **Freno de mano** (>50 % de paradas caídas ⇒ "no lo sé") se conserva.
- **Dónde se muestra:** `Itinerario.tsx`, como hoy.
- ⚠️ **Reencuadre obligatorio — la distinción que hoy se confunde:**
  - **DESVÍO-INTERIOR:** el bus se sale y **reengancha**; **mismo terminal** en ambas rutas. → esto SÍ
    es un desvío de obras. `provisional·desvío` / `hoy no pasa` están bien.
  - **DIFERENCIA-EN-EL-EXTREMO:** las rutas comparten prefijo y **bifurcan al final** a **terminales
    distintos**, **sin reenganchar**. → esto **NO es un desvío**: es la pieza 2/3. Hoy se mezcla y por
    eso la 34 pinta Cementerio como "no pasa" y el tramo a Parque de Atracciones como
    "provisional·desvío" (ver `docs/AUDITORIA_SERVICIOS_PROLONGADOS.md`).
  - **Criterio de separación (medible):** tras alinear por prefijo común, ¿hay **reenganche** (paradas
    comunes después de la divergencia) y **coincide el terminal**? → interior. ¿No reengancha y los
    terminales difieren? → extremo (piezas 2/3, no pieza 1).
- **Casos límite:** obras que además **truncan** el final (interior + extremo a la vez); ruta real
  ilegible/vacía (ya cubierto: "indeterminado", no se tacha nada).

### Pieza 2 · PROLONGACIÓN DE RECORRIDO (espacio) — **nuevo**

- **Responde:** ¿hasta dónde llega hoy?
- **Fuente:** horario-de-hoy (para el extremo operativo real) + `get_stops_list` (para saber qué
  paradas existen más allá).
- **Algoritmo:**
  1. **Extremo operativo de hoy** = la parada final a la que llega el **máximo número de trips de
     hoy** (moda de la última parada del día). Análogo para el arranque.
  2. Las paradas que **existen en la ruta máxima** (`get_stops_list`) pero que **hoy no alcanza ningún
     trip** (están "más allá" del extremo operativo) → nota **"servicio no prolongado"** en esas
     paradas del itinerario.
- **Dónde se muestra:** nota por parada en `Itinerario.tsx` (sustituye al falso `provisional·desvío`
  del caso 34).
- ⚠️ **Funciona aunque el extremo no exista en el GTFS.** El extremo operativo sale del **horario**
  (hasta qué parada llegan los trips); las paradas de más allá salen de **`get_stops_list`** (que sí
  las nombra, aunque el GTFS no las tenga). Para 34, el horario dice "llega a Cementerio" y
  `get_stops_list` dice "existen 649→617 más allá" ⇒ esas llevan "servicio no prolongado". **No se
  necesita que la topología teórica conozca Parque de Atracciones.**
- **Casos límite:** ⚠️ ver §7-Q2 — el "extremo operativo por moda" hereda el fenómeno de la pieza 3;
  con doble terminal (23) o corte nocturno (44) la moda sola no basta: se subsume en la pieza 3.

### Pieza 3 · PROLONGACIÓN HORARIA (tiempo) — **nuevo; unifica 23, 34, 44**

- **Responde:** ¿hasta cuándo llega a cada punto del tramo prolongable?
- **Fuente:** horario-de-hoy (por parada: los trips que la tocan y a qué hora).
- **Algoritmo:** para cada parada del **tramo prolongable** (las que no todos los trips alcanzan),
  mirar los trips de hoy que la tocan:
  - **ninguno hoy** → "servicio no prolongado" (es el caso degenerado de la pieza 2).
  - **hasta cierta hora** → **"servicio prolongado hasta las HH:MM"** (la hora del **último** trip de
    hoy que la alcanza).
  - **todos** → parada normal, sin nota.
- **Dónde se muestra:** nota por parada en `Itinerario.tsx`.
- ⭐ **Esta es la lógica única que unifica los tres casos.** No hay tres reglas: hay **una** —"por
  parada, hasta qué hora la alcanza la operación de hoy"—. 23 (mitad de trips acaban antes en Clara
  Campoamor: las paradas hacia Noria Siria llevan "prolongado hasta HH:MM"), 34 (Parque de
  Atracciones: ninguno hoy → no prolongado), 44 (Campus Río Ebro hasta cierta hora, luego no) caen
  todos bajo ella.
- **Casos límite:** definir "tramo prolongable" (§7-Q2); paradas absueltas por desvío-interior no
  cuentan como no-prolongadas.

### Pieza 4 · FRECUENCIAS — **nuevo**

- **Responde:** ¿cada cuánto pasa?
- **Fuente:** horario-de-hoy — las horas de salida ordenadas del sentido; sus **headways**
  (diferencias entre salidas consecutivas).
- **Algoritmo (propuesto, parámetros afinables en §7-Q3):** segmentar el día en **bloques de cadencia
  constante**:
  1. Recorrer los headways en orden. Mantener el headway representativo del bloque actual = **mediana
     móvil** de los headways del bloque.
  2. **Banda de tolerancia PROPORCIONAL:** un headway `h` pertenece al bloque si
     `|h − mediana| ≤ tol(mediana)`, con `tol = max(2, round(mediana × 0.25))` min. Así "cada 8"
     tolera 6–10; "cada 16" tolera 12–20; "cada 33" tolera ±8. **El umbral escala con la frecuencia.**
  3. **Regla de sostenimiento:** para cerrar el bloque y abrir otro régimen hacen falta **N=3**
     headways consecutivos fuera de banda en la misma dirección. Un pico aislado **no** parte el
     bloque.
  4. Cada bloque se reporta como **franja [desde, hasta] + rango [min, max] observado**, no promedio:
     "07:00–09:30 · cada 6–7 min", nunca "cada 6".
- **Dónde se muestra:** bloque nuevo en la vista de línea, encima o junto a la tabla (pieza 5).
- ⚠️ **La trampa, con dato real (medido hoy, 16 jul):**
  - **35 dir0**, arranque: `05:00 -33- 05:33 -33- 06:06 -33-` … luego `06:39 **-1-** 06:40 -16- 06:56`.
    Ese **headway de 1 min** (dos buses casi a la vez) es **ruido**: NO debe abrir un bloque "cada 1
    min". La regla de sostenimiento (N=3) lo absorbe. **Este caso es el test de la pieza 4.**
  - **34 dir0**, cierre: `…23:00 -16- 23:16 **-46-** 00:02`. El 46 final es un rezagado solitario, no
    un régimen "cada 46". Igual: no abre bloque.
  - **34 dir0** valida el caso bueno: bloque central `08:30–20:14 · cada 8–9 min` limpio durante 12 h.
- ⚠️ **Reporta la miga:** distinguir "cambio de régimen" de "ruido" es el corazón del algoritmo. La
  banda proporcional + el sostenimiento son una **propuesta**; su calibración (¿0.25? ¿N=3?) es una
  pregunta abierta (§7-Q3). **No hay un corte matemáticamente limpio garantizado**; hay una heurística
  razonable que el dato de hoy respalda, pero que hay que probar contra líneas raras (búhos, Ci, C1).

### Pieza 5 · TABLA DE HORARIOS DE HOY — **nuevo; reemplaza el bloque de terminal**

- **Responde:** las salidas concretas de hoy, sin prometer un horario de paso.
- **Fuente:** horario-de-hoy + los bloques de la pieza 4 (el **mismo** cálculo de estabilización).
- **SOLO HOY.** Sin Laborables/Sábados/Festivos. El nº de filas **no es fijo**: lo define la
  frecuencia.
  - **PRIMERAS:** desde la primera salida del día **hasta que el horario se estabiliza** (arranca el
    primer bloque agrupable de la pieza 4). Son las salidas irregulares de arranque.
    ⚠️ **En primeras NO se marca el origen. SIN EXCEPCIÓN.** Da igual si el bus arranca a mitad.
    (Esto entierra los índices "1/no viene desde principio".)
  - **CENTRO:** no se lista. Lo cubre el bloque de frecuencias (pieza 4).
  - **ÚLTIMAS:** desde que el horario **se desestabiliza** (acaba el último bloque agrupable) hasta el
    final. Salidas irregulares de cierre.
    - **"*" + "no se realiza el servicio completo"** SOLO en las que **no llegan al TERMINAL VIGENTE A
      SU HORA**.
- ⚠️⚠️ **El punto más delicado — el terminal de referencia del "*" es DINÁMICO:**
  - **Terminal vigente a la hora `t`** = el terminal **más lejano** que alcanza **algún trip que sale a
    la hora `t` o después**. (Definición propuesta; la ventana exacta es §7-Q4.)
  - Una salida de últimas lleva "*" **solo si su terminal queda corto respecto al terminal vigente a su
    hora** —no respecto a un final teórico fijo—.
  - **Ejemplo (44):** si el último trip a Campus Río Ebro es a las 22:15, el terminal vigente a partir
    de 22:16 es Pablo Ruiz Picasso. Un trip de 22:40 a Pablo Ruiz Picasso **hace su recorrido completo
    de esa hora → NO lleva "*"**. El acortamiento nocturno es **comportamiento esperado** (lo dicen las
    piezas 2/3 en las paradas), **no** una excepción de la tabla. El "*" queda para lo **genuinamente
    anómalo** (un trip que se queda corto cuando sus contemporáneos llegan más lejos).
- ⚠️ **Un solo criterio de estabilización.** El corte primeras/centro/últimas usa **exactamente** la
  detección de bloques de la pieza 4. No hay un segundo criterio. Una detección define frecuencias Y
  bordes de la tabla.
- **Dónde se muestra:** reemplaza `Terminal.tsx`.
- **Casos límite:** día sin servicio (44/23 hoy) → `sinServicio` (§7-Q5); línea de muy pocas salidas
  (búho) → puede no haber centro agrupable: todo es "primeras+últimas" (§7-Q3).

---

## 4 · Los tres casos que TIENEN que funcionar

⚠️ **No comparten fecha:** hoy (16 jul) circulan 34 y 35, **no** 23 ni 44. Cada caso se valida en un
día en que su línea opere. La lógica es la misma cualquier día (se mide ese día).

### Caso 23 — prolongación horaria (doble terminal por el tiempo)

- **Dato (medido, pooled):** ~54 % de los trips de un sentido acaban en Noria Siria (terminal pleno),
  ~46 % antes, en Clara Campoamor. Simétrico en el otro sentido por el origen.
- **Resultado esperado:** las paradas **entre Clara Campoamor y Noria Siria** llevan **"servicio
  prolongado hasta las HH:MM"** (hora del último trip de hoy que las alcanza). Ni "provisional·desvío"
  ni "no llega". La tabla no marca "*" a los trips que acaban en Clara Campoamor **si a su hora el
  terminal vigente es Clara Campoamor**; sí, si a su hora aún hay trips llegando a Noria Siria.

### Caso 34 — no prolongado + extremo ausente del GTFS

- **Dato (medido, hoy):** 111 trips dir0; el máximo llega a **Cementerio (888)**. **Parque de
  Atracciones (617) no existe en el GTFS** (0 toques en 457 fechas); solo aparece en `get_stops_list`.
- **Resultado esperado:** itinerario pinta hasta **Cementerio como terminal** (no se tacha). Las
  paradas 649→617 (que `get_stops_list` añade) llevan **"servicio no prolongado"**, **no**
  "provisional·desvío". Frecuencia central `cada 8–9 min` ~08:30–20:14. Tabla: primeras 05:29→~07:15,
  últimas ~20:30→00:02.

### Caso 44 — terminal dinámico nocturno

- **Dato (medido):** Campus Río Ebro (445) servido 42/72 días de operación; los días que opera, deja
  de servirse a cierta hora y el terminal pasa a Pablo Ruiz Picasso (616). **Hoy (16 jul) la 44 no
  circula** (0 trips).
- **Resultado esperado (en un día que opere):** paradas hacia Campus Río Ebro con **"servicio
  prolongado hasta las HH:MM"**; tras esa hora, terminal vigente = Pablo Ruiz Picasso; los trips
  nocturnos a Pablo Ruiz Picasso **sin "*"**. **Hoy:** `sinServicio` (§7-Q5).
  ⚠️ El "22:15" del ejemplo de Antonio es su conocimiento de campo; **no lo he verificado contra el
  horario de un día concreto** (44 no corre hoy). Se verifica en la fase de la pieza 3.

---

## 5 · Qué se jubila y qué se conserva

### Jubilar — **borrar, no dejar muerto**

| Qué | Dónde |
|---|---|
| Bloque "Funcionamiento de terminal" por tipo de día (Laborables/Sábados/Festivos) | `src/components/Terminal.tsx` (todo el componente) |
| Índices 1/2 ("no viene desde principio" / "no llega a final") y su render/leyenda | `Terminal.tsx` (`Salida`, `Fila`, leyenda) |
| Detección de parciales por **cabecera modal** (`noViene`/`noLlega`, `cabeceraOrigen/Destino`, `modal()`) | `src/sources/gtfs-nap/terminal.ts` (pasos 5–fin: todo lo de cabeceras y marcas) |
| Estructura 5+5 primeras/últimas por 3 tipos de día | `terminal.ts` (`primeras/ultimas` fijas), `SalidaDeTerminal.noViene/noLlega` |
| Tests del aparato viejo | `tests/motor-vivo/parciales-de-terminal.test.ts`; partes de `cruces.test.ts` y `e2e/recorrido-y-terminal.spec.ts` que asserten índices 1/2 |
| Re-exports del tipo viejo | `SalidaDeTerminal`/`TerminalDeSentido` en `engine/topologia.ts` si dejan de usarse |

⚠️ **Se reutiliza el concepto, no el código:** la resolución de "servicios activos en una fecha"
(`calendar_dates` → `service_id` activos) de `terminal.ts` es buena y se recicla, pero **reorientada a
UNA fecha (hoy)**, no a tres tipos de día representativos. La maquinaria de "fechas representativas"
(laborable/sábado/festivo) **se jubila**.

### Conservar

- **Pieza 1** (`engine/desvios.ts`, `compararRecorrido`, freno de mano) — reencuadrada (extremo vs
  interior), no reescrita.
- **`Itinerario.tsx`** — se conserva y se le añaden las notas por parada (piezas 2/3); se le quita el
  `provisional·desvío` mal aplicado al extremo.
- **Capa de nombres de Avanza** (`sources/avanza/nombres.ts`, `aplicar-nombres.ts`, `recorrido.ts`) —
  se integra en la recogida diaria.
- **`transporte.ts`** (cuello de botella único a Avanza), cachés, `get_stops_list`.
- Todo lo demás de la vista de línea: itinerario, transbordos, búhos, chips, rumbo.

---

## 6 · Plan de fases de implementación

Orden propuesto, con su porqué y qué se verifica aislado en cada una. **Cada fase es un entregable
verificable sin la siguiente.**

- **Fase 1 · La recogida y el precálculo del horario-de-hoy.**
  Resolver GTFS a la fecha (inyectada) → estructura por línea×sentido con todos los trips (horas +
  secuencia de postes) y la ruta real (`get_stops_list`). Hornear. **Verificable aislado:** dump del
  horario de una línea = lo que ya sé medir (los volcados de estas auditorías). Sin UI todavía.
  *Depende de:* nada. *Es la base de todo.*

- **Fase 2 · Frecuencias (pieza 4).**
  Detección de bloques sobre las horas horneadas. **Verificable aislado:** contra 34/35 de hoy
  (bloque central 8–9; ruido 06:39/06:40 y 46-final no parten). Función pura, test de tabla.
  *Depende de:* Fase 1. *Por qué antes que la tabla:* la tabla usa su MISMO criterio de estabilización.

- **Fase 3 · Tabla de hoy (pieza 5), sin el "*".**
  Primeras/centro/últimas con los bordes de la Fase 2. Render que reemplaza `Terminal.tsx`.
  **Verificable aislado:** los bordes caen donde el ojo los ve en 34/35. Sin marcas de terminal aún.
  *Depende de:* Fase 2.

- **Fase 4 · Prolongación (piezas 2 y 3).**
  Por parada, hasta qué hora la alcanza la operación de hoy → notas en el itinerario. Aquí entra el
  **terminal vigente dinámico**. **Verificable aislado:** 23 (prolongado hasta HH:MM), 34 (no
  prolongado en 617), 44 en un día que opere. *Depende de:* Fase 1 (no de 2/3).

- **Fase 5 · El "*" de la tabla (cierre de pieza 5) + reencuadre de la pieza 1.**
  El "*" usa el terminal-vigente de la Fase 4. Y se separa desvío-interior de diferencia-en-extremo en
  `desvios.ts` para que 34 deje de pintar mal. **Verificable aislado:** el "*" solo en lo anómalo; 34
  ya no tacha Cementerio. *Depende de:* Fase 4.

- **Fase 6 · Jubilación y limpieza.**
  Borrar lo de §5 (no antes: mientras se construye, el viejo bloque sigue de red). Tests viejos fuera,
  tests nuevos dentro. *Depende de:* Fases 3–5 en verde.

*Instinto de Antonio (recogida→frecuencias→tabla→prolongaciones) confirmado, con dos matices:* la
tabla se parte en "sin \*" (Fase 3) y "con \*" (Fase 5) porque el "*" **depende** de las prolongaciones
(terminal vigente); y el reencuadre de la pieza 1 se agrupa con el "*" porque ambos tratan el extremo.

---

## 7 · Preguntas abiertas

Huecos de diseño y decisiones sin tomar. **Antonio y yo las resolvemos antes de implementar.** No las
he rellenado a ojo.

- **Q1 · ¿GTFS-de-hoy = realidad-de-hoy? (la pregunta que sostiene el principio rector).**
  El horario solo existe en el GTFS. Pero el GTFS y la realidad **divergen justo en nuestros casos**:
  - **34:** Parque de Atracciones **no está en el GTFS**. Si algún día real la 34 se prolonga allí, el
    horario-GTFS **nunca** lo verá (no hay parada ni trips). La pieza 3 no puede dar su hora. Queda como
    las supresiones: **avisable** (vía `get_stops_list` + `get_alteraciones_servicio`), no derivable.
  - **44:** hoy (16 jul) el GTFS dice **0 trips**. ¿Es real (no circula) o es el GTFS que va por detrás?
    Si es real, `sinServicio` es correcto. Si el GTFS está caduco, mostramos "no circula" una línea que
    circula. **¿Confiamos en el GTFS como "lo que opera hoy", o necesitamos una segunda fuente de
    verdad operativa?** (Avanza no la da por API.) **Esta es la decisión de fondo del proyecto.**

- **Q2 · ¿Qué es exactamente el "tramo prolongable"?** Las paradas "que no todos los trips alcanzan".
  ¿Umbral? ¿Todas las que ≥1 trip no alcanza, o solo las del extremo tras el último punto que el 100 %
  alcanza? Con 23 (46 % acaban antes) el "tramo" es largo; con un refuerzo suelto (1 trip corto) no
  queremos marcar media línea. Relacionado con el "freno de mano" de la pieza 1. **Sin definir.**

- **Q3 · Calibración de la pieza 4 (banda 0.25, sostenimiento N=3).** Propuestos con el dato de 34/35
  (líneas de frecuencia media, alta densidad). **No probados** en: búhos (N1–N7, pocas salidas, sin
  centro agrupable), circulares (Ci), lanzaderas (C1). ¿La banda proporcional aguanta una línea que de
  verdad cambia de "cada 20" a "cada 30"? ¿Y una con dos regímenes muy juntos? **Hay que barrer la red
  antes de fijar los números.** Riesgo declarado: puede no haber un corte limpio en líneas raras.

- **Q4 · Ventana del "terminal vigente a la hora t".** ¿"algún trip que sale a t o después" (mi
  propuesta), o dentro de una ventana (p.ej. ±30 min)? Con "a t o después", un único trip largo
  tardío mantiene el terminal lejano toda la noche. Con ventana, un hueco lo corta antes. **Afecta
  directamente a qué lleva "*".** Sin decidir.

- **Q5 · ¿Qué muestra una línea sin servicio hoy?** 44 y 23 hoy no circulan. ¿"Hoy no circula" a
  secas? ¿Enseñamos el itinerario (ruta) igual, sin tabla? ¿Y una línea que solo circula fines de
  semana, un martes? **Sin definir el estado vacío.**

- **Q6 · ¿Se surfacea `get_alteraciones_servicio`?** Es el texto humano de Avanza ("en periodo
  escolar…"). El principio rector dice **no preguntar por qué**. Pero ese texto podría ser un aviso
  útil de pasarela (sin lógica). ¿Lo mostramos como cita literal, o lo ignoramos por coherencia con el
  principio? Hoy devuelve vacío para 34/44 —habría que ver cuándo trae algo—.

- **Q7 · La recogida diaria y el nombrado.** `get_stops_list` trae `poste - nombre`, pero la ruta real
  es **estática** (no day-aware). ¿La usamos también como fuente de nombres canónica, o seguimos con
  la capa de nombres actual? Y ¿cada cuánto refrescamos el GTFS dentro de la pasada diaria (el feed no
  cambia a diario)? **Detalle de la Fase 1.**

- **Q8 · Sentido Avanza ↔ direction GTFS.** El mapeo `-1→dir0, -2→dir1` está medido (`desvios.ts`) pero
  con solape ~85–93 %, no 100 %. Para cruzar horario-GTFS con ruta-Avanza por sentido, ese solape
  imperfecto puede desalinear. **Verificar que aguanta línea a línea en la Fase 1.**
