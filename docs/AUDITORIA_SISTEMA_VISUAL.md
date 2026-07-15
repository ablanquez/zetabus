# Auditoría del sistema visual de ZetaBus

**Fecha:** 2026-07-15 · **Alcance:** inventario, sin tocar código. Es el diagnóstico que
decide cómo montamos la guía de estilo viva antes de cerrar la Tanda 7.

> La guía no se inventa: se **consolida** lo que ya está disperso. Y lo que viene a matar
> son dos enfermedades que ya nos mordieron:
> - **La copia a mano** — el mismo valor escrito en dos sitios, que un día divergen.
> - **La constante escondida** — un valor cableado que solo es cierto en un caso concreto.
>
> Este documento las cuenta. Sin piedad y con `fichero:línea`.

---

## 0 · Resumen ejecutivo

| Eje | ¿Fuente única de verdad? | Veredicto |
|---|---|---|
| Colores semánticos (tinta, papel, alerta, aviso…) | ✅ `globals.css` `@theme` (10 tokens) | **BIEN** |
| Los 44 colores de línea | ✅ Artefacto GTFS (`route_color`), horneado | **BIEN** — no hay tabla a mano |
| Azul noche de búhos `#1C1A42` | ✅ `const NOCHE` en `ChipLinea.tsx` | **BIEN** — constante con nombre |
| Cálculo de contraste (D1) | ⚠️ 2 implementaciones (app + instrumento) | **ACEPTABLE** — separación justificada |
| 4 niveles de procedencia (`* † ?`) | ✅ `MARCAS` en `FichaVehiculo.tsx` | **BIEN** |
| Estado semántico (`ya llega`, rancio…) | ✅ tokens + clases `.es-*` en `globals.css` | **BIEN** |
| **Grises de "sin color de línea"** | ❌ 3 literales a mano + 2 valores distintos | **COPIA A MANO + CONSTANTE ESCONDIDA** |
| **Escala tipográfica** | ❌ 12 tamaños `text-[Npx]`, ~90 usos, 0 tokens | **COPIA A MANO (la de mayor volumen)** |
| Radios / sombras / espaciado | ⚠️ Clases Tailwind + literales inline, sin token | **A OJO, semi-sistemático** |
| Tipografía (familia) | ⚠️ Ninguna elegida — Tailwind por defecto | **SIN DECIDIR** |
| Logo / marca | ⚠️ Solo wordmark de texto, sin asset | **NO EXISTE como activo** |

**Recuento de patologías** (detalle en §1 y §4):
- **Copias a mano reales** (mismo valor, ≥2 sitios, sin fuente común): **4** familias.
- **Literales que deberían ser token:** ~**8** hex sueltos + **12** tamaños tipográficos.
- **Constantes escondidas** (ciertas solo en un caso): **5** identificadas.

---

## 1 · Inventario de ZetaBus

### 1.1 · Los colores semánticos — ✅ FUENTE ÚNICA

Viven todos en un solo sitio: [`src/app/globals.css`](../src/app/globals.css) dentro del
bloque `@theme` de Tailwind v4 (líneas 28-55). Diez tokens:

```
--color-tinta #0f172a · --color-tinta-suave #475569 · --color-tinta-tenue #556070
--color-papel #ffffff · --color-fondo #f1f5f9 · --color-borde #cbd5e1
--color-alerta #b91c1c · --color-aviso #92400e · --color-aviso-fondo #fffbeb · --color-aviso-borde #fcd34d
```

Se consumen siempre por `var(--color-…)` o `bg-[var(--color-…)]`. No hay `tailwind.config`
(v4 se configura en el CSS); el único `@theme` del repo está aquí. **No hay copia.**

Nota honesta: `--color-tinta-tenue` fue `#64748B` y **no pasaba AA** (4,34:1); lo cazó el
instrumento midiendo el píxel y se corrigió a `#556070`. La regla-guía "el estado no va en el
tono" está escrita como comentario de cabecera del fichero (líneas 5-25). Eso ya ES doctrina —
solo que hoy vive en un comentario, no en una página que la enseñe.

### 1.2 · ⭐ Los 44 colores de línea — ✅ FUENTE ÚNICA, y es la correcta

