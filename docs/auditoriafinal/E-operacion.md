# Bloque E · Operación y datos — MAPA DE HALLAZGOS

> **Qué es.** Cuarto de los seis bloques de la auditoría de cierre de ZetaBus v1.0.0
> (A ✅ código · C ✅ tests · B ✅ interfaz · **E operación** · F · D). Audita **cómo se
> EJECUTA y se DESPLIEGA**, no cómo está escrito el código (eso fue el A).
>
> **Fecha:** 2026-07-29 · **Commit auditado:** `57a0594` (ahead 16, sin empujar).
>
> ⚠️ **REGISTRO HISTÓRICO FECHADO.** Describe el estado en esa fecha. No se reescribe aunque
> luego se arregle lo que dice. Solo lectura: la única escritura de esta tanda es este fichero.

---

## 1 · Declaración de cobertura

**La regla que gobierna el bloque: el entorno de trabajo miente.** Todo lo que pasa en verde
con los artefactos ya generados es un falso verde; lo que importa es el **clon limpio** (lo que
hay en el servidor). Aquí se declara exactamente qué se ejecutó, qué se simuló y qué no.

### Lo que EJECUTÉ de verdad

| Prueba | Qué hace | Resultado |
|---|---|---|
| **SIM-1** · `version.ts` ausente | Borré solo `src/generated/version.ts` (barato de rehacer, sin red) y cargué el import estático `@/generated/version` con una sonda temporal | **Reproduce la regresión de ayer**: `Cannot find module '@/generated/version'`, `code: MODULE_NOT_FOUND`, muere en el *loader* **antes de ejecutar una línea** → cero red. `version:build` la rehace; **byte-idéntica en dos corridas** (idempotente/determinista). Sonda borrada, `git status` limpio, fichero restaurado. |
| **SIM-2** · `NAP_API_KEY` vacía | `NAP_API_KEY= tsx scripts/fetch-gtfs.ts` (dotenv no hace override de una var ya puesta) | La hipótesis se cumple: **muere ruidoso** (código 1) en la guarda, **antes** de llamar a `descargar()`. Ni al NAP llega. No finge normalidad. |
| **`/api/regenerar` en vivo** | Server local sobre el `.next` ya construido; solo ramas de rechazo | `POST` sin cabecera → **401**; `POST` Bearer erróneo → **401**; `GET` → **405**; cabeceras `www-authenticate: Bearer` + `cache-control: no-store`; cuerpo `{"error":"no autorizado"}` **sin fuga** de token ni `.env`. |
| **`/api/diag` en vivo** | Inspección de fuga de secretos (E5c) | Claves: `pid, arribaDesdeSegundos, cwd, avanza, cache, correspondencias, datos`. **No aparece** `NAP_API_KEY` ni el token. Las URLs de Avanza sí (públicas, en el repo → ok). |
| `version:build` ×2 | Idempotencia/determinismo | `VERSION = "1.0.0"` idéntico byte a byte. |

### Lo que solo LEÍ (ejecutar cuesta minutos, martillea Avanza, o pisa dato)
- `build-nombres`, `build-correspondencias` / `barrido`, `coords-solo-barrido`, `build-flota`
  (barren Avanza y/o escriben `data/`).
- Los ~9 dev-tools (`canario`, `peticiones`, `campo`, `paso`, `build-urls-barrido`,
  `spike-suelo-zoom`, `gif-momento-oro`, `marco-movil`, `setup-skill`, `vigia-readme`).
  Ninguno en el pipeline `build`; invocados a mano/nadie. **Ninguno se ejecutó.**
- La lógica del handler de `/api/regenerar` (503, 401×4, 202, 409, verbo único) ya la ejercita
  al milímetro `tests/regeneracion-cerrada.test.ts` (bloque C), con un doble de `next/server`
  que **apunta** el barrido en vez de ejecutarlo → prueba lo que importa (que **no se programa**
  ningún barrido) sin tocar la red.

### Lo que NO simulé, y por qué
- **El build completo en clon limpio** (~6 min · dos barridos a Avanza + una descarga al NAP).
  Evaluado **por análisis** del grafo de imports + SIM-1, que reproduce el eslabón exacto que
  falló. **NO CONSTA** por ejecución de punta a punta.
