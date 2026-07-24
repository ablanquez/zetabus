# AUDITORÍA · RENDIMIENTO

**Fecha:** 24/07/2026 · **Estado del repo auditado:** `6d44eec` (Tanda 7 cerrada)
**Qué es este documento:** la **guía para implementar los cambios**.
**Qué NO se ha hecho:** ⛔ **no se ha tocado ni una línea de código de producción**, ni se ha
optimizado nada.

---

## ⚠️ La ley que gobierna este documento entero

> **MEDIR ANTES DE ELEGIR. Y un caché que no sirve es PEOR que ninguno.**
> *Se memoizó un contador para atacar 6.854 consultas. Midió 6.830. Se revirtió.*
> **Optimización sin medición previa = deuda con intereses.**

⇒ **En este documento no hay una sola propuesta sin un número delante.** Y donde no se ha medido,
pone **NO CONSTA** en vez de una sugerencia. Hay más cosas en la sección *«lo que está bien,
medido»* que en la de hallazgos, y eso es un resultado, no un relleno: **saber qué NO tocar es la
mitad de la decisión**, y un número que dice «esto ya va bien» ahorra el refactor que alguien haría
dentro de seis meses por corazonada.

---

## Método

| Qué | Cómo se midió | ¿Instrumento fiable? |
|---|---|---|
| **Peso del bundle por ruta** | `next build` real (Turbopack, Next 16.2.10) y **dos métodos independientes**: (a) `find` + `stat` sobre `.next/static/chunks`, (b) el propio `route-bundle-stats.json` de Next. **Coinciden.** Y el gzip se calculó comprimiendo los chunks a nivel 9 | ✔ |
| **Qué hay DENTRO del chunk grande** | Se leyeron sus primeros bytes: no es una deducción, es el contenido | ✔ |
| **Tiempos de página** | `next start` (producción) y peticiones **SECUENCIALES, una cada vez**, n=9 por URL, descartando la primera (calentamiento). Mediana, mínimo y máximo | ✔ |
| **Coste del buscador** | Micro-medida sobre las **entradas reales** (44 líneas + 934 paradas) leídas de `src/generated/gtfs.json`, n=200 por consulta | ✔ |
| **Assets** | Inventario de `.next/static/media` | ✔ |

⚠️ **Los tiempos se midieron EN SECUENCIAL, y eso no es un detalle.** En la Parte B había «páginas
de 14 s» que en secuencial daban 217 ms: eran seis workers de Playwright peleándose por la misma
máquina. **Un percentil medido bajo la carga que crea el propio instrumento no mide la aplicación:
mide el instrumento.** Aquí el único cliente es uno, y va de uno en uno.

⚠️ **Y se midió con `?fingir=`, o sea con CERO red hacia Avanza.** Es deliberado: así el número es
el coste de **ZetaBus**, no el humor de Avanza esa tarde. La latencia de Avanza es real y se suma
encima, pero **no es lo que este documento puede cambiar**.

---

# 1 · HALLAZGOS

## ⛔ C-1 · FALLO · **El `gtfs.json` de 1,9 MB viaja ENTERO al navegador en cada página de parada**

### La medida, por dos métodos que coinciden

| Ruta | First Load JS crudo | **gzip** | Chunks |
|---|---:|---:|---:|
| **`/parada/[poste]`** | **2.431 KB** | **546 KB** | 12 |
| `/interno/sistema-visual` | 525 KB | 151 KB | 11 |
| `/` | 518 KB | 149 KB | 11 |
| `/linea/[linea]` | 516 KB | 148 KB | 11 |
| `/_not-found` | 515 KB | 147 KB | 10 |
| `/sobre-los-datos` | 515 KB | 147 KB | 10 |

⇒ **La página de parada manda 3,7× lo que manda cualquier otra**, y toda la diferencia está en
**un solo chunk de 1.900 KB (399 KB comprimido)**.