**No hay tabla de colores a mano.** Salen del GTFS y se hornean en el build:

- [`src/sources/gtfs-nap/adapter.ts:197-198`](../src/sources/gtfs-nap/adapter.ts)
  ```ts
  color:     hex(...route_color...,      '#1F2937'),
  textColor: hex(...route_text_color..., '#FFFFFF'),
  ```
  El color y su color de texto se leen de `route_color` / `route_text_color` del feed y se
  guardan en la entidad `Line`. El artefacto (`src/generated/gtfs.json`) es la única copia.

- Todo lo que pinta una línea (`ChipLinea`, el marcador del mapa, los nodos del itinerario, la
  pestaña de sentido) lee `linea.color` / `linea.textColor` de ahí. **Cero duplicados.**

Los colores concretos que aparecen en el código (`#C5CE00`, `#F8AD07`, `#90CA46`…) están **solo
en comentarios** de `ChipLinea.tsx` y `MapaParada.tsx`, documentando casos de contraste. No son
código: no pueden divergir.

> ⚠️ **Constante escondida nº1 (aquí):** el *fallback* cuando el feed no trae color es `#1F2937`
> (gris azulado). Pero el fallback del **render** de un bus sin color es OTRO gris, `#94a3b8`
> (§1.7). Es decir: "una línea sin color" es `#1F2937` en la capa de datos y `#94a3b8` en la
> capa de pintado. Dos respuestas para la misma pregunta, según quién la haga.

### 1.3 · El azul noche de los búhos `#1C1A42` — ✅ CONSTANTE CON NOMBRE

Hecho como debe: [`src/components/ChipLinea.tsx:41`](../src/components/ChipLinea.tsx)
```ts
export const NOCHE = '#1C1A42';
```
Un único literal, con nombre, exportado. Lo importan los tests. El `grep` de `#1C1A42` en todo
`src/` solo lo encuentra aquí (una vez como `const`, dos en comentarios). **Es el ejemplo de
cómo se hace bien** — y el patrón a repetir con los grises de §1.7.

### 1.4 · El cálculo de contraste del texto (D1) — ⚠️ DUPLICADO, PERO JUSTIFICADO

La fórmula de luminancia WCAG (`0.2126·R + 0.7152·G + 0.0722·B` + linearización sRGB) está
escrita **dos veces**:

| Sitio | Para qué | ¿Legítimo? |
|---|---|---|
| [`src/components/ChipLinea.tsx:53-113`](../src/components/ChipLinea.tsx) — `luminancia`, `contraste`, `textoLegible`, `tonosDeChip`, `AA=4.5` | La app: decide el color del número a partir del **hex** | ✅ Fuente de verdad de D1 |
| [`e2e/lib/medir.ts:84-99`](../e2e/lib/medir.ts) — `luminancia`, `contraste`, `AA_TEXTO=4.5` | El instrumento: mide el **píxel pintado** | ✅ A propósito separado — el instrumento NO puede importar el modelo de la app o dejaría de ser independiente |

Los tests (`contraste-de-los-chips.test.ts`, `cruces.test.ts`) **importan** de `ChipLinea`, no
reimplementan → sin duplicación ahí.

**Veredicto:** la separación app/instrumento es correcta y está razonada en el propio `medir.ts`
("no se modela nada, se mira el píxel"). Lo único mejorable: las **constantes WCAG** (`0.2126…`,
`0.03928`, `4.5`) podrían vivir en un módulo puro compartido. Es cosmético, no urgente.

### 1.5 · Los 4 niveles de procedencia (`sin marca / * / † / ?`) — ✅ FUENTE ÚNICA

Centralizados en [`src/components/FichaVehiculo.tsx`](../src/components/FichaVehiculo.tsx), mapa
`MARCAS` (líneas ~85-97):
```
oficial            → (sin marca)
fuente_secundaria  → '*'  "Dato no oficial, de busesmadrid punto es."
observacion_propia → '†'  "Dato observado en servicio, no publicado."
sin_verificar      → '?'  "Dato sin procedencia conocida."
```
Símbolo + lectura para lector de pantalla, en un solo sitio. El **tratamiento visual** compartido
(`border-dashed`, la palabra) vive en las clases `.es-sin-verificar` / `.es-sin-datos` de
`globals.css` y se reutiliza en la ficha, en el nombre de parada sin confirmar y en
`/sobre-los-datos`. La leyenda que explica los símbolos vive **una vez**, en el pie de la ficha.

