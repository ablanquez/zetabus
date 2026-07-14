# Auditoría · LA FLOTA COMPLETA

> ## ⭐ ACTUALIZACIÓN · TANDA 8 (14/07/2026)
>
> Antonio aportó los **7 vehículos observados**, y se vació la longitud de los huérfanos.
>
> | Nivel | T6 | T7 | **T8** |
> |---|---|---|---|
> | `oficial` · pliego | 350 | 350 | **350** |
> | `fuente_secundaria` · busesmadrid | — | 43 | **43** |
> | `observacion_propia` · Antonio | — | 0 | **7** |
> | `sin_verificar` · nadie | **53** | 10 | **3** |
>
> **`sin_verificar`: 53 → 10 → 3.** Los tres que quedan (**4610, 4617, 4923**) son Irisbus diésel
> viejos que **no están en el pliego, no están en busesmadrid, y Antonio no los ha visto**. El
> `?` sigue existiendo — y ahora es de verdad la excepción: **3 de 403 (0,7 %)**.
>
> **La inversión está corregida.** El `?` ya no presume de metros: los 3 huérfanos salen
> **sin longitud**, porque su fuente tiene un 20 % de error medido en ese campo.
>
> ⭐ **Y el canal queda abierto**: `data/flota-observada.json` es la vía permanente por la que la
> flota se mantiene al día. Ver **§ 10** (el proceso) y **§ 11** (qué pasa cuando el papel
> contradice a los ojos).

> 14/07/2026 · Tanda 7. La fuente que faltaba, auditada antes de usarla.
> **0 peticiones a la DGT. 0 servicios de matrículas. 0 bases de datos de vehículos.**

---

## El resumen

| | Antes | **Ahora** |
|---|---|---|
| `oficial` — pliego municipal | 350 | **350** |
| `fuente_secundaria` — busesmadrid.es | — | **43** |
| `observacion_propia` — Antonio | — | **0** (preparado y vacío) |
| `sin_verificar` — sin procedencia | **53** | **10** |
| **Con matrícula** | 350 / 403 | **385 / 403** |

> ### ⭐ El veredicto sobre la fuente
> **busesmadrid.es es buena. Muy buena. Y NO es oficial — y eso importa.**
>
> Contra el Anexo 5, en los **350 vehículos que están en las dos**: acierta el **100 % del
> fabricante**, el **100 % de la propulsión** y el **98,6 % de las matrículas**. Las 5 que
> falla son **transposiciones de letras** (`8948-MKF` / `8948 MFK`).
>
> **Eso no es azar: es la huella de una transcripción a mano.** Se equivoca ~1 de cada 70.
> Donde el pliego también la tiene, no pasa nada. **Donde busesmadrid es la ÚNICA fuente —los
> 43—, ese error NO ES DETECTABLE.** Por eso no ascienden a `oficial`, y por eso van marcados.

---

## 1 · LA AUDITORÍA DE LA FUENTE

### Qué trae exactamente

```
CALCA | MATRÍCULA | CHASIS | CARROCERÍA | OBSERVACIONES
4110  | 7225 MYX  | Mercedes-Benz | eCitaro   | Eléctrico
4320  | 3528 MYT  | Mercedes-Benz | eCitaro G | Eléctrico. Articulado
```

| Campo | ¿Lo trae? |
|---|---|
| Nº de coche (`CALCA`) | ✅ |
| Matrícula | ✅ (563 de 574) |
| Modelo (chasis + carrocería) | ✅ |
| Propulsión | ✅ — en `OBSERVACIONES` («Eléctrico», «Híbrido») |
| Articulado | ✅ — en `OBSERVACIONES`, explícito, en 131 vehículos |
| **Fecha de matriculación** | ⛔ **NO. La columna no existe.** |
| **Longitud** | ⛔ **NO.** Solo 12 de 574 la mencionan de pasada. |
| **Potencia** | ⛔ NO |

⚠️ **Lo que no trae, NO SE RELLENA.** Los 43 entran con `fechaMatriculacion: null`,
`longitudM: null` y `potenciaCv: null`. Un eCitaro G es articulado y *"todo el mundo sabe"* que
un articulado mide 18 m — **ese "todo el mundo sabe" es exactamente el que rompió 62 longitudes
del fichero heredado (20 %), siempre en el mismo sentido.** No se repite.

