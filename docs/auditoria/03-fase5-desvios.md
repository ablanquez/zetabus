# AUDITORÍA DE FUENTES — ZETABUS

**Fase 5: ¿se puede REPINTAR una línea desviada?**
Fecha: 13/07/2026
Continúa [FASE 3](AUDITORIA_FUENTES_ZETABUS_FASE3.md) y [FASE 4](AUDITORIA_FUENTES_ZETABUS_FASE4_COLOR_Y_DESVIOS.md). **Corrige dos supuestos de la Fase 4** (ver «Autocorrecciones»).

> **Fuera de alcance, cerrado:** los colores de línea salen del `route_color` del GTFS. No se reabre.

---

---

> # 🛑 EL VEREDICTO CENTRAL DE ESTE INFORME ESTÁ RETIRADO.
>
> ## La [**FASE 7B**](AUDITORIA_FUENTES_ZETABUS_FASE7B_RUTA_REAL.md) demuestra que **SÍ se puede repintar una ruta desviada, con rigor.**
>
> **Qué falla:** aquí evalué **un solo método** —transcribir los comunicados— y concluí que era imposible porque no dan el orden ni el sentido. **Eso es cierto.** Pero la pregunta estaba mal planteada: **el desvío no hay que transcribirlo, hay que PEDIRLO.**
>
> La propia web de Avanza tiene un endpoint (`get_stops_list`) que devuelve **la secuencia ORDENADA del recorrido actual, por sentido, con el desvío ya aplicado** — 45 de 46 líneas — **más un KML con el trazado actualizado.**
>
> **El agujero que aquí declaré «INVENCIÓN» para la línea 38** (`??? ¿1228? ¿632? ¿634?`) **lo rellena el endpoint sin ambigüedad: `681 → 1228 → 1258 → 585`.**
>
> ## ⛔ El contador **«c) reconstruir la secuencia: 0/6»** queda ANULADO. → **45/46 líneas, ordenada y por sentido.**
> ## ⛔ La sección **«8 · LO QUE ZETABUS SÍ PUEDE HACER»** queda SUPERADA: sí puede repintar.
>
> **Lo que SÍ se salva de este informe:**
> - La identificación de las paradas suprimidas contra `stops.txt` (**100 %, 31 de 31**). **Correcto y sigue siendo útil.**
> - La descripción de lo que traen los comunicados y sus límites. **Correcta.**
> - Que las **supresiones de parada** siguen sin ser detectables por ninguna fuente. **Confirmado por la Fase 7 y la 7B.**
>
> Lee la **[Fase 7B](AUDITORIA_FUENTES_ZETABUS_FASE7B_RUTA_REAL.md)** antes que esto.

---

# VEREDICTO EN UNA LÍNEA *(RETIRADO — ver aviso arriba)*

> ## ~~NO. ZETABUS NO puede repintar una ruta desviada con rigor.~~
> ## **SÍ puede TACHAR las paradas suprimidas, avisar, y enseñar el texto del comunicado — y eso lo puede hacer MUY bien.** *(esta mitad sigue siendo válida)*

**La hipótesis de Antonio —"en los comunicados indican por dónde va a pasar cada bus, con sus paradas"— es MEDIO CIERTA, y la mitad que falla es justo la que hace falta.**

Los comunicados nombran **calles** para el recorrido, y dan una **lista de paradas habilitadas sin orden y sin sentido**. Reconstruir la secuencia de postes exigiría **inventarse el orden y la asignación por sentido**. Eso es exactamente la mentira dibujada que hay que evitar.

## Los cuatro contadores (N = 6 comunicados vigentes)

| | Pregunta | Resultado |
|---|---|---|
| **a)** | ¿Se identifican las **LÍNEAS** afectadas? | **6 / 6** ✅ |
| **b)** | ¿Se identifican las **PARADAS SUPRIMIDAS**? | **5 / 6** ✅ |
| **c)** | ¿Se puede **RECONSTRUIR LA SECUENCIA DE POSTES** del recorrido desviado? | **0 / 6** ❌ |
| **d)** | ¿Y hacerlo **POR SENTIDO**? | **0 / 6** ❌ |

