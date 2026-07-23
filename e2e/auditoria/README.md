# `e2e/auditoria/` — INSTRUMENTO DE AUDITORÍA DE LA REFERENCIA (se conserva a propósito)

⚠️ **Esto NO está a medias, y NO forma parte del cierre de la Tanda 7.**

Estos ficheros son el instrumento con el que se auditó la referencia `00 ZGZ RADAR`
(`E:\PROYECTOS WEB\00 ZGZ RADAR`, módulo `moverme/bus`, en `:3002`) en julio de 2026:
disección píxel a píxel, capturas comparadas y documentación de su interacción.

- `diseccion.spec.ts` — vuelca la anatomía de la referencia y de ZetaBus y las tabula.
- `comparadas.spec.ts` — capturas de ZetaBus a los cinco anchos.
- `referencia.spec.ts` / `jugar-con-la-referencia.spec.ts` — abren, miden y "juegan" con la referencia.

**NO afirman nada: informan.** Están **fuera de la suite por defecto** (`playwright.config.ts`
ignora esta carpeta salvo que se pida a mano con `npm run auditoria`), y **se saltan solos** si la
referencia no está sirviendo. No molestan al build.

## Por qué se conservan y no se ejecutan ya

La **comparación píxel a píxel contra la referencia se RETIRÓ del cierre de la Tanda 7** el
23/07/2026, como decisión cerrada. El porqué —el criterio ya estaba escrito y decidido, lo que se
mediría hoy son diferencias intencionales, y parecerse a la referencia premia lo contrario de lo
que hace bueno al proyecto— está en
[`docs/auditoria/10-cierre-de-la-tabla-pixel.md`](../../docs/auditoria/10-cierre-de-la-tabla-pixel.md).

Se conservan estos ficheros (y las capturas del 14/07 en `capturas/`) porque **documentan cómo se
auditó la referencia en su día**. Borrarlos perdería la trazabilidad de una fase real del proyecto.

⚠️ Si vuelves a ver esta carpeta y piensas *"esto quedó a medias"*: **no**. Está terminado en lo
que tenía que hacer, y la comparación ya no es parte de ningún cierre. Lee el doc 10 antes de
tocar nada.
