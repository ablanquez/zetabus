# Auditoría — las líneas estacionales (EM1, EM2, EM3, V1, V4)

**Fecha:** 2026-07-20 · **Peticiones a Avanza:** 13 · **Código tocado:** ninguno.
Rectifica y amplía [`AUDITORIA_LINEAS_OPERATIVAS.md`](AUDITORIA_LINEAS_OPERATIVAS.md), que respondía
a la pregunta *«¿está viva?»*. Aquí se responde a la de Antonio: **«¿toca ahora o no toca?»**

---

## Veredicto en tres líneas

> ⛔ **NO se puede saber si una de estas líneas toca hoy. Ninguna fuente lo dice.** El GTFS no las
> programa (0 viajes, 0 días, 0 `service_id`) y Avanza responde a `EM1` **exactamente lo mismo que a
> una línea inventada** — comprobado byte a byte.
>
> ✅ **Y el criterio actual ya hace lo correcto**: las excluye, e incluye la 44. No hay que tocar nada hoy.
>
> ⚠️ **Pero el criterio tiene un fallo latente que esta pregunta destapa**, y que no se ve con el
> feed actual: el día que una de estas líneas SÍ se programe, la enseñaría **todos los días de la
> vigencia del feed**, no solo los que circula. Ver §7.

---

## 0 · Tres correcciones al enunciado, antes de nada

**a) EM3 no existe.** No está en `routes.txt`, ni en el selector de Avanza, ni en ninguna otra
fuente consultada. No es que no circule: **no aparece en ningún sitio**.

**b) No son cinco, son ocho.** El feed trae 52 rutas; 44 operan. Las 8 restantes:

| | `route_id` | nombre largo (literal del feed) |
|---|---|---|
| **CEM** | 102 | Puerta del Carmen – Cementerio |
| **CE** | 103 | San Miguel – Cementerio |
| **LAN** | 104 | Lanzadera Cementerio – Parque Atracciones |
| **EM1** | 131 | Plaza Europa – **Estadio Modular** |
| **EM2** | 132 | Paseo de La Ribera – **Estadio Modular** |
| **V1** | 201 | Valdespartera – Puerta Carmen |
| **ES3** | 203 | Parking Norte – María Agustín |
| **V4** | 204 | Valdespartera – Paseo Constitución |

**c) «Estacional» se queda corto, y la diferencia decide.** Los nombres largos separan **dos
familias que no se predicen igual**:

- **Por FECHA** — CE, CEM, LAN van al **Cementerio**. Refuerzos de Todos los Santos: día conocido de
  antemano.
- **Por EVENTO** — EM1 y EM2 van al **Estadio Modular**, desde dos puntos distintos. Es la forma
  clásica de una lanzadera de partido: **no hay calendario que la prediga**, depende de que haya
  partido. V1/V4 (Valdespartera → centro) y ES3 (Parking Norte, un aparcamiento disuasorio) tienen
  la misma pinta de refuerzo puntual.

> ⚠️ **Esto último es INFERENCIA del nombre largo, no dato.** `route_desc` está **vacío** en las 52
> rutas: el feed no declara el propósito de ninguna. Lo que sí es dato es a dónde van.

Y **EM no es «escolar» ni «metropolitana»**: es **Estadio Modular**, y lo dice el propio feed.

---

## 1 · GTFS · existen, pero sin una sola hora

Feed vigente **20260623 – 20261005**. No hay `calendar.txt`: todo el servicio va por `calendar_dates.txt`.

| ruta | viajes en `trips.txt` | días de servicio |
|---|---:|---:|
| CEM · CE · LAN · EM1 · EM2 · V1 · ES3 · V4 | **0** | **0** |
| 44 *(circula hoy, el GTFS dice 0 hoy)* | 604 | 105 |
| 35 | 1.190 | 105 |

**Buscando la marca de temporada por todos los caminos:**

- ¿Fechas acotadas? **No hay fechas.** Sin viajes no hay `service_id`, y sin `service_id` no hay ni
  una fila en `calendar_dates.txt`.
- ¿Un `service_id` huérfano que las active? Los busqué: **hay 196** `service_id` con calendario y sin
  viajes. Pero sus prefijos codifican la ruta —`021724L`, `044724L`, `CI3725L`, `TUR003F`…— y
  **ninguno corresponde a EM/V/CE/CEM/LAN/ES3**. Son restos de líneas normales, no la temporada de estas.