### No es una deducción: se leyó lo que hay dentro

```js
// .next/static/chunks/2vt9hek4c_8ci.js — primeros bytes, literalmente:
(globalThis.TURBOPACK||…).push([…,(l,o,n)=>{o.exports=JSON.parse(
  '{"generatedAt":"2026-07-24T08:46:28.888Z","modes":["bus"],"validity":{…},
    "stops":[{"id":"16487","code":"PA00002","name":"Agustín P…
```

Es **el artefacto del GTFS completo**: las 934 paradas con sus coordenadas y nombres, las 44
líneas, y los trazados. Servido al navegador de cualquiera que abra una parada.

### La causa, en dos líneas exactas

```
src/components/LlegadasVivas.tsx:7   import { linea } from '@/engine/topologia';
src/components/MapaParada.tsx:9      import { linea } from '@/engine/topologia';
```

Los dos son componentes **`'use client'`**. Y es un **import de VALOR, no `import type`** — así que
arrastra `topologia.ts`, que en su línea 44 hace `import artefacto from '@/generated'`, que es el
`gtfs.json` de 1,9 MB.

**Y esto es lo que de verdad duele:** las dos únicas cosas que el cliente hace con esos 1,9 MB son

```
src/components/LlegadasVivas.tsx:629   const suya = l.lineaId ? linea(l.lineaId) : null;
src/components/MapaParada.tsx:285      const suya = l.lineaId ? linea(l.lineaId) : null;
```

**Una llamada cada uno**, para buscar el color y el nombre corto de la línea de un autobús que ya
está en pantalla. **Se descarga la red de transporte entera de Zaragoza para pintar un chip de
colores.**

### Por qué importa, con el número

En una conexión móvil de 4 Mbps, **399 KB comprimidos son ~0,8 s de descarga** que las otras
páginas no pagan. Y **descomprimir y `JSON.parse` de 1,9 MB en el hilo principal** bloquea la
interacción en el momento exacto en que alguien está de pie en la marquesina con prisa — que es la
persona para la que se diseñó esta pantalla y por la que el mapa se puso **debajo** del primer
tiempo de llegada.

⚠️ **Es la misma decisión de diseño, incumplida por otra vía.** Se movió el mapa 500 px hacia abajo
para que el primer tiempo entrara en el viewport de 360 px, y al mismo tiempo se manda 1,9 MB por
delante de todo. La segunda anula parte de lo que ganó la primera.

### Qué se podría hacer (**no se hace aquí**), con su coste

| Opción | Coste | Efecto medido/estimado |
|---|---|---|
| **Pasar la `Line` como prop desde el servidor** — la página ya la tiene | **~1 h** | ⭐ La más limpia. `LlegadasVivas` y `MapaParada` dejan de importar `topologia`. **Esperado: ~399 KB gzip menos**, la ruta baja a ~150 KB como las demás |
| **Un `lineas.json` mínimo** (44 registros: `shortName`, `color`, `textColor`) para el cliente | ~1 h | Mismo efecto. Añade un artefacto que hay que mantener sincronizado |
| Envolver el import en `import type` y mover `linea()` | — | ⛔ **No sirve**: `linea()` es una función, se necesita en tiempo de ejecución |

- **Riesgo:** **bajo-medio.** Toca la firma de dos componentes cliente, pero **no toca el motor**.
  ⚠️ Sobre `LlegadasVivas.tsx` pesan `flotacion.spec`, `bloque-parada.spec`, `interaccion.spec` y
  `mapa.spec`: hay que relanzarlos.
- ⚠️ **Y hay que MEDIR DESPUÉS.** El número de arriba es lo esperado, no lo comprobado. Si tras el
  cambio la ruta no baja a ~150 KB, es que algo más está arrastrando el artefacto y el hallazgo no
  estaba completo.

---

## 🟡 C-2 · DEUDA · `/linea/N7` sirve **574 KB de HTML** en una sola respuesta

