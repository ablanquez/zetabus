# ZETABUS · TANDA 1 — CIERRE DE CABOS

**Fecha:** 13/07/2026
**Decisión de producto asumida:** **V1 SOLO ENSEÑA. NO MIDE.** Sin auditoría de frecuencia, sin histórico, sin índice de puntualidad, sin base de datos.
**Entregado:** el maestro de flota regenerado (`_datos/flota-avanza-zaragoza.json`). Ningún código de aplicación.

---

## 0 · LOS TRES CABOS, EN UNA LÍNEA CADA UNO

| Cabo | Estado | El titular |
|---|---|---|
| **1 · Flota** | ✅ **CERRADO** | Maestro regenerado desde el Anexo 5. **62 longitudes erróneas** en el fichero heredado (20%), **todas** en el mismo sentido. Contraprueba: **12 de 12**. |
| **2 · Pliego 2013** | ⚠️ **CERRADO CON MAL RESULTADO** | El contrato en vigor **NO asigna articulados a líneas**, y el anejo que describiría el servicio **no es descargable**. La lista de las 7 líneas **solo existe en el pliego pendiente de adjudicar**. |
| **3 · Workers** | ⚠️ **NO VERIFICABLE POR MÍ** | No puedo saberlo desde aquí. Te doy **cómo comprobarlo** y, más importante, **una caché que no depende de la respuesta**. |

Y un hallazgo que cambia el diseño de la demo:

> ⭐ **El momento oro NO NECESITA EL PLIEGO.** *"De los 12 buses de la línea 35 ahora mismo, los 12 son articulados"* se sostiene con **el maestro + la API viva**, sin citar ningún contrato. Es la afirmación **más fuerte y menos atacable** que tenemos, y encima **no miente los domingos**. §5

---

# 1 · LA FLOTA — REGENERADA, NO PARCHEADA

## 1.1 · Lo que hay ahora en el proyecto

```
F:\01_PROYECTOS\003_ZETABUS\_datos\
  ├── flota-avanza-zaragoza.json                          ← ⭐ EL MAESTRO. 403 vehículos.
  ├── REFERENCIA_autobuses-avanza-zaragoza_HEREDADO.json  ← copia del viejo. SOLO REFERENCIA.
  └── zaragoza-gtfs.zip
```

**El fichero heredado ya no es la base de nada.** Es material de contraste, y se llama así en el nombre para que nadie se confunda dentro de seis meses.

## 1.2 · La procedencia va DENTRO del fichero

Nunca más un dato sin origen. El maestro abre con esto:

```jsonc
"_meta": {
  "generado": "2026-07-13",
  "advertencia": "NO derivar la longitud del nombre del modelo. Un VOLVO 7905 existe en 12 m Y en 18 m.
                  Ese error costó 62 vehículos mal clasificados en el fichero heredado.",
  "fuentes": [
    { "id": "pliego-2025-anexo5",
      "confianza": "oficial",
      "documento": "Anexo 5 — Flota de vehículos adscrita al contrato",
      "expediente": "0034140-25 · Concesión de servicio público de transporte colectivo urbano…",
      "organo": "Ayuntamiento de Zaragoza",
      "aprobado": "2025-10-24 (Gobierno de Zaragoza)",
      "firmado": "2025-10-14",
      "url": "http://www.zaragoza.es/contenidos/contratos/2025/0034140-25/PPT.zip",
      "vehiculos": 350,
      "salvedad": "Pliego del contrato NUEVO, PENDIENTE DE ADJUDICAR a 13/07/2026. Describe la flota
                   a octubre de 2025. NO es un censo completo: se han observado en vivo vehículos
                   ausentes de este anexo." },
    { "id": "json-heredado-sin-verificar",
      "confianza": "sin_verificar",
      "vehiculos": 53,
      "salvedad": "Procedencia desconocida. Se usa SOLO para vehículos ausentes del Anexo 5.
                   Su campo de longitud es POCO FIABLE: en los 316 cotejables erró 62 (20%)." }
  ],
  "reglaDeUso": "Si un coche no figura en este fichero, la interfaz muestra SIN DATOS.
                 Nunca un valor por defecto."
}
```

