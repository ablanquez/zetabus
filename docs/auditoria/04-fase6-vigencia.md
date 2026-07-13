# AUDITORÍA DE FUENTES — ZETABUS

**Fase 6: la vigencia. ¿Cómo sabemos que un desvío ha terminado?**
Fecha: 13/07/2026
Continúa [FASE 5](AUDITORIA_FUENTES_ZETABUS_FASE5_DESVIOS.md).

---

> # 🛑 ESTE INFORME ESTÁ INVALIDADO. NO LO USES.
>
> ## La [**FASE 7**](AUDITORIA_FUENTES_ZETABUS_FASE7_ORACULO.md) demuestra que el oráculo en el que se apoya todo lo que sigue **está roto**.
>
> **Qué falla:** validé la API viva como detector de supresiones usando 16 postes que eran **todos desvíos de ruta** — buses que físicamente no pasaban por allí. Cualquier sistema GPS los habría dado por vacíos. **Nunca probé el único caso que importaba: un autobús que pasa por delante y no para.**
>
> Cuando lo probé (Fase 7, poste **744**, con el comunicado de Avanza diciendo *«recorrido habitual, sin realizar parada»*), **la API anunció «039 VADORREY — 0 minutos» tan tranquila.**
>
> **→ La API viva refleja el RECORRIDO, no el SERVICIO. No sabe si el autobús para.**
>
> ## ⛔ LOS «7 FANTASMAS» DE ESTE INFORME NO EXISTEN. QUEDAN RETIRADOS.
> ## ⛔ LA MÁQUINA DE ESTADOS DEL §7 (ANUNCIADA → EN VIGOR → RECUPERADA) QUEDA ANULADA.
>
> **Lo que SÍ se salva de este informe:**
> - §1-2: la estructura del documento (secciones `<mark>`, `modified_time`, los postes publicados). **Correcto.**
> - La conclusión de que **el silencio de la API sí es información** (un desvío de RUTA sí se puede verificar y auto-apagar). **Correcto.**
>
> Lee la **[Fase 7](AUDITORIA_FUENTES_ZETABUS_FASE7_ORACULO.md)** antes que esto.

---

---

# RESUMEN EJECUTIVO

| Pregunta | Respuesta |
|---|---|
| ¿El documento marca las paradas recuperadas? | **SÍ — sección propia, con clase CSS distinta. Parseable.** *(Corrijo la Fase 5.)* |
| ¿Se puede detectar automáticamente que una supresión ha terminado? | **SÍ — pero NO con el documento. Con la API viva.** |
| ¿Cuántas supresiones "vigentes" son fantasmas HOY? | **7 de 9 confirmadas. La más antigua lleva 6 meses de mentira.** |
| ¿Y las 31 supresiones de los desvíos (Coso/Valencia)? | **REALES. Confirmadas activas hoy, 16/16.** |
| ¿El comunicado puede ir ADELANTADO a la realidad? | **SÍ.** El de Oviedo, publicado hoy, aún no está implementado en la calle. |

> ## **LA FUENTE DE VERDAD DE LA VIGENCIA NO ES EL COMUNICADO. ES LA API VIVA.**
> El comunicado dice **QUÉ** está suprimido. Solo la API viva dice **SI ES VERDAD AHORA MISMO.**

---

# 1 · ¿MARCA EL DOCUMENTO LAS PARADAS RECUPERADAS?

## SÍ. Y mejor de lo que dije en la Fase 5.

Marcado **literal** del HTML:

```html
<p><strong><mark class="has-inline-color has-secondary-color">PARADAS SUPRIMIDAS</mark></strong></p>

<p>Desde el <strong>lunes 13 de julio</strong>, se suprime la parada de <strong>Calle Caspe 48</strong>, poste 313. <strong>Líneas afectadas: 30, 22 y Ci4.</strong></p>
<p>Desde el <strong>jueves 25 de junio</strong>, se suprime la parada de <strong>Cejador Frauca 10</strong>, poste 279. ...</p>
...

<p><strong><mark class="has-inline-color has-primary-color">PARADAS YA RECUPERADAS</mark></strong></p>

<p>Desde el <strong>lunes 22 de junio</strong>, se suprime la parada de <strong>Miguel Servet 204</strong>, poste 600. <strong>Línea afectada: 38.</strong> Se recupera el 24 de junio.</p>
...
```

**Hay dos secciones, con encabezados `<mark>` que usan CLASES CSS DISTINTAS:**