---

# 1 · CATÁLOGO COMPLETO DE ALTERACIONES VIGENTES

Barrido del endpoint `get_alteraciones_servicio` sobre **las 46 líneas**, deduplicado por slug.

> **Antonio tenía razón: el endpoint por línea tiene MÁS histórico que el RSS.**

| # | Comunicado | Fecha | Líneas afectadas | ¿Estaba en el RSS? |
|---|---|---|---|---|
| 1 | **Paradas suprimidas por obras en las mismas** | 2 ene 2026 | 22, 31, 32, 34, 42, 52, Ci2, Ci4, N2 | ❌ **NO** |
| 2 | **III Fase obras Coso – Líneas de autobús desviadas** | 21 may 2026 | 21, 22, 28, 29, 30, 32, 35, 38, 39, 40, N1, N5 | ❌ **NO** |
| 3 | **Obras entorno antigua Estación del Portillo** | 11 jun 2026 | 21, 22, 23, 31, 32, 33, 34, 51, 52, TUR | ❌ **NO** |
| 4 | **ACTUALIZACIÓN Obras Avenida Valencia** | 16 jun 2026 | 35, 38, 41, N4, N6 | ✅ sí |
| 5 | **Manifestaciones y eventos julio 2026** | 7 jul 2026 | 21, 22, 29, 32, 50, 60, Ci1, Ci2 | ✅ sí |
| 6 | **Obras C/ Oviedo – Desvíos en 3 líneas** | 13 jul 2026 | 23, 31, C4 | ✅ sí |

```
Alteraciones VIGENTES:                  6
Visibles en el RSS:                     3
INVISIBLES en el RSS:                   3   ← el 50 %
```

**Las tres que faltaban son las más antiguas y las más gordas** (el Coso afecta a 12 líneas). El RSS es una ventana temporal reciente; el endpoint devuelve **lo vigente**. Son cosas distintas.

### ⚠️ AUTOCORRECCIÓN 1 — la Fase 4 se equivocó de fuente

La Fase 4 decía: *"La capa editorial se mantiene asistida por **el RSS**"*.

**Falso.** El RSS **se pierde la mitad de las alteraciones vigentes**, incluida la mayor de todas.

> **Fuente principal correcta: el endpoint `get_alteraciones_servicio` recorrido por línea.** El RSS sirve, como mucho, de señal de "hay novedad".

---

# 2 · QUÉ TRAE CADA COMUNICADO

| Comunicado | Líneas explícitas | Paradas SUPRIMIDAS | Paradas HABILITADAS | Recorrido alternativo | Por SENTIDO | Fechas |
|---|---|---|---|---|---|---|
| **Coso** | ✅ 12 | ✅ **21 nombradas** | ⚠️ 14 nombradas | ❌ **solo CALLES** | ⚠️ narrativa sí, clave no | ⚠️ inicio sí, fin "hasta finalización" |
| **Avenida Valencia** | ✅ 5 | ✅ **9 nombradas** | ⚠️ 14 nombradas | ❌ **solo CALLES** | ⚠️ narrativa sí, clave no | ⚠️ solo inicio |
| **Portillo** | ✅ 4 (+9 con retrasos) | ✅ **2 nombradas** | ⚠️ 1 nombrada | ❌ **solo CALLES** | ❌ **ninguno** | ⚠️ inicio + "~3 meses" |
| **Oviedo** | ✅ 3 | ✅ **1** (poste 609) | ❌ **NO** — solo *"paradas MÁS PRÓXIMAS"* (a dónde caminar) | ❌ **solo CALLES** | ❌ **ninguno** | ✅ **13 jul → 24 jul** |
| **Paradas suprimidas** | ✅ 9 | ✅ **9, y 4 con nº de POSTE explícito** | ⚠️ "parada provisional" sin nombre exacto | — (no hay desvío de ruta) | — | ⚠️ por entrada, formato libre |
| **Manifestaciones** | ✅ 8 | ❌ **NINGUNA** | ❌ ninguna | ❌ solo el recorrido de la MANIFESTACIÓN | ❌ | ✅ sábado 11 jul, 10:30 |

