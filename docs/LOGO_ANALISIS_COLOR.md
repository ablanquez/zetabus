# El color del logo de ZetaBus — ¿qué queda libre?

> Investigación. **No se ha tocado código.** Mide qué zona del espectro está libre
> para un color de marca que no choque con los 44 colores de línea (identidad ajena,
> los pone Avanza) ni con los colores semánticos del sistema.

## TL;DR — la rueda está llena. Se declara el techo.

- **No existe ningún color a ΔE ≥ 25 de las 44 líneas que además sea un color de marca de verdad.** El máximo alcanzable por un color vivo y usable es **ΔE ≈ 26**, y cae en un mostaza-marrón sucio que choca con el ámbar de aviso. Cualquier color vívido y reconocible (azul, violeta, magenta, teal) se queda en **ΔE 8–18**: dentro de la distancia de confusión de al menos una línea.
- **Techo físico absoluto** (cualquier color, aunque sea feo): **ΔE 30,2**, en `#482905` — un marrón casi negro (L\*20) que se ve como tinta/texto, no como una marca.
- Es la misma situación que la paleta de la parrilla de Turnia: **el espacio no da**. La respuesta no es "elige este tono libre" (no lo hay); es **cambiar de eje de separación**.
- **Decisión (§6): `#7048E8`, violeta-índigo eléctrico.** No gana por tono (imposible) sino por **croma**: en el arco azul→violeta **todas** las líneas son de croma bajo (C ≤ 44), así que un color muy saturado ahí se lee como "otra cosa" aunque el ΔE sea ~12. Contexto (un logotipo no es un chip) + croma + posicionamiento (≠ azul de Avanza, ≠ teal de Linaje) hacen el resto.

---

## 1 · Qué se midió y cómo

