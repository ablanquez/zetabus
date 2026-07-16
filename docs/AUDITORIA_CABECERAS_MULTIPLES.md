# Auditoría — ¿cuántas líneas tienen varias cabeceras válidas?

**Fecha:** 2026-07-16 · **Peticiones a Avanza:** cero (todo del build GTFS) · **Código tocado:** ninguno.

Investigación pedida para decidir si el motor puede **descubrir solo** (leyéndolo del dato,
sin lista a mano) qué sentidos tienen más de una cabecera válida por extremo —el fenómeno que
hace que el método de cabecera modal marque como "parcial" un servicio que en realidad es
completo desde el otro terminal (el bug que se sospechaba en la 44).

---

## Veredicto en una línea

> **En las fechas del build (16/18/19 jul 2026) hay UNA sola línea con segunda cabecera de
> verdad: la 23.** Todo lo demás es cabecera dominante (≥92 %) + refuerzos sueltos (≤9 %). Hay
> un **hueco limpio** entre el 10 % y el 40 % de reparto… pero **descansa en un único ejemplo y
> depende de la fecha**: los dobles terminales estacionales (44 → Campus Río Ebro) **no existen
> en julio** y reaparecerían en un feed de periodo escolar, quizá justo dentro de ese hueco. El
> hueco no es una frontera, es un punto con vacío alrededor. **Un umbral automático funcionaría
> hoy y no es robusto.**

---

## Método

Sobre las fechas representativas del propio motor (`laborable 20260716`, `sábado 20260718`,
`festivo 20260719`), replicando los pasos 1-4 de `terminal.ts`:

1. Por cada sentido `(línea, dirección)`, y **con TODOS los trips** de los tres días (no las 5+5),
   se cuenta cuántas veces arranca cada parada (**origen**) y cuántas acaba cada parada (**destino**).
2. Se mide el **reparto del 2.º extremo** = trips del 2.º origen/destino más frecuente ÷ total.
   Un refuerzo suelto da un reparto minúsculo; una segunda cabecera de verdad, uno grande.
3. Se anota la **posición del 2.º extremo en la traza oficial** (viaje canónico = el de más
   paradas): `INICIO` / `FINAL` (es un terminal), `mitad X %` (punto intermedio), `FUERA` (otra rama).
4. Caso 51: por `(línea, dirección, tipo de día)` se coge el viaje **más largo** del día y se
   comparan sus extremos y su nº de paradas entre días.

76 sentidos con recuento; 74 con línea nombrada.

---

## 1 · Sentidos con segunda cabecera — la lista completa

### Histograma del reparto del 2.º extremo (nº de sentidos por franja)

| Franja del 2.º | ORIGEN | DESTINO |
|---|---|---|
| exactamente 0 % (cabecera única) | 51 | 56 |
| 0,1 – 5 %  (refuerzo suelto) | 17 | 12 |
| 5 – 10 %   (refuerzo / obras / poste-par) | 5 | 5 |
| **10 – 40 %** | **0** | **0** |
| **40 – 50 %** | **1 (línea 23)** | **1 (línea 23)** |
| > 50 % | 0 | 0 |

⭐ **El hueco 10 – 40 % está vacío en los dos extremos.** Los refuerzos viven por debajo del 9 %;
la única cabecera doble real está en el 43-46 %. Nada en medio.

### La única cabecera doble de verdad: **línea 23**

| Sentido | Extremo | Reparto | Naturaleza |
|---|---|---|---|
| 23 dir0 | **DESTINO** | Noria Siria (p1299) **54 %** · Clara Campoamor (p1225) **46 %** | ~la mitad de los buses **acaban antes**, en Clara Campoamor |
| 23 dir1 | **ORIGEN** | Noria Siria (p1299) **55 %** · Clara Campoamor (p1225) **43 %** | ~la mitad **arrancan** en Clara Campoamor (que ni sale en la traza canónica → otra rama) |

