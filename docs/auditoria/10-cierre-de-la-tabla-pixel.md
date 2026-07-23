# CIERRE · SE RETIRA LA TABLA PÍXEL A PÍXEL DEL CIERRE DE LA TANDA 7

**Fecha:** 23/07/2026
**Estado:** ⛔ **DECISIÓN CERRADA.** No es un cabo abandonado ni olvidado: se retira a
propósito, con su motivo escrito.
**Qué se retira:** el cabo *"tabla píxel a píxel contra la referencia"* que figuraba en el cierre
de la Tanda 7 (`ZETABUS-ESTADO.md`).
**Referencia de la que se hablaba:** `00 ZGZ RADAR` (`E:\PROYECTOS WEB\00 ZGZ RADAR`, módulo
`moverme/bus`), la que se auditó en [`08-diseno-de-la-referencia.md`](08-diseno-de-la-referencia.md).

---

## Los tres motivos

**1 · El criterio ya está escrito y la decisión ya se tomó.**
[`08-diseno-de-la-referencia.md`](08-diseno-de-la-referencia.md) (13/07) no es una tabla numérica:
es el **veredicto de diseño** —*lo que se CLONA / lo que se TIRA / lo que hay que CONSTRUIR DESDE
CERO*, con su porqué—. La tabla que faltaba era el **resultado** de una comparación cuya
conclusión **ya estaba tomada y documentada**. Medir para confirmar lo ya decidido no cierra nada.

**2 · Lo que mediría hoy ya no es lo que se quería medir.**
Las capturas de la comparación son del **14/07** (`capturas/comparadas/`, `capturas/referencia/`),
**anteriores a todo el trabajo de esta semana**: logo propio, favicon, icono de nodo, cabecera, y
el rediseño de pantalla ancha de las tres páginas (`82ab21a`, `310a2f1`, `6742a73`). Comparar hoy
mediría **cuánto se ha alejado ZetaBus de una referencia de la que se decidió alejarse a
propósito**. Todas las diferencias serían **intencionales** — una tabla de diferencias buscadas no
informa de nada.

**3 · El motivo de fondo, que sale de la propia regla rectora del doc 08:**
> *"La referencia manda en lo visual; NO manda en lo que miente."*

Una tabla que puntúe *"¿me parezco a la referencia?"* **premia lo contrario de lo que hace bueno a
este proyecto**. La referencia no ejecuta sus propias reglas (su auto-refresco de 20 s falla en
silencio; pinta `–` por dato; su chip de flota miente sin procedencia — todo en el doc 08); ZetaBus
sí las ejecuta. **Copiar un bug de la referencia por obediencia a la tabla sería el peor modo de
fallo posible.**

---

## Lo que NO se hace: borrar el instrumento

El instrumento de la comparación **se conserva a propósito** en `e2e/auditoria/`
(`diseccion.spec.ts`, `comparadas.spec.ts`, `referencia.spec.ts`,
`jugar-con-la-referencia.spec.ts`, sobre `e2e/lib/medir.ts`) y las capturas del 14/07 en
`capturas/`. Está **fuera de la suite por defecto** (`playwright.config.ts` ignora `e2e/auditoria/`
salvo que se pida a mano), así que no molesta, y **documenta cómo se auditó la referencia en su
día**. Borrarlo perdería la trazabilidad de una fase real del proyecto. Ver la nota en
`e2e/auditoria/README.md`.

---

## Qué queda del cierre de la Tanda 7

Con esto, el cierre de la Tanda 7 es el **backtesting exhaustivo**, y nada más.
