# Auditoría · LOS NOMBRES DE PARADA

> **Diagnóstico. No se ha tocado una línea de código.**
> 14/07/2026 · 87 peticiones a Avanza en total, con ritmo de 1,5 s.

---

## El resumen, antes de nada

| # | Pregunta de Antonio | Respuesta |
|---|---|---|
| 1 | ¿El Title Case roto es culpa nuestra? | ⛔ **NO.** Viene así en `stops.txt`. Nosotros lo copiamos literal. |
| 2 | ¿Cuántas inconsistencias tiene el GTFS? | **751 de 934 nombres tocados (80,4 %)** + 11 topónimos con la tilde bailando |
| 3 | ¿El JSON heredado los tenía mejor? | ⭐ **SÍ. Te equivocaste al despreciarlo… pero no es la fuente buena.** |
| 4 | ¿Cuál es la fuente fiable? | ⭐⭐ **La web viva de Avanza (`get_stops_list`).** Ya la llamamos. |
| 5 | ¿Se normaliza? | **No se normaliza: se PIDE.** No inventamos el nombre bueno — se lo preguntamos al operador. |

> ### ⭐ El hallazgo en una frase
> **El GTFS de Avanza y la web de Avanza son la misma base de datos. Pero el GTFS pasa los
> nombres por un `Title Case` roto antes de publicarlos.** El operador tiene el nombre bien
> escrito. Solo lo estropea al exportar.

---

## 1 · ¿ES CULPA NUESTRA? — **NO**

Buscado en todo el código: `capitalize`, `titleCase`, `text-transform`, `charAt(0).toUpperCase()`.

```
src/                → 0 transformaciones de nombre de parada
CSS / Tailwind      → 0 `capitalize`
src/sources/gtfs-nap/adapter.ts:320   name: sget(r, 'stop_name')     ← LITERAL
```

Y el `stops.txt`, abierto y leído:

```
16591  |Av. De Cataluña N.º 51|
17893  |P. De La Mina N.º 15|
17532  |Violante De Hungría N.º 5|
16524  |Asín Y Palacios N.º 5|
```

**Los cuatro que citas salen así del fichero oficial.** Es un descarte limpio y valía la pena
hacerlo primero: si hubiera sido nuestro, era una línea.

---

## 2 · LAS INCONSISTENCIAS DEL GTFS · **751 de 934 (80,4 %)**

⚠️ **No son 5. Es un problema de diseño de la fuente, no un parche.**

### (a) El Title Case a saco

| Defecto | Casos |
|---|---|
| Conector en Mayúscula (`De`, `Del`, `La`, `Y`) | **491** |
| `N.º` donde el operador escribe `n.º` | **515** |
| **UNIÓN (nombres afectados)** | **751** |
| Intactos | 183 |

### (b) ⭐ La huella dactilar: quién lo rompió

Tres nombres delatan a la máquina:

```
GTFS                          AVANZA EN VIVO
Miguel ángel Blanco N.º 53  ← Miguel Ángel Blanco n.º 53      ⛔ la Á se cayó
Pedro Iii / Asín Y Palacios ← Pedro III / Asín Y Palacios     ⛔ III → Iii
Av. Juan Pablo Ii N.º 60    ← Av. Juan Pablo II n.º 60        ⛔ II → Ii
```

Esa combinación —**pone en mayúscula la primera letra de cada palabra, incluidos los
conectores; destroza los números romanos; y NO sabe subir una `á` a `Á`**— es la firma de un
`ucwords()` de PHP, que trabaja **byte a byte** y no entiende UTF-8. Reproduce **80 de 82**
nombres reales que le he pedido a Avanza.

⚠️ **No afirmo que sea `ucwords()`.** Afirmo lo que he medido: **la transformación es mecánica,
determinista, y se aplica al exportar.** No es un teclista descuidado. Es una función.

⚠️ **Y es una transformación con pérdida.** De `Iii` no se puede volver a `III`, ni de `ángel` a
`Ángel`, sin un diccionario. **Deshacerla desde nuestro lado sería adivinar.**

### (c) Topónimos con la tilde bailando — **11 palabras**

| Bien | Mal | Ejemplo del malo |
|---|---|---|
| León (4) | **Léon** (1) | `Av. Policía Local / Léon De Oro` |
| Aragón (26) | **Aragon** (1) | `P. Reyes De Aragon N.º 18` |
| Julián / Garcés (8) | **Julian / Garces** (1) | `Fray Julian Garces / Cementerio` |
| Paraíso (1) | **Paraiso** (2) | `P. Pamplona N.º 4 / Plaza Paraiso` |
| Tomás (4) | **Tomas** (1) | `Tomas De Anzano / Colegio` |
| Jiménez, María, Malibrán, Ítaca, Américano | (1 c/u) | `Av. De Navarra (C.M.E Inocencio Jimenez / Rioja)` |

⚠️ **Y el más divertido: `Un Américano En París`.** *Américano* no es una palabra. Esa tilde no
la pone una máquina: la pone una persona. **Coexisten los dos tipos de error.**