Y **cada vehículo lleva su fuente encima**:

```jsonc
{ "coche": 4889, "matricula": "5988-KYZ", "fechaMatriculacion": "2019-07-22",
  "fabricante": "VOLVO", "modelo": "7905", "potenciaCv": "245/150E",
  "longitudM": 18, "clase": "articulado", "propulsion": "hibrido",
  "fuente": "pliego-2025-anexo5", "confianza": "oficial" }

{ "coche": 4333, "matricula": null, "fechaMatriculacion": null,
  "fabricante": "Mercedes-Benz", "modelo": "eCitaro G",
  "longitudM": 18, "clase": "articulado", "propulsion": "electrico",
  "anioAproximado": "2025",
  "fuente": "json-heredado-sin-verificar", "confianza": "sin_verificar" }   ← se marca, no se disimula
```

**Ganamos matrícula, fecha exacta de matriculación, potencia y propulsión oficial. Perdemos 62 mentiras.**

## 1.3 · Un detalle del extractor que casi me cuesta un vehículo

El coche **4113** llevaba pegado un carácter invisible (`U+200D`, *zero-width joiner*) en el PDF. Mi primer parser lo saltó en silencio: sacó 349 de 350 y **no se quejó**. Lo detecté porque conté las matrículas por separado (350) y no cuadraban con los registros (349).

**Lección para el pipeline de ingesta: todo extractor debe llevar un contador independiente de control.** Un parser que pierde una fila sin avisar es exactamente el tipo de error que acabamos de pagar.

## 1.4 · ⭐ EL COTEJO COMPLETO

### 1.4.1 · Las cifras

| | **Anexo 5 (oficial)** | **JSON heredado** |
|---|---|---|
| Vehículos | **350** | 369 |
| Articulados (18 m) | **103** | 55 |
| Estándar (12 m) | 227 | 304 |
| Microbús (10 m) | 10 | 10 |
| Microbús PMRS | 10 | *(no los tiene)* |
| **Comunes a ambos** | **316** | |

### 1.4.2 · ⛔ LAS LONGITUDES MAL — 62 de 316 (20%)

**Todas en el mismo sentido: el JSON dice 12 m, la realidad es 18 m. Ni una sola al revés.**
**El fichero heredado NUNCA inventa un articulado. Sistemáticamente los OCULTA.**

| Familia | Cuántos | Coches |
|---|---|---|
| **VOLVO 7905** | **35** | 4671 4672 4673 4674 4675 4676 4677 4678 4679 4680 4681 4682 4683 4684 4685 4686 4687 · 4881 4882 4883 4884 4885 4886 4887 4888 **4889** 4890 4891 4892 4893 4894 4895 4896 4897 4898 |
| **IRISBUS IVECO CITELIS** | **25** | **4901** 4902 4903 4904 4905 **4906** 4907 4908 4909 **4910** 4911 4912 4913 4915 4916 4917 4918 4919 4920 4921 4922 4924 4925 **4926** 4927 |
| **SCANIA N280 UA6X2/2** | **2** | 4928 4929 |
| | **62** | |

### 1.4.3 · La causa raíz, probada con el registro oficial

```
VOLVO 7905              →  72 unidades de 12 m   Y   35 unidades de 18 m   ← MISMO NOMBRE
IRISBUS IVECO CITELIS   →  25 unidades de 18 m
IVECO CITELIS           →   7 unidades de 12 m   ← misma familia, otra marca en el registro
```

**El nombre del modelo NO contiene la longitud.** El fichero heredado la dedujo de ahí. Es un error razonable de cometer e **imposible de detectar sin el documento oficial**.

### 1.4.4 · Los demás campos — y aquí viene la sorpresa

| Campo | Discrepancias sobre 316 |
|---|---|
| **Combustible** | **0** |
| **Fabricante** | **0** |
| Longitud | **62** |
| Año | 62 *(los mismos: al confundir la variante, hereda su año)* |