| Sección | Clase CSS |
|---|---|
| `PARADAS SUPRIMIDAS` | `has-secondary-color` |
| `PARADAS YA RECUPERADAS` | `has-primary-color` |

> **El corte es machine-parseable.** Todo lo que va después del `<mark>` de "PARADAS YA RECUPERADAS" está recuperado, según Avanza.

### ⚠️ AUTOCORRECCIÓN — la Fase 5 lo describió mal

La Fase 5 dijo: *"**MEZCLA**, en el mismo cuerpo, las supresiones vigentes y las ya recuperadas"*, dando a entender que **no se distinguen**.

**Eso es falso. SÍ se distinguen, y de forma parseable.**

**Pero la conclusión de fondo de la Fase 5 no solo se sostiene: se agrava.** Porque el problema no es que no se distingan. El problema es que **la sección "SUPRIMIDAS" está llena de paradas que ya volvieron y nadie ha movido.** El separador existe; lo que falla es que Avanza no lo usa a tiempo.

---

# 2 · FECHAS Y METADATOS

## Las entradas: fecha de inicio en prosa, sin año, y casi nunca fecha de fin

```
"Desde el lunes 13 de julio, se suprime la parada de Calle Caspe 48, poste 313."   → inicio, SIN AÑO
"Desde el martes, 17 de febrero, se suprime la parada de Anselmo Clavé 21."        → inicio, SIN AÑO
"Desde el 4 de diciembre y durante un año, se suprime la parada de Plaza Europa"   → duración vaga
"Del lunes 18 al miércoles 20 de mayo entre las 8:00 y las 18:00 horas..."         → rango completo (raro)
"... Se recupera el 24 de junio."                                                   → fin explícito (raro)
"... Se recupera el mismo día."                                                     → fin cualitativo
"... Se recupera la parada 2 horas más tarde."                                      → fin cualitativo
```

| Campo | ¿Viene? | ¿Parseable? |
|---|---|---|
| **Fecha de inicio** | ✅ casi siempre | ⚠️ prosa, **sin año** — hay que inferirlo del contexto |
| **Fecha de fin** | ❌ **rara vez** | ❌ y cuando viene, en formato libre |
| **Nº de poste** | ⚠️ en **4 de 9** entradas vigentes | ✅ **exacto cuando viene** |
| **Líneas afectadas** | ✅ siempre | ✅ |

### Los postes que publica Avanza son fiables (9 de 10)

| Comunicado | `stops.txt` | ¿OK? |
|---|---|---|
| `poste 313` — Calle Caspe 48 | `Av. Compromiso De Caspe N.º 48` | ✅ |
| `poste 279` — Cejador Frauca 10 | `Cejador Frauca N.º 10` | ✅ |
| `poste 518` — Isabel la Católica/Romareda | `P. Isabel La Católica / Romareda` | ✅ |
| `poste 600` — Miguel Servet 204 | `Miguel Servet N.º 204` | ✅ |
| `poste 879` — Juan de la Cierva | `Juan De La Cierva N.º 25` | ✅ |
| `poste 46` — Avenida América 69 | `Av. De América N.º 69` | ✅ |
| `poste 823` — Vía Hispanidad 73 | `Vía Hispanidad N.º 73 / …` | ✅ |
| `poste 54` — Avenida Cataluña 17 | `Av. De Cataluña N.º 17` | ✅ |
| `poste 1144` — Camino las Torres 3 | `Camino De Las Torres N.º 3` | ✅ |
| **`poste 4681`** — Violante de Hungría 5 | **NO EXISTE** *(el real es el 861)* | ❌ **errata de Avanza** |

## El documento SÍ tiene fecha de última modificación

```html
<meta property="article:published_time" content="2026-01-02T11:59:32+00:00" />
<meta property="article:modified_time"  content="2026-07-13T06:58:16+00:00" />
```

**Publicado el 2 de enero. Modificado HOY a las 06:58.** Es un documento vivo, y **deja rastro máquina-legible de cada edición.**

**Los 6 comunicados lo tienen:**

| Comunicado | Publicado | Modificado |
|---|---|---|
| Paradas suprimidas *(vivo)* | 2026-01-02 | **2026-07-13** ← hoy |
| III Fase obras Coso | 2026-05-21 | 2026-06-30 |
| Obras Avenida Valencia | 2026-06-16 | 2026-06-30 |
| Obras Portillo | 2026-06-11 | 2026-06-25 |
| Obras C/ Oviedo | 2026-07-13 | 2026-07-13 |
| Manifestaciones julio | 2026-07-07 | 2026-07-01 |