### 1.6 · El estado semántico (`ya llega`, rancio, sin verificar) — ✅ FUENTE ÚNICA

Todo en [`globals.css`](../src/app/globals.css): tokens `--color-alerta/-aviso/…` + clases de
**forma** que sobreviven al gris:
- `.es-inminente` (el "YA LLEGA": color alerta + `latido` por `transform: scale`, nunca opacidad —
  la opacidad rompía el contraste en el valle del parpadeo; documentado en líneas 98-130).
- `.zb-late` (el mismo latido en el marcador del mapa, en el hijo para no pisar a Leaflet).
- `.es-rancio` (trama diagonal + borde discontinuo), `.es-sin-verificar`, `.es-sin-datos`.

La doctrina "estado en FORMA + PALABRA, nunca solo en tono" está probada por
`e2e/color.spec.ts` (pinta la pantalla en gris y comprueba que los estados siguen). **Centralizado.**

### 1.7 · ❌ Los grises de "sin color de línea" — COPIA A MANO (la peor)

El caso de libro. Un bus cuya línea no tiene color se pinta gris, y ese gris está escrito **a
mano en tres sitios**, con **dos valores** que además son el mismo color en distinta caja:

| Fichero:línea | Literal | Uso |
|---|---|---|
| [`MapaParada.tsx:209`](../src/components/MapaParada.tsx) | `{ fondo: '#94A3B8', texto: '#1E293B' }` | marcador de bus sin color |
| [`LlegadasVivas.tsx:351`](../src/components/LlegadasVivas.tsx) | `color ?? '#94a3b8', color:'#fff'` | chip de línea sin color |
| [`LlegadasVivas.tsx:648`](../src/components/LlegadasVivas.tsx) | `{ backgroundColor:'#94a3b8', color:'#1e293b' }` | otro chip sin color |

- **`#94a3b8`** (slate-400): **3 sitios**, dos casings distintos.
- **`#1e293b`** (slate-800): **2 sitios**.
- Y encima el texto es `#fff` en un sitio y `#1e293b` en otro para el mismo fondo gris → ni el
  par de tonos está de acuerdo consigo mismo.

> ⚠️ **Constante escondida nº2:** el marcador del mapa reutiliza `tonosDeChip` para las líneas con
> color (bien, comentado en `MapaParada.tsx:206`), pero **hardcodea el gris del fallback** aparte.
> El día que alguien ajuste el gris de la lista, el mapa y el otro chip **divergen en silencio**.

### 1.8 · ❌ La escala tipográfica — COPIA A MANO DE MAYOR VOLUMEN

**No hay escala de tipo.** Cada tamaño es un valor arbitrario `text-[Npx]` escrito inline, repetido
por todo el árbol. Inventario real (grep sobre `src/`):

**12 tamaños distintos**, ~**90 usos**, **0 tokens**:
```
10px · 11px · 12px · 13px · 14px · 15px · 16px · 17px · 18px · 20px · 22px · 24px
```
- `text-[11px]` aparece ~20 veces; `text-[13px]` ~18; repartidos por 15 ficheros.
- Los `<h1>` no comparten tamaño: parada 20px, línea 18px, error/404/sobre-los-datos 24px, y el
  "minutos" de la llegada 22px. No hay un "H1" — hay cinco tamaños grandes distintos elegidos
  caso a caso.

Si un día se decide "el cuerpo es 14, no 13", hay que tocar ~18 sitios a mano y rezar por no
saltarse ninguno. **Es exactamente la copia a mano, multiplicada por 90.**

También sin token: **peso** (`font-black`/`font-semibold`/`font-medium`/`font-bold` a ojo) y
**altura de línea** (`leading-snug`/`leading-tight`/`leading-[15px]`/`leading-none` mezclados).

### 1.9 · Radios, sombras, espaciado — ⚠️ SEMI-SISTEMÁTICO, A OJO

