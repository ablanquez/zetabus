# Bloque F · La experiencia completa

> **REGISTRO HISTÓRICO FECHADO.** Este informe describe **el recorrido de un usuario por ZetaBus el 31 de
> julio de 2026**, sobre el commit y el build que se dicen abajo. No se actualiza: si el producto cambia,
> se escribe otro. Como los demás informes de `docs/auditoriafinal/`, se queda como está.

- **Qué es:** la auditoría de la EXPERIENCIA COMPLETA — el quinto de seis bloques (A ✅ · C ✅ · B ✅ ·
  E ✅ · **F** · D). No se audita leyendo código: se audita **usando el producto**. El instrumento es el
  juicio, no un grep.
- **Fecha:** 2026-07-31.
- **Commit auditado:** `1c9cf23` (`main`, ahead 50 sobre `origin/main`).
- **Contra qué build:** **el BUILD LOCAL, no producción.** Producción va 50 commits por detrás; lo que
  importa es lo que se va a desplegar. Se hizo `npm run build` (pipeline completo de despliegue: datos +
  `next build`) y `npm run start`. El recorrido principal, **sin `ZETABUS_DEMO`** (datos reales de Avanza
  en vivo). Los estados raros, con `?fingir=` y `ZETABUS_DEMO=1`.
- **Método:** navegador real conducido con Playwright; **cada pantalla capturada y mirada COMO IMAGEN**, no
  leyendo el DOM. Anchos **360** (el caso real: de pie, en la calle) y **1280**.

---

## 1 · Declaración de cobertura

| Recorrido | Hecho | Ancho | Datos |
|---|---|---|---|
| **F1** Primer contacto (home) | ✅ | 360 + 1280 | real, **contexto limpio** |
| **F2** "¿Cuándo pasa mi bus?" (buscador + parada) | ✅ | 360 + 1280 | real (Avanza vivo) |
| **F3** "¿Por dónde va la línea?" (línea, sentidos, desvío, N7) | ✅ | 360 + 1280 | real (¡la 35 estaba desviada hoy!) |
| **F4** Entrada directa sin home | ✅ | 360 | real, **contexto limpio** |
| **F5** Estados raros (sin-buses, caído, ilegible, error, 404) | ✅ | 360 | `?fingir=` + demo, y 404 real |
| **F6** La honestidad (sobre-los-datos, sin-verificar, edad) | ✅ | 360 + 1280 | mixto |
| **F7** El reclutador (estado, footer, repo) | ✅ | 1280 | real |

**F1 y F4 en contexto limpio, de verdad:** cada captura se hizo en un **proceso de navegador nuevo, sin
historial** — la home de los 5 segundos fue lo primero que se abrió en su proceso, y la entrada directa a
`/parada/744` y `/linea/35` se hizo sin haber pasado por la home. Cada `node` lanza un Chromium virgen: el
contexto limpio no es una promesa, es cómo está montado.

**Lo que NO pude hacer / hueco declarado:**
- **El "aviso de nombre sin confirmar"** (F6) **no me lo crucé** en ningún recorrido real: la parada que usé
  (744, Plaza San Miguel) tiene nombre confirmado. No lo describo de memoria; lo dejo como no observado.
- **Los datos en vivo eran favorables:** a la hora de auditar, Avanza daba buses en 744. No pude ver "parada
  sin buses" en real (lo vi con `?fingir=sin-buses`). Si a otra hora sale vacía en real, la lectura que
  importa —"¿parece rota o parece que no pasa ninguno?"— la responde el estado `sin-buses`, que sí vi.
- **Solo dos anchos** (360 y 1280). 390/768/1920 son del bloque B (marcado y responsive), no de éste.

---

## 2 · Los recorridos, contados

### F1 · Primer contacto — la home, 5 segundos, sin saber nada