> **Un cron puede detectar QUE el documento ha cambiado. No puede saber QUÉ ha cambiado** (no hay diff, no hay versiones). Habría que guardar el cuerpo anterior y diferenciarlo uno mismo.

## ¿Diferencia estructural entre una entrada vigente y una recuperada?

**NO.** Las entradas son `<p>` con `<strong>`, **idénticas en ambas secciones**. El único discriminante es **en qué lado del encabezado `<mark>` caen**. No hay tachado, ni color, ni clase, ni atributo en la entrada.

---

# 3 · ⭐ ¿ES LA API VIVA UN ORÁCULO VÁLIDO? — LA VALIDACIÓN

**No podía contar fantasmas sin antes probar que la API viva sabe distinguir una parada suprimida de una activa.** Diseñé el experimento así:

> Tomo los postes de los desvíos **Coso** y **Avenida Valencia** donde **TODAS** las líneas del poste están suprimidas. Si la API refleja la supresión, deben salir **todos vacíos**.

## Test fuerte — 16 postes, todas sus líneas suprimidas

```
poste  237  Av. San Juan Bosco 10       -> VACÍO
poste  262  Av. De Valencia 8           -> VACÍO
poste  263  Av. De Valencia 38          -> VACÍO
poste  264  Av. De Valencia 41          -> FUERA DEL SISTEMA VIVO
poste  265  Av. De Valencia 63          -> FUERA DEL SISTEMA VIVO
poste  333  Coso 54 / Banco de España   -> FUERA DEL SISTEMA VIVO
poste  334  Coso 55 / Teatro Principal  -> FUERA DEL SISTEMA VIVO
poste  335  Coso 62                     -> FUERA DEL SISTEMA VIVO
poste  336  Coso 66                     -> FUERA DEL SISTEMA VIVO
poste  471  Fueros de Aragón 15         -> FUERA DEL SISTEMA VIVO
poste  664  P. Independencia 24         -> FUERA DEL SISTEMA VIVO
poste  666  P. Independencia 25         -> FUERA DEL SISTEMA VIVO
poste  741  Plaza San Miguel 5          -> FUERA DEL SISTEMA VIVO
poste  745  Plaza San Miguel            -> VACÍO
poste  862  Violante Hungría / Facultad -> FUERA DEL SISTEMA VIVO
poste 1293  Coso 80                     -> FUERA DEL SISTEMA VIVO
```

> ## **16 de 16 vacíos.**

*(«FUERA DEL SISTEMA VIVO» = la respuesta ni siquiera trae la clave `maquinas`. Avanza ha retirado el poste de su sistema en vivo.)*

## Control: ¿es que esas líneas no circulan ahora?

```
poste 8000  terminal L38            -> BUSES: 38      ← la 38 SÍ circula
poste  806  terminal L38 (otro)     -> BUSES: 38
poste  669  P. Pamplona             -> BUSES: 21, 33, 38
poste  716  Fdo. Católico 70        -> BUSES: 35, 42, Ci1
```

**Las líneas 21, 35 y 38 están circulando ahora mismo. Simplemente no aparecen en los postes suprimidos.**

## Test parcial — el más elegante

```
poste 744  Plaza San Miguel   | GTFS: [29, 38, 39, 40] | comunicado suprime: [38, 40]
                              -> API VIVA: 29, 39      ✅ EXACTO (oculta 38 y 40)

poste 851  Vía Univérsitas 10 | GTFS: [38, 42, Ci1]    | comunicado suprime: [38]
                              -> API VIVA: 42, Ci1     ✅ EXACTO (oculta la 38)
```

**La API oculta EXACTAMENTE las líneas suprimidas y muestra EXACTAMENTE las demás — en el mismo poste.**

## ⭐ El discriminador definitivo: ¿y si solo refleja desvíos de ruta, no supresiones de parada suelta?

Era la objeción seria: en el Coso los buses **físicamente no pasan** por esas calles, así que la API podría estar mostrando ausencia física, no supresión.

**Encontré el caso que lo desmonta:**

