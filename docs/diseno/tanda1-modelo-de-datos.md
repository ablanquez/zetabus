# ZETABUS · TANDA 1 — MODELO DE DATOS Y ARQUITECTURA DE CAPAS

> ## 🔶 DOCUMENTO PARCIALMENTE SUPERADO — leer junto a `TANDA1_CIERRE_DE_CABOS.md` (13/07/2026)
>
> Cuatro secciones han cambiado tras cerrar los cabos. **Lo que dice este documento en esos puntos ya no vale:**
>
> | § | Qué cambia |
> |---|---|
> | **§11.4** (momento oro) | **Se reactiva**, pero **NO** como lo propuse. La frase de ejemplo que escribí (*"un Volvo 7900 de 12 m, sencillo"*) **era falsa**: el fichero de flota mentía. Ahora se **cuenta lo que hay en vivo**, sin declarar nada. |
> | **§5.2** (`BusProfile`) | Se añade `clase` y **`confianza: 'oficial' \| 'sin_verificar'`**, que viaja hasta la interfaz. `yearRange` → `fechaMatriculacion`. |
> | **§7.1** (flota) | Deja de ser el JSON heredado. Es `_datos/flota-avanza-zaragoza.json`, regenerado desde el Anexo 5 del pliego, con procedencia dentro. |
> | **§8.3 / §11.6** (caché) | **La caché gana un segundo piso en disco** y deja de depender de cuántos workers arranque Hostinger. La pregunta bloqueante de §11.6 **ya no bloquea**. |
>
> El resto (capas, modelo agnóstico, ruta teórica vs real, tachado vs nota, sin base de datos) **se mantiene íntegro**.

**Fecha:** 13/07/2026 · **Estado:** ✅ **APROBADO el 13/07/2026, con las correcciones de [`TANDA1_CIERRE_DE_CABOS.md`](TANDA1_CIERRE_DE_CABOS.md)**
**Alcance:** diseño. Cero código de producto. Los sondeos de esta tanda son scripts de un solo uso en scratchpad.
**Decisión de producto asociada:** **V1 SOLO ENSEÑA. NO MIDE.** Sin auditoría de frecuencia, sin histórico, sin base de datos.

---

## 0 · VEREDICTO EN UNA PÁGINA

El diseño se sostiene, pero **cuatro cosas de tu brief están mal y hay que cambiarlas antes de escribir una línea de código**. Las cuatro salen en §11 (MI DESACUERDO). La más grave, resumida aquí:

> ⛔ **El "momento oro" de la demo, tal y como lo has formulado, NO SE PUEDE FUNDAMENTAR.**
> *"En esta línea deberían venir articulados"* — **ninguna fuente que tenemos dice qué bus debería venir en qué línea.** No hay campo en el GTFS, ni en la web, ni en la API viva que asigne modelo o capacidad a una línea. Si dices "debería", mientes. Lo que SÍ es verificable, y sigue siendo una frase que no dice ninguna otra app, está en §11.4.

Lo demás:

| Pregunta | Respuesta |
|---|---|
| ¿Hace falta base de datos? | **NO.** Ni una. §9 |
| ¿La caché del framework (`use cache`) sirve para la capa viva? | **NO, y por un motivo técnico, no por gusto.** No expone la EDAD del dato cacheado, y sin la edad mentimos. §8.2 |
| ¿Cuántas peticiones/min a Avanza en el peor caso? | **Medido, no estimado: 51 req/min por línea en pantalla, 4 req/min por parada en pantalla, 0 sin usuarios.** Techo duro propuesto: 4 req/s. §8.5 |
| ¿Cada cuánto refresca Avanza el recorrido real? | **Medido hoy:** 21 de 84 KML tocados el **30/06/2026**; los otros 52 llevan **sin tocarse desde febrero de 2025**. §2.2 |
| ¿El motor puede no saber que es un bus? | **Sí, y te lo demuestro metiendo el tranvía sin tocar el núcleo.** §5.4 |

Y una corrección de hecho al brief: **el tranvía NO es una ficha aparte del NAP. Ya está dentro del ZIP que descargaste.** §11.2

---

## 1 · CÓMO SE HA VERIFICADO ESTO

Todo lo que sigue está medido hoy, 13/07/2026. Lo que no he podido medir lo digo.

| Comprobación | Método | Coste |
|---|---|---|
| Semántica de caché de Next.js | Documentación oficial, `nextjs.org/docs`, **versión 16.2.10** | — |
| Cadencia de actualización del recorrido real | GET con `Range: 0-0` a los 88 KML (46 líneas × 2 sentidos), leyendo `Last-Modified` | 88 peticiones, 1 byte cada una |
| Horizonte de predicción de la API viva | 4 postes de alta densidad | 4 peticiones |
| Coste real de un barrido de línea | Barrido COMPLETO de la línea 35 (63 postes únicos, ambos sentidos) | 63 peticiones, 118 s |
| ¿La flota conoce los coches de hoy? | 35 coches observados en vivo contra `autobuses-avanza-zaragoza.json` | 0 peticiones |
| Tamaño de la red | `stop_times.txt` del GTFS | 0 peticiones |

**Total contra servicios ajenos en esta tanda: ~155 peticiones**, repartidas, con pausas, sin bucles.

---

## 2 · HALLAZGOS NUEVOS QUE CAMBIAN EL DISEÑO

Esto no es relleno. Cada uno de estos cinco hechos mueve una decisión de arquitectura.

### 2.1 · La API viva da EXACTAMENTE los 2 próximos buses por línea, con horizonte largo

Medido en 4 postes. Sin una sola excepción:

```
POSTE 585 (Paseo la Mina)
  040 4639 -> 040->SAN JOSE            3 min.   0 kms.
  040 4930 -> 040->SAN JOSE            8 min.   1 kms.
  029 4131 -> 029->CAMINO LAS TORRES   5 min.   1 kms.
  029 4957 -> 029->CAMINO LAS TORRES  16 min.   4 kms.
  038 4976 -> 038->BAJO ARAGON         6 min.   1 kms.
  038 4113 -> 038->BAJO ARAGON        13 min.   3 kms.
  039 4650 -> 039->PINARES DE VENECIA  6 min.   1 kms.
  039 4275 -> 039->PINARES DE VENECIA 10 min.   2 kms.
```

**Dos por línea. Siempre dos.** Y el horizonte llega a **19 min / 4 km** — es decir, un poste "ve" unos 10 postes río arriba.

**Consecuencia de diseño:** el barrido de una línea es MUCHO más barato de lo que parecía, porque hay una redundancia brutal entre postes vecinos. Y a la vez, **es imposible ver el 3er bus de una línea si está en un hueco entre postes muestreados**. Las dos cosas a la vez. Esto fija §8.4 y §10.1.

### 2.2 · ⭐ Los KML llevan `Last-Modified`, y el patrón es revelador

88 KML sondeados. 84 existen (Ci3 y Ci4 dan **404: no tienen KML**). Distribución de fechas de modificación:

| Fecha | Nº KML | Líneas |
|---|---|---|
| **2026-06-30** | **21** | **21, 22, 28, 29, 30(solo −1), 32, 35, 38, 39, 40, 41** |
| 2026-05-08 | 1 | 59−1 |
| 2025-09-24 | 2 | 36−1, N3−1 |
| 2025-09-22 | 1 | 55−1 |
| 2025-09-16 | 2 | 34−1, Ci1−2 |
| 2025-07-14 | 5 | 33, 34−2, 52 |
| 2025-05-02 | 1 | 53−2 |
| 2025-04-01 | 1 | Ci2−1 |
| 2025-03-28 | 1 | 36−2 |
| **2025-02-27** | **49** | *(el resto — reexportación masiva)* |

Léelo despacio: **las 21 modificadas el 30/06/2026 son exactamente el conjunto de líneas desviadas por las obras del Coso y Avenida Valencia.** Las otras 52 no se han tocado en **16 meses**.

**Tres consecuencias:**
1. **Avanza toca el KML cuando, y solo cuando, cambia la ruta operativa.** Es un fichero, pero se comporta como un evento.
2. **El `Last-Modified` es un detector de cambio de ruta, gratis.** Un GET condicional (`If-Modified-Since`) devuelve `304` y no cuesta casi nada. 84 ficheros × 1 vez/hora = **1,4 peticiones/min**, casi todas 304.
3. Los KML (30/06) son **7 días más frescos que el GTFS** (`feed_start_date` = 23/06). Confirma, una vez más, quién manda.

> ⚠️ **NO VERIFICADO:** que el KML y `get_stops_list` cambien *a la vez*. Son sistemas distintos (fichero estático vs consulta a BD). Diseño en consecuencia: el KML es una **pista**, no el reloj. §7.3

### 2.3 · Un barrido de línea completo cuesta 63 peticiones… y 10 bastan

Barrido real de la **línea 35** (30 postes en sentido −1, 36 en −2, 63 únicos), hoy, 13:15h:

```
Buses distintos de la 035 detectados barriendo los 63 postes: 12
  4301 4312 4333 4839 4845 4847 4852 4889 4901 4906 4910 4926

COBERTURA POR SUBMUESTREO:
  cada  1 paradas -> 63 peticiones, 12/12 coches (100%)
  cada  2 paradas -> 32 peticiones, 12/12 coches (100%)
  cada  3 paradas -> 21 peticiones, 12/12 coches (100%)
  cada  4 paradas -> 17 peticiones, 12/12 coches (100%)
  cada  6 paradas -> 10 peticiones, 12/12 coches (100%)
  cada  8 paradas ->  9 peticiones, 11/12 coches ( 92%)
```

**Con 10 peticiones se ven los 12 buses. Con 63, los mismos 12.** Es el corolario de §2.1: cada poste ve 4 km río arriba, y las paradas están a 300-400 m.

> ⚠️ **Esto es UNA medición, en UN momento, en UNA línea. No es un teorema.** Que a *stride 8* la cobertura baje a 92% y a *stride 10* vuelva a 100% demuestra que es ruido de muestreo, no una función monótona. **No garantiza nada.** Por eso el diseño usa *stride 4* (margen ×1,5 sobre el punto donde empieza a fallar) **y aun así la interfaz dice "buses detectados", no "todos los buses".** §10.1

### 2.4 · Barrer una línea te regala 21 líneas más

En ese mismo barrido de la 35 aparecieron, gratis, buses de otras 21 líneas:

```
035:126  032:24  042:18  029:16  036:16  038:16  022:14  053:12  021:8
039:8   028:8   CI1:6   050:6   031:4   041:4   CI4:4   040:4   030:4  ...
```

**Consecuencia de diseño, y es grande:** la caché NO se organiza por línea. Se organiza **por poste**, y todas las vistas comen del mismo plato. El barrido de la línea 35 rellena, sin coste adicional, la vista de parada de 63 postes y parte de la vista de otras 21 líneas. Esto es lo que convierte "10 usuarios = 1 petición" en algo real y no en un eslogan. §8.3

### 2.5 · La flota aguanta. Los 35 coches vistos hoy están en el JSON

```
vehiculos: 369
campos: numeroAutobus, fabricante, modelo, longitud, anio, tipoCombustible
ejemplo: {"numeroAutobus": 4110, "fabricante": "Mercedes-Benz", "modelo": "eCitaro",
          "longitud": "12 m", "anio": "2025", "tipoCombustible": "Eléctrico"}

longitud        -> {'12 m': 304, '18 m': 55, '10 m': 10}
tipoCombustible -> {'Eléctrico': 114, 'Híbrido': 111, 'Diésel': 97, 'Diésel (Ecobus)': 47}

coches observados en vivo: 35
reconocidos por el JSON  : 35
DESCONOCIDOS             : 0
```

**35/35.** El fichero hecho a mano se sostiene. Es tu activo insustituible y funciona.

Dos avisos sobre su forma, que condicionan los tipos:
- `longitud` es **string** (`"18 m"`), no número. **Articulado = 18 m → 55 vehículos.** Hay que derivarlo parseando, y el parseo debe fallar ruidosamente si aparece un valor nuevo.
- `anio` es un **rango** (`"2022-2024"`), no un año. **No lo tipes como `number`.**

---

## 3 · LO QUE DICE LA DOCUMENTACIÓN OFICIAL (verificado hoy, Next.js 16.2.10)

Pediste que consultara la doc antes de decidir. Lo he hecho, y hay dos hechos que **cambian el plan por defecto**.

### 3.1 · `unstable_cache` está deprecado. El camino es `use cache`

Next.js 16 introduce **Cache Components**. `unstable_cache` queda formalmente sustituido por la directiva `'use cache'`, con `cacheLife()` y `cacheTag()` (que **perdieron el prefijo `unstable_`** al estabilizarse). Para un proyecto nuevo, `use cache` es lo correcto y `unstable_cache` sería empezar en deuda.

Requiere activar el flag:
```ts
// next.config.ts
const nextConfig: NextConfig = { cacheComponents: true }
```

`cacheLife` maneja tres tiempos, y hay que entenderlos porque no son lo mismo:
- **`stale`** — cuánto usa el cliente su copia sin preguntar al servidor. *(Mínimo forzado de 30 s.)*
- **`revalidate`** — pasado esto, la siguiente petición **sirve lo viejo y refresca por detrás** (stale-while-revalidate).
- **`expire`** — pasado esto sin tráfico, la siguiente petición **espera** a que se regenere.

Perfiles de fábrica: `seconds` (revalidate 1 s, expire 1 min), `minutes`, `hours`, `days`, `weeks`, `max`.

### 3.2 · ⚠️ La memoización de `fetch` es **solo GET**. Y no aplica en Route Handlers

Literal de la doc:

> *"`fetch` requests using `GET` with the same URL and options are automatically memoized during a server render pass."*
> *"Memoization does not apply in Route Handlers, since they are not part of the React component tree."*