- **El barrido real** / `POST` con token válido → lanzaría 74 peticiones a Avanza. No se toca.
- **Borrar `src/generated/gtfs.json` o `data/generated/correspondencias.json`**: gitignorados,
  solo recuperables con un build caro. Por eso SIM-1 se limitó a `version.ts`.
- **503 y 409 en vivo**: el 503 exige arrancar el server sin `ZETABUS_REGEN_TOKEN` (está en
  `.env.local`, que Next carga solo); el 409 exige un barrido en curso. Ambos **cubiertos por el
  test C**; en vivo → **NO CONSTA**.
- **`NAP_API_KEY` genuinamente ausente** (no vacía): exigiría esconder `.env.local`. Es el mismo
  camino de código (`if (!key)`); probada la rama con string vacío.

⚠️ **Nunca se imprimió el contenido de `.env.local`.** Las pruebas de "falta la variable" se
hicieron poniéndola vacía en el entorno, sin leer su valor.

---

## 2 · ⭐ El mapa de dependencias del build (la pieza que más vale)

`npm run build` encadena **seis pasos**. Para cada uno: qué **produce** y qué **consume** — con
lo que consume **indirectamente por la cadena de imports**, que es exactamente lo que falló ayer.

```
1 version:build ─┐
                 ├─(version.ts)─────────────┐
2 gtfs:fetch ────┤                          │
                 ├─(zip)──┐                  │
3 nombres:ensure ┘        │  needs zip + version.ts (vía transporte.ts)
     └─ build-nombres ────┤
                 ┌────────┘ produce nombres.json
4 data:build ────┤  needs zip + nombres.json         (NO necesita version.ts — comprobado)
     produce gtfs.json + index.ts (la TOPOLOGÍA horneada)
                 │
5 correspondencias:ensure   needs topología horneada (paso 4) + version.ts (vía barrido→transporte)
     produce data/generated/correspondencias.json
                 │
6 next build     needs src/generated/* (pasos 1 y 4)
```

| # | Paso | Produce | Consume (directo) | Consume (**indirecto**, por imports) | Red |
|---|------|---------|-------------------|--------------------------------------|-----|
| 1 | `version:build` | `src/generated/version.ts` | `package.json` | — | — |
| 2 | `gtfs:fetch` | `data/gtfs/…zip` | `NAP_API_KEY` | — | NAP |
| 3 | `nombres:ensure` → `build-nombres` | `src/generated/nombres.json` | zip GTFS | **`transporte.ts → @/generated/version`** | Avanza |
| 4 | `data:build` | `src/generated/gtfs.json` + `index.ts` | zip GTFS, `nombres.json`, flota | — (no arrastra `version.ts`) | — |
| 5 | `correspondencias:ensure` → `barrido` | `data/generated/correspondencias.json` | **topología horneada (paso 4)**, `postes-solo-barrido-coordenadas.json` | `transporte.ts → version.ts` | Avanza |
| 6 | `next build` | `.next` | `src/generated/*` | — | — |

### ¿El orden actual satisface TODAS las dependencias? Sí.