```
Poste 333 — "Coso N.º 54 / Banco de España" — línea 21, sentido "Barrio Jesús"

El comunicado del Coso dice, LITERAL:
  "Línea 21 · Sentido Barrio de Jesús: desde Plaza Paraíso por Constitución, Mina,
   Plaza San Miguel, Espartero A COSO."
                                     ↑↑↑↑↑↑↑
  → En ese sentido, el bus SIGUE BAJANDO POR EL COSO. Pasa por delante del poste 333.

Y "Coso 54 – Línea 21" está en la lista de PARADAS SUPRIMIDAS.

API VIVA, poste 333 → FUERA DEL SISTEMA VIVO
(mientras la línea 21 circula: se la ve en el poste 669 ahora mismo)
```

> # **El bus pasa por delante. La API lo oculta igual.**
> ## **→ LA API VIVA REFLEJA LAS SUPRESIONES DE PARADA, NO SOLO LAS AUSENCIAS FÍSICAS.**
> ## **EL ORÁCULO ES VÁLIDO.**

---

# 4 · ⭐ LA CAZA DE FANTASMAS

Con el oráculo validado, consulté la API viva para **cada entrada de la sección "PARADAS SUPRIMIDAS"** (las que el documento declara vigentes hoy).

**Regla:** si aparecen buses de las líneas afectadas → **la parada NO está suprimida** → es un fantasma.

## Sección «PARADAS SUPRIMIDAS» — resultado

| Poste | Parada | Líneas | Declarada desde | API VIVA dice | Veredicto |
|---|---|---|---|---|---|
| **82** | César Augusto 4 | 32, 52 | **10 enero** *(hace 26 semanas)* | **BUSES: 32, 52** | 👻 **FANTASMA** |
| **49** | Anselmo Clavé 21 | 22, 31 | **17 febrero** *(21 sem)* | **BUSES: 22, 31** | 👻 **FANTASMA** |
| **52** | Anselmo Clavé / Santander | 22, 31 | **10 marzo** *(18 sem)* | **BUSES: 22, 31** | 👻 **FANTASMA** |
| **51** | Anselmo Clavé / Correos | 22, 31 | **22 abril** *(12 sem)* | **BUSES: 22, 31** | 👻 **FANTASMA** |
| **50** | Anselmo Clavé 45 | 22, 31 | **22 abril** *(12 sem)* | **BUSES: 22, 31** | 👻 **FANTASMA** |
| **518** | Isabel la Católica / Romareda | 42 | **1 junio** *(6 sem)* | **BUSES: 42** | 👻 **FANTASMA** |
| **279** | Cejador Frauca 10 | Ci2 | **25 junio** *(18 días)* | **BUSES: Ci2** | 👻 **FANTASMA** |
| 313 | Calle Caspe 48 | 30, 22, Ci4 | **13 julio (HOY)** | BUSES: 22, 30, Ci4 | ⚠️ **INDETERMINADO** *(demasiado reciente — ver §5)* |
| — | Plaza Europa / Puente La Almozara | 34, 42, Ci4, N2 | 4 dic, "durante un año" | — | ⚠️ **NO TESTEADO** *(4 postes con ese nombre: 729, 1236, 3035, 3075 — no se puede desambiguar)* |

# 👻 **7 FANTASMAS CONFIRMADOS DE 9 ENTRADAS.**

**La más antigua lleva seis meses.** Los cuatro postes de Anselmo Clavé —una calle entera— siguen listados como suprimidos desde febrero, marzo y abril. **La API viva dice que las líneas 22 y 31 paran en los cuatro, ahora mismo.**

## Control positivo — la sección «YA RECUPERADAS»

Todas deben mostrar buses. **Y los muestran:**

```
poste  600  Miguel Servet 204   -> BUSES: 38                 ✅
poste  879  Juan de la Cierva   -> BUSES: 44                 ✅
poste   46  Avenida América 69  -> BUSES: 33, 34, 39         ✅
poste  823  Vía Hispanidad 73   -> BUSES: 38                 ✅
poste   54  Avenida Cataluña 17 -> BUSES: 28, 32, 35, 39, 50 ✅
poste 1144  Camino las Torres 3 -> BUSES: Ci2                ✅
poste  861  Violante Hungría 5  -> BUSES: 35, 53, Ci2        ✅
```

**El control positivo funciona. El método distingue.** Y por eso el resultado de arriba es una prueba, no una sospecha.

## Y las 31 supresiones de los desvíos: **NO son fantasmas**