---

# 3 · EL TEST QUE DECIDE: ¿LOS NOMBRES CASAN CONTRA `stops.txt`?

Emparejamiento por tokens (normalizando acentos, `N.º`, `Av./Avenida`, `P./Paseo`, `Pza./Plaza`) contra las 934 paradas de bus del GTFS.

## PARADAS SUPRIMIDAS — **casan TODAS**

```
Coso:              21 nombres →  17 únicas  |  4 ambiguas  |  0 INEXISTENTES
Avenida Valencia:   9 nombres →   6 únicas  |  3 ambiguas  |  0 INEXISTENTES
Oviedo:             1 nombre  →   1 única   |  0 ambiguas  |  0 INEXISTENTES
                   ────────────────────────────────────────────────────────
TOTAL:             31 nombres →  24 únicas  |  7 ambiguas  |  0 INEXISTENTES
```

> ### **CERO paradas suprimidas sin correspondencia. El 100 % existe en el GTFS.**

Ejemplos literales:

| Texto del comunicado | `stop_name` del GTFS | Poste |
|---|---|---|
| `Oviedo 175` | `Oviedo N.º 175` | **609** |
| `Coso 62` | `Coso N.º 62` | **335** |
| `Coso/Teatro` | `Coso N.º 55 / Teatro Principal` | **334** |
| `Don Jaime/Plaza La Seo` | `Don Jaime I / Plaza De La Seo` | **433** |
| `Avenida Valencia 8` | `Av. De Valencia N.º 8` | **262** |
| `Vía Universitas 10` | `Vía Univérsitas N.º 10` | **851** |
| `Avenida Puente del Pilar 3` | `Av. Puente Del Pilar N.º 3 / Puente De Hierro` | **3524** |

### Y las 7 ambigüedades **se resuelven cruzando con el GTFS** — probado

El comunicado del Coso lista **dos veces** "Plaza San Miguel", con conjuntos de líneas distintos. No dice cuál es cuál. **El GTFS lo desambigua solo:**

```
Comunicado:  "Plaza San Miguel" → Líneas 38 y 40
Comunicado:  "Plaza San Miguel" → Líneas 29, 30, 39 y N5

GTFS poste 744 (Plaza San Miguel) → líneas [29, 38, 39, 40]     ← contiene 38 y 40 ✅
GTFS poste 745 (Plaza San Miguel) → líneas [29, 30, 39, N5]     ← coincidencia EXACTA ✅
```

Lo mismo con "Plaza España" (719 vs 720) y con "Violante de Hungría/Palacio de Deportes" (863 vs 865 → la 35 solo pasa por **863**).

> **Intersecar el conjunto de líneas del comunicado con el conjunto de líneas del poste en el GTFS resuelve la ambigüedad. Es determinista, no es una intuición.**

## PARADAS HABILITADAS — **aquí se rompe**

```
Coso:              14 nombres →   3 NO EXISTEN en el GTFS
Avenida Valencia:  14 nombres →   4 NO EXISTEN en el GTFS
Portillo:           1 nombre  →   0
Oviedo:             2 nombres →   0   (pero no son "habilitadas": son "más próximas")
                   ─────────────────────────────────────────
TOTAL:             30 nombres →   7 INEXISTENTES  (23 %)
```

**Las 7 que no existen — verificado con búsqueda amplia sobre las 934 paradas:**

