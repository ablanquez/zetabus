# LECCIONES DE MÉTODO

Lecciones que **valen más allá de ZETABUS**. No son notas del proyecto: son cosas que
aprendimos pagándolas, y que volverán a aparecer en el 004 y en el siguiente.

Cada una lleva **el caso real que la produjo**, porque una lección sin su cicatriz se olvida.

---

## L1 · TODO EXTRACTOR NECESITA UN CONTADOR DE CONTROL INDEPENDIENTE

> **Un extractor que no sabe cuántas filas DEBERÍA haber sacado, miente con confianza.**

### El caso

Al parsear el Anexo 5 del pliego (el registro oficial de la flota, 21 páginas de PDF), el
extractor devolvió **349 vehículos**. Sin errores. Sin avisos. Sin excepciones.

Eran **350**.

El coche **4113** llevaba pegado un carácter invisible en el PDF — un *zero-width joiner*
(`U+200D`) — así que `"4113‍"` no casaba con el patrón `^\d{4}$`. El parser lo saltó **en
silencio** y siguió a lo suyo, tan tranquilo.

Se pilló porque, además de parsear los registros, **conté las matrículas por separado**
(`\d{4}-[A-Z]{3}` → 350) y las crucé contra los registros extraídos (349). El descuadre de
uno delató el fallo.

### La regla

**Todo extractor emite DOS números: lo que sacó, y lo que esperaba sacar. Y falla ruidosamente
si no coinciden.**

El contador de control tiene que ser **independiente del parser** — otra señal del mismo
documento, contada de otra manera. Si usas la misma expresión regular para contar y para
extraer, no has verificado nada: has repetido el mismo error dos veces.

Señales de control que suelen servir:
- Un campo con un formato distinto y estricto (aquí: la matrícula).
- Una fila de **TOTAL** dentro del propio documento. *(En el Anexo 1 del pliego, la columna de
  articulados sumaba 97 y la fila TOTAL decía 97. Eso convirtió una lectura plausible en la
  única lectura posible.)*
- El número de páginas × filas por página.
- Un recuento declarado en la cabecera o en el índice.

### Por qué duele tanto

**Este fallo no rompe nada.** No hay excepción, no hay log rojo, no hay test en rojo. El
fichero se genera, se despliega, y un día un usuario ve "SIN DATOS" en un autobús que existe
—o, peor, no lo ve porque le pusiste un valor por defecto— y nadie relaciona jamás las dos
cosas.

**Los fallos silenciosos son los caros. Los ruidosos son gratis.**

---

## L2 · EN CUANTO DEJAS DE DECLARAR Y EMPIEZAS A CONTAR, EL PROBLEMA DESAPARECE

> **Contar no necesita permiso. Declarar sí.**

### El caso

Queríamos decir en pantalla: *"esta línea lleva autobuses articulados"*.

Y no se podía. La cadena de problemas era ésta:

1. Ninguna fuente técnica (GTFS, API viva, web del operador) asigna vehículos a líneas.
2. La lista sí existe en el **pliego de prescripciones técnicas** del contrato… **pero de un
   contrato PENDIENTE DE ADJUDICAR**. El que está en vigor (2013) no asigna articulados a
   líneas, y el anejo que describiría el servicio **no es descargable**.
3. Y aunque lo fuera: la dotación **cambia con el tipo de día**. La línea 35 lleva 15
   articulados en laborable y **2 en domingo**. Una etiqueta estática **mentiría los domingos**.
4. Y cambia con la temporada (15 en invierno, 10 en verano 2).

Cuatro problemas. Uno de fuentes, uno jurídico, dos de modelado.

**Se sustituyó la declaración por un recuento:**

> ~~"Esta línea lleva articulados"~~
> **"De los 12 buses que hay AHORA en la línea 35, los 12 son articulados."**

**Y los cuatro problemas desaparecieron a la vez.**

| Problema | Declarando | **Contando** |
|---|---|---|
| Necesita una fuente en vigor | ⚠️ Sí, y no la hay | ✅ No la necesita |
| Miente en domingo | ⚠️ **Sí** | ✅ Nunca |
| Miente en verano | ⚠️ **Sí** | ✅ Nunca |
| Obliga a modelar temporadas y calendarios de dotación | ⚠️ Sí | ✅ **No hace falta nada** |
| Sobrevive a que adjudiquen el contrato | ⚠️ Depende | ✅ Siempre |
| Lo dice alguna otra app | — | ✅ **Ninguna** |