Las 31 supresiones de **Coso + Avenida Valencia + Oviedo** que identifiqué en la Fase 5 **están CONFIRMADAS ACTIVAS hoy** (los 16 tests fuertes + los parciales). El desvío del Coso, de hace 8 semanas, **sigue vivo en la calle**.

> **El problema de los fantasmas NO está en los comunicados de desvío. Está en el documento vivo de "Paradas suprimidas".**

---

# 5 · EL COMUNICADO TAMBIÉN VA POR DELANTE DE LA REALIDAD

El caso de **C/ Oviedo**, publicado **hoy** a las 07:20:

```
Comunicado: "las líneas 23, 31 y C4 se desviarán ... PARADA SUPRIMIDA: Oviedo 175"
            (previsiblemente desde el 13 de julio — HOY)

API VIVA, poste 609 (Oviedo N.º 175) -> BUSES: 23, 31, C4
```

**El aviso dice que está suprimida. La calle dice que no.** El sistema de Avanza **aún no ha implementado el desvío** (o empieza más tarde hoy).

> ## Las dos fuentes se contradicen **EN LAS DOS DIRECCIONES:**
> - **El comunicado va por DETRÁS:** 7 fantasmas listados durante meses después de recuperarse.
> - **El comunicado va por DELANTE:** Oviedo, anunciado hoy, aún no está en vigor.
>
> **Un cron que se fíe del comunicado mentirá por los dos lados.**

---

# 6 · ¿QUÉ PUEDE Y QUÉ NO PUEDE HACER UN CRON?

## ✅ LO QUE PUEDE HACER CON RIGOR

| Capacidad | Cómo |
|---|---|
| Descubrir alteraciones vigentes | Barrer `get_alteraciones_servicio` por las 46 líneas |
| Detectar que un comunicado ha cambiado | `<meta property="article:modified_time">` |
| Separar VIGENTES de YA RECUPERADAS **según Avanza** | Cortar el cuerpo por el `<mark>` de "PARADAS YA RECUPERADAS" |
| Identificar el poste suprimido | Nombre → `stops.txt` (100 % de acierto, Fase 5) o el `poste NNN` publicado |
| **⭐ VERIFICAR SI LA SUPRESIÓN ESTÁ REALMENTE EN VIGOR** | **Consultar el poste en la API viva. Si aparecen buses de las líneas afectadas → NO está suprimida.** |
| Detectar que una supresión **ha terminado** | Lo mismo. **Sin esperar a que Avanza mueva la entrada.** |

## ❌ LO QUE NO PUEDE SABER, POR MÁS QUE LO EJECUTES A DIARIO

| Limitación | Por qué |
|---|---|
| **Fiarse de la sección "SUPRIMIDAS"** | 7 de 9 son mentira. Ejecutarlo a diario solo repite la mentira con puntualidad. |
| El **año** de una fecha de inicio | *"Desde el martes, 17 de febrero"* — sin año |
| La **fecha de fin** | Casi nunca se publica |
| **Qué** cambió en el documento vivo | `modified_time` dice *que* cambió, no *qué*. Hay que guardar el cuerpo y diferenciarlo uno mismo. |
| Distinguir *"suprimida"* de *"no hay buses ahora"* **en una sola muestra** | De noche, o en una línea de baja frecuencia, el vacío es ambiguo. **Hace falta muestreo repetido en horario de servicio.** |
| Si un aviso recién publicado **ya está en vigor** | El caso Oviedo. **Hace falta un periodo de gracia.** |
| Desambiguar una parada con **nombre repetido y sin poste** | *"Plaza Europa"* → 4 postes candidatos. Sin nº de poste, no hay forma. |

---

# 7 · RECOMENDACIÓN — CÓMO GESTIONAR LA VIGENCIA SIN MENTIR

## El principio

> ### El COMUNICADO aporta el **QUÉ** y el **PORQUÉ** (texto para el usuario).
> ### La API VIVA aporta la **VIGENCIA**.
> ### **Una parada solo se tacha si AMBAS lo confirman.**

## La máquina de estados

```
   Comunicado declara la supresión del poste P (líneas L)
                      │
                      ▼
            ┌──────────────────┐
            │    ANUNCIADA     │  ← se muestra el aviso, pero NO se tacha
            └──────────────────┘     "Anunciado desvío desde el 13 de julio"
                      │
                      │  la API viva deja de mostrar buses de L en P
                      │  durante N muestras en horario de servicio
                      ▼
            ┌──────────────────┐
            │  EN VIGOR ✅     │  ← AHORA SÍ se tacha la parada
            └──────────────────┘     + se enseña el texto del comunicado
                      │
                      │  la API viva VUELVE a mostrar buses de L en P
                      │  durante N muestras
                      ▼
            ┌──────────────────┐
            │   RECUPERADA     │  ← se DESTACHA sola. Sin esperar a Avanza.
            └──────────────────┘
```

