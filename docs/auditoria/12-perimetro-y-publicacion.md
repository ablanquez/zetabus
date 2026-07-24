# AUDITORÍA · PERÍMETRO, SEGURIDAD Y PUBLICACIÓN

**Fecha:** 24/07/2026 · **Estado del repo auditado:** `6d44eec` (Tanda 7 cerrada)
**Qué es este documento:** la **guía para implementar los cambios**, no un informe de lo visto.
**Qué NO se ha hecho:** ⛔ **no se ha tocado ni una línea de código de producción.**

---

## ⚠️ Alcance — y lo que aquí NO existe, dicho antes de empezar

**ZetaBus no tiene formularios, ni base de datos, ni subida de ficheros, ni login, ni sesiones,
ni cookies propias, ni un solo campo donde un usuario escriba algo que el servidor guarde.**

⇒ Toda la auditoría clásica de entradas —inyección SQL, XSS almacenado, CSRF, ficheros
maliciosos, escalada de privilegios— **no tiene superficie en esta aplicación**. Rellenar este
documento con esas secciones sería buscar puertas en una pared, y quien lo leyera creería que se
comprobó algo que no existe.

**Lo que ZetaBus sí tiene es PERÍMETRO PÚBLICO**, y ahí hay cosas reales:
1.012 páginas indexables, dos endpoints de API abiertos, un repositorio público con su historial,
y **una dependencia de un tercero (Avanza) al que se le prometen cosas por escrito**.

---

## Método — y qué se ha MEDIDO frente a qué se ha MIRADO

| Bloque | Cómo | ¿Medido o mirado? |
|---|---|---|
| Efecto de un rastreador sobre Avanza | Servidor de **producción** (`next build` + `next start`) con caché aislada en el scratchpad, y `/api/diag` leído antes y después de cada petición | **Medido**, con contraprueba en disco |
| Cabeceras HTTP | `curl -D -` contra el servidor de producción real | **Medido** |
| `robots.txt`, `sitemap.xml`, `noindex` | Códigos de respuesta y `<meta>` en el HTML servido | **Medido** |
| Secretos en el repo | `git grep` sobre el árbol **+ el historial completo**: `git log --all --diff-filter=A --name-only` | **Medido** |
| Licencias | Campo `license` leído de cada `package.json` en `node_modules`, y el `LICENSE.md` del sospechoso | **Medido** |
| Páginas de error | Peticiones con rutas basura y comprobación de lo devuelto | **Medido** |

---

# 1 · HALLAZGOS — ordenados por gravedad

## ⛔⛔ B-F1 · FALLO · **`/api/diag` cuenta CERO peticiones a Avanza mientras se están haciendo**

> El endoscopio del proyecto no mide lo que dice medir. Y lo que dice medir es **la promesa que se
> le hace a Avanza**.

### Lo que se midió

Servidor de producción, **un solo proceso** (mismo `pid` en todos los pasos), caché de disco vacía
y aislada:

| Paso | Qué se pidió | `avanza.peticiones` | `fallosDeCache` | `llamadasAlOrigen` |
|---|---|---:|---:|---:|
| 0 | — (línea base) | 0 | 0 | 0 |
| 1 | `/api/llegadas/744` (**route handler**) | **1** | **1** | **1** |
| 2 | `/parada/1228` (**página**) | **1** ⛔ | **1** ⛔ | **1** ⛔ |
| 3 | `/api/llegadas/1228` (route handler) | 1 | **2** | **1** |

- **Paso 2 no movió NADA.** Mismo proceso, misma máquina, y la página **sí pidió a Avanza**.
- **Contraprueba, en el sistema de ficheros:** tras el paso 2 apareció
  `poste_1228-d4df2754.json` en el directorio de caché. **Solo el render de la página pudo
  escribirlo** — el route handler para el poste 1228 no se había llamado todavía.
- **Y el paso 3 lo confirma por un tercer camino:** `fallosDeCache` sube a 2 pero
  `llamadasAlOrigen` **se queda en 1**. La segunda petición encontró el dato **en el piso de
  disco**, escrito por la página. La petición existió. El contador no la vio.

### La causa