Es exactamente lo que dijo Antonio: *"la 23 a ciertas horas acaba en un punto, a otras en otro"*.
Y es **la única** en la que el fenómeno pesa de verdad. Con la cabecera modal, esos ~46 % se
marcan hoy como "no llega / no viene" — que es *cierto* para ese día, pero llamar "excepción" a
la mitad del servicio **desfigura** que son dos patrones normales. **Ese es el problema real, y
es de una sola línea.**

### La banda 5-10 %: refuerzos, obras y pares de poste (NO cabeceras)

| Sentido | 2.º extremo | % | Qué es |
|---|---|---|---|
| 35 dir1 origen | Coso 126 (p338) | 8 % | refuerzos que arrancan a mitad (los 4:40/5:11/5:40 que ya conocemos) |
| 39 dir0/1 · Coso (p340) | 6 % | obras / refuerzo |
| 38 dir0/1 · Plaza San Miguel | 6 % | refuerzo |
| Ci2 dir1 · Camino de las Torres | 7 % | circular (arranque/cierre del bucle) |
| **41 dir1 destino** · Hernán Cortés **n.º 10 / n.º 9** | 7 % | **el MISMO terminal en dos postes contiguos** (par de marquesina) |
| **52 dir0 destino** · César Augusto **n.º 4 / n.º 3** (Puerta del Carmen) | 6 % | **el MISMO terminal en dos postes contiguos** |

⚠️ Ojo al matiz: parte de la banda baja ni siquiera es "refuerzo", es **el mismo sitio partido en
dos postes contiguos** (41, 52). Ruido de granularidad, no segunda cabecera.

---

## 2 · Los dobles terminales que Antonio nombró — colapsan en verano

**44 y 34 NO aparecen como dobles en el build**, porque su segundo terminal es **estacional**:

| Sentido | Origen (reparto) | Destino (reparto) | Lectura |
|---|---|---|---|
| 44 dir0 | Estación Miraflores (p1260) **100 %** | Pablo Ruiz Picasso (p616) **100 %** | terminal único |
| 44 dir1 | Pablo Ruiz Picasso (p616) **100 %** | Estación Miraflores (p1260) **100 %** | terminal único |
| 34 dir0 | Est. Delicias (p3073) **100 %** | Fray Julián Garcés (p888) **99 %** (+1 % refuerzo) | terminal único |
| 34 dir1 | Fray Julián Garcés (p888) **95 %** | Est. Delicias (p3073) **100 %** | dominante + 5 % refuerzo |

