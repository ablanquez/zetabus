# El barrido de línea, y por qué está aparcado

> **Aparcado el 14/07/2026.** El código está en [`parked/barrido-de-linea/`](../parked/barrido-de-linea/).
> Este documento **no explica cómo funciona**: explica **por qué no funciona**.

⚠️ **Si vas a encenderlo otra vez, lee esto entero.** El código está en el historial de git y
recuperarlo es trivial. Lo que no está en git es **el motivo**, y el motivo es lo que te vas a
volver a encontrar de frente. Cuesta 190 peticiones a Avanza redescubrirlo.

---

## 1 · La decisión de producto (la fácil)

La vista de parada responde a la pregunta que se hace alguien **de pie en una marquesina**:
*"¿cuándo llega el mío, y es el largo o el corto?"*. Cuesta **una petición**, cacheada, instantánea.

El barrido de línea respondía a *"¿qué autobuses hay ahora en la 35?"*, que **no se pregunta nadie
esperando el bus**. Y costaba:

| | parada | barrido de línea |
|---|---|---|
| peticiones a Avanza | **1** (compartida entre todos los que miran esa parada) | **67** |
| espera | instantánea | **17 s** con Avanza sana · **66 s** degradada |
| valor para quien espera el bus | **todo** | ninguno |

**El 80% del valor, por el 1,5% del coste.** El barrido era el 20% restante a coste casi infinito.

Eso solo justifica **priorizar**. Lo que sigue es por qué, además, **no se puede hacer bien**.

---

## 2 · ⭐⭐ LA REGLA DE LOS DOS — la razón estructural

Avanza no tiene un endpoint "dame la línea 35". Solo sabe contestar **por poste**. Así que la línea
se reconstruye preguntando por sus postes. Y ahí aparece el muro:

> **En cada poste, Avanza anuncia como mucho LOS DOS SIGUIENTES autobuses de cada línea y sentido.**

Pon los autobuses de un sentido en fila, del más adelantado al más atrasado: `B1, B2, B3, B4…`
En un poste dado solo se anuncian **los dos que lo tienen más cerca por detrás**. Luego:

```
    B3        B2   B1
     |         |    |          ← los autobuses, en la calle
  ---+----+----+----+----+---  ← los postes de la línea
     [    ventana de B3   ]
     ^                    ^
     |                    └── más allá de B1, a B3 lo tapan B1 y B2: ya no es
     |                        de "los dos siguientes" de ningún poste
     └── desde aquí sí se le ve
```

> ### La ventana de visibilidad de un autobús la fija **lo cerca que tenga al que va DOS por delante**.
> **La fija el pelotón. No la longitud de la línea.**

Un autobús suelto tiene una ventana enorme y cualquier muestreo lo pilla. **Tres apelotonados dejan
al tercero con una ventana de un poste.**

### Y de ahí sale la regla que lo decide. No es estadística: es aritmética.

> Un tramo de **p** postes consecutivos **siempre** contiene un múltiplo de **p**.
> ⇒ el paso **p** garantiza encontrar a un autobús cuya ventana mida **≥ p**.
> ⇒ **el paso que aguanta = la ventana más estrecha que exista.**

**Medido el 14/07/2026 contra Avanza** (líneas 35, 33 y 32, los dos sentidos, una sola captura por
línea):

- **La ventana más estrecha es 1.** El coche 4314 de la línea 33 era visible en **1 poste de 51**.
- **8 parejas de autobuses a ≤2 postes**, y **dos de ellas a CERO postes** — dos autobuses
  anunciándose en el mismo poste.

## ⛔ NO HAY MUESTREO DEFENDIBLE.

**O se barre entero, o se pierden autobuses en silencio.** No hay un número intermedio que salvar.

### ⚠️ Y lo que ni el barrido completo puede ver

Si **tres** autobuses caben entre **dos postes consecutivos**, el tercero no es de los dos
siguientes de **ningún** poste. **No sale, por mucho que preguntemos a todos.** No es un fallo del
barrido: **la información no está en la fuente.**

Por eso la pantalla decía *"hemos **encontrado** N"* y nunca *"**hay** N"*. Si lo reactivas, esa
distinción no es un capricho de redacción: es la única frase que sigue siendo verdad.

---

## 3 · La tabla del paso, y los dos hallazgos que van con ella

Tres líneas, elegidas **por Antonio y no al azar**: las que más autobuses tienen y peor funcionan.
Los dos sentidos. **Una sola captura por línea**, y los pasos calculados **sobre ella** (ver
[L6](LECCIONES.md): comparar dos capturas de instantes distintos mide tu propio retraso).
Martes 14/07/2026, 10:38.