En producción, **el bundle de servidor de las páginas y el de los route handlers son grafos de
módulos distintos, aunque compartan proceso.** Los singletons de módulo
(`contador` en [`src/sources/avanza/transporte.ts:101`](../../src/sources/avanza/transporte.ts#L101)
y la caché de [`src/engine/motor.ts:23`](../../src/engine/motor.ts#L23)) **se instancian una vez
por grafo, no una vez por proceso**. `/api/diag` es un route handler: lee el ejemplar de los route
handlers, y **el de las páginas le es invisible**.

### Por qué importa

`/api/diag` dice de sí mismo, textualmente:

> *«El proyecto viejo llamaba a fetch a pelo […] Si hubiera dos [puntos de salida], la cuenta de
> peticiones/minuto que le prometemos al operador sería una estimación. Con uno solo, **es una
> MEDIDA**: basta contar aquí.»*

**Hoy no es una medida.** Y el sesgo va justo en la dirección mala: en una visita normal, **la
primera petición a Avanza es siempre la del render de la página** (el cliente solo refresca a
partir del segundo 15). Es decir, **se pierde sistemáticamente la petición que todo usuario
provoca**, y solo se cuentan las de quien se queda mirando.

⚠️ **Y la parte buena, que también es un hallazgo:** el **piso de disco sí funciona entre los dos
grafos** (paso 3: `llamadasAlOrigen` no subió). El segundo piso de la caché no es *«una precaución
teórica para el día que Hostinger levante varios workers»*, como dice el comentario de
`diag/route.ts`: **ya está evitando peticiones duplicadas hoy, en un solo worker.** El diseño era
más necesario de lo que su propio autor creía.

- **Coste de arreglarlo:** ~2 h. Hay dos vías: (a) mover el estado a `globalThis` con una clave
  propia —el patrón habitual para singletons que deben sobrevivir a los límites de bundle—, o
  (b) hacer que la página no pida a Avanza en el render y delegue en el mismo route handler.
  (b) es más limpio y **cambia el comportamiento visible** (primera pintura sin datos).
- **Riesgo:** **medio.** (a) es local y verificable con este mismo experimento. (b) toca el orden
  de pintado de la vista de parada, que es lo que `flotacion.spec` vigila.
- ⚠️ **Lo mínimo si no se arregla:** **quitar la palabra «MEDIDA» del comentario y del README.**
  Un contador que dice 0 mientras se piden datos es peor que no tener contador: da confianza falsa.

---

## ⛔ B-F2 · FALLO · **No hay `robots.txt`. 934 páginas de parada, cada una una petición a Avanza**

### Lo que se midió

- `GET /robots.txt` → **404**. `GET /sitemap.xml` → **404**. No existe ninguno de los dos.
- `/parada/[poste]` es **`force-dynamic`** ([`page.tsx:41`](../../src/app/parada/[poste]/page.tsx#L41))
  y **pide a Avanza durante el render** (`llegadasDePoste`, línea 79).
- Las 934 paradas son **alcanzables por enlaces** desde la home → línea → itinerario. Un
  rastreador no necesita adivinar URLs: se las damos.

⇒ **Un rastreador que recorra el sitio produce ~934 peticiones a Avanza**, cada una un fallo de
caché **perfectamente legítimo** (claves distintas). Y con el repositorio público e indexado, eso
no es hipotético.

### Lo que sí protege hoy, y lo que no

| Mecanismo | ¿Cubre este caso? |
|---|---|
| Caché de dos pisos (TTL 15 s) | ⛔ **No.** Acota las peticiones **por clave**, no el **número de claves** |
| `Limitador` (cubo de fichas, 4/s, capacidad 40) | ✔ **Sí, parcialmente.** No impide las 934, pero **impone el ritmo**: un rastreador no puede sacarlas de golpe. 934 a 4/s ≈ **4 minutos**. Eso es un goteo, no una avalancha |
| Cortacircuitos / timeout / reintento | ⛔ Protegen a **ZetaBus** de que Avanza caiga, no a **Avanza** de ZetaBus |

⇒ El techo **convierte un pico en un goteo**, que es mucho. Pero nada impide que el goteo se
repita cada vez que un buscador reindexa.

### Qué se podría hacer (**no se hace aquí**)

| Opción | Coste | Efecto |
|---|---|---|
| **`robots.txt` con `Disallow: /parada/`** (fichero `src/app/robots.ts`) | **15 min** | Corta el caso de raíz para los rastreadores que lo respetan (todos los grandes). ⚠️ **Contrapartida real: las 934 paradas dejan de estar en Google**, y ese es tráfico útil |
| **`Disallow` solo para agentes concretos** + `Crawl-delay` | 20 min | Compromiso. `Crawl-delay` no lo respeta Google |
| **Servir la parada sin datos vivos al rastreador** (detectar bot y saltarse la petición) | ~1 h | ✔ Mantiene la indexación **y** no molesta a Avanza. ⚠️ Detectar bots por `User-Agent` es frágil |
| **Un tope global de claves nuevas por minuto** en la caché | ~2 h | Ataca la causa (**el número de claves**, que es justo lo que hoy no está acotado) y protege también del caso no-rastreador |

- **Mi lectura:** las dos primeras son parches; la cuarta es la que corresponde al diagnóstico
  escrito. **Pero un `robots.txt` cuesta 15 minutos y hoy no hay ninguno**, así que hay algo que
  hacer ya y algo que decidir despacio.
- **Riesgo de tocar:** bajo en todas las opciones. Ninguna toca el motor.

---

## ⛔ B-F3 · FALLO · **`react-leaflet` NO es MIT ni BSD: es Hippocratic-2.1, y no figura en las notas**

### Lo que se midió

Leído directamente del `package.json` instalado y confirmado en su `LICENSE.md`:

```
react-leaflet@5.0.0    "license": "Hippocratic-2.1"
```

**La Hippocratic License 2.1 no es una licencia de código abierto aprobada por la OSI.** Es una
licencia *ethical source*: concede permiso amplio **condicionado** al cumplimiento de principios
de derechos humanos, con arbitraje bajo las *Hague Rules on Business and Human Rights Arbitration*
y **terminación automática de la licencia** si el licenciatario declina participar.

Y tiene una **cláusula de Notice** explícita:

> *«Licensee must ensure that everyone who gets a copy of any part of this Software from Licensee,
> with or without changes, also receives the License and the above copyright notice.»*

### Qué está mal hoy

1. **`THIRD-PARTY-NOTICES.md` § 5 no menciona `react-leaflet` en absoluto.** Su tabla lista
   Next.js, React, Leaflet, OpenStreetMap y TypeScript, y termina con
   *«(Se completa con el `package.json` en la Tanda 2.)»* — **estamos en la Tanda 7 y sigue sin
   completarse.** Faltan también `react-dom` y `node-html-parser`.
2. **`README.md:150` dice *«Código: Apache 2.0»*** sin matizar que el bundle que se sirve al
   navegador **incorpora código bajo una licencia con restricciones de uso que Apache 2.0 no
   contempla**. Quien tome ZetaBus creyéndolo Apache 2.0 puro se lleva una condición que no
   esperaba.
3. **ZetaBus sí distribuye ese código**: `react-leaflet` va compilado en el chunk que descarga cada
   navegador que abre una parada. No es una dependencia de desarrollo.

### Por qué importa aquí más que en otro proyecto

Este repositorio **presume, con razón, de rigor con las licencias ajenas**. Tiene un
`THIRD-PARTY-NOTICES.md` de 125 líneas que distingue *consumir* de *redistribuir*, que explica por
qué el GTFS no se versiona aunque su licencia lo permita, y que documenta el incumplimiento pasado
de la ODbL (la palabra *«colaboradores»*). **Un proyecto que audita la licencia de los datos de
terceros y no la de sus propias dependencias tiene un agujero justo donde dice ser fuerte.** Y es
exactamente la misma forma del incidente de la ODbL: *el documento que obligaba estaba en el repo
desde el principio.*

- **Coste:** ~1 h. Completar la tabla § 5 con las **6 dependencias de producción** y las 17 de
  desarrollo (o al menos las de producción), y añadir a `react-leaflet` su nota y su enlace al
  texto de la licencia. Matizar el `README.md:150`.
- **Riesgo de arreglarlo:** nulo (documentación).
- ⚠️ **Riesgo de NO arreglarlo:** es el único hallazgo de esta ronda con consecuencias fuera de lo
  técnico.

### Y el inventario, ya hecho, para que no haya que repetirlo

| Paquete | Licencia real | ¿En las notas? |
|---|---|---|
| `next` 16.2.10 | MIT | ✔ |
| `react` / `react-dom` 19.2.4 | MIT | react ✔ · react-dom ⛔ |
| `leaflet` 1.9.4 | BSD-2-Clause | ✔ |
| **`react-leaflet` 5.0.0** | **Hippocratic-2.1** ⚠️ | ⛔ **NO** |
| `node-html-parser` 9.x | MIT | ⛔ **NO** |
| `typescript` | Apache-2.0 | ✔ |
| `@playwright/test` | Apache-2.0 | ⛔ (dev) |
| `tailwindcss`, `@tailwindcss/postcss`, `vitest`, `tsx`, `eslint`, `fflate`, `pngjs` | MIT | ⛔ (dev) |
| `dotenv` | BSD-2-Clause | ⛔ (dev) |

**Compatibilidad con Apache 2.0:** MIT, BSD-2-Clause y Apache-2.0 son compatibles sin problema.
**La única excepción es Hippocratic-2.1**, que **añade condiciones** que Apache 2.0 no impone y que
un receptor de ZetaBus no esperaría. No es un impedimento para usar la app; es algo que **hay que
decir**.

---

## ⛔ B-F4 · FALLO · Una ruta personal de Windows publicada en el repositorio

[`scripts/spike-suelo-zoom.ts:85`](../../scripts/spike-suelo-zoom.ts#L85) contiene, escrita a mano:

```
'C:/Users/<usuario>/AppData/Local/Temp/claude/<proyecto>/<uuid-de-sesión>/scratchpad/muestra-zoom.json'
```

Dice el nombre de usuario de la máquina, la estructura de directorios temporales y un
identificador de sesión. **No es un secreto** (no da acceso a nada), pero es exactamente lo que el
encargo pedía buscar: *rutas locales que dicen cómo se llama tu disco y tu estructura de carpetas*.
Y además **el script no funciona en ninguna otra máquina**, lo que lo vuelve inútil para quien
clone.

Menor, del mismo tipo: `docs/diseno/tanda1-cierre-de-cabos.md:28` citaba la ruta absoluta del disco
de Antonio.

- **Coste:** 10 min (parametrizar la ruta o leerla de `argv`). **Riesgo:** nulo — nadie llama a
  ese script desde `package.json`; se invoca a mano.

---

## 🟡 B-D1 · DEUDA · Cero cabeceras de seguridad — y **una de ellas sí importa aquí**

Medido con `curl -D -` contra el servidor de producción:

```
HTTP/1.1 200 OK
Vary: rsc, next-router-state-tree, ...
X-Powered-By: Next.js
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Type: text/html; charset=utf-8
```

**No hay ni una.** `next.config.ts` está tal como lo genera la plantilla:
`{ /* config options here */ }`.

⚠️ **Y aquí la pregunta no es «cuáles faltan» sino «cuáles aplican de verdad a ESTA app».** El
inventario honesto:

| Cabecera | ¿Aplica aquí? | Veredicto |
|---|---|---|
| **`Referrer-Policy: strict-origin-when-cross-origin`** | ✔✔ **SÍ, y es la única con un daño concreto y demostrable** | **La única que pondría sin pensarlo.** Ver abajo |
| `X-Content-Type-Options: nosniff` | ✔ Sí | Barato, correcto. Las dos APIs devuelven JSON; el *sniffing* es real aunque el riesgo aquí sea bajo |
| `Strict-Transport-Security` | ✔ Sí, pero **no aquí** | Es del hosting (Hostinger), no de la app. Ponerla en Next sin HTTPS garantizado puede dejar el sitio inaccesible |
| `Content-Security-Policy` | ⚠️ Sí en teoría, **caro en la práctica** | Next inyecta scripts en línea y Leaflet inyecta estilos; hace falta *nonce* y un middleware. **~1 día de trabajo y capacidad real de romper el mapa.** Sin formularios ni sesiones, el retorno es bajo |
| `X-Frame-Options` / `frame-ancestors` | ⛔ **Adorno aquí** | Protege de *clickjacking*: engañar a alguien para que pulse algo con efecto. **ZetaBus no tiene ni un botón con efecto en el servidor.** Lo peor que consigue quien lo enmarca es enseñar horarios de bus |
| `Permissions-Policy` | ⛔ **Adorno aquí** | La app no usa geolocalización, cámara, micrófono ni pagos. No hay permiso que denegar |
| `X-XSS-Protection` | ⛔ **Obsoleta** | Retirada de los navegadores modernos. Ponerla sería teatro |

### El caso del `Referrer-Policy`, que sí es concreto

La página de parada carga teselas de `tile.openstreetmap.org`. **Sin `Referrer-Policy`, cada
petición de tesela lleva un `Referer` con la URL completa** —`https://…/parada/744`—, es decir:

> **los servidores de OpenStreetMap reciben, para cada usuario, en qué parada de autobús está.**

Y lo mismo con cada enlace saliente (busesmadrid.es, transportes.gob.es, zaragoza.es). No es un
agujero de seguridad: **es una fuga de privacidad de los usuarios de ZetaBus a terceros**, y es
justo la clase de cosa que este proyecto no toleraría en otros.

- **Coste de las dos primeras** (`Referrer-Policy` + `nosniff`): **20 min**, un bloque `headers()`
  en `next.config.ts`. **Riesgo:** bajo. ⚠️ Verificar que las teselas siguen cargando: con
  `strict-origin-when-cross-origin` OSM recibe el origen, no la ruta — suficiente para su política
  de uso.

---

## 🟡 B-D2 · DEUDA menor · `X-Powered-By: Next.js`

Se anuncia el framework en cada respuesta. Se quita con una línea (`poweredByHeader: false`). No es
una vulnerabilidad —la versión de Next se deduce de otras diez señales— pero es ruido gratis.
**Coste: 2 min. Riesgo: nulo.**

## 🟡 B-D3 · DEUDA · No hay `sitemap.xml`

No es un fallo de seguridad; es que **el sitio no dirige a quien lo indexa**. Está relacionado con
B-F2: la decisión de qué se indexa y qué no debería tomarse **una vez**, y producir a la vez el
`robots.txt` y el `sitemap.xml`. Hoy no hay ni una cosa ni la otra: se indexa todo por omisión.

---

# 2 · LO QUE ESTÁ BIEN — verificado, y por tanto **NO se toca**

**1 · No hay ni un secreto en el repositorio, y se ha comprobado también EL HISTORIAL.**
`git log --all --diff-filter=A --name-only` da **236 ficheros** en toda la vida del proyecto. De
esos, 15 se borraron después — y **los 15 son código** (`src/engine/barrido.ts`,
`src/app/api/linea/[linea]/route.ts`, specs…). **Ningún `.env`, ninguna clave, ningún volcado de
datos, ninguna nota interna.** *(Es el escenario que en Linaje falló: allí un `git add -A` informó
«98 ficheros, nada sensible» y no era cierto. Aquí sí lo es, y no por suerte: ver el punto 2.)*

**2 · El `.gitignore` es una LISTA BLANCA**, con su razonamiento escrito dentro. Ignora todo (`/*`)
y cada entrada se admite a mano. Es lo correcto y es la causa directa del punto 1: **una lista
negra falla en silencio; esta falla ruidosamente.** Y hay prueba de que funcionó: la regla
`**/cache/` bloqueó `src/cache/` (que es código, no datos), obligó a una decisión a mano, y la
excepción quedó escrita y **estrecha a propósito** (`!/src/cache/`, una ruta exacta, no un patrón).

**3 · El endpoint huérfano SIGUE CERRADO.** Verificado: en `src/app/api/` solo existen
`diag/route.ts` y `llegadas/[poste]/route.ts`. `/api/linea/[linea]` y `/api/barrido/[linea]`
—públicos, indexables y capaces de barrer sin que nadie pulsara nada— **están fuera del árbol**;
su código vive en `parked/`, sin ruta.

**4 · `/interno/sistema-visual` lleva `noindex` de verdad.** No es una promesa en un comentario: se
comprobó en el HTML servido → `<meta name="robots" content="noindex, nofollow"/>`. Y no está
enlazada desde la app pública.

**5 · Las páginas de error no filtran nada.** Medido contra el servidor de producción:

| Petición | Respuesta | ¿Filtra? |
|---|---|---|
| `/parada/../../etc/passwd` | **404** | No |
| `/linea/<script>` | 404 | **Nada**: ni traza, ni ruta de fichero, ni `node_modules`, ni versiones |
| `/linea/AAAA` | **404**, no 500 | El guardia valida contra el GTFS **antes** de preguntar |
| `/parada/999999` | **404**, no 500 | Ídem |

⇒ Entrada basura → **cero peticiones desperdiciadas contra Avanza**. Eso es diseño, no suerte.

**6 · Las dos APIs mandan `Cache-Control: no-store`**, y con el motivo escrito: la edad del dato va
**dentro** del cuerpo, y un intermediario que sirviera la misma respuesta dos veces la volvería
mentira. Es una de las pocas veces que `no-store` está puesto por una razón y no por reflejo.

**7 · Las atribuciones obligatorias están, y las dos que más se incumplen están bien:**
- **OSM:** `MapaParada.tsx:580` → *«© colaboradores de OpenStreetMap»* con enlace a
  `/copyright`. **Con la palabra «colaboradores»**, que es justo lo que la ODbL exige y lo que
  faltó en su día.
- **MITRAMS:** `layout.tsx:154-156` → *«Powered by MITRAMS»* **literal** y con enlace a
  `transportes.gob.es`, en todas las páginas.
- **busesmadrid.es:** citada en `/sobre-los-datos` como *fuente especializada, no oficial*, con
  enlace y con los vehículos marcados con asterisco en pantalla.

**8 · `/api/diag` no filtra nada sensible, y su exposición es una decisión defendible.** Enseña
`pid`, `uptime`, contadores propios, instantánea de caché y estado del índice. **Ni una variable de
entorno, ni una ruta absoluta, ni la ApiKey del NAP.** El `pid` permite a un tercero deducir
reinicios y despliegues — es lo único «interno» que hay ahí, y su motivo (contar los workers de
Hostinger, que no está documentado en ninguna parte) es real y está escrito. **Verdadero riesgo:
ninguno. Se deja como está.**

---

# 3 · MI RECOMENDACIÓN

### Lo haría YA

| # | Qué | Coste | Por qué |
|---|---|---|---|
| **B-F3** | Completar `THIRD-PARTY-NOTICES.md` § 5 y declarar `react-leaflet` como Hippocratic-2.1; matizar el README | **1 h** | Es el **único hallazgo con consecuencias fuera de lo técnico**, y cae justo donde el proyecto dice ser fuerte |
| **B-F2** (parche) | Un `src/app/robots.ts` | **15 min** | Hoy no hay **nada**. Aunque se acabe eligiendo otra vía, tener el fichero permite decidir despacio sin dejar el flanco abierto |
| **B-D1** (parcial) | `Referrer-Policy` + `X-Content-Type-Options` en `next.config.ts` | **20 min** | El `Referer` está filtrando a OSM en qué parada está cada usuario. Es concreto |
| **B-F4** | Sacar la ruta personal de `spike-suelo-zoom.ts:85` | **10 min** | Está publicada |
| **B-D2** | `poweredByHeader: false` | 2 min | Va en el mismo fichero que B-D1 |

### Lo decidiría despacio

| # | Qué | Por qué no ahora |
|---|---|---|
| **B-F1** | El contador de `/api/diag` | Es el hallazgo más **interesante** de esta ronda, pero **arreglarlo bien** significa decidir si la página debe seguir pidiendo a Avanza en el render — y eso es diseño de producto, no una corrección. ⚠️ **Mientras tanto, lo que SÍ haría hoy es quitar la palabra «MEDIDA»** del comentario y del README: cuesta 5 minutos y deja de afirmar algo falso |
| **B-F2** (de fondo) | Un tope global de **claves nuevas** por minuto | Es lo que ataca la causa escrita en el propio diagnóstico. Pero toca la caché, que es la pieza más delicada del motor, y merece su propia tanda |

### Lo que **NO** haría

| Qué | Por qué NO |
|---|---|
| **CSP** | ~1 día, capacidad real de romper el mapa, y **sin formularios ni sesiones el retorno es bajo**. Ponerla mal (o en modo `report-only` y no mirar los informes) es peor que no ponerla: parece protección y no lo es |
| **`X-Frame-Options`, `Permissions-Policy`, `X-XSS-Protection`** | **Adorno en esta app.** Añadirlas para que la lista de cabeceras luzca larga es exactamente el teatro que este encargo pedía evitar |
| Tocar `/api/diag` para «exponer menos» | No expone nada sensible. Es el endoscopio del proyecto y su valor está en ser público |
| Retirar `parked/` por seguridad | No hay riesgo: es código sin ruta. Si se saca, es por el escaparate (documento 11, A-D5), no por el perímetro |

---

# 4 · LO QUE **NO** SE HA PODIDO AUDITAR

| Qué | Por qué |
|---|---|
| **El comportamiento en el hosting real (Hostinger)** | Todo se midió en `localhost` con `next start`. **Cuántos workers levanta Hostinger sigue sin saberse** —es justo lo que `/api/diag` existe para averiguar, y B-F1 dice que ese instrumento hoy no cuenta bien. Cabeceras de TLS, HSTS y comportamiento de su proxy: **NO CONSTA** |
| **Si un rastreador real respeta el `Limitador`** | Se calculó (934 ÷ 4/s ≈ 4 min) a partir de los parámetros del cubo, **no se provocó**. Provocarlo habría significado lanzar cientos de peticiones contra Avanza para comprobar una cuenta. **No se hizo, a propósito.** El número es una derivación, no una medida |
| **Auditoría de vulnerabilidades de dependencias** (`npm audit`, CVE) | No se ejecutó: habría que decidir qué hacer con lo que saliera, y eso es arreglar. **NO CONSTA** |
| **Licencias transitivas** | Se auditaron las **23 dependencias declaradas** en `package.json`. El árbol completo (`node_modules` entero, cientos de paquetes) **no se ha recorrido**. Es donde podría esconderse otra licencia rara. **NO CONSTA** |
| **Si el `Referer` llega de verdad a los servidores de OSM** | Se dedujo de la ausencia de `Referrer-Policy` y del comportamiento por defecto de los navegadores. **No se capturó el tráfico saliente.** Es una derivación sólida, pero **no está medida** |
| Contenido del historial **dentro** de ficheros que siguen existiendo | Se comprobaron los ficheros **añadidos y borrados**. Un secreto que hubiera estado en una versión antigua de un fichero que hoy sigue vivo **no lo detecta este método**. `git grep` sobre todas las revisiones no se ha corrido. **Riesgo residual admitido** |

---

# 5 · BITÁCORA

**⚠️ Un contador puede estar en verde por estar apagado.** `/api/diag` lleva desde que existe
diciendo `peticiones: 0` en el caso más común, y **nadie lo notó**, porque cero es una respuesta
plausible: significa *«no ha entrado nadie»*. Es la misma forma exacta del hallazgo del *«verde en
vacío»* de la Parte B —donde un test contaba **0** copias de «Información adicional» y pasaba
porque no había ninguna que contar— y de la aserción de tope, `toBeLessThanOrEqual(1)`, que **se
satisface con la nada**. ⇒ **Un instrumento que devuelve un número tranquilizador cuando no mide
nada es indistinguible de un instrumento que funciona.** La única forma de distinguirlos es
**provocar el caso y exigir que el número SUBA**.

**⚠️ Y la causa no estaba en el código, estaba en el framework.** El diseño era correcto —un solo
punto de salida, un singleton, la razón escrita— y aun así la medida no llega, porque en
producción **las páginas y los route handlers no comparten grafo de módulos aunque compartan
proceso**. Ninguna lectura del código lo habría revelado: hubo que **arrancar el build de
producción y ver el número no moverse**. *Lo que se cree del propio proceso hay que medirlo en el
proceso, no deducirlo del fichero.*

**⚠️ Y el mismo experimento absolvió a otra pieza.** El piso de disco de la caché estaba
documentado como *«una precaución para el día que Hostinger levante varios workers»*. **Resultó
estar trabajando ya hoy**, tapando exactamente el hueco que abre esa separación de grafos
(`llamadasAlOrigen` no subió en el paso 3). Se buscaba un fallo y salió una defensa. Conviene
anotar las dos.

---

*Documentos hermanos de esta ronda:*
[`11-codigo-y-arquitectura.md`](11-codigo-y-arquitectura.md) ·
[`13-rendimiento.md`](13-rendimiento.md)
