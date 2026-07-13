# AUDITORÍA DE FUENTES — ZETABUS

**Fase 7: el oráculo estaba roto**
Fecha: 13/07/2026 · 12:54–13:05 hora local (plena hora de servicio)

> # ⚠️ ESTA FASE INVALIDA LA FASE 6.
> ## **Antonio tenía razón. Yo estaba equivocado. Los "7 fantasmas" NO EXISTEN y quedan retirados.**

---

# VEREDICTO BINARIO

> ## **¿La API viva refleja las supresiones de parada? → NO.**
>
> **La API anuncia autobuses en paradas donde el propio Avanza dice, por escrito, que el autobús NO PARA.**
> Lo he probado con el comunicado del Coso en la mano, sin necesidad de pisar la calle.

**La API viva NO es "el hecho". Es un tercer relato — y encima, uno que dice lo que la ruta *teórica* haría.**

---

# 1 · LAS RESPUESTAS LITERALES DE AVENIDA VALENCIA

Consulta a las **12:54 hora local**, plena hora de servicio, líneas 35/38/41 circulando (verificado en otros postes).

### Poste 262 — Av. de Valencia nº 8

```json
{"maquinas":{"0":{"coordenadas":{"0":{"LAT":41.647399,"LON":-0.894494}},
"icon":"https://gps.avanzabus.com/img/bus_rojo.png",
"info":"Av. de Valencia n.º 8","title":"Av. de Valencia n.º 8"}},"tablatiempos":""}
```

### Poste 263 — Av. de Valencia nº 38

```json
{"maquinas":{"0":{"coordenadas":{"0":{"LAT":41.646296,"LON":-0.897184}},
"icon":"https://gps.avanzabus.com/img/bus_rojo.png",
"info":"Av. de Valencia n.º 38","title":"Av. de Valencia n.º 38"}},"tablatiempos":""}
```

### Poste 264 — Av. de Valencia nº 41

```json
{"tablatiempos":""}
```

### Poste 265 — Av. de Valencia nº 63

```json
{"tablatiempos":""}
```

| Pregunta | Respuesta |
|---|---|
| ¿Devuelven llegadas? | **NO. Cero.** |
| ¿Aparecen las líneas 35, 38, 41? | **NO.** |
| ¿Vacío o poste desconocido? | 262 y 263 devuelven **solo el marcador de la parada** (icono rojo, sin buses). 264 y 265 devuelven **`{"tablatiempos":""}`** — sin siquiera la clave `maquinas`. |

---

# 2 · ⚠️ PERO ESTE TEST NO DEMUESTRA LO QUE PARECE

**La interpretación binaria que me diste tiene una trampa, y tengo que señalarla en lugar de aprovecharla.**

> *"Si están VACÍOS: la API SÍ refleja las supresiones. El oráculo se sostiene."*

**Eso no se sigue.** Avenida Valencia **no es una supresión de parada: es un DESVÍO DE RUTA.** Los autobuses de las líneas 35, 38, 41, N4 y N6 **físicamente no bajan por esa avenida** — van por Corona de Aragón, Cortes de Aragón, Avenida Goya, Santander, Duquesa Villahermosa.

**Un poste vacío en una calle por la que el autobús no circula no prueba que la API entienda de supresiones. Prueba que la API entiende de GPS.** Un bus que no está allí no puede tener un tiempo de llegada allí. Eso lo haría cualquier sistema.

**El silencio de Avenida Valencia es compatible con las DOS hipótesis. No discrimina nada.**

## Y aquí está mi error de la Fase 6, en carne viva

En la Fase 6 canté victoria con esto:

> *"⭐ El discriminador definitivo: **poste 333 (Coso 54)**, línea 21 sentido Barrio Jesús — un sentido que, según el comunicado, **sigue bajando por el Coso**. El bus pasa por delante y la API lo oculta igual. **EL ORÁCULO ES VÁLIDO.**"*

**Era falso. Fui a comprobar la geografía y el bus NO pasa por delante:**