Medido (crudo, sin comprimir):

| Página | HTML | Tiempo de servidor (mediana) |
|---|---:|---:|
| `/linea/N7?sentido=0` (**120 paradas**) | **574 KB** | 49 ms |
| `/` (buscador con 978 entradas) | 224 KB | 9 ms |
| `/linea/35?sentido=0` | 171 KB | 22 ms |
| `/interno/sistema-visual` | 72 KB | 5 ms |
| `/sobre-los-datos` | 54 KB | 4 ms |
| `/parada/1228` | 43 KB | 8 ms |
| `/parada/744` | 28 KB | 7 ms |

**El servidor no es el problema** (49 ms es excelente para 120 paradas). El problema es el
**tamaño de la respuesta**: un itinerario de 120 paradas con chips de transbordo se serializa dos
veces —HTML pintado + carga RSC— y sale medio mega.

- **Contexto honesto:** N7 es **el peor caso de las 74** (120 paradas). El caso típico ronda los
  171 KB. Comprimido por el servidor, 574 KB de HTML bajan mucho *(no medido: el servidor de
  desarrollo no comprimió la respuesta en esta prueba)*.
- **Qué se podría hacer:** paginar o virtualizar el itinerario largo. **Coste: alto (~1 día).
  Riesgo: alto** — el itinerario es la pieza que más specs tiene encima, y la regla del alto del
  recorrido y el scroll interno dependen de que esté entero en el DOM.
- **Mi lectura: NO tocarlo por ahora.** Se paga en 1 de las 74 páginas de línea, el servidor lo
  resuelve en 49 ms, y el arreglo es caro y arriesgado. **Se anota para que exista el número, no
  para actuar.**

---

# 2 · LO QUE ESTÁ BIEN — **medido**, y por tanto **NO se toca**

## 1 · El servidor es rápido. **Nada pasa de 49 ms.**

Peticiones secuenciales, producción, n=9, descartando el calentamiento:

| Ruta | Mediana | Min | Max |
|---|---:|---:|---:|
| `/api/diag` | **2 ms** | 2 | 5 |
| `/esta-ruta-no-existe` (404) | **3 ms** | 3 | 3 |
| `/sobre-los-datos` | **4 ms** | 4 | 5 |
| `/interno/sistema-visual` | **5 ms** | 5 | 6 |
| `/parada/744` | **7 ms** | 6 | 8 |
| `/parada/1228` | **8 ms** | 7 | 9 |
| `/` | **9 ms** | 9 | 12 |
| `/linea/35` | **22 ms** | 18 | 40 |
| `/linea/N7` (120 paradas) | **49 ms** | 44 | 50 |

⇒ **No hay ninguna página lenta.** Y el rango es estrecho (min y max casi pegados), que es la
señal de que no hay nada intermitente escondido.

⚠️ **Y esto retira de la mesa una sospecha entera:** cualquier «página lenta» que aparezca en un
barrido de Playwright **es contención del instrumento**, no de la aplicación. Ya pasó en la Parte
B; ahora hay una tabla que lo dice de antemano.

## 2 · **Leaflet está correctamente perezoso.** Verificado ruta por ruta.

El chunk de Leaflet (155 KB) **no está en la primera carga de NINGUNA ruta**, ni siquiera de
`/parada/[poste]`, que es la única que muestra mapa:

| Ruta | ¿gtfs en la 1.ª carga? | ¿leaflet en la 1.ª carga? |
|---|---|---|
| `/parada/[poste]` | ⛔ **SÍ** | ✔ **no** |
| Todas las demás | ✔ no | ✔ no |

El `dynamic(() => import('./MapaParada'))` de `LlegadasVivas.tsx:44` **hace exactamente lo que
promete**. Se carga cuando hace falta y ni un byte antes. **No se toca.**

## 3 · **El buscador NO es un problema, y aquí está el número para que nadie lo «optimice».**

Medido sobre las **978 entradas reales** (44 líneas + 934 paradas):