| Parada habilitada | Búsqueda en el GTFS | Resultado |
|---|---|---|
| `Asalto/Heroísmo 10` | `heroismo` | **0 paradas** |
| `Alonso V/frente 11` | `alonso` | **0 paradas** |
| `Echegaray y Caballero 152` | 14 paradas de Echegaray, **ninguna es el 152** | **no existe** |
| `Cortes de Aragón 39` | `cortes` → solo *Hernán Cortés* | **no existe** |
| `Fernando El Católico 4` | solo existen el **70** y el **31** | **no existe** |
| `Paseo Teruel 40` | solo existe el **24** | **no existe** |
| `Plaza San Francisco` | `francisco` → solo *Av. Francisco de Goya* | **no existe** |

> ## **Son PARADAS PROVISIONALES creadas para las obras.**
> ### No tienen poste. No tienen coordenadas. **No tienen llegadas en la API viva** (que se consulta por poste).
>
> Aunque supieras el orden, **no podrías pintarlas ni darles tiempo de llegada.** Una de cada cuatro paradas del recorrido desviado es un agujero negro.

---

# 4 · EL RECORRIDO ALTERNATIVO: CALLES, NO PARADAS

Texto **literal** del comunicado del Coso:

```
Línea 21
Sentido Miralbueno: desde Glorieta del Sol por Alonso V, Asalto, Mina, Constitución a Paseo Pamplona.
Sentido Barrio de Jesús: desde Plaza Paraíso por Constitución, Mina, Plaza San Miguel, Espartero a Coso.

Línea 38
Sentido Miguel Servet: desde Plaza Paraíso por Constitución, Mina a sus recorridos oficiales.
Sentido Plaza Paraíso: desde Miguel Servet por Mina, Constitución a sus recorridos oficiales.
```

Aplicando el criterio estricto que pediste:

| Patrón | Ejemplo | ¿Sirve? |
|---|---|---|
| `por Alonso V, Asalto, Mina, Constitución` | **CALLE** | ❌ **NO SIRVE** |
| `Pablo Parellada 27` (en la lista de paradas) | **PARADA** → poste 610 | ✅ sirve |

**En los 6 comunicados, el recorrido alternativo se describe SIEMPRE con calles. NUNCA con la secuencia de paradas.** Las paradas van aparte, en una lista **sin orden y sin sentido**.

## Y los "sentidos" no tienen clave estable

El comunicado etiqueta los sentidos con nombres que **no casan con `trip_headsign` del GTFS**:

| Línea | Sentidos del comunicado | `trip_headsign` en el GTFS | ¿Casa? |
|---|---|---|---|
| 22 | Bombarda / Las Fuentes | Bombarda / Las Fuentes | ✅ |
| 29 | Camino Las Torres / San Gregorio | Camino Las Torres / San Gregorio | ✅ |
| 41 | Puerta del Carmen / Rosales del Canal | Puerta Del Carmen / Rosales Del Canal | ✅ |
| **30** | **Asalto** | Las Fuentes | ❌ |
| **35** | Parque Goya / **Hispanidad** | Parque Goya / Seminario | ❌ |
| **38** *(Coso)* | **Miguel Servet / Plaza Paraíso** | Bajo Aragón / Valdefierro | ❌ |
| **38** *(Valencia)* | Bajo Aragón / Valdefierro | Bajo Aragón / Valdefierro | ✅ |
| **40** | **Plaza Paraíso** | Plaza Aragón / San José | ❌ |
| **N4** | **Valdespartera** | *(nombre largo del recorrido)* | ❌ |
| **N5** | **San Miguel** | *(nombre largo del recorrido)* | ❌ |

> ⚠️ **La MISMA línea 38 se etiqueta con sentidos distintos en comunicados distintos**: "Miguel Servet / Plaza Paraíso" en el del Coso, "Bajo Aragón / Valdefierro" en el de Avenida Valencia.
>
> **Avanza nombra el sentido con el punto de referencia cercano a las obras, no con la terminal. No hay clave. Hay prosa.**

