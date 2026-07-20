# SPIKE · El suelo de zoom del mapa: ¿bajar de 14 a 13?

> **Medición, no opinión. NO se ha tocado el mapa.**
> Instrumento: [`scripts/spike-suelo-zoom.ts`](../scripts/spike-suelo-zoom.ts) (muestra viva)
> + el `getBoundsZoom` **del Leaflet de verdad**, no una reimplementación mía.

---

## Cómo se ha medido, y por qué así

**La muestra.** 934 paradas con coordenadas; se toma **1 de cada 10** sobre la lista
ordenada por poste → **90 paradas repartidas por toda la red**. No es aleatoria (así es
reproducible) y no está elegida a mano, que era justo lo que había que evitar.

- **82 aptas** (al menos un autobús con posición)
- 6 sin autobuses en ese momento · 2 fallos
- **99 peticiones a Avanza**, con freno de 260 ms

**El cálculo del zoom.** No he reimplementado la fórmula: he cargado Leaflet en un
navegador con un contenedor **del tamaño real medido en `/parada` a 360 px — 326 × 288 px**
y he llamado a la MISMA función que decide el clamp:

```ts
map.getBoundsZoom(bounds, false, L.point(40, 40))
```

Reimplementarla habría medido mi aritmética en vez de la del mapa.

---

## 1 · ¿Cuánto se dispara hoy el clamp?

| | paradas | |
|---|---:|---:|
| **El clamp SALTA** (necesitaría < 14) | **58** | **70,7 %** |
| Encuadra entero (≥ 14) | 24 | 29,3 % |

> ⚠️ **Siete de cada diez aperturas se recortan hoy.** Esto no es un caso raro: es el
> comportamiento normal de la pantalla. El aviso «Hay N fuera del encuadre» debería estar
> saliendo casi siempre — y como es texto pequeño gris, nadie lo ve.

## 2 · De esas 58, ¿a cuántas les bastaría 13?

| | paradas | % de las recortadas | % del total |
|---|---:|---:|---:|
| **Bastaría 13** (13 ≤ nec < 14) | **40** | **69,0 %** | 48,8 % |
| Necesitan 12 | 12 | 20,7 % | 14,6 % |
| Necesitan 11 | 6 | 10,3 % | 7,3 % |

**El suelo, barrido entero:**

| suelo | paradas recortadas | |
|---:|---:|---:|
| **14 (hoy)** | **58** | **70,7 %** |
| 13,5 | 58 | 70,7 % |
| **13** | **18** | **22,0 %** |
| 12,5 | 18 | 22,0 % |
| 12 | 6 | 7,3 % |
| 11 | 0 | 0 % |

## 3 · Distribución de la distancia al autobús más lejano

| min | p25 | **mediana** | p75 | p90 | max |
|---:|---:|---:|---:|---:|---:|
| 146 m | 1.753 m | **2.377 m** | 3.354 m | 5.511 m | **13.611 m** |

Zoom necesario: min 11 · p10 12 · **mediana 13** · p90 15 · max 17.

> ⭐ **La mediana cae exactamente en 13.** El caso típico no es un poco peor que 14:
> está justo un peldaño por debajo. Por eso 13 se come tanto de una vez.

**El peor caso NO es «una parada con 5-6 líneas»**, es **la carretera de Peñaflor**:
postes 403/413/423/546/1013, todos con **1 sola línea** y el autobús a **9,9–13,6 km**.
Son interurbanas: ningún suelo razonable las encuadra, y no deberían mandar sobre el diseño
del caso urbano.

**Matiz honesto sobre las líneas** — mi afirmación anterior («el número de líneas no entra»)
era correcta sobre el *mecanismo* pero se queda corta sobre la *correlación*:

| líneas en la parada | paradas | recortadas |
|---:|---:|---:|
| 1 | 45 | 26 (58 %) |
| 2 | 25 | 20 (80 %) |
| 3 | 7 | **7 (100 %)** |
| 4 | 5 | **5 (100 %)** |

Lo que dispara el clamp es **la distancia**; pero cada línea de más es otro dado que tirar,
y con 3+ líneas sale recortada **siempre**. La intuición de Antonio apuntaba a algo real.

## 4 · ⚠️ El coste de bajar a 13, medido

| | m/px | ancho visible | alto visible |
|---|---:|---:|---:|
| zoom 14 (hoy) | 7,14 | 2.328 m | 2.057 m |
| **zoom 13** | 14,28 | **4.656 m** | 4.114 m |
| zoom 12 | 28,56 | 9.310 m | 8.228 m |