⇒ En pantalla, un eCitaro G sale como **«Articulado»**, sin metros. Es menos, y es cierto.

### ⭐ La prueba de fuego · contra el Anexo 5

**Cobertura: 350 / 350.** busesmadrid tiene **todos** los vehículos del pliego. No le falta uno.

| Campo | Coincidencia | Nota |
|---|---|---|
| **Fabricante** | **350 / 350 · 100 %** | Tratando `IVECO` ≡ `IRISBUS` — es la misma marca, dos nombres |
| **Propulsión** | **350 / 350 · 100 %** | Cero contradicciones |
| **Matrícula** | **342 / 347 · 98,6 %** | 3 no la publican |

**Las 5 discrepancias, una a una:**

```
4307   pliego 8948-MKF   bm 8948 MFK    ⚠️ mismas letras, orden cambiado
4313   pliego 6942-MGH   bm 6942 MHG    ⚠️ mismas letras, orden cambiado
4675   pliego 9413-HLK   bm 9413 LHK    ⚠️ mismas letras, orden cambiado
4867   pliego 4388-JTY   bm 3488 JTY    ⚠️ mismos dígitos, orden cambiado
4966   pliego 2436-KHJ   bm 2436 KHG    ⛔ la última letra, distinta de verdad
```

**Cuatro de cinco son transposiciones.** Nadie teclea `MFK` por `MKF` leyendo de una base de
datos: se teclea leyendo de una foto, o de una libreta. **Es una fuente humana, y se equivoca
como se equivoca un humano.**

⇒ **Manda el Anexo 5** en los 350. Y en los 43 donde busesmadrid está sola, se acepta el riesgo
**declarándolo**: ~1 de esas 35 matrículas es probablemente incorrecta, **y no sabemos cuál**.

### ⚠️ ¿Dice de dónde saca sus datos? — **NO**

```
"dateModified"  → ninguno
"datePublished" → ninguno
fuente / autor  → no se declara
```

**No hay fecha de actualización, ni cita de fuentes, ni política de correcciones.** Es una fuente
**sin metadatos**. Se cita por URL y **con la fecha en que la leímos nosotros** (14/07/2026), que
es lo único que sí podemos afirmar.

### ⭐ ¿Los números de coche casan con Avanza en vivo? — **SÍ, 17 de 17**

**Es la pregunta que decidía todo**: si su `CALCA` no fuera el número que Avanza devuelve, la
fuente no serviría para nada. Contraprueba con los coches que hemos visto circular de verdad:

| Coche | Antes | **Ahora** | busesmadrid dice |
|---|---|---|---|
| 4302 | oficial | oficial | 5130-MBV · Irizar ieTram |
| 4309 | oficial | oficial | 1395-MGJ · Irizar ieTram |
| **4114** | ⛔ sin_verificar | ⭐ **fuente_secundaria** | **7882-MZP** · Mercedes eCitaro |
| **4121** | ⛔ sin_verificar | ⭐ **fuente_secundaria** | **7280-NBP** · Mercedes eCitaro |
| **4132** | ⛔ sin_verificar | ⭐ **fuente_secundaria** | **0040-NCF** · Mercedes eCitaro |
| **4323** | ⛔ sin_verificar | ⭐ **fuente_secundaria** | **2734-NDX** · eCitaro G *articulado* |
| **4324** | ⛔ sin_verificar | ⭐ **fuente_secundaria** | **2735-NDX** · eCitaro G *articulado* |
| **4124** | ⛔ sin_verificar | ⚠️ **fuente_secundaria, SIN matrícula** | eCitaro — **la matrícula la deja en blanco** |
| 4678 · 4679 · 4684 · 4891 | oficial | oficial | Volvo 7900 Hybrid |
| 4902 · 4903 · 4906 · 4919 · 4921 | oficial | oficial | Irisbus Citelis |

**17 de 17 tienen ficha. Ninguno sale «SIN DATOS».** ✅