---

# 5 · ⭐ EJEMPLO COMPLETO TRABAJADO — LÍNEA 38, OBRAS DEL COSO

## Lo que dice el comunicado, literal

```
Línea 38
Sentido Miguel Servet: desde Plaza Paraíso por Constitución, Mina a sus recorridos oficiales.
Sentido Plaza Paraíso: desde Miguel Servet por Mina, Constitución a sus recorridos oficiales.

PARADAS SUPRIMIDAS (que citan a la 38):
  Plaza San Miguel        – Líneas 38 y 40
  Coso 62                 – Líneas 38 y 39
  Paseo Independencia 25  – Líneas 21 y 38
  Plaza San Miguel 5      – Línea 38
  Coso/Teatro             – Línea 21 y 38
  Paseo Independencia 24  – Líneas 21 y 38

PARADAS HABILITADAS (que citan a la 38):
  Paseo La Mina 15                  – Líneas 21, 22, 38 y 40
  Constitución 33                   – Líneas 21, 22, 38 y 40
  Constitución 11                   – Líneas 21, 22, 38 y 40
  Constitución/Patio de La Infanta  – Líneas 21, 22, 30, 32, 35, 38, N1 y N5
  Paseo La Mina/Centro Mayores      – Líneas 21, 22, 30, 32, 35, 38, N1 y N5
```

## 🟢 LO QUE SE SABE CON CERTEZA (transcripción + deducción determinista)

**Ruta nominal del GTFS, tramo afectado:**

```
dir0 (headsign "Valdefierro"):
  ... 586 → 584 → [744] → [334] → [664] → 669 → 505 ...
       Miguel Servet 37 · Miguel Servet 13 · PLAZA SAN MIGUEL · COSO/TEATRO ·
       P. INDEPENDENCIA 24 · P. Pamplona 4 (Plaza Paraíso) · Hernán Cortés 6

dir1 (headsign "Bajo Aragón"):
  ... 681 → [666] → [335] → [741] → 585 → 588 ...
       P. Pamplona 1 (Plaza Paraíso) · P. INDEPENDENCIA 25 · COSO 62 ·
       PLAZA SAN MIGUEL 5 · Miguel Servet 28 · Miguel Servet 60
```

**Las 6 paradas suprimidas se reparten LIMPIAMENTE entre los dos sentidos**, y esto **no es una intuición: sale de intersecar con la secuencia del GTFS**:

| Sentido | Postes suprimidos | Certeza |
|---|---|---|
| **dir0** (→ Valdefierro) | **744** (Plaza San Miguel), **334** (Coso/Teatro), **664** (Independencia 24) | 🟢 **CERTEZA** |
| **dir1** (→ Bajo Aragón) | **666** (Independencia 25), **335** (Coso 62), **741** (Plaza San Miguel 5) | 🟢 **CERTEZA** |

**Y el mapeo de sentido también se cierra**, por geografía contra el GTFS:
`"Sentido Miguel Servet"` = el que **termina** en Miguel Servet = **dir1** (headsign *Bajo Aragón*).
`"Sentido Plaza Paraíso"` = **dir0** (headsign *Valdefierro*).
🟢 **CERTEZA** — pero obtenida razonando, no leyendo.

## 🟡 LO QUE SE INTUYE (deducción del GTFS + geografía)

Las 5 paradas habilitadas **sí existen** en el GTFS, con coordenadas:

```
1228  P. De La Constitución / Patio De La Infanta      (41.64730, -0.88447)
 632  P. De La Constitución N.º 11 / Plaza Aragón      (41.64800, -0.88367)
 634  P. De La Constitución N.º 33 / Plaza De Los Sitios (41.64761, -0.88021)
1248  P. De La Mina N.º 15                             (41.64860, -0.87722)
1258  P. De La Mina / Centro De Mayores                (41.64890, -0.87671)
```

