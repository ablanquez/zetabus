# ZETABUS — Documento de estado del proyecto

> **Proyecto 003.** Visor en vivo de la red de autobuses urbanos de Zaragoza.
> Tercera pieza del portfolio, tras Linaje (001) y Turnia (002).
>
> Este documento es la **memoria del proyecto**. Se actualiza al cerrar cada tanda.

**Estado actual:** Tanda 7 (endurecimiento y pulido) — **casi cerrada**. **Pantalla ancha COMPLETA**
en las tres páginas: home (`82ab21a`), /parada (`c8fb5c9` … `310a2f1`) y /linea (`3f82fc4` …
`6742a73`).
# ⭐⭐ LA TANDA 7 ESTÁ CERRADA. VEREDICTO: SE PUEDE DESPLEGAR, SIN CONDICIONES.
**Parte A** (motor, `02db45d` · `d2aa753`) · **Parte B** (superficie, `5ba754b`) · **y sus dos
cabos** (`0276170` el `<h1>` de la home, `6d44eec` el fingimiento de horario).
· El único fallo real de 2.024 páginas —**la home sin `<h1>`**— **arreglado y con test**.
· El **verde en vacío del horario** —donde el informe dio verde y la pantalla dijo que no—
  **tapado, y con sus dos rojos vistos**.
**Y el MACROBLOQUE DE AUDITORÍA, cerrado** (`9855851` … `827ec2b`): código, perímetro y rendimiento
auditados, implementados y con guardián. **El README ya no dice que el proyecto no existe**, las
capturas de móvil llevan su marco, y el guardián de enlaces valida **contra lo publicado**, no
contra el disco.

> # ⬜ SOLO QUEDA LA TANDA 8: EL DESPLIEGUE.
**Última actualización:** 25/07/2026

---

## 1 · Identidad

**Nombre: ZetaBus**
- La **Z** de Zaragoza sin gritarla + el autobús.
- ⚠️ **Coste asumido:** mete "bus" y "Zaragoza" en la marca. **Pero el CÓDIGO no lo hereda** —
  hay un test que falla si aparece la palabra "bus" en `src/core/`.

**El color, y es la restricción más dura del proyecto:**
El color de las líneas **lo impone el operador**. **22 de las 44 caen en la franja
rojo/ámbar/amarillo/lima/verde.** La línea 31 es **literalmente el mismo rojo que "retraso"**.
→ **EL ESTADO NO PUEDE IR EN EL TONO.** Va en forma, borde, palabra o movimiento.
→ **Se verifica con una prueba de escala de grises:** se pinta la pantalla sin una gota de color
  y el estado tiene que seguir ahí.

⭐ **Y los búhos usan un canal distinto, no un color más:** fondo `#1C1A42` + el número **en el
color de la línea**. Invertido. *Un canal, una pregunta.* Contraste medido en las 7 (N4 pasa por
0,2 puntos).

### ⭐ EL LOGO — decidido el 22/07, pendiente de integrar

**El color: `#7048E8`** (violeta-índigo). **Medido, no elegido a ojo:** sale de barrer el gamut
contra los 44 colores de línea. **ΔE 12 al más cercano** — y ese ΔE 12 **es el techo**: no existe
ningún color a ΔE ≥ 25 de las 44. **Se separa por CROMA, no por tono.** ΔE 12,8 del azul de Avanza
(no debe parecer del operador). *(`docs/LOGO_ANALISIS_COLOR.md` §6.)* **No se toca.**

**El símbolo: V4** — Z trazada como recorrido, base prolongada, poste plantado encima con la
**señal en bandera** (panel a un lado del mástil, no un punto). Una sola forma: *la Z le da suelo
al poste*.
- ⚠️ **El punto encima del poste se lee «Zi»** — por eso bandera y no punto. Descarta V1, V2 y V3.
- **De familia (Linaje):** heredado el vocabulario de construcción (nodos y aristas de punta
  redonda, geométrico, tres tonos de un solo color). Propio: el color y el símbolo.

**Favicon — Opción A: UNA GEOMETRÍA, STROKE PARAMETRIZADO.**
Misma Z (topL 16, topR 38, bottom-L 16, ext 52), `stroke` como variable: **6 en la marca, 8 en el
favicon**. El favicon es un **recorte real** de la marca, no un SVG aparte.
⚠️ **La Z bespoke que existía (15/43/15/49, stroke 8) SE RETIRA.** Era **otro dibujo**, no la misma
Z engordada: barra superior 5 uds más ancha, prolongación 3 más corta, origen 1 a la izquierda.
**Dos Z que mantener sincronizadas a mano** — la ley de las 26 copias a mano.
→ **Guardián:** test que falla si aparece un segundo path de Z fuera de la fuente única. Tiene que
cazar un sitio **nuevo**, no una lista conocida (como el centinela de `<Cita>`). Contraprueba en rojo.

**Por qué V4 y no V5** *(V5 = prolongación larga de V3 + bandera; se dibujó a propósito para darle
salida a la preferencia de Antonio por la acera larga)*:
> **V5 gana en la pantalla donde el logo se MIRA; V4 gana en las pantallas donde el logo se USA**
> (pestaña, icono de app, avatar, cabecera compacta al lado de 44 chips).

Costes de V5, **todos medidos y todos menores** — se descartó pagando un precio conocido, no por
ser peor:

| | V4 | V5 |
|---|---|---|
| Altura de la Z en caja cuadrada | 206 px | 180 px (**−13 %**, no −20) |
| Hueco cuerpo-Z ↔ mástil (% del ancho) | 6,8 % | **14,6 %** |
| Favicon heredado (Opción A) | equilibrado (22/36) | **ladeado** (22/41) |

⚠️ Y el matiz sobre el hueco: en la tira ciega a 32 px **la bandera salva a V5** — pero *compensa*
la separación, no la elimina. **Margen más fino que el de V4**, y este proyecto ya sabe lo que le
pasa a los márgenes finos *(el sistema que iba "por los pelos", 5,6 < 6,9)*.

**El bitono en gris — con el número y con su honestidad:**
`#7048E8` → `#686868` · `#4E22B8` → `#474747`. **Entre sí: 1,68:1.**
⚠️ **El suelo de 1,5 lo puse a ojo en el prompt, no es una norma** *(hermano del "≤5 días" de las
estacionales)*. Y ojo: **1,68:1 es exactamente el ratio que hizo descartar el borde de color de la
info adicional** (la 29 amarilla). No es contradicción — allí era legibilidad de texto, aquí
profundidad — pero **hay que decirlo, no esconderlo**.
→ **Lo que de verdad sostiene la marca en monocromo** es que cada tono pega **4,5–9,4:1 contra
papel y fondo**. El bitono es **un matiz suave que sobrevive, no un contraste**.

**Contratrazos a 16 px:** hueco interior abierto al **42–49 %** del bbox con ambos grosores.
Ninguna Z se cierra en un cuadrado. **Es lo que permite la Opción A.**

**Sistema visual vivo:** `/interno/sistema-visual` (`noindex`, no enlazada). **LEE los tokens del
CSS con `getComputedStyle` y usa los componentes de producción** — no describe nada al lado. Si el
token cambia, la guía cambia sola. Contiene: 12 colores semánticos, **escala de superficies**,
**espaciado**, 7 peldaños tipográficos ordenados de mayor a menor, 44 chips de línea reales, 4
radios, 4 alturas de control (WCAG), procedencia, estados, marca, y **"Reglas y excepciones"** —
donde se declara que `global-error.tsx` usa hex crudos a propósito, porque se renderiza sin el
layout. **Un sistema que declara sus propias grietas es más fiable que uno que finge no tenerlas.**

---

## 2 · Qué es

**VISTA PARADA** *(el que espera en la marquesina)*
**Mapa arriba** con los buses en su GPS real → **filtros de línea** (sincronizados mapa↔lista) →
**llegadas ORDENADAS POR TIEMPO**, con la ficha del vehículo en chips.
**Y la edad real del dato.**

**VISTA LÍNEA** *(el que mira la red)*
**Itinerario vertical** con **la ruta REAL de hoy** (no la teórica), chips de transbordo
pulsables, paradas pulsables, nodos de cabecera/final, búhos invertidos.
**Las paradas que caen por un desvío, tachadas** y en un bloque de aviso aparte.
**Bloque de terminal:** la tabla pelada de primeras/últimas salidas de hoy (Hora · Desde · Hasta),
tal cual la publica Avanza.

### ⛔ Fuera de alcance — CON SU MOTIVO

| Fuera | Por qué |
|---|---|
| **El barrido de línea** (cuántos buses circulan) | ⚠️ **APARCADO** en `parked/barrido-de-linea/`. 67 peticiones, 17-66 s, y era la causa real de que Avanza dejara de responder. **No responde a ninguna pregunta de un usuario.** El 20% a coste infinito. *(Ver `docs/BARRIDO_APARCADO.md`)* |
| ⭐ **El MOTOR DE HORARIOS** (5 piezas) | ⚠️ **APARCADO 16/07.** Diseñado entero en `docs/MOTOR-HORARIOS.md`, **no implementado**. Sistema de 6 fases y 4 fuentes para la 4ª cosa de una vista. *"Una app cerrada bate a dos al 80%."* **Queda como v2 diseñada — señal de madurez en portfolio, no de debilidad.** |
| **Proyectar el bus sobre el trazado** | **No hay `trip_id`.** Pintaría el bus en el sentido contrario |
| **Medir el servicio** (frecuencias, puntualidad) | Exige histórico. **V1 ENSEÑA, NO MIDE** |
| **El trazado en la vista de línea** | ⚠️ Cabo abierto. *"Dibujar el trazado teórico con la línea desviada sería una mentira nueva. **No dibujar nada no engaña a nadie.**"* |
| **Tranvía / multimodal** | Es el **004** |

---

## 3 · Las fuentes, y qué miente cada una

⭐ **EL REPARTO CAMBIÓ DE RAÍZ EL 16/07.** El GTFS bajó de fuente única de horario a papel
secundario, y la **tabla web de Avanza** pasó a ser la autoridad de alcance.

| Capa | Fuente | Estado |
|---|---|---|
| **Topología + colores** | **GTFS del NAP** (fichero 1176) | ✅ ⚠️ **Miente cuando hay obras Y por calendario.** **Caduca el 05/10/2026** |
| ⭐ **Horario de hoy (alcance)** | **Tabla web de Avanza** `?selectLinea=X&selectSentido=Y` + `times-date` | ✅ **Day-true.** Primeras/últimas con **terminal por salida**. Server-rendered, raspable. ⚠️ Ventana corta (~hoy +2-3 sem), **no cubre búhos** |
| ⭐ **Avisos por línea** | **Prosa "Información adicional"** (mismo HTML) | ⬜ **PENDIENTE.** Lo mantienen a mano; **se cita, no se razona** |
| **Ruta REAL de hoy** | `get_stops_list` + KML | ✅ Conectado (Tanda 6). 2 peticiones/línea, cacheadas 30 min |
| **Nombres de parada** | **Avanza en el build** | ✅ ⚠️ **El GTFS los trae ROTOS** (`ucwords()`): el operador escribe distinto en el **79 %** (725 de 918). Los 16 que Avanza no da hoy **se marcan** "nombre sin confirmar" |
| **Tiempo real** | `gps.avanzabus.com` | ✅ Única puerta. **No existe GTFS-RT en Zaragoza** (probado). ⚠️ **Se cae sola** |
| **Alteraciones** | `get_alteraciones_servicio` **por línea** | ⚠️ **No el RSS** — pierde 3 de 6 vigentes |
| **Flota** | **Anexo 5 del pliego** + busesmadrid + observación | ✅ **403 vehículos en 4 niveles de procedencia** (350 oficiales · 14 fuente secundaria · 36 observados · 3 sin procedencia) |

**Puente de identidad:** `poste = int(stop_code[2:])`. **934/934**, verificado en cada build.

### ⭐ LA ASIMETRÍA QUE LO GOBIERNA TODO

> **DESVÍO DE RUTA** *(el bus no pasa)* → la ruta operativa **CAMBIA** → **DERIVABLE Y
> AUTO-APAGABLE.**
>
> **SUPRESIÓN DE PARADA** *(pasa y no para)* → la ruta operativa **NO cambia**. Ponen el cartel
> pero **no desconectan el poste**. **NO DETECTABLE POR NINGUNA FUENTE.**

**Verificado en la Tanda 6:** de 8 líneas afectadas por las obras, **21/22/35/38/40 salen
desviadas** (y se tachan solas). **29 y 39 no** — porque pasan y no paran. **La asimetría, viva.**

### ⚠️ Y EL GTFS MIENTE TAMBIÉN POR CALENDARIO (16/07)

**Probado:** el feed decía *"44 hoy: 0 trips"* mientras la 44 circulaba (verificado en el vivo y
sobre el terreno). Deja caer líneas enteras ciertos días. **Por eso el horario ya no se afirma
desde el GTFS.** La tabla web de Avanza sí sabe qué pasa hoy.

---

## 4 · ⭐ LECCIONES DE MÉTODO (van a la guía maestra)

**L1 · Todo extractor necesita un contador de control INDEPENDIENTE.**
El parser del Anexo 5 devolvió **349 de 350 en silencio**. *Si cuentas con la misma regex con la
que extraes, no has verificado nada.*

**L2 · En cuanto dejas de declarar y empiezas a contar, el problema desaparece.**
*Contar no necesita permiso. Declarar sí.* Pero: *cambiar declarar por contar no te libra de
decir la verdad sobre tu recuento.*

**L3 · Un dato heredado sin procedencia no se corrige: se sustituye.**
*"El coste real del parche no es que deje errores sin encontrar: **es que deja la causa viva**."*
Y el **sesgo es una señal**: 62 errores todos en la misma dirección **tienen una causa única**.

**L7 · Verificar una capa y afirmar sobre otra.**
*Leer el código no es usar la app. **Medirla tampoco. Hay que tocarla.***

⭐ **L9 · UN MÓDULO PROBADO Y DESCONECTADO DA MÁS CONFIANZA QUE UNO QUE NO EXISTE.**
> *"El que no existe **se nota**. El desconectado sale en **verde**, con su cobertura y su
> comentario explicando lo bien pensado que está. **Y la pantalla miente igual.**"*

⭐ **L10 · A veces el dato correcto no es el que más te esfuerzas en derivar, sino el que decides
NO AFIRMAR.**
El bloque de terminal terminó en la tabla pelada de Avanza. **La solución correcta ENCOGIÓ el
código tres veces seguidas** (−69, −168, −67 líneas).

⭐ **L11 · UN TEST PUEDE BLINDAR UN BUG.**
`pantalla-no-miente` exigía *"si el modo demo está encendido, el layout GRITA"*. **Ese test
protegía el fallo**: el que intentara quitar la banda se encontraba un rojo diciéndole que la
pusiera. *No es que fallara en detectar el problema — es que defendía el comportamiento
incorrecto.*

⭐ **L12 · UNA CLASE PRESTADA ARRASTRA SU ASPECTO.**
El bloque de suprimidas usaba `.es-rancio` (que significa *dato viejo*) **por su aspecto**. Una
parada caída del recorrido **no es un dato viejo**: es la ruta de HOY. Se heredó su trama de
regalo, y el rayado ilegible **nunca fue una decisión de diseño**.

⭐ **L13 · LOS AVISOS TAMBIÉN ENVEJECEN.**
Tres avisos puestos por prudencia acabaron **afirmando algo falso**: *"se actualiza cada 20 s"*
(no se sabía cuándo se miró), `.es-rancio` prestada, y la banda de demo. **La app se volvió más
honesta que sus propios avisos.**

⭐ **L14 · CONFUNDIR "LA PUERTA ESTÁ ABIERTA" CON "HA ENTRADO ALGUIEN".**
La banda de demo se ataba al flag `ZETABUS_DEMO`, que solo **desbloquea** `?fingir=`. Sin
`?fingir=` **nada es falso** (probado byte a byte). El aviso se enganchó **al sitio con la
información equivocada** (el layout solo ve el flag, no si esta página finge).

⭐ **L15 · CON DATOS VIVOS NO SE PUEDE VERIFICAR UN NÚMERO CONTRA OTRO.**
Al comprobar la distancia del bus, la app decía 11.287 m y el cálculo independiente 11.007. **No
era un error: los autobuses se mueven entre peticiones.** La verificación honesta es contra
geometría fija. *(Y por lo mismo: capturas antes/después con datos vivos comparan dos realidades
distintas presentándolas como el efecto del cambio.)*

⭐ **L16 · LA PRECISIÓN QUE MUESTRAS ES UNA AFIRMACIÓN SOBRE TU DATO.**
*"7,7 km", no "7.735 m" — la posición viene de un GPS que se refresca cada pocos segundos y el
autobús se mueve mientras lo lees. **El metro de resolución sería una mentira de precisión.**"*

⭐ **L17 · EL PUSH NO FALLÓ: SIMPLEMENTE NADIE LO HIZO.**
Seis commits pasaron horas sin subir. **No hubo error, ni aviso, ni rojo.** La ausencia de fallo
no es lo mismo que la presencia de la acción.

⭐ **L18 · AÑADIR UN CAMPO A UNA ESTRUCTURA CACHEADA ES UN CAMBIO DE CONTRATO SILENCIOSO.**
Al añadir `frecuencia` a `HorarioWeb`, las 19 entradas ya guardadas en disco se siguieron sirviendo
con la forma vieja: `undefined`, sin error, sin rojo. **La caché sirvió fielmente lo que guardó, y
la pantalla salió manca** — unas líneas con frecuencia y otras sin, en la misma sesión. Con TTL de
un día, miente todo el día.
→ **Remedio: versión de forma en la clave** (`horario-web:f2:…`). Subir el número deja huérfanas
las entradas viejas → miss → se vuelven a pedir.
→ Y el aviso escrito **junto al tipo**, no solo junto a la caché: es donde alguien añadirá el
siguiente campo dentro de tres meses.
⚠️ *Variante de L17: la ausencia de fallo no es la presencia del dato.*