⚠️ **Y el 4124 es el caso honesto de la tanda.** Antonio se monta en él. Circula. busesmadrid lo
conoce, sabe que es un eCitaro eléctrico… **y no le pone matrícula.** Podría "reconstruirla"
siguiendo la serie (`2737-NDX`, `2735-NDX`…). **No lo he hecho.** Queda a `null`, y hay un test
que revienta si alguien la rellena.

---

## 2 · EL MAESTRO REGENERADO · `npm run flota:build`

**Se regenera. No se parchea.** (L3)

```
── FUENTES ─────────────────────────────────────────────────
  ✅ anexo5-2025                     declara 350 · leídos 350
  ✅ busesmadrid-2026-07-14          declara  43 · leídos  43
  ✅ flota-observada (Antonio)       declara   0 · leídos   0
  ✅ huérfanos del heredado          declara  10 · leídos  10
── CONTROL (L1) ────────────────────────────────────────────
  ✅ suma declarada 403 − pisados 0 = 403 escritos
── MAESTRO ─────────────────────────────────────────────────
  oficial              350
  fuente_secundaria     43
  observacion_propia     0
  sin_verificar         10
  TOTAL                403
  con matrícula: 385/403
```

**Cada registro nace con su procedencia DENTRO:**

```json
{
  "coche": 4323,
  "matricula": "2734-NDX",
  "fechaMatriculacion": null,        ← la fuente NO lo trae
  "longitudM": null,                 ← la fuente NO lo trae. NO se deduce.
  "clase": "articulado",             ← esto SÍ lo afirma, explícitamente
  "propulsion": "electrico",
  "confianza": "fuente_secundaria",
  "procedencia": {
    "fuente": "busesmadrid.es",
    "queEs": "sitio especializado en flotas de autobuses · NO OFICIAL",
    "url": "https://busesmadrid.es/autobuses-urbanos-de-zaragoza-s-a-auzsa/",
    "fechaConsulta": "2026-07-14",
    "dice": "Eléctrico. Articulado"
  }
}
```

### El contador de control (L1) es INDEPENDIENTE

No cuenta con el mismo bucle que construye: cuenta con lo que **cada fuente declara de sí misma**
en su `_meta.vehiculos`. Si no cuadra, **revienta**. El Anexo 5 ya mordió una vez (349 de 350, en
silencio, por un carácter invisible del PDF).

### En pantalla · **cuatro procedencias, tres marcas**

```
(sin marca)   pliego municipal    ← es la NORMA (87 %). No se anuncia.
    *         busesmadrid.es      ← citable, NO oficial
    †         visto circular      ← una persona, con fecha. NO citable.
    ?         sin procedencia     ← no consta en ninguna parte
```

Borde discontinuo + símbolo = **forma, no tono**. Sobrevive al gris. Y **la leyenda al pie solo
explica los símbolos que hay en esa parada**: si no circula ningún bus observado a mano, la línea
del `†` no se pinta.

---

## 3 · ⛔ CUÁNTOS QUEDAN SIN VERIFICAR — **NO SON CERO. SON 10.**

**El asterisco NO desaparece.** Y hay que decirlo, porque la pregunta estaba puesta a propósito.

| Coche | Qué es | Por qué sigue sin verificar |
|---|---|---|
| **4135** | Mercedes eCitaro | ⭐ busesmadrid **todavía no lo tiene** |
| **4330 – 4335** (6) | Mercedes eCitaro G | ⭐ busesmadrid **todavía no los tiene** |
| 4610, 4617 | Irisbus CityClass | Diésel viejos. Ni en el pliego ni en busesmadrid. |
| 4923 | Irisbus Citelis | Ídem. |

⭐ **Antonio tenía razón**: *«hay ALGUNO que aún no está en esa web»*. **Son siete**, y son
justo los más nuevos — 4135 y los 4330-4335. La fuente va por detrás de la calle, igual que el
pliego.

⚠️ **Un aviso extra que la fuente nos ha dado**: busesmadrid marca el **4648** como
**BAJA (Incendio)**. Está en nuestro maestro porque el heredado lo listaba. Lo conservo con esa
observación escrita en su procedencia: si de verdad no circula, **la API viva simplemente no lo
devolverá**, y nadie verá nunca su ficha.

---

## 4 · LO QUE NECESITO DE ANTONIO · `data/flota-observada.json`

