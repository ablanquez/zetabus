# Prueba — ¿por qué la web corta donde corta? ¿Hay cadencia estable en el medio?

**Fecha:** 2026-07-20 (lunes) · **Peticiones a Avanza:** 20 · **Código tocado:** ninguno.
Fuente A: GTFS `20260623_AUZSA_Y_TRANVIA` (todas las salidas del día).
Fuente B: la tabla web de Avanza, leída con el parser de producción (`sources/avanza/horario.ts`).

---

## Veredicto en cuatro líneas

> 1. **SÍ hay cadencia estable en el medio.** En todas las líneas medidas, y es muy marcada.
> 2. ⛔ **La hipótesis del corte NO se sostiene tal cual está formulada.** El corte de la web no
>    cae donde el ritmo se estabiliza: falla por entre **37 y 164 minutos**.
> 3. ⭐ **Pero hay algo real detrás, y es otra cosa:** el número de filas no es fijo (va de **1 a 21**)
>    y **está gobernado por si la línea tiene o no un patrón de reloj**. Eso sí es derivable.
> 4. ⚠️ **Y «de X a Y cada Z» solo se puede decir sin mentir en 2 de las 8 mediciones.** En las
>    densas sería falso. Ver §6.

---

## 0 · ⚠️ Qué he podido medir, y qué no

El GTFS **deja caer 16 de las 45 rutas hoy**. Entre ellas, dos de las que pediste:

```
  SIN VIAJES HOY (pero con viajes en el feed):
    Ci1 Ci2 Ci3 Ci4   ← LAS CUATRO CIRCULARES
    21  23  33  39  44
    N1 N2 N3 N4 N5 N6 N7   (búhos: hoy es lunes)
```

⇒ **No hay ninguna circular medible hoy**, y la 21 tampoco. La muestra se ajusta a lo que el feed
cubre de verdad:

| papel | línea | salidas hoy |
|---|---|---:|
| densa | **35** (ambos sentidos) | 121 + 122 |
| densa | **40** (ambos sentidos) | 133 + 129 |
| media | **30** | 144 |
| lanzadera | **C1** (ambos sentidos) | 48 + 48 |
| baja frecuencia | **58** | 41 |

*(La 30 y la 58 solo tienen un sentido con viajes hoy en el feed.)*

---

## 1 · Los headways, hora a hora

**35 · sentido 0** — 122 salidas, 05:00 → 25:29

```
  05:00 │  33′ │ 33–33 │ 2  ██████████████████████████████
  06:00 │  16′ │  1–33 │ 4  ████████████████
  07:00 │  16′ │ 13–17 │ 4  ████████████████
  08:00 │   9′ │  9–12 │ 6  █████████
  09:00 │   9′ │  8–9  │ 6  █████████
  10:00 │   8′ │  8–9  │ 8  ████████
  11:00 │   9′ │  8–9  │ 7  █████████
  12:00 │   8′ │  8–9  │ 7  ████████
  13:00 │   9′ │  8–9  │ 7  █████████
  14:00 │   8′ │  8–9  │ 7  ████████
  15:00 │   8′ │  8–9  │ 7  ████████
  16:00 │   8′ │  8–9  │ 7  ████████
  17:00 │   8′ │  8–9  │ 8  ████████
  18:00 │   8′ │  7–9  │ 7  ████████
  19:00 │   8′ │  7–8  │ 8  ████████
  20:00 │   8′ │  7–8  │ 7  ████████
  21:00 │  10′ │ 10–10 │ 6  ██████████
  22:00 │  11′ │ 10–12 │ 6  ███████████
  23:00 │  17′ │ 14–19 │ 4  █████████████████
  00:00 │  24′ │ 16–38 │ 3  ████████████████████████
```

**30 · sentido 0** — 144 salidas, 05:00 → 25:00

```
  05:00 │  15′ │ 14–16 │ 4  ███████████████
  06:00 │  15′ │ 13–17 │ 4  ███████████████
  07:00 │   8′ │  7–11 │ 8  ████████
  08:00 │   7′ │  6–8  │ 8  ███████
  09:00–19:00 │ 7′ constante (rango 5–8) │ ███████
  20:00 │   9′ │  8–9  │ 7  █████████
  21:00 │   8′ │  8–9  │ 8  ████████
  22:00 │   8′ │  7–27 │ 7  ████████
  23:00 │  34′ │ 34–34 │ 1  ██████████████████████████████
  00:00 │  30′ │ 30–30 │ 2  ██████████████████████████████
```