⭐ **L19 · UNA ESPECIFICACIÓN PUEDE BLINDAR UN FALLO IGUAL QUE UN TEST.**
La spec del bloque de salidas se verificó contra el dato, **pero cuatro etiquetas se escribieron de
memoria**: apuntaban a un sentido vacío (Ci3 `-2`), a una línea sin excepciones (42 `-2`) y a una
tabla de 15 filas en vez de la de 43. Si el ejecutor se hubiera fiado de ellas, **habría verificado
los casos equivocados y la tanda habría cerrado en verde** sin probar ninguno de los tres que
estresan el modelo. Las cazó **recontando del dato**, no leyendo la spec.

⭐ **L20 · UN ELEMENTO INVISIBLE SIGUE OCUPANDO SITIO.**
El chip de la home estaba a 24 px del borde izquierdo y a 8 del superior. **La mitad de esos 24 los
gastaba `<AcuseDeToque>`**: un `<span>` sin tamaño, sin contenido y sin nada que ver — pero **dentro
de un flex es un ítem**, y se comía una ranura completa de `gap-3`.
⚠️ *Hermana del chip de poste a 1.00:1 y del `<sup>` con altura 0: el CSS decía una cosa y el píxel
otra. Aquí al revés — no se ve nada y sin embargo empuja.*

⭐ **L21 · EL DATO SE PUEDE CORROMPER DESDE FUERA DEL CÓDIGO.**
Todo el principio de *"la cita de Avanza se repite, no se razona"* lo deshace el usuario dándole a
**«traducir esta página»**: el navegador reescribe la cita en silencio. **Ningún test lo caza,
porque el ataque no pasa por el código** — pasa por el navegador, después del render.
⚠️ Ninguna regla del proyecto lo cubría: **todas miraban hacia dentro.** Lo destapó una regla
genérica de una skill ajena (`translate="no"`), auditando componentes donde el 66 % de sus criterios
eran mudos.
→ *Antes de fiarte de un instrumento, audítalo. Y antes de confiar en tus reglas, pregúntate contra
qué NO miran.*

⭐ **L22 · AUDITA LA HERRAMIENTA ANTES DE USARLA.**
La skill de diseño **descargaba sus criterios de un repo ajeno (`main`) en cada ejecución**. Nadie
había leído nunca esas reglas, y el informe habría sido irreproducible. Congelarla con su SHA valió
más que los cuatro hallazgos que produjo.
→ Y el cableado se versiona como **receta** (`scripts/setup-skill.mjs`), no como artefacto — igual
que con el GTFS.

⭐ **L23 · CORREGIR EL DATO PUEDE ROMPER LA BÚSQUEDA.**
Al arreglar `Carlos Quinto` → `Carlos V`, **la línea 53 dejó de encontrarse tecleando "quinto"** —
que es como la llama la gente. Escribir bien y encontrarse bien son **dos problemas distintos**, y
el primero puede empeorar el segundo.
→ **Se muestra la forma correcta, se encuentra por cualquier forma razonable.** Las dos pasadas van
encadenadas, no separadas en el tiempo.
⚠️ Y el remedio tiene su propia trampa: un sinónimo **global** `quinto→v` habría arrastrado media
red (*Juan Pablo II, Pedro III, Beethoven, V. Broto*…). **Alias por línea, no global.**

⭐ **L24 · ENVOLVER UN TEXTO PUEDE DEJAR CIEGO A UN GUARDIÁN.**
El detector de truncados solo miraba **hojas** del DOM. Al meter `<Cita>`/`<Toponimo>` en los
títulos, el texto dejó de ser hoja del contenedor (`<h1><span data-cita>Nombre</span></h1>`) — y
**un `truncate` en el `<h1>` ya no se veía.**
**Ocho sitios se quedaron sin vigilancia durante 24 horas** (nombres de parada, rumbo, itinerario,
buscador, home, llegadas, bloque de salidas, info adicional). *Un cambio que parecía inocuo —meter
un `<span>`— desactivó una ley entera en silencio.*
⚠️ Y el arreglo tuvo su propia finura: el `text-overflow: ellipsis` es **la firma de la ley** y se
juzga en cualquier elemento; el `overflow:hidden` a secas se sigue juzgando **solo en hojas**,
porque en un envoltorio casi siempre es recorte de layout (el mapa, un panel `rounded`). *Un
detector que grita ocho veces por nada es uno al que se deja de hacer caso.*
→ Se buscó si había **más guardianes ciegos**: era el único que barría por hojas.

⭐ **L25 · UN VEREDICTO PUEDE SALIR DE MIRAR… Y AUN ASÍ SER FALSO, POR MIRAR AL TAMAÑO EQUIVOCADO.**
La tabla del logo etiquetaba V1 *"borrón"* y V2 *"la más limpia"* **a 16 px**. Medido: a 16 px
difieren **un 6,6 % de sus píxeles** (~17 de 256) — son casi el mismo bitmap. El veredicto era real
**pero venía de mirar a 32 px** (donde el poste alto de V1 sí choca) y se etiquetó como si fuera de
16. **No es fabricación: es sobre-interpretación.**
→ *Un juicio heredado de otra resolución miente igual que uno inventado.*
⚠️ **Y el remedio que NO era:** el ejecutor propuso "medirlo bien, a 32 px". Pero **a 16 px no va
V1 ni V2 — va la Z sola**: la comparación no decide nada en ningún terreno vivo. **Se borra el
juicio, no se le sube la resolución.** *Medir mejor una comparación que no decide nada es trabajo
que parece rigor.*

⭐ **L26 · UNA PRUEBA PUEDE ESTAR BIEN HECHA Y CONTESTAR A OTRA PREGUNTA.**
La columna "16 · grises" del logo se aplicaba **por variante**, para juzgar cuál se ve mejor. Pero
el filtro de grises **cambia el relleno, no la cobertura**: la silueta es idéntica píxel a píxel a
la de papel, así que entre variantes reproducía las mismas diferencias que la columna de al lado.
**No era redundante por estar mal medida — era redundante por responder a una pregunta que nadie
había hecho.**
→ La prueba de grises del proyecto **nunca fue para juzgar siluetas**: es la regla de que la
información no puede vivir en el tono. Bien planteada es **una sola pregunta sobre la marca**
(*¿sobrevive el bitono sin color?*), no una columna por variante. **Y exige un número, no una
palabra.**
⚠️ *Antes de quitar una prueba redundante, pregúntate para qué se puso. A veces no sobra: está
mal apuntada.*

⭐ **L27 · UNA CONSOLA CON ARRASTRE ES UN INSTRUMENTO SUCIO.**
Afirmé que `npm run build` emitía 6 warnings de CSS **leyendo un pegado de PowerShell que
traía texto de sesiones anteriores** (cientos de líneas en blanco al final lo delataban). El
ejecutor reprodujo **cuatro escenarios con control positivo** (clase centinela inyectada en
`.next` que NO llega al CSS) y demostró que `next build` es **inmune**: el fallo era solo de
`next dev`.
→ *Verificar una capa y afirmar sobre otra (L7), pero con el instrumento más tonto de todos:
el portapapeles.*
⚠️ **Y la corrección se registró en el commit**, para que no viajara la versión equivocada.

⭐ **L28 · ATRIBUIR UN FALLO AL SISTEMA OPERATIVO CIERRA LA PREGUNTA SIN CONTESTARLA.**
El `next dev` que respondía **500** se venía explicando con *"cosas de Windows"*. Tenía causa
concreta y reproducible: **Tailwind v4 ingiere el payload RSC de `.next/server/app/*.html`**
en el pipeline de dev (no en el de build — **son dos pipelines distintos del mismo plugin**).
Cuando un corte de chunk parte una clase `[…]` por la mitad, genera una utilidad rota y tumba
la hoja entera.
→ *"Es Windows" es la versión moderna de NO CONSTA, pero disfrazada de respuesta.*
⚠️ **Lo que costó no fue el arreglo —dos líneas de CSS— sino dejar de tener una explicación
cómoda.**
**Y el arreglo, LISTA BLANCA y no exclusión:** `@import "tailwindcss" source(none)` +
`@source ".."`. *Lo no listado no existe*, frente a *lo listado que no debe estar*. **Impedir,
no vigilar** — la misma diferencia que la escalada de `<Cita>`.

⭐ **L29 · MEDIR EL PATH NO ES MEDIR EL TRAZO.**
Afirmé que el favicon arrastraba ~6 uds de aire muerto porque la Z acaba en `x=52`. **Falso:**
con `stroke 8` y `linecap round` el trazo se extiende **4 uds por extremo** → llega a `x=56`.
El favicon estaba **centrado (2/2/2/2)**.
→ *Es "medir el array y no el píxel" aplicado a un bounding box.* El path es el papel; el
trazo es la tinta.
⚠️ **Y el agravante:** el que sí iba descentrado era **la marca (3/1/3/3)**, no el favicon.
**Señalé la salida equivocada y acerté de casualidad a que había algo** — la categoría
*"pregunta por el tipo de cosa, no por la cosa"* del catálogo, cometida por mí.

⭐ **L30 · LA DEUDA QUE NO SE PUEDE ELIMINAR SIN ROMPER UNA LEY MAYOR: SE DECLARA Y SE VIGILA.**
`POSTE.yBase = 50` es una **copia a mano** de la base de la Z. Extraerla habría convertido el
`d=` en una plantilla — **peor de leer y más fácil de romper**. Se paga a sabiendas.
⚠️ **Y la etiqueta importa: NO CONSTA es para lo que NO SE SABE. Esto se sabe.** Es una
**deuda declarada**, con su motivo escrito y un test que se pone rojo si alguien mueve la base
*(el guardián reutiliza su propio `verticesDePath` — escribir otro parser habría sido una
copia a mano dentro del test que persigue copias a mano)*.
→ *Una copia a mano vigilada deja de ser un fallo latente y pasa a ser una decisión.*

⭐ **L31 · VERIFICAR LO QUE SE PIDIÓ MEDIR NO ES VERIFICAR LO QUE SE PIDIÓ ARREGLAR.**
Se pidió **centrar el logo**. El prompt acabó pidiendo comprobar que el logo **es enlace** y que
**mide ≥44 px** — dos cosas ciertas, medidas y verdes. **La petición original no se comprobó
nunca**, y el logo siguió pegado a la izquierda (desfase de −120 px a 360 y −276 px a 1280).
⚠️ **Volvió EN VERDE con el fallo intacto**, que es peor que volver sin verificar: *el verde
cerró la pregunta.*
→ Y la causa raíz está antes: **afirmé que quitar la coletilla centraría el logo, sin abrir la
página.** Una suposición del que dirige se convirtió en el criterio de aceptación del que ejecuta.

⭐ **L32 · ANTES DE QUITAR ALGO POR REDUNDANTE, COMPRUEBA QUE LO QUE QUEDA HACE LO MISMO.**
Mandé quitar la flecha de volver *"porque el logo ya enlaza a `/`"*. **La flecha NO iba a `/`:**
volvía a **la línea de la que venías** (`?desde=`). **No eran la misma función.**
→ Lo cazó el ejecutor **siguiendo la cola del parámetro hasta el final**, no ejecutando la orden.
→ Y destapó un agujero mayor: **no había NI UN enlace a `/linea` en toda la página de parada**.
De ahí salió la sección *"Líneas que pasan por aquí"*.
⚠️ *Quitar un atajo contextual alegando que existe una salida genérica es cambiar una función
por otra distinta y llamarlo limpieza.*

⭐ **L33 · UN GUARDIÁN DE HONESTIDAD PUEDE CONVERTIR UNA DECISIÓN REVISABLE EN UNA INVARIANTE.**
La ficha de parada llevaba un aviso — *"son los autobuses DETECTADOS, no todos…"* — puesto por
prudencia (sale de L2). Al quitarlo, apareció que **`pantalla-no-miente` EXIGÍA que esa frase
existiera**: quien intentara borrarla **se encontraba un rojo diciéndole que la pusiera**.
→ Es **L11 otra vez** (un test que *defiende* en vez de cazar), pero **en variante nueva**: aquí
no blindaba un bug, blindaba **una decisión de producto** que ya no se compartía.
→ **El aviso envejeció (L13) y el test lo mantuvo joven a la fuerza.**
⚠️ *Un guardián que exige un TEXTO concreto no es infraestructura: es la decisión de ayer con un
candado. Si el criterio cambia, el guardián se revisa CON él.*
⭐ **Y el matiz honesto:** el ejecutor **me desmintió lo técnico** — yo dije que la regla de los
dos afectaba solo al barrido, y es **un tope por poste**: el aviso era **cierto**. Se quitó igual,
por otro motivo: *para "¿cuándo pasa mi bus?" los dos primeros bastan.* **Era verdadero e inútil.**

⭐ **L34 · LA ACCESIBILIDAD PUEDE FIJAR UN SUELO FÍSICO AL DISEÑO — Y SE DECLARA.**
Al ajustar la cabecera se midió que **la banda no puede bajar de ~45 px**: los **44 px de zona
táctil** del logo (WCAG 2.5.5) son su **suelo real**. Se dejó en 53 (4 px de respiro) y **se dijo
en voz alta** en vez de bajar hasta que algo se rompiera.
→ *Es "declara el techo" del proyecto, pero al revés: un suelo.* Un límite que viene de una norma
externa **no es una decisión de diseño y no se negocia** — se mide, se declara, y el diseño se
acomoda alrededor.
⭐ **Y la solución buena fue una RELACIÓN, no dos números:** el símbolo va en `1.15em`, así que
**creció solo** al subir el texto. *Dos números sincronizados a mano divergen; una proporción no.*

⭐ **L35 · UNA OBLIGACIÓN LEGAL TAMBIÉN SE COPIA A MANO.**
La atribución del mapa decía `© OpenStreetMap`. La **ODbL** —y el propio `THIRD-PARTY-NOTICES.md`
del repo— exigen **`© colaboradores de OpenStreetMap`**. **Incumplimiento real**, pequeño y en el
sitio más visible, y **el documento que lo obligaba estaba en el repo desde el principio**.
→ Y el hermano: el pie decía *"GTFS del Powered by MITRAMS"* — castellano roto porque una
**fórmula obligatoria** se había incrustado dentro de una oración. ⚠️ **La fórmula manda y no se
toca; lo que se arregla es la frase que la envuelve.** *(Y yo supuse que "MITRAMS" venía del
`feed_info.txt`: era **redacción nuestra**, escrita a mano en `layout.tsx`.)*
⚠️ **Comprobar que una atribución existe no es comprobar que dice lo que la licencia obliga.**
Y si el texto legal está escrito a mano en más de un sitio, **divergirá** — como cualquier copia.

⭐⭐ **L36 · UN CAMBIO APLICADO QUE NO SE VE NO ESTÁ HECHO.**
El chip del poste se bajó a 16 px y su borde a `--color-tinta`. El informe del commit decía
**aplicado y verificado**; Antonio miró su pantalla y dijo que **no había cambiado nada**.
⚠️ **Yo defendí el informe en vez de mirar la captura que me estaba enseñando.**
Al medir con `getComputedStyle` sobre el elemento real: **el cambio SÍ estaba vivo** (chip 16,
nombre 20, borde en tinta). No era caché ni HMR. **Simplemente era invisible** — y a efectos
prácticos eso es lo mismo que no estar. Hubo que bajar a **13 px y borde negro de 2 px** para que
se viera.
→ *El que decide si un cambio está hecho es el que MIRA LA PANTALLA, no el que lee el commit.*
⚠️ Y el corolario para mí: **cuando el informe y el ojo del usuario discrepan, gana el ojo.**
Defender el informe es defender el instrumento contra el resultado.

⭐ **L37 · MI PROPIA AUDITORÍA PUEDE DAR UN FALSO POSITIVO — Y SE CAZA AL IR A ARREGLARLO.**
La auditoría de accesibilidad reportó *"el buscador de la home no tiene nombre accesible"*. Al ir
a ponérselo, apareció que **ya lo tenía**: `<label htmlFor="q">` ↔ `<input id="q">`, verificable
con `getByRole('searchbox', { name: … })`.
→ **El fallo estaba en el instrumento de la auditoría**, que no comprobaba la asociación
`<label for>`. **No en el código.**
⚠️ Y lo que lo hace lección: **meter un `aria-label` redundante sobre una etiqueta que ya
funciona habría sido una ñapa disfrazada de arreglo** — y habría quedado en verde para siempre,
tapando que el instrumento medía mal.
*Un hallazgo de auditoría no es un hecho hasta que se confirma al tocarlo.*

⭐ **L38 · «PULSABLE» SON TRES COSAS DISTINTAS, Y SOLO UNA SE VE.**
La auditoría de zonas pulsables separó lo que parecía un problema en tres:
1. **El cursor** (cosmético): los `<button>` no traen la mano de fábrica; los `<a>` y `<summary>`
   sí. Aquí `cursor:pointer` **es el arreglo bueno**, no una tapadera — el elemento ya era correcto.
2. ⚠️ **El marcador de bus MENTÍA sobre ser operable:** se llegaba con Tab, tenía `role="button"`
   y **Enter/Espacio no hacían nada**. Un foco que parece un botón y no responde.
3. ⭐ **Las filas de llegada no PARECÍAN pulsables:** `<button>` de fila completa que se veían
   como ítems de lista. *Ese fue el hallazgo real, y no lo arregla ningún cursor.*
→ *El titular tranquilizador —**cero `div`/`span` con `onClick` propio**— convivía con dos
problemas de fondo que el síntoma visible tapaba.*

⭐⭐ **L39 · UN INSTRUMENTO FABRICA UN ROJO IGUAL QUE UN VERDE.**
En una sola sesión (24/07) aparecieron **las dos direcciones**:
- **Verde fabricado:** se citó como prueba una captura, `P3-info-escritorio.png`, que **NUNCA
  EXISTIÓ** — se le puso nombre a un fichero y se afirmó lo que enseñaba. *En palabras del propio
  ejecutor: «el instrumento no mintió por encuadre: no había instrumento».* Y el otro "check"
  (`getByRole('heading') === 1`) era **ciego a la colocación y al color**: da 1 esté la caja
  donde esté. **Un proxy que no puede ver lo que el usuario ve.**