Y encima la frase que queda es **más fuerte**, no más débil. *"Los 12 son articulados"* es un
hecho comprobable ahora mismo. *"Esta línea lleva articulados"* es una generalidad que alguien
puede desmentir señalando un domingo.

### La regla

**Cuando una afirmación te obliga a citar una autoridad, pregúntate primero si puedes
simplemente CONTAR lo que hay.**

- **Declarar** es afirmar una regla. Necesita una fuente, la fuente necesita estar vigente, y
  la regla necesita cubrir todos los casos (festivos, temporadas, excepciones). Cada uno de
  esos requisitos es una forma de mentir.
- **Contar** es reportar una observación. Solo necesita que la observación sea buena y que
  digas cuándo la hiciste.

Corolarios:
- **Un recuento no envejece.** Una declaración sí, y lo hace en silencio.
- **Un recuento no necesita modelar las excepciones**, porque las excepciones ya están dentro
  de lo que cuentas.
- **La fuente normativa no desaparece: baja a pie de página.** Sigue aportando contexto
  ("el pliego prevé 15"), pero deja de sostener el peso.

### El límite, que también importa

**Contar solo funciona si lo que cuentas es completo, o si dices que no lo es.** Nuestra API
ve los buses que se acercan a las paradas, no todos los de la línea. Por eso la frase es
*"12 buses **detectados**"* y nunca *"los 12 buses de la línea"*.

**Cambiar declarar por contar no te libra de decir la verdad sobre tu recuento.**

---

## L3 · UN DATO HEREDADO SIN PROCEDENCIA NO SE CORRIGE: SE SUSTITUYE

> **Parchear arregla los errores que YA has encontrado. Y te deja con los que AÚN NO.**
> **Y conserva el pecado original: que nadie sabe de dónde salió.**

### Dos cicatrices, no una

**1 · Los tres JSON manuales del proyecto de referencia** (líneas, paradas, flota).

Se detectó un problema **real**: el portal del Ayuntamiento estaba podrido. Se hizo un
diagnóstico **correcto**: no fiarse de esa fuente. Y se sacó la conclusión **equivocada**:
*"lo oficial está mal"*.

**Porque nunca se abrió el fichero oficial correcto.** El GTFS del operador estaba ahí, se
publica cada pocos meses, viene validado y con geometría de calles. Meses de curación a mano
reprodujeron ese mismo fichero — y de propina, con **27 coordenadas rotas y 5 referencias
colgadas** que el original no tiene.

> **"Una fuente oficial está podrida" no es lo mismo que "lo oficial está podrido".**
> Entre las dos frases se perdieron meses.

**2 · La flota.** 62 longitudes mal de 316 (**20%**), y **las 62 en el mismo sentido**: decía
12 m donde la realidad eran 18. **Nunca inventaba un articulado. Sistemáticamente los
ocultaba.**

### ⭐ El matiz que es la lección de verdad

**El fichero de flota NO estaba mal hecho.**

Combustible: **cero** errores. Fabricante: **cero** errores. Quien lo escribió leyó bien su
catálogo y lo transcribió bien.

**Lo que pasa es que su fuente no contenía el dato.** El registro oficial lo demuestra:

```
VOLVO 7905  →  72 unidades de 12 m   Y   35 unidades de 18 m   ← MISMO NOMBRE DE MODELO
```

**La longitud no se puede deducir del modelo. Y él la dedujo del modelo.** No tenía otra cosa.

> ### UN FICHERO PUEDE ESTAR BIEN CONSTRUIDO Y AUN ASÍ MENTIR, PORQUE SU FUENTE NO SABÍA LO QUE TÚ NECESITABAS SABER.

Eso no se arregla revisando el fichero con más cuidado. **No hay cuidado que valga: el dato no
estaba ahí.** Se arregla **cambiando de fuente**.

### La regla

- **Un dato sin procedencia es SOSPECHOSO**, aunque parezca correcto y aunque acierte en casi
  todo. *(Este acertaba en casi todo.)*
