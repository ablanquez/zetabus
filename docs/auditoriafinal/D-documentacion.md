# Bloque D · Documentación

> **REGISTRO HISTÓRICO FECHADO.** Este informe describe el estado de la documentación de ZetaBus **el 1 de
> agosto de 2026**, sobre el commit que se dice abajo. No se reescribe: si la documentación cambia, se
> escribe otro. Como los demás informes de `docs/auditoriafinal/`, se queda como está.

- **Qué es:** la auditoría de la DOCUMENTACIÓN — sexto y último bloque (A ✅ · C ✅ · B ✅ · E ✅ · F ✅ ·
  **D**). Un documento no se audita leyéndolo: se audita **contrastándolo** contra el código, los datos o
  el producto. Un documento que miente suena igual de bien que uno cierto.
- **Fecha:** 2026-08-01.
- **Commit auditado:** `a491f65` (`main`, ahead 60 sobre `origin/main`).
- **Método:** cuatro barridos de contraste en paralelo (README · resto de docs vivas · comentarios del
  código · integridad histórica y punteros), y **verificación de primera mano de cada hallazgo grave**
  contra el código/los datos antes de darlo por bueno. Cero escritura salvo este informe.

---

## 1 · Declaración de cobertura

**Leído entero y contrastado:** `README.md` (438) · `docs/README.md` · `SECURITY.md` · `THIRD-PARTY-NOTICES.md`
· `.env.example` · `.gitignore` (notas) · `data/README.md` · `data/gtfs/README.md` · `data/referencia/README.md`
· `AGENTS.md` · `CLAUDE.md` · `CHANGELOG.md` · `docs/LECCIONES.md` · `docs/MOTOR-HORARIOS.md` ·
`docs/MODELO-BLOQUE-SALIDAS.md` · los comentarios de `src/`, `scripts/`, `e2e/`, `tests/`, `next.config.ts`,
`playwright.config.ts` · las cabeceras de los 6 `docs/auditoriafinal/*` y una muestra de `docs/auditoria/*`.

**Revisado por encima (histórico, no se audita el contenido, solo su integridad):** `docs/BITACORA.md` ·
`docs/auditoria/01-13` · los `DATOS_CRUDOS_*`, `AUDITORIA_*.md`, `SPIKE_*`, `PRUEBA_*`, `MEDICION_*`,
`LOGO_ANALISIS`, `web-interface-guidelines.SNAPSHOT.md`.

**No auditado (fuera de alcance, por instrucción):** `ZETABUS-ESTADO.md` (lo mantiene Antonio) ·
`GUIA-BUENAS-PRACTICAS.md` — que, además, **no existe en este repo** (ni versionada ni en disco; vivirá en
Turnia). · `LICENSE`, `package-lock.json` (no llevan prosa que contrastar).

**Afirmaciones CONTRASTADAS de verdad (no solo leídas):** ~55, de las cuales **~40 verificadas correctas**
y **15 son hallazgos** (abajo). Todas las cifras de flota, versión, TTL, cabeceras y comandos se fueron a
mirar contra el código/datos/JSON, no se dieron por buenas por sonar bien.

---

## 2 · Tabla de hallazgos

Gravedad: 🔴 miente sobre algo que importa o una instrucción que no funciona · 🟠 desfasado o incompleto ·
🔵 pulido.

