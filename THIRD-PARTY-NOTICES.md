# Datos de terceros

La licencia Apache 2.0 cubre **el código** de ZetaBus. **No cubre los datos ajenos**, que
conservan sus propias condiciones. Aquí están, una por una, con lo que sabemos y lo que no.

---

## 1 · GTFS del Punto de Acceso Nacional (NAP)

| | |
|---|---|
| **Qué es** | Topología estática de la red: paradas, líneas, viajes, horarios, trazados. |
| **Titular** | Avanza Zaragoza S.A.U. (publicador del feed) |
| **Canal** | Punto de Acceso Nacional · Ministerio de Transportes y Movilidad Sostenible (MITMS) |
| **Fichero** | 1176 — «Transporte urbano de Zaragoza» · https://nap.transportes.gob.es |
| **Licencia** | Licencia de datos abiertos del MITMS |
| **¿Permite redistribuir?** | **Sí.** *«Compartir (copiar, distribuir) los datos […] obtenidos del MITRAMS»*, incluyendo *«modificación, adaptación, extracción, reordenación y combinación de la información»*. |
| **Atribución exigida** | *«Powered by MITRAMS»* con enlace a https://www.transportes.gob.es/, cita del MITMS como fuente, e indicación de si el dato es **bruto o procesado**. Debe conservarse sin alterar la metainformación sobre fecha de actualización y condiciones de reutilización. |
| **¿Está en este repo?** | ❌ **NO.** Ver `data/gtfs/README.md`. |

> **La licencia permitiría subirlo. No lo subimos igualmente**, y el motivo no es legal:
> el fichero cambia cada pocos meses, pesa 6,6 MB, **caduca** (`feed_end_date`) y una copia
> versionada se pudre en silencio mientras alguien construye contra ella. Se descarga.

**Atribución, tal y como aparecerá en la aplicación:**