Abro y veo: el logo **ZetaBus**, un buscador *"Busca tu parada o tu línea"* con el ejemplo *"744 · Plaza San
Miguel · 35 · Ci3"*, y debajo un muro de chips de línea de colores agrupados en DIURNAS / CIRCULARES /
LANZADERAS / BÚHOS. En 5 segundos entiendo que es **un visor de autobuses urbanos** y que puedo buscar una
parada o pulsar una línea. El buscador me dice qué escribir (número de poste, nombre, línea): buen arranque.

**Dónde me paré:** *¿de qué ciudad son estos autobuses?* Miré arriba y no lo encontré. **La palabra
"Zaragoza" no aparece en ningún sitio de la mitad superior** — ni en el logo, ni junto al buscador, ni en la
cabecera. Aparece por primera vez **en el pie**, al final del scroll ("Recorridos: GTFS de Avanza
Zaragoza…"). Los nombres de las líneas (Barrio Jesús, Las Fuentes, La Cartuja) son barrios de Zaragoza —
pero eso solo lo sabe quien ya es de allí. Un visitante frío, o un reclutador que llega por un enlace, no
tiene forma de confirmar la ciudad hasta que baja del todo. **Y el dominio tampoco la lleva.**

**Me sorprendió** el contraste: la pantalla de 404 **sí** dice "en la red de Zaragoza", y `/estado` **sí**
la nombra. La home, que es la puerta, es la única que se la calla arriba. → **Hallazgo F1.**

### F2 · "¿Cuándo pasa mi bus?" — el 90% del uso, en móvil

Escribo **744** en el buscador → aparece al instante una tarjeta *"744 · Plaza San Miguel · poste 744"*.
Escribo un nombre, **"San Miguel"** → me da tres postes (744, 745, 741). Escribo **"35"** → distingue
*"línea 35"* (con su chip de color) de los postes cuyo número contiene 35. Escribo basura, **"zzqzzq"** →
*"No encontramos nada con «zzqzzq»."* El buscador es, sin exagerar, **impecable**: vivo, busca poste +
nombre + línea a la vez, etiqueta cada tipo de resultado, y cierra el caso vacío.

Pulso la parada y llego a **744 · Plaza San Miguel**: un mapa con los buses en movimiento, un aviso *"1
autobús fuera del encuadre · el más lejano, a 3,1 km · **Encuadrarlo**"*, *"Datos de Avanza **hace 5 s**"*
con botón de refresco, el filtro de líneas, y las llegadas grandes: **39 VADORREY 3 min**, 39 8 min, 29 SAN
GREGORIO 10 min, 29 22 min. **Veo cuándo llega mi bus sin dudar.** Del inicio al dato: home → escribo →
pulso → parada. **Tres toques**, o cero si llego por la URL de la marquesina.

**Dónde dudé:** la ficha del vehículo — *"Bus 4265 · Estándar · 12 m · Eléctrico"*. Los minutos y el destino
se entienden solos; esto es información de más para quien solo quiere coger el bus (el número de coche, la
longitud, la propulsión). No molesta —va pequeña, debajo— pero el *"Bus 4265"* es el dato que menos le dice
a quien espera. No es un problema; es un adorno bien colocado.

### F3 · "¿Por dónde va la línea?"

Abro la **35** y — sorpresa afortunada — **hoy está desviada de verdad**, así que el caso raro me sale con
datos reales. Cabecera *"35 · Seminario → Parque Goya"*, un toggle claro **"Hacia Parque Goya / Hacia
Seminario"** (lo pulso y cambia: título y sentido se dan la vuelta), y el itinerario como lista ordenada de
paradas con su poste y las líneas que hacen correspondencia en cada una.

Pulso **"Mostrar más"** en el aviso de desvío y me llevo la mejor pantalla del recorrido:

> ⚠️ **Hoy el autobús NO pasa por estas 7 paradas.** Están en el recorrido oficial, pero el recorrido que
> Avanza publica para hoy no las incluye. **No lo decimos nosotros: lo dice su ruta.** […lista de 7 paradas
> tachadas…] ⚠️ **Puede haber otras paradas suprimidas que no detectamos. Si ves un cartel en el poste,
> hazle caso a él.**

Dice qué paradas se caen, por qué, de quién es la fuente, y —lo raro— **hasta dónde llega su propia
certeza**. Eso construye confianza de verdad.

**Dónde me paré:** la **N7 a 360**. Son 120 paradas, y la página es una lista vertical de **~10.000 px** sin
salto ni plegado. Es *usable* (puedo scrollear y buscar mi parada por el nombre), pero en el extremo es
interminable. Para las líneas normales (~30 paradas) va perfecto; la N7 es el caso límite. **Y no hay mapa
del recorrido** en la página de línea: para un local que reconoce los barrios de los extremos, la lista
basta; para un forastero, un "¿por dónde va?" sin mapa es más difícil.

### F4 · La entrada directa — llego por un enlace compartido

Entro directo a `/parada/744` sin pasar por la home (navegador virgen). **Sé dónde estoy**: la cabecera
grande dice *"744 · Plaza San Miguel"* y la pantalla se explica sola. Lo mismo con `/linea/35`.

**Dónde dudé:** *¿cómo vuelvo?* En la parada **no hay migas ni botón "Volver"** — el único camino a la home
es **pulsar el logo** (convención web, pero implícita). Me chocó porque **otras pantallas sí traen salida
explícita**: `/sobre-los-datos` tiene un *"← volver"*, y el 404 tiene *"Ver todas las líneas"*. Justo las
dos pantallas que son el destino de un enlace compartido —parada y línea— son las que se quedan solo con el
logo. Inconsistencia menor, pero es donde más se notaría.

### F5 · Los estados raros — ¿me quedo tirado?

La pregunta que manda: **¿se distingue "no hay nada" de "no lo sé"?** Y la respuesta, en palabras que le
llegan a cualquiera:

- **sin-buses:** *"Ahora mismo no viene ningún autobús. La parada existe y Avanza ha contestado: simplemente
  no anuncia ninguna llegada en este momento. **No es un error.**"* → hay nada, y lo dice.
- **caído:** *"Avanza no responde. No hemos podido preguntar. **Esto NO significa que no haya autobuses:
  significa que no lo sabemos.**"* → no se sabe, y marca el contraste literal.
- **ilegible:** *"No entendemos lo que ha contestado Avanza. […] Preferimos decir esto a enseñarte una lista
  incompleta con cara de estar completa."* → el tercer matiz del "no lo sé".

**La tesis del producto llega al usuario**, no se queda en el modelo de datos. Esto es lo mejor del bloque.

La **pantalla de error** (`?fingir=error`) no es un callejón: *"El fallo es nuestro, no tuyo, y no tiene
nada que ver con los autobuses: puede que estén llegando con toda normalidad"*, con **"Volver a intentarlo"**
y **"Ver todas las líneas"**. Tranquiliza sobre lo único que le importa a quien acaba de ver reventar la web
—los autobuses— y da dos salidas. (Trae una *"Referencia del fallo: 954248480"* sin sitio donde enviarla:
inofensiva, pero un poco huérfana.)

El **404** es el mismo para poste inexistente, línea inexistente y URL basura: *"Aquí no hay nada. Esa
parada, esa línea o esa dirección no existen en la red de Zaragoza. Puede que el número esté mal escrito…"*
con **"Ver todas las líneas"**. Entiendo que me equivoqué de URL y tengo salida. Bien.

### F6 · La honestidad — ¿se percibe o solo está?

En el flujo principal, la honestidad va **proporcionada**: la edad del dato (*"hace 5 s"*), el aviso del bus
fuera de encuadre, los avisos de desvío. No abruma; ayuda. En `sin-verificar` compruebo lo que la lección
del código ya contaba: las fichas de vehículo se muestran **sin ningún "✓ Dato oficial"** — no se inventa un
sello que dé confianza falsa.

`/sobre-los-datos` es la casa de la honestidad: **de dónde sale cada cosa**, una tabla de **403 vehículos**
con fuente y confianza por coche, y dos secciones que son la tesis entera — *"Los límites, dichos en voz
alta"* y *"Lo que NO detectamos"*. Para un lector técnico, **construye una confianza enorme**. Para un
usuario casual, **puede abrumar** (4.885 px de detalle) — pero es opt-in y trae su *"← volver"*, así que el
que no lo quiera no lo sufre. **¿Se pasa de frenada?** En el camino principal, no. Aquí, en su propia
página, el exceso de detalle es el punto, no el defecto.

**Dónde dudé:** *¿lo encontraría un usuario?* *"Sobre los datos"* está en el pie de todas las páginas y en
el 404 — descubrible si uno mira el pie. Un curioso o un técnico lo encuentra; un usuario con prisa, no lo
busca. Razonable.

### F7 · El reclutador

Alguien evaluando el trabajo llega a la home. **Le impresiona** lo pulido: el buscador, el mapa vivo, la
coherencia visual. Si da con `/estado`, se enamora — *"74 de 74 sentidos consultados… Todos respondieron,
sin lecturas dudosas"*, cobertura, vigencia de los datos: es un panel de transparencia de operación que casi
nadie se molesta en construir.

**Dónde me paré, crítico de verdad:** un técnico busca **el código**, y **no hay ni un enlace al
repositorio en toda la web** (ni a GitHub, ni al autor, ni al portfolio). Los únicos enlaces externos son
citas de fuentes de datos (MITRAMS, zaragoza.es, busesmadrid.es). Y **`/estado` no está enlazado desde
ninguna página** — la pantalla que más impresionaría a ese técnico solo se alcanza **escribiendo la URL a
mano**. Un reclutador que no conozca la ruta no la verá jamás. *(Puede ser deliberado: quizá el visor
público no quiere anunciarse como portfolio, y la atribución vive en `antonioblanquez.es`. Es decisión de
Antonio — pero, tal como está, la web no tiende ningún puente entre "tool" y "obra de alguien".)*

---

## 3 · La lista de sesgos — dónde usé lo que ya sabía

Precisión (c): llevo días dentro del proyecto. Estos son los momentos en que tiré de conocimiento previo, y
**cada uno acabó siendo un candidato a hallazgo**:

1. **Fui directo a `/parada/744` sabiendo que 744 = Plaza San Miguel** es un poste válido (lo he leído en el
   código y los tests). Un usuario nuevo llega por la marquesina o el buscador. *Mitigación:* verifiqué que
   el buscador funciona (F2), así que el atajo no ocultó ningún hueco.
2. **"Sabía" que el `<h1>` de la home dice "…de Zaragoza"** — pero está **visualmente oculto** (bloque B: en
   el árbol, sin ocupar sitio). Al recordarlo me obligué a juzgar por la **imagen**, no por el DOM: en la
   imagen, la ciudad no está arriba. → **se convirtió en el hallazgo F1.**
3. **Fui a `/estado` porque sé que existe.** Al pararme a comprobar cómo llegaría un usuario, descubrí que
   **ninguna página la enlaza.** → **hallazgo F7** que no habría visto si no llego a chequear el sesgo.
4. **Conocía el toggle de sentido y su parámetro** (`?sentido=1` es el sentido por defecto, no el
   contrario). Un usuario solo pulsa el toggle, que funciona. Sin hueco.

El patrón: **lo que me resultó "obvio" por estar dentro (dónde está `/estado`, qué dice el h1) es justo lo
que un usuario nuevo no sabe.** Los dos hallazgos más limpios del bloque nacieron de dudar de mi propia
familiaridad.

---

## 4 · Tabla de hallazgos

**Ningún 🔴.** Ningún recorrido principal se rompe, ningún estado deja tirado al usuario, y **nada engaña**
—que era lo más grave posible aquí—. Lo que hay es fricción y pulido.

| # | Cat | Dónde | Qué es | Por qué le importa al usuario | Grav | Coste | ¿Decisión? |
|---|---|---|---|---|---|---|---|
| 1 | F1 | Home, mitad superior | **La ciudad no aparece arriba.** "Zaragoza" solo está en el pie y en el `<h1>` oculto | Un visitante frío o un reclutador que llega por un enlace no puede confirmar de qué ciudad es hasta el final del scroll. El dominio tampoco lo dice | 🟠 | Bajo (una línea bajo el buscador, o en la cabecera) | No — es un arreglo claro |
| 2 | F7 | Toda la web | **No hay enlace al repositorio ni al autor** en ninguna página | Si un fin del producto es ser evaluado (portfolio), el técnico no tiene camino del sitio al código ni a quién lo hizo | 🟠 | Bajo (un enlace en el pie) | **Sí** — depende de si el visor quiere anunciarse como obra |
| 3 | F7 | Toda la web | **`/estado` no está enlazado desde ningún sitio** — solo por URL a mano | La mejor pantalla de transparencia (la que impresiona a un evaluador) es invisible para quien no conoce la ruta | 🟠 | Bajo (un enlace en el pie, o desde `/sobre-los-datos`) | **Sí** — puede ser una página de operación a propósito |
| 4 | F3 | `/linea/*` a 360, líneas largas | **La N7 (120 paradas) es un scroll de ~10.000 px** sin salto ni plegado | En el caso extremo, encontrar tu parada en la lista es agotador. Las líneas normales van bien | 🟠 | Medio (índice/salto por tramos, o plegar) | **Sí** — mostrar la ruta entera es honesto; plegar tiene su coste |
| 5 | F4 | `/parada/*`, `/linea/*` | **Sin "volver" ni migas; solo el logo** lleva a la home | Justo los destinos de un enlace compartido son los que no dan salida explícita, mientras 404 y `/sobre-los-datos` sí | 🔵 | Bajo (un "← volver" como el de sobre-los-datos) | No |
| 6 | F3 | `/linea/*`, cada parada | Los chips de correspondencia **no llevan rótulo** ("también aquí") | Un usuario nuevo puede no captar de un vistazo que esos chips son "otras líneas que paran aquí" | 🔵 | Bajo | **Sí** — mayormente intuitivo, quizá no merece tocarlo |
| 7 | F5 | Pantalla de error | **"Referencia del fallo: N"** sin sitio donde enviarla | Un número que el usuario no puede usar para nada; ni engaña ni molesta, pero cuelga | 🔵 | Bajo (quitarlo, u ocultarlo tras un detalle) | **Sí** — útil para soporte aunque no haya flujo |
| 8 | F2 | Ficha de vehículo | *"Bus 4265"* es el dato menos útil para quien espera | Ruido leve en una fila que por lo demás va al grano | 🔵 | Bajo | **Sí** — decisión de qué mostrar de la ficha |

---

## 5 · Lo que está bien, y por qué (para repetirlo)

En este bloque esto vale doble: es el patrón a llevarse a Turnia, Desplázame y al resto del portfolio.

1. **La distinción "no hay nada" ≠ "no lo sé" llega en palabras.** *"No es un error"* (vacío) frente a
   *"significa que no lo sabemos"* (desconocido). La tesis del producto no se queda en el tipo de dato:
   **aterriza en una frase que entiende cualquiera.** Es lo mejor de ZetaBus.
2. **El desvío se explica con la fuente y con el límite propio.** *"No lo decimos nosotros: lo dice su
   ruta"* + *"Puede haber otras que no detectamos; hazle caso al cartel."* Decir hasta dónde llega tu
   certeza es lo que convierte "honesto" en "de fiar".
3. **El buscador no tiene fricción.** Vivo, busca poste + nombre + línea a la vez, **etiqueta cada tipo**, y
   resuelve el caso vacío con la palabra buscada. La entrada al 90% del uso es de un solo campo.
4. **La edad del dato, a la vista y como HECHO** (*"hace 5 s"*), no como promesa (*"se actualiza cada 20
   s"*). Construye confianza sin pedirla.
5. **Cada error tranquiliza sobre lo que el usuario teme.** La pantalla rota dice *"no tiene nada que ver
   con los autobuses"*; el 404 ofrece salida. Nadie se queda mirando un muro.
6. **La transparencia existe en dos dosis:** proporcionada en el flujo, y profunda en `/sobre-los-datos`
   para quien la busque. El detalle no abruma el camino principal.
7. **Detalles que anticipan la confusión:** *"1 autobús fuera del encuadre · Encuadrarlo"* resuelve un
   "¿dónde está el otro bus?" antes de que se formule.

---

## 6 · Recomendación de orden

Todo es fricción o pulido; nada urge. Si se toca algo antes de dejar el proyecto en reposo, este orden:

1. **#1 (ciudad en la home)** — coste mínimo, y es lo primero que ve todo el mundo, incluidos los
   reclutadores. El mejor retorno por línea escrita.
2. **#3 (enlazar `/estado`) y #2 (enlazar repo/autor)** — juntos, si se decide que la web debe tender el
   puente a "obra de alguien". Un enlace cada uno en el pie. **Requiere tu decisión primero.**
3. **#5 ("volver" en parada/línea)** — pequeño, y cierra la inconsistencia con las demás pantallas.
4. **#4 (N7 interminable)** — el más caro y el de caso más raro; solo si se quiere pulir el extremo.
5. **#6, #7, #8** — pulido opcional; varios son decisión de producto que quizá se deja como está.

---

## 7 · Para el CHECKLIST MAESTRO (genérico)

Sin nombres de ZetaBus — la CLASE de cada cosa, para reutilizar:

**Orientación y contexto**
- ¿Un visitante frío entiende **qué es** el producto y **a qué ámbito/lugar aplica** en los primeros 5
  segundos, **sin hacer scroll**? (El sitio y el dominio, ¿lo dicen, o lo dan por sabido?)
- El texto que existe **solo en el árbol** (un `h1` oculto para SEO/accesibilidad), ¿coincide con lo que el
  **ojo** ve? Lo presente en el DOM no es lo percibido. *(Trampa de auditor: no juzgues por el DOM.)*

**Estados y vacíos**
- ¿La diferencia entre **"vacío"** y **"desconocido"** llega al usuario **en palabras**, no solo en el
  modelo de datos? Es la prueba de fuego de un producto honesto.
- Cada **estado de error**, ¿ofrece una **salida** y **tranquiliza sobre lo que el usuario teme** (no sobre
  lo que teme el ingeniero)?
- Un dato que se omite por incierto, ¿se muestra **sin sello de falsa autoridad** ("✓ oficial" sobre algo no
  verificado da peor confianza que no poner nada)?

**Navegación de aterrizaje**
- En una **entrada directa** (enlace compartido, resultado de buscador), ¿hay forma **explícita** de volver
  y orientarse, o solo la convención del logo? ¿Es **consistente** entre pantallas?

**Escala del contenido**
- Las listas que **crecen sin techo** (el caso extremo, no el medio), ¿siguen siendo usables, o piden salto,
  índice o plegado?

**Dosis de honestidad**
- ¿La transparencia va **proporcionada en el flujo** y **profunda en una página aparte**, sin abrumar el
  camino principal? Decir el **límite de la propia certeza** (*"esto no lo detectamos; haz caso al cartel"*)
  es lo que separa "honesto" de "de fiar".

**Atribución (si el fin incluye ser evaluado)**
- ¿El producto tiende un **puente a su origen** — repositorio, autor, portfolio — o se queda como una
  herramienta anónima? La página que más impresionaría a un evaluador, ¿es **alcanzable** sin conocer su
  URL?

**El sesgo del que audita**
- Cuando algo te resulte **obvio**, pregúntate si es por buen diseño o **porque tú ya lo sabías**. Anota
  cada uso de conocimiento previo: suele ser un hallazgo (dónde está una página sin enlazar, qué dice un
  texto invisible).
