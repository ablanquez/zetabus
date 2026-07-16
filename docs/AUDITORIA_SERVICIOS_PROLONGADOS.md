# Auditoría — recorridos que se prolongan ciertos días (34, 44)

**Fecha:** 2026-07-16 · **Peticiones a Avanza:** 4 (`get_stops_list` de 34 y 44, dos sentidos) ·
**Código tocado:** ninguno.

Fenómeno distinto de las obras y de las cabeceras dobles: un recorrido cuya ruta **NORMAL** (casi
todos los días) es más corta, y que **ciertos días se prolonga** a un terminal extra. ZetaBus toma
como referencia el recorrido **largo** y marca la diferencia como si fuera un desvío de obras —
cuando hoy, día normal, es lo esperado.

---

## Veredicto en una línea

> **`get_stops_list` NO dice hasta dónde llega hoy: devuelve la ruta LARGA (estática), con la
> prolongación incluida, aunque hoy no circule.** Por eso el itinerario pinta Parque de Atracciones
> (34) y Campus Río Ebro (44) como terminal y marca el terminal REAL de hoy (Cementerio / Pablo Ruiz
> Picasso) como *"hoy no pasa"* y la prolongación como *"provisional·desvío"* — **los dos rótulos
> falsos**, y encima **contradiciendo al propio bloque de terminal de la misma página**, que sí da
> el terminal corto correcto. Distinguir automáticamente *"servicio no prolongado"* de *"desvío de
> obras que corta el final"* **no es fiable con las fuentes de hoy** → me paro en ese punto (Q5).

---

## Lo que se midió

- **Lado GTFS** (offline, todos los trips de las 457 fechas del feed): primera/última parada de cada
  sentido, con cuántos trips y cuántos días distintos la sirven, y si circula **hoy** (`20260716`).
- **Lado Avanza** (4 peticiones): `get_stops_list` de 34 y 44, sentidos −1/−2, tal como lo lee el
  motor de desvíos.
- **Lado código**: `engine/desvios.ts` (el diff) y `app/linea/[linea]/page.tsx` + `Itinerario.tsx`
  (qué recorrido se pinta).

---

## 1 · ¿`get_stops_list` de hoy dice hasta dónde llega? → **NO**

Lo que devuelve **hoy** (16 jul), tal cual:

| Línea · sentido Avanza | Terminal que devuelve `get_stops_list` |
|---|---|
| 34 −1 (→Cementerio/Atracc.) | **617 · Parque de Atracciones** (pasando por 649 *"Velódromo (Dir.P.Atracc.)"*) — **no** lista Cementerio como final |
| 34 −2 (desde Atracc.) | **arranca en 617 · Parque de Atracciones** → 888 Cementerio → … → Delicias |
| 44 −1 | **445 · Campus Río Ebro** |
| 44 −2 | **arranca en 445 · Campus Río Ebro** → 616 Pablo Ruiz Picasso → … → Miraflores |

⇒ Devuelve la ruta **larga con la prolongación**, en las dos líneas. Para la 44, además, **hoy la 44
no circula** (0 trips el 16 jul) y aun así `get_stops_list` sirve el trazado completo hasta Campus
Río Ebro. **`get_stops_list` es la ruta estática/máxima, no la operativa de hoy.**

⚠️ Matiz honesto: no puedo confirmar *desde el dato* que hoy la 34 no se prolongue (Parque de
Atracciones **no existe en el GTFS**, ver §3; y julio es temporada de parque). Que hoy sea "corto" lo
aporta tu conocimiento de campo. Lo que el dato **sí** demuestra es que `get_stops_list` **no
discrimina el día**: sirve la prolongación igual. Para saber cuál es el terminal de hoy, esta fuente
no vale.

---

## 2 · ¿De qué recorrido base tira hoy cada bloque? — **y se contradicen**

| Bloque | Fuente | Terminal que muestra para 34 dir0 |
|---|---|---|
| **Itinerario** (`Itinerario.tsx`) | `get_stops_list` (la "real", *manda siempre que se pueda leer*, `page.tsx:196-213`) | **Parque de Atracciones** (largo); Cementerio → *tachado "hoy no pasa"*; leg 649→617 → *provisional·desvío* |
| **Bloque de terminal** (`Terminal.tsx`) | GTFS modal (`terminal.ts`) | **Cementerio** (corto, correcto) |