| Qué | Cuándo ocurre | Mediana | Peor |
|---|---|---:|---:|
| `indexar(978)` | **1 vez** por montaje (`useMemo` con `[entradas]`) | **1,61 ms** | 3,89 ms |
| `buscar()` — `"av"` | en **cada pulsación de tecla** | **0,160 ms** | 0,78 ms |
| `buscar()` — `"avenida"` | ídem | **0,158 ms** | 0,28 ms |
| `buscar()` — `"avenida ca"` (peor consulta) | ídem | **0,274 ms** | 0,39 ms |
| Teclear `"avenida"` ENTERA (7 pulsaciones) | | **1,08 ms** | — |

⇒ Un recorrido lineal sobre 978 entradas cuesta **0,16 ms**. A 60 fps hay 16,7 ms por fotograma:
**el buscador usa el 1 % de un fotograma.** No hace falta índice invertido, ni *debounce*, ni
memoizar más, ni web worker.

⚠️ **Esto es exactamente el caso del contador memoizado que midió 6.830 y se revirtió.** Aquí el
número está tomado **antes** de tocar nada, y dice: **no toques nada.**

## 4 · La home y `/sobre-los-datos` son **estáticas** (`○` en el build)

Se prerrenderizan una vez en el build. **Cero trabajo por visita**, aunque la home construya un
índice de 978 entradas. La respuesta llega con `x-nextjs-cache: HIT`.

## 5 · Assets: **no hay nada que optimizar porque no hay nada de más**

- **Cero imágenes en el repositorio.** Verificado con `git ls-files`: ni un PNG, ni un JPG, ni un
  SVG. El favicon y el icono se **generan** (`src/app/icon.tsx`). Los únicos PNG servidos son los
  3 de Leaflet (marcador y capas), 1,4 KB el mayor.
- **Fuentes:** 7 ficheros `woff2` **ya subseteados** por `next/font` (83 KB el mayor, 10 KB el
  menor). Solo **uno** se precarga (`<link rel=preload>` de 47 KB en la página de parada), que es
  el comportamiento correcto.
- **CSS:** 30,5 KB + 10,3 KB. Tailwind purga bien; para 365 líneas de CSS propio y una app entera,
  es lo esperado.

## 6 · El motor no recalcula nada caro por render

Buscados a propósito los candidatos: la topología se hornea en el build (`src/generated`), el
índice de correspondencias se lee de fichero, y los dos únicos cálculos que corren por render
(`indexar` y `buscar`) están medidos arriba. **No se ha encontrado ningún recálculo por render con
coste medible.**

---

# 3 · MI RECOMENDACIÓN

### Lo tocaría — **una sola cosa**

| # | Qué | Coste | Por qué |
|---|---|---|---|
| **C-1** | Cortar el `gtfs.json` del bundle de cliente pasando la `Line` como prop | **~1 h** | Es **el único hallazgo de rendimiento con un número que justifica el riesgo**: 399 KB gzip, en la única pantalla pensada para alguien con prisa de pie en la calle, para usar dos llamadas a una función. Y el arreglo **no toca el motor** |

### Lo que **NO** tocaría, y por qué — con el número que lo respalda

| Qué | Número que lo desaconseja |
|---|---|
| **El buscador** | 0,16 ms por tecla. Cualquier «optimización» aquí es la trampa cargada del contador memoizado |
| **Los tiempos de servidor** | Mediana de 2 a 49 ms. No hay nada que arreglar |
| **La carga de Leaflet** | Ya es perezosa, verificado ruta por ruta |
| **Las fuentes y los assets** | Subseteadas, con un solo preload, y sin una sola imagen en el repo |
| **`/linea/N7` (574 KB de HTML)** | Es 1 de 74 páginas, el servidor lo resuelve en 49 ms, y el arreglo cuesta ~1 día **con riesgo alto** sobre la pieza más verificada de la app. **Se anota el número; no se actúa** |
| **La caché de dos pisos** | Funciona, y el documento 12 demostró que hace **más** de lo que su autor creía |

