# 09 · El motor contra la interfaz

> **La capa nueva del agujero.** No es que el código esté mal. Es que **está y no se usa**.
> Auditoría del 14/07/2026, antes de tocar nada.

---

## El hallazgo, en una frase

> **Se construye la pieza. Se verifica la pieza. Y nadie comprueba que la pieza esté enchufada.**

**344 tests en verde. Y ninguno miraba si la pantalla usaba el motor.**

Cada test probaba su módulo. Ninguno probaba **la flecha entre dos módulos**. Y una flecha que no
existe no rompe ningún test: simplemente no está.

---

## 1 · El método (que también es el hallazgo)

Un test unitario pregunta *"¿esta función hace lo que dice?"*. Nunca pregunta *"¿alguien la llama?"*.
Así que la auditoría no se hace con tests: se hace **contando imports**.

```bash
# Lo que EXISTE en el motor:
grep -rh "^export" src/engine src/sources src/core src/cache

# Lo que la PANTALLA importa de verdad:
grep -rh "from '@/" src/app src/components
```

La diferencia entre las dos listas **es el agujero**.

---

## 2 · El inventario, ANTES

| Pieza del motor | ¿Existe? | ¿Probada? | ¿**Enchufada**? |
|---|---|---|---|
| `desviosDeLinea` / `compararRecorrido` | ✅ Tanda 3 | ✅ 12 tests | ⛔ **NO** |
| `kml.ts` (`comprobarKml`, `parsearKml`) | ✅ Tanda 3 | ✅ 304 verificado | ⛔ **NO** |
| `leerRecorrido` (`get_stops_list`) | ✅ Fase 7B | ✅ | ⛔ **NO** (solo vía desvíos, que tampoco) |
| `LlegadaViva.posicion` (GPS del bus) | ✅ | ✅ | ⛔ **NO** — no había mapa |
| `LlegadasDeParada.posicionParada` | ✅ | ✅ | ⛔ **NO** |
| `directions[].official.geometry` | ✅ (en el artefacto) | ✅ | ⛔ **NO** — nunca se dibujó |
| `BusProfile.plate` / `.registeredOn` | ✅ | ✅ | ⛔ **NO** |
| `transbordosDe` | ✅ | ✅ | ⚠️ pintado… y **sin enlace**, se creía |
| `modes/tram/profile` | ✅ | ✅ | ⛔ NO — **deliberado**: es el hito 004 |

### ⛔ Y el peor: `desviosDeLinea`

Estaba **escrito, medido y probado desde la Tanda 3**. Sabía que la línea 35 no pasa por Avenida
Valencia. Lo verificamos. Lo documentamos. **Y la pantalla seguía pintando la ruta del GTFS.**

**ZetaBus le estaba diciendo a alguien que su autobús para en una calle cortada.** No petaba:
**pintaba**. Con toda la coherencia del mundo. Que es exactamente el modo de fallo que este proyecto
existe para no tener.

---

## 3 · ⚠️ Y lo contrario: lo que SÍ estaba enchufado y yo creía que no

Antonio pidió arreglar **C1** (*"las paradas no son pulsables"*) y **C2** (*"los chips de transbordo
no son pulsables… están pintados de adorno"*).

**Los dos ya funcionaban.** Comprobado **pulsando**:

```
enlaces a parada en /linea/35 ....... 38
chips de transbordo ................. 84
pulsar el nodo 3 .................... → /parada/25   ✅
```

⚠️ **Y mi primer test dijo que NO funcionaban.** Mentía: leía la URL antes de que la navegación
hubiera ocurrido (`waitForLoadState('networkidle')` resolvía antes de que empezara). **Si me lo
hubiera creído, habría "arreglado" código que funcionaba — y probablemente lo habría roto.**

Es la sexta vez que el instrumento me miente. Y la primera en que me habría hecho *destruir* algo.

### ⭐ De propina: la referencia NO tiene C1

```
"Cosuenda / Paseo de Longares"  → dentro de un enlace: NO
"Plaza Mozart"                  → dentro de un enlace: NO
"Muel nº 11"                    → dentro de un enlace: NO
```

**En la referencia, las paradas del itinerario no son pulsables.** Aquí somos mejores que ella.

---

## 4 · Lo que quedó enchufado después de la Tanda 6

| Pieza | Ahora |
|---|---|
| `desviosDeLinea` | ⭐ **La vista de línea sirve la RUTA REAL.** Avenida Valencia ha desaparecido de la 35 |
| `LlegadaViva.posicion` | ⭐ **El mapa.** Cada bus en su coordenada GPS. Sin proyectar, sin Null Island |
| `posicionParada` | ⭐ El rombo de la parada en el mapa |
| `transbordosDe` | ⭐ Pulsables (ya lo eran) **y ahora con los búhos invertidos** |
| `stop_times` + `calendar_dates` | ⭐ **NUEVO**: funcionamiento de terminal (C5) |

### ⛔ Lo que SIGUE sin enchufar, y por qué

| Pieza | Por qué |
|---|---|
| `kml.ts` + `geometry` | **No hay mapa en la vista de línea.** Dibujar el trazado del GTFS cuando la línea está desviada sería una **mentira nueva** — y dibujar el KML exige un mapa que no existe todavía. Se deja sin dibujar: no dibujar nada no engaña a nadie. |
| `BusProfile.plate` / `.registeredOn` | Al que espera el autobús no le sirven. Viven en el dato para poder auditar. |
| `modes/tram` | Deliberado. Es el hito 004. |

---

## 5 · La lección

Este proyecto tenía tests para:

- que el parser no mienta ✅
- que la caché diga su edad ✅
- que la pantalla no trunque ✅
- que el estado no vaya en el color ✅
- que el barrido no se dispare solo ✅

**Y ni uno solo para: "¿la pantalla usa lo que el motor sabe?"**

> ### ⭐ Un módulo probado y desconectado da MÁS confianza que uno que no existe.
>
> Porque el que no existe se nota. El desconectado sale en verde, tiene su documentación, su
> cobertura y su comentario de cabecera explicando lo bien pensado que está. **Y la pantalla miente
> igual.**

### La protección, ahora escrita

`tests/pantalla-no-miente.test.ts` comprueba **qué páginas llaman al motor**, y ata el número:

```ts
expect(queLlaman).toEqual([
  'src/app/linea/[linea]/page.tsx',   // ← la RUTA REAL. 2 peticiones, 30 min de caché.
  'src/app/parada/[poste]/page.tsx',  // ← las llegadas. 1 petición, 15 s de caché.
]);
```

Si mañana alguien construye una pieza del motor y no la enchufa, **este test no lo va a cazar**. No
puede: no sabe qué debería estar enchufado. Pero sí caza lo contrario (que alguien enchufe algo caro
sin darse cuenta), y **deja la lista a la vista** — que es donde se ve el hueco.

**La forma de encontrar el hueco sigue siendo mirar las dos listas y restar.** No hay atajo.