El diff (`desvios.ts`) hace `GTFS − get_stops_list`:
- `fuera` (en GTFS, no en la ruta de hoy) = **Cementerio (888)** → *"hoy el autobús NO pasa"*.
- `hacia` (en la ruta de hoy, no en GTFS) = **649, 648, 647, 617** → *"provisional·desvío"*.

Es un **fork de terminal**: prefijo común hasta 887 (Fray Julián Garcés/Rne), y ahí bifurca —
GTFS→Cementerio, `get_stops_list`→Parque de Atracciones—. Como el diff presupone que `get_stops_list`
= *"lo que hace hoy"* (premisa central del proyecto, `desvios.ts:4-21`), da por bueno el largo y
tacha el corto. **Ahí está el fallo: la premisa no se cumple para las prolongaciones.** El itinerario
pinta un terminal, el bloque de terminal pinta otro, en la misma pantalla.

La 44 es idéntica: prefijo común hasta 615, `fuera` = **616 (Pablo Ruiz Picasso)**, `hacia` = **565,
1075, 445 (Campus Río Ebro)**.

---

## 3 · ¿El GTFS codifica la prolongación por calendario? — **44 sí, 34 no**

| | 34 → Parque de Atracciones (617) | 44 → Campus Río Ebro (445) |
|---|---|---|
| ¿Existe la parada en el GTFS? | **NO.** El poste 617 no existe; ninguna parada contiene "Atracciones"; la 34 lo toca **0 veces** en las 457 fechas | **SÍ.** p445 está en el feed |
| ¿La sirve la línea? | nunca (ausente) | dir0 destino: 445 en **117 trips / 42 días**; base 616 en 186 trips / 72 días. dir1 origen: igual |
| ¿Circula hoy (16 jul)? | la 34 sí circula, y en GTFS acaba en **Cementerio (888)** — sin rastro de 617 | **la 44 no circula hoy** (0 trips); 445 solo en 42 de los 72 días que la 44 opera |

⇒ **44**: la extensión **está en el GTFS y es calendar-gated** (42/72 días) → el GTFS **sí sabe** qué
días se prolonga. **34**: la extensión **no está en el GTFS en absoluto** → el GTFS **no puede** saberlo;
solo aparece en `get_stops_list`. Son **dos subcasos distintos** del mismo síntoma en pantalla.

---

## 4 · ¿Cuántas líneas más? (sin sesgo de oráculo)

Barrido de red de **terminales alternos day-gated en el GTFS** (2.º terminal con ≥10 trips y
cobertura de días < 70 % del modal):

| Línea | Terminal alterno | Cobertura |
|---|---|---|
| **44** dir0/dir1 | Campus Río Ebro (445) | 42 / 72 días — la prolongación de verdad |
| 39 dir1 origen | Av. San José 70 (p226) | 18 trips / 36 días, 0 días exclusivos → refuerzo, no prolongación |

⇒ **Prolongaciones codificadas en el GTFS: prácticamente solo la 44.** (39 es un refuerzo de arranque.)

⚠️ **PERO el subcaso de la 34 (extensión ausente del GTFS, presente solo en `get_stops_list`) es
INVISIBLE a cualquier barrido del GTFS.** Para enumerarlas TODAS habría que pedir `get_stops_list` de
las ~40 líneas y comparar su terminal con el del GTFS — más peticiones de las mínimas que pediste. No
lo he hecho. Lo dejo acotado: **34 confirmada; puede haber más de su tipo, y solo se ven pidiendo
línea por línea.** La señal a buscar: `get_stops_list` termina en una parada que no está en la traza
GTFS (un `hacia` en el extremo).

---

## 5 · ⚠️ ¿Se puede distinguir "servicio no prolongado" de "desvío de obras"? — **solo a medias → PÁRATE**

Hay que separar tres formas del diff:

| Forma del diff | Estructura | ¿Separable? |
|---|---|---|
| **DESVÍO DE OBRAS interior** | prefijo común, chunk cambiado **en medio**, sufijo común → **reengancha** y acaba en el **MISMO** terminal | ✅ **Sí**, estructuralmente: hay reenganche y el terminal coincide |
| **DIFERENCIA DE TERMINAL** (prolongación / terminal alterno) | prefijo común y **bifurca** al final a **terminal distinto**, **sin reenganchar** | ✅ Se detecta que es *terminal*, no interior |
| **SUPRESIÓN** (para pero no anuncia) | `get_stops_list` no cambia | ❌ Indetectable (como siempre, `desvios.ts:22-34`) |

Lo que **sí** se puede: distinguir **"obras interior"** de **"diferencia de terminal"** — reenganche
vs bifurcación, y si el terminal final coincide. Eso es medible y fiable.

Lo que **NO** se puede con fiabilidad, y es lo que me para:
> Dentro de "diferencia de terminal", **no se separa** *"prolongación que hoy no toca"* de *"obras que
> cortan/desvían el final"*. Las dos son un fork de terminal. Para decidir cuál es:
> - `get_stops_list` no ayuda: **no discrimina el día** (§1), siempre da el largo.
> - El GTFS ayuda **solo si la extensión está en él** (44 sí → el calendario dice si hoy toca; 34 no →
>   ausente, no dice nada).
> - Si no está en ninguna fuente el "qué toca hoy" (caso 34), es **como las supresiones**: solo
>   **avisable**, no **derivable**.

⚠️ Y hay un modo de fallo real: una **obras que trunca el final** (la calle del terminal está cortada
y el bus se queda corto) produce el **mismo** fork que una **prolongación que hoy no circula**. Un
clasificador automático las confundiría, y en un sentido u otro mentiría ("no llega" cuando sí, o
"terminal normal" cuando hay obras). **Por eso me paro aquí y no propongo un auto-clasificador
obras-vs-prolongación.**

---

## 6 · Recomendación

1. **El origen del fallo no es el diff, es la premisa.** `desvios.ts` presupone `get_stops_list` =
   *"lo que el autobús hace hoy"*. Para las prolongaciones **eso no se cumple**: `get_stops_list` es
   la ruta estática/máxima. El bloque de terminal (GTFS modal) **acierta**; el itinerario, al fiarse
   ciegamente del extremo de `get_stops_list`, **falla**.

2. **Distinguir "terminal" de "interior" antes de rotular** (esto sí es fiable): cuando el diff es un
   **fork de terminal** (extremos distintos, sin reenganche), **no** usar *"provisional·desvío"* ni
   *"hoy no pasa"*. Es un cambio de terminal, no una calle cortada. Rótulo neutro tipo *"otro terminal
   — según día/temporada; no confirmado para hoy"*. Reservar *"desvío/obras"* para el diff **interior
   con reenganche**.

3. **Para el terminal de hoy, fiarse del GTFS, no de `get_stops_list`:**
   - **44**: el GTFS es calendar-gated → **se puede** saber si hoy toca Campus Río Ebro (y hoy la 44
     ni circula). Aprovechable.
   - **34**: Parque de Atracciones no está en el GTFS → **no se puede derivar**; tratarlo como las
     supresiones (avisar, no afirmar). Y de partida, **no tachar el terminal GTFS (Cementerio)**, que
     es el correcto de un día normal.

4. **Reconciliar itinerario y bloque de terminal:** hoy se contradicen en la misma página. Como
   mínimo, que el itinerario no afirme un terminal que el bloque de al lado niega.

5. **NO shipar un auto-clasificador obras-vs-prolongación** (Q5): no es fiable. Antes de eso, decidir
   contigo, y —si se quiere cobertura real del tipo 34— valorar un barrido de `get_stops_list` de toda
   la red (fuera del presupuesto de peticiones de hoy).

> **Resumen:** el bug es que `get_stops_list` no es day-aware y el itinerario lo trata como si lo
> fuera. Se puede separar obras-interior de diferencia-de-terminal (fiable) y dejar de rotular las
> prolongaciones como desvíos. Lo que **no** se puede es adivinar automáticamente si un terminal corto
> de hoy es "prolongación que no toca" u "obras que cortan el final" — ahí me paro y te aviso.