- **Antes de corregirlo, pregúntate DE DÓNDE SALIÓ.** Si no se puede reconstruir el origen, no
  se parchea: se **REGENERA** desde una fuente con procedencia.
- **El fichero viejo NO se tira: se conserva como REFERENCIA PARA COTEJAR.** Fue exactamente
  así como supimos que 62 longitudes estaban mal — **comparando, no confiando**. Y fue así
  como descubrimos que el registro oficial tampoco es completo (le faltan 53 vehículos que el
  viejo sí tiene). *Ninguna de las dos fuentes bastaba sola.*
- **El nuevo NACE con su procedencia escrita DENTRO**: documento, anexo, fecha de aprobación,
  enlace. Y **por registro**, no solo por fichero: cada dato sabe de dónde vino y con cuánta
  confianza.

### ⭐ EL SESGO COMO SEÑAL

**62 errores y los 62 en la misma dirección NO es ruido.**

El ruido se reparte. Un error que apunta **siempre al mismo lado** es un **error sistemático**,
y un error sistemático **tiene una causa única, que se puede encontrar y explicar**.

> **Si los errores de un fichero apuntan todos al mismo lado, no los corrijas uno a uno:
> BUSCA LA CAUSA.**
> **La vas a encontrar, y va a estar en CÓMO SE GENERÓ el fichero, no en los datos.**

Aquí, la asimetría era el chivato: *nunca* inventaba un articulado, *siempre* lo ocultaba. Eso
señalaba directamente a un mecanismo que solo podía equivocarse en un sentido — deducir la
longitud de un nombre que solo nombra la variante corta. **La forma del error dibujaba la
causa.**

Y el corolario incómodo: **si hubiéramos parcheado los 62 uno a uno, habríamos arreglado los
62 y no habríamos aprendido nada.** Seguiríamos sin saber que el modelo no determina la
longitud, y el siguiente Volvo que entrase en la flota volvería a entrar mal.

---

## L4 · SI LA FUENTE NO PUEDE DISTINGUIR DOS ESTADOS, NO LA INTERROGUES MÁS FUERTE: CAMBIA LA PREGUNTA DE SITIO

> **La información que no está en la respuesta no se saca de la respuesta.**
> **Se saca de otro sitio, o no se saca.**

### El caso

La API viva de Avanza tiene que distinguir dos cosas que no significan lo mismo:

- un poste **real** por el que ahora no pasa ningún autobús
- un poste que **no existe**

Se midió, contra el servidor real, el 13/07/2026:

```
poste 264      VÁLIDO (desviado)   →   HTTP 200   {"tablatiempos":""}
poste 999999   NO EXISTE           →   HTTP 200   {"tablatiempos":""}
poste "abc"    BASURA              →   HTTP 200   {"tablatiempos":""}
```

**Los tres. El mismo byte.** No hay parser, ni heurística, ni cabecera que los separe: la información **no está en la respuesta**.

El proyecto anterior los confundía y le decía al usuario *"no hay llegadas"* cuando en realidad la petición era errónea. No era un bug del parser. Era un bug de **dónde estaba puesta la pregunta**.

### La regla

Cuando una fuente no puede responder a lo que necesitas:

1. **DILO.** No la interrogues con más ingenio. `NO ME DIGAS QUE SE PUEDE SI NO SE PUEDE.`
2. Y luego busca si la pregunta puede hacerse **en otro punto del flujo**.

Aquí sí podía: tenemos el GTFS con los 934 postes válidos.

```
poste ∉ GTFS  →  desconocido.  Y a Avanza NI SE LE PREGUNTA.
poste ∈ GTFS  →  se pregunta. Si viene vacío, "sin llegadas ahora"
                 YA SIGNIFICA ALGO, porque el poste existe de verdad.
```

La validación **subió aguas arriba**, a nuestros propios datos. De propina: cero peticiones desperdiciadas con entrada basura, que es lo mínimo que se le debe a un servicio ajeno del que estamos viviendo.

### ⚠️ Y LO QUE SIGUE SIN PODERSE, SE DICE

Un poste que está en el GTFS pero que el sistema de Avanza no conoce devuelve vacío igual que uno sin autobuses. Ese caso residual **no lo detecta ninguna fuente que tengamos**. No se inventa: se enseña *"sin llegadas previstas"*, que es cierto en los dos casos.