```
Recorrido NORMAL de la 21 sentido Barrio Jesús (GTFS):
  1092 P. Pamplona 5      lon -0.88400
   666 Independencia 25   lon -0.88269
   333 Coso 54            lon -0.88011   ← el poste en cuestión
   338 Coso 126           lon -0.87549
   340 Coso 188           lon -0.87220

Desvío del Coso, LITERAL:
  "Sentido Barrio de Jesús: desde Plaza Paraíso por Constitución, Mina,
   Plaza San Miguel, Espartero a Coso."

Plaza San Miguel está en lon -0.87603.
El bus desviado se incorpora al Coso POR EL ESTE (Espartero/San Miguel, -0.876)
y sigue hacia Coso 126 (-0.87549) y Coso 188 (-0.87220).

→ El poste 333 (Coso 54, -0.88011) queda AL OESTE del punto de reincorporación.
→ EL BUS DESVIADO NUNCA PASA POR DELANTE DEL POSTE 333.
```

**Confirmación cruzada:** la línea 21 **no** está suprimida en Coso 126 ni en Coso 188 (no aparece en la lista) → efectivamente vuelve al Coso antes del 126, es decir, **al este del 54**.

> ### Mi "discriminador definitivo" era otro caso de ausencia física. **No tenía ni una sola prueba de que la API reflejara supresiones de parada. Lo di por bueno porque me convenía.**

---

# 3 · ⭐ LA PRUEBA QUE SÍ DISCRIMINA — Y TUMBA EL ORÁCULO

Necesitaba un poste donde el autobús **pase físicamente por delante** y **no pare**. El comunicado del Coso me lo da **por escrito, dos veces**:

```
Comunicado "III Fase obras Coso", LITERAL:

  Línea 29
  Sentido San Gregorio: realiza su RECORRIDO HABITUAL, pero SIN REALIZAR PARADA
                        en Plaza San Miguel al seguir en obras.

  Línea 39
  Sentido Vadorrey:     realiza su RECORRIDO HABITUAL, pero SIN REALIZAR PARADA
                        en Plaza San Miguel al seguir en obras.
```

**«Recorrido habitual»** = el bus pasa. **«Sin realizar parada»** = el bus no para.
Es exactamente el caso que necesitaba, y lo dice Avanza, no yo.

**El GTFS identifica el poste sin ambigüedad:**

```
poste 744  "Plaza San Miguel"  →  línea 29, sentido "San Gregorio"
poste 744  "Plaza San Miguel"  →  línea 39, sentido "Vadorrey"
```

**Y esto es lo que la API viva devuelve en el poste 744, HOY, a las 13:03:**

```
tablatiempos: 039 VADORREY     4649 [0 mins]   4272 [6 mins]
              029 SAN GREGORIO 4132 [0 mins]   4131 [12 mins]
```

> # **LA API ANUNCIA «039 VADORREY — 0 minutos» Y «029 SAN GREGORIO — 0 minutos»**
> # **EN LA PARADA DONDE AVANZA DICE, POR ESCRITO, QUE ESOS BUSES NO PARAN.**

**Dos líneas. Dos sentidos. Ambos declarados «sin realizar parada». Ambos anunciados con tiempo de llegada.**

## → EL ORÁCULO ESTÁ ROTO. CONFIRMADO.

Y el mecanismo es exactamente el que describió Antonio: **el poste sigue conectado.** Avanza pone un cartel en la marquesina, pero **no lo saca de su sistema operativo**. El SAE sigue calculando el ETA porque el bus sigue pasando por delante.

---

# 4 · ¿QUÉ ESTÁ DEVOLVIENDO EXACTAMENTE LA API?

**Devuelve el tiempo estimado de llegada de los autobuses cuya RUTA OPERATIVA pasa por ese poste.** Ni más ni menos.

| Situación | ¿Qué hace la API? | ¿Por qué? |
|---|---|---|
| **Desvío de ruta** (Coso, Av. Valencia) | **Silencio** | El bus no circula por ahí. No hay nada que calcular. |
| **Supresión de parada suelta** (bus pasa, no para) | **Anuncia llegada, con minutos** | El bus sigue en la ruta operativa. El cartel de la marquesina no está en la base de datos. |
| Parada normal | Anuncia llegada | — |

**La API refleja el RECORRIDO. No refleja el SERVICIO.**

## ¿Hay algún campo que distinga «para aquí» de «pasa por aquí»?

**NO. Ninguno.** Las respuestas son estructuralmente idénticas.