Constitución y Mina son un eje **oeste→este** consecutivo. Por longitud se puede **conjeturar** un orden.

## 🔴 LO QUE SERÍA INVENTÁRSELO

**El comunicado da 5 paradas habilitadas para la línea 38 — pero NO dice cuáles son de ida y cuáles de vuelta, ni en qué orden.**

Y el reparto **no es simétrico**: hay **3 paradas en Constitución** y **2 en Mina** para **2 sentidos**. No hay forma de repartirlas 1:1.

- ¿Va la 632 en dir0 y la 1228 en dir1? ¿O al revés? → **NO SE SABE.**
- ¿Pasan ambos sentidos por las 3 de Constitución? → **NO SE SABE.**
- ¿Es 1248 la de ida y 1258 la de vuelta? Están a **25 metros**, son casi con seguridad los dos postes enfrentados de la misma parada… **pero el comunicado no lo dice y el GTFS no las tiene en esta línea.**

### La secuencia resultante, marcada por certeza

```
LÍNEA 38 · dir1 (headsign "Bajo Aragón" / "Sentido Miguel Servet")

  681  P. Pamplona 1 (Plaza Paraíso)   🟢 CERTEZA  (última parada normal antes del desvío)
  ────────────── comienza el desvío ──────────────
  ???  ¿1228? ¿632? ¿634?              🔴 INVENTADO  (¿cuáles? ¿en qué orden?)
  ???  ¿1248? ¿1258?                   🔴 INVENTADO  (¿cuál de las dos?)
  ────────────── fin del desvío ──────────────
  585  Miguel Servet 28                🟢 CERTEZA  (reincorporación al recorrido oficial)

  SUPRIMIDAS en este sentido: 666, 335, 741   🟢 CERTEZA
```

> ## **De 4 tramos del recorrido desviado, 2 son CERTEZA y 2 son INVENCIÓN.**
> ### Y la invención está justo en el medio: en el trozo que un mapa tendría que dibujar.

**Y esto es el caso FÁCIL** (5 paradas, todas existen). En Avenida Valencia, la línea 35 tiene **9 paradas habilitadas, de las cuales 3 no existen en el GTFS**. Ahí no hay ni conjetura posible.

---

# 6 · ⚠️ AUTOCORRECCIÓN 2 — EL CICLO DE VIDA PROPUESTO NO FUNCIONA

El diseño dice:

> *"El aviso ENCIENDE y APAGA el parche. Si el aviso desaparece, el desvío desaparece solo. Nadie tiene que acordarse de borrarlo."*

**Eso se rompe con el comunicado nº 1.** Texto literal:

```
Paradas suprimidas por obras en las mismas
2 enero, 2026                                    ← fecha de publicación

PARADAS SUPRIMIDAS
  Desde el lunes 13 de julio, se suprime la parada de Calle Caspe 48, poste 313. Líneas: 30, 22 y Ci4.
  Desde el jueves 25 de junio, se suprime la parada de Cejador Frauca 10, poste 279. Línea: Ci2.
  Desde el lunes 1 de junio, se suprime la parada de Isabel la Católica/Romareda, poste 518. Línea: 42.
  ...
PARADAS YA RECUPERADAS                           ← ¡EN EL MISMO DOCUMENTO!
  Desde el lunes 22 de junio, se suprime la parada de Miguel Servet 204, poste 600. Línea: 38.
  Se recupera el 24 de junio.
  ...
```

**Es un documento VIVO, editado en el sitio.** Fechado en enero, contiene entradas de julio. **Nunca desaparece.**

> ⚠️ **MATIZADO EN LA FASE 6.** Aquí dije que "mezcla en el mismo cuerpo" las vigentes y las recuperadas, dando a entender que no se distinguen. **Sí se distinguen**: hay dos secciones con encabezados `<mark>` de clase CSS distinta, y el corte es parseable.
>
> **Pero la conclusión se agrava, no se ablanda:** la Fase 6 probó contra la API viva que **7 de las 9 paradas que este documento declara suprimidas ya reciben buses**. Una lleva así desde enero. El separador existe; Avanza no lo usa a tiempo.
>
> Ver [Fase 6 — Vigencia](AUDITORIA_FUENTES_ZETABUS_FASE6_VIGENCIA.md).

