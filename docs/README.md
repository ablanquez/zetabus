# Documentación de ZetaBus

Tres cosas viven aquí: **la auditoría de las fuentes** (qué hay ahí fuera y qué se puede creer),
**el diseño** (qué se construye con eso) y **las auditorías del propio código** (qué se publica).

> **Por qué está esto en el repositorio.**
> Cualquiera puede escribir un scraper con un mapa. Lo que hace que ZetaBus diga la verdad es
> que **antes de escribir código se pasaron siete fases averiguando qué mienten las fuentes**.
> Estos informes son esa prueba. Y también son el registro de **tres veces en que hubo que
> retractarse de un informe propio** porque la evidencia lo tumbó. Eso se queda escrito.

---

## Auditoría de fuentes

Léelos en orden si quieres la historia. Salta al que te interese si buscas un dato.

| # | Informe | Qué respondió |
|---|---|---|
| 1 | [El cruce con el GTFS](auditoria/01-fase3-cruce-gtfs.md) | El GTFS del NAP es fresco y correcto. **El puente de identidad es gratis**: `poste = int(stop_code[2:])`, 934/934 paradas. Meses de curación manual eran, en su mayor parte, redundantes. |
| 2 | [Color y desvíos](auditoria/02-fase4-color-y-desvios.md) | Los colores de línea del GTFS. Y la prueba de que **el GTFS no modela los desvíos**: cero `exception_type=2`, y sus rutas siguen bajando por una avenida cortada. |
| 3 | [¿Se puede repintar la ruta?](auditoria/03-fase5-desvios.md) | 🛑 **Informe retractado.** Concluyó que solo se podía tachar, no repintar. Era falso: evalué un solo método. |
| 4 | [La vigencia de los avisos](auditoria/04-fase6-vigencia.md) | 🛑 **Informe invalidado.** Validé un «oráculo» sobre 16 postes que eran todos desvíos de ruta, y lo apliqué a supresiones de parada. El descubridor del error fue Antonio, andando por la calle. |
| 5 | [El oráculo roto](auditoria/05-fase7-oraculo.md) | ⭐ **La asimetría que lo gobierna todo.** Un **desvío** cambia la ruta operativa → se ve en todas partes. Una **supresión de parada** no la toca → **es invisible en todas partes**. Prueba: el poste 744, donde el comunicado dice «sin realizar parada» y la API anuncia buses. |
| 6 | [La ruta real](auditoria/06-fase7b-ruta-real.md) | ⭐ **El hallazgo.** La web del operador sirve **la secuencia ordenada del recorrido de hoy, con el desvío aplicado**, para 45 de 46 líneas. El desvío se **deriva**, no se transcribe. Y como se deriva, **se apaga solo**. |
| 7 | [El contrato de explotación](auditoria/07-contrato-de-explotacion.md) | El pliego municipal fija **qué líneas llevan articulado** (23, 32, 33, 34, 35, Ci3, Ci4 — y la aritmética cierra: 97). Pero **ese contrato no está adjudicado**. Y de paso: el registro oficial de flota demostró que **el fichero heredado mentía en el 20% de las longitudes**. |
| 8 | [El diseño de la referencia](auditoria/08-diseno-de-la-referencia.md) | Qué se **clona**, qué se **tira** y qué hay que **construir desde cero** de la aplicación de referencia. La regla que sale de aquí: *la referencia manda en lo visual; NO manda en lo que miente*. |
| 9 | [Motor contra interfaz](auditoria/09-motor-vs-interfaz.md) | Dónde acaba el motor y empieza la pantalla, y por qué el motor no puede saber que existe una pantalla. |
| 10 | [Cierre de la tabla píxel a píxel](auditoria/10-cierre-de-la-tabla-pixel.md) | ⛔ **Un cabo que se retira a propósito**, con su motivo escrito. Medir para confirmar lo ya decidido no cierra nada. |

---

## Auditorías de código (24/07/2026)

Las tres primeras que **no miran los datos, sino el proyecto**: se hicieron antes de publicar, y
**no arreglaron nada** — descubren, y se decide después.

| | Informe | Lo que encontró |
|---|---|---|
| 11 | [Código y arquitectura](auditoria/11-codigo-y-arquitectura.md) | El escaparate: duplicación, código muerto, tamaños reales (código **frente a** comentario) y qué ve un reclutador en cinco minutos. ⭐ El hallazgo: **el README llevaba meses diciendo que la aplicación no existía.** |
| 12 | [Perímetro y publicación](auditoria/12-perimetro-y-publicacion.md) | Lo público y lo indexable, secretos en el árbol **y en el historial**, cabeceras y licencias. ⭐ El hallazgo: **`/api/diag` contaba cero peticiones mientras se hacían.** |
| 13 | [Rendimiento](auditoria/13-rendimiento.md) | Medido antes de proponer, y de todo salió **una sola acción**: el **GTFS de 1,9 MB viajaba al navegador** para pintar un chip de colores. Lo demás son números que dicen *no toques*. |

---

## Diseño

| Documento | |
|---|---|
| [Modelo de datos y capas](diseno/tanda1-modelo-de-datos.md) | ✅ **APROBADO** (13/07/2026, con enmiendas). El modelo, las tres capas, la caché, la cuenta de peticiones, los agujeros — y las cuatro cosas del encargo que estaban mal. |
| [Cierre de cabos](diseno/tanda1-cierre-de-cabos.md) | Las enmiendas: la flota regenerada, el contrato en vigor, y una caché que no depende de cuántos procesos arranque el hosting. |

---

## Lecciones

[**LECCIONES.md**](LECCIONES.md) — Tres, con la cicatriz que las produjo. Valen más allá de ZetaBus:

1. **Todo extractor necesita un contador de control independiente.** Un parser perdió un vehículo
   en silencio por un carácter invisible en un PDF: devolvió 349 de 350 sin quejarse.
2. **En cuanto dejas de declarar y empiezas a contar, el problema desaparece.** *Contar no
   necesita permiso; declarar sí.*
3. **Un dato heredado sin procedencia no se corrige: se sustituye.** Y si sus errores apuntan
   todos al mismo lado, **no los corrijas uno a uno: busca la causa.**

---

## Cómo leer estos informes

- **Lo NO VERIFICADO va marcado como tal.** Si un informe no dice de dónde sale un dato, es un
  bug del informe.
- **Los informes retractados NO SE BORRAN.** Se marcan con un banner y se explica qué los tumbó.
  Saber que creímos algo, y por qué dejamos de creerlo, vale tanto como la conclusión buena.
- **Las fechas importan.** Todo esto se midió en julio de 2026. Las fuentes cambian.