**Poste 82 (César Augusto 4) — declarado suprimido desde el 10 de enero:**
```
tablatiempos: 032 BOMBARDA   4687 [1 mins]   4681 [10 mins]
              052 MIRALBUENO 4940 [9 mins]   4110 [20 mins]

info (tabla HTML): ['4687', '032->BOMBARDA', '1 min.', '0 kms.']
```

**Poste 669 (P. Pamplona / Plaza Paraíso) — parada normal, sin incidencias:**
```
tablatiempos: 033 DELICIAS   4673 [2 mins]   4308 [11 mins]
              021 MIRALBUENO 4230 [4 mins]   4258 [10 mins]
              038 VALDEFIERRO 4113 [8 mins]  4233 [17 mins]
```

**Mismos campos. Mismo formato. Misma estructura. Cero señal.** No hay flag, ni clase, ni icono distinto, ni campo extra. **Desde la respuesta es literalmente indistinguible.**

---

# 5 · LOS POSTES EN DISPUTA — Y CÓMO SE COMPORTAN

| Poste | Parada | Declarada suprimida | API VIVA (13/07, 12:5x) | Tipo |
|---|---|---|---|---|
| 262 | Av. Valencia 8 | desvío 16/06 | **silencio** | Desvío de ruta |
| 263 | Av. Valencia 38 | desvío 16/06 | **silencio** | Desvío de ruta |
| 264 | Av. Valencia 41 | desvío 16/06 | **silencio** (sin `maquinas`) | Desvío de ruta |
| 265 | Av. Valencia 63 | desvío 16/06 | **silencio** (sin `maquinas`) | Desvío de ruta |
| **82** | **César Augusto 4** | **10 enero** | **032 [1 min], 052 [9 min]** | **Supresión de parada** |
| **49** | Anselmo Clavé 21 | 17 febrero | **022 [0 min], 031 [5 min]** | Supresión de parada |
| **50** | Anselmo Clavé 45 | 22 abril | **031 [3 min], 022 [12 min]** | Supresión de parada |
| **51** | Anselmo Clavé / Correos | 22 abril | **022 [0 min], 031 [2 min]** | Supresión de parada |
| **52** | Anselmo Clavé / Santander | 10 marzo | **031 [0 min], 022 [0 min]** | Supresión de parada |
| **744** | **Plaza San Miguel** | **«sin realizar parada»** | **039 [0 min], 029 [0 min]** | **⭐ LA PRUEBA** |

> ## **Se comportan EXACTAMENTE IGUAL.**
> César Augusto y Anselmo Clavé se comportan igual que el poste 744 — el que Avanza dice explícitamente que **no se usa**.
>
> **No son fantasmas. Son postes suprimidos que siguen conectados.** Igual que dice Antonio.

**Y los 4 postes del GTFS lo confirman estructuralmente:** el `stops.txt` del 23/06/2026 **sigue incluyendo** los postes 82, 49, 50, 51 y 52 en las rutas de las líneas 32/52 y 22/31. Nunca se sacaron de la ruta operativa. Solo se les puso un cartel.

---

# 6 · ⚠️ RETIRADA FORMAL: LOS 7 FANTASMAS DE LA FASE 6

## **LOS 7 FANTASMAS NO EXISTEN. LA FASE 6 ESTABA MAL. LOS RETIRO.**

| Poste | Parada | Fase 6 dijo | **La verdad** |
|---|---|---|---|
| 82 | César Augusto 4 | 👻 «FANTASMA» | **Supresión probablemente REAL.** Antonio confirma que no paran. |
| 49 | Anselmo Clavé 21 | 👻 «FANTASMA» | **NO DETERMINADO.** El método no vale. |
| 50 | Anselmo Clavé 45 | 👻 «FANTASMA» | **NO DETERMINADO.** |
| 51 | Anselmo Clavé / Correos | 👻 «FANTASMA» | **NO DETERMINADO.** |
| 52 | Anselmo Clavé / Santander | 👻 «FANTASMA» | **NO DETERMINADO.** |
| 518 | Isabel la Católica / Romareda | 👻 «FANTASMA» | **NO DETERMINADO.** |
| 279 | Cejador Frauca 10 | 👻 «FANTASMA» | **NO DETERMINADO.** |