```
LÍNEA 35 · 67 postes · 12 buses    LÍNEA 33 · 51 postes · 15 buses    LÍNEA 32 · 72 postes · 9 buses
  paso 1 → 67 pet → 100%             paso 1 → 51 pet → 100%             paso 1 → 72 pet → 100%
  paso 2 → 34 pet →  92%             paso 2 → 26 pet →  93%             paso 2 → 37 pet → 100%
  paso 3 → 23 pet → 100%             paso 3 → 18 pet →  93%             paso 3 → 25 pet → 100%
  paso 4 → 18 pet →  83%  ⛔         paso 4 → 14 pet →  93%             paso 4 → 19 pet → 100%
  paso 5 → 15 pet →  92%             paso 5 → 11 pet →  87%             paso 5 → 16 pet → 100%

  ventana mínima: 1                  ventana mínima: 1                  ventana mínima: 7
  el paso 4 perdía los coches
  4302 y 4324
```

> **Para reproducirla:** `npm run paso` ([`scripts/paso.ts`](../scripts/paso.ts)). Hace **una sola
> captura completa por línea** y calcula todos los pasos sobre ella, así que no hay deriva y no se
> gasta ni una petición de más.
> ⚠️ **Son ~190 peticiones a Avanza. No lo lances a la ligera.**

### ⭐ Hallazgo 1 · LA COBERTURA NO ES MONÓTONA

En la línea 35, **el paso 3 encuentra MÁS que el paso 2**. Preguntar por *menos* postes encuentra
*más* autobuses.

> **Un número que sube cuando debería bajar no es una medida: es una lotería.**

El paso acierta o falla según **dónde caiga la rejilla** respecto a los autobuses de ese instante.
Eso no es cobertura: es suerte con dos decimales. Y es la prueba definitiva de que el muestreo no
tiene una propiedad que defender.

### ⚠️ Hallazgo 2 · LA LÍNEA 32 SALE 100% EN TODOS LOS PASOS

Porque sus autobuses van **repartidos** (ventana mínima: 7 postes). Y **tiene la forma exacta de la
medición original de la Tanda 3**, la que "confirmó" el paso 4 con un 100% redondo.

> *"Si hubiera repetido la medición yo solo, habría elegido una línea así y habría vuelto a
> confirmar el paso 4 con una tabla preciosa."*

**Es el mismo error del oráculo de desvíos en la Fase 6**: validar contra los casos que **no ponen a
prueba el detector**, ver un número espectacular, y creérselo.

El caso favorable **se elige solo**, porque es el primero que se te ocurre. Y el peor caso **lo
eligió el que coge el bus** — Antonio no midió nada: se acordó de haber visto **tres autobuses
seguidos en dos paradas**.

→ Está escrito como **[L8](LECCIONES.md)**: *una medida que sale redonda a la primera no es una
confirmación: es una muestra mal elegida.*

---

## 4 · El coste real

```
barrido completo de la 35 (67 postes, dos sentidos):

  con Avanza sana ....... 67 peticiones · ~17 s   (limitado por el ritmo de 4/s)
  con Avanza degradada .. 123 peticiones · 66 s   (67 + 56 reintentos; 18 postes
                                                   fallaron y 35 se sirvieron de
                                                   caché de hace media hora)
  la línea más larga (N7, 119 postes) ... 119 peticiones · ~30 s
```

⚠️ Y el dato incómodo: en el barrido degradado, **35 de los 49 postes "leídos" venían de caché de
hace 34 minutos**. La pantalla lo decía (la edad va escrita y la tarjeta se marca rancia), pero
**más de la mitad del resultado eran autobuses que ya no estaban ahí**.

---

## 5 · ⭐ LO QUE SE QUEDA AUNQUE EL BARRIDO SE VAYA

Tres cosas salieron de construir esto, y **ninguna se pierde**. Pero hay que ser exacto con lo que
protege cada una — es muy fácil quedarse una medalla que no toca.

### ⭐⭐ 5.1 · La ráfaga era la causa REAL de que Avanza dejara de responder. No el volumen.

El barrido hacía `Promise.all` sobre todos los postes: **los soltaba a la vez**. Con 18 postes no
se notaba, porque el cubo de fichas tiene 40 y **se los tragaba enteros**.

> **El techo no estaba frenando al barrido. LE ESTABA DANDO PERMISO.**

Y con 67 el permiso ya no alcanzaba: **27 postes habrían salido `fallo` de salida**, sin que Avanza
llegara a enterarse.

⚠️ **Y un test verde llevaba meses certificando ese permiso como si fuera una invariante.** Se
llamaba *"el cubo da para el barrido más largo de la red"*, y lo que de verdad comprobaba era que
**cupiera la ráfaga entera**. Ése es el modo de fallo que persigue este proyecto: no que algo pete,
sino que algo coherente y falso se quede a vivir, con un test cuidándolo.

**La lección se queda: un techo de peticiones/segundo no protege de nada si la ráfaga cabe.**
Lo que hay que acotar son las **dos** cosas: el ritmo *y* las simultáneas.

