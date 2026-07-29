# Bloque B — Interfaz y textos · Auditoría de cierre

**Qué es.** Tercero de los seis bloques de la auditoría de cierre de ZetaBus v1.0.0
(A código ✅ · C tests ✅ · **B interfaz** · D · E · F). Cubre **lo que ve y lee un
visitante**, y el HTML que lo sostiene. **Solo lectura**: no se ha tocado ni una línea de
producto; la única escritura es este informe.

**Fecha:** 2026-07-29. **Commit auditado:** `c3bd7d2`.
**Método:** las páginas se **abren** a los anchos reales y se **miran** (no se lee el JSX);
el marcado se sirve, se parsea y se valida en el W3C; el píxel se mide en el navegador, no
en el CSS.

> ⚠️ **REGISTRO HISTÓRICO FECHADO. No se reescribe.** Describe el estado del día que se
> auditó. Si mañana se arregla lo que aquí se dice, este documento **no** se actualiza: se
> escribe el arreglo en el informe de su tanda, y aquí se queda como está.

---

## 1 · Declaración de cobertura

### Contra qué se validó, y por qué es equivalente a producción
Los 10 commits sin pushear tocan **solo** `tests/`, `e2e/`, `docs/` y `ZETABUS-ESTADO.md`
—**ni una línea de `src/` ni de config de producto** (verificado: `git diff origin/main
--name-only`)—. Por tanto el HTML que sirve el build local es **idéntico** al de producción.
La auditoría corrió contra un `next start` local con `ZETABUS_DEMO=1` (para poder provocar
los estados con `?fingir=`); el HTML validado es el mismo que el público.

### Páginas abiertas (las 9 rutas)
| Ruta | Abierta | Notas |
|---|---|---|
| `/` (home) | ✅ 360, 1280, +reflow 320–1920 | |
| `/linea/[linea]` | ✅ 360, 1280 · estados horario/desviada/caido · N7 (120 paradas), Ci3 | |
| `/parada/[poste]` | ✅ 360, 1280 · 8 estados (ver abajo) · poste 823 (nombre 53 car.) | |
| `/sobre-los-datos` | ✅ 360 | |
| `/estado` | ✅ 360 — **capturado en estado RANCIO real** (build de hace 1 d 23 h) | |
| `/interno/sistema-visual` | ✅ 1280 | **Cuenta** (ver nota) |
| `not-found` (404) | ✅ 360 · con y **sin JS** · DOM hidratado | |
| `error.tsx` / `global-error.tsx` | ❌ **NO CONSTA** — no disparables sin romper (ver hallazgo B-05) | |

**`/interno/sistema-visual` — decisión:** `robots.ts` la pone en `Disallow` **y** lleva
`noindex`, pero robots es una petición, no una valla: la página **devuelve 200 a quien la
teclee**. Es superficie pública alcanzable → **cuenta**. Auditada: limpia, marcada "INTERNO",
sin hallazgos propios.

### Anchos
**360 · 390 · 768 · 1280 · 1920** (los que declara `playwright.config.ts`). El "1366" del
encargo era de Turnia, no de ZetaBus; confirmado y descartado. Reflow probado además a **320**
(suelo WCAG 1.4.10).

### Estados provocados (con `?fingir=`, `ZETABUS_DEMO=1`)
- **Parada:** `sin-verificar` (normal), `caido`, `sin-buses` (poste mudo), `ilegible`,
  `dos-lineas`, `mapa`, `sin-ficha`, poste inválido/con letras → 404.
- **Línea:** `horario` (sana), `desviada`, `caido`, N7 (peor caso), Ci3 (circular).
- **Estado:** normal + **rancio** (visto en vivo local) · **degradado**: verificado en
  **producción el 27/07/2026** (tarjeta ámbar "Servicio reducido"), no reproducible en local.