El fichero **ya existe, está vacío y tiene las instrucciones dentro**. Es el único que se edita a
mano; todo lo demás se regenera.

### Obligatorio, por cada autobús

```
coche              4330                          ← el número que devuelve Avanza
fabricante         "Mercedes-Benz"
modelo             "eCitaro G"
observadoPor       "ablanquez"
fechaObservacion   "2026-07-14"                  ← el día que lo viste
comoLoSupe         "Me monto a diario en la 35; va rotulado en el frontal."
```

### Opcional — **pero NO SE ADIVINA**

```
matricula      "1234-ABC"  solo si la has LEÍDO. Si no → null. ⛔ NUNCA de la serie.
clase          "articulado" | "sencillo"   ← se ve a simple vista
propulsion     "electrico"                 ← un eCitaro no hace ruido; eso se oye
longitudM      ⛔ null, salvo que la sepas DE VERDAD. Un articulado NO es
               automáticamente 18 m: ese "automáticamente" costó 62 vehículos.
```

Luego: `npm run flota:build`, y `git commit`. **El `git blame` de ese fichero es la cadena de
custodia.** Un vehículo escrito ahí sale con `†` en pantalla y con tu nombre y la fecha dentro del
JSON. **Nunca se disfraza de pliego.** El generador **revienta** si falta el autor, la fecha o el
«cómo lo supe».

### ⭐ Los 7 que faltan, si te apetece empezar por ahí

`4135` · `4330` · `4331` · `4332` · `4333` · `4334` · `4335`

---

## 5 · LAS DISCREPANCIAS ANEXO 5 ↔ busesmadrid

**5 matrículas de 347** (las de arriba). **Cero en fabricante. Cero en propulsión.**

**Manda el Anexo 5**, siempre: es un documento firmado por el Ayuntamiento, y busesmadrid es un
sitio de aficionados. El generador ni siquiera lo consulta para esos 350 — **los mete primero, y
lo que ya está no se pisa**. Los solapamientos se cuentan y se imprimen: hoy son **0**.

---

## 6 · MI CRITERIO SOBRE PUBLICAR LAS MATRÍCULAS

**Sí se publican. Estas.** Y el motivo no es que el riesgo sea bajo, sino **de dónde salen**:

- **Ya están publicadas.** Las 350 vienen de un **pliego de contratación municipal**, un
  documento que se publica *precisamente para ser escrutado* (Ley 19/2013 de Transparencia). Las
  otras 35, de una web abierta e indexada. **No estamos desvelando nada**: estamos citando.
- **Son vehículos de una flota concesionaria de servicio público**, rotulados con su número y
  circulando por la vía pública. No son coches particulares. **No hay una persona física detrás
  de una matrícula de autobús urbano**: hay una empresa que presta un servicio pagado con dinero
  público.
- **El RGPD protege datos de personas físicas.** Una matrícula *puede* ser dato personal cuando
  identifica a un particular. Aquí el titular es Avanza Zaragoza S.A.U.

⚠️ **Pero el riesgo no es cero, y digo dónde está**: una matrícula permite consultas en servicios
de terceros (DGT, ITV, seguros). **No las hago, no las hago hacer, y no las facilito.** El
`AGENTS.md` lo prohíbe y esta tanda lo respeta al pie de la letra.

⇒ **Y la línea que NO cruzo:** no se publica **nada** que no estuviera ya publicado. Si algún día
Antonio lee una matrícula en la calle que no esté ni en el pliego ni en busesmadrid, mi
recomendación es **dejarla a `null`** y quedarnos con el modelo. La matrícula no le sirve a nadie
que esté esperando el autobús — **está en el dato para poder auditar, no para enseñarla.**

---

## 7 · LA CONTRAPRUEBA — **ENSEÑANDO EL ROJO**

28 tests nuevos, y **en verde al primer intento. Que es exactamente cuando hay que sospechar del
test.** Así que envenené el maestro con **las dos mentiras más creíbles del proyecto**:

```
💀 1. "un eCitaro G es articulado → longitudM = 18"      ← lo que todo el mundo sabe
💀 2. "al 4124 le reconstruyo la matrícula: 2738-NDX"    ← sigue la serie perfectamente
```