**El fichero heredado acierta TODO menos la longitud.** Eso no lo debilita: lo **confirma**. Quien lo hizo leyó bien la marca, el modelo y el combustible del catálogo del fabricante. Lo único que el catálogo no le podía dar era **qué unidad concreta es larga y cuál corta**. Es una buena pieza de trabajo con un agujero preciso.

### 1.4.5 · Quién falta en cada uno

**En el Anexo 5 y NO en el JSON — 34 vehículos:**

| Grupo | N.º | Qué son |
|---|---|---|
| 4023–4032 | 10 | **Microbuses PMRS** (Dennis Dart, Iveco Sunrise). El JSON los excluyó a propósito: no son servicio regular. |
| 4447–4476 | 17 | Mercedes Citaro O530 (2006-2007), diésel, 12 m |
| 4559–4584 | 6 | Iveco CityClass (2005), diésel, 12 m |
| 4818 | 1 | **MAN NG 313, 18 m — un articulado que el heredado no tenía en absoluto** |

**En el JSON y NO en el Anexo 5 — 53 vehículos. Y aquí hay que distinguir, como pediste:**

| Grupo | N.º | Diagnóstico |
|---|---|---|
| 4114–4135 | 21 | **Mercedes eCitaro, 12 m, eléctrico, 2025** → **POSTERIORES al anexo.** *(Los 4110-4113 sí están en el Anexo 5, matriculados el 20/03/2025: la entrega parte en dos justo por ahí. Encaja.)* |
| 4321–4335 | 15 | **Mercedes eCitaro G, 18 m, eléctrico, 2025** → **POSTERIORES.** La «G» es *Gelenkbus*: articulado. |
| 4610–4653, 4914, 4923 | 17 | Irisbus Iveco (2008-2011). **Mi primera hipótesis fue "bajas". ERA FALSA. Ver §1.5.** |

## 1.5 · ⚠️ ME EQUIVOQUÉ, Y LO CORRIJO: EL ANEXO 5 NO ES UN CENSO COMPLETO

Di por hecho que los 17 Irisbus viejos ausentes del anexo eran **bajas**. Para comprobarlo hice un barrido en vivo de **36 postes** y detecté **87 coches distintos** circulando ahora mismo.

```
coches distintos detectados         : 87
  en el ANEXO 5                     : 76   (87,4%)
  NO en el Anexo 5                  : 11   → 4114 4116 4118 4119 4125 4131 4132 4333  ← eCitaro 2025 (posteriores)
                                             4646 4649 4650                            ← ⚠️ Irisbus 2011
  ni en el Anexo 5 ni en el JSON    :  0
```

**Los coches 4646, 4649 y 4650 — que yo había etiquetado como "probables bajas" — están dando servicio hoy.**

**No son bajas. El Anexo 5 simplemente NO LISTA TODO LO QUE CIRCULA.** Puede ser flota no adscrita, puede ser un descuido del pliego, no lo sé y **no lo voy a inventar**. Lo que sé es el hecho: **el registro oficial cubre el 87% de lo que se ve en la calle.**

**Consecuencia de diseño, y es la que justifica el maestro híbrido:**

| Cobertura de los 87 buses vistos | |
|---|---|
| Solo Anexo 5 | **87,4%** |
| **Anexo 5 + complemento del heredado** | **100,0%** |

**Ninguno de los dos ficheros basta solo. Juntos, y solo juntos, cubren la calle.** Por eso el maestro es 350 oficiales + 53 marcados `sin_verificar`, y no 350 a secas.

## 1.6 · Los huecos: SIN DATOS, nunca un valor por defecto

```
if (!maestro.has(coche))  →  la ficha dice «SIN DATOS»
```

Hoy eso son **0 de 87** buses observados. Pero **va a pasar**: el día que Avanza matricule un coche nuevo, aparecerá en la calle antes que en ningún documento. **Ese día la ficha dirá "no lo conocemos", no "12 metros, diésel".**

Un valor por defecto miente. Y encima **miente con confianza**, que es la peor forma de mentir.

## 1.7 · ⭐ CONTRAPRUEBA: LOS 12 BUSES, UNO A UNO

Línea 35, detectados en vivo el 13/07/2026 a las 13:15.

