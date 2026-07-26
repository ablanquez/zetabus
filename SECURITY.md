# Seguridad

ZetaBus vigila sus dependencias con `npm audit`. A **26/07/2026**, contra **next@16.2.10**, el
audit reporta **12 vulnerabilidades de severidad *high*** — todas transitivas, ninguna en una
dependencia directa de producción.

Este documento **no dice «confía, no nos afecta».** Para cada grupo enseña **qué feature necesita
la vulnerabilidad para ser explotable, que ZetaBus no la tiene, y el comando con el que puedes
comprobarlo tú mismo.** Si algún día ZetaBus añadiera esas features, este análisis dejaría de valer
y habría que rehacerlo — por eso cada punto es verificable, no una promesa.

> **Por qué se aceptan en vez de arreglarse.** Se probó. `npm audit fix` sin `--force` no llega
> (Next está clavado exacto), y subir a **next@16.2.12 NO limpia nada**: 16.2.12 empaqueta las
> mismas `postcss@8.4.31` y `sharp@0.34.5` vulnerables que 16.2.10 — no hay parche de Next que las
> suba. Las únicas vías son un *downgrade* absurdo (`next@9.3.3`) o `overrides` forzando versiones
> que Next no ha probado (riesgo real de romper el build), **para tapar CVEs que no nos tocan.** No
> compensa.

---

## Grupo A — cadena de ESLint (9 avisos, *dev-only*)

`eslint`, `eslint-config-next`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`,
`eslint-plugin-react`, `@eslint/config-array`, `@eslint/eslintrc`, `minimatch`, `brace-expansion`.

**Todas son `devDependencies`.** No entran en el *bundle* ni corren en el servidor de producción:
solo se ejecutan al lintar, en local o en CI.

- **El aviso raíz es un DoS de `brace-expansion`** (expansión ilimitada → OOM) que llega hasta
  ESLint por `minimatch`. Para dispararlo haría falta pasarle a ESLint *globs* maliciosos —
  y ESLint solo lintea **el propio código de este repositorio**, no entrada de un atacante.
- **Superficie de ataque en producción: nula** (no está en producción).

**Arreglo:** exige subir **ESLint 9 → 10**, que es un *major* con cambios *breaking*. Se acepta
hasta una tanda futura dedicada a subir ESLint. No es urgente porque no hay superficie.

**Compruébalo:**
```bash
npm ls eslint                       # eslint está bajo devDependencies
npm audit --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s).vulnerabilities.eslint;console.log(v.severity, v.via)})"
```

---

## Grupo B — Next.js y sus transitivas `postcss` / `sharp` (3 avisos)

`postcss` y `sharp` **no están en el `package.json`**: son transitivas de Next (y de Tailwind).
Verifícalo: `grep -E '"(postcss|sharp)"' package.json` → vacío.

### `postcss` (path traversal / lectura de ficheros / XSS en el *stringify*)

Solo corre en **build-time**: es el compilador de CSS de Tailwind
(`postcss.config.mjs` → `@tailwindcss/postcss`), y procesa **nuestro propio `globals.css`**, no CSS
de un atacante. **En producción `postcss` no se ejecuta.** Las CVE requieren CSS controlado por el
atacante con un `sourceMappingURL` malicioso; aquí el CSS lo escribimos nosotros y se compila una
vez, en el build.

**Compruébalo:**
```bash
grep -rn "from 'postcss'\|require('postcss')" src/    # vacío: no se importa en código
cat postcss.config.mjs                                # solo el plugin de Tailwind
```

### `sharp` (vulnerabilidades heredadas de libvips)

`sharp` se usa en **un solo sitio: `scripts/marco-movil.mjs`** — un script local que enmarca
**nuestras propias capturas de pantalla**. **No hay `next/image`**, así que `sharp` no procesa
imágenes en *runtime* ni toca entrada de usuario. Las CVE de libvips se disparan procesando
imágenes maliciosas; aquí las imágenes son nuestras y el proceso es manual, en local.

**Compruébalo:**
```bash
grep -rn "from 'sharp'" --include=*.ts --include=*.tsx --include=*.mjs . | grep -v node_modules
#   → solo scripts/marco-movil.mjs
grep -rn "next/image" src/                            # vacío: sin optimizador de imágenes
```

### Las CVE del propio Next.js

El aviso de `next` arrastra una lista de CVE de la App Router. **Cada una exige una feature que
ZetaBus no usa:**

| CVE (según el aviso) | Necesita | ZetaBus | Cómo verificarlo |
|---|---|---|---|
| DoS / SSRF / *payload* en **Server Actions**; disclosure de *Server Functions* | Server Actions (`'use server'`) | **no las usa** | `grep -rn "use server" src/` → vacío |
| **Middleware / proxy bypass** (Turbopack + *single locale*) | un `middleware.ts` | **no existe** | `ls src/middleware.* middleware.*` → nada |
| **SSRF en `rewrites`** por *hostname* controlado | `rewrites` en la config | **no las hay** | `grep -E "rewrites\|redirects\|i18n" next.config.ts` → vacío |
| **DoS en Image Optimization** con SVG | `next/image` | **no se usa** | `grep -rn "next/image" src/` → vacío |
| **Cache confusion** de respuestas con *body* | cachear respuestas a *requests* con cuerpo | **no aplica** | las rutas dinámicas van `no-store`; las estáticas son GET sin cuerpo (ver abajo) |

Sobre la última: ZetaBus solo tiene un `POST` (`/api/regenerar`, protegido por *token* y
`no-store`) y GETs de API también `no-store`; no se apoya en el cacheo de respuestas con cuerpo de
Next. La petición a Avanza es **código propio** (un `fetch()` en
`src/sources/avanza/transporte.ts`), no la maquinaria de Next.

```bash
grep -rn "use server" src/          # Server Actions:  vacío
ls src/middleware.* middleware.*    # Middleware:      no existe
grep -rn "next/image" src/          # Image Opt.:      vacío
grep -nE "rewrites|redirects|i18n|images" next.config.ts   # rewrites/i18n/imágenes: vacío
```

**Arreglo:** no hay parche no-breaking (next 16.2.12 trae las mismas versiones). Se acepta hasta
que una versión futura de Next suba esas transitivas, o hasta una tanda de actualización mayor.

---

## Revisión

Esto **no está ignorado: está analizado y aceptado con motivo.** Se revisa cuando:

- aparezca un parche **no-breaking** que suba `postcss`/`sharp` dentro de Next, o
- se haga una tanda de actualización mayor (Next / ESLint *major*), o
- ZetaBus añada alguna de las features de arriba (middleware, Server Actions, `next/image`,
  `rewrites`) — en cuyo caso **este análisis caduca** y hay que rehacerlo.

Análisis: **26/07/2026** · referencia: `next@16.2.10`, `npm audit` = 12 *high*.

---

## Reportar un fallo

Si encuentras una vulnerabilidad en ZetaBus, avisa en privado a través de
**[GitHub Security Advisories](https://github.com/ablanquez/zetabus/security/advisories/new)**
(«Report a vulnerability»). Por favor, no abras un *issue* público para fallos de seguridad.