**El razonamiento de la Fase 6 era:**
> *"La API oculta las paradas suprimidas (16/16). Luego, si muestra buses → no está suprimida."*

**La premisa era falsa.** Los 16/16 eran **todos desvíos de ruta** (ausencia física). **Ninguno era una supresión de parada suelta.** Validé el oráculo contra los casos que no lo ponían a prueba, y luego lo apliqué a los que sí.

**Es el error clásico: confirmé la hipótesis en la muestra fácil y la extrapolé a la difícil.** Y me lo tragué porque el resultado era espectacular.

**El documento de "Paradas suprimidas" de Avanza podría ser perfectamente correcto. El que mentía era mi informe.**

---

# 7 · ¿QUEDA ALGUNA FORMA DE VERIFICARLO AUTOMÁTICAMENTE?

## Lo único que la API SÍ dice con certeza — la asimetría

| Lo que devuelve la API | Lo que puedes concluir |
|---|---|
| **SILENCIO** (y la línea está circulando) | ✅ **El autobús NO va a pasar por ese poste.** Fiable. |
| **LLEGADAS** | ❌ **Solo que el autobús PASA por ahí.** **NO dice si para.** |

> **El silencio es información. El ruido no lo es.**

Esto salva **la mitad** del método: **un desvío de ruta SÍ se puede verificar y SÍ se puede detectar cuando termina** (los postes vuelven a hablar). **Una supresión de parada, NO.**

## ¿Y rastrear el GPS del bus para ver si se detiene?

Lo probé. **Seguimiento real del poste 82, 24 muestras cada 5 segundos, datos literales** (distancia de cada bus al poste, en metros):

```
t=0s     4687: 115m    4940: 500m
t=20s    4687: 108m    4940: 396m
t=35s    4687:  58m    4940: 203m
t=55s    4687:  57m    4940: 165m
t=65s    4687: DESAPARECE (nunca bajó de 57 m)
t=75s                  4940:  40m
t=85s                  4940:  16m
t=100s                 4940:  16m
t=115s                 4940:  11m   ← lleva 30 s a 11-16 m del poste
```

**INCONCLUYENTE, y hay que decirlo:**
- El bus 4687 **nunca se acercó a menos de 57 m** y desapareció → parece que **no paró**… o el GPS no lo muestreó en el momento justo.
- El bus 4940 **lleva 30 segundos a 11-16 m** → parece que **paró**… o está en el semáforo de Puerta del Carmen, que es un cruce mayor.
- **El GPS de Avanza se refresca cada 10-20 segundos** (los valores se repiten en bloques). **La resolución no da** para distinguir una parada de 15 s de un semáforo de 15 s.
- Y el poste **3008** (*Av. César Augusto n.º 3*) está a metros: un bus «parado a 11 m del 82» podría estar parando en el 3008.

> **El método del GPS es teóricamente posible pero NO ESTÁ VALIDADO, y con esta resolución probablemente no sea viable. No lo vendo como solución. Lo dejo apuntado como línea de investigación, marcado NO VERIFICADO.**

## La respuesta honesta

> # **NO. NINGUNA FUENTE DICE CON CERTEZA SI UNA PARADA CONCRETA ESTÁ SUPRIMIDA.**
>
> - El **GTFS** no modela supresiones (Fase 4).
> - El **comunicado** lo declara, pero puede quedarse obsoleto y no lo sabemos.
> - La **API viva** no lo refleja: sigue anunciando buses en paradas muertas.
> - El **GPS** no tiene resolución para distinguir parada de semáforo.
>
> **Hay que diseñar PARA la incertidumbre, no fingir que se puede resolver.**

---

# 8 · CÓMO DISEÑAR PARA LA INCERTIDUMBRE

## El principio nuevo (sustituye a la máquina de estados de la Fase 6, que queda ANULADA)

> ### **No adjudiques. Muestra los dos hechos y deja que el usuario los vea.**

**La app no debe decir «esta parada está suprimida» como si lo supiera. Debe decir QUIÉN lo dice y CUÁNDO lo dijo.**