**Nuestra API viva es un `POST`.** Y la vamos a consumir desde un Route Handler. **Las dos condiciones fallan.** El caché de `fetch` del framework **no nos sirve absolutamente para nada** en la capa viva. Esto no es una opinión: es la doc.

Queda `use cache` alrededor de nuestra propia función `async`. Que sí funciona en un Route Handler (la doc lo ejemplifica). Pero tiene un problema, y es el que decide §8.2.

### 3.3 · Autoalojado en un solo proceso: la caché vive en memoria **y en disco**

> *"By default, generated cache assets will be stored in memory (defaults to 50mb) and on disk."*
> *"This works automatically for a single self-hosted `next start` instance with persistent local disk."*

Bien para nosotros: Hostinger, 1 slot Node, `next start`. **No hace falta `cacheHandler` personalizado ni Redis.** La doc solo los exige con múltiples instancias.

> ❓ **PREGUNTA PARA TI, Y ES LOAD-BEARING:** ¿el slot de Hostinger es **UN** proceso Node, o arranca varios workers (PM2 en modo cluster)? **Si son 2 procesos, la caché en memoria se parte en dos y todas las cuentas de §8.5 se multiplican por 2.** No lo puedo saber desde aquí.

---

## 4 · LAS TRES CAPAS

```
┌──────────────────────────────────────────────────────────────────────────┐
│  VISTAS            app/(rutas)   ·   components/                          │
│  Hablan SOLO el modelo propio. No saben que Avanza existe.               │
│  No saben qué es un POST, ni un KML, ni un poste.                        │
└──────────────────────────────────────────────────────────────────────────┘
                                    ▲
                        core/*  (tipos + reglas derivadas)
                                    ▲
┌──────────────────────────────────────────────────────────────────────────┐
│  NORMALIZACIÓN     core/                                                  │
│  Entidades: Stop, Line, Direction, Vehicle, Arrival, Advisory, Delta.    │
│  Reglas: cómo se compone la ruta real, cómo se calcula el diff,          │
│  cómo se decide si una línea circula ahora. CERO red. CERO HTML.         │
│  ⭐ AQUÍ NO APARECE LA PALABRA "BUS" NI UNA SOLA VEZ.                     │
└──────────────────────────────────────────────────────────────────────────┘
                                    ▲
                        ports (interfaces) — el contrato
                                    ▲
┌──────────────────────────────────────────────────────────────────────────┐
│  INGESTA           sources/<proveedor>/                                   │
│  Un adaptador por fuente. Cada uno: habla su protocolo sucio (POST,      │
│  HTML dentro de JSON, KML, ZIP), y devuelve entidades del núcleo.        │
│  TODA la suciedad vive aquí y NO SALE DE AQUÍ.                           │
│  · sources/gtfs-nap/            (ZIP → topología teórica) [build]        │
│  · sources/avanza-zaragoza/     (POST/HTML/KML → ruta real + vivo)       │
│  · sources/flota-zetabus/       (JSON propio → perfiles de vehículo)     │
│  · sources/tranvia-zaragoza/    ← el 004. No existe todavía.             │
└──────────────────────────────────────────────────────────────────────────┘
```

**La regla que hace que esto no se pudra**, y es una sola:

> Un tipo de `core/` **no puede importar nada de `sources/`**. Nunca. Si un campo del núcleo necesita saber de dónde vino, es que está mal puesto.
> Se vigila con un test de arquitectura (dependency-cruiser o un test de import), no con buena voluntad.

---

## 5 · EL MODELO DE DATOS

### 5.1 · El núcleo — y aquí no se nombra al bus

```ts
// core/ids.ts — identidades opacas. El núcleo NO sabe que un StopId
// "esconde" un poste ni que un LineId esconde una route_id del GTFS.
type StopId    = string & { readonly __brand: 'StopId' }
type LineId    = string & { readonly __brand: 'LineId' }
type VehicleId = string & { readonly __brand: 'VehicleId' }
type SourceId  = string & { readonly __brand: 'SourceId' }

type Mode = 'bus' | 'tram'          // ← el único punto de extensión por modo

type LatLon = { lat: number; lon: number }
```

```ts
// core/entities.ts

interface Stop {
  id: StopId
  code: string | null       // el código que enseña el operador en la marquesina
  name: string
  position: LatLon
  modes: Mode[]             // una parada puede servir a varios modos
}

interface Line {
  id: LineId
  mode: Mode
  shortName: string         // "35"
  longName: string
  color: Hex                // ⚠️ color de MARCA. Ver §5.5.
  textColor: Hex
  operator: string
}

/** Un sentido de una línea. Aquí vive TODA la tensión teórico/real. */
interface Direction {
  lineId: LineId
  directionId: 0 | 1
  headsign: string

  /** Lo que la topología oficial dice que es. Puede estar desfasada. */
  official: RouteShape

  /** Lo que el operador está ejecutando HOY. Manda esta. Puede faltar. */
  current: RouteShape | null

  /** Derivado. La diferencia ES el producto. No se guarda: se calcula. */
  // delta = computeDelta(official, current)
}

interface RouteShape {
  stops: StopId[]           // ORDENADA
  geometry: LatLon[]
  provenance: Provenance    // ⭐ obligatorio. Sin esto no podemos decir la verdad.
}

interface Provenance {
  source: SourceId          // 'gtfs-nap' | 'avanza-web' | 'zetabus-editorial'
  observedAt: Date          // cuándo lo LEÍMOS nosotros
  sourceUpdatedAt: Date | null  // cuándo lo cambió ELLOS (Last-Modified, feed_start_date)
  url: string | null        // para poder enseñárselo al usuario
}

/** Un vehículo detectado ahora mismo. NO tiene "articulado" ni "combustible". */
interface Vehicle {
  id: VehicleId
  mode: Mode
  lineId: LineId | null
  headsign: string | null
  position: LatLon
  observedAt: Date
  profile: VehicleProfile | null   // ← lo específico del modo, tipado, en §5.2
}

/** Un bus que viene hacia una parada. */
interface Arrival {
  stopId: StopId
  lineId: LineId
  vehicleId: VehicleId | null
  headsign: string
  etaMinutes: number
  distanceKm: number | null   // ⚠️ entero en la fuente. 0 km ≠ 0 metros.
  observedAt: Date
}

/** Lo que el operador DICE. Nunca lo que nosotros deducimos. */
interface Advisory {
  id: string
  source: SourceId
  publishedAt: Date
  scope: { lineIds: LineId[]; stopIds: StopId[] }
  kind: 'suppression' | 'diversion' | 'schedule' | 'other'
  title: string
  bodyHtml: string
  url: string
  /** Editorial. NO derivable. Ver §9.2. */
  review: { reviewedAt: Date; status: 'vigente' | 'caducado' | 'sin-revisar' } | null
}
```

**Cuenta las veces que aparece la palabra `bus` ahí arriba: cero.** `Mode` es un valor, no un tipo con privilegios. `Stop` no tiene `poste`. `Vehicle` no tiene `numeroAutobus`. `Line` no tiene `route_type`.

### 5.2 · Lo específico del modo va en un perfil, TIPADO