- **Fuente de los 44 colores:** `src/generated/gtfs.json` (el artefacto que alimenta la home). Son exactamente las 44 líneas que salen como chips. **El tranvía (`00CC00`) y las 8 líneas de evento (todas `#0052CC`) NO están**: ZetaBus pide solo `modes: ['bus']` y esas líneas de evento no tienen viajes (son zombis). → 44 colores, 44 distintos.
- **Espacio de color:** sRGB → **CIELab** (D65). Distancias en **ΔE2000** (no ΔE76: pondera mejor tono/croma/claridad como los ve el ojo). Mapa en **LCh** (tono/croma/claridad).
- **Distancia = al MÁS CERCANO de los 44**, no a la media (como pediste).
- **Contraste:** WCAG 2.1, ratio sobre `--color-fondo` (#E2E8F0, el lienzo) y sobre papel blanco (#FFFFFF, las tarjetas).
- **Semánticos a no pisar:** `alerta` #B91C1C (rojo), `aviso` #92400E + borde #FCD34D (ámbar), `tinta` #0F172A (texto). ⚠️ **No existe token verde "ok"** en el sistema — pero da igual: el verde es la zona más saturada de la rueda (≈12 líneas), estaba descartado de todos modos.

---

## 2 · El mapa: la rueda de tono está casi llena

Histograma de tono (bins de 15°), las 44 líneas:

```
  0– 15°  █            (rojos-magenta)
 15– 30°  ███
 30– 45°  ██           (rojos-naranja)
 45– 60°  █
 60– 75°  █
 75– 90°  █████        (naranjas-amarillo: la zona más poblada)
 90–105°  █
105–120°  ████         (limas-verde)
120–135°  ██
135–150°  █
150–165°  ███          (verdes)
165–180°  ██
180–195°  ··HUECO      ← único hueco "puro" (15°)
195–210°  ██           (teals-cian)
210–225°  █
225–240°  ··HUECO      ← hueco (15°)
240–255°  █
255–270°  █            (azules)
270–285°  ··HUECO      ← hueco (15°)
285–300°  ██           (índigos-violeta)
300–315°  ███
315–330°  ██           (púrpuras)
330–345°  █
345–360°  █████        (magentas-rosa: la otra zona poblada)
```

**Sí hay tres huecos de tono** (≈185° cian, ≈232° azul, ≈277° violeta) **pero son espejismos**: en Lab completo, el mejor color realizable dentro de cada hueco sigue chocando con una línea que lo flanquea —

| Hueco | Mejor color | ΔE a la línea + cercana | Topa con |
|------:|:-----------:|:-----------------------:|:---------|
| ≈185° (cian)    | `#0F8C7B` | **9,6** | 56 (`#00A993`) |
| ≈232° (azul)    | `#0F9DC1` | **8,0** | 36 (`#0094D1`) |
| ≈277° (violeta) | `#5C7FD0` | **13,9** | 35 (`#445C9F`) |

Un hueco de 15° de tono no es un hueco de color: los vecinos siguen a menos de ΔE 14.

---

## 3 · El techo (lo pediste explícitamente: declararlo)

Barrido denso de todo el gamut sRGB (tono 0–360° × croma × claridad), midiendo `min ΔE2000 a los 44`:

| Nivel | Color | min ΔE a las 44 | Qué es |
|:------|:-----:|:---------------:|:-------|
| **Techo físico** (sin filtros) | `#482905` | **30,2** | Marrón casi negro, L\*20. Se ve como **tinta/texto**, no como marca. |
| **Techo de marca** (C ≥ 45, contraste ≥ 3 en fondo y papel) | `#704700` | **26,5** | Mostaza-marrón oscuro. Y **ΔE 13 del ámbar de aviso** → choca con la semántica. |
| **Cualquier color VÍVIDO** (magenta, azul, teal, violeta) | — | **8 – 18** | Por debajo de la barra. Vive dentro de la distancia de confusión de alguna línea. |

**Candidatos a ΔE ≥ 25 con todos los filtros (ΔE≥25 a las 44 + ΔE≥25 a semánticos + contraste≥3): CERO.**

> **Veredicto:** no se puede tener un color de marca vívido a ΔE ≥ 25. El techo real de un color usable es ~26 y solo en el barro mostaza. **La rueda está llena.**

---

## 4 · La salida: cambiar de eje (croma, no tono)

Como en Turnia: cuando el tono no da, se separa por otra dimensión. Aquí el dato clave está en la tabla del §2 — **todo el arco azul → violeta (240°–285°) está poblado solo por líneas de croma BAJO:**

```
línea 36  #0094D1  C=42      N3  #00B9F2  C=43
línea 35  #445C9F  C=41      Ci4 #354887  C=40
```

Ninguna pasa de C≈44. Así que **un color muy saturado (C ≈ 75–85) en ese arco se lee como "otra familia"** aunque el ΔE numérico sea ~12–14: el ojo lo ve *eléctrico*, no *institucional*. Ese es el diferenciador que sí queda libre.

### Ficha de los finalistas (medida)

| Color | Muestra | Línea + cercana | vs Avanza `#0052CC` | vs alerta / aviso | Contraste fondo / papel / tinta | L\* (grises) |
|:------|:-------:|:---------------:|:-------------------:|:-----------------:|:-------------------------------:|:-----------:|
| **`#7048E8`** violeta-índigo | 🟪 | 39 · ΔE **12,0** | ΔE 12,8 | 42 / 48 | 4,51 / 5,55 / **3,21** | 44 |
| `#5B4FE0` violeta-azul | 🟦 | 35 · ΔE 11,5 | ΔE 9,1 | 43 / 47 | 4,68 / 5,77 / 3,09 | 43 |
| **`#1A76FA`** azure vivo | 🟦 | 36 · ΔE **14,3** | ΔE 13,5 | 3,40 / 4,19 / 4,26 | 52 |

Todos: **clarísimos de los semánticos** (ΔE 42–50 del rojo y del ámbar — cero riesgo de leerse como alerta/aviso), **contraste UI ≥ 3** en los dos lienzos, y **funcionan en grises** (L\* 43–52: gris medio, se despega del fondo L\*88 y del papel; el símbolo carga la identidad en el favicon pequeño).

### Recomendación

1. **Primero: `#7048E8` (violeta-índigo eléctrico).** Es el que mejor separa de **las dos** cosas a la vez: de las líneas (ΔE 12, el máximo práctico en un vívido) **y** del azul institucional de Avanza (ΔE 12,8 — no se confunde con "lo oficial"). Vive en el arco más vacío (270–285°) rodeado solo de índigos apagados; su saturación lo distingue. Mejor contraste sobre fondo/papel (4,5 / 5,6).
2. **Alternativa más amable: `#1A76FA` (azure vivo).** Más cercano, más "transporte", pero **ojo:** está a solo ΔE 13,5 del azul institucional de Avanza (`#0052CC`, las líneas de evento) → **riesgo de leerse como marca del operador**, justo lo que ZetaBus (proyecto independiente) no quiere. Elegirlo es una decisión de posicionamiento, no solo de color.
3. **Evitar `#5B4FE0`:** bonito, pero a ΔE 9,1 del azul de Avanza — hereda el riesgo del punto 2 sin la distinción del punto 1.

---

## 5 · Avisos para quien decida

- **La barra numérica de ΔE es orientativa, no una sentencia.** Un logotipo es un texto con un símbolo, no un cuadrito de 24 px con un número dentro. La confusión chip↔logo real es mucho menor que la que sugiere el ΔE. Pero **no hay margen para ser descuidado**: cualquier vívido está a ≤ 18 de *alguna* línea, así que el símbolo y la tipografía tienen que hacer trabajo de desambiguación (regla de familia: símbolo propio).
- **Verde, naranja, amarillo, rojo, magenta: descartados.** Son las zonas saturadas. Y rojo/ámbar además pisan la semántica.
- **El azul institucional `#0052CC` no está en los chips** (líneas de evento zombis), pero **sigue siendo "el azul de Avanza"**. Un azul de marca cercano puede parecer oficial. El violeta-índigo esquiva ese problema; el azure lo asume.
- **No hay token verde "ok"** en el sistema (`globals.css` solo define `alerta` y `aviso`). Si algún día se añade uno, vendría del verde — ya bloqueado por las líneas, sin efecto sobre esta decisión.

---

## 6 · DECISIÓN

> **Color elegido: `#7048E8` — violeta-índigo eléctrico.** 🟪

### Los tres motivos

1. **Máximo práctico frente a las 44 líneas: ΔE 12, separando por CROMA, no por tono.** No hay tono libre (la rueda está llena); lo que sí queda libre es el eje de *saturación* en el arco azul→violeta, donde todas las líneas son apagadas (C ≤ 44). Un violeta eléctrico ahí se lee como otra familia aunque el número sea 12.
2. **A ΔE 12,8 del azul institucional de Avanza (`#0052CC`) — y eso importa por diseño, no por estética.** ZetaBus no es de Avanza y no debe parecerlo. Toda la app se apoya en **declarar de dónde sale cada dato** para no confundirse con la fuente (la procedencia por campo, `/sobre-los-datos`, el "nombre sin confirmar"…). Un logo azul institucional desharía ese contrato de un plumazo: parecería la app oficial del operador. El violeta lo niega a primera vista.
3. **La familia del portfolio.** Linaje es **teal**. Un ZetaBus azul pondría dos proyectos en la misma zona fría del espectro — se confundirían entre ellos, que es el otro sitio donde estos colores conviven (no solo la home). El violeta separa también ahí. Regla de familia cumplida: **color propio**, símbolo propio, lo demás heredado.

### ⚠️ El techo, en voz alta

**ΔE 12 es el máximo práctico. No se puede hacer mejor, y no es pereza.**

Quien lea esto dentro de seis meses y vea "solo ΔE 12" que no piense que no se buscó: se barrió **todo** el gamut sRGB (§3). El techo de un color de marca vívido y usable es ΔE ≈ 26 y solo en un mostaza-marrón que choca con el ámbar de aviso; el de un color *vívido* cualquiera es 18; el máximo físico absoluto (aunque sea un marrón casi negro que parece tinta) es 30,2. **No existe ningún color a ΔE ≥ 25 que sirva de marca.** `#7048E8` es lo mejor alcanzable una vez que se acepta —con datos— que el tono está agotado y se separa por croma, por contexto y por posicionamiento. Es una decisión medida, no un compromiso perezoso.

Si algún día cambia el criterio (Avanza reordena su paleta, o se acepta ΔE ≥ 20 como suficiente), se reejecuta `color.js` y se recalcula. Hasta entonces: **`#7048E8`.**

---

### Método reproducible

Los números salen de `scratchpad/color.js` (sRGB→Lab, ΔE2000, contraste WCAG, barrido de gamut). Sin dependencias externas. Si se cambia el criterio (p. ej. exigir contraste ≥ 4,5 para texto pequeño, o aceptar ΔE ≥ 20 en vez de 25), se reejecuta y se recalcula el techo.