### Validación W3C (Nu, `out=json`) — por página
| Página | Errores | Detalle |
|---|---|---|
| `/` home | **0** | (28 "info" = los `<meta>` del stream RSC que el validador excluye) |
| `/estado` | **0** | |
| `/sobre-los-datos` | **0** | |
| `/interno/sistema-visual` | **0** | |
| `/parada/*` (todos los estados) | **10** | 1× span[aria-label] sin role · 1× div[aria-label] sin role · **8× `<div>` hijo de `<button>`** |
| `/linea/*` (fingido) | **0** | ⚠️ pero los **10 errores reales** del heredado (28/07) salen solo con datos de Avanza reales — ver B-02 |
| 404 (shell servidor) | **0** | no significativo: el body va vacío (ver B-03) |

### NO CONSTA / cobertura limitada (declarado a propósito)
- **`error.tsx` / `global-error.tsx`:** no hay forma de dispararlos sin romper algo. Auditado
  su marcado **por lectura**, no abriendo la página. → hallazgo B-05.
- **Los 10 errores W3C reales de `/linea/35`:** vienen de `Terminal.tsx` con datos de Avanza
  reales (salidas "marcadas"); el fingido no los reproduce. **Localizados en fuente**, no
  re-validados en vivo.
- **Lector de pantalla real** (NVDA/VoiceOver): no ejecutable aquí. Se auditó el **marcado que
  un lector usaría** (roles, aria, orden), no la escucha.
- **Mapa Leaflet — keyboard-trap:** sus botones de zoom son focusables; si atrapa el foco con
  teclado **no se verificó** con lector real → parcial.
- **Zoom nativo de navegador al 200%:** aproximado por el criterio de **reflow a 320px**
  (WCAG 1.4.10), no por zoom real del navegador.
- **Orientación horizontal en móvil:** no probada → NO CONSTA.

---

## 2 · Tabla de hallazgos

Gravedad: 🔴 miente o rompe el uso · 🟠 deuda real · 🔵 cosmético. **(P)** = decisión de
**producto**, no la tomo yo.

> **Ningún 🔴.** No se encontró **ni un texto ni un estado que mienta al usuario**, ni un
> estado vacío que deje la pantalla rota en el camino principal. Para un proyecto cuya tesis
> es "no mentir", eso es el hallazgo más importante — y es en positivo.