Aquí es donde discrepo del "todo genérico" llevado al extremo. La tentación es meter lo específico en `attributes: Record<string, unknown>`. **Eso es tirar el tipado a la basura justo en el sitio donde está tu funcionalidad estrella.** Un `string` mal escrito y la demo enseña `undefined`.

Unión discriminada. El núcleo la conoce como forma, no como contenido:

```ts
// core/profiles.ts
type VehicleProfile = BusProfile | TramProfile

interface BusProfile {
  mode: 'bus'
  manufacturer: string
  model: string
  lengthMeters: 10 | 12 | 18     // ← literal. Un 15 no compila, y eso es lo que quiero.
  isArticulated: boolean          // derivado: lengthMeters === 18
  fuel: 'Eléctrico' | 'Híbrido' | 'Diésel' | 'Diésel (Ecobus)'
  yearRange: string               // "2022-2024". NO es un número. §2.5
}

interface TramProfile { mode: 'tram'; /* … cuando llegue el 004 */ }
```

Las vistas hacen `if (v.profile?.mode === 'bus')` y TypeScript les estrecha el tipo. Sin castings, sin `any`, sin `as`.

### 5.3 · El puente de identidad NO es del núcleo

`poste = int(stop_code[2:])` (`"PA00669"` → `669`) es un detalle **de Avanza**. Vive en `sources/avanza-zaragoza/identity.ts` y **no sale de ahí**. El núcleo solo ve `StopId`.

Esto no es purismo. Es que el tranvía **no tiene prefijo `PA`** (50 paradas, comprobado en Fase 3). Si el puente estuviera en el núcleo, el tranvía lo rompería el primer día.

### 5.4 · ⭐ LA PRUEBA: meter el tranvía sin tocar el núcleo

Lo pediste. Aquí está, y es más fácil de lo que crees porque **el tranvía ya está en el ZIP que descargaste**:

```
=== AGENCIAS EN zaragoza-gtfs.zip ===
  agency_id=1   Avanza Zaragoza S.A.U.
  agency_id=11  Tranvías Urbanos de Zaragoza S.L.
  rutas con viajes: {('1','704'): 44 buses, ('11','900'): 1 tranvía}
  route_type 900 = ['TRA/Tranvía L1 Valdespartera - Actur - Parque Goya']
```

Para añadir el tranvía al 004 hay que tocar **exactamente esto**:

| Fichero | Cambio |
|---|---|
| `core/ids.ts` | `type Mode = 'bus' \| 'tram'` — **ya está puesto** |
| `core/profiles.ts` | Añadir `TramProfile` a la unión |
| `sources/gtfs-nap/` | **Quitar** el filtro `agency_id === '1'`. Es una línea. |
| `sources/tranvia-zaragoza/` | Adaptador nuevo, SOLO si existe tiempo real de tranvía |
| `core/entities.ts` | **NADA** |
| Vistas, mapa, caché, ingesta viva | **NADA** |

El mapa pinta `Vehicle[]`. Le da igual si ruedan sobre asfalto o sobre raíl.

**El único trabajo real del 004 no es el modelo: es encontrar una fuente de tiempo real para el tranvía.** Y eso, hoy, **NO SÉ SI EXISTE.** Probado en Fase 2: no hay GTFS-RT para Zaragoza. Lo estático del tranvía lo tienes ya; lo vivo es una incógnita abierta.

### 5.5 · ⚠️ El color de línea y el semáforo — la trampa que ya identificamos

`Line.color` es el color **de marca** (`route_color` del GTFS). El estado (desviada / parada suprimida / sin datos) **NO PUEDE usar rojo/ámbar/verde**, porque la red tiene líneas rojas, verdes y ámbar de marca. Un semáforo cromático choca de frente con la identidad de las líneas.

**El estado no se codifica en color. Se codifica en FORMA** (trazo discontinuo, tachado, icono) **y en TEXTO.** El color queda reservado, entero, a la identidad de la línea. Esto es una decisión de diseño que sale de la Fase 4 y que el modelo obliga a respetar: no hay campo `statusColor` en `Line`. A propósito.

---

## 6 · RUTA TEÓRICA vs RUTA REAL (tu decisión nº 2)

### 6.1 · Se guardan LAS DOS. Y no es por indecisión

Preguntas: *"¿se guardan las dos y se elige, o solo la real?"*

**Las dos. Y no es cautela: es que el diff ES el producto.** Si solo guardas la real, **no puedes decirle al usuario que su parada de siempre ya no se usa** — porque no tienes con qué compararla. La capa que nadie más tiene *es* la resta.

```ts
interface RouteDelta {
  removed:   StopId[]   // en official, NO en current → EL BUS YA NO PASA. Tachar.
  added:     StopId[]   // en current, NO en official → parada provisional.
  reordered: boolean    // mismas paradas, otro orden
  geometryChanged: boolean
  computedFrom: { official: Provenance; current: Provenance }
}
```

### 6.2 · Manda la real. Siempre. Y cuando no hay real, se dice

| Situación | Qué se sirve | Qué se le enseña al usuario |
|---|---|---|
| `current` existe y = `official` | `current` | Nada. Todo normal. |
| `current` existe y ≠ `official` | `current` | **Trazado real + paradas retiradas tachadas + aviso.** El producto. |
| `current` = null (endpoint caído) | `official` | **"Recorrido teórico. No hemos podido confirmar el de hoy."** Con la hora del último intento. |
| `current` = null y hay desvío conocido | `official` + Advisory | **"Hay obras en esta línea. No podemos dibujar el recorrido de hoy."** Peor caso, pero honesto. |

Y una regla que no se negocia: **si `current` es null, el trazado se dibuja con otro estilo visual** (discontinuo, apagado). El usuario tiene que poder VER, sin leer, que le estás enseñando teoría.

### 6.3 · El caso Ci3 / Ci4: sin KML

Comprobado hoy: **`Ci3-1.kml`, `Ci3-2.kml`, `Ci4-1.kml`, `Ci4-2.kml` dan 404.** No existen. Para esas dos líneas **no hay geometría real**, solo la del GTFS.

No es un bug. Es una condición permanente del proveedor y el modelo debe soportarla nativamente: `RouteShape.geometry` viene del GTFS con `provenance.source = 'gtfs-nap'`, y la interfaz lo etiqueta. **No inventamos una geometría que no tenemos.**

### 6.4 · ⚠️ El precio de shapes.txt: preciso y mentiroso

Ya lo sabíamos: `shapes.txt` tiene 300-440 puntos y **miente cuando hay obras**; el KML tiene 153 y **dice la verdad**.

**Regla:** la geometría de `current` viene del KML. La de `official`, de `shapes.txt`. **No se mezclan jamás** — nada de "coger la precisión del GTFS y corregirla con el KML". Eso es exactamente la ñapa que produciría un trazado que no es ni el de nadie. Cada `RouteShape` lleva su `provenance` y su geometría, íntegras, de una sola fuente.

---

## 7 · EL PIPELINE: QUÉ SE INGESTA CUÁNDO