- **Radios:** mezcla de clases Tailwind (`rounded-md`≈6, `rounded-xl`≈12, `rounded-2xl`≈16,
  `rounded-full`) y literales inline: `border-radius: 6px` (`.chip-meta`), `8px`
  (`.bloque-parada`, `.es-sin-verificar`), `borderRadius: 6` (Nodo cabecera/final). Los valores
  caen en 6/8/12/16 — hay un sistema latente, pero **sin nombre**.
- **Sombras:** casi no se usan. La única real es inline en el marcador:
  [`MapaParada.tsx:157`](../src/components/MapaParada.tsx) `box-shadow:0 0 0 3px #111827,0 2px 6px rgba(0,0,0,.45)`.
  Sin token (y con otro literal oscuro suelto, `#111827`).
- **Espaciado:** usa la escala de Tailwind (`gap-1.5`, `px-2`, `py-3`, `mt-2`…) — razonablemente
  sistemático porque es la de Tailwind, no propia. Sueltos: `min-h-[24px]`, `h-8 w-8` (objetivos
  táctiles), justificados.

### 1.10 · Tipografía (familia) — ⚠️ SIN DECIDIR

No hay `next/font`, no hay `font-family` declarada en ningún sitio salvo un `system-ui,sans-serif`
inline dentro del SVG del marcador ([`MapaParada.tsx:166`](../src/components/MapaParada.tsx)). La
app usa **la pila sans por defecto de Tailwind**. No es un defecto, pero es una **decisión no
tomada**: hoy la tipografía es "lo que ponga el navegador".

### 1.11 · El logo / la marca — ⚠️ NO EXISTE COMO ACTIVO

- La marca es un **wordmark de texto**: `ZetaBus` en `text-[17px] font-black tracking-tight`
  ([`layout.tsx:48`](../src/app/layout.tsx)). Es el "logo" que menciona la vista de parada.
- **No hay** SVG de logo, ni icono, ni `favicon` propio, ni nada en `public/` (el directorio no
  tiene assets de marca). No hay `app/icon.*` ni `apple-icon`.
- Metadatos de marca: `title`/`description` en `layout.tsx`. El eslogan "el autobús de Zaragoza,
  ahora" se repite en `layout` (header) y en el `<title>` — **texto duplicado**, menor.

### 1.12 · ⚠️ Excepción legítima: `global-error.tsx`

[`src/app/global-error.tsx`](../src/app/global-error.tsx) usa hex crudos (`#ffffff`, `#111111`,
`#b91c1c`, `#404040`, `#737373`) e inline styles. **No es un descuido:** el `global-error` de Next
sustituye al `layout` raíz y se renderiza **sin `globals.css` ni el `@theme`** — no puede usar los
tokens. `error.tsx` y `not-found.tsx`, que sí viven dentro del layout, usan correctamente
`var(--color-…)`. Esta excepción hay que **documentarla en la guía**, no "arreglarla".

---

## 2 · Qué hay en el repo de referencia (Radar ZGZ)

`E:\PROYECTOS WEB\01 ZGZ RADAR REACT` — Next 16 / React 19 / **Tailwind v4**, mismo stack.

**Lo que tiene:**
- **Tokens token-first** en `src/app/globals.css`: variables CSS semánticas en `:root` +
  un `@theme inline` que cablea la fuente. Base marca/UI + una **paleta por "familia" de módulo**
  (Salud, Agenda, Servicios…), cada una con par `main`/`soft`. Prohibido el hex hardcodeado.
- **Página de guía viva y muy elaborada:** `/internal/identidad-visual`
  (`src/app/internal/identidad-visual/page.tsx`, **1525 líneas**, `noindex`), con 14 secciones
  (tokens, familias, tipografía, espaciado/radios, bordes/sombras, a11y, reglas prohibidas…) y un
  **`status` por token/regla** (`Implementado`/`Documentado`/`Pendiente`/`No autorizado`).
- **Gobernanza escrita:** `docs/decisions/ADR-0004-css-y-sistema-visual-inicial.md` como fuente de
  verdad, + `docs/visual/00_IDENTIDAD_VISUAL…md`.
- **Tipografía:** **Geist Sans** vía `next/font/google`, fallback Inter/system-ui.
- **Marca:** `public/skyline.svg` (solo portada) + iconos **Lucide** centralizados en
  `src/app/_components/icons.tsx`. Sombras **prohibidas** (profundidad por contraste bg/surface).