**C1** — 48 salidas, 08:00 → 19:45 · **15′ EXACTOS las doce horas, sin una sola excepción.**
**58** — 41 salidas, 04:55 → 24:30 · **30′ exactos desde las 05:00.**

### Los núcleos estables (racha más larga con ±1 min de tolerancia)

| línea·sentido | salidas | núcleo estable | cobertura |
|---|---:|---|---:|
| 30 · 0 | 144 | 07:44 → 15:26 cada **7′** | 45 % |
| 35 · 1 | 121 | 09:26 → 20:06 cada **8′** | 64 % |
| 35 · 0 | 122 | 08:23 → 21:01 cada **8′** | 75 % |
| 40 · 1 | 133 | 09:48 → 22:23 cada **8′** | 73 % |
| 40 · 0 | 129 | 09:24 → 21:05 cada **8′** | 70 % |
| 58 · 0 | 41 | 05:00 → 24:30 cada **30′** | **98 %** |
| C1 · 0 | 48 | 08:00 → 19:45 cada **15′** | **100 %** |
| C1 · 1 | 48 | 08:07 → 19:52 cada **15′** | **100 %** |

**Respuesta a la pregunta 2: SÍ, hay cadencia estable, y ocupa entre el 45 % y el 100 % del día.**
El día tiene forma de **tres bloques**: rampa de arranque → meseta → degradación nocturna.

---

## 2 · ⛔ La pregunta que decide: el corte NO coincide

| caso | web corta la 1ª tabla en | fin de la rampa según el GTFS | desfase |
|---|---|---|---:|
| 35 · 1 | 08:39 | 08:02 | **+37′** |
| 30 · 0 | 07:44 | 05:46 | **+118′** |
| 40 · 1 | 08:53 | 06:20 | **+153′** |
| 40 · 0 | 08:56 | 06:12 | **+164′** |
| C1 · 0 | 08:00 | *(no hay rampa)* | — |
| 58 · 0 | 05:00 | *(no hay rampa)* | — |

Y con el test estadístico (¿separa el corte un tramo disperso de uno regular?), **ninguno de los
ocho casos pasa**: la dispersión después del corte sigue siendo alta (CV 0.39–0.55) porque el día
**se vuelve a romper por la noche**. El corte no separa «caos / orden»: separa «madrugada / resto».

**Contraprueba — ¿dónde caería el corte óptimo?** Busqué el punto que mejor separa disperso de
regular, y no es donde corta la web:

```
  35|0  web 08:41 · óptimo 10:24   desfase −103′
  40|0  web 08:56 · óptimo 07:52   desfase  +64′
  30|0  web 07:44 · óptimo 09:24   desfase −100′
```

> ⚠️ **La hipótesis, tal como está formulada, cae. Y lo digo sin adornos: el corte de la web no
> marca dónde empieza el ritmo estable.**

---

## 3 · ⭐ Pero hay algo real debajo, y no es arbitrario

**El número de filas NO es fijo.** Medido en 12 casos:

```
  40|-2 ── 21 filas        52|-1 ── 13 filas
  40|-1 ── 20 filas        35|-1 ── 13 filas
  35|-2 ── 18 filas        34|-1 ──  5 filas
  30|-1 ── 14 filas        59|-1 ──  3 filas
  35|-1 ── 13 filas        28|-1 ──  2 filas
                           C1|-1 ──  1 fila
                           58|-1 ──  1 fila
```

De 1 a 21. **Ni 9+10 ni ningún número fijo.** Algo lo determina — y este es el hallazgo:

| | ¿los minutos de salida se repiten cada hora? | filas de «primeras» |
|---|---|---:|
| **C1** | **SÍ** — :00 :15 :30 :45, clavado | **1** |
| **58** | **SÍ** — :00 :30, clavado | **1** |
| 35 · 0 | NO — 19 minutos distintos en 28 salidas | 13 |
| 40 · 0 | NO — 27 distintos en 30 salidas | 20 |
| 30 · 0 | NO — 32 distintos en 34 salidas | 14 |

⭐ **Las líneas con patrón de reloj enseñan UNA fila. Las que no lo tienen, enseñan entre 13 y 21.**

Y tiene todo el sentido operativo: **si la línea sale siempre a y cuarto y a y media, no hace falta
listar nada** — con la primera y la frecuencia se reconstruye el día entero. Si las salidas van a la
deriva (08:41, 08:50, 08:59, 09:08, 09:16…), **no hay nada que resumir** y hay que listarlas.

⇒ Lo que la tabla larga marca no es *«dónde acaba el arranque»*, sino **«hasta dónde llega lo que no
se puede resumir»**. Es una intuición muy cercana a la de Antonio, pero **el eje no es el tiempo:
es la regularidad**. Y por eso el corte no cae en una hora concreta.