| # | Cat | Página · elemento | Qué es | Por qué importa | Grav | Coste |
|---|---|---|---|---|---|---|
| B-01 | B3 | `/parada/*` · tarjetas de llegada | **8× `<div>` como hijo de `<button>`** (HTML no conforme). El validador lo marca en todos los estados. | Un `<button>` solo admite contenido de frase; un `<div>` dentro es inválido y algunos lectores/AT lo tratan raro. Funciona, pero no es estándar. | 🟠 | medio (reestructurar la tarjeta o `role="button"` sobre un `<div>`) |
| B-02 | B2 | `/linea/*` · `Terminal.tsx:94` | Las salidas **marcadas** ("04:40, sale de P. MINA, no de SEMINARIO") son `<span aria-label=…>` **sin `role`**. Genérico → el lector **ignora** el `aria-label`. Son los **10 errores** del heredado (solo en datos reales). | Alguien puso esa etiqueta para que un ciego oyera la aclaración de terminal, **y no la oye**: oye solo "04:40". Un instrumento que parece informar y no informa. | 🟠 | bajo (`role="img"` o texto oculto — el patrón ya existe en el repo, ver §5) |
| B-03 | B7/B3 | 404 (`not-found`) | Se sirve como el shell `<html id="__next_error__">` con **body vacío**: el contenido va solo en el payload RSC. **Sin JS, la página sale EN BLANCO** (0 caracteres). Es la única página así (home/línea/parada renderizan sin JS). Tras hidratar sí trae `h1`/`main`/landmarks. | Un 404 con JS desactivado —o un bot, o un navegador de texto— ve una página vacía con estado 404. Inconsistente con el resto del sitio, que sí renderiza en servidor. | 🟠 (P) | medio (comportamiento de `notFound()` en ruta dinámica; decisión de si se aborda) |
| B-04 | B1/B2 | Estados "no lo sé" (caído / ilegible / desvío-caído), línea y parada | El titular es impecable ("No hemos podido comprobar…", "Avanza no responde"), pero el **paréntesis** vuelca crudo al usuario: **la URL interna de Avanza** (`…/wp-admin/admin-ajax.php`, `gps.avanzabus.com/…`), **`ECONNREFUSED`**, o el HTML `<h1>502 Bad Gateway</h1>`. En producción, un corte real se lo enseña a cualquiera (sin el "(fingido)"). | Jerga técnica de cara al usuario, e **incoherente con el propio proyecto**: `robots.ts` se esfuerza en no exponer el endpoint de Avanza, y aquí un error lo publica en pantalla. El titular es de 10; el paréntesis, de otro registro. | 🟠 (P) | bajo (mantener la transparencia; quitar URL/errno/HTML crudo del texto visible) |
| B-05 | B5 | `error.tsx` / `global-error.tsx` | **Existe una pantalla de error que nadie ha comprobado que funcione en vivo.** No se puede disparar sin romper algo, así que **NO CONSTA** — y ese hecho es en sí el hallazgo. | Es la pantalla que se ve cuando *de verdad* algo revienta. Que nunca se haya abierto es exactamente el punto ciego que este proyecto persigue. | 🟠 | — (diagnóstico; ver propuesta §7) |
| B-06 | B2 | `<meta description>` de home/línea/parada/404/sistema-visual | **Todas comparten la misma descripción genérica** ("Los autobuses que hay AHORA MISMO…"). Solo `/estado` y `/sobre-los-datos` tienen la suya. Los `<title>` **sí** son propios y correctos por página. | `/linea/*` **es indexable** (robots lo permite): es el contenido con valor de búsqueda, y sale a Google con una descripción que no habla de esa línea. Miss de SEO en la página que más lo aprovecharía. | 🟠 | bajo (derivar la description por página, como el title) |
| B-07 | B4 | `/linea/*` · filas de recorrido y chips de correspondencia | **401 zonas táctiles < 44 px** (heredado del Bloque C, **re-medido y confirmado**). Ver §4. | 44 px es un listón **AAA que el proyecto se puso a sí mismo**; 24 px cumple el mínimo AA. No es un fallo de norma: es una vara alta que no se alcanza en una vista. | 🟠 (P) | ver §4 (cuatro opciones con coste) |
| B-08 | B2 | `/parada/*` · chip de poste, placeholder del mapa | `<span aria-label="poste 744">` y `<div aria-label="Cargando el mapa">` **sin `role`** → el lector los ignora (2 de los 10 errores W3C de parada). | Pérdidas menores pero reales: el SR oye "744" (no "poste 744") y no anuncia la carga del mapa. Mismo patrón que B-02. | 🔵 | bajo (`role="img"`/`role="status"`) |
| B-09 | B1 | `/estado` · tarjeta "DESVÍOS Y CORRESPONDENCIAS **DE HOY**" | Rotula "de hoy" mientras el dato puede ser de hace ~2 días (lo vi con el índice a 1 d 23 h). Lo **cubre** el banner ámbar "Datos desactualizados" de arriba. | Roza el "dato correcto describiendo un estado viejo". El banner lo salva, pero el "de hoy" literal podría suavizarse cuando hay aviso de rancio. | 🔵 | bajo (condicionar el rótulo al aviso de rancio) |

**Verificado y DESCARTADO como hallazgo** (comprobar la premisa antes de reportar):
- **"Powered by MITRAMS"** (footer) no es errata: es la **fórmula LITERAL que exige la
  licencia de datos abiertos del MITMS** (`layout.tsx:169`, THIRD-PARTY-NOTICES §1), con enlace
  obligatorio a transportes.gob.es. Intocable a propósito.
