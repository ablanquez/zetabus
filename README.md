# ZetaBus

**Visor en vivo del autobús urbano de Zaragoza.**
Dónde está tu bus, cuánto falta, qué bus es exactamente — y qué te están ocultando las fuentes.

> ⚠️ **Estado: en construcción.** El repositorio contiene, por ahora, la **auditoría de fuentes**
> y el **diseño aprobado**. Ni una línea de aplicación todavía. Eso es deliberado: primero se
> investiga la fuente, después se escribe el código.

---

## Qué hace

- **Vista parada** — la línea, el sentido, y los próximos buses con sus minutos, moviéndose en el
  mapa en su coordenada GPS real. De cada bus: modelo, combustible, y **si es articulado o
  sencillo**.
- **Vista línea** — el trazado **real de hoy** (con las obras aplicadas), las paradas en orden, y
  los buses detectados ahora mismo.
- **La capa que no tiene nadie** — paradas retiradas por desvío, tramos alterados, y **la
  contradicción del operador enseñada cuando la haya**, sin adjudicar quién tiene razón.

---

## La historia de las fuentes, en corto

Esto es lo que distingue ZetaBus de un scraper con un mapa encima. Se auditó **antes** de
construir, en siete fases, y **tres veces hubo que retractarse de un informe propio**.

**1 · En Zaragoza NO EXISTE GTFS-RT.** Verificado contra el Punto de Acceso Nacional, Transitland
y Mobility Database. No es que no lo hayamos encontrado: **no existe**. Esa es la razón, y la
única, por la que hay scraping en este proyecto.

**2 · El GTFS oficial da la topología, pero MIENTE cuando hay obras.** Cero
`exception_type=2` en `calendar_dates`. Sus rutas siguen bajando por una avenida cortada. Su
`shapes.txt` es preciso (300-440 puntos) **y falso**.

**3 · El recorrido REAL de hoy está en la propia web del operador.** Un endpoint de su
WordPress devuelve la **secuencia ordenada de paradas del recorrido vigente, por sentido, con
el desvío ya aplicado** — 45 de 46 líneas. Y un KML con el trazado: basto (153 puntos) **y
verdadero**. El desvío no hay que transcribirlo a mano: **se deriva** como `diff(GTFS, web)`.
Y como se deriva, **se apaga solo** el día que restauren la ruta.

**4 · Las supresiones de parada NO LAS REFLEJA NINGUNA FUENTE.** Cuando el bus *pasa pero no
para*, la ruta operativa de Avanza no cambia — así que el GTFS la lista, su web la lista, y su
sistema de tiempo real **sigue anunciando buses en un poste suprimido desde enero**. No hay
base de datos en el mundo que diga la verdad sobre esa parada. **Solo un cartel en la
marquesina.**

> Ante eso, ZetaBus **no adjudica**. Enseña los dos hechos y quién los dice:
> *«Avanza declaró esta parada suprimida el 10/01. Su sistema sigue anunciando buses aquí. No
> podemos saber cuál es cierto — confírmalo en la marquesina.»*

**5 · Y una que salió por sorpresa:** el registro oficial de la flota está en un **pliego de
contratación municipal**. Gracias a él descubrimos que el fichero de flota heredado
**mentía en el 20% de las longitudes** — decía «12 metros» donde había un articulado de 18.
Un Volvo 7905 existe en las dos longitudes, **con el mismo nombre de modelo**.

📖 **Los siete informes están en [`docs/auditoria/`](docs/auditoria/).** No son basura de
proceso: son la prueba de que se miró antes de improvisar.

---

## Sobre el scraping — sin esconderlo

**ZetaBus consulta endpoints no documentados de Avanza.** No lo escondemos, y no nos parece que
haya que esconderlo: **lo justificamos.**

- **No hay API pública. Se verificó que no existe** (fase 2 de la auditoría, contra tres
  registros independientes). Sin ese scraping, no hay tiempo real en Zaragoza para nadie.
- **Se consume, no se redistribuye.** No hay ni un byte de datos raspados en este repositorio.
  Consumir un endpoint es ser un cliente de su web. Republicarlo sería otra cosa muy distinta.
  Ver [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
- **Se pide con cortesía y con techo.** Caché compartida en servidor (10 usuarios en la misma
  parada = **1 petición**, no 10), límite duro de peticiones por segundo, tiempo de espera,
  cortacircuitos, y **cero peticiones cuando nadie está mirando**.
- **Vamos identificados.** Cada petición lleva un `User-Agent` con un correo de contacto. Si
  molestamos, queremos que puedan pedirnos que paremos **antes** de tener que bloquearnos.

Y un dato que conviene conocer: el **pliego del nuevo contrato municipal obliga al
concesionario** a exponer *«APIs de acceso público y general para su uso por terceros»*, y
establece que **los datos del sistema son propiedad del Ayuntamiento**, no del operador. Ese
contrato aún no está adjudicado. Pero dice bastante sobre hacia dónde va esto.

---

## Stack

Next.js · TypeScript · Leaflet + OpenStreetMap · **sin base de datos**

*Sin base de datos no es una carencia: es una decisión.* Todo lo que ZetaBus enseña **se deriva**
de sus fuentes. Lo derivable no se guarda. El día que se quiera **medir** (frecuencia real contra
frecuencia contratada), hará falta histórico — y ese día se decide entonces, con los ojos
abiertos. Ver [`docs/diseno/tanda1-modelo-de-datos.md`](docs/diseno/tanda1-modelo-de-datos.md) § 9.

---

## Poner en marcha

> Todavía no hay aplicación que arrancar. Cuando la haya, esto es lo que hará falta:

```bash
git clone https://github.com/ablanquez/zetabus
cd zetabus
cp .env.example .env.local     # y rellenar
```

**El GTFS no viene en el repositorio y hay que descargarlo.**
Instrucciones y el porqué: [`data/gtfs/README.md`](data/gtfs/README.md).

**El build fallará ruidosamente si el GTFS no está.** No arrancará con datos vacíos: un mapa
sin paradas que no se queja es peor que un error.

---

## Documentación

| | |
|---|---|
| 📋 [Índice completo](docs/README.md) | Los siete informes de auditoría y el diseño |
| 🎓 [Lecciones de método](docs/LECCIONES.md) | Lo que aprendimos pagándolo. Vale más allá de este proyecto. |
| ⚖️ [Datos de terceros](THIRD-PARTY-NOTICES.md) | Qué usamos, con qué licencia, y qué **no** publicamos |

---

## Licencia

Código: **[Apache 2.0](LICENSE)**.
Los datos de terceros conservan sus propias condiciones — ver [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

Datos de transporte procesados a partir del GTFS publicado por Avanza Zaragoza S.A.U. en el
Punto de Acceso Nacional. **Powered by [MITRAMS](https://www.transportes.gob.es/).**
Cartografía © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright).

**No es un producto oficial de Avanza Zaragoza ni del Ayuntamiento de Zaragoza.**