- ¿`route_desc`? **Vacío en las 52 rutas.**

⇒ **El GTFS no codifica cuándo tocan. Ni bien ni mal: no lo codifica.**

### La huella de una línea que sí circula

Para saber si habría umbral, medí los **días distintos de servicio** de cada ruta:

```
   las que circulan ...  mínimo  30 (los búhos N1-N7)  ·  mediana 105  ·  máximo 450 (tranvía)
   las ocho ............ 0
```

El hueco entre **0 y 30** es enorme y limpio. ⚠️ **Pero no sirve de umbral**, y hay que decirlo: no
separa «eventual» de «regular», separa **«no aparece»** de **«aparece»**. Una línea de Cementerio
programada para el 1 de noviembre tendría **1 día**, y este feed no contiene ni un caso así con el
que calibrar dónde poner la raya. **El umbral es hoy indemostrable.**

---

## 2 · El selector de Avanza · verificado, y Antonio tenía razón

`GET /lineas-y-horarios/` → **45 opciones**: las 44 operativas (21…60, C1, C4, Ci1-4, N1-7) **+ TUR**.

**Ni una EM. Ni una V. Ni CE, CEM, LAN o ES3.** La lectura del F12 era correcta.

## 3 · `get_stops_list` · vacío

Con los parámetros reales (`selectLinea` / `selectSentido`, los que usa el proyecto):

```
  44   → 2.193 bytes · 27 <option>     ✅
  EM1  →     0 bytes ·  0              ⛔
  EM2  →     0 bytes ·  0              ⛔
  V1   →     0 bytes ·  0              ⛔
  V4   →     0 bytes ·  0              ⛔
  CE   →     0 bytes ·  0              ⛔
  LAN  →     0 bytes ·  0              ⛔
```

Vacío, no error. **Y el vacío no distingue «no existe» de «hoy no circula»** — el mismo agujero que
ya conocíamos en el poste inexistente.

## 4 · ⭐ La prueba que decide: Avanza no sabe que EM1 existe

Si las líneas «desaparecieran del selector cuando no tocan», su página seguiría existiendo. **No es
el caso.** Pedí `?selectLinea=EM1` y `?selectLinea=NOEXISTE_XYZ` y las comparé:

| | `#infoHorarios` | `#infoCaracteristicas` | tamaño |
|---|---|---|---|
| **44** | **SÍ** (14 filas) | **SÍ** (*«En sábados, domingos y festivos y del 16 de julio al 31 de agosto realiza terminal en Pablo Ruiz Picasso 34…»*) | 154 KB |
| **EM1** | NO | NO | 132 KB |
| **V1** | NO | NO | 132 KB |
| **línea inventada** | NO | NO | 132 KB |

**Diferencia entre la página de EM1 y la de una línea que me acabo de inventar, normalizando los
`?123456` de caché: 8 líneas de diff, y las dos son ruido** — una cookie de sesión y el `action` del
formulario devolviendo lo que le mandé. **Cero diferencia sustantiva.**

*(Control: 44 contra la inventada difiere en 578 líneas.)*

⇒ **Avanza trata `EM1` exactamente igual que una errata.** No hay página de línea, no hay tabla, y
por tanto **no hay «Información adicional» que citar** — que era la vía que en la 44 sí funciona y
que aquí habría sido la buena.

## 5 · Alteraciones del servicio

`get_alteraciones_servicio` → **HTTP 200, 0 bytes**. Ahora mismo no hay ninguna alteración publicada,
así que tampoco ayuda. Y por diseño anuncia desvíos de líneas que circulan, no temporadas.

---

## 6 · ⚠️ La pregunta que decide: NO se puede saber. Me paro y lo digo.

| fuente | ¿sabe si EM1 toca hoy? |
|---|---|
| GTFS `trips` / `calendar_dates` | ⛔ no la programa nunca |
| GTFS `route_desc` | ⛔ vacío |
| Selector de Avanza | ⛔ no la lista |
| Página de línea de Avanza | ⛔ **idéntica a una línea inexistente** |
| «Información adicional» (prosa) | ⛔ no existe para ellas |
| `get_stops_list` | ⛔ vacío, y el vacío es ambiguo |
| Alteraciones | ⛔ vacío |

**Ninguna fuente lo dice.** Y no es que digan «hoy no»: es que **ninguna sabe que estas líneas
existen**, salvo `routes.txt`, que solo guarda el nombre.