| Coche | Maestro nuevo | Long. | Clase | Confianza | JSON viejo | |
|---|---|---|---|---|---|---|
| 4301 | IRIZAR ieTram | 18 m | articulado | oficial | 18 m | ✅ |
| 4312 | IRIZAR ieTram | 18 m | articulado | oficial | 18 m | ✅ |
| 4333 | Mercedes-Benz eCitaro G | 18 m | articulado | **sin_verificar** | 18 m | ✅ |
| 4839 | MAN A24 GD | 18 m | articulado | oficial | 18 m | ✅ |
| 4845 | MAN A24 GD | 18 m | articulado | oficial | 18 m | ✅ |
| 4847 | MAN A24 GD | 18 m | articulado | oficial | 18 m | ✅ |
| 4852 | MAN A24 GD | 18 m | articulado | oficial | 18 m | ✅ |
| **4889** | **VOLVO 7905** | **18 m** | **articulado** | oficial | **12 m** ❌ | ✅ |
| **4901** | **IRISBUS IVECO CITELIS** | **18 m** | **articulado** | oficial | **12 m** ❌ | ✅ |
| **4906** | **IRISBUS IVECO CITELIS** | **18 m** | **articulado** | oficial | **12 m** ❌ | ✅ |
| **4910** | **IRISBUS IVECO CITELIS** | **18 m** | **articulado** | oficial | **12 m** ❌ | ✅ |
| **4926** | **IRISBUS IVECO CITELIS** | **18 m** | **articulado** | oficial | **12 m** ❌ | ✅ |

```
ARTICULADOS según el MAESTRO NUEVO : 12 de 12   ✅
ARTICULADOS según el JSON VIEJO    :  7 de 12   ❌
COBERTURA (0 = SIN DATOS)          : 12 de 12
```

**El maestro acierta los 12. El fichero que ibas a enseñar en la demo acertaba 7.**

*(Un solo vehículo, el 4333, viaja con confianza `sin_verificar`. En pantalla llevará un asterisco. Es un eCitaro **G** y la G significa articulado, pero eso es una inferencia mía sobre una nomenclatura comercial, **no un documento**, y aquí no promocionamos inferencias a hechos.)*

---

# 2 · ⚠️ EL PLIEGO DE 2013 — EL QUE SÍ ESTÁ EN VIGOR

## 2.1 · Qué he podido descargar, y qué no

Expediente **1176058-12**. Ficha: https://www.zaragoza.es/sede/servicio/contratacion-publica/1011