- **Paso 1 primero, y por eso importa:** el paso 3 arrastra `version.ts` por la cadena
  `build-nombres → transporte.ts → @/generated/version` ([transporte.ts:16](../../src/sources/avanza/transporte.ts#L16)).
  Si `version.ts` se generara más tarde (como pasaba antes, dentro de `data:build`), el paso 3
  no compilaría → `MODULE_NOT_FOUND` → el fail-safe lo tomaría por «Avanza caída» y desplegaría
  **todas** las paradas «sin confirmar». **Es la regresión de ayer, y SIM-1 la reproduce.** El
  arreglo —sacar la versión a un paso propio y ponerlo el primero— **cierra este disparador.**
- **Paso 5 después del 4, y también obligatorio:** el barrido cruza contra `@/engine/topologia`
  —el artefacto **horneado** por `data:build`—, no contra el zip. Depende del paso 4. Va después. ✅
- **Paso 3 antes del 4:** `data:build` lee `nombres.json` y hornea los nombres dentro de
  `gtfs.json`; en runtime nadie relee la tabla. Una tabla nacida después no serviría. Va antes. ✅

**Veredicto:** el grafo está satisfecho y, a diferencia de ayer, la dependencia indirecta más
peligrosa (`version.ts`) está **garantizada por construcción** (primer paso, solo depende de
`package.json`, que siempre está). Ver **E-01** para lo que el arreglo NO cerró.

---

## 3 · Tabla de hallazgos

Gravedad: 🔴 rompe o miente en producción · 🟠 deuda real · 🔵 cosmético / nota.
**Ningún 🔴.**

| Id | Cat. | Dónde | Qué es | Por qué importa | Grav. | Coste | ¿Producto? |
|----|------|-------|--------|-----------------|-------|-------|-----------|
| **E-01** | E1c/E2c | `ensure-nombres.ts`, `ensure-correspondencias.ts` | El fail-safe **no distingue «fuente caída» de «error interno»**: `spawnSync(build-*)` + `status !== 0` → el MISMO recuadro «Avanza caída, arranca degradado». | Es **exactamente** cómo el `MODULE_NOT_FOUND` de ayer se disfrazó de «Avanza caída». El orden cerró *ese* disparador; la **confusión sigue viva** para cualquier futuro fallo interno de los hijos → se desplegaría degradado en silencio, culpando a Avanza. Es el hallazgo padre del bloque, en su forma general. | 🟠 | medio | no |
| **E-02** | E6d | `/api/regenerar` + panel del cron | **El cron falla en silencio.** Si no corre, nadie se entera salvo mirando `/api/diag → correspondencias` (la edad) a mano. No hay latido ni alerta. La propia ruta lo admite: «un cron mal puesto no deja rastro aquí». | Contra la ley del proyecto («cero fallo silencioso»). Mitigado —degradación grácil: se sirve el índice de ayer y la edad **sí** está en diag— pero la detección es manual y nadie la hace de noche. | 🟠 | medio | sí (¿alerta?) |
| **E-03** | E6b | `README.md` §Desplegar / docs | **La configuración del cron no está escrita** en el repo: el `curl`, el `Authorization: Bearer`, el horario y el prefijo `$HOME` (de diag) viven en el panel de Hostinger, no en un procedimiento. | El deploy documenta hasta la purga del CDN a mano, pero «cómo se arma el cron» no es reproducible desde el repo. Reconstruible (diag da el `cwd`, `.env.example` da la var, el README dice POST+Bearer), pero nadie lo ha juntado. | 🟠 | bajo | no |
| **E-04** | E3c | `build-flota.ts` → `data/flota-avanza-zaragoza.json` | Sobrescribe con `writeFileSync` **directo, sin diff ni backup ni atómico**, un fichero **versionado**. El fichero se autodeclara generado (`⛔ NO EDITAR A MANO`) → es un **derivado viviendo en `data/`** entre los curados. | No es hazard (sus entradas curadas solo se leen; corre a mano, fuera del pipeline). Pero abre una **pregunta de convención sin resolver**: «`data/` = curado, `generated/` = derivado» tiene aquí una **excepción no declarada**. El `.gitignore` explica por qué *entra*, no que es *derivado*. | 🔵/🟠 | bajo | **sí — decisión de clasificación** |
| **E-05** | E1b | `build-version`, `build-data`, `build-flota` | **Atomicidad asimétrica.** Escritura atómica (tmp+rename, +`.bak`/reverificación) en los respaldos de resiliencia (`fetch-gtfs`, `coords`, `barrido`); escritura **directa** en los artefactos de build puro. | Coherente y de riesgo bajo: si un build se interrumpe, falla ruidoso y se rehace; no son el respaldo del que depende producción. Merece **decir en voz alta que la asimetría es deliberada**, no un olvido (salvo E-04, que sí conviene revisar). | 🔵 | — | no |
| **E-06** | E4c | `.env.example` | Documenta las dos que importan (`NAP_API_KEY`, `ZETABUS_REGEN_TOKEN`) con sus porqués, pero **no** las `ZETABUS_{CACHE,HORARIO,RECORRIDO}_DIR`. | Tienen default seguro y son de operación interna, así que su ausencia no rompe nada. Pero quien levante esto no sabe que existen. Coste ínfimo mencionarlas como «avanzadas, con default». | 🔵 | ínfimo | no |
| **E-07** | E4e | `/api/diag` `directorioDeTrabajo()` | La redacción del `cwd` (`$HOME → ~`) es **dependiente del entorno**: en un host donde `cwd` no cuelga de `HOME`/`USERPROFILE` (p. ej. este Windows de trabajo, repo en `F:`), enseña la **ruta cruda**. | En producción (Linux, `cwd` bajo `$HOME`) redacta bien → no es fuga real. Ya está **reconocido en el propio código** («si no hubiera HOME, se enseña la ruta tal cual: preferir dato crudo a inventado»). Nota, no deuda. | 🔵 | — | no |
| **E-08** | E7 | `build-version.ts` | Lee `package.json` con `as { version: string }` **sin validar** que `version` exista/sea string. Si faltara, hornearía `VERSION = undefined`. | En la práctica `package.json` siempre la lleva (es un `private` con `version`). Muy menor; se anota por completitud del «con lupa». | 🔵 | ínfimo | no |

**Huérfanos/rancios (E3f):** `data/referencia/autobuses-avanza-zaragoza-heredado.json` no lo lee
**ningún** código (0 referencias) — pero es **material de auditoría conservado a propósito**
(declarado así en `.gitignore`: tapa 53 vehículos que el registro oficial no tiene). Huérfano
**justificado**, no un olvido. `correspondencias.json.bak` es el respaldo legítimo de la
escritura atómica del barrido. Ninguno es un hallazgo.

---

## 4 · Lo que está bien (y merece repetirse)

1. **El único 🔴 potencial se cerró antes de tocar nada.** El barrido nocturno **solo LEE** el
   fichero curado de coordenadas ([barrido.ts:324](../../src/engine/barrido.ts#L324));
   lo único que escribe es el índice, atómico y con `.bak`. **El cron no puede pisar dato curado.**
2. **Fallar cerrado, de verdad.** `/api/regenerar` sin token → 503 y **nada ejecutado**; token
   corto → 503 (media configuración no es configuración); comparación **de tiempo constante**
   (sha256 + `timingSafeEqual` sobre digests) → **no vulnerable a timing** (y, bien calibrado:
   para este proyecto sería irrelevante de todos modos — pero además ya está blindado); POST y no
   GET; 202-y-trabaja-de-fondo para no morir en el timeout del CDN. Todo con su porqué escrito.
3. **La distinción caída-vs-configuración, donde SÍ se hizo.** `fetch-gtfs` mata si falta
   `NAP_API_KEY` **aunque haya zip** (config a medias ≠ meteorología), pero sigue con el zip
   viejo si el NAP no contesta (caída ajena y pasajera). Es la distinción que a E-01 le falta.
4. **Escritura atómica + suelo + todo-o-nada** en los tres sitios que producen dato de
   resiliencia (`fetch-gtfs`, `coords-solo-barrido`, `barrido`): tmp con PID, relectura,
   reverificación, `.bak`, `rename`. Un fichero nunca queda a medias.
5. **Un solo barrido, dos bocas.** El barrido vive en `engine/barrido.ts` y lo comparten el
   script y el route handler → no hay dos copias del mismo código condenadas a divergir.
6. **El `.gitignore` como lista blanca** (ignora todo, se añade a mano): falla **ruidosamente**
   —un fichero imprevisto no aparece en `git status`— en vez de colar un volcado en un repo
   público para siempre. Con su denegación explícita de secretos como cinturón sobre los tirantes.
7. **`build-version` es limpio:** 12 líneas, sin muerto, determinista (solo `package.json`),
   idempotente (**probado**), `mkdirSync` recursivo para el clon limpio. Nació de una regresión y
   está bien hecho.

---

## 5 · Recomendación de orden

1. **E-01** (fail-safe que confunde caída con error interno) — es el hallazgo padre y el que
   más se parece a lo que ya mordió. No urge (el orden cerró el disparador conocido), pero es el
   que más valor de método tiene. Idea: que el hijo salga con un **código distinto** para
   «Avanza no responde» vs «no compilo / error interno», y que el `ensure` solo trague el primero.
2. **E-02 + E-03** (cron silencioso + cron sin documentar) — van juntos: escribir el
   procedimiento del cron **y** decidir si merece un latido/alerta (o al menos dejar dicho en el
   README que la única señal es la edad en `/api/diag`).
3. **E-04** (clasificación de `flota-avanza-zaragoza.json`) — **decisión de producto**: declarar
   la excepción en el `.gitignore` (o mover el derivado fuera de `data/`). No decido aquí.
4. **E-05..E-08** — notas: una frase de intención (asimetría deliberada), tres líneas en
   `.env.example`, y una guarda trivial en `build-version`. Cosmético.

---

## 6 · ⭐ Para el CHECKLIST MAESTRO (genérico, sin nombres de ZetaBus)

Material destilado de este bloque, reutilizable en cualquier proyecto (Turnia, Desplázame, portfolio):

- **Un verde que depende de si alguien compiló antes no prueba nada.** Audita la operación
  **simulando el clon limpio** (borra los artefactos generados, o al menos el más barato de
  rehacer y reproduce la cadena de imports). El entorno de trabajo miente por omisión.
- **Mapea las dependencias del build incluyendo las INDIRECTAS por la cadena de imports.** El
  fallo caro no es el paso que consume un fichero de forma obvia: es el paso que lo arrastra tres
  imports más abajo. Genera lo más básico (versión, config) **el primero**, y que solo dependa
  de algo que siempre existe.
- **Un fail-safe que traga el código de salida de un proceso hijo DEBE distinguir «dependencia
  externa caída» de «error interno».** Si los confunde, el segundo se disfraza del primero y el
  build continúa desplegando algo roto mientras culpa a un tercero. Códigos de salida distintos,
  no un `status !== 0` genérico.
- **Distingue «caída» de «configuración a medias».** Una dependencia externa que no responde es
  ajena y pasajera → respáldala. Una variable que no se copió es un despliegue mal configurado →
  **muere ruidoso**, no sigas con el respaldo viejo (lo congelarías para siempre sin que nadie lo
  note). El respaldo es para lo que no controlas.
- **Escritura atómica (tmp + rename) en todo lo que sea respaldo de resiliencia**; y si es un
  build puro que se rehace, la escritura directa vale — **pero di que la asimetría es deliberada**,
  o el siguiente auditor la lee como un olvido.
- **Prueba que las variables de entorno fallan RUIDOSAMENTE.** Para CADA una: ¿si falta, muere y
  lo dice, o arranca fingiendo normalidad? Lo segundo es el fallo que el proyecto persigue. Un
  default que convierte «no configurado» en «configurado con algo» es un silencio falso — salvo
  que el default sea seguro y esté **documentado como tal**.
- **Un endpoint que dispara trabajo caro/ajeno falla CERRADO:** sin credencial configurada, no
  ejecuta nada (no «configurado flojo»). Token largo, comparación de tiempo constante, verbo que
  no se dispara solo (POST), y responde-y-trabaja-de-fondo si el trabajo dura más que el timeout
  del CDN. Y 401 honesto, no 404 disimulado, si el repo es público.
- **El panel lee el ARTEFACTO, no el recibo de que se intentó.** Un «200, hecho» es un recibo; el
  resultado de verdad se mira donde vive el dato (su fecha, su edad).
- **Un proceso automático nocturno que falla en silencio es una bomba de relojería.** Si la única
  señal de que no corrió es una fecha que alguien tiene que ir a mirar, nadie la mira. Latido,
  alerta, o —como mínimo— **dejarlo escrito** para que la ausencia de señal no se confunda con
  normalidad.
- **Todo paso manual del despliegue va ESCRITO en el repo**, no en la cabeza de quien lo montó ni
  en un panel externo. La purga de caché, la config del cron, la variable que va en el hosting:
  si no está escrito, se olvida el día que lo monta otro (o el mismo, seis meses después).
- **Un derivado que vive junto a los curados necesita declarar que es derivado.** Si tu convención
  es «esta carpeta = escrito a mano, esta otra = generado», la excepción (un generado que por lo
  que sea vive con los curados) tiene que estar **dicha donde se decide qué entra**, o alguien lo
  editará a mano creyéndolo fuente.
- **Un huérfano puede ser basura… o evidencia conservada a propósito.** Antes de borrar un fichero
  que nadie lee, mira si es material de auditoría (una prueba de que se comparó contra algo). Si lo
  es, no es huérfano: es cadena de custodia. Y que esté **declarado** como tal.