### (d) Abreviaturas de vía mezcladas

```
"Av."=331  ·  "Avda."=1  ·  "Avenida"=10     ⚠️ tres formas
"P."=77    ·  "Paseo"=9                       ⚠️ dos formas
"Ctra."=21 ·  "Carretera"=1                   ⚠️
"Cno."=4   ·  "Camino"=48                     ⚠️
"N.º"=510  ·  "Nº"=1  ·  "N. º"=1  ·  "N."=1  ⚠️ cuatro formas
```

### (e) ⭐ El mismo fichero, dos calidades — **y esto es la prueba**

`stops.txt` trae **984** paradas: **934 de bus (Avanza)** y **50 de tranvía (Tranvías Urbanos)**.
Y las del tranvía **están bien escritas**:

```
BUS      |Av. De Cataluña N.º 51|      |Un Américano En París N.º 17|
TRANVÍA  |Avenida de la Academia|      |Un americano en París|
         |Plaza del Pilar - Murallas|  |Cantando bajo la lluvia|
```

**Mismo fichero. Mismo día. Misma parada de Valdespartera, incluso.** La diferencia no es el
formato GTFS: **es quién metió los datos.** El tranvía escribe bien; el exportador de Avanza
rompe.

---

## 3 · ⭐ EL JSON HEREDADO — **ANTONIO TIENE RAZÓN, Y YO ME EQUIVOQUÉ**

**939 registros. Cotejados poste a poste contra el GTFS:**

```
idénticos ............... 126
DIFIEREN ................ 803
en el heredado y no GTFS   10
```

Y en **prácticamente todas** las 803, **el heredado está mejor escrito**:

```
poste   GTFS                                    HEREDADO
   8    Miguel ángel Blanco N.º 53          →   Miguel Ángel Blanco nº 53      ✅ recupera la Á
  15    Camino De Juslibol                  →   Camino de Juslibol             ✅
  26    Autonomía De Aragón / Campo De Fú…  →   Autonomía de Aragón / Campo…   ✅
  54    Av. De Cataluña N.º 17              →   Avenida de Cataluña nº 17      ⚠️ mejor… pero expande
```

### ⛔ Pero NO es la fuente buena. Y el motivo importa.

**El heredado no transcribe: TRADUCE.** Cotejado contra la web viva de Avanza, sus 57
diferencias se explican **todas** con dos reglas mecánicas suyas:

```
Av.  → Avenida        (Avanza escribe "Av. de Cataluña n.º 51")
P.   → Paseo          (Avanza escribe "P. de La Mina n.º 15")
n.º  → nº
```

⚠️ **Y ahí caes exactamente en el riesgo que tú mismo señalaste**: el heredado convierte
`P. Pamplona` en `Paseo Pamplona`. **Si la marquesina dice "P. Pamplona", le hemos cambiado el
nombre a la parada que el usuario tiene delante.**

Además, su procedencia **no está limpia**. El inventario del proyecto anterior lo llama
literalmente *"archivo maestro **curado** por ZGZ Radar"* — tocado a mano. Y sabemos de la
Fase 3 que **27 de sus coordenadas estaban editadas a mano y rotas, hasta 909 m**. Un fichero
que ya demostró que alguien lo abrió y lo modificó **no puede ser la autoridad del nombre**.

> ### ⭐ El veredicto honesto, en las dos direcciones
> **Me equivoqué**: dictaminé "trabajo redundante" mirando solo las coordenadas. **Los nombres
> del heredado son claramente mejores que los del GTFS, y eso no lo miré.**
>
> **Pero Antonio también se equivoca al querer recuperarlo**: no es la capa buena. Es una
> *interpretación* de la capa buena, mejorada en el 90 % y estropeada en el 10 %. Y ese 10 %
> nace sin procedencia.
>
> **El heredado no era la respuesta. Era la PISTA de que existía una respuesta mejor.**

---

## 4 · ⭐⭐ LA FUENTE FIABLE: LA PROPIA AVANZA, EN VIVO

`admin-ajax.php?action=get_stops_list` — **el mismo endpoint que ya usamos para los desvíos.**
Devuelve el desplegable de postes de su web, con el nombre **tal y como el operador lo escribe hoy**.

**83 postes pedidos, en 4 líneas (21, 35, 30, C1):**

```
AVANZA VIVO == GTFS ........  12 / 82   (14,6 %)
AVANZA VIVO == HEREDADO ....  24 / 82   (28,9 %)
```

```
poste   AVANZA EN VIVO                  GTFS                            HEREDADO
   55   Av. de Cataluña n.º 51          Av. De Cataluña N.º 51          Avenida de Cataluña nº 51
 1248   P. de La Mina n.º 15            P. De La Mina N.º 15            Paseo de La Mina nº 15
  623   Pedro III / Asín Y Palacios     Pedro Iii / Asín Y Palacios     —
    8   Miguel Ángel Blanco n.º 53      Miguel ángel Blanco N.º 53      Miguel Ángel Blanco nº 53
 1297   Cosuenda / Paseo de Longares    Cosuenda / Paseo De Longares    Cosuenda / Paseo de Longares
```