| # | Cat | Dónde | Qué dice | Qué es cierto (verificado) | Grav | Coste | ¿Decisión? |
|---|---|---|---|---|---|---|---|
| 1 | D5 | `README.md:265-274` | El quick-start termina en `npm run dev` tras solo `git clone` + `npm install` + `cp .env` + `gtfs:fetch` | **En un clon limpio, `npm run dev` revienta.** La app importa `@/generated` (`topologia.ts:44`), que está **gitignored** (`.gitignore:60`) y lo genera `data:build` — NO `gtfs:fetch` (que solo baja el zip), y `dev` no tiene `predev` (`package.json:6`). Falta `npm run build` (o `data:build`+`version:build`+`nombres:ensure`) antes de `dev` | 🔴 | Bajo (una línea, o un hook `predev`) | No |
| 2 | D1 | `data/README.md:28-29` · y arrastra `data/referencia/README.md:18`, `THIRD-PARTY-NOTICES.md:56,76` | "**53 vehículos** con `sin_verificar` — del fichero heredado"; "los **43** de busesmadrid nacen `fuente_secundaria`" | El maestro real (`flota-avanza-zaragoza.json`, 403) es: oficial **350** · observacion_propia **36** · fuente_secundaria **14** · **sin_verificar 3**. Solo **3** sin_verificar (no 53), y no salen del heredado. Solo **14** son fuente_secundaria (no 43: 29 los reclasificó la observación de Antonio). **La procedencia es la tesis del proyecto** | 🟠 | Medio (reescribir el desglose en 3 docs, con el dato real) | No |
| 3 | D5 | `README.md:103,107` (`home-escritorio.png`, `home-movil.png`) | Capturas de la home | **Desfasadas.** Son del 24-jul; el `<p>` visible "El autobús urbano de Zaragoza, línea a línea" se añadió el 01-ago (`10b60d3`) y el pie ganó "Estado del servicio"/"Código" (`c4f85c0`). Confirmado leyendo `home-escritorio.png`: NO lleva la línea de ciudad | 🟠 | Bajo (rehacer 2-3 capturas) | No |
| 4 | D2 | `src/components/ChipLinea.tsx:46` | "Ver `tests/chip-linea`" | **No existe** `tests/chip-linea`. El guardián real es `tests/motor-vivo/contraste-de-los-chips.test.ts` (sí cubre lo descrito). 3ª cita a guardián inexistente del proyecto | 🟠 | Bajo | No |
| 5 | D2 | `src/components/Cita.tsx:25` | "Un guardián lo vigila (ver `tests/cita-traduccion`)" | **No existe** `tests/cita-traduccion`. Los reales: `e2e/cita-traduccion.spec.ts` (prefijo `e2e/`, no `tests/`) y `tests/cita-guardian.test.ts`. 4ª cita rota | 🟠 | Bajo | No |
| 6 | D2 | `e2e/barrido-fino.spec.ts:124` | "El suelo táctil **del proyecto** es 44" | Contradice **B-07** (`barrido-fino-2.spec.ts:70`): se **renunció** al suelo de 44 (AAA) para las listas; el suelo es 24 (AA). El 44 solo sigue en controles singulares. El código ya mide `<24`; solo la prosa quedó anclada al 44 | 🟠 | Bajo | No |
| 7 | D3/D6 | `docs/README.md` (índice) | Indexa `docs/auditoria/01-13` como "las auditorías del propio código" | Los **6 informes de la auditoría de cierre** (`docs/auditoriafinal/A–F`, la pasada más reciente y exhaustiva) **no están enlazados desde ningún doc vivo** (`grep` = 0). El guardián `readme-no-miente` solo cuenta `docs/auditoria/NN-*`, es ciego a `auditoriafinal/`. *(Este mismo informe D caerá en el hueco.)* | 🟠 | Bajo (una tabla en `docs/README.md`) | No |
| 8 | D3 | `docs/README.md:112` | "[LECCIONES.md] — **Nueve**…" | Puntero **incompleto**: no dice que de la **L10 en adelante** las lecciones viven en `ZETABUS-ESTADO.md`. El `README.md:400-401` **sí lo corrige**; el arreglo no se propagó a `docs/README.md`. Misma clase de bug que ya cayó una vez | 🟠 | Bajo | No |
| 9 | D4 | `docs/LECCIONES.md:556-559` | "Se **añade**, no se reescribe" (append-only) | El fichero está **congelado en L9**; las L10+ se añaden en `ZETABUS-ESTADO.md`, y el documento **nunca dice que la serie continúa allí**. Instruye a añadir aquí justo lo que ya no se añade aquí | 🟠 | Bajo (una nota "de la L10 en adelante, ver ZETABUS-ESTADO.md") | No |
| 10 | D1 | `README.md:306-311` | "quedan **918** de 934 con nombre confirmado (98 %); las **16** restantes…" | El artefacto `nombres.json` tiene **927** entradas (≈7 sin confirmar). Cifra **volátil** (gitignored, se regenera del feed en vivo; el propio README dice "mañana serán otras") y **sin guardián**. Mejor expresarla como suelo/aproximado | 🟠 | Bajo (redactar como aprox.) | Sí (¿suelo o cifra?) |
| 11 | D1 | `SECURITY.md:47-48` | "`postcss` y `sharp` **no están** en package.json → `grep` vacío" | `sharp:^0.34.5` **sí** es devDependency (`package.json:56`), usada en `scripts/marco-movil.mjs`. El comando de auto-verificación que el propio doc manda ejecutar **ahora se contradice**. La conclusión de seguridad aguanta (sharp solo en un script de build, sin `next/image`); `postcss` sí sigue siendo transitiva | 🟠 | Bajo | No |
| 12 | D1 | `THIRD-PARTY-NOTICES.md:181-198,202` | "las **23** dependencias declaradas" (tabla 5.4) | La tabla enumera **22**: falta `sharp` (devDep, Apache-2.0). El recuento "23" es correcto; la lista no. Sin riesgo de licencia. Misma causa que #11 (alta de `sharp`) | 🟠 | Bajo | No |
| 13 | D4 | `CHANGELOG.md:8` | Sigue *Keep a Changelog*; única entrada `[1.0.0]` | Sin sección `[Unreleased]` pese a ~60 commits desde la 1.0.0. **Matiz:** `package.json` sigue en 1.0.0 (no hay versión nueva publicada) y el grueso posterior es docs/auditoría → defendible | 🔵 | Bajo | Sí (¿hay novedad de producto sin volcar?) |
| 14 | D5 | `README.md:322-327` | Modo demo: solo `?fingir=caido` y `?fingir=desviada` | Incompleto: existen además `?fingir=error` (simula el 500 real) y el opt-in `BARRIDO=1`. No es mentira, el escaparate se queda corto | 🔵 | Bajo | No |
| 15 | D4 | `.env.example` | No lista `ZETABUS_DEMO` | Se lee en runtime (`fingir.ts:115`). Es el toggle del modo demo, documentado en comentarios; probablemente fuera a propósito de un `.env.example` orientado a operador. El inverso del `ZETABUS_CONTACT_EMAIL` que se retiró (declarado-pero-no-leído); este es leído-pero-no-declarado | 🔵 | Bajo | Sí |