- **Rojo fabricado:** `locator.click()` de Playwright hace *scroll-into-view* del objetivo antes
  de pulsarlo. Al pulsar el primer enlace del recorrido —fuera de vista con el `<ol>` bajado— **
  Playwright subía el `<ol>` a 0**, la app guardaba fielmente ese 0, y el test "demostraba" un bug
  que el usuario no tiene. Se aisló midiendo en `pointerdown`, `mousedown` y `focusin`: **el salto
  ocurría ANTES del clic.**
→ ⭐ **Y el matiz que lo hace ley: EL INSTRUMENTO MOVIÓ LO QUE IBA A MEDIR.** Preguntar a la cosa
  *después de haberla desplazado* da una respuesta correcta a una situación que no ocurre.
  *Hermana de «preguntar a la cosa equivocada» y de la consola con arrastre (L27).*

⭐ **L40 · PROBÉ EL CAMINO QUE FUNCIONABA, NO EL QUE EL FEATURE EXISTE PARA RESOLVER.**
La restauración de scroll se dio por verde **probando la RECARGA de página** —que sí restaura—
cuando el caso real del feature es **«entrar en una parada → volver con Atrás»**.
→ *Un test que ejercita el camino cómodo da verde sobre la funcionalidad rota.*
⚠️ Y la ironía que cierra el círculo: esa duda fue la que llevó a mirar, y al mirar **no había
bug** — lo fabricaba el instrumento (L39). *La sospecha correcta por el motivo equivocado.*

⭐ **L41 · CUANDO EL INFORME Y EL OJO DEL USUARIO DISCREPAN, GANA EL OJO — Y YO LO OLVIDÉ DOS
VECES EN UN DÍA.**
Con el chip del poste (L36) defendí el informe en vez de mirar la captura. Con la
«Información adicional» volví a hacerlo. En los dos casos el desenlace fue distinto —uno era
invisible, el otro estaba bien y era el navegador— pero **el error de método fue el mismo: usar
el commit como prueba de lo que se ve.**
→ *El commit prueba que el código cambió. No prueba que la pantalla lo enseñe.*

⭐ **L42 · UNA AFIRMACIÓN DUPLICADA CADUCA EN SILENCIO.**
La guía de estilo lee **componentes de producción** para los visuales —así que las fotos **no
caducan**— pero la prosa de las `nota=` está **escrita a mano** y sí caduca. La nota de "Marca"
decía que **el hueco del logo "está reservado (Fase 5)"** cuando el logo llevaba días construido
y era lo que `<Marca>` renderizaba. **La foto era correcta; las palabras mentían.** Y esa página
va a ser pública.
→ ⭐ **No es código duplicado: es una AFIRMACIÓN duplicada.** El componente dice una cosa y el
  texto que lo describe dice otra.
⚠️ *La prosa no caduca sola: caduca en silencio.* De 10 notas revisadas, 1 mentía.

⭐ **L43 · UNA FUENTE ÚNICA SIN GUARDIÁN DE SU SALIDA NO ESTÁ TERMINADA.**
`NOMBRE_MARCA` centralizó el nombre del proyecto y el wordmark y los títulos leen de ahí.
**Ningún test comprobaba que el nombre se pintara** — por eso centralizarlo **no rompió nada**,
que se leyó como buena señal y era el hueco.
→ *Una fuente única garantiza que no haya dos verdades. **No garantiza que la verdad llegue a la
  pantalla.*** Hace falta un guardián de la salida, y que **mida la pantalla, no la constante**.

⭐⭐ **L44 · SEIS TESTS CON EL MISMO ORDEN FIJO SON UN SOLO TEST.**
La fusión del índice de correspondencias tenía **6 tests** y todos le daban **un orden fijo**;
ninguno fundía en dos órdenes distintos. **La fusión entera desordenada daba VERDE.**
⚠️ Y el riesgo era real, no teórico: es un artefacto que **se regenera cada noche**. Podría
haberse vuelto **no-determinista y ningún test lo habría visto**.
→ *No lo destapó un fallo: lo destapó pedir **coherencia global** en vez de casos sueltos.*
⚠️ **«No debería depender del orden» no es una demostración.** Se ejecuta en órdenes distintos y
se compara la huella. Ahora lo caza un test de huella en dos órdenes.

⭐ **L45 · UN BARRIDO MASIVO SE ENSUCIA A SÍ MISMO, Y EL RUIDO ENTIERRA EL HALLAZGO.**
(Cierre Tanda 7 · Parte B · Capa 1: 1.012 páginas × 2 anchos = **2.024 cargas**).
La primera corrida cantó **1.640 hallazgos en 508 cargas**; la definitiva, **108 en 2.024**. De
esos 108, **106 eran del instrumento** y 2 eran el MISMO fallo visto a dos anchos. Las tres
mentiras, todas autoinfligidas:
· **1.583 "errores de consola" eran MÍOS.** Yo abortaba las teselas de OpenStreetMap (para no
  machacar a un tercero) → `net::ERR_FAILED`; y mi propia navegación a la siguiente URL cancelaba
  los prefetch de Next (`_next/static/chunks`, `?_rsc=`) → `ERR_ABORTED`. Contaba como defecto de
  la página lo que causaba mi barrido.
· **Los desbordes fantasma** (`rect`/`path` a x≈450 en 84 paradas, luego 53, solo a 360). Fui a
  mirarlos en secuencial: **0 de 53**. No existían. Con 6 workers el servidor va cargado, `load`
  dispara ANTES de que Leaflet coloque su panel de marcadores, y el detector fotografiaba **el mapa
  a medio montar**. Medía bien un estado que el usuario no llega a ver. (Y remedir a 250 ms no bastó:
  bajo carga, Leaflet tarda más. Lo que zanjó la duda fue la corrida SIN contención, no otro remedio.)
· **Y las "páginas lentas": 13-14 s** en el barrido… **217-240 ms** en secuencial. No eran páginas
  lentas: eran seis workers peleándose por un solo servidor. *Un percentil medido bajo la carga que
  crea el propio instrumento no mide la app, mide el instrumento.*
→ ⚠️ **Qué dio VERDE mientras estaba roto: la home NO TIENE NINGÚN `<h1>`.** Ese es el ÚNICO
hallazgo real de las 2.024 cargas, y en la primera corrida estaba **enterrado bajo 1.639 falsos
positivos** — con ese ruido yo habría cerrado el barrido diciendo "hay mucho que mirar" y no habría
visto el único que importaba. Llevaba ahí toda la semana: ninguno de los ~30 spec de e2e lo
comprobaba, porque todos miran páginas CONCRETAS y ninguno pregunta *"¿toda página tiene exactamente
un h1?"*. **Un barrido total encuentra lo que ninguna prueba elegida puede encontrar** — pero solo
si primero se limpia a sí mismo.
→ *Un barrido masivo hay que barrerlo primero A ÉL. Y el criterio que lo hace utilizable no es
"cuántos hallazgos" sino **agrupar por causa**: 200 páginas con el mismo síntoma son UN hallazgo,
y en cuanto se agrupan, un 106-contra-1 se ve de un vistazo.*

⭐ **L46 · UN DETECTOR MAL APUNTADO ACUSA A LA APP DE SU PROPIO DEFECTO.** (Parte B · Capa 2).
El test del corte de 880 cantó *"una columna a 881"* en /parada Y en /linea, y estuvo a punto de
entrar en la lista de fallos como una **regresión del layout**. Fui a mirarlo: `div.rejilla-linea`
estaba en `grid` con `cols=752px 380px` en **todas** las líneas, a 881, a 1280 y a 1920. Las dos
columnas llevaban ahí todo el tiempo. Mi detector miraba los hijos de `<main>` y les exigía **más
de 100 px de alto**: en /parada colaba (su columna derecha es UN bloque alto), pero en /linea la
derecha son varios bloques bajos y ninguno llegaba al umbral.
→ ⚠️ **Qué dio VERDE mientras estaba roto: el propio detector.** Pasaba en /parada —que es donde yo
lo probé primero— y por eso me lo creí al aplicarlo a /linea. *Un detector geométrico hay que
calibrarlo en un caso donde SE SABE la respuesta, y en los DOS sentidos: si solo se prueba donde
dice «sí», no se ha probado que sepa decir «no» por el motivo correcto.* El umbral que funcionaba
en una página era una **suposición** en la otra — como el `indice-margen-chip` que daba por hechas
≤2 columnas (nº 28).

⭐⭐ **L47 · UNA ASERCIÓN DE TOPE SE SATISFACE CON LA NADA.**
El test de *"una sola copia de Información adicional"* usaba `toBeLessThanOrEqual(1)` y **contaba
CERO**. Pasaba. Verde durante toda su vida sobre una caja **que no se pintaba nunca**.
> *"Si hubiera sido `toBe(1)`, habría estado roja desde el primer día."*
→ ⭐ **Un test que comprueba «como mucho uno» da VERDE cuando no hay NINGUNO.** Y es transferible
  fuera de este proyecto: cualquier aserción de tope (`≤`, `<`, `not.toBeGreaterThan`) **se cumple
  con el vacío**. Cuando lo que se quiere es *"exactamente uno"*, se escribe **exactamente uno**.
⚠️ **Y no era de esa tanda:** ninguna prueba automática había ejercitado nunca esa parte de la
pantalla — **que es justo donde el informe dio verde y la pantalla de Antonio dijo que no** (L36).

⭐ **L48 · UN CUERPO «NEUTRO» PARA UNA FUENTE ES UN CUERPO ILEGIBLE PARA OTRA.**
El modo de fingir daba a la petición del horario **un cuerpo de poste**, y estaba escrito a
propósito: *"a lo demás —el horario, etc.— un cuerpo neutro que no finge autobuses de más"*.
Era **neutro para los autobuses y basura para el horario**. La cadena, en silencio y sin un solo
error: `parsearHorarioWeb` lanza `HorarioIlegible` → la caché lo vuelve `{tipo:'fallo'}` →
`horarioDeLinea` devuelve `null` → **las dos cajas no se pintan**.
→ *Ni descuido ni negativa: **una decisión correcta para un fin, con un efecto colateral en otro
  que nadie comprobó.***
⚠️ **Cuando un mismo mecanismo sirve a dos consumidores, «neutro» hay que definirlo para los DOS.**

⭐⭐ **L49 · ANTES DE MANDAR BORRAR, COMPRUEBA QUE LO QUE VAS A BORRAR SIGUE SIENDO LO QUE CREES.**
Le mandé a Claude Code *"retira las ediciones que tienes sin commitear en `ZETABUS-ESTADO.md`"*,
dando por hecho que sus bloques seguían sueltos. **No lo estaban:** el fichero en disco era **la
versión regenerada desde la conversación de estrategia**, con sus lecciones **ya integradas,
reescritas con otra redacción y renumeradas** — y con **1.186 líneas** que no eran suyas.
→ ⚠️ **Un `git checkout` de ese fichero —la lectura literal de mi orden— habría borrado el estado
  entero del proyecto.**
→ Lo cazó **mirando antes de borrar**, y el detalle que lo probó: **L44 ya no decía lo que él
  había escrito**, y las filas #31, #34 y #35 **él nunca las escribió**.
⚠️ Es **L32 otra vez** (*antes de quitar algo por redundante, comprueba que lo que queda hace lo
mismo*) — pero peor: **aquí ni siquiera era redundante. Era otra cosa con el mismo nombre.**

⭐⭐ **L50 · LA LISTA DICE DÓNDE MIRAR. NO SUSTITUYE A MIRAR.**
Cinco documentos de `docs/` llevaban semanas rancios, y **todos compartían una sola causa: no
estaban en ninguna lista.**
> *"El README se pudrió 91 commits porque nadie lo miraba; estos 21 documentos se pudrieron porque
> **nadie los había elegido**. **Listarlos es elegirlos**."*
⚠️ **Y la otra mitad, que el propio ejecutor añadió con tres pruebas suyas:** entrar en la lista
**no basta si quien revisa mira el INFORME en vez del FICHERO.** Sus tres errores de la racha
fueron eso: leyó la auditoría 12 en vez del fichero, leyó una ruta sin su frase, y **dedujo que
`parked/` estaba ignorado desde el `.gitignore` en vez de preguntárselo a `git ls-files`**.

⭐⭐ **L51 · UNA CONTRAPRUEBA DEMUESTRA QUE EL INSTRUMENTO FUNCIONA DONDE LE PLANTAS EL FALLO — NO
QUE AHÍ ESTÉN LOS FALLOS.**
El guardián de enlaces **cazó los dos rotos que se le plantaron** el 24/07… y **no cazó ninguno de
los 12 rotos que había de verdad**, porque los plantados estaban en el índice y **los reales vivían
dentro de los documentos**. Su alcance era `docs/README.md`.
→ *"El verde era real y no significaba nada."*
⚠️ **Es la dimensión que nadie comprueba de un guardián: DÓNDE MIRA.** Funcionar y cubrir no son
lo mismo.

⭐⭐ **L52 · EXIGE QUE EL INSTRUMENTO DEMUESTRE QUE TENÍA MATERIAL QUE MIRAR.**
Al extender el guardián a los 39 documentos, se le puso un *sanity* delante: si `git ls-files`
devolviera vacío, **el test pasaría en verde habiendo revisado CERO ficheros**.
> ⭐ *"Es el mismo mecanismo exacto que el contador de `/api/diag` diciendo `peticiones: 0`:
> **el valor tranquilizador y el valor de «no he medido nada» son el mismo valor**."*
→ Y el dato que da la medida: **el subproceso de `git` cuesta tres veces más que el trabajo real
del guardián.** *La comprobación es barata; **enterarse de qué hay que comprobar es lo caro** — y
es justo el paso que el guardián anterior se saltaba dando la lista por supuesta.*

⭐⭐ **L53 · UNA LISTA BLANCA NO FALLA: OBEDECE.**
`ZETABUS-ESTADO.md` estaba en el repositorio **desde el segundo commit**, metido **a propósito**
con una excepción explícita en el `.gitignore` y su porqué escrito. En **190 de 191 commits**.
⚠️ Y eso **desmiente el argumento que la propia lista blanca lleva dentro**: dice que existe porque
*"una lista negra falla en silencio"*.
> ⭐ *"Una lista blanca protege de lo que **nadie previó**; **no protege de una decisión previa que
> dejó de ser buena**. Cuando la excepción está escrita a mano y razonada, la ejecuta con la misma
> obediencia que una lista negra ante un fichero olvidado."*
→ **La pregunta que hay que hacerle a una lista blanca no es «¿falta algo?», sino «¿alguna de
  estas excepciones ya no vale?».** *Mismo patrón que el README: nadie lo rompió, dejó de ser cierto.*

⭐⭐ **L54 · UNA RESPUESTA VACÍA LEÍDA COMO UN HECHO.**
`AUDITORIA_Q1` concluyó *"no existe un horario de día completo raspable en la web de Avanza"*.
**La causa: se pidió `?linea=34` cuando el parámetro real es `?selectLinea=44&selectSentido=-1`.**
La página contestó **sin tabla —porque la pregunta no tenía sentido para ella—** y de esa ausencia
se dedujo un hecho sobre el mundo.
> ⭐ **La fuente no mintió ni una vez.**
⚠️ *"Cuando una fuente devuelve nada, lo primero que hay que dudar es de la PETICIÓN. **«No hay
dato» y «no supe pedirlo» se ven exactamente igual desde este lado**."*
→ Y lo caro no fue el error —se corrigió en horas— sino que **el documento equivocado siguió
publicado OCHO DÍAS**, contradiciendo a la app en producción, con 1.279 pruebas en verde.

⭐ **L55 · ARREGLAR EL CÓDIGO PUEDE DEJAR MINTIENDO A UN DOCUMENTO QUE ERA CORRECTO.**
`AUDITORIA_SISTEMA_VISUAL` defendía —con razón en su momento— que la fórmula WCAG estaba separada
**a propósito**. Al unificarla (`6aa5ae9`), **el documento pasó a defender lo contrario de lo que
hace el código**, y las líneas que citaba dejaron de existir.
→ *"**El cambio de código no tiene forma de saber qué prosa lo describía.**"*
⚠️ Y su hermano: `MOTOR-HORARIOS` **se contradice dentro del mismo recuadro** —dice que la v1 cerró
con la tabla de la web y **tres líneas después** que no hay recogida de horario web—. *Una
contradicción a tres líneas de distancia no la ve nadie que no esté buscándola.*

⭐ **L56 · UN FALSO POSITIVO CON CORROBORACIÓN APARENTE ES PEOR QUE UNO SUELTO.**
El detector de "ficheros que existieron y hoy no están" comparaba **altas** (`--diff-filter=A`)
contra `git ls-files`. ⚠️ **Un `git mv` no es un alta ni una baja: es una `R`.**
→ Un fichero movido **salía como borrado por un lado y como inexistente por el otro**, y *"las dos
mitades del instrumento se confirmaban mutuamente"*.
⚠️ **Eso es lo que hace bajar la guardia**: dos señales coincidiendo parecen una verificación
cruzada. Se arregla con `--name-status -M`, que sí distingue una `R`.
*(Gracias a esto se descubrió que **el quinto documento rancio NO lo era** — y el ejecutor se paró
antes de plantar una rectificación falsa sobre un documento correcto.)*

⭐⭐ **L57 · UN GUARDIÁN NO SE DEFINE POR LO QUE COMPRUEBA, SINO POR EL CONJUNTO CONTRA EL QUE LO
COMPRUEBA — Y ESE CONJUNTO CASI NUNCA SE ESCRIBE.**
El comprobador de enlaces usaba `existsSync`: contesta **"¿está en esta máquina?"** cuando la
pregunta era **"¿está en el repositorio?"**. El código estaba bien —recorría, resolvía rutas
relativas, ignoraba externos— y **respondía a la pregunta equivocada**.
⚠️ **Y ahí está el veneno:** en la máquina donde se desarrolla, las dos preguntas **coinciden casi
siempre**. *"El instrumento acierta durante todo el desarrollo y falla exactamente en el momento en
que ya no puedes verlo: **en el clon de otro**."*
> ⭐ *"Cuando un guardián valida algo que **se publica**, su universo tiene que ser **lo publicado**.
> **El disco local es el sitio donde todas las respuestas salen bien.**"*
⚠️ Y la vuelta que lo remata: **el fallo sobrevivió a su propia vigilancia porque el vigilante
compartía el sesgo del vigilado — los dos vivían en la máquina donde todo está.**