> Datos de transporte procesados a partir del GTFS publicado por Avanza Zaragoza S.A.U. en el
> Punto de Acceso Nacional. **Powered by [MITRAMS](https://www.transportes.gob.es/).**

---

## 2 · Pliegos de contratación del Ayuntamiento de Zaragoza

| | |
|---|---|
| **Qué es** | Expediente **0034140-25** — «Concesión de servicio público de transporte colectivo urbano por autobús de la ciudad de Zaragoza». Pliegos aprobados por el Gobierno de Zaragoza el 24/10/2025. |
| **De dónde** | https://www.zaragoza.es/sede/servicio/contratacion-publica/7615 |
| **Naturaleza** | **Documento administrativo público.** Se publica precisamente para ser escrutado (Ley 9/2017 de Contratos del Sector Público, Ley 19/2013 de Transparencia). Su reutilización se rige por la Ley 37/2007. |
| **Qué usamos** | Del **Anexo 5** («Flota de vehículos adscrita al contrato») extraemos los datos que componen `data/flota-avanza-zaragoza.json`. Del **Anexo 1** («Descripción del servicio»), las dotaciones e intervalos citados en la documentación. |
| **¿Están los PDF en este repo?** | ❌ **NO.** Se enlazan. Son 54 MB, están permanentemente disponibles en la sede electrónica, y **el Anexo 7 son 230 páginas de «Personal adscrito al contrato»** — datos de trabajadores que no tenemos ningún motivo para replicar. |

⚠️ **El contrato del que salen esos pliegos está PENDIENTE DE ADJUDICACIÓN** a fecha de este
repositorio. El contrato en vigor es el de 2013, prorrogado hasta el 31/07/2027.
Ver [`docs/auditoria/07-contrato-de-explotacion.md`](docs/auditoria/07-contrato-de-explotacion.md).

---

## 3 · busesmadrid.es — ⚠️ FUENTE ESPECIALIZADA, **NO OFICIAL**

| | |
|---|---|
| **Qué es** | Listado de la flota de Avanza Zaragoza (AUZSA): nº de coche, matrícula, chasis, carrocería y observaciones. **574 vehículos**, históricos incluidos. |
| **De dónde** | https://busesmadrid.es/autobuses-urbanos-de-zaragoza-s-a-auzsa/ |
| **Consultado** | 14/07/2026 |
| **Naturaleza** | **Sitio especializado, mantenido por aficionados.** No es un registro público ni un documento administrativo. |
| **Qué usamos** | **43 vehículos, y solo esos**: los que circulan y **no** figuran en el Anexo 5 del pliego (entregados después de octubre de 2025). No replicamos su listado completo. |
| **Qué NO trae** | Fecha de matriculación · longitud · potencia. **No se rellenan.** Quedan a `null`. |
| **¿Está en este repo?** | ✅ **Sí**, la extracción mínima: `data/fuentes/busesmadrid-2026-07-14.json`. Con su URL, su fecha y su naturaleza escritas dentro. |

> ### ⚠️ POR QUÉ NO ES `oficial`, Y POR QUÉ IMPORTA
>
> La cotejamos contra el Anexo 5 en los **350 vehículos que están en las dos fuentes**:
>
> | Campo | Coincidencia |
> |---|---|
> | Fabricante | **350 / 350 — 100 %** |
> | Propulsión | **350 / 350 — 100 %** |
> | Matrícula | **342 / 347 — 98,6 %** (3 no la publican) |
>
> Es una fuente **excelente**. Y aun así, las 5 matrículas que discrepan son **cuatro
> transposiciones de letras o dígitos** (`8948-MKF` / `8948 MFK`). Esa es la huella de una
> transcripción **a mano**: **se equivoca ~1 de cada 70.**
>
> ⇒ Donde el pliego también la tiene, **manda el pliego**. Donde busesmadrid es la **única**
> fuente —los 43—, ese error **no es detectable**, y por eso esos vehículos nacen con
> `confianza: fuente_secundaria` y salen **marcados con un asterisco en la pantalla**.
>
> **Una web de aficionados no se disfraza de pliego municipal, por buena que sea.**

**Atribución, tal y como aparece en la aplicación:**

> Datos de flota de vehículos no recogidos en el pliego municipal, tomados de
> [busesmadrid.es](https://busesmadrid.es/autobuses-urbanos-de-zaragoza-s-a-auzsa/) —
> fuente especializada, **no oficial**.

---

## 4 · ⛔ Servicios internos de Avanza — CONSUMIDOS, NUNCA REDISTRIBUIDOS

| | |
|---|---|
| **Qué es** | `gps.avanzabus.com` (posiciones GPS y tiempos de llegada) y `zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php` (recorrido real, alteraciones), más los ficheros KML de trazado. |
| **Licencia** | **NINGUNA.** Sin documentar, sin términos de uso publicados, sin permiso. |
| **¿Se consume?** | **Sí**, en tiempo de ejecución, con techo de peticiones, tiempo de espera, cortacircuitos y un `User-Agent` identificable: `ZetaBus/1.0 (+https://github.com/ablanquez/zetabus)`. |
| **¿Se redistribuye?** | ⛔ **NO. NI UN BYTE.** No hay respuestas cacheadas en este repositorio, ni de ejemplo, ni de prueba, ni como *fixture*. El `.gitignore` lo impide explícitamente. |

**La distinción no es un tecnicismo:**

> **Consumir** un endpoint en tiempo de ejecución es comportarse como un cliente de su web.
> **Republicar** lo que devuelve, en un repositorio público e indexado, es **redistribuir el
> dato de una empresa privada sin licencia**. Son dos cosas distintas y solo una de ellas es
> defendible.

Los informes de auditoría de `docs/` **citan fragmentos** de esas respuestas (unas pocas líneas)
con fines de análisis y crítica técnica. Eso es **cita**, no redistribución, y es lo que hace
verificable la investigación.

**Si Avanza o el Ayuntamiento de Zaragoza piden que se deje de consultar estos servicios, se
deja.** La URL del repositorio va en cada petición precisamente para eso: desde ahí se llega al
proyecto entero y a quien lo firma, y se puede pedir **antes** de tener que bloquearnos.

> ⚠️ **Nota de rectificación (24/07/2026).** Hasta esta fecha, este documento afirmaba dos veces
> que el `User-Agent` llevaba **un correo de contacto**. **No era cierto y nunca lo fue.** La
> variable `ZETABUS_CONTACT_EMAIL` estaba declarada en `.env.example` y no la leía nadie. Se
> retiró la promesa en vez de añadir el correo, y se dice aquí en lugar de borrarlo en silencio:
> un documento de licencias que se corrige a sí mismo sin decirlo vale menos que uno que lo dice.
> Ver [`docs/auditoria/11-codigo-y-arquitectura.md`](docs/auditoria/11-codigo-y-arquitectura.md) · A-F2.

---

## 5 · Software

> ⚠️ **Nota de rectificación (24/07/2026).** Hasta esta fecha, esta sección listaba **cinco**
> componentes y terminaba con un *«(Se completa con el `package.json` en la Tanda 2.)»* que nunca
> se completó. Iban ya siete tandas. Faltaban, entre otras, **`react-leaflet`, que no es MIT ni
> BSD** (§ 5.2). Es la misma forma exacta del incumplimiento de la ODbL que este proyecto ya pagó:
> **el documento que obligaba llevaba en el repositorio desde el principio.** Ver
> [`docs/auditoria/12-perimetro-y-publicacion.md`](docs/auditoria/12-perimetro-y-publicacion.md) · B-F3.

### 5.1 · Cartografía

| Componente | Licencia | Obligación |
|---|---|---|
| **OpenStreetMap** (teselas y datos) | **ODbL 1.0** | Atribución **literal**: «© **colaboradores** de OpenStreetMap», con enlace a `openstreetmap.org/copyright`. Va en el mapa (`MapaParada.tsx`). ⚠️ La palabra *«colaboradores»* **no es opcional**: faltaba, y ese fue un incumplimiento real |

### 5.2 · ⚠️ `react-leaflet` — LA QUE NO ES COMO LAS DEMÁS

| | |
|---|---|
| **Versión** | `react-leaflet@5.0.0` |
| **Licencia** | **Hippocratic License 2.1** — © 2020 Paul Le Cam y colaboradores |
| **¿Es código abierto?** | ⛔ **No en el sentido de la OSI.** Es una licencia *ethical source*: **no está aprobada por la Open Source Initiative** y no cumple su definición, porque **restringe el uso** |
| **Qué exige de más** | **(a) Aviso:** quien reciba cualquier parte del software tiene que recibir también la licencia y el aviso de copyright. **(b) Uso:** obliga a usarlo de forma coherente con los Principios de Derechos Humanos de la ONU. **(c) Arbitraje:** las disputas sobre ese punto van a las *Hague Rules on Business and Human Rights Arbitration*, y **quien decline participar pierde la licencia de inmediato** |
| **¿Se distribuye?** | **Sí.** No está el código fuente en este repositorio (`node_modules` está ignorado), pero **va compilado en el paquete JavaScript que descarga cada navegador que abre una parada**. Eso es distribuir |
| **Texto completo** | https://firstdonoharm.dev/version/2/1/license/ |

> ### ¿Hay INCOMPATIBILIDAD con la Apache 2.0 de ZetaBus? **No. Hay una obligación de aviso y una restricción de uso — que no es lo mismo, y la diferencia importa.**
>
> - **No es copyleft.** Hippocratic 2.1 **no exige** que ZetaBus se relicencie ni que su código
>   propio pase a estar bajo sus términos. El código de ZetaBus sigue siendo Apache 2.0, entero.
> - **No hay conflicto de cláusulas.** Apache 2.0 no prohíbe usar dependencias con términos
>   propios; cada componente conserva los suyos. No hay ninguna condición de una que impida
>   cumplir la otra.
> - **Lo que sí hay, y hay que decirlo:** quien tome ZetaBus creyéndolo *«Apache 2.0 y ya»* se
>   lleva, dentro, **una pieza con restricción de uso y con terminación automática**. Apache 2.0
>   no impone nada de eso, así que **la etiqueta sola induciría a error**. Por eso está aquí.
> - **Y una consecuencia práctica, no legal:** algunas organizaciones tienen políticas que
>   rechazan dependencias no aprobadas por la OSI. Si alguna vez estorba, la salida es directa:
>   `react-leaflet` es un envoltorio de React sobre **Leaflet**, que sí es BSD-2-Clause, y el mapa
>   se puede montar contra Leaflet a pelo.

### 5.3 · Dependencias de ejecución

Las que viajan al navegador o corren en el servidor.

| Paquete | Versión | Licencia | Para qué |
|---|---|---|---|
| `next` | 16.2.10 | MIT | El framework |
| `react` | 19.2.4 | MIT | La interfaz |
| `react-dom` | 19.2.4 | MIT | Ídem |
| `leaflet` | 1.9.4 | BSD-2-Clause | El mapa |
| **`react-leaflet`** | **5.0.0** | **Hippocratic-2.1** ⚠️ | El mapa, en React — **ver § 5.2** |
| `node-html-parser` | 9.0.0 | MIT | Leer el HTML de Avanza (recorrido, horario, poste) |

### 5.4 · Dependencias de desarrollo

No se distribuyen: no están en el paquete que recibe el navegador ni en el servidor de
producción. Se listan igualmente, porque **una tabla incompleta es lo que trajo el fallo de
arriba**.

| Paquete | Versión | Licencia |
|---|---|---|
| `typescript` | 5.9.3 | **Apache-2.0** |
| `@playwright/test` | 1.61.1 | **Apache-2.0** |
| `dotenv` | 17.4.2 | **BSD-2-Clause** |
| `vitest` | 3.2.7 | MIT |
| `tsx` | 4.23.1 | MIT |
| `eslint` | 9.39.5 | MIT |
| `eslint-config-next` | 16.2.10 | MIT |
| `tailwindcss` | 4.3.2 | MIT |
| `@tailwindcss/postcss` | 4.3.2 | MIT |
| `fflate` | 0.8.3 | MIT |
| `pngjs` | 7.0.0 | MIT |
| `@types/node` | 20.19.43 | MIT |
| `@types/react` | 19.2.17 | MIT |
| `@types/react-dom` | 19.2.3 | MIT |
| `@types/leaflet` | 1.9.21 | MIT |
| `@types/pngjs` | 6.0.5 | MIT |

### 5.5 · Resumen de compatibilidad

**22 de las 23 dependencias declaradas son MIT, BSD-2-Clause o Apache-2.0** — permisivas, sin
copyleft y compatibles con Apache 2.0 sin ninguna condición añadida.
**La excepción es una: `react-leaflet` (Hippocratic-2.1).** No bloquea nada; obliga a avisar,
y este documento es el aviso.

> ⚠️ **Lo que NO cubre esta tabla, y se dice en vez de dar a entender que sí:** son las **23
> dependencias declaradas en `package.json`**, no el árbol transitivo completo de `node_modules`
> (cientos de paquetes). Ahí podría esconderse otra licencia infrecuente. **NO CONSTA**: no se ha
> recorrido.