### 7.1 · Tres velocidades. No se mezclan

| Capa | Qué | Fuente | Cuándo | Dónde vive |
|---|---|---|---|---|
| **ESTÁTICO** | Topología teórica, colores, calendario | GTFS ZIP | **En el `build`** | Artefacto tipado en el bundle |
| **ESTÁTICO** | Flota (369 vehículos) | JSON propio | **En el `build`** | `Map<VehicleId, BusProfile>` en el bundle |
| **SEMI-ESTÁTICO** | Recorrido real ordenado | `get_stops_list` | **cada 6 h** + a demanda | `use cache` + `cacheTag('ruta:35')` |
| **SEMI-ESTÁTICO** | Geometría real | KML | **cada 1 h** (GET condicional) | idem |
| **SEMI-ESTÁTICO** | Avisos | `get_alteraciones_servicio` | **cada 1 h** | `use cache` |
| **VIVO** | Buses y minutos | `gps.avanzabus.com` | **15-20 s**, bajo demanda | Caché propia. §8 |

### 7.2 · El GTFS se procesa en el BUILD, no en runtime

`stop_times.txt` tiene decenas de miles de filas. **Parsear un ZIP en cada arranque es tirar arranque a la basura, y en cada petición sería demencial.** Un script de build lee el ZIP y emite un artefacto compacto (paradas, líneas, secuencias por sentido, geometrías, calendario). El servidor solo hace `import`.

### 7.3 · ⚠️ EL GTFS CADUCA EL 05/10/2026. Y nadie lo ha dicho todavía

```
feed_start_date: 20260623
feed_end_date:   20261005      ← dentro de 84 días
```

**Dentro de menos de tres meses, el `official` de este proyecto estará oficialmente vencido según su propio autor.**

Requisito de diseño, no sugerencia:
- El artefacto de build lleva grabado `feedEndDate`.
- **Si `hoy > feedEndDate`, la aplicación lo dice en pantalla.** No falla, no se calla: lo dice. *"Los datos oficiales de recorrido caducaron el 05/10/2026. Lo que ves puede estar desfasado."*
- El build **avisa** (warning, no error) cuando faltan menos de 30 días.
- Hay que documentar el procedimiento de re-descarga del NAP (ficha 1176, ApiKey). En el README, no en tu cabeza.

### 7.4 · Cómo se refresca el recorrido real (tu pregunta directa)

Preguntabas: *"¿Cada cuánto se refresca `get_stops_list`? No sabemos con qué frecuencia lo actualiza Avanza — investígalo o dime que no se puede saber."*

**Se puede saber, y lo he medido.** §2.2: Avanza toca el KML **solo cuando cambia la ruta**. En 16 meses, 52 de 84 líneas-sentido **no han cambiado ni una vez**. El 30/06 cambiaron 21 de golpe (las obras).

Propuesta, con las dos cifras encima de la mesa:

```
CADA 6 h : refrescar get_stops_list de las 44 líneas × 2 sentidos = 88 peticiones
           → 352 peticiones/día = 0,004 req/s. Irrelevante.
CADA 1 h : GET condicional (If-Modified-Since) a los 84 KML
           → 2.016 peticiones/día, casi todas 304 sin cuerpo. ~1,4 req/min.
           Si uno cambia → revalidateTag('ruta:<L>') → get_stops_list de esa línea, YA.
```

Con esto, el retraso máximo en detectar un desvío nuevo es **1 hora**, no 24. Y el coste total de la capa semi-estática es **inferior a 2 peticiones por minuto**, sostenido.

> ⚠️ Lo que **NO** sé, y lo digo: **si `get_stops_list` cambia en el mismo instante que el KML.** No lo he podido probar (haría falta pillar un cambio en vivo). Por eso el refresco de 6 h existe **aunque** tengamos el detector del KML: es el cinturón, y el KML es los tirantes. Si el KML resulta ser un mal chivato, seguimos cubiertos.

---

## 8 · LA CACHÉ Y LA CUENTA DE PETICIONES

### 8.1 · El pecado que hay que matar

El proyecto viejo: `setInterval(doRefresh, 20_000)` en el cliente, `force-dynamic`, `no-store`, sin caché. **10 usuarios en la misma parada = 30 peticiones/minuto a Avanza.** Tienes razón: es la vía rápida al bloqueo de IP.

### 8.2 · ⚠️ Por qué la caché de la capa viva NO puede ser `use cache`

Esta es la decisión técnica más delicada del diseño, y quiero razonarla, no imponerla. Me has pedido "modo Next.js"; `use cache` **es** el modo Next.js. Y aun así, para la capa viva, digo que no. Tres motivos, en orden de peso:

**1. `use cache` no expone la EDAD del dato. Y sin la edad, mentimos.**
`cacheLife({revalidate: 20})` sirve el valor viejo mientras refresca por detrás (*stale-while-revalidate*). Un usuario puede estar viendo un dato de hace 20, 30 o 50 segundos **y la API no tiene forma de decirle a la vista cuántos**. Para un blog, da igual. Para "tu bus llega en 1 minuto", **la diferencia entre 1 minuto y hace-40-segundos-decía-1-minuto es todo el producto.** Necesitamos poner en pantalla *"actualizado hace 18 s"*, y para eso hay que tener el `observedAt` de la entrada. La caché tiene que ser nuestra porque **el dato que necesitamos es la propia caché**.

**2. No está documentado que `use cache` deduplique peticiones concurrentes en frío (*single-flight*).**
Si 10 usuarios piden el mismo poste en el mismo segundo, con la entrada caducada, **no tengo un documento que me garantice que Avanza recibe 1 petición y no 10.** Y tu requisito nº 3 es duro, no aspiracional. No fundamento un requisito duro en un comportamiento no documentado.

**3. Necesitamos un techo de cortesía, y eso no es trabajo de un caché.**
Estamos raspando un servicio ajeno, sin permiso, sin rate limit publicado. Hace falta un **cubo de fichas** (máx. N req/s globales), un **cortacircuitos** (si Avanza empieza a dar 5xx, dejamos de pegarle) y un **timeout** (el proyecto viejo no tenía: un `fetch` colgado se comía el slot). Un caché de framework no hace nada de eso. **No es su trabajo.**

> **¿Es esto una ñapa? No, y quiero ser claro sobre por qué.**
> Next.js no tiene ninguna opinión sobre cómo hablas con un `POST` de un tercero. `use cache` cachea **contenido renderizado**. Un cliente HTTP bien educado hacia un servicio ajeno es **infraestructura de la capa de ingesta**, y ahí es donde vive. La ñapa sería lo contrario: retorcer `use cache` para que haga de rate limiter.

**Y `use cache` SÍ se usa — donde encaja como un guante:** la capa semi-estática (`get_stops_list`, KML, avisos), con `cacheLife('hours')` + `cacheTag('ruta:35')` + `revalidateTag()` cuando el KML cambie. Ahí es exactamente la herramienta correcta y la usamos sin inventar nada.

