# Auditoría — detectar líneas no operativas (EM1, EM2, EM3, V1, V4)

**Fecha:** 2026-07-16. **Peticiones a Avanza:** 3 (página selector + `get_stops_list` EM1/V1).
**Código tocado:** ninguno.

Objetivo: que ZetaBus **no muestre** líneas que están "sobre el papel" pero **no operan**
(EM1/EM2/EM3/V1/V4), sin caer en la trampa de filtrar por una fuente que miente (excluir la 44, que
circula pero el GTFS da 0 trips hoy).

---

## Veredicto en una línea

> **Ya están excluidas, y por el criterio correcto.** El adapter filtra las **"líneas zombi"** por
> **"la ruta tiene ≥1 viaje en el feed"** (no una lista negra a mano, no "viajes HOY"). EM1/EM2/EM3/V1/V4
> tienen **0 viajes** → fuera. La 44 tiene **604 viajes en el feed** (aunque 0 hoy) → **dentro**. El
> criterio pasa los tres casos. **No hay que implementar nada nuevo para el feed actual**; solo, si se
> quiere blindar contra líneas *planificadas con viajes futuros*, reforzar con el selector de Avanza.

---

## 1 · Qué dice cada fuente sobre EM1/EM2/EM3/V1/V4

| Fuente | EM1/EM2/EM3/V1/V4 | 44 (viva, 0 trips hoy) | 35 (viva normal) |
|---|---|---|---|
| **GTFS `routes.txt`** | existen como **zombis** (rutas sin viajes) | ruta con viajes | ruta con viajes |
| **GTFS `trips.txt`** | **0 viajes** (en las 457 fechas) | **604 viajes** | 1190 viajes |
| **GTFS `A.lines`** (post-filtro del adapter) | **ausentes** (filtradas) | presente | presente |
| **Selector de línea de Avanza** (`/lineas-y-horarios/`) | **ausentes** | presente (44 – Miraflores – Actur) | presente |
| **`get_stops_list`** | **0 postes** (vacío) | 26 postes | 31 postes |
| **Vivo** | no consultable (sin postes) | buses reales (auditoría Q1) | sí |

El selector de Avanza lista exactamente las **44 líneas operativas** (21…60, C1/C4, Ci1-4, N1-7) **+
TUR**; **ninguna EM/V**. Coincide con el GTFS filtrado (44 líneas). Las EM/V no están en **ninguna**
fuente operativa.

⚠️ Nota: el comentario del propio adapter ya las nombra: *"Las líneas zombi (CE, CEM, LAN, V1, V4,
ES3, EM1, EM2…) existen en routes.txt y NO TIENEN NI UN VIAJE. …Se filtran aquí, contra trips.txt, no
contra una lista negra escrita a mano que se quedaría obsoleta."* (`adapter.ts:142`).

## 2 · De dónde sale HOY la lista de líneas de ZetaBus

- La home (`app/page.tsx`) llama a **`lineas()`** de `engine/topologia.ts:159` → devuelve **`A.lines`**.
- `A.lines` lo produce el **adapter** (`gtfs-nap/adapter.ts`), que **ya filtra los zombis**:
  ```
  if (!routesWithTrips.has(rid)) { zombies++; continue; }   // ruta sin viajes → fuera
  ```
  `routesWithTrips` se construye recorriendo **`trips.txt`** (viajes de TODO el feed, no de hoy).
- ⇒ **ZetaBus NO muestra EM1/EM2/EM3/V1/V4 hoy** (nunca llegan a `A.lines`). El "problema" ya está
  resuelto para el feed actual.

## 3 · Criterio de "operativa", probado contra los tres casos

**Criterio actual (ya implementado): "la ruta tiene ≥1 viaje en el feed GTFS".**

| Caso | ¿≥1 viaje en el feed? | Resultado | ¿Correcto? |
|---|---|---|---|
| **EM1** (muerta) | 0 | **EXCLUIDA** | ✅ |
| **44** (viva, 0 trips **hoy**) | 604 (feed-wide) | **INCLUIDA** | ✅ |
| **35** (viva normal) | 1190 | **INCLUIDA** | ✅ |

⭐ **La clave que evita la trampa:** el filtro cuenta viajes de **TODO el feed**, no de **hoy**. Por
eso la 44 entra (tiene viajes en el feed, aunque 0 el 16 jul). Si el filtro fuera "viajes hoy",
**tiraría la 44** — la trampa exacta que había que evitar. **El criterio actual ya la esquiva.**

**Hay corte limpio:** EM/V tienen **0** viajes; las vivas tienen **cientos/miles**. No hay zona gris
en el feed actual. Y **tres fuentes independientes coinciden** (GTFS filtrado, selector de Avanza,
get_stops_list): las EM/V están fuera en las tres.

### ⚠️ El único riesgo (a futuro, no hoy)

El criterio "≥1 viaje en el feed" fallaría si un **feed futuro** diera a EM1 **viajes planificados**
(fechas de septiembre, línea aún no operativa): tendría viajes en el feed y **colaría**. Hoy no pasa
(0 viajes), pero es el punto ciego.

**Refuerzo recomendado (si/ cuando pase):** cruzar con el **selector de líneas de Avanza** —la lista
que el operador publica como operativa—. Señal fuerte y barata:
- EM1/etc. **ausentes** del selector → fuera, aunque el GTFS les meta viajes futuros.
- 44/35 **presentes** → dentro.
- `get_stops_list` no vacío como segunda confirmación (EM1 → 0 postes).

⚠️ **NO usar** "viajes HOY" (tira la 44). **NO fiarse solo** de que el GTFS no traiga la línea si algún
día trae planificadas: ahí manda el operador (selector Avanza), no el feed.

## 4 · Recomendación

- **Para el feed actual: no hay que tocar nada.** El filtro zombi existente (`routesWithTrips`) ya
  excluye EM1/EM2/EM3/V1/V4 e incluye 44/35 correctamente. **El problema que planteas ya está
  resuelto** por el criterio bueno (feed-wide, no hoy).
- **Verificar en pantalla:** confirmar que la home no lista ninguna EM/V (debería, por lo anterior).
  Si aparecieran, sería un bug distinto (no vienen del feed) y habría que rastrear de dónde.
- **Si se quiere blindaje a futuro** contra líneas planificadas con viajes futuros: añadir el **selector
  de Avanza** como segunda verja. Es una decisión aparte (mete una dependencia de scraping); **no la
  implemento** hasta que lo decidas.

> **Resumen:** hay criterio limpio y **ya está puesto** (ruta con viajes en el feed). Excluye EM1,
> incluye la 44 pese a los 0 trips de hoy, incluye la 35. Nada que implementar salvo, opcionalmente, el
> refuerzo con el selector de Avanza para el día que un feed traiga líneas planificadas.