⭐⭐ **L58 · «NO DEBE CONTENER MÁS QUE ESTOS» PERDONA PARA SIEMPRE. «DEBE SER EXACTAMENTE ESTOS»
OBLIGA A VOLVER.**
Al no poder arreglar dos enlaces rotos *(era decisión, no arreglo)* se montó una lista de
excepciones **con igualdad exacta**: se pone roja si aparece uno nuevo **y también si uno de los
listados se arregla**, pidiendo que se retire.
→ **Y funcionó:** al arreglar el spike, el guardián **pidió su propia retirada**.
⚠️ *"Casi ninguna excepción lo hace: **lo normal es que sobreviva a su motivo y nadie vuelva a
mirarla**"* — **L53**, `ZETABUS-ESTADO.md` metido por una excepción razonada que **190 commits
después nadie había vuelto a cuestionar**.
> ⭐ **La diferencia técnica es una línea: igualdad exacta en vez de subconjunto.**

⭐ **L59 · SI AL QUITAR LA IMAGEN SE PIERDE INFORMACIÓN, LA INFORMACIÓN ESTABA EN EL SITIO
EQUIVOCADO.**
El enlace roto del spike era **el síntoma**. La causa: **la tabla no se sostenía sola** — decía
*"calles con nombre / barrios con nombre"* y **delegaba en la foto** cuántos autobuses entraban y
si el pin encogía, con esos datos escritos **en otro párrafo**.
> *"Un documento que necesita una imagen para significar algo **es un documento que caduca cuando
> la imagen no viaja** — y aquí no viajaba desde el primer día."*
→ **En un informe, la imagen ilustra un resultado que YA ESTÁ ESCRITO.**

⭐ **L60 · ACOTAR EL ALCANCE PARA AHORRAR PUEDE COSTAR MÁS CARO QUE NO ACOTARLO.**
El guardián recorría `git ls-files docs/` **por coste**. Medido al ampliarlo: `git ls-files docs/`
**tarda MÁS** que `git ls-files` a secas —el pathspec obliga a git a filtrar— y el filtrado propio
cuesta **0,4 ms**. Ampliar de 39 a 48 ficheros **bajó el tiempo**.
> ⭐ *"**Pagué en cobertura por un ahorro que no existía.** Lo descubrí midiendo por obligación,
> porque se preguntaba por el coste; **si no lo llego a medir, la creencia seguiría ahí**."*
⚠️ *Optimización sin medición previa = deuda con intereses* — y aquí la deuda **se pagó en
cobertura**, que es la moneda cara.

**Y una del fallo real de Avanza:**
*Un test que solo pasa cuando la fuente ajena está sana **no es un test: es un test de Avanza**.*

---

## 5 · ⚠️ EL INSTRUMENTO HA MENTIDO ~45 VECES

**Ya es una categoría, no una anécdota.**

| # | Qué mintió |
|---|---|
| 1 | `getComputedStyle` **no incluye el `opacity`** → daba 20,6:1 sobre un texto invisible |
| 2 | **8 desbordes falsos** → *"un detector que grita 8 veces por nada es uno al que se deja de hacer caso"* |
| 3 | **El contador global contaminado** por los 6 workers de Playwright |
| 4 | **La esquina del chip redondeado** cae fuera del `rounded-xl` → leía blanco sobre azul |
| 5-6-7 | ⭐ **`reuseExistingServer`** reutilizaba un `next start` viejo → **mintió TRES veces en un día** |
| 8 | El detector de truncados cazó **7 falsos positivos** (`sr-only`) |
| ⛔ **9** | ⚠️ **UN FALSO ROJO.** Decía que los chips no enlazaban — **leía la URL antes de la navegación**. *"Habría 'arreglado' código que funcionaba."* |
| 10-12 | Varias de la Tanda 7 (medición de color, geometría, ventana) |
| **13** | `pixeles()` devolvía **undefined en silencio** fuera del viewport |
| **14** | El veneno `"f:\"` **colisionaba con la fila `f:`** del stream RSC de Next |
| ⛔ **15** | ⭐ **UN TEST QUE BLINDABA EL BUG** (la banda de demo). Ver L11 |
| 16 | ⭐ **LA CACHÉ DE DISCO servía la forma anterior al campo `frecuencia`.** Sin error, sin rojo: 19 entradas mancas. Ver L18 |
| 17 | ⭐ **LA SPEC del bloque de salidas apuntaba a los casos equivocados** (4 etiquetas escritas de memoria). Ver L19 |
| **18** | ⭐ **LA TABLA DEL LOGO juzgaba a 16 px con lo visto a 32.** V1 "borrón" y V2 "limpia" difieren un **6,6 %** a 16 px. Ver L25 |
| **19** | ⭐ **LA COLUMNA DE GRISES respondía a una pregunta que nadie hizo.** Bien medida, mal apuntada. Ver L26 |
| **20** | ⭐ **LA CONSOLA CON ARRASTRE.** Afirmé sobre un log de PowerShell con texto de sesiones anteriores. Ver L27 |
| **21** | ⭐ **EL BBOX MEDIDO SOBRE EL PATH, NO SOBRE EL TRAZO.** `stroke 8` + `linecap round` = 4 uds por extremo. Ver L29 |
| **22** | ⭐ **UN AVISO DE BUILD QUE SÍ ERA RUIDO:** *"Slow filesystem detected"* sobre `F:`, que es **partición local, no unidad de red**. ⚠️ *Y la contracara: el de CSS NO era ruido. No se puede decidir si un aviso es decoración sin comprobar qué afirma — leerlos todos como ruido y todos como alarma son el mismo error con distinto signo* |
| **23** | ⭐ **UN GUARDIÁN QUE EXIGE UN TEXTO.** `pantalla-no-miente` obligaba a mantener un aviso que había envejecido. Ver L33 |
| **24** | ⭐ **EL CRITERIO DE ACEPTACIÓN MIDIÓ OTRA COSA.** Se pidió centrar el logo; se verificó que era enlace y ≥44 px. Verde con el fallo intacto. Ver L31 |
| **25** | ⭐ **UNA ATRIBUCIÓN QUE EXISTE NO ES UNA ATRIBUCIÓN QUE CUMPLE.** El mapa acreditaba a OSM… pero sin la palabra que exige la ODbL. Ver L35 |
| **26** | ⭐ **EL INFORME DECÍA APLICADO Y EL OJO DECÍA QUE NO.** El cambio estaba vivo pero era **invisible**. Ver L36 |
| **27** | ⭐ **LA AUDITORÍA DE A11Y DIO UN FALSO POSITIVO PROPIO:** reportó un `<label>` que faltaba y ya estaba puesto. Ver L37 |
| **28** | ⭐ **UN GUARDIÁN CON UNA SUPOSICIÓN DENTRO:** `indice-margen-chip` daba por hechas ≤2 columnas. Habría dado **falso rojo** a 1280 |
| **29** | ⭐⭐ **UNA CAPTURA CITADA COMO PRUEBA QUE NUNCA EXISTIÓ.** *"No mintió por encuadre: no había instrumento."* Ver L39 |
| **30** | ⭐⭐ **PLAYWRIGHT MOVIÓ EL `<ol>` QUE IBA A MEDIR** (scroll-into-view antes del clic) e **inventó un bug**. Ver L39 |
| **31** | ⭐⭐ **SEIS TESTS CON EL MISMO ORDEN FIJO.** La fusión desordenada daba verde y ninguno lo veía. Ver L44 |
| **32** | ⭐ **UNA AFIRMACIÓN DUPLICADA:** la guía leía el componente real (no caduca) pero su prosa estaba a mano (sí caduca). Ver L42 |
| **33** | ⭐⭐ **EL BARRIDO SE ENSUCIÓ A SÍ MISMO: 1.639 de 1.640 hallazgos eran suyos** (sus propios abortos de teselas, sus prefetch cancelados, y el mapa medido a medio montar). El único real —la home sin `<h1>`— estaba enterrado debajo. Ver L45 |
| **34** | ⭐ **UN DETECTOR MAL APUNTADO ACUSA A LA APP DE SU PROPIO DEFECTO.** Exigía hijos de >100 px para dar por buena una columna. Ver L46 |
| **35** | ⭐⭐ **VERDE EN VACÍO:** el test de "Información adicional" dio **0 copias anunciadas a todos los anchos** — pasó **porque no había nada que comprobar** (`?fingir=` no produce horario) |
| **36** | ⭐⭐ **UNA ASERCIÓN DE TOPE SE SATISFACE CON LA NADA.** `toBeLessThanOrEqual(1)` contaba **cero** y pasaba. Ver L47 |
| **37** | ⭐ **`.first()` COGÍA LA COPIA OCULTA.** Cantaba "no hay caja" con la caja pintada: **medía el elemento equivocado** |
| **38** | ⭐⭐ **`git status` DABA LIMPIO POR EL FALLO.** El WIP no salía como modificado **porque ya estaba committeado**. Ver L53 |
| **39** | ⭐⭐ **EL GUARDIÁN CAZÓ LOS FALLOS PLANTADOS Y NINGUNO DE LOS 12 REALES**, porque los reales vivían fuera de su alcance. Ver L51 |
| **40** | ⭐⭐ **`/api/diag` DECÍA `peticiones: 0` MIENTRAS LAS HACÍA.** *El valor tranquilizador y el de "no he medido nada" son el mismo valor* |
| **41** | ⭐ **LA FÓRMULA WCAG, CUATRO COPIAS Y UNA NO ERA LA WCAG.** No duplicación: **divergencia**. Coincidían por casualidad |
| **42** | ⭐ **UN `git mv` NO ES UN ALTA NI UNA BAJA:** el detector daba un **falso positivo con corroboración aparente**. Ver L56 |
| **43** | ⭐ **`aNumero()` LEÍA «20.9» COMO 209** (punto como separador de millares) y **puso rojo un README que decía la verdad** — *el error más peligroso de un guardián, porque el reflejo es "corrige el documento"* |
| **44** | ⭐⭐ **EL GUARDIÁN PREGUNTABA AL DISCO (`existsSync`) Y NO A GIT.** *El vigilante compartía el sesgo del vigilado.* Ver L57 |
| **45** | ⭐ **`git ls-files docs/` ERA MÁS LENTO que `git ls-files`.** Se acotó el alcance **por un ahorro que no existía**. Ver L60 |
| — | Y una donde **el instrumento tenía razón** y el defecto era propio: `⁺¹` con `<sup>` a altura 0 por `inline-flex` heredado |

**Reglas del proyecto:** *"prefiero un error a un verde prestado"* · *"sospechar del instrumento
es verificar quién de los dos miente"*.

---

## 6 · ⚠️ Decisiones que se DESHICIERON — no se borran

| Se creyó | Por qué se dejó de creer |
|---|---|
| **"Solo se puede tachar, no repintar"** | ⭐ Existe `get_stops_list`. **Lo encontró Antonio mirando 3 postes** |
| **"7 paradas fantasma"** | El oráculo era falso. **Lo dijo Antonio, que conoce la ciudad** |
| **"Esta línea lleva articulados"** | El pliego que lo dice **no está en vigor** |
| **"El recuento de articulados es el momento oro"** | ⚠️ **APARCADO.** *"No responde a ninguna pregunta de un usuario."* |
| **"El paso 4 del barrido cubre"** | ⭐ **Los pelotones lo matan.** *"Un número que sube cuando debería bajar no es una medida, es una lotería"* |
| **"El JSON de flota es oro puro"** | **62 longitudes mal, todas en el mismo sentido** |
| **"La referencia pinta buses en el golfo de Guinea"** | ⚠️ **Falso. Lo dije yo leyendo su backend y afirmando sobre su pantalla** |
| **"Su pantalla de parada no se clona"** | ⚠️ **Error mío.** La medí y **no la usé**. Antonio sí. **En usabilidad manda quien la usa** |
| **"Los chips de transbordo están de adorno"** | ⚠️ **Falso, lo dije yo.** Sí enlazaban. **Y el test que lo "confirmó" mentía** |
| **"Los eCitaro están verificados con matrícula"** | ⚠️ **No hay ninguna matrícula en ninguna fuente** |
| ⭐ **"No hay horario de día raspable en la web de Avanza"** | ⚠️ **FALSO (16/07).** El spike pidió `?linea=` cuando el parámetro real es `?selectLinea=`. **Sí hay tabla, day-true.** Lo encontró Antonio |
| ⭐ **"El GTFS es la fuente del horario"** | **Miente por calendario**: 0 trips en la 44 mientras circulaba. Bajó a papel secundario |
| ⭐ **"El motor de horarios hay que construirlo ahora"** | ⚠️ **APARCADO con la cabeza fría.** Sistema de 6 fases para la 4ª cosa de una vista |
| ⭐ **"El rayado de las suprimidas era una decisión de diseño"** | **Falso: era `.es-rancio` prestada.** Ver L12 |
| ⭐ **"El techo de zoom impide encuadrar los buses"** | **Falso, lo dije yo.** `ZOOM_TECHO` es `maxZoom` de `fitBounds`: solo limita el acercamiento. **El culpable era el clamp de `ZOOM_SUELO`** |
| ⭐ **"Es cuando hay varias líneas"** | Matiz: **lo dispara la DISTANCIA del bus más lejano**, no el número de líneas. *(Aunque correlacionan: con 3+ líneas se recortaba el 100 %)* |
| ⭐ **"El favicon es la Z de la marca engordada"** | ⚠️ **Falso. Eran DOS DIBUJOS** (38/52/s6 vs 43/49/s8). Lo destapó el propio ejecutor auditándose: **echó abajo su propia recomendación** |
| ⭐ **"V1 se funde y V2 es la más limpia a 16 px"** | **Difieren un 6,6 %**: casi el mismo bitmap. El juicio venía de 32 px. Ver L25 |
| ⭐ **"La acera de V3 se adelgaza a 16 px"** | **Argumento inválido:** a 16 px no va V3, va la Z sola. *El pero real de la prolongación larga es el apaisado* (−13 %) |
| ⭐ **"Hay que hacer la tabla píxel a píxel"** | **Retirada del cierre** (doc 10): la decisión de diseño ya estaba tomada, y medir hoy daría **diferencias intencionales** |
| ⭐ **"El flaky de `rutas-basura` es del test"** | **Del ENTORNO:** >100 pases limpios; es el transporte bajo ~14 workers en Windows |
| ⭐ **"`ZETABUS-ESTADO.md` se coló en `050a70a`"** | ⚠️ **Falso.** Estaba **desde el 2.º commit**, con excepción explícita en el `.gitignore`. En 190 de 191. Ver L53 |
| ⭐ **"`BARRIDO_APARCADO` está rancio"** | ⚠️ **Falso, y lo desmintió el ejecutor.** `parked/` **está versionado**: `git mv` conserva el seguimiento. Eran **4 rancios, no 5** |
| ⭐ **"Hay 8 ficheros con rutas de disco"** | **Eran 7.** Se leyó la auditoría **en vez del fichero** — *la L7 con traje nuevo* |
| ⭐ **"El `<h1>` de la home es el único fallo del repo"** | **De la SUPERFICIE, sí.** Pero **nadie había mirado el CÓDIGO**: de ahí salieron cuatro graves más |
| ⭐ **"La restauración de scroll está rota"** | ⚠️ **Falso, y lo desmontó el ejecutor con la medición en la mano.** Lo fabricaba Playwright. Ver L39 |
| ⭐ **"La info adicional no está en la columna derecha"** | **Falso en el código:** la sonda lo confirmó (`left 836`, `gridArea: info`, borde negro). Era otra cosa del navegador |
| ⭐ **"El hueco es una fila vacía de la rejilla"** | **No:** era el **reparto del sobrante** entre filas `auto`. Distinta causa, distinto arreglo |
| ⭐ **"El filtro plegable en móvil es una mejora neutra"** | ⚠️ **NO ERA MI DECISIÓN.** Antonio dijo "cero cambios en móvil": instrucción, no preferencia. Revertido |
| ⭐ **"Hay `div` con `onClick` sin cursor ni teclado"** | **Falso, y era MÍO.** Cero en código propio. Los problemas reales eran otros dos. Ver L38 |
| ⭐ **"El chip no ha cambiado / sí ha cambiado"** | **Los dos a medias:** estaba aplicado **y** era invisible. Ver L36 |
| ⭐ **"El pie está roto / desalineado"** | **Falso.** Su caja siempre estuvo centrada; **su contenido dejó de coincidir con la home** al ensanchar la rejilla |
| ⭐ **"«MITRAMS» viene del `feed_info` del GTFS"** | ⚠️ **Falso, y era MÍO.** Está escrito **a mano** en `layout.tsx`. La fórmula es obligatoria; el castellano roto era **redacción nuestra** |
| ⭐ **"«datos procesados» es un enlace subrayado"** | ⚠️ **Falso, y era MÍO.** Es **negrita**. A ese tamaño se leen igual, pero **no había ningún enlace prometido que no existiera** |
| ⭐ **"Quitar la coletilla centrará el logo"** | ⚠️ **Falso, y era MÍO.** Solo dejó el hueco. Suposición sin abrir la página, convertida en criterio de aceptación. Ver L31 |
| ⭐ **"La flecha y el logo hacen lo mismo"** | ⚠️ **Falso, y era MÍO.** La flecha volvía a la LÍNEA (`?desde=`); el logo va al home. Ver L32 |
| ⭐ **"La cabecera está en otro margen que el contenido"** | ⚠️ **Falso, y era MÍO.** Comparten margen (16 px a 360, 320 px a 1280). Me lo inventé mirando una captura |
| ⭐ **"La regla de los dos no afecta a la ficha de parada"** | ⚠️ **Falso, y era MÍO.** Es un **tope por poste**: el aviso era cierto. Se quitó por inútil, no por falso. Ver L33 |
| ⭐ **"Hace falta un índice inverso en tiempo de página"** | **Sobredimensionado.** El patrón ya existía (`gtfs.json`): un artefacto nocturno. La idea buena fue de Antonio |
| ⭐ **"El build emite los 6 warnings de CSS"** | ⚠️ **Falso, y era MÍO.** Leí una consola con arrastre. `next build` es **inmune** (4 escenarios + control positivo). Solo pasa en `next dev`. Ver L27 |
| ⭐ **"El dev roto es cosa de Windows"** | **Tenía causa:** Tailwind v4 ingiere el RSC de `.next` en el pipeline de dev. Arreglado con lista blanca en `a1ab30a`. Ver L28 |
| ⭐ **"El favicon arrastra 6 uds de aire y va ladeado"** | ⚠️ **Falso, y era MÍO.** Medí el path, no el trazo. Favicon **centrado 2/2/2/2**; el descentrado era **la marca**. Ver L29 |
| ⭐ **"Hay que borrar `.next` antes de `next dev`"** | **Paliativo descartado:** un paso manual se olvida y el fallo vuelve en silencio. Se hizo **imposible**, no evitable |
| ⭐ **"La prolongación larga parte la marca en dos cosas"** | ⚠️ **Objeción mía, y se graduó midiendo:** fatal en V3, **leve en V5** (la bandera lo salva), nula en V4. **No se cayó, pero no era lo que yo decía** |