---

## L5 · UNA PROTECCIÓN Y LA FUNCIÓN QUE PROTEGE SE MIDEN JUNTAS, O NO SE MIDEN

> **Una protección mal calibrada no falla: mutila. Y lo hace en silencio, con cara de estar funcionando.**

### El caso

El techo de peticiones contra Avanza lleva un cubo de fichas. Le puse **capacidad 8**, y escribí al lado, con estas palabras:

> *"Ráfaga tolerada. **Un barrido de línea (17 postes)** no debe atascarse de golpe."*

Ocho fichas. Para diecisiete peticiones. **Mi propio comentario contradecía mi propio número, y lo escribí seguido, sin verlo.**

Y la cifra real era peor: la línea **N7 tiene 119 postes**, que con paso 4 son **31 peticiones**. Con un cubo de 8, el barrido de la línea más larga de Zaragoza **salía truncado a 8 postes de 31**. La protección se estaba comiendo la función principal del producto.

No lo vi leyendo el código. Lo vio un test que **contaba autobuses** y al que no le salieron las cuentas.

### La regla

Un número que limita (un techo, un timeout, un tamaño de cubo, un TTL) **no se valida solo**. Se valida **contra la magnitud real de lo que tiene que dejar pasar**.

Y esa relación no se deja en un comentario, que no se ejecuta:

```ts
it('el cubo da para el barrido MÁS LARGO de la red', () => {
  expect(CAPACIDAD).toBeGreaterThanOrEqual(peticionesDeLaLineaMasLarga);
});
```

Ahora los dos números viven en ficheros distintos **y están atados**. Si mañana crece una línea, esto se pone rojo **antes** de que alguien vea media línea vacía y se pregunte por qué.

### ⚠️ Y EL INTERCAMBIO SE DICE EN VOZ ALTA

Subir la capacidad de 8 a 40 **debilita la protección de ráfaga**: ahora una avalancha de menos de 40 peticiones ya no la corta el cubo. El techo **sostenido** (4 req/s, lo que le prometemos a Avanza) no ha cambiado ni un ápice, pero lo que se tolera de golpe, sí.

Eso no se tapa: se escribe donde vive el número, y se prueba dónde está de verdad el corte.

---

## L6 · SI COMPARAS DOS MEDIDAS TOMADAS EN INSTANTES DISTINTOS, ESTÁS MIDIENDO TU PROPIO RETRASO

> **El instrumento también se mueve.**

### El caso

Había que comprobar si el barrido con paso encuentra los mismos autobuses que el barrido completo. Lo obvio:

1. barrer los 67 postes de la línea 35
2. barrer 18 con paso 4
3. comparar

**No vale.** Entre los dos barridos pasan ~20 segundos, **y los autobuses se mueven**. Está medido: el poste 744 pasó de anunciar el coche `4262` a anunciar el `4275` entre dos capturas separadas por un minuto.

Si al comparar apareciera una diferencia, **no sabríamos si es porque el paso se dejó un autobús o porque ese autobús ya no circulaba.** El instrumento estaría midiendo su propio retraso y llamándolo cobertura. Y habría dado un número precioso.

### La regla

Se hace **UNA sola captura** y las dos medidas se calculan **sobre ella**. La respuesta de cada poste es independiente de las demás, así que el subconjunto `{0, 4, 8, ...}` es una **réplica exacta** de lo que habría devuelto un barrido con paso en ese preciso instante.

Cero deriva. Y cero peticiones de más, que en una fuente ajena también cuenta.

**Resultado real (línea 35, 13/07/2026, 17:01):**

```
paso   peticiones   encontrados   perdidos   cobertura
   1           67            11          0       100%
   4           18            11          0       100%   ← el nuestro
   5           15            10          1        91%   (falta 4312)
   6           12            10          1        91%   (falta 4312)
```

El 4 no es un número redondo elegido a ojo: es **el último paso que todavía cubre**. Y eso solo se puede afirmar porque las dos columnas salen del mismo instante.

---

## Cómo se usa este fichero

Se **añade**, no se reescribe. Una lección que resulte falsa se **tacha con su motivo**, no se
borra: saber que creímos algo y por qué dejamos de creerlo vale tanto como la lección.
