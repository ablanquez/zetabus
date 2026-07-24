<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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

## `ZETABUS-ESTADO.md` no se toca

Norma permanente. Ese documento se mantiene desde la conversación de estrategia. Lo que haya que
registrar va al informe de la tanda.