```
× los 43 salen con longitud NULL — la fuente no la publica
    → expected [ { coche: 4321, …(11) }, …(9) ] to deeply equal []
× …y el 4124 NO. Lo hemos VISTO circular, y busesmadrid no le pone matrícula
    → expected '2738-NDX' to be null

Tests  2 failed | 26 passed
```

**Las dos mueren.** Y con el maestro bueno, las 28 pasan.

Además: `confianza: "posterior_verificado"` —**el nivel exacto que pediste en la Tanda 6**— sigue
sin existir, y hay un test que lo rechaza por su nombre.

```
typecheck ....... limpio
lint ............ limpio
vitest .......... 228 passed | 1 skipped
```

---

## 8 · ⛔ UNA COSA QUE NINGÚN TEST IBA A CAZAR, Y QUE VI AL MIRAR LA PANTALLA

Abrí la página en gris, a 360 px, y esto es lo que hay:

```
Bus 4889   [Articulado · 18 m] [Híbrido]         ← oficial · sin marca
Bus 4114   ⌐Estándar¬ ⌐Eléctrico¬            *   ← busesmadrid · SIN metros
Bus 4330   ⌐Articulado · 18 m¬ ⌐Eléctrico¬   ?   ← heredado · CON metros
```

> ### ⚠️ **El autobús con MENOS procedencia enseña MÁS dato.**
>
> El `?` —**que no consta en ninguna parte**— presume de «18 m». El `*` —que tiene una fuente
> citable— no dice los metros, porque su fuente no los publica y **me negué a deducirlos**.
>
> **La marca dice "fíate menos de este", y la ficha enseña más. Es al revés.**

**Por qué ha pasado**: los 10 huérfanos conservan la longitud del fichero heredado, y ese campo
**tiene un 20 % de error medido** (62 de 316, siempre infraestimando). Los 43 nuevos no la
tienen porque su fuente no la trae y no me la invento.

**No lo he cambiado por mi cuenta.** Vaciar la longitud de los 10 es tocar un dato que llevaba
seis tandas en pantalla, y no me lo has pedido. **Pero mi recomendación es vaciarla**: enseñar un
número que sabemos falso 1 de cada 5 veces, y encima marcado como «sin procedencia», es lo peor
de los dos mundos. Diría solo «Articulado», igual que los otros. **Tú decides.**

---

## 9 · ⚠️ LO QUE NO SE PUEDE SABER, Y LO QUE HE DECIDIDO NO HACER

- **La longitud de los 43.** La fuente no la trae. **No la deduzco del modelo.** Salen sin metros.
- **La fecha de matriculación de los 43.** La columna no existe. `null`.
- **Cuál de las 35 matrículas nuevas está mal.** Con un ~1,4 % de error de transcripción medido,
  **estadísticamente hay ~0,5 matrículas incorrectas entre ellas, y no hay forma de saber cuál.**
  Está escrito en el `_meta` del fichero y en el THIRD-PARTY-NOTICES.
- **La matrícula del 4124** (y de 7 más). busesmadrid la deja en blanco. **Yo también.**
- **Si busesmadrid se mantiene.** No publica fecha de actualización ni fuentes. Nuestra
  instantánea lleva **la fecha en que la leímos**, que es lo único verificable.
- **⛔ NO he consultado la DGT, ni ningún servicio de matrículas, ni ninguna otra base de
  vehículos.** Solo busesmadrid.es y el pliego.

> **Prefiero 10 interrogaciones honestas a 10 datos inventados.** En la Tanda 6 me negué a
> inventarme la procedencia y tenía razón. Ahora hay fuente para 43 de los 53 — **y para los 10
> que quedan, la respuesta sigue siendo la misma.**

---
---

# TANDA 8 · LOS 7 OBSERVADOS, Y EL CANAL PERMANENTE

## 10 · CÓMO SE AÑADE UN VEHÍCULO (el proceso, escrito)

Está **dentro del propio fichero** (`data/flota-observada.json`, clave `_elProceso`), para que no
haya que buscarlo en ningún doc:

```
0 · CUÁNDO       Ves un autobús cuya ficha sale vacía («Sin datos») o marcada con «?».
1 · AÑADE        Copia el bloque `_ejemplo` al final del array `vehiculos` y rellénalo.
2 · SUBE EL      ⚠️ Pon `_meta.vehiculos` al número real. Si no cuadra, el generador
    CONTADOR        REVIENTA. Es la única cuenta que llevas a mano, y es A PROPÓSITO:
                    es el contador de control independiente (L1).
3 · REGENERA     npm run flota:build
4 · MIRA LO      Te dirá TRES cosas:
    QUE TE DICE     (a) si el contador cuadra
                    (b) si algún vehículo tuyo YA SOBRA (una fuente publicada lo
                        recogió y dice lo mismo) → bórralo de aquí
                    (c) si alguna fuente publicada te CONTRADICE
5 · COMMIT       El `git blame` de este fichero ES la cadena de custodia del dato.
```

**Obligatorio**: `coche` · `fabricante` · `modelo` · `observadoPor` · `fechaObservacion` ·
`comoLoSupe`. **Opcional pero jamás adivinado**: `matricula` (solo si la has **leído**) · `clase`
· `propulsion` · `longitudM`.

### ⭐ La objeción honesta, escrita en el fichero

**Antonio afirma la longitud a partir del modelo. Y eso es lo que rompió 62 longitudes del
heredado.** No lo maquillo — está en el `comoLoSupe` de cada uno de los 7:

> *"⚠️ La longitud la afirmo por el MODELO, que es lo que rompió el fichero heredado — pero el
> heredado lo dedujo de un catálogo y yo me subo al autobús: sé que es rígido y de 12 m porque lo
> veo. Es observación, no inferencia."*

**La diferencia que lo salva**: el heredado dedujo de un catálogo, donde un `VOLVO 7905` es a la
vez 12 y 18 m — **el modelo no determina la longitud**. Antonio **se sube**. El fuelle se ve.
Dentro de un año, quien lea el JSON sabrá que la longitud del 4331 viene de que **alguien se
montó en él**, no de un documento.

### ⛔ Una cosa que el diseño NO hace, y la digo

**Un vehículo tiene UNA fuente, no una por campo.** Consecuencia real: el **4114** está en
busesmadrid (que **no publica la longitud**) y sale como **«Estándar», sin metros** — aunque
Antonio sepa que los 41XX miden 12 m. Su observación no se usa porque **manda la fuente más
alta, entera**.

**Por qué**: mezclar procedencias campo a campo produce fichas Frankenstein de las que ya no se
puede decir *"esto viene de aquí"*. Prefiero decir menos y poder responder siempre de quién es
cada dato. ⚠️ **Si te molesta, se diseña procedencia POR CAMPO, con su marca. No lo he hecho por
mi cuenta.**

---

## 11 · ⭐⭐ CUANDO LA FUENTE OFICIAL CONTRADICE LA OBSERVACIÓN

**Va a pasar.** Antonio mete el 4340 porque se sube a él, y seis meses después el pliego
adjudicado lo recoge **diciendo que mide 12 m**.

### La regla

1. **GANA LA FUENTE MÁS ALTA. Siempre.** Un documento firmado por el Ayuntamiento pesa más que
   *"yo lo vi"*, y no es negociable: si no, cualquiera podría sobrescribir el registro público
   con una impresión.
2. ⚠️ **Pero la contradicción NO se resuelve en silencio. SE GRITA** — en rojo en el build, y
   **escrita en `_meta.discrepancias`** del maestro, con los dos valores y quién dijo cada uno.

### ⭐ Y NO REVIENTA. Este es el punto.

Un `throw` obligaría a **borrar una de las dos afirmaciones** para poder compilar. Y entonces
**la contradicción desaparece del proyecto** — que es justo lo que no queremos.

> ### Un desacuerdo entre lo que dice el papel y lo que se ve con los ojos **ES UN DATO**, no un
> conflicto que haya que quitar de en medio.

**Ya nos pasó**: el GTFS decía que la 35 para en Avenida de Valencia, la calle estaba cortada, y
el que *"resolvió el conflicto en silencio"* fue el que mandó a alguien a esperar a una calle
cortada. **El desacuerdo ERA la información.**