> ### El ciclo "el aviso desaparece → el parche desaparece" **NO se puede aplicar.** Ni siquiera basta con parsear las dos secciones: hay que **verificar cada supresión contra la API viva**, que es la única que dice la verdad. Si no, ZETABUS tacharía para siempre paradas que ya volvieron.

### 🎁 Pero este mismo documento trae el mejor regalo del informe

```
"se suprime la parada de Calle Caspe 48, poste 313"
"se suprime la parada de Cejador Frauca 10, poste 279"
"se suprime la parada de Isabel la Católica/Romareda, poste 518"
"se suprime la parada de Miguel Servet 204, poste 600"
```

> ## **AVANZA PUBLICA EL NÚMERO DE POSTE.**
> Aquí lo hace en **4 de 9 entradas**. No es sistemático — pero demuestra que **el nº de poste ES parte de su vocabulario público**, y que cuando lo dan, el emparejamiento es **exacto y sin ambigüedad**.

---

# 7 · VEREDICTO: ¿DATO O SUPOSICIÓN?

## Si llenáramos el JSON de desvíos con estos comunicados:

| Campo del JSON propuesto | ¿Qué saldría? |
|---|---|
| Líneas afectadas | 🟢 **DATO** — explícito en los 6 comunicados |
| Paradas suprimidas (postes) | 🟢 **DATO** — 31 de 31 casan contra `stops.txt`, ambigüedades resueltas cruzando líneas |
| Fecha de inicio | 🟡 **DATO parcial** — presente, formato libre ("desde el lunes 26 de mayo") |
| Fecha de fin | 🔴 **casi nunca** — *"hasta finalización de los mismos"*, *"aproximadamente tres meses"* |
| Texto del aviso para el usuario | 🟢 **DATO** — literal, listo para mostrar |
| **`desde` / `hasta` (poste de entrada y salida del desvío)** | 🟡 **DEDUCIBLE** del GTFS + las suprimidas, con esfuerzo y revisión humana |
| **`paradasAlternativas` EN ORDEN** | 🔴 **SUPOSICIÓN** — el comunicado da un conjunto, no una secuencia |
| **`sentido` de cada alternativa** | 🔴 **SUPOSICIÓN** — nunca se dice |
| **Trazado del desvío (geometría)** | 🔴 **SUPOSICIÓN** — solo nombres de calle, y 7 paradas ni siquiera existen |

> # **La respuesta es: DATO para tachar. SUPOSICIÓN para repintar.**

---

# 8 · LO QUE ZETABUS SÍ PUEDE HACER (y es bastante)

**Con rigor total, sin inventar nada:**

1. ✅ **TACHAR** las paradas suprimidas en la ficha de línea y en el mapa. *(31/31 identificadas.)*
2. ✅ **TACHARLAS POR SENTIDO** — intersecando con la secuencia del GTFS. *(Verificado con la línea 38: las 6 suprimidas se reparten 3+3 limpiamente.)*
3. ✅ **AVISAR** en la ficha de línea y en la de parada: *"Esta línea está desviada por obras"*.
4. ✅ **MOSTRAR EL TEXTO ÍNTEGRO** del comunicado, con su fecha y su enlace al original.
5. ✅ **MARCAR EL TRAMO COMO INCIERTO** en el mapa: en vez de dibujar una ruta falsa, **romper la línea** entre el último poste normal y el primero de reincorporación, con un aviso: *"recorrido desviado — consulta el aviso"*. **Eso es honesto y además es informativo.**
6. ✅ **SEÑALAR LAS PARADAS PROVISIONALES** por su nombre, sin pintarlas en el mapa: *"se habilita parada provisional en Alonso V frente al 11"*. Es el texto de Avanza, y es útil.