> **Aplico la instrucción: mejor no mostrarlas que mostrarlas mal.** Y da la casualidad de que es lo
> que ya se hace.

Lo único que se podría afirmar con honestidad si algún día quisiéramos nombrarlas sería:
*«el operador tiene definida esta línea, pero no publica ningún horario para ella»*. Es cierto, es
poco útil, y **no es lo que preguntaría alguien en la marquesina**.

---

## 7 · El criterio, probado contra el test

**Criterio actual, ya implementado** ([`adapter.ts:141`](../src/sources/gtfs-nap/adapter.ts#L141)):
*la ruta tiene ≥1 viaje **en el feed***. Verificado ejecutando `lineas()` sobre el artefacto de hoy:

```
  lineas() → 44
  ¿alguna EM/V/CE/LAN/ES? → NINGUNA
  ¿está la 44?            → SÍ
```

| caso | ¿≥1 viaje en el feed? | resultado | ¿bien? |
|---|---|---|---|
| **EM1 / EM2 / V1 / V4** (no tocan) | 0 | **EXCLUIDAS** | ✅ |
| **44** (circula hoy, GTFS dice 0 **hoy**) | 604 | **INCLUIDA** | ✅ |
| **35** (normal) | 1.190 | **INCLUIDA** | ✅ |

**Pasa el test.** Y la clave de que lo pase es que mira **el feed entero, no «hoy»**: un criterio de
«viajes hoy» escondería la 44, que es justo lo prohibido.

### ⚠️ El fallo latente que esta pregunta destapa

El criterio responde a *«¿existe esta línea?»*, y lo hace bien. **Pero se está usando para responder
a *«¿la enseño?»*, y ahí tiene un agujero que el feed actual no puede mostrar:**

> El día que Avanza publique un feed que incluya el 1 de noviembre **con los viajes de CE/CEM**, esa
> línea pasará a tener ≥1 viaje — y ZetaBus la enseñará **los 105 días de vigencia del feed**, no el
> día que circula. Una línea de Cementerio en la home a mediados de agosto.

No es un bug de hoy: **es un bug que llegará solo, sin que nadie toque nada**, el día que cambie el
feed. Y sería el mismo error de siempre con otro traje — afirmar servicio donde no lo hay.

### Propuesta (NO implementada)

**1 · Conservar el criterio actual como puerta de EXISTENCIA.** Funciona, pasa el test, y no depende
de una lista negra que caduca. **No tocarlo.**

**2 · Añadir una segunda pregunta para el DISPLAY: ¿cuántos días circula dentro del feed?** El dato
ya está calculado arriba y sale de `trips` + `calendar_dates`, sin ninguna petición. Una línea
regular tiene **30 días como mínimo** en este feed; una lanzadera de un día tendría 1.

**3 · Y no esconderla: FECHARLA.** Una línea que circula 1 día no debería salir entre las 44 como si
fuera permanente, pero tampoco desaparecer — la mejor respuesta para quien la busca es
*«CE · Cementerio — solo el 1 de noviembre»*, que es un dato derivado del feed, no una promesa.

> ⚠️ **Y no propongo el umbral concreto**, a propósito. Con este feed **no se puede calibrar**: no
> contiene ni un solo ejemplo de línea eventual programada. Poner ahora un «≤ 5 días» sería elegir
> un número a ojo y llamarlo criterio — exactamente lo que esta auditoría vino a evitar. **El umbral
> se decide cuando haya un caso real que medir**, y hasta entonces el criterio actual basta.

---

## Limitaciones, dichas

- **Un feed y un día.** Todo lo del GTFS vale para `20260623_AUZSA_Y_TRANVIA` (vigente hasta el
  05/10/2026). Lo de Avanza, para hoy 20/07/2026.
- **No se ha podido comprobar la hipótesis de fondo** —si estas líneas *aparecen* en el selector
  cuando toca— porque eso exige mirar en temporada. Lo que sí queda demostrado es que **hoy no hay
  ninguna forma de saber cuándo será esa temporada.** Si alguien mira el selector el 1 de noviembre
  y aparece CE, la hipótesis quedará confirmada y **el selector de Avanza pasaría a ser la fuente
  buena** para esta pregunta.
- **El propósito de V1, V4 y ES3 es inferencia**, no dato: el feed no lo declara. EM = Estadio
  Modular y CE/CEM/LAN = Cementerio sí salen literalmente del nombre largo.