```
┌─────────────────────────────────────────────────────────┐
│  ⚠ Av. César Augusto n.º 4                              │
│                                                          │
│  Avanza declaró esta parada SUPRIMIDA                    │
│  en su aviso del 10 de enero de 2026.                    │
│  › Ver aviso completo                                    │
│                                                          │
│  El sistema en vivo sigue anunciando llegadas aquí:      │
│     32 → Bombarda      1 min                             │
│     52 → Miralbueno    9 min                             │
│                                                          │
│  ⓘ El sistema de Avanza no retira los avisos de llegada  │
│    en las paradas suprimidas. Confirma en la marquesina. │
└─────────────────────────────────────────────────────────┘
```

**Reglas:**

1. **NUNCA auto-destachar** porque la API muestre llegadas. **Ese fue el error de la Fase 6.**
2. **NUNCA presentar la supresión como hecho propio.** Siempre: *"según el aviso de Avanza del [fecha]"*. La fecha es la información que el usuario necesita para juzgar.
3. **Mostrar las llegadas de todas formas**, con el aviso al lado. Son dos hechos, ambos ciertos: *Avanza lo declaró suprimido* Y *el sistema anuncia buses*. **La contradicción es real y es del operador, no nuestra.** Ocultarla sería peor.
4. **Un desvío de RUTA sí se puede verificar** (silencio de la API) y sí se puede auto-apagar cuando los postes vuelven a hablar. **Esa mitad del método se salva.**
5. **La antigüedad del aviso es un dato de primera clase.** Un aviso de hace 6 meses merece un tono distinto que uno de ayer.

## Lo que un cron SÍ puede hacer (versión corregida)

| ✅ Puede | ❌ No puede |
|---|---|
| Descubrir alteraciones (endpoint por línea) | **Saber si una parada está realmente suprimida** |
| Detectar cambios en un comunicado (`modified_time`) | **Detectar que una supresión ha terminado** |
| Separar VIGENTES de YA RECUPERADAS (secciones `<mark>`) | Distinguir «para aquí» de «pasa por aquí» |
| Identificar el poste (100 % contra `stops.txt`) | Fiarse del silencio en horario nocturno |
| **Verificar y auto-apagar un DESVÍO DE RUTA** (silencio de los postes) | **Verificar una SUPRESIÓN DE PARADA** |

---

# 9 · NO VERIFICADO

- **Si César Augusto 4 sigue realmente suprimido.** Antonio dice que sí, y todo lo que he medido es **compatible** con ello. **No lo he verificado yo, y no puedo hacerlo desde aquí.**
- **Si los 4 postes de Anselmo Clavé siguen suprimidos.** Igual. **No determinado.**
- **Si el método de dwell GPS podría funcionar** con más muestras, mejor filtrado y estadística sobre muchos buses. **Mi prueba (24 muestras) es inconcluyente.**
- **Si Avanza desconecta el poste ALGUNA vez** en una supresión de parada suelta. No he encontrado ni un solo caso donde lo haga. **Pero tampoco he probado todos.**

---

# CONCLUSIÓN

**Antonio, que conoce la ciudad, ha tumbado un informe que yo había construido con 16 tests, un control positivo y una prueba que llamé «decisiva».**

Y la lección no es que me faltaran datos. **Es que validé el detector contra los casos que no lo ponían a prueba.** Los 16 postes vacíos del Coso y Avenida Valencia eran todos desvíos de ruta: buses que físicamente no estaban allí. Cualquier sistema GPS los habría dado por vacíos. **No probé ni una sola vez lo único que importaba: un bus que pasa por delante y no para.**

Cuando por fin lo probé —el poste 744, con el comunicado de Avanza diciendo negro sobre blanco *«recorrido habitual, sin realizar parada»*— la API me anunció, tan tranquila, **«039 VADORREY — 0 minutos»**.

> ## **La API viva no sabe si el autobús para. Solo sabe por dónde pasa.**
>
> **Y ZETABUS tampoco puede saberlo. Así que no debe fingir que lo sabe.**

El producto honesto no es el que resuelve la incertidumbre. Es el que **la muestra**: *"Avanza declaró esta parada suprimida el 10 de enero. Su sistema sigue anunciando buses. Confirma en la marquesina."*

Eso es verdad, es útil, y es todo lo que se puede decir.

---

*Fase 7 realizada en horario de servicio (12:54–13:05), con respuestas literales pegadas y experimento de seguimiento GPS. **Invalida y retira los "7 fantasmas" de la Fase 6.** Lo no verificable está marcado.*