| Documento | ¿Descargable? | |
|---|---|---|
| Pliego de Cláusulas Administrativas (PCAP), 74 pág. | ✅ | [anuncio/6046](https://www.zaragoza.es/sede/servicio/contratacion-publica/anuncio/6046/document.pdf) |
| **Pliego de Prescripciones Técnicas (PPT), 31 pág.** | ✅ | [anuncio/6048](https://www.zaragoza.es/sede/servicio/contratacion-publica/anuncio/6048/document.pdf) |
| **⛔ Anexos del PPT** *(donde está el Anejo Nº I)* | ❌ **HTTP 400** | `anuncio/6049` — **listado en la ficha SIN ENLACE** |
| ⛔ Anexos del PCAP | ❌ **HTTP 400** | `anuncio/6047` |
| Prórroga del contrato (2023) | ✅ | [anuncio/79184](https://www.zaragoza.es/sede/servicio/contratacion-publica/anuncio/79184/document.pdf) → **confirma: hasta el 31 de julio de 2027** |

## 2.2 · Lo que SÍ dice el contrato en vigor

**PPT 2013, literal:**

> *"La tipología general de los vehículos de transporte recibidos es la siguiente:*
> *• Autobús estándar de piso bajo: De longitud total en el entorno de los doce metros (**261 unidades**)*
> *• **Autobús articulado de piso bajo: De longitud total de dieciocho metros. (número 73)***
> *• Microbús de piso bajo: De longitud total de diez con dos metros. (10 unidades)…"*

Y la **Tabla 3, «Vehículos a usar por el concesionario»**: Estándar **241**, **Articulado 74**, total 315.

**PCAP 2013, literal:**

> *"…servicios de autobús urbano […] que ascienden a 17.979.019 km. anuales (**5.182.650 km de autobuses articulados**; 11.802.051 km de autobuses convencionales; 994.318 de microbuses)…"*

> *"Equivalencias y ponderación por km útiles: **Articulados 1,20 × CPK convencional · 5.182.650 km · 28,7%**"*

**Es decir: el contrato en vigor OBLIGA a que el 28,7% de los kilómetros útiles se hagan con autobús articulado, y le pone precio (×1,2 sobre el convencional). El articulado tiene existencia contractual y económica.**

## 2.3 · ⛔ LO QUE NO DICE — Y ES LO QUE NECESITÁBAMOS

**El PPT de 2013 NO CONTIENE NI UNA SOLA TABLA DE LÍNEAS.** Lo he comprobado:
- Menciones de «línea N» en las 31 páginas: **2** (y ninguna es un listado).
- **La cadena «Ci3» no aparece.** *(Normal: las circulares son posteriores. El contrato en vigor **es anterior a líneas que hoy existen**.)*

El propio pliego remite a otro documento:

> *"En el **Anejo Nº I «Descripción del Servicio»** se facilitan **intervalos, frecuencias y horarios**, así como el calendario de servicio utilizado **por tipo de día** y el resto de parámetros básicos de diseño…"*

**Ese anejo es el equivalente exacto del Anexo 1 de 2025. Existe. Está citado por su nombre en el contrato que rige la ciudad. Y el Ayuntamiento lo lista en su propia ficha SIN ENLACE DE DESCARGA.**

Y aunque lo consiguiéramos: sería de **2013**, y desde entonces hay al menos **seis «modificaciones del contrato»** publicadas en la misma ficha. **Su descripción del servicio estaría, casi con seguridad, obsoleta.**

## 2.4 · ⭐ QUÉ PODEMOS AFIRMAR HOY, Y CON QUÉ FUERZA

Sin adornos, como pediste. Tres niveles, y la frontera entre ellos es **innegociable**:

### 🟢 NIVEL 1 — OBSERVACIÓN. No necesita ningún contrato.

> *"En la línea 35, ahora mismo, hay **12 buses detectados**. Los **12 son articulados** (18 m)."*

**Fuentes: la API viva de Avanza + el registro oficial de flota.** Nada más. **Es la afirmación más fuerte que tenemos y la única que no puede envejecer, ni con el tipo de día, ni con el contrato, ni con la temporada.**

### 🟡 NIVEL 2 — CONTRATO EN VIGOR. Se puede citar con fuerza plena.

> *"El contrato de concesión vigente (2013, prorrogado hasta el 31/07/2027) obliga a prestar el **28,7% de los kilómetros con autobús articulado** y contempla una flota de **73 unidades** de 18 metros."*

Verdadero, citable, y en vigor. **Pero no dice nada de la línea 35.**

### 🔴 NIVEL 3 — CONTRATO PENDIENTE DE ADJUDICAR. Se cita con la etiqueta puesta, o no se cita.

> *"Las líneas **23, 32, 33, 34, 35, Ci3 y Ci4** están previstas con autobús articulado **según el Anexo 1 del Pliego de Prescripciones Técnicas aprobado por el Ayuntamiento de Zaragoza el 24/10/2025 — un contrato que a fecha de hoy sigue PENDIENTE DE ADJUDICACIÓN.** El contrato actualmente en vigor no asigna articulados a líneas concretas en su documentación pública."*

⛔ **NO se puede escribir "esta línea VA con articulado" a secas. Ni "DEBE ir". La fuente no da para tanto, y no se afirma con más fuerza de la que da la fuente.**

## 2.5 · ⭐ Y AQUÍ ESTÁ LA BUENA NOTICIA: EL NIVEL 3 SOBRA

Fíjate en lo que ha pasado. **La afirmación de Nivel 1 es mejor que la de Nivel 3 en todo:**

| | Nivel 3 (pliego) | **Nivel 1 (observación)** |
|---|---|---|
| ¿Fuente en vigor? | ❌ No | ✅ No la necesita |
| ¿Miente en domingo? | ⚠️ **SÍ** (la 35 pasa de 15 art. a **2** en festivo) | ✅ **Nunca.** Cuenta lo que hay |
| ¿Miente en verano? | ⚠️ **SÍ** (de 15 a 10) | ✅ Nunca |
| ¿Sobrevive a la adjudicación? | ⚠️ Depende | ✅ Siempre |
| ¿Lo dice otra app? | — | ✅ **Ninguna** |

**El problema del festivo que me hiciste anotar SE DISUELVE SOLO en cuanto dejas de declarar y empiezas a contar.**

**Diseño, entonces:**
- **La ficha de línea NO lleva una etiqueta estática "línea con articulado".** Lleva un **recuento en vivo**: *"Ahora: 12 articulados, 0 sencillos"*.
- **El pliego aparece SOLO como contexto, en letra pequeña, con su etiqueta de pendiente de adjudicación.** Es un pie de página, no un titular.

*(Y de paso: el problema del tipo de día que te preocupaba **no toca el modelo de datos**. No hay que modelar temporadas ni calendarios de dotación. Se cuenta lo que hay. Un problema menos.)*

---

# 3 · EL CABO QUE BLOQUEA LA CACHÉ

## 3.1 · Empiezo por lo que NO sé

**No he podido determinar cuántos procesos Node arranca tu slot de Hostinger.** He mirado su documentación pública de Node.js y **no especifica** el gestor de procesos, ni el número de instancias por defecto, ni si usa modo cluster. **No lo voy a suponer.**

**Pero lo importante es que la respuesta ya no bloquea nada, porque la caché de §3.4 funciona igual con 1 worker que con 8.**

## 3.2 · Cómo lo compruebas tú — por SSH

Pegar tal cual:

```bash
# 1) ¿Cuántos procesos node hay vivos, y quién es el padre de quién?
ps -eo pid,ppid,etime,rss,cmd --sort=start_time | grep -i '[n]ode'

# 2) Cuenta rápida
pgrep -c node

# 3) ¿Hay PM2? Y si lo hay: ¿fork o cluster? ¿cuántas instancias?
pm2 list
pm2 describe zetabus | grep -Ei 'exec mode|instances|status|pid'
pm2 jlist | python3 -c "import sys,json; [print(a['name'], a['pm2_env']['exec_mode'], a['pm2_env']['instances']) for a in json.load(sys.stdin)]"

# 4) ¿Hay un ecosystem file que lo fije?
cat ecosystem.config.js 2>/dev/null || cat ecosystem.config.cjs 2>/dev/null

# 5) ¿Passenger/nginx delante? (algunos paneles lo usan y NO aparece como PM2)
ps aux | grep -i '[p]assenger'
```

**Interpretación:**
- `exec_mode: fork` + `instances: 1` → **UN proceso.** Tu caché en memoria es global. Todo bien.
- `exec_mode: cluster` + `instances: N` (o `max`) → **N procesos, N cachés.** Tus peticiones a Avanza se multiplican por N. **En silencio.**

## 3.3 · La prueba que funciona AUNQUE NO TENGAS SSH

Es la definitiva, porque mide el comportamiento real y no la configuración declarada.

**Un endpoint de diagnóstico de tres líneas** (`/api/diag`) que devuelva `{ pid: process.pid, uptime: process.uptime() }`. Y luego:

```bash
for i in $(seq 1 30); do curl -s https://TU-DOMINIO/api/diag; echo; done | sort -u
```

- **Sale UN solo `pid`** → un proceso. *(Ojo: con poco tráfico un balanceador puede mandarte siempre al mismo. Repite con concurrencia: `seq 1 30 | xargs -P10 -I{} curl -s https://TU-DOMINIO/api/diag`.)*
- **Salen VARIOS `pid`** → **hay cluster. La caché en memoria está partida.**

**Este endpoint debería quedarse en producción.** Cuesta cero y es la única forma de enterarte el día que Hostinger cambie algo sin avisarte.

## 3.4 · ⭐ LA CACHÉ QUE AGUANTA LOS DOS ESCENARIOS

Me pediste que no dependiera de la respuesta. De acuerdo, y además creo que es lo correcto **aunque hoy resulte haber un solo worker**: una caché que solo funciona con un worker es una trampa cargada esperando al día en que Hostinger toque algo.

### Dos pisos

```
   petición
      │
      ▼
┌─────────────────────────────────────────┐
│ PISO 1 · MEMORIA DEL PROCESO            │  Map<poste, Entry>, TTL 20 s
│  · single-flight (Map<poste, Promise>)  │  Absorbe casi todo. Coste: 0.
│  · lleva observedAt                     │  ⚠️ NO es compartido entre workers.
└─────────────────────────────────────────┘
      │ fallo
      ▼
┌─────────────────────────────────────────┐
│ PISO 2 · SUELO COMPARTIDO EN DISCO      │  <cache>/poste-<id>.json  { data, observedAt }
│  · lo ven TODOS los workers de la misma │  Lectura: un stat + un read pequeño (<1 ms).
│    máquina, porque es el mismo disco    │
│  · cerrojo por fichero (open con O_EXCL)│  ⭐ single-flight ENTRE PROCESOS.
│    quien no coge el cerrojo, espera y   │
│    relee el disco. NO llama a Avanza.   │
└─────────────────────────────────────────┘
      │ fallo (y cerrojo obtenido)
      ▼
   AvanzaClient  →  timeout 8 s · cubo de fichas 4 req/s · cortacircuitos
```

### Por qué el disco, y por qué no es una ñapa

- **Los workers de un mismo `next start` comparten el sistema de ficheros.** Es el único canal compartido que existe **sin meter un servicio nuevo** (Redis) y **sin depender de una configuración que no controlamos** (el número de workers).
- **La propia documentación de Next.js hace exactamente esto**: su handler de caché por defecto escribe *"in memory (defaults to 50mb) **and on disk**"*. **No estoy inventando un mecanismo: estoy usando el mismo que usa el framework, para un dato que el framework no puede cachear** (§ Tanda 1, §8.2: la API de Avanza es POST y necesitamos la edad del dato).
- Un dato de posición de bus caduca en 20 s. **Escribir 5 KB en disco cada 20 segundos por poste activo no es un problema de rendimiento por ningún criterio razonable.**

### El coste, con números

| Escenario | Sin piso 2 | **Con piso 2** |
|---|---|---|
| 1 worker, 1 línea en pantalla | 51 req/min | **51 req/min** |
| **4 workers**, 1 línea en pantalla | **204 req/min** ⛔ | **51 req/min** ✅ |
| 4 workers, peor caso (§Tanda 1 §8.5) | **1.020 req/min** ⛔⛔ | **255 req/min** ✅ |
| Latencia añadida por petición | — | **< 1 ms** (un stat + un read local) |

**Sin el piso 2, cuatro workers nos ponen en 17 peticiones por segundo contra un servicio ajeno sin permiso. Eso es exactamente "la vía rápida a que nos bloqueen la IP" que querías evitar.**

### Las dos opciones que pediste, con su precio

| | **A · Solo memoria** | **B · Memoria + suelo en disco** ⭐ |
|---|---|---|
| Complejidad | Un `Map`. 20 líneas. | + ~60 líneas: leer/escribir/cerrojo. |
| Dependencias | Ninguna | Ninguna (`node:fs`) |
| ¿Aguanta N workers? | ❌ **No. Multiplica por N, en silencio.** | ✅ **Sí.** |
| ¿Aguanta un reinicio? | ❌ Se pierde (irrelevante: caduca en 20 s) | ✅ Sobrevive (irrelevante igual) |
| ¿Aguanta que Hostinger cambie? | ❌ **No** | ✅ **Sí** |
| Latencia | 0 | < 1 ms |
| **Recomendación** | Solo si confirmas 1 worker **Y** aceptas que un cambio del proveedor te rompa el techo sin avisar | ✅ **Esta** |

### Y el cinturón, en los dos casos

**Forzar un proceso, al modo oficial:**
```js
// ecosystem.config.js
module.exports = {
  apps: [{ name: 'zetabus', script: 'node_modules/.bin/next', args: 'start',
           exec_mode: 'fork',   // NO cluster
           instances: 1 }]
}
```
Y si el panel de Hostinger expone un campo de instancias/workers, ponerlo a **1**.

**Pero eso es el cinturón, no el diseño.** El diseño es el piso 2, **porque no depende de que nadie recuerde mantener ese `1` dentro de dos años.**

---

# 4 · CAMBIOS AL DISEÑO DE LA TANDA 1

Lo que hay que tocar del `DISEÑO_MODELO_DATOS_TANDA1.md`:

| § | Cambio |
|---|---|
| **§0 / §11.4** | ✅ **El momento oro se REACTIVA**, pero **no** como lo propuse. Ni *"deberían venir articulados"* (sin fuente) ni *"es un Volvo de 12 m"* (dato falso). **Se cuenta lo que hay ahora**: *"12 buses, 12 articulados"*. Ver §2.5. |
| **§5.2 `BusProfile`** | `lengthMeters: 10 \| 12 \| 18` se mantiene. **Se añade `clase: 'sencillo' \| 'articulado' \| 'microbus_pmrs'`** (el registro oficial distingue PMRS, que no es una longitud) y **`confianza: 'oficial' \| 'sin_verificar'`**, que **viaja hasta la interfaz**. |
| **§5.2** | `yearRange: string` → sustituido por **`fechaMatriculacion: string \| null`** (ISO). El registro oficial da la fecha exacta. Se conserva `anioAproximado` solo para los `sin_verificar`. |
| **§7.1** | La flota deja de ser «JSON propio». Pasa a ser **`_datos/flota-avanza-zaragoza.json`, artefacto de build, con procedencia dentro**. |
| **§8.3** | ⭐ **La caché gana el PISO 2 en disco.** Deja de depender del número de workers. Ver §3.4. |
| **§9** | **Sigue sin hacer falta base de datos.** V1 no mide. La decisión del histórico queda **anotada y aplazada**, no olvidada. |
| **§10 (agujeros)** | **Agujero nuevo:** *"El registro oficial de flota cubre el 87% de los buses observados. De un bus desconocido decimos SIN DATOS."* |
| **§11.1** | Sin cambios. Tachado solo para desvíos derivados; nota para supresiones. |
| **§11.6** | ✅ **Resuelto sin necesidad de respuesta.** El diseño ya no depende de saber cuántos workers hay — aunque **conviene medirlo igual** (§3.3). |

---

# 5 · LO QUE HAY QUE VIGILAR

1. **⚠️ El maestro de flota CADUCA.** El Anexo 5 es de octubre de 2025 y ya se le escapa el 13% de la calle. **Cada bus nuevo que Avanza matricule aparecerá antes en la calle que en ningún documento.** Hay que instrumentar el aviso: *"detectado el coche 4136, que no está en el maestro"*. Barato, y es el único modo de enterarse.

2. **⚠️ Si adjudican el contrato nuevo, hay que revisitar este informe.** La lista de las 7 líneas pasaría de Nivel 3 a Nivel 2, y el Anexo 5 se convertiría en el registro de una flota que ya no es la vigente (el nuevo contrato exige 97 articulados y ~326 vehículos; hoy hay 118 y 403).

3. **El «Anejo Nº I» de 2013 sigue sin descargarse.** Si algún día quieres el Nivel 2 completo, hay una vía: **una solicitud de acceso a información pública** al Ayuntamiento. No es técnica. Es un formulario.

4. **`_datos/REFERENCIA_..._HEREDADO.json` no se importa desde ningún sitio.** Está para consultarlo un humano. Si alguna vez aparece en un `import`, es un bug.

---

**Fichero de datos creado: `_datos/flota-avanza-zaragoza.json` (403 vehículos, con procedencia dentro).**
**Copia de referencia: `_datos/REFERENCIA_autobuses-avanza-zaragoza_HEREDADO.json`.**
**Cero código de aplicación. El diseño se aprueba antes de construir.**