### 8.3 · La caché viva: por POSTE, compartida por todas las vistas

```
                    ┌──────────────────────────────────┐
   vista parada ───▶│                                  │
                    │   PosteCache                     │──▶ AvanzaClient ──▶ Avanza
   vista línea  ───▶│   Map<poste, Entry>              │    · single-flight
   (barrido)        │   Entry = { arrivals, vehicles,  │    · cubo de fichas 4 req/s
                    │             observedAt, error }  │    · timeout 8 s (AbortController)
                    │   TTL 20 s                       │    · cortacircuitos
                    └──────────────────────────────────┘    · reintento único
```

Las cuatro propiedades, y ninguna es opcional:

1. **TTL 20 s.** El dato de Avanza se refresca cada 10-20 s. Una caché de 20 s es honesta. Una de 5 min sería mentir, como dices.
2. **Single-flight.** Si hay una petición en vuelo para el poste 669, el 2º, 3º y 10º usuario **se enganchan a la misma promesa**. No se lanza otra. *(Un `Map<poste, Promise>` de 15 líneas. Es el patrón estándar, no un invento.)*
3. **Compartida entre vistas.** El barrido de la línea 35 llena la caché de 17 postes. Un usuario que abra la parada 669 en los siguientes 20 s **no genera ni una petición**. Esto es §2.4 cobrado.
4. **`observedAt` por entrada.** Es el motivo nº 1 de §8.2 y viaja hasta la vista.

**Qué pasa al reiniciar el servidor:** se pierde. Es memoria del proceso. **Y no importa:** la primera petición tras el reinicio es un fallo de caché y cuesta 1-2,6 s. No hay nada que persistir. Un dato de posición de bus **caduca en 20 segundos**; persistirlo es persistir basura.

### 8.4 · El barrido de línea: a demanda, con paso 4

De §2.3: paso 4 sobre la línea 35 = **17 peticiones**, cobertura 12/12 medida. Paso 4 es margen ×1,5 sobre el primer punto donde vi un fallo (paso 8).

- **Se dispara bajo demanda.** Sin usuarios mirando una línea, **cero peticiones**. No hay barredor de fondo permanente. Un servicio que raspa a un tercero 24/7 sin que nadie mire es indefendible si algún día tienes que dar explicaciones.
- **Concurrencia limitada a 6.** Medido: 1,0-2,6 s por petición. 17 postes / 6 en paralelo ≈ 5-8 s de barrido. Cabe holgado en un ciclo de 20 s.
- **Escalonado.** Los 17 postes no se piden en el mismo instante. Se reparten en la ventana.
- **La unión se deduplica por nº de coche.** Un bus visto desde 5 postes es UN bus.
- Los postes ya calientes en la caché **no se vuelven a pedir**.

### 8.5 · ⭐ LA CUENTA. El peor caso, medido

**Fórmula:** `req/min = (postes_únicos_en_demanda) × (60 / TTL)`. Con TTL 20 s → **×3**.

| Escenario | Postes únicos | **req/min a Avanza** | req/s |
|---|---|---|---|
| Nadie mirando | 0 | **0** | 0 |
| 1 parada | 1 | **3** | 0,05 |
| **10 usuarios, MISMA parada** | 1 | **3** | 0,05 |
| 50 usuarios, 20 paradas distintas | 20 | **60** | 1,0 |
| **1 línea** (paso 4) | 17 | **51** | 0,85 |
| 3 líneas (solape céntrico ~40) | ~40 | **120** | 2,0 |
| 5 líneas (solape ~60) | ~60 | **180** | 3,0 |
| **Peor caso realista** (5 líneas + 30 paradas) | ~85 | **255** | **4,2** |
| *Techo duro del cubo de fichas* | — | **240** | **4,0** ⛔ |

**El proyecto viejo, para comparar:** 10 usuarios en 1 parada = **30 req/min**. El nuevo, mismo escenario: **3 req/min**. **Factor 10.** Y con 50 usuarios en esa parada, el viejo hace 150 req/min y el nuevo sigue haciendo **3**.

**El cubo de fichas es un techo DURO a 4 req/s.** Si la demanda lo supera, **no se hacen más peticiones: se sirve dato más viejo, y la pantalla dice que es más viejo.** Degradar es aceptable. Martillear, no.

Añadiendo la capa semi-estática (§7.4, ~1,4 req/min) el total sostenido en el peor caso realista es **~256 req/min ≈ 4,3 req/s**. Para un servicio que su propia web consulta en cada visita de cada usuario, es un tráfico modesto. **Pero es una estimación de cortesía, no un permiso.** §10.5.

---

## 9 · ¿HACE FALTA BASE DE DATOS?

### 9.1 · NO. Argumentado

Aplico tu propia regla: **lo derivable no se guarda.**

| Dato | ¿Derivable? | Dónde vive |
|---|---|---|
| Topología teórica, colores, calendario | Del ZIP | **Artefacto de build** |
| Flota (369 vehículos) | Del JSON propio | **Artefacto de build** |
| Recorrido real ordenado | De `get_stops_list` | **`use cache`** (memoria + disco) |
| Geometría real | Del KML | **`use cache`** |
| Avisos | De `get_alteraciones_servicio` | **`use cache`** |
| Posiciones y minutos | De la API viva | **Caché en memoria, TTL 20 s** |
| El diff teórico↔real | **Se calcula** de los dos anteriores | **En ninguna parte.** Es una función. |

**Todo se deriva. Nada se persiste. No hay base de datos.**

**Qué pasa al reiniciar el servidor:**
- Caché viva → se pierde. **Irrelevante:** caduca en 20 s de todas formas.
- `use cache` → **sobrevive**, la doc dice que el handler por defecto escribe en memoria *y en disco*.
- Artefactos de build → están en el bundle. Inmortales.
- **Coste real de un reinicio: la primera petición de cada poste tarda ~2 s. Nada más.**

### 9.2 · La única excepción, y no es una base de datos

Hay **exactamente una** cosa que no se deriva de ninguna fuente: **nuestro juicio editorial sobre si un aviso viejo sigue vivo.**

Ninguna fuente lo dice. Es un hecho probado (Fase 6: hay avisos de enero todavía publicados; Fase 7: la API viva no adjudica). **Ese dato no existe en el mundo. Lo creamos nosotros o no existe.**

**Propuesta: un fichero versionado en git.** No una BD.

```jsonc
// data/editorial/avisos.overrides.json
{
  "coso-supresion-2026-01-10": {
    "revisadoEl": "2026-07-13",
    "estado": "vigente",
    "nota": "Comprobado en la web de Avanza: el aviso sigue publicado."
  }
}
```

Por qué git y no BD:
- **Volumen ridículo:** son 6 avisos, no 6 millones.
- **Cambia cada semanas**, no cada segundo.
- **Es una afirmación con autor.** Debe ser auditable, revisable y reversible. Un `git blame` te dice quién dijo que ese aviso seguía vivo y cuándo. Una fila en una tabla, no.
- Meter Postgres para 6 filas que cambian una vez al mes es **exactamente la ñapa al revés**: complejidad de infraestructura para un problema editorial.