⇒ **De toda la auditoría de rendimiento sale UNA acción.** Eso no es un informe pobre: es lo que
pasa cuando se mide antes de proponer en vez de al revés.

---

# 4 · LO QUE **NO** SE HA PODIDO MEDIR

| Qué | Por qué | Estado |
|---|---|---|
| **Core Web Vitals reales** (LCP, INP, CLS) | Habrían hecho falta Lighthouse o un `PerformanceObserver` en la página. Lo segundo es tocar producción para medir, y eso pedía avisar antes | **NO CONSTA** |
| **El coste en un móvil de verdad** | Todo se midió en `localhost`, sobre esta máquina, con el navegador en la misma CPU. **Descomprimir y parsear 1,9 MB de JSON en un móvil gama media es mucho más caro que aquí**, pero *cuánto* no lo sé | **NO CONSTA.** El impacto real de C-1 es **mayor** que lo que sugieren estas cifras, no menor |
| **El tiempo de página CON Avanza real** | Se midió con `?fingir=` (cero red) a propósito, para no meter la latencia de un tercero en un número que dice medir ZetaBus. Existe una muestra suelta (3 cargas: 0,9 s / 1,9 s / 3,0 s) tomada en frío, **demasiado pequeña y demasiado sucia para publicarla como medida** | **NO CONSTA** |
| **El HTML comprimido por el servidor** | Los 574 KB de `/linea/N7` son **crudos**. `next start` no comprimió en esta prueba; en producción tras un proxy sí lo haría. **El número real que viaja es bastante menor y no se ha capturado** | **NO CONSTA** |
| **Comportamiento bajo concurrencia real** | Se midió **en secuencial a propósito**. Cómo se comporta con 50 usuarios simultáneos, y cuántos workers levanta Hostinger, sigue sin saberse *(ver documento 12)* | **NO CONSTA** |
| **Coste de memoria del proceso** | No se ha medido el RSS. Con un artefacto de 1,9 MB por grafo de módulos y varios grafos por proceso, es una pregunta legítima | **NO CONSTA** |

---

# 5 · BITÁCORA

**⚠️ El bundle no se mide leyendo el código; se mide compilando.** El `import { linea }` de
`LlegadasVivas.tsx:7` es **una línea perfectamente inocente**: importa una función de un módulo del
motor. Nada en ella dice «esto arrastra 1,9 megas». Solo se ve **después de `next build`**, mirando
qué hay dentro de los chunks. *Un coste que solo existe tras compilar no lo encuentra ninguna
revisión de código.*

**⚠️ Next 16 con Turbopack YA NO IMPRIME los tamaños de bundle al terminar el build.** La salida es
solo la lista de rutas con `○`/`ƒ`. Quien venga de versiones anteriores y espere la tabla de
«First Load JS» **creerá que no hay nada que mirar**. Los números de este documento salieron de
`.next/diagnostics/route-bundle-stats.json` y de medir los ficheros a mano — **dos métodos, porque
uno solo no basta** (L1). Coincidieron, y por eso se publican.

**⚠️ Y una sobre no inflar la lista.** De todo el capítulo de rendimiento sale **una sola acción**.
La tentación era rellenar con «memoizar esto», «virtualizar aquello», «lazy-load lo otro» —todo
plausible, nada medido—. Cada una de esas habría sido una trampa cargada para quien viniera
después: un caché que no sirve deja al siguiente creyendo que el problema está resuelto. **La
sección más útil de este documento es la de lo que NO hay que tocar, y es la más larga a
propósito.**

---

*Documentos hermanos de esta ronda:*
[`11-codigo-y-arquitectura.md`](11-codigo-y-arquitectura.md) ·
[`12-perimetro-y-publicacion.md`](12-perimetro-y-publicacion.md)