⭐⭐ **El caso 44 es la prueba de que el método por traza estaba roto de raíz:** la traza canónica
de 44 dir1 empieza en **Campus Río Ebro (p445)**, pero **CERO** trips salen de ahí en julio —el
terminal universitario es de *periodo escolar* (encaja con el aviso de Avanza que citaste: *"en
periodo escolar… terminal en Campus Río Ebro"*)—. Los 82 servicios arrancan **todos** en Pablo
Ruiz Picasso (p616). El método modal acierta (616). El método por traza habría marcado el **100 %**
del sentido como "no viene desde Campus Río Ebro". Confirmado y agravado: **modal correcto, traza
catastrófica** en la 44.

Corolario incómodo: **"cuántas líneas tienen doble cabecera" depende de la fecha del build.** En
julio, prácticamente solo la 23. En periodo escolar, la 44 (y puede que la 34) volverían a partirse.

---

## 3 · Caso 51 — traza que cambia de día

- **1 sentido**: `51 dir0`, el viaje más largo del día pasa de **19 a 20 paradas** entre tipos de
  día — un tramo de más **por el medio**, con **los mismos extremos** (Pabellón Príncipe Felipe ↔
  Est. Delicias).
- **0 sentidos** cambian sus **extremos** entre días.

⇒ **El fenómeno 51 existe pero NO afecta al bloque de terminal**, que solo mira los extremos. Es
indiferente. (Si algún día importara el recorrido intermedio —tiempos de paso— sí habría que tenerlo
en cuenta; para primeras/últimas, no.)

---

## 4 · ¿Cómo distinguir "2.ª cabecera válida" de "refuerzo parcial"?

**El reparto de trips es el mejor discriminante en estos datos** — y con hueco limpio:

- Refuerzos, obras y pares de poste: **≤ 9 %**.
- Cabecera doble real (la 23): **43-46 %**.
- Entre el 10 % y el 40 %: **nadie**.

Un umbral en, digamos, **20 %** clasificaría **hoy** todo bien.

⚠️ **La posición en la traza NO sirve como discriminante.** Clara Campoamor —terminal alterno real
de la 23— aparece como `mitad 88 %` en dir0 (porque el viaje largo la rebasa y sigue hasta Noria
Siria) y como `FUERA` en dir1 (otra rama). Un terminal que termina antes es, por definición, una
parada intermedia del viaje largo. Así que `mitad` no descarta terminal, y `INICIO/FINAL` no lo
confirma. **Solo el reparto separa** los dos casos de la 23 de los refuerzos… en esta foto.

---

## 5 · ⚠️ ¿Hay corte limpio o es un gradiente? — LA advertencia

**El corte es limpio pero frágil. No lo daría por bueno como frontera automática.** Tres razones:

1. **Un solo ejemplo puebla el cúmulo alto.** El "cúmulo de cabeceras dobles" es la línea 23 y nada
   más. Una distribución con **un punto** no define una frontera: define un punto con vacío alrededor.
   No sabemos dónde caería la segunda, la tercera o la décima línea doble —porque en este feed no
   las hay—.

2. **La foto depende de la fecha.** Los dobles terminales estacionales (44 → Campus Río Ebro) son
   **invisibles en julio** y reaparecerían en un feed de periodo escolar. Podrían caer en el 50/50
   (y el umbral los acepta), o en un 15-30 % según cómo reparta el horario escolar —**justo dentro
   del hueco que hoy está vacío**—. Si caen ahí, el umbral falla en silencio: por debajo, marca el
   terminal real como "no viene/no llega" (el bug que queríamos evitar); por encima, se lo traga
   como cabecera. **No sabríamos de qué lado cae hasta que rompiera.**

3. **El hueco no está "medido", está vacío por falta de casos.** No es que los datos demuestren que
   no hay nada entre el 10 % y el 40 %; es que **solo hay una línea doble** y cae lejos del borde.

### Recomendación

- **No cablear una lista de líneas** (44/34/23/51): copiaría a mano lo que hoy se ve y dejaría fuera
  la próxima línea doble sin que nadie se entere. Descartado, como pediste.
- **Tampoco enviar un umbral de reparto automático como "el arreglo"**: la calibración se apoya en
  un único ejemplo y en una foto estacional. Funcionaría hoy y no es de fiar.
- **Lo honesto**: el bloque de terminal, con cabecera **modal**, es **correcto para la fecha
  representativa** (por eso acierta en la 44 y en la 35). El único caso que "desfigura" es la **23**,
  donde marcar ~46 % del servicio como excepción es engañoso. Si se quiere resolver **la 23**, el
  camino menos malo es reconocer una parada que es **origen frecuente en un sentido Y destino
  frecuente en el otro** (un terminal compartido de verdad) — pero es lógica a medida para,
  esencialmente, una línea.
- **Antes de confiar en cualquier umbral, probar contra un feed de periodo escolar**, que es cuando
  aparecen los casos que en verano no se ven.

> **Conclusión:** no hay una frontera automática que generalice con seguridad. El dato de hoy tiene
> un solo caso de cabecera doble (la 23) y es estacional. Cualquier método automático fallaría en el
> borde el día que un feed traiga un doble terminal al hueco vacío. Hay que decidir con esto sobre la
> mesa, no dar el umbral por bueno porque "sale limpio".