**Avanza acierta en los cuatro casos que tú denunciaste. En los cuatro.**

### La tabla de fuentes

| Fuente | Consistente | Es de quien manda | Redistribuible | Veredicto |
|---|---|---|---|---|
| **`get_stops_list` de Avanza** | ⚠️ casi | ⭐ **SÍ — es el operador** | ⛔ **no** | ⭐ **LA BUENA** |
| GTFS `stops.txt` | ⛔ 80 % roto | sí (mismo emisor) | ✅ sí | La que tenemos |
| JSON heredado | ✅ pero **traduce** | ⛔ es una interpretación | ⛔ scrapeado | ⛔ pista, no fuente |
| Ayuntamiento | ⛔ | ⛔ | ✅ | ⛔ **descartada en la Fase 3** (línea 24 fantasma, Ci3/Ci4 ausentes) |
| Comunicados de alteraciones | — | sí | ⛔ | Casan con `stops.txt` → **arrastran el mismo error** |
| Rótulo físico de la marquesina | ? | ⭐ es el que ve el usuario | — | ⚠️ **NO LO HEMOS MIRADO. Ver §6.** |

---

## 5 · RECOMENDACIÓN

### ⛔ Lo que NO hay que hacer

**NO normalizar por reglas nuestras.** Ni "des-title-casear", ni expandir `P.` → `Paseo`, ni
poner tildes que creemos que faltan. Sería inventarnos el nombre correcto, y **la
transformación del GTFS tiene pérdida: no se puede deshacer, solo adivinar.** Es la L3 con otro
traje.

### ✅ Lo que sí

**Una capa de nombres pedida al operador, con su procedencia escrita:**

```
1. En el BUILD, una sola vez:  get_stops_list de las 52 líneas × sus sentidos
                               → 74 peticiones · ~2 min a ritmo de 1,5 s
2. Cada nombre nace con:       { poste, nombre, fuente: 'avanza-web', fecha }
3. El que Avanza NO dé         → se queda el del GTFS, marcado  fuente: 'gtfs'
4. Y NADA se corrige a mano.
```

**Trabajo:** un script de sincronización, un campo en el artefacto, y un test que ate el
recuento. Pequeño. **El diagnóstico era lo caro; el arreglo no.**

### ⚠️ Y hay DOS problemas que no puedo resolver yo

**(1) La cobertura no es del 100 %.** `get_stops_list` devuelve **la ruta REAL de hoy** — o sea,
**no devuelve las paradas suprimidas por un desvío**. Los cuatro postes de Avenida de Valencia
(262-265) están hoy fuera de servicio: Avanza **no nos va a dar su nombre**. Se quedarán con el
nombre roto del GTFS, y hay que **decirlo en pantalla**, no taparlo.

**(2) ⛔ EL PERMISO. Y esto lo decides tú.**
Tu regla es: *"ningún dato scrapeado de Avanza entra al repo público."* Una tabla de 934 nombres
sacada de su web **es exactamente eso**. Consumirlos en vivo (como ya hacemos en los desvíos) no
es lo mismo que **publicar el listado**.

Las tres salidas, sin que yo elija por ti:
- **(a)** Se pide en el build y **no se commitea** (el artefacto se genera en el despliegue). Sigue publicándose en el sitio, pero no en el repo.
- **(b)** Se pide **en vivo**, por línea, con caché — cero fichero, pero peticiones en caliente.
- **(c)** No se toca y se **muestra el nombre roto**, con una nota diciendo que la fuente oficial está así.

**Yo recomendaría (a)** — es el mismo trato que ya le damos al GTFS y no añade carga a Avanza en
horas de servicio. Pero **es tu llamada, no la mía.**

---

## 6 · ⚠️ LO QUE NO SE PUEDE SABER

**No sé cuál es el nombre "correcto" de una parada. Nadie en este proyecto lo sabe.**

Lo que sé es **quién tiene derecho a decirlo: el operador**. Y su web lo dice. Pero:

- **No he visto un rótulo físico.** Si la marquesina de Paseo Pamplona dice `Ps. Pamplona`,
  Avanza también está equivocada, y no me he enterado. **Eso solo se comprueba en la calle, y
  no lo he hecho.** Es literalmente trabajo para ti, que coges el bus.
- **Avanza tampoco es perfecta.** Escribe `Asín Y Palacios` (con `Y` mayúscula) y `P. de La Mina`
  (con `La` mayúscula). ⚠️ **Uno de tus cuatro ejemplos —`Asín y Palacios`— NO se arregla con
  esta capa: el operador lo escribe con `Y`.** Prefiero decírtelo a colártelo.
- **No sé si `get_stops_list` es estable.** Si mañana cambian el desplegable, la capa se cae.
  Hay que atarla con un test que **falle en voz alta**, no que se quede en silencio.

**Y no he arreglado nada.** Esto es el diagnóstico que pediste.