**Lo que NO debe hacer, nunca:**

7. ❌ **Dibujar la ruta desviada.** Requiere inventar orden y sentido.
8. ❌ **Prometer llegadas en paradas provisionales.** No tienen poste: la API viva no las conoce.

---

# 9 · IMPACTO EN LA ARQUITECTURA

| Decisión | Estado |
|---|---|
| **Fuente de alteraciones** | ⚠️ **CAMBIA:** endpoint `get_alteraciones_servicio` por línea (46 llamadas), **no el RSS**. El RSS pierde el 50 % de lo vigente. |
| **Ciclo de vida "el aviso apaga el parche"** | ⚠️ **NO SIRVE tal cual.** El documento *"Paradas suprimidas"* es un documento vivo permanente. Hay que parsear su interior y separar VIGENTES de YA RECUPERADAS. |
| **JSON de desvíos: `paradasAnuladas`** | ✅ **VIABLE Y ES DATO.** Transcripción legítima. |
| **JSON de desvíos: `paradasAlternativas` en orden + por sentido** | ❌ **SE ELIMINA DEL DISEÑO.** Sería invención. |
| **Repintado de ruta desviada en el mapa** | ❌ **SE ELIMINA DEL DISEÑO.** |
| **Tramo roto + aviso + texto del comunicado** | 🆕 **Sustituye al repintado.** Honesto, y no cuesta nada. |
| **`shapes.txt` durante un desvío** | ⚠️ **El shape del GTFS es la ruta NORMAL.** Durante las obras es incorrecto en el tramo desviado. **No pintarlo entero: cortarlo en los postes de entrada/salida del desvío.** |

---

# 10 · NO VERIFICADO

- **Si el endpoint tiene paginación con más histórico.** Solo consulté `paged=1`. Los 6 vigentes salieron del barrido de 46 líneas; podría haber más en páginas posteriores. **No lo he comprobado.**
- **Si "Paradas más próximas" (Oviedo) significa "el bus para ahí"** o solo "camina hasta ahí". El texto no lo aclara. **Lo he tratado como consejo peatonal, que es lo conservador.** Si significara lo primero, el caso Oviedo sí sería reconstruible.
- **Si las 7 paradas provisionales aparecerán en el GTFS** en la próxima regeneración del feed. **No lo sé.** Hoy no están.
- **El reparto real por sentido de las paradas habilitadas.** Solo lo sabría alguien que se suba al bus, o el propio Avanza. **No se puede deducir.**

---

# CONCLUSIÓN

**La hipótesis de Antonio era razonable y estaba medio bien fundada: los comunicados SÍ son mucho más ricos de lo que parecía desde el índice.** Traen paradas suprimidas nombradas, paradas habilitadas nombradas, narrativa por sentido y hasta números de poste en algunos casos.

**Pero les falta exactamente lo único que hace falta para dibujar una ruta: el ORDEN y el SENTIDO de las paradas del desvío.** Y una de cada cuatro paradas del recorrido alternativo **ni siquiera existe** como poste.

> ### **"Solo se puede tachar" es la respuesta. Y es una buena respuesta.**
>
> Tachar las paradas suprimidas, por sentido, con certeza total; avisar; romper la línea en el tramo desviado en vez de mentir con una curva inventada; y enseñar el texto de Avanza.
>
> **Eso es un producto honesto. Y hace el 90 % del trabajo útil.**
>
> El otro 10 % —la curva bonita en el mapa— **solo se puede conseguir mintiendo.** No merece la pena.

---

*Auditoría realizada sobre los 6 comunicados vigentes leídos íntegros, cruzados contra las 934 paradas de `stops.txt`. Lo no verificable está marcado. Las dos autocorrecciones a la Fase 4 están señaladas de forma explícita.*
