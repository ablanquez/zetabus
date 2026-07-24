<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# ⛔ Reglas permanentes

## `ZETABUS-ESTADO.md` NO SE MODIFICA. NUNCA.

**Ni una línea. Ni para corregir una errata, ni para añadir una lección, ni para marcar un cabo
como cerrado.** Tampoco se arrastra en un `git add` amplio: si aparece en `git status`, es del
usuario y se deja como está.

**Qué es.** La memoria del proyecto: el estado, las tandas, los cabos, las lecciones de método y
las equivocaciones de los dos lados. **Es el argumento de ZetaBus, no su cuaderno de notas** — y
por eso está versionado a propósito, con su excepción explícita en el `.gitignore`.

**Por qué no lo tocas.** Se mantiene **desde la conversación de estrategia**, que es la única que
ve el proyecto entero, y **se sustituye ENTERO** cada vez que se actualiza. Un cambio hecho desde
aquí no sobreviviría a la siguiente sustitución: se perdería sin que nadie lo note, o peor,
convertiría el documento en dos versiones que se pisan. **Lo que haya que registrar va en el
informe de la tanda**, que es de donde la conversación de estrategia lo recoge.

⚠️ **Y esta regla existe porque se rompió.** El commit `050a70a` se llevó 1.401 líneas del WIP del
usuario dentro de un commit de refactor, y se informó de lo contrario: `git status` daba limpio
**precisamente por el fallo** —el fichero ya no salía como modificado porque ya estaba dentro del
commit—. Comprobar con `git status` que no se ha tocado **no vale**: lo que vale es
`git show --stat <commit>` y mirar la lista de ficheros antes de empujar.

---

# Cierre de tanda

Tareas fijas al cerrar una tanda, igual que el push o la bitácora.

## ⭐ Mirar el README con los ojos

Antes de cerrar, hacerse **esta pregunta**, en voz alta, sobre `README.md` y `docs/README.md`:

> **¿Hay alguna afirmación en el README que el propio repositorio desmienta?**

Es la misma pregunta que encontró el `<h1>` ausente, y la que hacía falta el día que el README
pasó **91 commits de `src/` diciendo que la aplicación no existía todavía** mientras las mil y
pico pruebas del proyecto seguían en verde.

**Por qué esto es una tarea de una persona y no un test.** Hay dos guardianes puestos, y **ninguno
de los dos cubre esto**:

| | Qué cubre | Qué **no** |
|---|---|---|
| `tests/readme-no-miente.test.ts` | Las afirmaciones **con número**: líneas, paradas, vehículos por fuente, informes, lecciones, versiones, TTL | La prosa. Todo lo que no lleva una cifra dentro |
| `scripts/vigia-readme.mjs` (`npm test`) | Avisa cuando `src/` lleva **15 commits** cambiando sin que se toque un README | No sabe si el README es cierto: solo si hace mucho que nadie lo mira |

⚠️ **«Todavía no hay aplicación» no tiene número, y por eso no lo caza nada.** Ésa es exactamente
la clase de frase que hay que buscar: lo que se escribió cuando era verdad y dejó de serlo sin que
nadie tocara el fichero. Frases en futuro («se hará», «está previsto»), promesas de lo que aún no
existe, y descripciones de un estado del proyecto que ya se pasó.

⚠️ **Tocar el README apaga el aviso del vigía.** Tocarlo sin leerlo lo silencia y ya: el aviso
queda apagado y el README sigue mintiendo. El vigía dice **cuándo** mirar; mirar es esto.

⚠️ Y si el registro de afirmaciones se pone rojo, **se corrige el documento, no el registro** —
salvo que el patrón haya dejado de encontrar la frase, que es su propio mensaje de error y pide
re-anclarlo.

## Antes de empujar, mirar qué lleva cada commit

`git show --stat` de lo que se va a empujar, y leer **la lista de ficheros**. Un `git add` de más
no se ve en `git status` después de haber committeado — se ve ahí. Ver arriba, *Reglas
permanentes*.