---

## 3 · Lo que está bien, y por qué (para repetirlo)

- ⭐ **La integridad histórica está LIMPIA — nadie corrigió la historia.** Los 6 `auditoriafinal/*` tienen
  **un solo commit** cada uno y todos declaran en cabecera "REGISTRO HISTÓRICO FECHADO · no se reescribe".
  Las ediciones posteriores de `docs/auditoria/*` son **solo mecánicas** (reapuntar enlaces tras un
  renombrado, retirar rutas de disco personales) — las conclusiones, intactas. La disciplina viva/histórica
  se respetó.
- ⭐⭐ **NINGÚN puntero vivo a una foto vieja** (el peor hallazgo posible de este bloque, y está limpio).
  Todas las referencias a `auditoria/`, `BITACORA` y `LECCIONES` desde docs vivos y código las tratan como
  **histórico/evidencia** ("léelos con la fecha delante", "Ver BITACORA", "Ver LECCIONES · L1"), nunca como
  el estado actual.
- **La versión ya es fuente única:** `package.json` → `generated/version` → UA; el badge y el UA en prosa
  los **cruza el guardián `readme-no-miente`**. Un cabo que la auditoría previa dejó abierto, ahora cerrado.
- **La licencia se cuenta con honestidad, no con un badge:** el badge "Apache 2.0" es correcto, y el README
  **avisa** de que una dependencia (`react-leaflet`) está bajo Hippocratic 2.1 — más honesto que callarlo.