**Coste:** cambiarlo exige un despliegue. A esta escala, es correcto: **una afirmación editorial DEBE pasar por una revisión.** Es una característica, no una limitación.

### 9.3 · Cuándo SÍ necesitarías base de datos (y hoy no)

Sé honesto contigo mismo sobre esto, porque va a picarte:

**Si algún día quieres decir "en esta línea, el 70% de los buses son articulados", necesitas HISTÓRICO. Y el histórico no se deriva de nada: hay que grabarlo mientras pasa, o se pierde para siempre.** Igual que "¿cuándo se recuperó realmente la parada de César Augusto?" — la respuesta solo la puede tener quien estuviera mirando y apuntando.

**Hoy no lo necesitas y no lo vamos a construir.** Pero apúntalo como **no-objetivo consciente**, no como olvido. Y ten claro que **el día que lo quieras, el reloj empieza ese día, no antes.** Si eso te importa, la decisión de empezar a grabar hay que tomarla pronto — pero es una decisión aparte, y no es esta tanda.

---

## 10 · LOS AGUJEROS: QUÉ NO PODREMOS SABER

Cada uno con su frase exacta en la interfaz. **La regla: si no lo sabemos, se dice. No se rellena.**

### 10.1 · No vemos todos los buses. Vemos los detectados

**Por qué:** la API da los **2 próximos** buses por línea y poste (§2.1). Un tercer bus en un hueco entre postes muestreados **es invisible**.

> **En pantalla:** *"6 buses detectados"* · Con un `(i)`: *"Detectamos los buses que se acercan a las paradas de la línea. Alguno puede quedar fuera de nuestra vista."*
>
> ⛔ **Nunca "todos los buses".** Si digo "todos" y falta uno, miento.

### 10.2 · Las paradas suprimidas son indetectables

El hallazgo de la Fase 7, y no ha cambiado: **el bus pasa y no para, y ningún sistema lo registra.** El poste sigue conectado, la API sigue anunciando buses, `get_stops_list` sigue listando la parada.

> **En pantalla, en la parada:** *"Avanza publicó el 10/01/2026 que esta parada está suprimida. Su sistema de tiempo real sigue anunciando buses aquí. No podemos saber cuál de las dos cosas es cierta. **Confírmalo en la marquesina.**"* [enlace al comunicado]

**No se adjudica. Se citan los dos hechos y quién los dice.** Exactamente como querías.

### 10.3 · No hay `trip_id`. Ni rumbo

- **No hay `trip_id`** en el scrape → no se puede atar un bus a un viaje del GTFS → **no se proyecta sobre el trazado.** Decisión tuya, tomada, correcta, no la reabro.
- **Consecuencia que no habías nombrado: tampoco hay RUMBO.** El bus se dibuja como un punto con el color de su línea y su destino en la etiqueta. **Sin flecha.** Una flecha calculada por diferencia entre dos posiciones apunta a cualquier parte cuando el bus está parado en un semáforo — que es la mitad del tiempo.
- `distanceKm` viene **en kilómetros enteros**. `"0 kms."` significa "menos de 1 km", **no "ha llegado"**. Se usa para ordenar, no para pintar.

### 10.4 · La trampa nocturna (y esta SÍ tiene solución)

A las 13:00, la vista de la línea N1 no encuentra ningún bus. Decir *"0 buses detectados"* sería técnicamente cierto y **completamente engañoso**: la línea no circula.

**El GTFS trae `calendar` y `calendar_dates`. Podemos saber si una línea tiene servicio ahora.**

> **En pantalla:** *"La línea N1 no circula a esta hora (servicio nocturno)."*
> **NO:** *"0 buses detectados."*

**Es derivable, así que hay que derivarlo.** Sin esto, todas las líneas búho parecen rotas medio día.

### 10.5 · La base legal es frágil, y hay que mirarla de frente

- `gps.avanzabus.com/index.php/zaragoza/fRefrescaEmpresaExternos` y `wp-admin/admin-ajax.php` son **endpoints internos, sin documentar, sin licencia, sin términos de uso publicados**.
- El GTFS del NAP **sí** tiene una base clara. Lo demás, no.
- **No tenemos permiso. Tenemos ausencia de prohibición explícita, que no es lo mismo.**

Mitigación (que es mitigación, no permiso):
- Techo duro de 4 req/s, cortacircuitos, y **cero peticiones cuando nadie mira**.
- `User-Agent` identificable con un correo de contacto. Si molestamos, que puedan pedirnos que paremos antes de bloquearnos.
- **Y una decisión que te corresponde a ti:** ¿escribes a Avanza (`<correo de contacto del feed — redactado>` está en el `feed_info.txt` del GTFS) antes o después de publicar? No hay respuesta técnica. La hay ética, y es tuya.

### 10.6 · Los que ya conocíamos y siguen abiertos

- **Ci3 y Ci4 no tienen KML** (404, comprobado hoy). Geometría solo teórica. Se etiqueta.
- **`TUR` no devuelve secuencia** en `get_stops_list`. Tampoco está entre las 44 rutas con viajes del GTFS. Probablemente turístico. **Fuera de alcance mientras no sepamos qué es.**
- **Solo 2 de 44 líneas** (35 y 38) tienen su `get_stops_list` validado contra el GTFS. **Las otras 42 son fe, no evidencia.** Validarlas es barato (88 peticiones) y debería hacerse en la Tanda 2.
- **Qué paleta de colores es la de la calle** (GTFS o el JSON manual): NO VERIFICADO. Hace falta una foto de un poste. Ninguna cantidad de código lo resuelve.

---

## 11 · MI DESACUERDO

Me lo has pedido y aquí va, en orden de gravedad.

### 11.1 · ⛔ "Paradas suprimidas TACHADAS" — no. Tachar es afirmar

Escribes: *"paradas suprimidas tachadas, tramos desviados marcados"*. Y también, dos párrafos después: *"Si tacho mientras el aviso siga vivo, TACHO PARA SIEMPRE."* **Has visto el problema y aun así has dejado el tachado en la descripción del producto.**

**Un tachado es una afirmación de hecho: "el bus no para aquí".** Y para las supresiones **no tenemos ese hecho** — tenemos un papel de enero y una API que dice lo contrario (§10.2).

**Propuesta — dos tratamientos visuales para dos hechos epistemológicamente distintos:**

| Hecho | Cómo lo sabemos | Tratamiento | ¿Se apaga solo? |
|---|---|---|---|
| **Desviada** — el bus ya no pasa | **Derivado**: está en `official`, no en `current` | **TACHADO.** Afirmamos. | ✅ **SÍ.** El día que Avanza restaure la ruta, `current` la vuelve a incluir y el tachado **desaparece solo**. |
| **Suprimida** — el bus pasa y no para | **Declarado**: solo el comunicado | **NOTA** anclada a la parada, con fecha, fuente y la contradicción. **Sin tachar.** | ❌ **NO.** Por eso no se tacha. |