Aquí igual: si el papel dice 12 m y Antonio ve un fuelle, **o el documento va con retraso, o
Antonio se confundió de coche**. Las dos cosas hay que saberlas, y ninguna se sabe si el build se
limita a elegir y callarse.

### Y el caso feliz también se dice

Si una fuente publicada alcanza a una observación **y coincide**, el build lo anuncia:

```
── ✅ YA SOBRAN EN `data/flota-observada.json` ─────────────
  Una fuente publicada los recoge YA, y dice LO MISMO. Se pueden borrar.
```

**El fichero se vacía solo** según las fuentes alcanzan a la realidad. Hoy: `discrepancias: []` ·
`yaSobranEnLaObservacion: []`.

---

## 12 · LAS CONTRAPRUEBAS · **EL ROJO**

### (1) Un observado sin autor, sin fecha y sin «cómo lo supe» → **REVIENTA**

```
Error: ⛔ El coche 4340 de data/flota-observada.json no dice QUIÉN lo vio, CUÁNDO, ni CÓMO lo sabe.
   Una afirmación editorial sin autor y sin fecha es exactamente el JSON heredado otra vez.
```

### (2) Un observado que YA ESTÁ en el Anexo 5, con otra longitud → **GRITA, no elige en silencio**

Metí el **4889** (un Volvo 7905 que el pliego declara **articulado, 18 m**) como observado
*"rígido, 12 m"*:

```
██████████████████████████████████████████████████████████████
⛔⛔  DISCREPANCIA ENTRE UNA FUENTE PUBLICADA Y LO OBSERVADO
██████████████████████████████████████████████████████████████
  🚌 coche 4889 · campo "longitudM"
      ✅ MANDA   18           ← oficial (pliego-2025-anexo5)
      ⛔ CEDE    12           ← observacion_propia (Antonio Blánquez)
  🚌 coche 4889 · campo "clase"
      ✅ MANDA   articulado   ← oficial (pliego-2025-anexo5)
      ⛔ CEDE    sencillo     ← observacion_propia (Antonio Blánquez)

  ⚠️ MÍRALO. Si el documento está desactualizado, hay que decirlo.
     Si la observación estaba mal, hay que corregirla.
██████████████████████████████████████████████████████████████
```

### (3) ⛔ Y un fallo MÍO, cazado por mi propia contraprueba

Escribí la contraprueba de la leyenda con **`?fingir=ok`**… **que no existe**. `fingimientoDe`
devolvía `null`, la página servía **datos REALES de Avanza**, y aparecían autobuses marcados. El
test se puso rojo y **tenía razón**.

**Un fingimiento que no existe se ignora en silencio** — el mismo modo de fallo que ya costó tres
verdes falsos. Ahora existe `?fingir=solo-oficiales` (**el caso normal, 87 % de la flota, que no
se podía probar**) y la contraprueba **exige ver la banda roja del modo demo** antes de afirmar
nada.

---

## 13 · LA PANTALLA · LOS CUATRO NIVELES, EN ESCALA DE GRISES

`capturas/zetabus/GRIS-cuatro-niveles-360px.png`

```
Bus 4889   [Articulado · 18 m] [Híbrido]            ← oficial            sin marca
Bus 4114   ⌐Estándar¬ ⌐Eléctrico¬               *   ← fuente_secundaria  busesmadrid
Bus 4330   ⌐Articulado · 18 m¬ ⌐Eléctrico¬      †   ← observacion_propia Antonio
Bus 4610   ⌐Estándar¬ ⌐Diésel¬                  ?   ← sin_verificar      nadie
```

**Los cuatro se distinguen sin una gota de color**: borde continuo/discontinuo (forma) y tres
símbolos distintos. La leyenda al pie explica **solo los que hay** — y con `?fingir=solo-oficiales`
**no se pinta ninguna**, que es la contraprueba de que no es un adorno fijo.

⚠️ **Y el `?` (4610) ya NO enseña metros.** Era lo que había que arreglar.

### Verificación

```
typecheck ....... limpio
lint ............ limpio
build ........... ✓ Compiled · flota 403 vehículos
vitest .......... 234 passed | 1 skipped
playwright ...... 182 passed | 3 skipped
```

**Los 17 coches vistos en la calle: 17/17 con ficha.** Ninguno «SIN DATOS».