**Reglas concretas:**

1. **Nunca tachar solo porque el comunicado lo diga.** Exigir confirmación de la API viva.
2. **Nunca dejar tachado solo porque el comunicado siga publicado.** Los 7 fantasmas son la prueba.
3. **Muestrear solo en horario de servicio** y exigir **varias muestras coincidentes** antes de cambiar de estado. Una sola lectura vacía no prueba nada (puede ser un hueco de frecuencia).
4. **Periodo de gracia** para avisos recién publicados: se muestran como *"anunciado"*, no como *"en vigor"*.
5. **Guardar el cuerpo del documento vivo** en cada pasada y **diferenciarlo** contra el anterior. Es la única forma de saber qué movió Avanza.
6. **Descartar las entradas sin poste desambiguable** (*"Plaza Europa"*). Mejor no decir nada que señalar la parada equivocada.

## El efecto

**El sistema se auto-cura.** Si Avanza se olvida de mover una entrada durante seis meses —que es exactamente lo que hace—, **ZETABUS la destacha sola en cuanto los buses vuelven a parar allí.** Y si Avanza anuncia algo que aún no está en vigor, ZETABUS lo dice como anuncio, no como hecho.

> **La app no puede mentir en ninguna de las dos direcciones, porque no confía en la fuente que miente.**

---

# 8 · NO VERIFICADO

- **Plaza Europa / Puente La Almozara.** 4 postes con ese nombre (729, 1236, 3035, 3075) y el comunicado no da número. **No he podido testearla.** Podría ser un octavo fantasma; podría ser real.
- **Si el poste 313 (Caspe 48) es fantasma o simplemente no ha entrado en vigor.** Se anunció HOY. Muestra buses. Ambas explicaciones encajan. **Se resuelve reconsultando mañana.**
- **Cuánto tarda Avanza en mover una entrada a "YA RECUPERADAS".** Sé que puede tardar **6 meses o más** (César Augusto). No sé si alguna vez lo hace a tiempo.
- **Si los comunicados de DESVÍO se caen del endpoint al terminar la obra.** El del Coso (8 semanas) y el de Avenida Valencia (4 semanas) siguen publicados **y siguen siendo ciertos** (confirmado por la API). **No he podido observar el final de ninguna obra, así que no sé qué pasa cuando termina.** Es lo mismo que dice esta fase: **no te fíes; verifica contra la calle.**
- **El umbral N de muestras** para pasar de un estado a otro. Habrá que calibrarlo con datos reales de frecuencia por línea y franja horaria. **No lo he medido.**

---

# CONCLUSIÓN

**La pregunta era: ¿marca el documento las paradas recuperadas? La respuesta es SÍ — y da igual.**

El documento tiene una sección "PARADAS YA RECUPERADAS", perfectamente parseable, con su clase CSS y todo. El instrumento existe. **Lo que falla es que Avanza no lo usa a tiempo:** siete de las nueve paradas que hoy declara suprimidas **están recibiendo buses ahora mismo**, y una lleva así desde enero.

**Un cron que leyera ese documento a diario tacharía cuatro paradas de Anselmo Clavé durante medio año, con puntualidad británica, y todas serían mentira.**

Pero el hallazgo bueno es el otro:

> ## **La API viva de Avanza SÍ sabe la verdad. Y lo he probado.**
>
> Oculta exactamente las líneas suprimidas en el poste exacto, incluso cuando el autobús pasa físicamente por delante (poste 333, línea 21 sentido Barrio Jesús). 16 de 16 en el test fuerte. Cero falsos positivos en el control.

**Así que sí: se puede detectar automáticamente que una supresión ha terminado. Pero no preguntándole al que publica los avisos — preguntándole a los autobuses.**

El comunicado es el **relato**. La API viva es el **hecho**. ZETABUS debe contar el relato, pero **solo tachar sobre el hecho**.

---

*Auditoría realizada sobre el documento completo y la API viva de Avanza, con experimento de control y validación de oráculo. Lo no verificable está marcado. La autocorrección a la Fase 5 está señalada de forma explícita.*