Misma parada, lado a lado — **poste 47, Av. de América n.º 83** (8 autobuses, el más lejano
a 2.244 m; es un caso *típico* de los que 13 arregla, no un extremo):

| [zoom 14](../capturas/zetabus/ZOOM-14-poste47.png) | [zoom 13](../capturas/zetabus/ZOOM-13-poste47.png) |
|---|---|
| **3 de 8 autobuses visibles** | **8 de 8 visibles** |
| calles con nombre | barrios con nombre |

> ⭐ **Y AQUÍ EL MIEDO NO SE CONFIRMA: la parada NO se vuelve un punto.**
> El pin es un `divIcon` de **tamaño fijo en píxeles** — 22 px a zoom 14 y 22 px a zoom 13.
> **No encoge.** Lo que cambia es el CONTEXTO, no el marcador.
>
> A 13 se siguen leyendo Torrero, La Paz, Parque Venecia, Casablanca, Romareda y la Ronda
> Hispanidad. Se baja de «nivel calle» a «nivel barrio», que para *«¿dónde está mi autobús
> respecto a mí?»* sigue sirviendo. **Esto NO es el zoom 12 de la Tanda 7**: aquel abría a
> 9,3 km de ancho — cuatro veces el área de 13 — y ahí sí desaparecía todo.

## 5 · ¿Hay un valor mejor que 13?

**No, y hay un motivo técnico que zanja la pregunta de 13,5:**

`zoomSnap` vale 1 por defecto, así que **`getBoundsZoom` devuelve enteros**. Un suelo de
13,5 se comporta EXACTAMENTE como 14 (misma fila en la tabla), y 12,5 como 13. Un suelo
fraccionario no compra nada mientras no se toque `zoomSnap` — y tocarlo es otra decisión,
más grande, con efectos en toda la navegación del mapa.

**¿Un suelo dependiente (p. ej. del bus más lejano)?** Es lo que ya hay, y se llama
«Encuadrarlos»: un suelo adaptativo automático sería el zoom 12 que la Tanda 7 desterró,
solo que disfrazado y sin que el usuario lo haya pedido.

**¿12 en vez de 13?** Bajaría el residuo de 18 a 6, pero por **9,3 km de ancho** —
territorio del bug original. No compensa: los 12 casos que ganaría son en su mayoría
periferia (Montañana, La Cartuja, Miraflores), donde el aviso hace bien su trabajo.

---

## ⭐ La pregunta que decide: ¿se come «el grueso de los casos»?

**SÍ, y con margen. No es marginal.**

```
recortadas hoy (suelo 14) ......  58 de 82   70,7 %
recortadas con suelo 13 ........  18 de 82   22,0 %
                                  ─────────────────
                                  −40 paradas · −69 % de los recortes
```

De cada 10 aperturas que hoy ocultan autobuses, **7 dejarían de ocultarlos**. Y el residuo
de 18 no es un fracaso: **8 de esos 18 tienen el autobús a más de 6 km** (Peñaflor,
Montañana), o sea casos donde ver el bus y la parada a la vez no es útil aunque se pueda.

---

## Recomendación

**C sigue en pie, con el número confirmado: `ZOOM_SUELO` de 14 → 13.** Un solo número,
no se toca el principio (sigue habiendo suelo, sigue anclando en la parada, sigue contando
los que quedan fuera), y el coste visual está medido y es asumible.

**Y B cambia de peso, justo como preveías.** Con el aviso saltando en el **22 %** de las
aperturas en vez de en el **71 %**, deja de ser un cartel permanente y pasa a ser una
excepción de verdad — que es cuando un aviso puede permitirse llamar la atención sin
volverse ruido. La cifra «el más lejano, a 3,4 km» sigue siendo la información que falta
para decidir si pulsar «Encuadrarlos», y con 13 se leería sobre todo en los casos
interurbanos, donde es exactamente el dato relevante.

**Orden propuesto:** primero C (un número), medir de nuevo con este mismo script, y
después B con el peso que la nueva frecuencia justifique.

---

## Limitaciones, dichas

- **Una sola foto.** Muestra tomada un lunes ~13:15. En hora punta hay más autobuses por
  parada, así que el clamp saltaría **más**, no menos: 70,7 % es probablemente un suelo.
- **Solo autobuses detectados.** Avanza anuncia como mucho los dos siguientes por línea y
  sentido; el encuadre real nunca ve más que eso, así que la medida es la correcta para
  esta pregunta — pero no es «todos los autobuses de la línea».
- **82 paradas de 934.** Suficiente para separar 70 % de 22 %, no para afinar decimales.
- El caso de la captura (poste 47) es **típico**, elegido por ser el `necesario == 13` con
  más autobuses. No es el mejor ni el peor.