---

## 4 · ⚠️ La frecuencia media de la web: existe, y se queda corta

**Corrección a mi propia lectura anterior**: la web SÍ publica una frecuencia, en un bloque que
nuestro parser **no captura** (está fuera de `#infoCaracteristicas`):

> `Frecuencia media: laborables: 9, sábados: 16, domingos y festivos: 16 min.`

Contrastada con lo que hace el día de verdad:

| línea | la web dice (laborables) | lo que mide el GTFS | ¿representa el día? |
|---|---:|---|---|
| **35** | 9 min | 33′ al alba · **8–9′ de 08 a 20** · 24–38′ de noche | ⚠️ solo la meseta |
| **40** | 8 min | 33′ al alba · **8′ de 09 a 22** · 39′ de noche | ⚠️ solo la meseta |
| **30** | 8 min | 15′ al alba · **7′ de 07 a 19** · 30–34′ de noche | ⚠️ y ni eso: son 7′ |
| **C1** | 15 min | **15′ exactos, todo el servicio** | ✅ exacto |
| **58** | 30 min | **30′ exactos, todo el servicio** | ✅ exacto |

**Miente por omisión en las densas**, sí: quien lee «cada 9 minutos» y llega a las 05:15 espera 33.
Pero ⚠️ **la palabra «media» está puesta**, y eso cambia las cosas: no afirma un intervalo, declara
un promedio. **No es una mentira; es un dato insuficiente.** La diferencia importa para decidir si
se cita o se calcula.

---

## 5 · ⚠️ Veredicto honesto: ¿se puede decir «de X a Y, cada Z»?

**En 2 de los 8 sentidos medidos, SÍ. En los otros 6, NO sin mentir.**

✅ **SE PUEDE (2 de 8)** — C1 y 58. Cadencia exacta, de reloj, cobertura 98–100 %:
> *«C1 · de 08:00 a 19:45, cada 15 minutos»* — **es literalmente cierto**, salida por salida.

⛔ **NO SE PUEDE (6 de 8)** — 35 (×2), 40 (×2), 30, y por dos motivos que se suman:

1. **El intervalo no es un número, es un rango.** «Cada 8′» en la 35 son gaps reales de 7, 8 y 9.
   Quien llega justo detrás de uno espera 9, no 8.
2. ⭐ **Y lo grave: la meseta cubre el 45–75 % del día, no el 100 %.** Decir *«de 08:23 a 21:01
   cada 8 minutos»* en la 35 es cierto **y deja fuera el 25 % de las salidas** — justo las de la
   madrugada y las de la noche, que son **cuando más importa saberlo**. Es exactamente la mentira
   por omisión que este proyecto persigue: una frase elegante que se come el caso feo.

**Y el criterio para distinguirlas es derivable, sin pedir nada:** una línea admite la frase de
resumen si sus salidas siguen un patrón de reloj (los minutos se repiten cada hora). C1 y 58 lo
cumplen; 35, 40 y 30 no. **Eso se calcula del GTFS en dos líneas de código.**

---

## 6 · Qué se lleva de aquí el motor aparcado

- ⛔ **NO** implementar «el corte de la web marca la estabilización». Está medido y no es verdad.
- ✅ **SÍ** existe la cadencia estable de la pieza 4, y es fuerte y limpia.
- ⭐ **La regla que sí sale del dato:** *si la línea tiene patrón de reloj → una frase; si no → la
  tabla.* Y quién es quién **se calcula**, no se decide a mano.
- ⚠️ Y aunque se resuma, **hay que decir hasta dónde llega el resumen**. «De 08:00 a 20:00 cada 8»
  necesita, al lado, qué pasa antes de las 08:00 y después de las 20:00 — que es el 25 % de los
  autobuses y el 100 % de los sustos.

---

## Limitaciones, dichas

- **Un día (lunes 20/07/2026) y un feed.** En sábado y festivo la forma es otra, y no se ha medido.
- **Cero circulares**, porque el GTFS no las cubre hoy. La hipótesis podría comportarse distinto en
  una línea de bucle, y queda sin probar.
- **Las salidas son las de cabecera** (primer `stop_time` de cada viaje), que es lo que la tabla web
  publica. El headway en una parada intermedia puede diferir por el tráfico.
- **8 sentidos medidos de 74.** Suficiente para tumbar la hipótesis del corte —basta un
  contraejemplo, y hay seis— y para ver la correlación del patrón de reloj. **No** suficiente para
  afirmar en qué porcentaje de la red se puede resumir: eso exige medir las 74.