- **Los guardianes numéricos hacen su trabajo:** las cifras dentro de la red de `readme-no-miente`
  (44 líneas, 934 paradas, 350/393/403 vehículos, 13 informes, TTL, versiones) están todas verdes y
  correctas. Los hallazgos de cifra (#2, #10) son justo los que caen **fuera** de esa red.
- **Comentarios que citan guardianes que SÍ existen y comprueban lo dicho:** una lista larga
  (`nada-de-gtfs-en-el-cliente`, `desvios-no-miran-lo-vivo`, `flotacion`, `un-solo-h1`, `sitemap`, …). Las
  citas rotas (#4, #5) son la excepción, no la norma.
- **Una nota rancia que YA se corrigió:** el `.gitignore` decía "mirando la calle" y ahora dice bien "las
  da el `marcadorParada` del feed". Prueba de que el mecanismo de corrección funciona.
- **Sin `TODO`/`FIXME`/`HACK` fósiles** en el código.

---

## 4 · Recomendación de orden

1. **#1 (clon limpio no arranca)** — es 🔴 y es lo primero que hace quien llega. Coste mínimo. Máxima
   prioridad.
2. **#2 (procedencia de la flota desfasada en 3 docs)** — toca la tesis del proyecto, y está repetido.
   Un dato real, tres sitios.
3. **#11 y #12 (el `sharp` que se coló)** — juntos: son la misma alta. Y #11 está en un doc de seguridad
   cuyo argumento es "compruébalo tú mismo".
4. **#4, #5, #6 (citas rotas + suelo táctil rancio)** — comentarios; baratos y concretos, uno cada uno.
5. **#7, #8, #9 (auditoriafinal sin enlazar + lecciones incompletas)** — la familia de "punteros a las
   lecciones/auditorías"; se arreglan de una pasada.
6. **#3 (capturas)** — rehacer 2-3 imágenes cuando toque desplegar.
7. **#10, #13, #14, #15** — pulido y decisiones menores (cifra volátil, changelog, demo, `.env`).

⚠️ **Nada de esto se ha tocado:** es un mapa, no una ejecución.

---

## 5 · Para el CHECKLIST MAESTRO (genérico)

Sin nombres de ZetaBus — la CLASE de cada cosa, para reutilizar:

**Contrastar, no leer**
- Un documento no se audita leyéndolo: se audita **contrastando cada afirmación comprobable** contra el
  código/los datos/el producto. Un documento que miente suena igual de bien que uno cierto.
- Para las cifras: distingue **suelo declarado** ("más de N", sigue cierto al subir) de **número duro** (se
  pudre). Y averigua **qué cubre el guardián** de documentación y céntrate en **lo que queda fuera de su
  red** — ahí puede haber mentira sin vigilancia.

**El escaparate y el arranque**
- Prueba las **instrucciones de instalación como un clon limpio**, no desde tu máquina (que ya tiene los
  artefactos generados). El fallo típico: el quick-start salta un paso de *build* de artefactos
  gitignorados y **revienta en la primera carga**.
- **Las capturas y los GIF caducan** cuando la UI cambia. Cuando toques algo visible arriba del pliegue,
  anota que hay que rehacer las imágenes del escaparate.

**Comentarios del código**
- Un comentario que **cita un fichero/test/guardián** es una promesa comprobable: verifica que **existe** Y
  que **comprueba lo que dice** (no basta con que el fichero exista). Las citas por número de línea son
  frágiles.
- Cuando se toma una **decisión que revierte otra** (p. ej. bajar un umbral), busca los comentarios que aún
  afirman la decisión vieja: quedan rancios y se contradicen entre sí.

**Punteros y familias de documentos**
- Un **puntero incompleto** ("documentado en X") es peor que ninguno cuando X solo tiene una parte. Si el
  contenido se **partió en dos sitios**, cada puntero y cada índice debe decir **dónde está la otra mitad**.
- Cuando arreglas un puntero en un sitio, **propágalo a los gemelos** (el mismo puntero suele vivir en
  varios índices).
- Un documento **append-only que se congela** (la serie continúa en otro fichero) debe decir en sí mismo
  que la serie sigue en otro sitio, o recreará la confusión del *split*.
- Los **registros históricos** (auditorías fechadas, changelog, cuadernos) NO se reescriben — pero deben
  estar **enlazados desde algún índice vivo**, o la mejor evidencia del proyecto queda invisible. Y ningún
  puntero **vivo** debe apoyarse en una **foto vieja** como si fuera el estado actual.

**Coherencia**
- El mismo dato en varios documentos **diverge** con el tiempo: grepea las cifras clave y compáralas entre
  sí y contra la fuente. La **fuente única** (un valor que todos derivan, con un guardián que cruza las
  copias en prosa) es lo que lo cierra de fondo.
