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

## 3 · ⛔ Servicios internos de Avanza — CONSUMIDOS, NUNCA REDISTRIBUIDOS

| | |
|---|---|
| **Qué es** | `gps.avanzabus.com` (posiciones GPS y tiempos de llegada) y `zaragoza.avanzagrupo.com/wp-admin/admin-ajax.php` (recorrido real, alteraciones), más los ficheros KML de trazado. |
| **Licencia** | **NINGUNA.** Sin documentar, sin términos de uso publicados, sin permiso. |
| **¿Se consume?** | **Sí**, en tiempo de ejecución, con techo de peticiones, tiempo de espera, cortacircuitos y `User-Agent` identificable con correo de contacto. |
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
deja. El correo de contacto va en cada petición precisamente para que puedan pedirlo antes de
tener que bloquearnos.**

---

## 4 · Software

| Componente | Licencia |
|---|---|
| Next.js | MIT |
| React | MIT |
| Leaflet | BSD-2-Clause |
| OpenStreetMap (teselas y datos) | **ODbL** — atribución obligatoria: «© colaboradores de OpenStreetMap» |
| TypeScript | Apache-2.0 |

*(Se completa con el `package.json` en la Tanda 2.)*