**Qué de su enfoque SIRVE para ZetaBus:**
- ✅ **Token-first en `:root` + `@theme`** — ya lo hacemos; validado.
- ✅ **Una PÁGINA interna viva con `status` por elemento** — el patrón correcto, y encaja con
  "todo se va metiendo allí".
- ✅ **`noindex`** en la guía (es interna, no para el público).
- ✅ **Un ADR/doc que gobierna** — nuestra doctrina hoy vive en comentarios de `globals.css`;
  merece un documento con nombre.
- ✅ **Centralizar la iconografía** si algún día metemos iconos (hoy usamos emoji `⚠ ← →`).

**Qué NO sirve / no encaja:**
- ❌ **La paleta "por familias de módulo"** — Radar es multi-módulo (salud, aparcamiento…).
  ZetaBus es **un** dominio. Nuestra estructura de color es distinta: **44 identidades de línea
  (del operador, no nuestras) + semántica de estado + procedencia**. Su modelo no la contempla.
- ⚠️ **Su guía renderiza los tokens desde ARRAYS hand-typed** dentro del `page.tsx`
  (`baseTokens`, `typographyScale`…), **escritos al lado de** los `:root`. Eso puede **divergir**
  del CSS real: es *la copia a mano aplicada a la propia guía*. **No copiemos ese fallo** — es
  justo lo que Antonio quiere evitar (§3).
- ⚠️ Su excepción real (`TH_COLOR = "#2563eb"` hardcodeado en desfibriladores) demuestra que
  incluso con la regla escrita, los literales se cuelan. La defensa no es la regla: es un **test**.

---

## 3 · Cómo tenerla VIVA (recomendación)

**Recomendado: opción (a), pero mejorada — que la página LEA el valor real, no lo describa.**

Una ruta `/interno/sistema-visual` (server component, `noindex`) que pinta el sistema **leyendo
la misma verdad que la app**, no una copia:

- **Tokens de color:** leer los valores computados de `:root` con `getComputedStyle` (un
  fragmento cliente mínimo), de modo que el swatch de `--color-alerta` sea `#b91c1c` **porque lo
  lee del CSS**, no porque alguien lo tecleó al lado. Si cambias el token, el swatch cambia solo.
  **No puede mentir.**
- **Los 44 chips de línea:** renderizar `<ChipLinea>` sobre `lineas()` del artefacto real. Enseña
  los colores, el contraste calculado y la inversión de búho **usando el componente de producción**.
- **Los 4 niveles de procedencia:** renderizar desde `MARCAS` (importado, no copiado).
- **Estados:** montar `.es-inminente`/`.es-rancio`/`.es-sin-verificar` reales y ofrecer el
  **toggle a escala de grises** ahí mismo (la contraprueba de "el estado sobrevive al gris", a la
  vista).