*(El ritmo de 4/s y el tope de 8 en vuelo vivían dentro de `barrerLinea` y se han aparcado con él —
hoy no queda ninguna operación que haga más de una petición, así que no protegen nada que exista.
Decir lo contrario sería mentir. Están en `parked/barrido-de-linea/barrido.ts`, listos.)*

### 5.2 · El cortacircuitos

Un barrido real con Avanza caída: **110 peticiones, 67 timeouts, 90 segundos** — preguntando por
los 67 postes, uno a uno, a un servidor que no contestaba a ninguno. Y al usuario, una barra
girando minuto y medio para acabar diciéndole que no sabíamos nada.

**Si no entra ni un dato bueno en los primeros intentos, no hay nadie al otro lado: se para.**
26 peticiones en vez de 134. (También aparcado, por el mismo motivo que el ritmo.)

### 5.3 · El endpoint huérfano

`/api/linea/[linea]/route.ts` barría la línea entera —y calculaba los desvíos— **con un GET
público e indexable**, sin que nadie pulsara nada. No lo llamaba ninguna pantalla. Apareció **al
contarlos**, no al suponerlo.

**Esta protección SÍ sigue viva**, en `tests/pantalla-no-miente.test.ts`: un test estructural que
falla si vuelve a aparecer cualquier camino de ejecución hacia el barrido.

### ⭐ 5.4 · Y lo único que de verdad nos protege HOY: el techo

El techo (`src/cache/limitador.ts`, 4 peticiones/segundo compartidas en disco) **no** es redundante
con la caché. La caché acota las peticiones **por clave**, no el número de **claves**: un rastreador
que recorra `/api/llegadas/<poste>` para los 934 postes produce 934 fallos de caché **legítimos**, y
los 934 son peticiones reales a Avanza. **La caché estaría funcionando perfectamente mientras nos
bloquean la IP.**

Ese caso no lo ha aparcado nadie. Sigue vivo, y el techo es lo único que lo para.

---

## 6 · Qué haría falta para retomarlo

Cualquiera de estas tres. **Ninguna se cumple hoy.**

| | estado |
|---|---|
| **Que exista GTFS-RT en Zaragoza.** Un feed de posiciones en tiempo real resuelve el problema de raíz: no habría que preguntar poste a poste, ni existiría la regla de los dos. | ⛔ **NO EXISTE.** Verificado contra el NAP, Transitland y Mobility Database. |
| **Que Avanza exponga una consulta por línea.** El pliego del nuevo contrato **lo exige**: cláusula 27, *"APIs de acceso público y general para su uso por terceros"*. | ⏳ **El contrato no está adjudicado.** |
| **Aceptar el coste**: 67 peticiones y hasta ~60 s de espera por pulsación, y que Avanza lo aguante. | ⚠️ Es lo que había. Y es lo que se ha decidido no pagar. |

⚠️ **Y si eliges la tercera, el aviso:** el barrido completo **sigue sin poder ver** al tercer
autobús de un pelotón (§2). El coste te compra *corrección dentro de lo que la fuente publica*, no
la verdad.

---

## 7 · Cómo encenderlo, si llega el día

1. `parked/barrido-de-linea/barrido.ts` y `agrupar-flota.ts` → `src/engine/`
2. `parked/barrido-de-linea/BuscarBuses.tsx` → `src/components/`
3. `parked/barrido-de-linea/route.ts` → `src/app/api/barrido/[linea]/route.ts`
4. Arreglar los imports (dentro de `parked/` son relativos entre ellos).
5. Volver a colgar `<BuscarBuses linea={l.shortName} fingir={fingir} />` en
   `src/app/linea/[linea]/page.tsx`.
6. Devolver el fingimiento `barrido-lento` a `src/engine/fingir.ts` (150 ms por poste: sin él, la
   barra de progreso salta de 0 al final y un test sobre ella pasaría por el motivo equivocado).
7. `parked/barrido-de-linea/barrido-completo.test.ts` → `tests/motor-vivo/`
   y `barrido-bajo-demanda.spec.ts` → `e2e/`.
8. **Y borrar el bloque `⛔⛔ EL BARRIDO ESTÁ APARCADO` de `tests/pantalla-no-miente.test.ts`** —
   que es el que te va a impedir hacer todo lo anterior a medias y sin darte cuenta.

**Los tests aparcados van con el código, y todos pasaban.** Incluida la contraprueba que reproduce
el pelotón de la regla de los dos, sintética, sin traer ni un byte de Avanza al repositorio.

---

## Y una última cosa

Este barrido **no era código malo**. Era correcto, estaba medido, se paceaba, se rendía cuando la
fuente moría, y decía la verdad — incluso cuando la verdad era *"no lo sabemos"*.

**Estaba bien construido sobre una fuente que no puede responder la pregunta.** Y eso no se arregla
con más ingeniería.

*"Prefiero un barrido caro y correcto que uno barato que miente."* — y resultó que el caro también
tenía un techo de verdad, solo que más alto.