---

## 7 · Mapa de tandas

| | Tanda | Estado |
|---|---|---|
| — | Auditoría de fuentes (7 fases + diseño) | ✅ |
| **1** | Modelo de datos y capas | ✅ |
| **2** | Capa de datos (GTFS, flota, puente de identidad) | ✅ |
| **3** | Motor vivo (scrape, caché, diff de desvíos) | ✅ |
| — | Verificación visual (Playwright) | ✅ |
| **4** | Pantalla + clon parcial | ✅ |
| **5** | Barrido bajo demanda → **APARCADO** | ✅ |
| **6** | La gran corrección (20 fallos) + el mapa | ✅ |
| **7** | **Endurecimiento y pulido** | 🔄 **casi cerrada** |
| **8** | Despliegue + demo pública | ⬜ |

### 22/07 — El logo, decidido midiendo

**V4** (señal en bandera, prolongación media) + **favicon Opción A** (misma Z, `stroke` 6/8).
Detalle completo en §1. Lo que dejó el proceso:
- ⭐ **El ejecutor se auditó y echó abajo su propia recomendación** (las dos Z no eran la misma Z).
  *Eso valió más que las cinco variantes.*
- **Se dibujó V5 a propósito** para darle salida a la preferencia de Antonio por la acera larga, y
  se midió **la objeción de Claude**, no la de Antonio — con **tira ciega a 32 px, sin etiquetas**.
  *La objeción se graduó en vez de confirmarse sola.*
- **Dos entradas nuevas al catálogo del instrumento** (18 y 19) y **dos lecciones** (L25, L26).

### 25/07 (cierre) — ⭐ EL MARCO DE MÓVIL, Y EL GUARDIÁN QUE MIRABA AL DISCO

**`f7a642d` — el marco de móvil en las capturas del README.** Se pidió *"igual que en Linaje"*, y
se **midió sobre los píxeles del PNG**, no se miró: bisel 24 px (4,35 % del ancho), color `#0E0F12`
—*no negro puro*—, radio ajustado a un círculo de **r = 88** con error ≤ 1 px, sombra horneada en
el alfa, **sin muesca ni botones**.
· **Dos desviaciones deliberadas, con su motivo:** el marco usa `--color-tinta` **con un aro al
  16 % de blanco** *(porque `#0F172A` contra el fondo oscuro de GitHub **desaparece**: se verificó
  componiendo sobre `#ffffff` y sobre `#0d1117` antes de decidir)*; y el margen de sombra baja al
  9 % *(con el 16 % de Linaje el teléfono salía un **23 % más pequeño**, y estas capturas están
  para leerse)*.
· ⚠️ **Y el radio salió mal a la primera:** se puso *"a ojo parecido"* **teniendo el PNG delante
  para medirlo**. → ⭐ *"Tener la fuente delante no sirve de nada si se la **mira** en vez de
  **medirla**"* — la misma frase de la racha con otro traje: la auditoría en vez del fichero, la
  ruta sin su frase, el `.gitignore` en vez de `git ls-files`, y ahora **la curva en vez de sus
  píxeles**.

**`0d8c473` — ⭐⭐ EL GUARDIÁN PREGUNTABA AL DISCO.** Ver **L57**. Buscando si cazaba una imagen
movida, apareció algo peor: `SPIKE_SUELO_DE_ZOOM` enlazaba a capturas **que existen en el disco de
Antonio y NO en el repositorio** (`/capturas/` está denegado). **Enlace roto para cualquiera que
clone — y el guardián lo daba por bueno.**
⚠️ **Y el guardián se había estrenado el día antes con dos rojos enseñados… con TRES agujeros
simultáneos:** cubría **cero de las 8 imágenes del README** *(fichero fuera de la lista **y** forma
de enlazar desconocida)*, y daba por buenos dos enlaces ya rotos.
→ *"Planté los fallos donde el instrumento ya miraba, y el verde solo me dijo que allí funcionaba"*
  — **L51 con la vuelta completa.**