- **Reglas prohibidas y excepciones** (el `global-error`, "no se trunca nunca", "estado en forma
  no en tono"): con su `status`, al estilo de la referencia.

> ⭐ La diferencia con la referencia es la clave: su guía *describe* los tokens en arrays; la
> nuestra los *lee*. Una guía que lee la misma fuente que la app **no puede quedarse vieja**.

**Pros / contras de las tres vías:**

| | Pros | Contras |
|---|---|---|
| **(a) Página que LEE los tokens** ⭐ | No puede mentir (lee la verdad de la app); usa los componentes reales; cero dependencias; se despliega con la app; encaja con "todo se va metiendo allí" | Hay que escribirla; los valores que HOY no son token (tamaños, grises §1.7-1.8) no puede leerlos hasta que se tokenicen → **empuja a tokenizar primero**, que es bueno |
| **(b) `.md` a mano** | Cero código | **Miente en cuanto el código cambia** — es la "retrospectiva que miente" aplicada al diseño. Descartada como fuente; sirve solo para doctrina/ADR |
| **(c) Storybook** | Ecosistema, aislamiento de componentes | Dependencia grande y build aparte para un equipo de una persona; sus stories son **otra copia a mano** de los props; desproporcionado aquí |

**Plan que sugiere este diagnóstico (para discutir, no ejecutado):**
1. **Tokenizar los strays** que hoy impiden que la página (a) diga la verdad: la escala tipográfica
   (§1.8) y los grises de fallback (§1.7) a `NOCHE`-style o a tokens `@theme`. Decidir familia
   tipográfica (§1.10).
2. **Montar `/interno/sistema-visual`** que lee esos tokens + los componentes reales.
3. **Un test** que falle si aparece un hex crudo nuevo fuera de `globals.css`/`ChipLinea` (la
   lección de la referencia: la regla sin test se incumple). Así la guía se mantiene sola.
4. Mover la doctrina de los comentarios de `globals.css` a un `ADR`/`docs/visual` enlazado desde
   la página.

---

## 4 · Las constantes escondidas y copias a mano (recuento cerrado)

### Copias a mano (mismo valor, ≥2 sitios, sin fuente común)
1. **Gris `#94a3b8`** — 3 sitios (`MapaParada:209`, `LlegadasVivas:351,648`), 2 casings. *(§1.7)*
2. **Tinta-sobre-gris `#1e293b`** — 2 sitios (`MapaParada:209`, `LlegadasVivas:648`). *(§1.7)*
3. **Escala tipográfica** — 12 tamaños `text-[Npx]`, ~90 usos, 0 tokens. *(§1.8)*
4. **Fórmula/umbral WCAG** — 2 implementaciones (app + instrumento). Justificada, pero sin
   constantes compartidas (`0.2126…`, `4.5`). *(§1.4)*

### Literales que deberían ser token
- `#1F2937` (fallback `route_color`, `adapter.ts:197`) — y encima ≠ del gris de render `#94a3b8`.
- `#0F172A` (relleno del pin, `MapaParada.tsx:197`) = **`--color-tinta` copiado como literal**.
- `#111827` (sombra del anillo del marcador, `MapaParada.tsx:157`).
- `#94A3B8` / `#1E293B` (fallback marcador, `MapaParada.tsx:209`).
- `rgba(0,0,0,.45)` (sombra inline del marcador).
- Los **12 tamaños tipográficos** + pesos + `leading-*` a ojo.

### Constantes escondidas (ciertas solo en un caso)
1. **Dos grises para "sin color":** `#1F2937` (capa de datos) vs `#94a3b8` (capa de render). La
   misma pregunta, dos respuestas según la capa. *(§1.2, §1.7)*
2. **`#0F172A` del pin = tinta congelada:** si la tinta de marca cambia, el pin del mapa no se
   entera (es un literal, no `var(--color-tinta)`). *(§1.9)*
3. **Chip `11px` / `leading-[15px]`** "medido de la referencia a 360 px": cierto para SU chip a
   ESE tamaño, cableado como universal (`FichaVehiculo.tsx:118`). Documentado, pero sin nombre.
4. **`latido` `scale(1.08)` / `1.4s`:** magia visual repetida en `.es-inminente` y `.zb-late`
   (comparten `@keyframes`, bien, pero el 1.08 es a ojo). *(§1.6)*
5. **Zoom `14`/`16` del mapa** (suelo/techo, de tandas previas): números medidos, correctos, sin
   nombre de token.

> Casi todas las escondidas están **documentadas con un comentario que dice por qué** — no son
> descuidos, son **constantes con dueño**. Pero siguen sin nombre ni fuente única, y esa es
> exactamente la deuda que la guía viva viene a saldar: darles un sitio donde se lean, no donde
> se repitan.

---

## 5 · Conclusión

ZetaBus **ya hace bien lo difícil**: color semántico, los 44 colores de línea, el azul noche, la
procedencia y el estado tienen fuente única. Lo que está disperso es lo **repetitivo** — la
tipografía (90 literales) y los grises de fallback (5 literales, 2 valores) — más un puñado de
constantes con dueño pero sin nombre.

La guía **no descubre colores nuevos**: consolida los que ya existen y **tokeniza los que hoy se
copian a mano**, para que una página `/interno/sistema-visual` pueda **leer la verdad en vez de
describirla**. Eso —y un test que impida el próximo hex crudo— es lo que la mantiene viva sin
mentir. Es la misma lección de todo el proyecto: *no lo prometas, mídelo; no lo copies, léelo.*