- **Contraste de los chips:** fuera de alcance por indicación; no se reabrió. No se encontró
  ningún problema de contraste **en otro elemento**.
- **Nombres con mayúsculas raras** ("de Los Ángeles"): es el `ucwords()` del operador en el
  GTFS, que el proyecto **preserva a propósito y documenta** en `/sobre-los-datos` (procedencia).
  Dato de origen, no bug de UI.

---

## 3 · Las 401 zonas táctiles (B-07) — con opciones y coste, **sin decidir**

**Re-medido yo mismo** (píxel resultante, no el dato heredado): en `/linea/N7` a 360 px hay
**361** elementos interactivos por debajo de 44 px — **120 filas de parada** (248×24: ancho
de sobra, **24 px de alto**) + **241 chips de correspondencia** (**24×24**). El "401" del
heredado era el total deduplicado del muestreo del test F1 (`/`, `/parada`, `/linea/N7` a tres
anchos); el número exacto **depende de la línea** (N7 sola ya da 361). Las **dos clases**
coinciden con lo heredado: filas de 24 px de alto y chips de 24×24.

**Calibración (para que la decisión se tome con contexto):** **24×24 cumple el mínimo AA** de
WCAG 2.5.8 (24 px). **Los 44 px son criterio AAA que el proyecto se impuso.** No es "tiene un
fallo de accesibilidad"; es "se puso una vara más alta y no llega en el recorrido".

**La decisión es de producto (Antonio).** Opciones y lo que rompe cada una:

| Opción | Qué se hace | Coste / qué rompe |
|---|---|---|
| **A · Subir las filas a 44 px** | Alto de cada fila de recorrido 24 → 44 | La lista crece mucho: N7 (120 paradas) suma ~+2.400 px de scroll. No rompe layout (ya scrollea), pero la vista se alarga bastante. |
| **B · Agrandar los chips a 44×44** | Chips de correspondencia 24 → 44 | Una fila con 6 chips (N7) pasa de ~150 a ~270 px de ancho → a 360 px fuerza más *wrap* (filas más altas) o roza el desborde. El efecto se acumula con A. |
| **C · Área táctil ≥44 sin agrandar lo visible** | El elemento sigue a 24 px; la zona tocable se extiende con `padding`/pseudo-elemento hasta 44 | Coste visual casi nulo, es la vía estándar (WCAG "target spacing"). ⚠️ Riesgo: dos chips juntos → sus áreas de 44 **se solapan**; hay que separar o repartir el toque. |
| **D · No tocar; documentar** | Se declara que 24 cumple AA y que el 44 era objetivo propio no alcanzado en esta vista | Coste cero. Es renunciar explícitamente al AAA en el recorrido — decisión de producto legítima si se dice. |

Mi lectura (sin decidir): **C** es la mejor relación coste/beneficio para las filas (ganan
alto tocable sin alargar la lista); para los chips, C con cuidado del solape, o **D** asumido y
escrito. **A/B** son las caras.

---

## 4 · Los `aria-label` que no se oyen (B-02, B-08) — qué se pierde, qué debería oírse

**El patrón correcto YA EXISTE en el repo:** los chips de giro de la home son
`<span role="img" aria-label="Circular, sentido horario">` — **válidos, y el lector los
anuncia**. El arreglo de los otros es aplicar ese mismo patrón; no es inventar nada.

| Elemento | Hoy | Qué oye el lector | Qué debería oírse |
|---|---|---|---|
| `Terminal.tsx:94` · salida marcada | `<span aria-label="04:40, sale de P. MINA, no de SEMINARIO">` sin role | solo "04:40" (el texto visible); **la aclaración se pierde** | "04:40, sale de P. MINA, no de Seminario" |
| Parada · chip de poste | `<span aria-label="poste 744">` sin role | "744" | "poste 744" |
| Parada · placeholder del mapa | `<div aria-label="Cargando el mapa">` sin role | nada | "Cargando el mapa" (o `role="status"`) |