**Esto elimina tu "aviso falso permanente" de raíz:** lo que se tacha se auto-apaga porque es derivado. Lo que no se puede auto-apagar, no se tacha nunca. El problema de la vigencia **deja de existir para el tachado**.

Y para la nota, que sí puede envejecer: **degradación por edad**. Un aviso con más de 90 días sin revisar no desaparece — **se degrada** de aviso a nota al pie, con la etiqueta *"aviso antiguo, no confirmado"*. No lo borramos (podría ser cierto) y no lo gritamos (podría ser mentira). El campo `Advisory.review` de §5.1 y el fichero de §9.2 existen exactamente para esto.

### 11.2 · ❌ "El tranvía es una ficha APARTE del NAP" — es falso. Ya lo tienes

```
agency_id=1   Avanza Zaragoza S.A.U.     → 44 rutas, route_type 704
agency_id=11  Tranvías Urbanos de Zgz    →  1 ruta,  route_type 900
              TRA · Tranvía L1 Valdespartera - Actur - Parque Goya
```

**Está dentro de `zaragoza-gtfs.zip`.** El propio `feed_version` lo dice: `20260623_AUZSA_Y_TRANVIA`.

Lo estático del tranvía **ya lo tienes descargado**. Lo que no tienes, y **no sé si existe**, es **tiempo real del tranvía** — ahí sí hará falta buscar fuente. Eso cambia la planificación del 004: el trabajo no es de modelo de datos, es de auditoría de fuentes. Y es más pequeño de lo que creías por un lado y más incierto por el otro.

### 11.3 · ⚠️ "El motor no sabe que es un bus" — de acuerdo, con un límite

Estoy de acuerdo, y el modelo de §5 lo cumple. Pero marco dónde **NO** hay que llevarlo:

**No metas lo específico del modo en un saco genérico** (`attributes: Record<string, unknown>`). Perderías el tipado justo donde está tu funcionalidad estrella, y `bus.attributes['articulado']` te devolverá `undefined` en la demo cuando alguien cambie la clave a `esArticulado`.

**Genérico el núcleo. TIPADO lo específico**, en una unión discriminada (§5.2). El motor sigue sin saber qué es un bus: solo sabe que un `Vehicle` **puede** llevar un `profile`, y que el `profile` se discrimina por `mode`. La abstracción se paga donde vale (entidades, capas, adaptadores) y no donde no vale (los campos de la flota).

### 11.4 · ⛔ EL MOMENTO ORO ESTÁ MAL FORMULADO. Y es el peligro más grande de esta lista

> *"En esta línea DEBERÍAN venir articulados. El que llega en 3 minutos es SENCILLO."*

**"Deberían" no lo puedes sostener con nada.**

He mirado las cuatro fuentes. **Ninguna asigna vehículos, modelos ni capacidades a líneas.** No hay campo en el GTFS. No hay campo en `get_stops_list`. No hay campo en la API viva. No hay campo en tu JSON de flota (que describe vehículos, no asignaciones). **La afirmación "en esta línea deberían venir articulados" no tiene fuente.** Es folclore, y puede ser cierto — pero no lo puedes demostrar, y este proyecto entero se ha construido sobre no afirmar lo que no se puede demostrar.

Si lo dices en la demo y hay un ingeniero de Avanza en la sala, **te desmonta el producto con una frase.**

**Y no hace falta.** Reformúlalo como **observación**, que es igual de espectacular y además es verdad:

> *"Ahora mismo circulan 12 buses en la línea 35. **3 son articulados (18 m) y 9 sencillos (12 m).** El que llega en 3 minutos es un **Volvo 7900 Hybrid, 12 m, sencillo** — el siguiente, a 9 minutos, es un **articulado**."*

Eso es **un hecho observado, verificable, y no lo dice ninguna otra app.** Sigue siendo el momento oro. Solo que ahora es cierto.

*(Y fíjate: para poder decir "**deberían**" con fundamento harías falta histórico. Que es §9.3. Que es la puerta de la base de datos. Por eso este punto y aquel son el mismo punto.)*

### 11.5 · ⚠️ "Caché de 15 s" — de acuerdo, pero el número que importa es el que ENSEÑAS

Dices, y es una gran frase: *"una caché de 15 s es honesta, una de 5 minutos MIENTE."* Correcto. Pero incompleto:

**Con *stale-while-revalidate*, el dato que ve el usuario puede tener más edad que el TTL.** Un TTL de 20 s con refresco en segundo plano puede servir un dato de 25-30 s. No es un fallo: es cómo funciona, y es lo correcto (el usuario no espera 2 s a que Avanza conteste).

**Lo que hace honesta una caché no es su duración. Es que la duración sea VISIBLE.**

> **En pantalla, siempre, en la vista viva:** *"actualizado hace 18 s"*

Y esto **no es cosmético: es el motivo técnico de §8.2**. Para poder escribir "hace 18 s" hay que tener el `observedAt` de la entrada de caché. `use cache` no lo da. **Por eso la caché viva es nuestra.** El requisito de producto y la decisión de arquitectura son la misma cosa.

### 11.6 · Menor: "1 slot Node" no garantiza 1 proceso

Todas las cuentas de §8.5 asumen **un solo proceso**. Si Hostinger arranca PM2 en modo cluster (2, 4 workers), **cada worker tiene su propia caché en memoria y las peticiones a Avanza se multiplican por el número de workers**, silenciosamente. Es el fallo que no verías hasta que te bloqueen.

**No lo puedo comprobar desde aquí. Tienes que confirmarlo tú.** Y si son varios workers, hay solución (`cacheHandler` compartido, o forzar 1 worker), pero **cambia el diseño y hay que saberlo AHORA**, no después.

---

## 12 · LO QUE NECESITO DE TI ANTES DE LA TANDA 2

1. **¿Hostinger arranca UN proceso Node o varios?** (§11.6) — bloqueante para la caché.
2. **¿Aceptas la reformulación del momento oro** (observación en vez de norma)? (§11.4) — cambia el discurso de la demo.
3. **¿Aceptas tachado-solo-para-desvíos y nota-para-supresiones?** (§11.1) — cambia la interfaz.
4. **¿Escribimos a Avanza?** (§10.5) — no es una decisión técnica.

---

## 13 · SI SE APRUEBA, LA TANDA 2 SERÍA

*(Propuesta, no compromiso. No he escrito ni una línea.)*

1. Validar `get_stops_list` de las **42 líneas restantes** contra el GTFS. 88 peticiones. Barato y cierra el mayor "es fe, no evidencia" que queda (§10.6).
2. Comprobar empíricamente si `use cache` deduplica en frío (§8.2, motivo 2). Si lo hace, se documenta; no cambia el diseño, pero cierra una incógnita.
3. Andamiaje: `core/` + el adaptador GTFS de build. **Sin red, sin UI.** Un artefacto tipado y un test de arquitectura que impida que `core/` importe de `sources/`.

---

**Nada de este documento está implementado. No se ha creado ningún fichero de proyecto. Los scripts de sondeo viven en scratchpad y son desechables.**
