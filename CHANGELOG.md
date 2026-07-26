# Changelog

Todas las novedades destacables de ZetaBus se documentan en este fichero.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el
proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-07-26

Primera versión. ZetaBus está desplegado y en vivo en
[zetabus.antonioblanquez.es](https://zetabus.antonioblanquez.es). Al ser la versión
inicial, todo es **nuevo**: no hay una versión anterior respecto a la que cambiar o
corregir nada.

### Added

- **Visor en vivo de los autobuses de Zaragoza:** las 44 líneas y 934 paradas, con la
  **posición GPS real** de cada vehículo, no interpolada.
- **El sello del proyecto — «cuando no lo sabe, lo dice»:** la edad del dato siempre a la
  vista («Datos de Avanza hace 6 s»), y una parada sin servicio se muestra vacía en vez de
  inventar un autobús que no viene.
- **Detección de desvíos por comparación:** cruza el GTFS oficial con el recorrido que el
  operador publica *para hoy* y **deduce** las paradas por las que no se pasa, tachadas y
  con su fuente al lado. No lo transcribe nadie a mano: se apaga solo el día que restauren
  la ruta.
- **Cruce honesto de fuentes que se contradicen** (GTFS del Punto de Acceso Nacional + web
  del operador + tiempo real): enseña qué dice cada una y quién lo dice, sin adjudicar.
- **Vista de parada:** los minutos que faltan arriba del todo, el mapa debajo, filtro por
  línea y selección cruzada mapa↔lista.
- **Ficha de vehículo:** modelo, longitud (articulado de 18 m o sencillo de 12) y
  combustible, con la fuente de **cada campo** —no del vehículo entero: del campo—.
- **Vista de línea:** el recorrido real de hoy en orden, el desvío vigente si lo hay, los
  horarios de terminal (primeras y últimas salidas con la frecuencia media) y los
  transbordos en cada parada.
- **Las 9 paradas «solo-barrido» visitables:** postes de desvío que el GTFS no conoce,
  resueltos con su coordenada tomada del feed del operador.
- **Buscador** por número de poste, nombre de parada o línea, tolerante a acentos y
  abreviaturas («avda», «Av.», «Carlos Quinto» para «Carlos V»).
- **Panel de estado público** (`/estado`): cuánto se le pide al operador y con qué frescura.
- **Regeneración nocturna del índice de correspondencias** (qué líneas pasan hoy por cada
  poste, separando las de siempre de las que hoy pasan por un desvío), vía cron y
  `POST /api/regenerar` protegido por un token en cabecera.
- **Sitemap** y **tarjeta Open Graph** al compartir el enlace.
- **Modo demo** (`?fingir=`) para ver los casos raros —fuente caída, respuesta ilegible,
  línea desviada— sin tocar la red.
- **Accesibilidad medida sobre la pantalla pintada:** ningún estado se comunica solo con el
  color, el número de cada línea se lee sobre cualquier fondo por contraste calculado, y
  zonas táctiles, contraste y navegación por teclado se verifican sobre el píxel pintado.
- **Trato cortés con el operador:** caché compartida en servidor (10 personas en la misma
  parada = 1 petición, no 10), techo de peticiones por segundo, tiempo de espera,
  cortacircuitos, cero peticiones cuando nadie mira, y un User-Agent identificable.
- **Sin base de datos, sin cuentas, sin registro, sin cookies propias, sin analítica.**

[1.0.0]: https://github.com/ablanquez/zetabus/releases/tag/v1.0.0