**Propuesta (no arreglo):** `role="img"` en los chips (como los de giro) y en las salidas
marcadas; `role="status"` en el placeholder del mapa. Y de paso desaparecen 2 de los 10
errores W3C de parada y los 10 reales de línea.

**Válidos, NO tocar** (los roles sí admiten nombre): `<h1 aria-label>` (título de línea),
`<ol aria-label="El recorrido, 38 paradas">`, `<section aria-label="Primeras y últimas
salidas">`. El validador no los marca y están bien.

---

## 5 · Lo que está bien, y por qué merece repetirse

- ⭐⭐ **La distinción a TRES bandas, cada una con su copia y su caja.** Es la tesis del
  proyecto, ejecutada en pantalla:
  - **"No hay nada"** (sin-buses): *"La parada existe y Avanza ha contestado: simplemente no
    anuncia ninguna llegada. No es un error."*
  - **"No lo sé"** (caído): *"No hemos podido preguntar. Esto NO significa que no haya
    autobuses: significa que no lo sabemos."*
  - **"No me lo creo"** (ilegible): *"Ha respondido, pero su respuesta no cuadra consigo misma…
    Preferimos decir esto a enseñarte una lista incompleta con cara de estar completa."*
  Confundir estos tres es el "silencio falso" que el proyecto existe para no tener. No los
  confunde.
- ⭐ **Los estados degradado y rancio se comunican, no se disfrazan** — tarjeta ámbar con trama,
  con la edad del dato a la vista ("hace 1 día y 23 h").
- ⭐ **Cero scroll horizontal en NINGÚN ancho** (320→1920), incluido N7 (120 paradas) y el
  suelo de reflow WCAG (320 px). **Nada se trunca**: los nombres largos (parada 823, título de
  N7) **envuelven**, no cortan — la ley del `Hu…` se respeta.
- ⭐ **Marcado semántico sólido en las páginas de contenido:** un solo `<h1>` por página,
  jerarquía sin saltos, `<main>/<header>/<footer>/<nav>` presentes, **0 errores W3C** en home,
  estado, sobre y sistema-visual. `<title>` propio y correcto por página.
- ⭐ **Accesibilidad de base bien puesta:** `prefers-reduced-motion` respetado en el CSS,
  `role="status"` para anunciar en *polite* los cambios (edad del dato, refresco fallido), foco
  visible probado por e2e en home/parada/línea.
- ⭐ **Glosario coherente:** poste (el número de la marquesina) / parada (el lugar) / línea /
  recorrido / sentido / llegada / salida / desvío / provisional. La misma cosa se llama igual
  en todas partes; el usuario no traduce.
- ⭐ **Renderiza sin JavaScript** (home, línea, parada muestran su contenido servidor) — salvo
  el 404 (B-03).
- ⭐ **Honestidad de marca:** la banda "FINGIENDO «…»" en demo, y la atribución de licencia
  cumplida al pie.

---

## 6 · Recomendación de orden

1. **B-04 (leak técnico en los estados de error)** — barato y de cara al usuario en el camino
   más sensible (cuando Avanza falla de verdad). Máximo valor/coste. *(decisión de producto
   sobre cuánto detalle dejar)*.
2. **B-02 + B-08 (aria-label sin role)** — barato, el patrón ya existe (`role="img"`), y de paso
   caen 10 errores W3C reales de línea + 2 de parada. Es "hacer que un instrumento que finge
   informar, informe".
3. **B-06 (meta description por página)** — barato, y es la página indexable (`/linea/*`).
4. **B-01 (`div` en `button`)** — medio; reestructura de la tarjeta de llegada. Corrige 8
   errores W3C.