→ Arreglado: **universo = `git ls-files`**, **48 ficheros** *(no solo `docs/`)* y **cinco formas de
  enlazar** *(las tres que hoy no se usan van igual: "el día que alguien escriba un `<a href>` no
  debería estrenarse sin vigilancia")*. Con **el techo declarado**: no cubre anclas, ni externos, ni
  rutas citadas en `.ts`, ni que el destino **diga lo que promete**.
⭐ **Y algo nuevo en el proyecto: metió `ZETABUS-ESTADO.md` bajo un guardián que él NO PUEDE
OBEDECER** — si se pone rojo, no le está permitido arreglarlo.
> *"**El guardián avisa, no autoriza.** Lo que no se puede es dejar fuera lo que no se puede
> arreglar, porque **eso es exactamente cómo se pudrieron los 21 del cuaderno de campo**."*

**`827ec2b` — el spike, sin las capturas.** Ver **L59**. Se decidió **cambiar el texto, no publicar
las imágenes**: la regla del `.gitignore` es correcta y **meter una excepción para dos ficheros la
rompe por el caso más débil** *(y ya sabemos cómo acaban las excepciones razonadas: L53)*. Además
**son de julio: publicarlas hoy sería enseñar la foto de un ZetaBus que ya no existe.**
· La tabla recuperó **los números que el documento tenía dispersos**, incluida la fila que más
  importaba y no estaba: **el pin mide 22 px a los dos zooms** — *el spike existía para descartar el
  miedo de que "la parada se vuelva un punto", y ese resultado vivía solo en un párrafo de abajo.*
· ⭐ **Y la lista `PENDIENTES` pidió su propia retirada** al arreglarse el enlace (**L58**).
  Se comprobó que **con la lista vacía el guardián sigue cazando** — no se vuelve un no-op.

⭐ **Y el informe cerró declarando que NINGÚN instrumento falló**, con el mismo cuidado que cuando
fallan: *"es la primera vez en esta racha que el instrumento va por delante y no detrás."*

### 25/07 (noche) — ⭐ EL GUARDIÁN DEL README, Y LA LIMPIEZA DOCUMENTAL

**EL GUARDIÁN (`357ac4a` … `630126a`).** El README mintió 91 commits porque **nadie mira la prosa**.
De tres niveles propuestos se eligió el **2 + aviso mecánico**, y **no el 3**, por su propio
argumento: *el nivel 3 exige marcar cada frase y **"se abandona sola"** — el día que alguien escriba
sin marcar, **la frase queda fuera y el guardián sigue en verde**.*
→ **El reparto invertido:** el guardián cubre **lo mecánico** (las cifras, que caducan solas y en
silencio); **el ojo cubre la prosa**; y un **aviso mecánico** dice cuándo lleva demasiado sin
mirarse, para que "revisar a mano" **no dependa de acordarse**.

· **14 afirmaciones registradas**, y ⚠️ **ninguna `real()` devuelve un número escrito a mano: todas
  CUENTAN** contra la fuente (L1). Con una regla que no estaba en el encargo: **si el patrón no
  encuentra la frase, también es rojo** — *una afirmación reescrita saldría del registro en silencio
  y el guardián se quedaría vigilando un texto que ya no existe.*
· ⭐⭐ **Y cazó DOS MENTIRAS VIVAS a los diez minutos de existir, sin que nadie las plantara:**
  el README decía **«403 vehículos del pliego»** cuando son **350** — *y **se contradecía a sí mismo
  dos filas más abajo**: ya decía que busesmadrid aporta 43 que no están en el pliego, y 350+43
  nunca fue 403*. **Nadie lo leyó entero.** Y **«Tres lecciones»** habiendo **nueve**.
· **El vigía: N = 15 commits**, medido sobre la historia real (132 de 187 tocan `src/`; rachas de
  3, 3, 34 y **91**). Con 15: **cero falsos positivos en toda la historia**, y en la racha del README
  **habría avisado 76 commits antes de publicar**. Va en `posttest`, **no en el build** —*allí se
  perdería entre cientos de líneas*—. **Solo avisa, no bloquea:** ⚠️ *"un guardián que se silencia a
  menudo acaba silenciado siempre."*
· ⚠️ **Y el techo, declarado en tres sitios**, con un `⛔ NO LEER ESTE FICHERO COMO «ya hay un test
  que vigila el README»`: **la frase que mintió 91 commits NO TIENE NÚMERO y este guardián NO LA
  HABRÍA CAZADO.** *Un guardián que promete cubrirlo todo enseña a no mirar.*
· ⭐ **Y se mordió la cola a los diez minutos:** al añadir 20 pruebas dejó rancio el «451 pruebas»
  del propio README — *una cifra que su registro no puede vigilar*. **La salida no fue meter un
  número nuevo: fue escribirlo como SUELO ("más de 470")** — *un suelo aguanta que se añadan
  pruebas; un número exacto no.*

**LA HISTORIA DEL PROPIO `ZETABUS-ESTADO.md`.** Se creyó que `050a70a` lo había colado con un
`git add` mal acotado. ⭐ **Falso, y lo desmintió él mismo:** estaba **desde el segundo commit**,
con excepción explícita en el `.gitignore` (ver **L53**), en **190 de 191 commits**.
⚠️ **Y cómo lo tapó el instrumento:** al informar *"git status → jamás tocado por mí"*, **era cierto
en pantalla porque el fichero ya estaba dentro del commit**. `git status` **daba limpio precisamente
por el fallo**.
→ **DECISIÓN: se queda en el repositorio.** No se reescribe historia *(serían 190 commits y romper
todas las referencias de hashes **para esconder algo que no avergüenza**)*. **Ese documento es el
argumento del proyecto.**
→ Pero **Claude Code NO LO MODIFICA NUNCA**: regla permanente en `AGENTS.md`, **con su cicatriz
escrita** *("esta regla existe porque se rompió")*. Y una segunda regla que sale de ahí: ⚠️ **`git
status` no vale para comprobar que no se ha tocado algo** — lo que vale es `git show --stat` y leer
la lista de ficheros antes de empujar.

**LOS DOCUMENTOS RANCIOS (`0c11802`).** 23 repasados, ⭐ **4 rancios — no 5** *(el quinto no lo era:
ver **L56**)*. Rectificados **SIN reescribir**: nota fechada arriba, cuerpo intacto debajo, mismo
tratamiento que `THIRD-PARTY-NOTICES`.
⚠️ **El porqué de rectificar y no reescribir:** `AUDITORIA_HORARIO_WEB_AVANZA` **ya abre diciendo
*"era falso, y el error fue mío y tonto"***. ⭐ **Ese par de documentos, leídos juntos, cuentan una
historia que vale más que dos documentos limpios.**
· **`AUDITORIA_Q1`** (ver **L54**) · **`MOTOR-HORARIOS`** (se contradice a tres líneas de sí mismo)
· **`AUDITORIA_SISTEMA_VISUAL`** (ver **L55**) · **`MODELO-BLOQUE-SALIDAS`** *("la decisión se tomó
construyéndola, y nadie volvió a bajar a marcar el cabo")*.
· **21 documentos sueltos entraron en el índice** — ⭐ *listarlos es elegirlos* (**L50**).
· **12 enlaces rotos arreglados**, y el guardián **extendido a los 39 `.md`** (`1dd420e`) con su
  *sanity* (**L52**). ⚠️ Uno **no se reapunta**: el fichero se borró entero y **no se inventa un
  destino** — *"un enlace que lleva a algo que se parece es peor que un enlace roto: **el roto se ve,
  el parecido miente**."*
· **Las rutas de los discos** limpias del árbol *(no del historial)*, conservando la frase: en los
  informes **la referencia es parte del registro**. ⚠️ La peor estaba **en un `console.log`**.

### 25/07 (tarde) — ⭐⭐ EL MACROBLOQUE DE AUDITORÍA, ANTES DE PUBLICAR

**Por qué existe:** la Tanda 7 verificó que la app **funciona y no miente**. **No dijo NADA sobre
el CÓDIGO.** Y ZetaBus es un proyecto de portfolio: **el repositorio es público y lo van a abrir
reclutadores**. Un reclutador dedica minutos, no horas — **el código ES el escaparate.**
Tres auditorías, **de descubrir, no de arreglar**: `9855851` (código) · `58d83ec` (perímetro) ·
`cbb2141` (rendimiento), cada una con su documento-guía en `docs/auditoria/` (11, 12, 13).

⭐⭐ **EL HALLAZGO QUE LO CORONA — y es el de "¿qué le chirriaría a un reclutador?":**
> **«Ni una línea de aplicación todavía»** — `README.md:6`. El README llevaba **91 commits**
> diciendo que el proyecto **no existe**, sobre **12.973 líneas de `src/` y 1.229 tests en verde**.
> **Es la primera frase que lee cualquiera.**
Y detrás: auditoría de fuentes **previa al código**, 173 commits con convenio y 4.856 líneas de
cuerpo, **cero `TODO`/`FIXME`/`@ts-ignore` en 15.641 líneas**, y tres retractaciones documentadas.
**Nada de eso se llegaba a ver.**
⚠️ *"Ningún test lo vio, porque los 1.229 miran el código y la pantalla, y **nadie mira la prosa
que describe el proyecto**. Es el mismo agujero que dejó la home sin `<h1>`."*

**LOS OTROS TRES GRAVES:**
- ⛔ **`/api/diag` contaba CERO peticiones mientras las hacía.** Medido en producción, mismo `pid`,
  **con contraprueba en disco** (tras cargar una parada apareció su fichero de caché, *que solo el
  render pudo escribir*). ⭐ **La causa no estaba en el código: estaba en el framework** — páginas y
  route handlers son **grafos de módulos distintos** aunque compartan proceso, así que el singleton
  se instanciaba dos veces.
  ⚠️ **Y el sesgo iba al lado malo:** en una visita normal la primera petición es la del render.
  Además **el endpoint decía de sí mismo que la cuenta "es una MEDIDA"**.
  > *"Ninguna lectura del código lo habría revelado: hubo que arrancar el build de producción y ver
  > el número no moverse. **Lo que se cree del propio proceso hay que medirlo en el proceso, no
  > deducirlo del fichero.**"*
- ⛔ **El `gtfs.json` de 1,9 MB viajaba al navegador.** `/parada` mandaba **2.431 KB** contra los
  ~148 KB de las demás rutas. Dos `import { linea }` **como valor** en componentes `'use client'`.
  ⚠️ *"Lo que hacían con esos 1,9 MB eran **dos llamadas, para sacar el color de un chip**."*
  → **Arreglado: −78 % crudo, −72 % gzip** (532 KB / 154 KB). ⭐ *"El dato estaba en la mano y se
  iba a buscarlo a 1,9 MB de distancia"* — la `LlegadaViva` ya traía `shortName` y `color`.
  ⚠️ **Y un coste que solo existe después de compilar no lo encuentra ninguna revisión de código:**
  *"`import { linea } from '@/engine/topologia'` es una línea perfectamente inocente. Nada en ella
  dice «esto son 1,9 megas»."*
- ⛔ **La fórmula WCAG escrita CUATRO veces, y la cuarta no era la WCAG** (luminancia lineal sin
  gamma). ⚠️ **No era duplicación: era DIVERGENCIA. Coincidían por casualidad.** Unificada en
  `src/core/contraste.ts` — al núcleo y no a `e2e/lib/`, porque *"si viven separadas, el instrumento
  puede aprobar exactamente lo que la aplicación considera ilegible"*.
- ⛔ **`react-leaflet@5` es Hippocratic-2.1**, no aprobada por la OSI, **sin declarar**. Veredicto:
  **solo aviso, no incompatibilidad** — no es copyleft y Apache 2.0 no prohíbe dependencias con
  términos propios. *Pero quien tomara ZetaBus creyéndolo "Apache 2.0 y ya" se llevaría dentro una
  pieza con restricción de uso.* Las 23 declaradas.

**Y el `User-Agent` que prometía un correo que no existía.** ⭐ **Eran CUATRO documentos, no tres —
y el cuarto era el ORIGEN**: en la Tanda 1 se *propuso* el correo, y de ahí se copió a los otros
tres **como si fuera un hecho**. No se reescribió *(es el registro de lo que se pensó)*: se anotó
como no implementado.
⚠️ **Y no se puso la URL del dominio porque se comprobó que no responde** (000): *"apuntar a un 404
sería peor"*. **Verificó en vez de asumir lo que yo le dije.**

⭐ **Y UN TEST QUE RECHAZÓ SU PROPIO SÍMBOLO:** `tranvia-sin-tocar-el-nucleo` prohíbe la palabra
"bus" en `src/core/`, y `Symbol.for('zetabus.…')` la contiene. **Cambió su fichero, no la guarda.**
> *"Aflojar una guarda para que pase mi código es lo que no se hace aquí."*

**Lo que NO se tocó, y es decisión, no falta de tiempo:** el inglés de `src/core` *(renombrar
`Line`/`Stop` **mueve el proyecto entero y quema el `git blame`** a cambio de estética)* · unificar
`ParQuePasa` *(rompe una frontera deliberada; una nota cruzada resuelve el daño real)* · `kml.ts` y
`entities.ts` *(**no son muertos, son CABOS**)* · CSP *(~1 día, puede romper el mapa, retorno bajo
sin formularios)* · `X-Frame-Options` y `Permissions-Policy` — ⭐ *"en una app sin un solo botón con
efecto son adorno, **y decirlo forma parte del trabajo**"*.

### 25/07 (cierre) — ⭐⭐ LOS DOS CABOS DE LA PARTE B, Y LA TANDA 7 CERRADA

**`0276170` — el `<h1>` de la home.** Dice *"Listado de líneas de transporte de Zaragoza"*, que es
**la parte específica de su propio `<title>`** — la misma relación que ya tenían las demás páginas.
*No se inventó: se siguió el patrón que existía.* Y sale de **una constante única** que usan el
título y el `h1`, para que no puedan divergir en silencio.
· **Oculto** (`sr-only`, la clase que el proyecto ya usaba): la home ya dice lo que es por vía
  visual —logo centrado y buscador—, así que un título visible **habría sido un cambio de maqueta,
  no un arreglo de accesibilidad**. Comprobado **en el árbol de accesibilidad, no en el CSS**.
· ⭐ **Y el motivo de que esto no se cazara antes:** el test nuevo **no vigila la home, vigila la
  REGLA** —*un ejemplar de cada tipo de página anuncia exactamente un `h1`*—. Las ~30 specs miran
  **pantallas concretas** y **ninguna hacía la pregunta general**.

**`6d44eec` — el fingimiento de horario: el VERDE EN VACÍO, tapado.** Ver **L47** y **L48**.
· **Antes:** *"Información adicional"* daba **0 copias a todos los anchos** y el test pasaba.
  **Ahora:** 1 copia anunciada a los 7 anchos.
· **Los dos rojos, enseñados y revertidos:** `margin-top:180px` en el horario → *"arranca 180 px
  por debajo del recorrido: está flotando"* — **la cicatriz de L36 reproducida exactamente**; y
  `.solo-movil-info{display:block}` → **2 copias anunciadas a 881**.
· ⭐ **Y la prueba de que el número cambió sin tocar el test:** el mismo test que contaba **0**
  pasó a contar **1**. *Un test que antes no veía nada ahora ve exactamente lo que debe.*
· Medido: **desfase 0 px** entre horario y recorrido sin desvío (881/1280/1920); **16 px** entre
  aviso y horario con desvío; y la info adicional salta de columna única a columna derecha
  **exactamente en el corte de 880**.

⭐⭐ **Y UN INSTRUMENTO QUE FALLÓ EN LA PROPIA TANDA:** su test cogía la copia **OCULTA** de
"Información adicional" con `.first()` —hay dos en el DOM, una por ancho, y **la de móvil va
primera**— y cantaba *"no hay caja"* a 881 **con la caja perfectamente pintada**.

**⚠️ LOS HERMANOS — lo que el modo de fingir TAMPOCO produce** *(listado, no arreglado)*:
- ⭐ **El MODO DEGRADADO del índice de correspondencias.** Ningún fingimiento toca
  `correspondencias.json`. Si falta, *"Líneas que pasan por aquí"* se calcula del GTFS y
  **desaparecen las provisionales** — y **ese estado de pantalla no lo ha visto nunca un test**.
  El núcleo puro sí está probado; **la pantalla en degradado, no.**
  ⚠️ *Es el hermano más parecido al que se acaba de cerrar: lógica probada, superficie sin
  ejercitar.* **Es el cabo que él cogería primero.**
- El **estado rancio de la caché en pantalla** (probado a fondo en vitest, sin fingimiento que lo
  provoque en el navegador).
- `src/sources/avanza/kml.ts` **hace una petición de red y NADIE lo importa** — ni en `src/` ni en
  `scripts/`. *O es código muerto o es un cabo.*
- La *"nota al pie más larga (Ci2)"*: **NO CONSTA.** Verificarlo exigiría 74 peticiones.

> ## ⭐ VEREDICTO: SE PUEDE DESPLEGAR, SIN CONDICIONES.
> *Y sin la condición de la vez anterior: el hueco que la obligaba —"el horario no se ha podido
> ejercitar"— está tapado, y la pieza donde el informe dio verde y la pantalla dijo que no
> **tiene ahora un test que la vigila y que se ha visto ponerse rojo**.*

### 25/07 — ⭐⭐ EL CIERRE DE LA TANDA 7 · PARTE B: LA SUPERFICIE

**Dos capas, y el orden importa: la Capa 1 alimenta a la Capa 2.**

**CAPA 1 — barrido total:** 1.012 URLs (44 líneas × 74 sentidos + 934 paradas + home,
`/sobre-los-datos`, la guía y el 404) × 2 anchos = **2.024 cargas en 15,6 min**.
⭐ **Coste externo, con una pieza que NO estaba en el encargo:** además de Avanza (cubierta con
`?fingir=`, **0 peticiones**), las 934 paradas llevan mapa → **habrían pedido teselas a
OpenStreetMap**. Se abortó todo lo que sale de `localhost`: **0 peticiones a terceros**.
⚠️ **Y su consecuencia, declarada:** el mapa sale gris, así que **el barrido juzga la CAJA del
mapa, no su interior.**

⭐⭐ **EL RESULTADO REAL NO ES LO QUE ENCONTRÓ, SINO LO QUE DESCARTÓ:**
**108 hallazgos en bruto → 106 eran del propio instrumento → 1 real.** Ver **L45**.
Y antes de barrer cazó **cuatro falsos positivos suyos**, incluido un detector de columnas que
exigía hijos de >100 px y **habría acusado a la app de un defecto propio** (L46).
> *"Un barrido que no encuentra nada porque no mira produce exactamente el mismo silencio que uno
> limpio — la diferencia es si sus falsos positivos y sus falsos negativos están sobre la mesa."*

**CAPA 2 — barrido fino:** 12 casos reales × 8 encuadres (360 · 390 · 768 · **879 y 881, la
frontera exacta** · 1280 · 1280×720 · 1920) = **96 comprobaciones, 0 hallazgos**.
⭐ **Y el recon destapó que TRES de los "peores casos" del encargo habían CADUCADO:** la línea más
larga es **N7 con 120 paradas** (no la 21/35), C1 tiene **5** paradas (no 4), y el 1228 tiene
**10** correspondencias (no 8). *Los escribí yo de memoria dos días antes.*
⚠️ **Es L42 aplicado al propio encargo: "probar la lista vieja habría sido probar el pasado."**
· Corte de 880: **una columna a 879, dos a 881** ✓ · Regla del alto: **C1 no se estira** (309 px
  constante) y **N7 topa a 10 px del fondo** con scroll interno ✓ · Los 6 títulos ✓ · TAB: 0 sin
  foco visible ✓

**EL ÚNICO FALLO REAL EN 2.024 PÁGINAS: la home no tiene ningún `<h1>`.** Confirmado por dos
métodos (DOM renderizado + código); las demás páginas tienen exactamente uno. Leve, de
accesibilidad. **Anotado, no arreglado.**

⚠️⚠️ **Y EL HUECO QUE ÉL MISMO DECLARÓ, que es lo que de verdad queda pendiente:**
**"Información adicional" y el HORARIO dieron VERDE EN VACÍO.** Con `?fingir=` no hay horario, así
que el test **pasó porque no había nada que comprobar**.
> *"Es un verde vacío y lo digo en vez de contarlo."*
⚠️ **Y es justo donde el informe dio verde y la pantalla de Antonio dijo que no** (L36).
→ Para cerrarlo hace falta **un fingimiento nuevo de horario** o **una tanda corta contra Avanza
  real con alguien mirando**.

**Veredicto: no hay nada que impida desplegar** — con la condición de que el veredicto **cubre lo
que se ha probado**, y el horario no está entre eso.

### 24/07 (noche) — La tanda corta, y ⭐ EL CIERRE DE LA TANDA 7 · PARTE A

**LA TANDA CORTA — los cuatro cabos, cerrados.**
- ⭐ **El fichero de correspondencias, VERIFICADO DE VERDAD** *(sin commit: no había nada roto)*.
  · **1a · ¿el barrido corrompe?** Barrido nuevo contra el de anoche, poste a poste: **0
    diferencias**, 927=927 postes, las mismas 14 líneas desviadas → **determinista**.
    ⭐ **Y lo que hace válido el cero:** *el clasificador se probó con un cambio inyectado* (un
    normal falso → SOSPECHOSO; una provisional añadida → EXPLICABLE). **Sin eso, el cero no
    habría significado nada.**
  · **1b · ¿el dato es cierto?** **1970/1970 pares normales respaldados** contra la ruta oficial
    del GTFS —fuente independiente del barrido (L1)—, con su contraprueba: un normal con el
    sentido volteado → cazado.
    ⚠️ **Las 64 provisionales quedan DECLARADAS NO VERIFICABLES** por medio automático: solo las
    conoce Avanza. *Se dice, no se disfraza de verde.*
    ⭐ **Y el reverso cuadra solo:** las 79 correspondencias del GTFS que el barrido no marcó hoy
    caen **exactamente en las 14 líneas desviadas**. Dato vivo confirmándose a sí mismo.
- **`baa023e` — el guardián del nombre** (L43): mide el **texto renderizado** del wordmark y el
  `document.title` de 4 páginas, con el nombre **literal, no importado** (L1). Rojo enseñado.
- **`82e731d` — el flaky de `rutas-basura:32` es del ENTORNO**, no del test: 404 determinista
  (79 ms en frío, sin Avanza) y **>100 pases limpios**. Es el transporte bajo ~14 workers en
  Windows. Documentado en el spec, **sin retry**.
- **`231a9dd` · `b0a8a15` — la guía de estilo** (L42): nota de "Marca" corregida (10 revisadas, 1
  mentía), favicon leyendo `Z_PATH` *(con `d={Z_PATH}`, por eso el guardián de la Z no salta)*, y
  la sección de iconos importando el `<Nodo>` **de producción** *(solo se le añadió `export`)*.

**`2bc8a0c` — ⭐ LA TABLA PÍXEL A PÍXEL SE RETIRA DEL CIERRE.** Ni Antonio ni yo recordábamos
contra qué era. Se buscó: la referencia era **`00 ZGZ RADAR`** (`moverme/bus`, :3002), el criterio
está en `docs/auditoria/08`, y el instrumento vive en `e2e/auditoria/` (fuera de la suite).
**Se cierra como decisión tomada, no como cabo abandonado** (doc 10), por tres motivos:
1. **La decisión de diseño ya se tomó y está escrita** (13/07): *lo que se CLONA / lo que se TIRA
   / lo que se CONSTRUYE DESDE CERO*. La tabla era el resultado de una comparación **ya resuelta**.
2. **Las capturas son del 14/07**, anteriores a todo el trabajo de esta semana → hoy mediría
   **diferencias intencionales**.
3. ⭐ **Y el de fondo, que sale de su propia regla rectora:** *"la referencia manda en lo visual;
   NO manda en lo que miente."* **Una tabla que puntúe «¿me parezco a la referencia?» premia lo
   contrario de lo que hace bueno al proyecto.**
⚠️ El instrumento **se conserva a propósito** (con su `README`), como registro de esa fase.

**⭐ EL CIERRE · PARTE A — EL MOTOR** (`02db45d` · `d2aa753`). 14 casos nuevos + el suelo.
⚠️ **Y el método fue el que importa: NADA CEDIÓ al primer intento — y en vez de celebrarlo, se
rompió el código a propósito.** Cuatro rojos enseñados y revertidos: el freno del borde
(`>` → `>=`), la dedup (los contadores **mueren**, no avisan), el orden estable, y el suelo.
*En el primero, solo cayó el test del borde y 12/14 siguieron verdes: el test es específico, no
es que la suite se caiga con cualquier cosa.*
· **El suelo extraído a `alcanzaElSuelo()`** —refactor mínimo aprobado— porque es **la única
  garantía cuyo fallo produce una MENTIRA**: un barrido a medias sobrescribiendo el índice bueno
  con un fichero que **parece completo**.
· ⚠️ **NO PROBADO, con motivo declarado:** la escritura atómica (tmp/`.bak`/rename) y
  `generadoEn`. Su fallo produce **dato de anoche**, que es el desfase ya asumido — malo, pero
  **no miente**. Correctas por lectura; **sin test automático**, y dicho.
· **Veredicto: ningún fallo grave del motor. Nada que impida desplegar.**

### 24/07 (tarde) — `/linea` en pantalla ancha

Mismo patrón que /parada y el mismo corte (**880**, y no por copiarlo: los números salieron
iguales — el suelo de la columna derecha son **380 px**, que los manda *la franja de frecuencia*).
Layout: línea centrada · destinos a todo el ancho · **recorrido `1fr` con scroll interno** ·
desvíos y horarios a la derecha · **"Información adicional" baja a la derecha con borde negro**.

⭐ **La regla del alto es de Antonio y sustituyó a un mínimo fijo de 460 px:**
> **El que manda es el SCROLL.** Si el recorrido cabe entero, la caja se ajusta a su contenido.
> Si no cabe, se estira hasta **la ventana menos 10 px**.
*El caso que lo destapó: la C1 tiene 4 paradas — estirarla al fondo dejaba un cajón vacío enorme.*

**Y una decisión tomada A PROPÓSITO, para que nadie la "mejore" después:**
⚠️ Con el desvío desplegado, la columna derecha crece más que el recorrido y **el recorrido NO la
sigue**: se queda topado a la ventana. Se vio, se discutió y **se deja así**:
· **Dos scrolls anidados es de lo peor en una interfaz** — el usuario mueve la rueda y no sabe
  qué se va a mover.
· Un contenedor con scroll **que no cabe en pantalla** pierde el sentido de tenerlo.
· Y solo pasa con el desvío **desplegado a propósito**. *No se optimiza el caso excepcional a
  costa del normal.*

**El hueco de la columna derecha (`b9e5dd5`).** Había 64 px entre cajas. ⭐ **No era una fila
vacía: era el REPARTO DEL SOBRANTE** de la rejilla entre filas `auto`. Se arregló poniendo las
cajas a `min-content` y una última fila `1fr` que se traga el sobrante al fondo.

**"Información adicional" duplicada, a sabiendas (`3345e15`).** Las áreas de rejilla solo colocan
**hijos directos**, así que con un solo nodo no se puede estar dentro del `<ol>` en móvil y en la
derecha en escritorio. Se eligió **duplicar** antes que tocar móvil.
⚠️ Con la costura de a11y resuelta: `display:none` saca la copia oculta del árbol de
accesibilidad, **verificado en el árbol, no en el CSS** — una sola anunciada en cada ancho. Y las
dos salen de `horario.info`: **no es copia a mano**.

**La restauración de scroll (`6742a73`): NO estaba rota.** Ver L39/L40. Queda un test permanente
que fija el camino real —pulsar una parada **visible**— con su porqué escrito dentro: *si se
pulsa una fuera de vista, Playwright mueve el `<ol>` que el test iba a medir.*

### 24/07 — ⭐ PANTALLA ANCHA: la home y /parada, rediseñadas

**Hasta aquí todo se había verificado a 360 y luego solo se comprobaba que "no se rompía" a 1280.
Estaba pensado para móvil y estirado.** El primer síntoma fue el logo pequeño en una banda ancha;
el de fondo, el contenido encajonado en una columna estrecha.

**LA HOME (`82ab21a`).** La rejilla de líneas pasa de 2 a **3 y 4 columnas**.
⭐ **Los cortes salen del SUELO DE LA TARJETA, no de breakpoints redondos:** se midió con el peor
caso real *(el búho N2, 60 caracteres)* y el suelo salió **280 px** — por debajo el nombre se
apila en 3-4 líneas. De ahí: **2 col desde 600 · 3 desde 888 · 4 desde 1176**.
· **El buscador NO se estira**: es una línea de texto y una línea larga se lee mal. La rejilla sí,
  que son 44 tarjetas y ahí el ancho es beneficio puro.
· ⚠️ Y hubo que tocar un guardián: `indice-margen-chip` **daba por hechas ≤2 columnas**. Se
  reescribió para derivar las columnas reales. *La invariante se conserva; lo que se quitó fue la
  suposición.*
· **El pie (`85479a2`):** ⭐ *nunca estuvo roto* — su caja siempre estuvo centrada. **Lo que pasó
  es que su contenido dejó de coincidir con el de la home al ensanchar la rejilla.** Parecía bien
  porque coincidía con otra cosa, no porque estuviera bien.

**/PARADA (`c8fb5c9` … `310a2f1`).** Dos columnas por encima de **880**: mapa a la izquierda,
columna derecha con filtro → llegadas → líneas que pasan → hoy por desvío. Debajo, la franja de
datos de Avanza a todo el ancho.
· ⭐ **CSS Grid con áreas, un solo árbol, sin medir el ancho con JS y sin duplicar DOM.** El mapa
  iguala el alto de la derecha y **crece con ella al desplegar** — comportamiento nativo de grid,
  no un truco. Leaflet repinta con `ResizeObserver`.
· **Suelo de la columna derecha: 380 px**, medido con el destino más largo que existe.
  Mapa `1fr` — *"la derecha se queda en su ancho cómodo y el mapa se lleva el resto"*.
· **El encuadre del mapa, rediseñado a RADIO FIJO.** ⚠️ El anterior se diseñó para un mapa de
  tamaño fijo: en uno grande, un bus lejano cabía y el encuadre se abría a 15 km. Ahora el
  vecindario se fija **en metros**, así que se comporta igual a cualquier ancho.
· **Accesibilidad (`01ec4ca` … `2d71763`):** cursor de mano global · realce en hover en las filas
  de llegada · el marcador de bus **activable con Enter y Espacio** (al modo de Leaflet) · el pin
  de parada **fuera del tabulador** y con nombre · zoom +/− a **44 px**.

⚠️⚠️ **Y EL FALLO DE MÉTODO DEL DÍA, que es mío y no del ejecutor:**
Al resolver que el filtro no cabía en la columna estrecha, propuse plegarlo. Como el `open`
inicial de un `<details>` **no se puede fijar por ancho**, la salida era "plegado en los dos" — y
ahí **decidí yo que el cambio en móvil era aceptable** y lo argumenté como mejora.
**Antonio había dicho "cero cambios en móvil". Era una instrucción, no una preferencia.**
→ *Un hueco en el encargo se rellenó solo.* Se revirtió: el filtro va **sin plegar**, y en móvil no
se tocó nada más.
⭐ **De aquí sale la norma nueva:** no puedo tomar decisiones que no se me han dado — **ni
"neutras", ni "mejoras", ni efectos colaterales que yo considere aceptables**. Si una petición
obliga a tocar algo fuera del encargo, **me paro y pregunto ANTES de escribir el prompt**.

### 23/07 (noche) — Créditos, títulos y cabecera

**`5d51dfa` — fuera el aviso de la ficha de parada.** *"Son los autobuses DETECTADOS, no todos…"*
Retirado junto con **el guardián que lo exigía** (ver L33) y **dos** referencias e2e huérfanas
*(la segunda, `revision.spec.ts:202`, medía su contraste y no estaba en mi lista — la cazó él)*.
⚠️ La variante de `/sobre-los-datos` **se queda**: ahí está en su sitio.

**`9a40c9f` — créditos y títulos.**
- ⛔ **Atribución OSM corregida** (ver L35). Único `TileLayer` de la app: no había copia a mano.
- **El pie reescrito:** *"Recorridos: GTFS de Avanza Zaragoza (Punto de Acceso Nacional),
  procesados."* Nombra la fuente y el NAP, que antes faltaban. **`Powered by MITRAMS` y su enlace
  a `transportes.gob.es`, verbatim.**
- ⭐ **Los enlaces del pie medían 14 px y 24 px de alto** — *y el de 14 era el **obligatorio***.
  Subidos a 44 y con el mismo peso. ⚠️ Un enlace táctil de 44 px **dentro de la prosa reventaba
  el interlineado**, así que el pie se partió en dos: **prosa arriba, enlaces en su fila**.
- **Títulos por página**, con plantilla del framework (el layout declara, cada página aporta).
  ⭐ **Dos gotchas de Next cazados leyendo `document.title` en el navegador, no suponiendo:**
  (1) la plantilla **no envuelve el segmento raíz** → la home escribe el título entero;
  (2) un `notFound()` desde ruta dinámica usa **el metadata de esa ruta**, no el de
  `not-found.tsx`. *Sin comprobarlo, la home y las rutas inválidas habrían salido mal y nadie lo
  habría visto.*
  · La línea circular sale **`ZetaBus | Línea Ci3`**, sin sentido: **no lo inventa.**

**`c99e747` — barrido del nombre.** ⭐ **Y la conclusión es la buena: NO estaba disperso.**
`NOMBRE_MARCA` vive en `marca-fuente.ts` *(el nombre donde vive la Z: una fuente para la
identidad, no una para el dibujo y otra para el texto)*. Solo **1 sitio de pantalla** quedaba a
mano → sin guardián.
⚠️ **Excepción declarada:** `global-error.tsx` escribe el nombre a mano **a propósito** — es la
página que sustituye al layout raíz cuando ha reventado y **no puede importar `marca-fuente` por
si el módulo que falló es justo ése**. Con su comentario al lado, para que dentro de seis meses
nadie lo confunda con una copia a mano.

**`21eeb0d` — la cabecera equilibrada.** Banda 61 → **53 px**; símbolo 18,4 → **23 px**; wordmark
16 → **20 px**. La marca pasa del 33 % al 44 % de la banda. Táctil **109,6 × 44**. Centrado −0,01.
⭐ **Y el suelo declarado (L34): la banda no puede bajar de ~45 px.**

### 23/07 (tarde) — ⭐⭐ EL MOTOR NUEVO: índice diario de correspondencias

**La idea es de Antonio, y sustituyó a una arquitectura mía sobredimensionada.** Yo estaba
montando un índice inverso en tiempo de página (74 peticiones en carga fría, relleno progresivo,
TTLs). Él le dio la vuelta: **un artefacto que se regenera de noche**, como ya se hace con
`gtfs.json`. El proyecto ya tenía el patrón y yo no lo vi.

**Cómo funciona:**
- Se parte de la lista fija de postes del `gtfs.json`.
- Se barren **74 sentidos** (44 líneas) pidiendo el recorrido **de HOY**.
- Poste que no está en la lista → **se añade** (cubre los 9 que Avanza da y el GTFS no).
- Y la línea se anota en **uno de dos campos**: `normales` (el par poste-línea SÍ está en el
  recorrido oficial) o `provisionales` (**no** está: hoy pasa por desvío).
  ⚠️ La distinción sale de comparar con `official.stops`. **Cero peticiones extra.**

**Medido en el barrido real:** 74/74 sentidos · 2.034 pares · 918 postes GTFS · 9 solo-barrido ·
**32 postes con provisionales** · 14 líneas desviadas · **fichero de 91 KB**.

⭐ **El acierto que nadie vio venir:** como se itera **lo de hoy**, una línea cuyo oficial pasa
por P pero que hoy va desviada lejos de P **simplemente no aparece en P**. Por eso **las normales
también son de HOY**, y el rótulo *"habitualmente"* **se ganó el retiro de verdad**, no de boquilla.

**Las tres correcciones del ejecutor, todas aceptadas:**
- **H1 · Fuera del bundle, leído en runtime.** No por peso (91 KB): **por mutabilidad**. Un
  fichero que se regenera de noche **no puede hornearse en el build**.
- **H2 · Fuera `nombre`/`lat`/`lon` de los 934 postes.** Los metí yo y **duplicaban el GTFS** —
  justo lo que el proyecto mata. Y midió que `get_stops_list` **no da coordenadas**: para los 9
  postes nuevos ese campo era **imposible**, no solo redundante.
- ⭐ **H5 · EL DESFASE DE UN DÍA MIENTE EN DOS DIRECCIONES, y yo solo vi una.** No solo *faltan*
  desvíos nuevos: también **SOBRAN los que terminaron anoche**. Si la 22 vuelve a su ruta esta
  mañana, el fichero la sigue pintando como provisional en un poste donde hoy no para.
  ⚠️ **Eso es un chip FALSO, no un chip incompleto.** Un aviso falso, no un silencio falso.
  *Aceptado a sabiendas, declarado en `/sobre-los-datos`.*

**Las tres decisiones de Antonio:**
- **Se guarda el sentido** (*"36 · Hacia Picarral"*). Motivo de uso: en una marquesina la pregunta
  no es *"¿para aquí el 36?"* sino *"¿el 36 que para aquí va hacia donde yo voy?"*.
  ⚠️ Y el argumento que lo cerró: **el sentido de una provisional es irrecuperable** — no está en
  el oficial, así que si no se guarda en el barrido **se pierde para siempre**.
- **Red de resiliencia:** sin fichero, las normales se calculan del GTFS. **No son dos fuentes que
  divergen: es una fuente y un modo degradado**, y el degradado se nota en `/api/diag`, no en la
  pantalla del usuario.
- **Los 9 postes entran, y el panel avisa** para buscar sus coordenadas a mano **una vez**: las
  paradas son **acumulativas**, así que la coordenada sobrevive al borrado diario
  (`observacion_propia` del sistema de procedencia que ya existía).

**Contingencia:** borrado y reconstrucción diaria · **nunca un fichero parcial** *(40 de 44 líneas
parece completo y no lo es: un silencio falso escrito en disco)* · temp → re-verificar → rename
atómico con `.bak` · contadores de `control.ts` que **mueren** · `generadoEn` escrito **el último**.
**Reintentos:** 1 h después, máximo 3 al día; al siguiente se reintenta igual.

⭐ **Y el caso que validó guardar el sentido, y no estaba en el diseño:** el poste **1228** muestra
la **40 dos veces** — *"Hacia San José"* como normal y *"Hacia Plaza Aragón"* como provisional.
**La misma línea, un sentido normal y el otro desviado.** Sin el sentido, esa línea saldría **una
sola vez** y habría que elegir si es normal o provisional: **cualquiera de las dos sería mentira.**

**`transbordosDe` Y `lineasQuePasanPor` retiradas las dos.** ⭐ *Buena pesca del ejecutor: retirar
una y dejar la otra calculando **no es "una fuente"**.*

**Revertido después (`b173f5f`):** el recuadro `POR DESVÍO` en el **itinerario** — no convencía.
⚠️ **En la página de parada SÍ se queda** (dos cajas hermanas). Y el chip `PROVISIONAL` del poste
**no se toca**: dice otra cosa (*este poste no es de esta línea*), y **la palabra se lee sola —
un icono habría que aprenderlo**.

### 23/07 — Logo integrado y cerrado · el `next dev` roto, resuelto

**Tres commits que cierran el logo:**
- `e987e29` — **integración**: fuente única `Z_PATH`, favicon como recorte real
  (`app/icon.tsx` interpola el path, no lo redibuja), `<Marca>` con tokens y
  `translate="no"` en el wordmark, y el **guardián `marca-z-unica.test.ts`** que caza
  cualquier Z **por su forma** (4 vértices, barra-diagonal-barra) en un sitio nuevo — no
  por una lista. Contraprueba: Z plantada a mano → rojo; retirada → verde.
- `4ab2d14` — **`VISTA_MARCA`/`VISTA_FAVICON` unificadas** en una sola `VISTA`. El fallo lo
  cacé **leyendo el fichero**, con 382 unit + 687 e2e en verde y el favicon verificado en la
  pestaña: **ningún test miraba la ventana**. ⚠️ Pero mi diagnóstico era **falso** (ver L29):
  el ejecutor lo desmintió con el bbox real. **El arreglo bueno era el del comentario**, no
  el de la constante — apretar la ventana daba **0 px** de ganancia a cambio de un trazo 9 %
  más gordo que arriesgaba los contratrazos.
- `3b70c93` — **`POSTE.yBase` vigilado** (L30) y su comentario explicándose solo.

**`a1ab30a` — el `next dev` que devolvía 500, resuelto** (L28). Lista blanca de fuentes de
Tailwind + tripwire `tailwind-solo-src.test.ts` que se pone rojo si alguien quita
`source(none)` creyéndolo una restricción gratuita.
**Contraprueba en las dos direcciones:** centinela **dentro** de `src` → aparece en el CSS;
**fuera** → no aparece. *Sin las dos, "0 errores" podría significar "ya no escanea nada".*
Y el recuento de clases como red: **37/37** *(el instrumento se corrigió a sí mismo: los "40"
de la primera pasada incluían 3 falsos positivos de comentarios)*.

### Lo cerrado en la Tanda 7

- **Chips de bus y sentido de línea** ("Hacia X" + título A→B con rumbo; bucles por geometría, no
  por nombre).
- **Bloque de terminal** → simplificado a la **tabla pelada** de la web de Avanza. Se jubiló todo
  el aparato de índices 1/2, terminal dinámico y cabecera modal.
- **`/sobre-los-datos` rediseñada**: tres familias, tabla de procedencias con los símbolos reales
  del mapa `MARCAS`, y **números DERIVADOS del dato, no cableados** (contraprueba: se añade un
  vehículo y la página cambia sola).
- **Guía visual `/interno/sistema-visual` completa** (26 copias a mano → 0), con test guardián
  anti-hex/radio/sombra crudos.
- **Lienzo `--color-fondo` 1.10 → 1.23:1** (`#e2e8f0`). ⚠️ **El objetivo de 2:1 es imposible**: lo
  topa `--color-tinta-tenue`, que necesita AA. **Techo declarado.**
- ⭐ **El itinerario entra en SUPERFICIE** (una tarjeta con `divide-y`). Arregló **dos elementos
  INVISIBLES**: el chip de poste (era `var(--color-fondo)` sobre lienzo = **1.00:1**, la pastilla
  nunca existió) y el acuse táctil.
- **Rayado de suprimidas suprimido** → fondo ámbar + borde de aviso. Ver L12.
- **Acuse táctil PERSISTENTE** (`useLinkStatus` de Next, no `setTimeout`). En itinerario, chips,
  buscador y botonera. **Las tarjetas de llegada NO navegan** (seleccionan bus) → no llevan acuse.
- **Suelo de zoom 14 → 13** tras spike sobre 90 paradas: **se recortaba el 70,7 % de las aperturas
  → 22 %**. El pin es `divIcon` de 22 px fijos: **no encoge**.
- **Aviso de encuadre** con la distancia real ("a 7,7 km"), ámbar, y "Encuadrarlo" en singular.
- **Banda de demo FUERA** → marca precisa por página, solo con `?fingir=` activo. Ver L14.

**Y el bloque de salidas, rehecho contra el dato de toda la red (20/07):**
- ⭐ **Modelo estándar** (`docs/MODELO-BLOQUE-SALIDAS.md`), **verificado contra los 65 sentidos con
  tabla**, no contra una muestra. Cuatro reglas, **cero casos especiales**: cabecera con el par
  mayoritario (calculado sobre primeras+últimas juntas), **horas en flujo en orden cronológico**,
  letra volada para toda salida fuera del par, y una línea de pie por marca.
  ⚠️ **La clave: 18 de los 19 sentidos con excepción están ENTRELAZADOS** — cualquier modelo que
  agrupe por servicio rompería el orden, que es la información.
  **Resultado: la 33 `-2` (43 filas, la más larga) baja un 64 % de alto.**
- **La frecuencia se CITA, no se calcula** — y se enseñan **los tres tipos de día**. ⭐ El motivo es
  de corrección, no de espacio: enseñar solo "el de hoy" exigiría clasificar festivos, y **no hay
  calendario de festivos fiable**. Los tres nunca mienten.
  *(El `<p>` de la frecuencia va FUERA de `#infoCaracteristicas`; por eso el parser no lo veía.)*
- **Los 23 sentidos sin tabla** (14 búhos + 9 `-2` vacíos) dicen **"Avanza no publica los horarios
  de esta línea"**. Un bloque vacío miente por omisión. *(Y tampoco tienen frecuencia: verificado
  contra el HTML crudo, no está en origen.)*
- **Fuera "EL RECORRIDO · 32 PARADAS / LA RUTA DE HOY, SEGÚN AVANZA"** y **"FUNCIONAMIENTO DE
  TERMINAL"**: recuento que se ve, y procedencia que ya está en `/sobre-los-datos`. ⚠️ **Pero el
  aviso "es la hora de salida, no la de paso por tu parada" SE QUEDA** — no es procedencia, es una
  advertencia contra un malentendido con consecuencias. *(Y el nombre de la región pasó al
  `aria-label`: quien navega por encabezados no lo pierde.)*
- **La nota de "puede estar suprimida sin que se note" entra DENTRO del cuadro ámbar** y se reduce
  a lo accionable. Pegada a las paradas caídas dice algo más afilado: *"hemos encontrado 5, puede
  haber más"*.
- **Versión de forma en la clave de la caché de horario** (`horario-web:f2:…`). Ver L18.

**Y el pulido de cierre del 20/07 (tarde):**
- **Aviso de desvío encogido a CHIP.** Era una caja de 4 líneas que redundaba con el cuadro de
  suprimidas (que lista las caídas) y con el itinerario (que ya marca las provisionales). Queda
  *"⚠ Esta línea está DESVIADA hoy"* en su cápsula ámbar. ⚠️ **Sin causa**: ZetaBus no sabe si es
  obras, cabalgata o un corte — solo que la ruta de hoy difiere de la oficial.
- **La "Información adicional" (19 de 44 líneas) baja DENTRO de la tarjeta del itinerario**, pegada
  encima del cuadro de suprimidas, con **marco neutro**.
  ⚠️ **Ámbar NO**: el ámbar significa *algo de hoy*; esto es cómo funciona la línea **siempre**. En
  ámbar, media red tendría un cuadro de alarma permanente.
  ⚠️ Y **borde de color de línea NO**, pero por un motivo distinto del que yo supuse: las tres
  líneas que señalé como riesgo (25, 31, 33) **no tienen info adicional** — el cuadro no aparece
  nunca en ellas. Midiendo las 19 que sí, **4 no llegan a 3:1 sobre papel** (la 29 amarilla:
  **1,68:1**). *El riesgo era real, pero estaba en otro sitio del que yo decía.*
- ⭐ **El bloque de parada, de 3 filas a 2.** Poste + `PROVISIONAL` + transbordos en **una sola
  fila**, todos a la altura del chip de línea. `PROVISIONAL · DESVÍO` → **`PROVISIONAL`** (las
  provisionales solo salen cuando hay desvío; el chip de arriba ya lo dice).
  **Medido: la 21 baja de 3.487 a 2.929 px (−16 %), y solo 2 de 32 paradas se desbordan a 3 filas.**
  ⚠️ El stretched link sobrevivió porque **el `<div>` de la fila es estático** → no crea contexto
  de apilamiento → el `z-index:1` de los chips sigue valiendo. Contraprueba: romper el z-index puso
  **dos tests en rojo**.
- **Contorno de tinta (2 px) a los dos macrobloques** — itinerario y salidas. Mismo grosor que el
  ámbar del aviso: **un solo grosor en toda la vista**. Resuelve que la franja negra de frecuencia
  pareciera salirse de la caja.
- ⭐ **Los chips de la home: margen uniforme.** Estaban a 24 px del borde izquierdo y a 8 del
  superior. **De esos 24, la mitad era un culpable invisible:** `<AcuseDeToque>` es un `<span>` sin
  tamaño, pero **dentro de un flex es un ítem** y se comía una ranura de `gap-3`. *Un componente
  invisible ocupando espacio.*

### 21/07 — La skill de diseño, auditada antes de usarla

Se instaló `web-design-guidelines` (Vercel Labs) en `.claude/skills/`. **Antes de auditar con ella,
se la auditó a ella.**

⭐ **Y de ahí salió lo mejor: la skill NO era autónoma.** Hacía `WebFetch` a
`raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` **en cada
ejecución** — sus criterios los descargaba de un repo ajeno, en `main`. Consecuencias: reglas que
podían cambiar sin avisar, informes **no reproducibles**, y nadie había leído nunca el contenido
real (el `SKILL.md` local son 1.231 bytes).
→ **Congelada:** `docs/web-interface-guidelines.SNAPSHOT.md`, cita verbatim con procedencia (URL,
SHA `d0a657b` de 2026-04-06, fecha de descarga). *La fuente, citada y congelada — como el Anexo 5.*
→ Y el cableado como **receta, no artefacto**: `scripts/setup-skill.mjs` (idempotente), porque
`.claude/` está en `.gitignore` y el `SKILL.md` modificado no viaja al clonar.

**Resultado de la pasada:** de 73 reglas, **~48 mudas** (Forms, Images, Hydration, Dark Mode,
Touch… no aplican a server components de presentación), **5 en choque** con decisiones medidas
(truncado, Title Case en inglés, reescribir una cita, `Intl` sobre horas citadas, estado por tono)
y **4 hallazgos reales**.

⭐⭐ **Y uno de los cuatro justificó el rato entero: `translate="no"`.**
> **El traductor del navegador puede reescribir una cita literal de Avanza, en silencio.** Todo el
> principio de *"se cita, no se razona"* lo deshace el usuario dándole a «traducir esta página» —
> y **ningún test lo caza, porque el ataque viene de FUERA del código.**

Ninguna regla del proyecto lo cubría: todas miran hacia dentro. *Una regla genérica de una skill
ajena acabó protegiendo una regla medida propia.*

→ ⭐ **Componente `<Cita>`** (`<span translate="no" data-cita>`) en los **8 sitios** donde se pinta
  un string verbatim de una fuente externa. **Un sitio decide, y no se vuelve a olvidar** — la ley
  de las 26 copias a mano. *`Cita` y no `Dato`: «dato» es lo que el motor calcula; «cita» es lo que
  otro publicó y repetimos sin tocar.*
→ **Guardián que enumera CAMPOS, no sitios**: mete un centinela en los campos externos y exige que
  ninguno sobreviva fuera de `[data-cita]` → caza un render nuevo, no solo la lista conocida.
  Contraprueba en rojo.
→ ⚠️ **Alcance declarado, no escondido:** el cierre total exigiría **ramificar el tipo** (que el
  dato externo no sea `string`, y el compilador impida pintarlo sin `<Cita>`). Refactor mayor,
  anotado como escalada. *"Preferí decírtelo a montar un verde que no mira."*
→ Cobertura medida: home 44/44 · línea 36/36 · parada 1/1 · buscador 52/52.

### 21/07 (tarde) — Los nombres, y el buscador en tres pasadas

**La home pasa a dos renglones, uno por destino.** El nombre largo ya no se parte donde cae:
`[21] Barrio Jesús / Oliver / Miralbueno`. Solo las **24 diurnas de doble sentido** + C1/C4; las
circulares, las de sentido único y los búhos se quedan como estaban. **Las tarjetas NO crecen**
(66 px antes y después: los dos renglones caben en la altura del chip).

⚠️ **Y ya comprobamos que partir el nombre por los guiones NO vale:** `Barrio Jesús - Oliver -
Miralbueno` tiene tres partes y **"Oliver" no es terminal** — es un barrio de paso. Los destinos
salen de `trip_headsign`, la **misma función** que la botonera "Hacia X" (una sola verdad).

⭐ **Y la barra `/` NO separa: es una ZONA.** `Oliver / Miralbueno` y `Montañana / Peñaflor` son
**una sola cabecera nombrada con dos barrios**. Dato de campo de Antonio — no está en ninguna
fuente. No se parte por ahí, nunca.

**Iconos de circular** (↻ horario: 30, 54-59, Ci1, Ci3 · ↺ antihorario: Ci2, Ci4), al final del
nombre para no romper la columna alineada. **El sentido de giro también es dato de campo.**

⭐ **Y el diseño que lo hace robusto: el override se indexa por `(línea, headsign)`, NO por
`directionId`** — porque el feed a veces intercambia los sentidos, y **el texto del headsign es
estable**. Si se indexara por dirección, el día que el GTFS cambie el orden, las correcciones se
aplicarían al destino equivocado.

**Correcciones de nombre** (`Carlos Quinto` → **`Carlos V`**, romano; `Avda` → `Avenida`;
`Estacion` → `Estación`; los guiones de `Actur-Rey Fernando`; `de las` → **`de Las`** Canteras).
De **10 líneas que se contradecían** entre `longName` y destinos, a **0**.
⚠️ Hallazgo: **el `ucwords()` destrozó los HEADSIGNS, no los `longName`** — por eso este campo
traía los acentos bien y solo había **8 rotos de 44**.
⚠️ Y esto **cruza de citar a corregir**: por eso los topónimos corregidos van en `<Toponimo>`
(hermano de `<Cita>`: `translate="no"` pero **sin** `data-cita`, porque ya no son verbatim).

**Los cuatro subtítulos de los grupos, fuera** (*"las de todos los días"*, *"dan la vuelta"*…).
Mismo criterio que "EL RECORRIDO · 32 PARADAS". *La gente sabe leer.*

**EL BUSCADOR, EN TRES PASADAS ENCADENADAS** — *"que refleje la realidad completa"*:
1. **Que escriba bien** → los 8 `longName` rotos.
2. **Que encuentre lo que se teclea** → ⚠️ corregir *rompió* dos búsquedas (`quinto` ya no
   encontraba la 53). Resuelto con **alias por línea, NO global**: los romanos están por toda la
   red (*Juan Pablo II, Pedro III, Carlos V, Beethoven, V. Broto*) y un `quinto→v` global
   **arrastraría media red**. Medido: `v` → 0 resultados.
   ⚠️ Y una corrección honesta: `avda` **no era regresión nuestra** — la 60 ya estaba ahogada bajo
   335 paradas "Av.". El fallo era de ORDEN, no de texto.
3. **Que indexe los destinos** → el hueco resultó **mucho menor de lo previsto**: la pasada 1 ya
   había metido casi todos los destinos en el `longName`. **Solo fallaban las 4 circulares**
   (se llaman "Circular N" y su nombre no dice a dónde van).
   ⚠️ Y el ruido que temíamos **no se materializó**: `miralbueno` sigue dando 4 resultados porque
   no existe ninguna parada con ese nombre exacto. *Medido, no supuesto.*

**Y fuera la PROCEDENCIA de la vista de parada.** Las marcas (`*` `†` `?`), el enlace *"De dónde
sale cada dato"* y **el borde punteado de los chips** — las tres a la vez, porque quitar la marca
y dejar el punteado deja un borde raro sin nada que lo explique.
> *"Al usuario le importa tres pimientos de dónde saques el dato."*
La procedencia sigue entera en `/sobre-los-datos`. **419 líneas fuera, 86 dentro**, y la fila más
alta baja 19 px: los cuatro niveles ahora se ven idénticos.
⚠️ Se queda el chip **"Sin datos de este autobús"** con su punteado: *no es procedencia, es
ausencia de dato* — y eso sí le importa al usuario.

**Y el resto del pulido del 22/07:**

- ⭐ **EL AVISO DE DESVÍO ES UN ACORDEÓN** (`<details>`/`<summary>` nativo, sin JS). El chip estaba
  arriba y el cuadro de suprimidas abajo, **separados por 30 paradas**: el aviso no llevaba a
  ninguna parte. Ahora el chip ES el `summary`, y al desplegarlo aparece **todo** el cuadro
  (titular, explicación, lista tachada, y la nota de *"puede haber otras que no detectamos"*).
  **El cuadro de abajo desaparece.** Fuera del acordeón no queda nada — el chip `PROVISIONAL` del
  itinerario ya marca las afectadas. **Ahorra 211 px de alto en la vista.**
  ⚠️ Nativo a propósito: accesible por defecto, contenido en el DOM aunque esté plegado (Ctrl+F lo
  encuentra), y **abre seco** — se prefirió eso a convertir un server component en cliente solo por
  la animación.
  ⚠️ Si hay desvío pero **ninguna parada cae** (solo altas o reordenación), el chip se queda chip:
  un acordeón vacío sería un botón que no hace nada.
  ⭐ **Y de paso destapó que la demo no podía enseñar un desvío:** el transporte fingido no devolvía
  ruta parseable → siempre `indeterminado`. Se añadió `?fingir=desviada`. *Estábamos construyendo
  el acordeón del desvío en una demo donde el desvío no existía.*

- **Icono de poste** junto al nombre de la parada. **SVG propio inline**, monocromo
  (`currentColor`, trazo no relleno). ⚠️ Nunca un color: los 44 chips de línea están debajo en la
  misma pantalla. Medido: **saturación 0,13** frente al 0,40+ de un color de línea.
  *"Un SVG suelto no es una librería de iconos: es un carácter más, como el `⚠`, dibujado por
  nosotros."*

- **Navegación de vuelta, simétrica.** La flecha de la parada vuelve **a la línea de la que
  vienes** (`?desde=<línea>`), o a la home si no hay origen. Y la vista de línea estrena flecha
  a la izquierda del chip → home. Ambas a 44 px con `aria-label` que dice **a dónde** va.
  ⚠️ Inventario comprobado: a una parada **solo se llega desde el itinerario y el buscador**.
  `?desde=999` o `?desde=abc` caen a la home sin reventar.
  ⚠️ Criterio del enlace compartido: se acepta que lleve a la línea. *"La flecha es una comodidad
  de navegación, no una afirmación sobre la parada."*

- 🔜 **Anotado para la fase de widgets:** la tarjeta de llegada podría componerse en **dos alturas**
  (chip y tiempo abarcando dos líneas, chips del bus más grandes) — pero **a 360 px no cabe**.
  Es una regla de layout que solo aplica por encima de cierto ancho.

---

## 8 · Cabos abiertos

**Para cerrar la Tanda 7:**
- ✅ **LOGO CERRADO** (`e987e29` · `4ab2d14` · `3b70c93`). Fuente única, favicon derivado,
  3 guardianes verdes, `POSTE.yBase` vigilado. Detalle en §1 y §7.
- ✅ **`next dev` arreglado** (`a1ab30a`) — ya no hace falta borrar `.next`. Ver L28.
- ✅ **CABECERA Y NAVEGACIÓN** (`03bd952` · `af2e2ab` · `6e9738f` · `6d73fe1` · `b173f5f`):
  coletilla fuera (sigue en el `<title>`, que es su sitio) · flechas fuera · logo **centrado** y
  ≥44 px · sección *"Líneas que pasan por aquí"* · **icono de nodo** · secciones **plegables**
  (`<details>/<summary>` nativo, todas abiertas al cargar) · contador `(31)` fuera.
- ✅ **MOTOR DE CORRESPONDENCIAS** (`34cb5c0` · `0b6d8cb` · `ccd2722` · `5bf3b5a`). Detalle en §7.
  El fichero está **gitignorado** y `npm run build` lo genera si falta (`correspondencias:ensure`).
  ⚠️ Si Avanza está caído durante el build, **el build no muere**: avisa de que la app arrancará
  en degradado y con qué comando se arregla.
- ✅ **PANTALLA ANCHA — HOME Y /PARADA.** Detalle en §7. Los cortes salen del **suelo del
  contenido**, no de breakpoints redondos *(home: 280 px por tarjeta → 2/3/4 col; parada: 380 px
  de columna derecha → corte en 880)*.
- ✅ **PANTALLA ANCHA — `/linea`** (`3f82fc4` · `3345e15` · `b9e5dd5` · `6742a73`). Detalle en §7.

**✅ TANDA CORTA — cerrada el 24/07.** Los cuatro cabos (verificación del fichero, guardián del
nombre, flaky y guía de estilo). Detalle en §7.

**✅ CIERRE · PARTE A — EL MOTOR** (`02db45d` · `d2aa753`). Detalle en §7.
Ningún fallo grave. ⚠️ Con dos garantías **declaradas NO PROBADAS con motivo**: la escritura
atómica y `generadoEn` *(su fallo produce dato de anoche, no una mentira)*.

**✅ CIERRE · PARTE B — LA SUPERFICIE** (`5ba754b`). Detalle en §7.
2.024 cargas + 96 comprobaciones finas. **108 hallazgos en bruto → 106 del instrumento → 1 real.**

**✅ LOS DOS CABOS DE LA PARTE B — CERRADOS** (`0276170` · `6d44eec`). Detalle en §7.
*(Las zonas táctiles de 24-43 px se quedan: **cumplen WCAG 2.5.8**, llevan el token
`--control-min` —el suelo está puesto, no olvidado— y subirlas haría gigante el recorrido.)*

**⬜ LOS HERMANOS — huecos de cobertura listados, NO arreglados:**
- ⭐ **El MODO DEGRADADO del índice en pantalla.** Ningún fingimiento toca
  `correspondencias.json`; si falta, desaparecen las provisionales y **ese estado no lo ha visto
  nunca un test**. ⚠️ *Lógica probada, superficie sin ejercitar — la misma forma que el hueco que
  se acaba de cerrar.* **Es el que el ejecutor cogería primero.**
- El **estado rancio de la caché** en pantalla (probado en vitest, sin fingimiento en navegador).
- `src/sources/avanza/kml.ts`: **hace una petición de red y nadie lo importa.** *O es código
  muerto o es un cabo.*

**✅ EL MACROBLOQUE DE AUDITORÍA — CERRADO** (`9855851` … `1dd420e`). Detalle en §7.
Código, perímetro y rendimiento auditados **y** implementados. Los cuatro graves arreglados
(README, `/api/diag`, la fórmula WCAG, el bundle −78 %), las licencias completas, el guardián del
README con su vigía, y **los 4 documentos rancios rectificados sin reescribir**.

**✅ Y EL CIERRE DOCUMENTAL** (`f7a642d` · `0d8c473` · `827ec2b`): el marco de móvil, el guardián
validando contra `git ls-files` con **48 ficheros y 5 formas de enlazar**, y el spike sin las
capturas que nunca viajaron. Detalle en §7.

**⬜ LO QUE QUEDÓ LISTADO Y NO SE TOCÓ — decisiones, no olvidos:**
- **Partir `LlegadasVivas.tsx`** (505 líneas, 6 componentes, 4 responsabilidades). Se puede, pero
  **cuesta re-verificar cuatro specs**.
- **Los 6 errores de eslint en `TokensVivos.tsx`** (`react-hooks/set-state-in-effect`), verificados
  como **anteriores** a todo esto y fuera de lista.
- ⚠️ **El tope global de claves nuevas por minuto** — la causa de fondo del riesgo del rastreador.
  *"El `robots.txt` tapa el caso conocido, no el que no hemos pensado."*
- **`sitemap.xml`**: no estaba en la lista aprobada. Sigue sin haberlo.
- **Enlazar la demo** en el README: `zetabus.antonioblanquez.es` **no responde todavía** (000).
  Cuando esté, hay que convertir la nota en enlace y añadir `Sitemap:` al `robots.ts`.
- ⚠️ **El techo del guardián de enlaces, declarado:** no cubre **anclas** (`#fragmento`), ni enlaces
  **externos**, ni rutas citadas **en ficheros que no son `.md`**, ni —lo más difícil— **que el
  destino diga lo que promete**. *Eso último es el ojo, en el cierre de tanda.*

**Y después: LA TANDA 8 — el despliegue y lo que depende de él.**
- 🔜 **DESPLEGAR.** Hoy ZetaBus corre en local con `npm run dev`. **Todo lo de abajo depende de
  esto**: sin algo encendido, no hay proceso nocturno que valga.
- 🔜 **El cron de las 02:00** para regenerar el índice de correspondencias. Franja sin servicio
  (entre las 2 y las 5 no hay buses entre semana; los búhos son de finde).
  ⚠️ **Cron de Hostinger, no GitHub Actions:** el artefacto es de **runtime**, no de build — un
  Action lo generaría en CI y habría que hacérselo llegar a la app desplegada.
- 🔜 ⭐ **EL PANEL DE CONTROL PÚBLICO**, sobre `/api/diag` (que ya expone `generadoEn`, vigencia
  del feed y contadores). Enseña las tripas: cuándo se regeneró cada artefacto, cuántos registros,
  si algún contador no cuadró, y **qué postes están sin coordenadas**.
  ⚠️ **UN PANEL DE ESTADO ES UN INSTRUMENTO.** Tiene que leer el **ARTEFACTO** que se sirve (su
  `generadoEn` de finalización), **nunca un registro de que se intentó**: un `empezadoEn` daría
  **verde sobre una regeneración fallida**.
- 🔜 **El guardia `paradaDelPoste`** para hacer visitables los 9 postes solo-barrido. Hoy dan 404
  limpio. ⚠️ Decisión aceptada: **va aparte**, porque hacerlos visitables **sin coordenadas** (y
  por tanto sin mapa) sería peor que esperar a resolverlas.
  → El panel avisa de cuáles son; Antonio busca sus coordenadas **a mano una vez**, y como las
  paradas son **acumulativas**, la coordenada sobrevive al borrado diario (`observacion_propia`).
- ⬜ Chorradas de **redacción de textos**.

## 9 · Método y entorno

**Levantar:**
```
cd F:\01_PROYECTOS\003_ZETABUS
npm run build
$env:ZETABUS_DEMO=1; npx next start
```
→ `localhost:3000` (360 px: F12 → móvil).
⚠️ **Puerto ocupado:** `Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object
OwningProcess` → `Stop-Process -Id <PID> -Force`. **Un `next start` viejo rondando es cómo el
instrumento mintió tres veces en un día.**

**Stack:** Next.js 16 + TypeScript + Tailwind 4 + Leaflet/OSM. **Sin BD** (todo derivado y
horneado en build). Vitest + Playwright. ~112 e2e + ~304 unitarios.

**Repo:** `github.com/ablanquez/zetabus` (público, Apache-2.0). Identidad de commits `ablanquez`,
**cero coautoría**. ⚠️ **Push al final de cada tanda** — regla fija (ver L17).

**Referencia (solo consulta):** `00 ZGZ RADAR` en `E:\PROYECTOS WEB\00 ZGZ RADAR`
(`npm run dev -- -p 3002`).

⭐ **El conocimiento de campo de Antonio ha ido por delante del análisis repetidamente**: destapó
las salidas parciales, las obras, el flip de terminal de la 44 y la tabla web de Avanza. **En
usabilidad manda quien la usa.**

---

## 10 · La frase que resume el proyecto

> **El GTFS oficial da la topología, pero miente cuando hay obras — y por calendario.**
> **La API viva da la ruta real, pero no las supresiones.**
> **La web del operador da el horario de hoy, pero solo unas semanas.**
> **El comunicado da las supresiones, pero no caduca.**
> **Y a veces no responde ninguno.**
>
> **ZetaBus los cruza. Y cuando no sabe algo, LO DICE.**

*(Probado el 13/07: **Avanza se cayó de verdad** a mitad de una tanda. La pantalla dijo "no
hemos podido contar los autobuses; **esto no significa que no haya, significa que no lo
sabemos**". Nadie lo forzó. Pasó.)*