5. **B-07 (401 táctiles)** — **decisión de producto primero** (§3), luego ejecución.
6. **B-05 (error boundary)** — proponer un `?fingir=error` para poder **verla** antes de
   confiar en ella (ver abajo).
7. **B-03 (404 sin JS)** y **B-09 (rótulo "de hoy")** — menor prioridad.

**Propuesta ligada a B-05 (no implementar):** añadir un fingimiento `?fingir=error` que fuerce
un throw de render con `ZETABUS_DEMO=1`, para poder **abrir** `error.tsx` y auditarlo como el
resto. Hoy es la única pantalla que nadie ha visto funcionar.

---

## 7 · Para el checklist maestro (genérico, sin ZetaBus)

Patrones de interfaz reutilizables (Turnia, Desplázame, portfolio), separados por la **clase**
de cosa que son:

**Cobertura y método**
- [ ] **Se audita ABRIENDO la página, no leyendo el componente.** Ningún test mide "se
  entiende". El JSX dice qué se pretendía; la página dice qué sale.
- [ ] **Validar TODAS las plantillas de página, no una.** Cada tipo de página tiene su marcado;
  una limpia no dice nada de las demás (aquí: home 0 errores, parada 10).
- [ ] **Declarar cobertura**: qué páginas, a qué anchos, en qué estados. Lo no provocado, NO
  CONSTA — nunca "está bien".
- [ ] **Verificar la premisa del encargo** antes de obedecerla (aquí: un ancho que no era del
  proyecto; una atribución que parecía errata y era obligatoria).

**Estados (el bloque dentro del bloque)**
- [ ] Para cada pantalla, provocar vacío / error / cargando / degradado, no solo el caso feliz.
- [ ] **¿Se distingue "no hay nada" de "no lo sé"?** Confundirlos fabrica un silencio falso.
  Que cada estado tenga **copia y forma propias**, no solo un color.
- [ ] Un mensaje de error de cara al usuario **no vuelca jerga ni URLs internas**: titular
  humano, detalle técnico al log/consola, no a la pantalla.
- [ ] La pantalla de error de último recurso **tiene que poder abrirse** en modo prueba; una que
  nadie ha visto funcionar es un punto ciego.

**Texto**
- [ ] Glosario: un concepto, un nombre, en todas partes.
- [ ] `<title>` **y** `<meta description>` **propios por página** — sobre todo en las
  indexables. Que el title sea propio no garantiza que la description lo sea.
- [ ] Ningún rótulo afirma un tiempo ("de hoy") que el dato no respalda.

**Accesibilidad que un escáner no ve**
- [ ] `aria-label` **solo** en elementos cuyo rol admite nombre. En `<span>`/`<div>` genéricos
  **el lector lo ignora**: usar `role="img"`/`role="status"` o texto oculto. Un `aria-label`
  que no se oye es peor que no ponerlo: parece que informa.
- [ ] Zonas táctiles: fijar el **listón** (AA 24 / AAA 44) **a propósito** y medirlas; si no se
  alcanza, decidir con coste a la vista (agrandar vs. área táctil vs. asumir AA).
- [ ] Reflow a 320 px sin scroll horizontal; `prefers-reduced-motion` respetado; foco visible;
  cambios automáticos anunciados con `role="status"`/`aria-live`.
- [ ] Contenido crítico **renderizado en servidor** (que sobreviva sin JS), incluidas las
  páginas de error.

**HTML estándar**
- [ ] Un `<h1>` por página, jerarquía sin saltos, landmarks reales (`<main>/<nav>/<header>/
  <footer>`), no todo `<div>`.
- [ ] Contenido interactivo válido: un `<button>` no lleva `<div>` dentro (usar `role="button"`
  sobre el contenedor si se necesita estructura).

---

*Fin del informe. Solo lectura: nada se ha arreglado. Los arreglos, si se aprueban, van en las
tandas de ejecución, cada uno con su contraprueba.*
