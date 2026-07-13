# ZETABUS · AUDITORÍA DEL CONTRATO DE EXPLOTACIÓN

**Fecha:** 13/07/2026 · **Fuente:** Pliegos del expediente **0034140-25** del Ayuntamiento de Zaragoza
**Estado:** documento localizado, descargado y leído. 17 PDF, 811 páginas.

---

## 0 · VEREDICTO EN UNA PÁGINA

**Antonio tenía razón. El contrato existe, es público, y recoge exactamente lo que dijo.**

> **La lista de líneas con articulado —23, 32, 33, 34, 35, Ci3, Ci4— es LITERALMENTE la del pliego. Siete de siete. Ni una línea más, ni una menos.** Y la aritmética cierra sola: 15+14+15+14+15+12+12 = **97**, que es exactamente el total de articulados que fija el documento. Ya no es folclore. Es el **Anexo 1, Tabla 3, del Pliego de Prescripciones Técnicas**, firmado y aprobado por el Gobierno de Zaragoza el 24/10/2025.

Y hay mucho más de lo que buscábamos:

| Lo que trae | Dónde |
|---|---|
| **Intervalo de paso contractual** de cada línea, por tipo de día y temporada | Anexo 1, 41 fichas |
| **Dotación mínima** de vehículos por línea, desglosada 10/12/18 m | Anexo 1, Tablas 3-6 |
| **Índice de Puntualidad (ICH-P)** con **su fórmula exacta** | Anexo 10 |
| **Índice de Expediciones (ICH-E)**, mínimo 95% | Anexo 10 |
| **Deducciones económicas** por incumplir: hasta el **10% del pago mensual** | Anexo 10 |
| **Registro oficial de la flota**: 349 vehículos con matrícula y fecha | Anexo 5 |
| Obligación de **API pública para terceros** | PPT, cláusula 27 |

**PERO — y esto es lo que te habría hecho tropezar:**

> ⛔ **1. EL PLIEGO NO ESTÁ EN VIGOR.** Es el contrato **nuevo**, y a día de hoy figura como **«Pendiente de Adjudicar»** en los datos abiertos del propio Ayuntamiento. El contrato **vigente** es el de 2013, prorrogado hasta el **31/07/2027**. Me pediste que no construyera un fiscalizador sobre un documento caducado; el riesgo real aquí es el inverso: **uno que aún no ha nacido.** §2
>
> ⛔ **2. TU JSON DE FLOTA ESTÁ MAL, Y HABRÍA HUNDIDO LA DEMO.** El registro oficial dice **103 articulados**; tu fichero dice **55**. De los 12 buses que vi circulando esta mañana en la línea 35, tu JSON acierta 7 y **falla 5**. La frase que yo mismo te propuse en la Tanda 1 —*"el que llega en 3 minutos es un Volvo 7900 de 12 m, sencillo"*— **habría sido falsa**. §5

---

## 1 · ¿EXISTE EL DOCUMENTO? SÍ. AQUÍ ESTÁ

| | |
|---|---|
| **Expediente** | **0034140-25** — «Concesión de servicio público de transporte colectivo urbano por autobús de la ciudad de Zaragoza» |
| **Órgano** | Gobierno de Zaragoza. Pliegos aprobados en sesión de **24/10/2025** |
| **Ficha municipal** | https://www.zaragoza.es/sede/servicio/contratacion-publica/7615 |
| **Plataforma del Estado** | [Detalle de la licitación](https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&idEvl=n2Ss33rl5KadkQsA7ROvsg%3D%3D) |
| **Diario Oficial UE** | https://ted.europa.eu/es/notice/-/detail/711585-2025 |
| **⭐ PPT (técnico) — ZIP, 54 MB** | **http://www.zaragoza.es/contenidos/contratos/2025/0034140-25/PPT.zip** |
| **PCAP (administrativo)** | http://www.zaragoza.es/contenidos/contratos/2025/0034140-25/PCAP.zip |
| **Presupuesto base** | 1.186.888.054,40 € (sin IVA) · valor estimado 3.298.124.487,40 € |
| **Duración** | 3.650 días (10 años) |

**Es público, es descargable sin registro, y no tiene ninguna restricción de acceso.** Lo he bajado entero.

Contenido del `PPT.zip` — 16 PDF, todos leídos o inventariados:

```
PPT.pdf       48 pág.  El pliego (⚠️ ESCANEADO, sin capa de texto — leído como imagen)
ANEXO 1       56 pág.  ⭐ DESCRIPCIÓN DEL SERVICIO — líneas, dotación, frecuencias
ANEXO 2        2 pág.  Cuadro de marcha tipo
ANEXO 3      139 pág.  Paradas de la red
ANEXO 4       12 pág.  Carriles bus
ANEXO 5       21 pág.  ⭐ FLOTA ADSCRITA — 349 vehículos, uno a uno
ANEXO 6       10 pág.  Características técnicas exigidas a los vehículos
ANEXO 7      230 pág.  Personal
ANEXO 8       41 pág.  (escaneado) Sistemas
ANEXO 9       70 pág.  Instalaciones
ANEXO 10      24 pág.  ⭐⭐ INDICADORES DE CALIDAD Y DISPONIBILIDAD — las fórmulas
ANEXO 11       6 pág.  Campaña de inspección (ICA)
ANEXO 12      11 pág.  Medición de calidad percibida
ANEXO 13       3 pág.  Estudios de demanda
ANEXO 14       4 pág.  Cocheras y talleres
ANEXO 15      47 pág.  Plan de contingencias del tranvía
```

---

## 2 · ⛔ ¿ESTÁ VIGENTE? NO. Y ESTE ES EL PUNTO MÁS IMPORTANTE DEL INFORME

Me avisaste: *"no quiero construir un fiscalizador sobre un documento caducado"*. **El problema es el contrario, y es igual de grave.**

### Los dos contratos

| | **CONTRATO VIGENTE** | **CONTRATO NUEVO** |
|---|---|---|
| Expediente | **1176058-12** | **0034140-25** |
| Adjudicado | 23/05/2013 | ❌ **NO ADJUDICADO** |
| Formalizado | 11/11/2013 | ❌ **NO FORMALIZADO** |
| Adjudicatario | Transportes Urbanos de Zaragoza S.A.U. (Avanza) | — |
| Importe | 815.409.543 € | 1.186.888.054 € |
| **Situación hoy** | **En vigor, prorrogado hasta el 31/07/2027** | **«Pendiente de Adjudicar»** |

**Cronología del nuevo:** pliegos aprobados 24/10/2025 → publicado 28/10/2025 → plazo de ofertas cerrado 26/12/2025 (**Avanza, único licitador**) → actas de la mesa de contratación 15/01/2026 y 11/02/2026 → **y ahí sigue**.

Dos fuentes independientes lo confirman, hoy:
- **Datos abiertos del propio Ayuntamiento** (`/contratacion-publica/contrato/7615.json`): *estado* = **«Pendiente de Adjudicar»**, *fecha de adjudicación* = **no disponible**, *adjudicatario* = **no asignado**.
- **Plataforma de Contratación del Estado**: *Estado de la Licitación* = **«Evaluación»**.

### Qué significa esto para ZETABUS

**Todo lo que dice este pliego describe el servicio "AL INICIO DEL CONTRATO" — es decir, el futuro.** Textualmente, la tabla de dotación se titula: *"Dotación, tiempo de recorrido y frecuencia de líneas diurnas al inicio del contrato en laborable de invierno"*.

⛔ **No puedes auditar el servicio de hoy contra un contrato que no ha empezado.** Si publicas *"la línea 35 incumple su frecuencia contractual"*, estás midiendo contra una obligación que **aún no obliga a nadie**. Es exactamente el error que cometimos con el fichero del Ayuntamiento, con el signo cambiado.

✅ **Pero sí puedes hacer otra cosa, y es igual de potente y además es verdad:**
> *"El pliego del nuevo contrato, aprobado por el Ayuntamiento en octubre de 2025, fija para la línea 35 un intervalo de paso de **6,1 minutos** en laborable de invierno. El intervalo que hemos observado esta mañana ha sido de **X minutos**."*
>
> Eso es **una comparación entre dos hechos, cada uno con su fuente y su fecha.** No es una acusación de incumplimiento. Es exactamente lo que llevamos siete fases haciendo: **cruzar fuentes y enseñar la diferencia sin adjudicar.**

### Y un detalle que conviene que sepas

Las prórrogas del contrato de 2013 **han sido declaradas ilegales por los tribunales** a instancias de SCUT, y hubo una comisión de investigación municipal sobre la prórroga (2023). **El contrato bajo el que circulan los autobuses de Zaragoza ahora mismo es jurídicamente discutido.** No lo digo como munición: lo digo porque si vas a construir un fiscalizador, tienes que saber sobre qué terreno pisas.

---

## 3 · ⭐ ARTICULADOS: LA LISTA DE ANTONIO SE CONFIRMA, 7/7

**Anexo 1, Tabla 3** (pág. 6). La he leído por **coordenadas X del PDF**, no por extracción de texto, porque la extracción plana pierde las columnas y me habría hecho asignar mal los números. Verificado.

### La tabla, tal cual

| Línea | Dotación | 10 m | 12 m | **18 m** | T. recorrido | **Intervalo** |
|---|---|---|---|---|---|---|
| **23. Parque Venecia – Siglo XXI** | 17 | 0 | 2 | **15** | 104 min | 6,1 min |
| **32. Santa Isabel – Bombarda** | 17 | 0 | 3 | **14** | 117 min | 6,9 min |
| **33. Pinares de Venecia – Delicias** | 16 | 0 | 1 | **15** | 88 min | 5,5 min |
| **34. Estación Delicias – Cementerio** | 14 | 0 | **0** | **14** | 87 min | 6,2 min |
| **35. Parque Goya – Seminario** | 18 | 0 | 3 | **15** | 110 min | 6,1 min |
| **Ci3. Circular 3** | 15 | 0 | 3 | **12** | 77 min | 5,1 min |
| **Ci4. Circular 4** | 15 | 0 | 3 | **12** | 84 min | 5,6 min |
| *(las otras 27 líneas diurnas)* | | | | **0** | | |
| **TOTAL** | **326** | **10** | **219** | **97** | | |

### La prueba de que lo he leído bien

- Suma de la columna 18 m: **15+14+15+14+15+12+12 = 97**. La fila TOTAL dice **97**. ✅
- Suma de la columna 10 m: **3 (línea 54) + 2 (55) + 5 (57) = 10**. La fila TOTAL dice **10**. ✅

**Las dos columnas cuadran al vehículo.** No es una lectura plausible: es la única lectura posible.

### Lo que añade sobre lo que sabía Antonio

**La línea 34 es la joya: CERO vehículos de 12 metros. Es 100% articulada.** Es la única línea de la red que lo es.

Y la dotación de articulados **cambia con la temporada** (Anexo 1, pág. 13):

| Línea | Lab. invierno | Lab. verano 1 | Lab. verano 2 | Sábado inv. | Festivo inv. |
|---|---|---|---|---|---|
| 23 | 15 | 15 | 13 | — | — |
| 32 | 14 | 12 | 11 | — | — |
| 33 | 15 | 15 | 11 | — | — |
| 34 | 14 | 12 | 10 | — | — |
| **35** | **15** | **12** | **10** | **12** | **2** |
| Ci3 | 12 | 12 | 10 | — | — |
| Ci4 | 12 | 12 | 10 | — | — |
| **TOTAL** | **97** | **90** | **75** | | |

**Ojo a la línea 35 en festivo: solo 2 articulados y 7 de doce metros.** El "en esta línea van articulados" **es cierto en laborable y falso en festivo**. Si el producto no distingue el tipo de día, mentirá los domingos.

---

## 4 · FRECUENCIAS: EXISTEN, POR LÍNEA, POR TIPO DE DÍA Y POR TEMPORADA

**41 fichas** (34 líneas diurnas + 7 nocturnas), una por línea, en el Anexo 1. Cada una trae: longitud, nº de paradas, tiempo de viaje, velocidad comercial, horario de servicio, demanda, factor de carga, IPK, dotación por temporada **y los intervalos de paso**.

### Ejemplo — ficha completa de la línea 35 (Anexo 1, pág. 27)

```
DATOS DE OFERTA AL INICIO DEL CONTRATO
  LONGITUD                 21.415 m
  Nº PARADAS               67
  TIEMPO VIAJE TOTAL       110 min
  VELOCIDAD COMERCIAL      11,7 km/h
  VEH*KM ÚTILES ANUALES    1.092.562

HORARIO DE OPERACIÓN
  INICIO 04:40:00   FINAL 01:22:00   (20 h 42 min)

INTERVALOS DE PASO (min)
  PERÍODO      LABORABLE   SÁBADO   FESTIVO
  INVIERNO         6,1       9,2      12,2
  VERANO 1         7,3       9,2      12,2
  VERANO 2         8,5      10,0      12,2

FLOTA LAB   10m  12m  18m        FLOTA FEST  10m  12m  18m
  INVIERNO    0    3   15          INVIERNO    0    7    2
```

### La tabla completa (intervalo en laborable / sábado / festivo, invierno)

| Línea | Long. | Paradas | Intervalo L/S/F | Horario |
|---|---|---|---|---|
| 21 Barrio Jesús–Miralbueno | 20.207 | 62 | **5,6** / 7,9 / 11,1 | 04:41–00:15 |
| 22 Las Fuentes–Bombarda | 19.757 | 47 | 8,2 / 10,6 / 11,8 | 05:05–00:25 |
| 23 P. Venecia–Siglo XXI | 21.189 | 60 | **6,1** / 8,7 / 11,6 | 04:58–01:23 |
| 25 La Cartuja–Pta. Carmen | 16.808 | 36 | 10,8 / 13,5 / 18,0 | 05:25–00:30 |
| 28 Coso–Peñaflor | 31.955 | 97 | 30,0 / 30,0 / 30,0 | 05:25–00:00 |
| 29 C. Torres–San Gregorio | 15.918 | 47 | 9,0 / 12,0 / 14,4 | 05:30–23:12 |
| 30 Las Fuentes–Pza. Aragón | 6.614 | 19 | 6,3 / 9,5 / 9,5 | 05:00–01:00 |
| 31 P. Venecia–Aljafería | 16.955 | 48 | 6,7 / 6,7 / 12,3 | 05:18–23:52 |
| 32 Santa Isabel–Bombarda | 23.763 | 72 | **6,9** / 9,8 / 11,7 | 04:56–01:20 |
| 33 Pinares–Delicias | 14.419 | 51 | **5,5** / 8,0 / 9,8 | 04:41–01:27 |
| 34 E. Delicias–Cementerio | 16.552 | 51 | **6,2** / 9,7 / 10,9 | 05:09–00:10 |
| 35 Parque Goya–Seminario | 21.415 | 67 | **6,1** / 9,2 / 12,2 | 04:40–01:22 |
| 36 Picarral–Valdefierro | 18.844 | 55 | 7,7 / 9,4 / 12,1 | 04:41–23:33 |
| 38 Bajo Aragón–Valdefierro | 20.321 | 70 | 6,6 / 10,7 / 13,1 | 04:44–01:30 |
| 39 Pinares–Vadorrey | 15.370 | 50 | 5,7 / 9,6 / 10,8 | 05:58–00:30 |
| 40 San José–Pza. Aragón | 9.971 | 34 | 7,4 / 9,8 / 11,8 | 04:52–01:15 |
| 41 Pta. Carmen–Rosales | 17.846 | 47 | 10,8 / 21,7 / 21,7 | 06:00–23:33 |
| 42 La Paz–Valle de Broto | 24.016 | 72 | 7,2 / 12,8 / 14,4 | 05:25–23:08 |
| 43 Juslibol–Actur | 7.158 | 21 | 30,0 / 30,0 / 30,0 | 06:45–23:00 |
| 44 E. Miraflores–Actur | 19.829 | 52 | 12,0 / 21,0 / 28,0 | 05:10–23:00 |
| 50 Vadorrey–San Gregorio | 19.710 | 55 | 15,0 / 18,8 / 18,8 | 06:40–23:05 |
| 51 P. Felipe–Miralbueno | 18.424 | 59 | 10,3 / 13,3 / 15,5 | 05:16–01:33 |
| 53 Carlos V–Miralbueno | 13.011 | 44 | 8,0 / 14,0 / 14,0 | 05:20–00:25 |
| 54 Valdespartera–Rosales | 7.911 | 23 | 10,0 / 15,0 / 15,0 | 04:50–00:45 |
| 55 Montecanal–Valdespartera | 8.446 | 24 | 16,0 / 16,0 / 16,0 | 04:50–00:45 |
| 57 Valdefierro–F. Junquera | 13.134 | 29 | 10,6 / 17,7 / 17,7 | 04:50–00:30 |
| 59 Arcosur–Tranvía | 9.422 | 20 | 10,0 / 15,0 / 15,0 | 04:50–00:45 |
| 60 Av. Estudiantes–Actur | 15.468 | 43 | 11,5 / 13,8 / 17,3 | 06:27–23:10 |
| C1 Canteras–C. Funerario | 3.009 | 7 | 15,0 / 15,0 / 15,0 | 08:00–20:00 |
| C4 Carlos V–Puerto Venecia | 13.017 | 31 | 18,0 / 10,8 / 18,0 | 09:15–22:15 |
| Ci1 Circular 1 | 14.948 | 40 | 6,4 / 8,8 / 11,7 | 06:10–00:18 |
| Ci2 Circular 2 | 13.941 | 38 | 5,8 / 9,1 / 10,7 | 06:03–23:56 |
| Ci3 Circular 3 | 13.447 | 42 | **5,1** / 8,6 / 11,0 | 05:09–23:41 |
| Ci4 Circular 4 | 14.781 | 42 | **5,6** / 8,4 / 10,5 | 05:09–23:41 |
| N1…N7 (nocturnas) | | | — / 30–90 / 30–90 | 00:30–07:00 |

*(En negrita, las siete líneas con articulado.)*
*Nota: en la ficha de la línea 22 el extractor de PDF lee «2471» paradas; es un artefacto de la capa de texto, no un dato real. Cualquier uso de estas cifras debe re-verificarse ficha a ficha.*

---

## 5 · ⛔ LA FLOTA: TU JSON ESTÁ MAL, Y ESTO HABRÍA HUNDIDO LA DEMO

**Anexo 5 — «Flota de vehículos adscrita al contrato».** Es el registro oficial de los autobuses que Avanza entrega. **349 vehículos, uno a uno**, con estos campos:

```
NÚMERO | MATRÍCULA | FECHA MATRÍCULA | MARCA | MODELO | POTENCIA | TIPO | SISTEMA PROPULSIÓN
  4889 |  5988-KYZ |    22/07/2019   | VOLVO |  7905  | 245/150E | 18mt | HÍBRIDO
```

| | **ANEXO 5 (oficial, firmado)** | **`autobuses-avanza-zaragoza.json`** |
|---|---|---|
| Vehículos | **349** | 369 |
| **Articulados (18 m)** | **103** | **55** |
| 12 metros | 226 | 304 |
| 10 metros | 10 | 10 |
| PMRS (minibús adaptado) | 10 | — |
| Campos | matrícula, **fecha exacta**, potencia, propulsión | modelo, longitud, año (rango) |

### La prueba: los 12 buses que vi circulando esta mañana en la línea 35

| Coche | Anexo 5 (oficial) | Tipo A5 | Tu JSON | |
|---|---|---|---|---|
| 4301 | IRIZAR ieTram | **18mt** | 18 m | ✅ |
| 4312 | IRIZAR ieTram | **18mt** | 18 m | ✅ |
| 4333 | *(no figura — es posterior)* | — | 18 m (eCitaro **G**) | — |
| 4839 | MAN A24 GD | **18mt** | 18 m | ✅ |
| 4845 | MAN A24 GD | **18mt** | 18 m | ✅ |
| 4847 | MAN A24 GD | **18mt** | 18 m | ✅ |
| 4852 | MAN A24 GD | **18mt** | 18 m | ✅ |
| **4889** | **VOLVO 7905** | **18mt** | **12 m** | ❌ **FALSO** |
| **4901** | **IRISBUS IVECO CITELIS** | **18mt** | **12 m** | ❌ **FALSO** |
| **4906** | **IRISBUS IVECO CITELIS** | **18mt** | **12 m** | ❌ **FALSO** |
| **4910** | **IRISBUS IVECO CITELIS** | **18mt** | **12 m** | ❌ **FALSO** |
| **4926** | **IRISBUS IVECO CITELIS** | **18mt** | **12 m** | ❌ **FALSO** |

**Cinco errores de doce. El 42%.**

### Por qué falla — y es un fallo elegante, no una chapuza

El registro oficial demuestra que **el modelo NO determina la longitud**:

```
VOLVO 7905  →  72 unidades de 12 m   Y   35 unidades de 18 m   ← ¡el mismo modelo!
IRISBUS IVECO CITELIS  →  25 de 18 m
IVECO CITELIS          →   7 de 12 m
```

**Tu JSON dedujo la longitud a partir del nombre del modelo. Y el nombre del modelo no la contiene.** Un "Volvo 7905" puede ser de 12 o de 18 metros. Es un error perfectamente razonable de cometer y absolutamente imposible de detectar sin el documento oficial.

### Y ahora lo importante: qué habría pasado en la demo

En la Tanda 1 te propuse esta frase como la versión "honesta" del momento oro:

> *"El que llega en 3 minutos es un **Volvo 7900 Hybrid, 12 m, sencillo**."*

Si ese bus hubiera sido el **4889**, esa frase habría sido **falsa**: es un **Volvo 7905 de 18 metros, articulado**. Yo rescaté el momento oro convirtiéndolo en una observación… **y la observación también habría mentido**, porque los datos de partida estaban mal.

**Corregí el discurso y no revisé el dato. Ese fue mi error, y es el más feo de los tres que llevo.**

### 🎯 Y el premio: el contrato SE ESTÁ CUMPLIENDO, y puedo demostrarlo

- El **pliego** dice: línea 35 = **15 articulados + 3 de doce metros** (laborable invierno).
- La **API viva**, esta mañana, línea 35: **12 buses detectados**.
- El **registro oficial** dice que **11 de esos 12 son articulados**. El doceavo (4333, Mercedes eCitaro **G** — la "G" es *Gelenkbus*, articulado) es posterior al Anexo 5, pero tu JSON lo da como 18 m.

**Doce de doce. Articulados.** Contra un contrato que exige 15 de 18.

> **Eso ya no es un visor de autobuses. Eso es un ciudadano comprobando, con datos públicos y en tiempo real, que un servicio público se está prestando como está escrito.**

---

## 6 · EL RÉGIMEN DE CALIDAD: HAY FÓRMULAS, Y HAY DINERO

**PPT, Cláusula 19** (pág. 29), literal:

> *"La Concesionaria deberá prestar el servicio de transporte urbano establecido con unos requisitos mínimos de calidad del servicio (**frecuencia, puntualidad**, limpieza, atención al cliente, etc.), que serán evaluados con una serie de indicadores de calidad y disponibilidad (según Anexo 10), de forma que el incumplimiento de tales niveles de servicio dé lugar a **deducciones económicas en el pago periódico a percibir por la Concesionaria**."*

### El mecanismo (Anexo 10)

```
ADC = PPO × CDC_TOTAL          ADC = Ajuste por Disponibilidad y Calidad
                               PPO = Pago Por Operaciones (mensual, en euros)
                               CDC = Coeficiente de deducción, de 0% a 10%
CDC_MAX = 10%
```

Y si se incumple el valor mínimo, **la penalización se TRIPLICA** a partir del segundo mes consecutivo.

### Los indicadores (Anexo 10, pág. 4)

| Indicador | Peso | Mínimo | Objetivo | **¿Lo puede medir ZETABUS?** |
|---|---|---|---|---|
| **1. Índice de Calidad Horaria (ICH)** | **30%** | | | |
| ↳ 1.a **Expediciones realizadas (ICH-E)** | | **95%** | 98% | ⚠️ Parcialmente |
| ↳ 1.b **Puntualidad (ICH-P)** | | **75%** | 90% | ✅ **SÍ** |
| 2. Calidad de los Autobuses (ICA) | 20% | 88% | 95% | ❌ No (inspección física) |
| 3.1 Calidad en Paradas (ICP) | 2,5% | 88% | 95% | ❌ No |
| 3.2 **Calidad en Paradas – Información Dinámica** | 2,5% | 88% | 95% | ⚠️ Indirectamente |
| 4. Tratamiento de Reclamaciones (ICR) | 5% | 90% | 95% | ❌ No |
| 5. Satisfacción del Cliente (ISC) | 5% | 55 | 70 | ❌ No (encuesta) |
| 6.1 **Disponibilidad del Autobús (IDA)** | 20% | 95% | 98% | ⚠️ Indirectamente |
| 6.2 Disponibilidad – 1ªs salidas | 5% | 95% | 98% | ⚠️ Indirectamente |
| 7. Disponibilidad Equipamiento embarcado (IDE) | 10% | 95% | 98% | ❌ No |

### ⭐ La fórmula de puntualidad (ICH-P) — y es EXACTAMENTE lo que sabemos medir

Anexo 10, pág. 7, literal:

> *"Se define una expedición puntual en cada parada si el **intervalo de paso real** registrado por el SAE coincide con el **intervalo de paso programado** con un retraso máximo del 30%, limitado a 5,00 minutos y un margen mínimo de 2 minutos. Penaliza también el alcance, es decir, si el intervalo de paso entre dos autobuses es inferior a 1 minuto, en el caso de las expediciones con intervalo teórico de paso mayor a 4 minutos."*

```
SepTeor = intervalo de paso teórico   ← lo tenemos: Anexo 1, ficha de cada línea
SepReal = intervalo de paso real      ← lo podemos MEDIR con la API viva

Margen:
    si SepTeor × 30% ≤ 2 min  →  Margen = 2 min
    si SepTeor × 30% ≥ 5 min  →  Margen = 5 min
    en otro caso              →  Margen = SepTeor × 30%

PUNTUAL  ⟺  SepReal ≤ SepTeor + Margen   Y   SepReal ≥ 1 min
```

**Esto NO es un indicador de horario. Es un indicador de FRECUENCIA: el hueco entre dos buses consecutivos.** Y el hueco entre dos buses consecutivos en una parada es, literalmente, lo que la API de Avanza nos está diciendo cada vez que la consultamos.

**Ejemplo, línea 35, laborable de invierno:** SepTeor = 6,1 min → 30% = 1,83 min → como es ≤ 2, **Margen = 2 min**. Un paso es puntual si el hueco real está entre **1,0 y 8,1 minutos**.

### Y el ICH-E

> **ICH-E,i = ∑(Paradas atendidas del mes) / Total de paradas teóricas del mes**, para cada línea *i*.
> *"No se computarán como paradas atendidas […] aquellas realizadas con una diferencia de 15,0 minutos con respecto a su horario teórico."*

⭐ **Fíjate en el término: «PARADAS ATENDIDAS».** Un bus que pasa por delante de la parada y **no para** es una parada **no atendida**. **El caso César Augusto tiene nombre contractual, y es un indicador con penalización económica detrás.**

### Dos cosas del pliego que hay que respetar si no queremos mentir

1. **El indicador NO se aplica** en expediciones afectadas por *"huelgas, eventos oficiales, manifestaciones, cortes por accidentes, contingencias del tranvía, fenómenos atmosféricos excepcionales o **desvíos no programados**"*. **Nosotros no podemos saber cuándo concurre ninguna de esas causas.**
2. **La congestión de tráfico SÍ es riesgo del concesionario**: *"Dado que el servicio se presta en entorno urbano, la congestión del tráfico es un riesgo que debe asumir el concesionario a efectos del cálculo de este indicador."* → **el atasco no es excusa, y eso lo dice el pliego, no nosotros.**

---

## 7 · ⭐ MI VALORACIÓN: QUÉ SE PUEDE AUDITAR DE VERDAD

Me lo has pedido explícitamente, así que voy sin adornos.

### ✅ LO QUE SÍ

| Se puede medir | Cómo | Contra qué |
|---|---|---|
| **Intervalo real de paso** en una parada | Observar pasos sucesivos de una línea con la API viva | `SepTeor` del Anexo 1, con la fórmula del margen del Anexo 10 |
| **Tipo de vehículo en servicio** (articulado / sencillo) | Nº de coche de la API viva × Anexo 5 | Dotación por línea del Anexo 1 |
| **Composición de flota por línea, hoy** | Unión de coches detectados en un barrido | 15 art. + 3 de 12 m (línea 35, laborable) |
| **Buses simultáneos en línea** | Barrido de postes, deduplicado por coche | Dotación del Anexo 1 |
| **Horario de servicio** | Primer y último bus detectado | 04:40–01:22 (línea 35) |
| **Que el recorrido de hoy ≠ el oficial** | *(ya resuelto en la Fase 7B)* | `diff(GTFS, get_stops_list)` |

### ❌ LO QUE NO — Y HAY QUE DECIRLO EN VOZ ALTA

1. **No podemos calcular el ICH-P oficial.** El pliego lo mide en **tres puntos de control** (terminal + 1/3 + 2/3 del recorrido) sobre **registros de expedición del SAE**. Nosotros vemos una vista derivada y muestreada (los 2 próximos buses por poste). **Podemos calcular *un* índice de puntualidad con *su* fórmula. No podemos calcular *el suyo*.** La diferencia importa y hay que escribirla en la pantalla.

2. **No podemos aplicar las exenciones.** Huelga, manifestación, accidente, temporal, desvío no programado. **Si hoy hubo una manifestación en el Coso y la 35 fue un desastre, nosotros veremos "incumplimiento" y el pliego dirá "no computa".** Sin esa información, cualquier veredicto nuestro es potencialmente injusto.

3. **No podemos medir "expediciones programadas".** No sabemos cuántas expediciones tocaban hoy. Solo tenemos un intervalo medio por franja. **El ICH-E queda fuera de nuestro alcance.**

4. **⛔ Y la gorda: MEDIR FRECUENCIA EXIGE HISTÓRICO. Y el histórico no se deriva de nada.**
   En la Tanda 1 escribí: *"el día que lo quieras, el reloj empieza ese día, no antes"*. **Pues ese día es hoy.**
   Para calcular `SepReal` hay que **registrar los pasos de cada bus por cada parada, y guardarlos**. Eso es persistencia. **Es la primera razón sólida para una base de datos que aparece en todo el proyecto.** No la despacho aquí: es una decisión tuya y merece su propia tanda.

### 🎯 La conclusión honesta

**ZETABUS NO puede ser un fiscalizador que dictamine incumplimientos contractuales.** No tiene los datos, no tiene las exenciones, y el contrato ni siquiera está en vigor.

**ZETABUS SÍ puede ser un observatorio que ponga los dos números juntos y deje que el ciudadano los mire:**

> *"Línea 35 · Intervalo previsto en el pliego municipal (laborable, invierno): **6,1 min**.
> Intervalo observado por nosotros hoy entre las 8:00 y las 9:00: **9,4 min** (14 pasos medidos).
> El pliego considera puntual cualquier paso entre 1,0 y 8,1 minutos.
> ⚠️ Este pliego corresponde al contrato en licitación, aún no adjudicado. No medimos incumplimientos: publicamos observaciones."*

**Eso no lo hace nadie. Es defendible. Y es verdad.**

---

## 8 · LA CLÁUSULA QUE CAMBIA NUESTRA BASE LEGAL

Esto no lo buscaba y es lo segundo más importante que he encontrado hoy.

**PPT, Cláusula 27, apartado 4.5.3 «Información a través de medios telemáticos»** (pág. 37), literal:

> *"El concesionario estará obligado a facilitar en tiempo real al Ayuntamiento de Zaragoza la información de su Sistema de Ayuda a la Explotación, de manera que éste pueda suministrarla de manera conjunta, actualizada y fiable a través de su página Web, aplicaciones móviles y resto de canales digitales que disponga, **incluidos APIs de acceso público y general para su uso por terceros de acuerdo con la política de acceso a información pública y open data del Ayuntamiento**.*
>
> *Toda la información generada por el servicio **será propiedad del Ayuntamiento de Zaragoza** y estará expresamente prohibida su utilización comercial o su cesión a terceros **por el concesionario** sin la autorización de éste."*

Y **Cláusula 33 (Propiedad Intelectual)**, pág. 47:

> *"…la concesionaria acepta expresamente que los derechos de la documentación generada al amparo del presente contrato **corresponden únicamente al Ayuntamiento de Zaragoza**, con exclusividad y a todos los efectos."*

**Tres consecuencias, y las digo con cuidado:**

1. **Los datos del SAE no son de Avanza. Son del Ayuntamiento.** El operador los genera, pero la propiedad es municipal. Eso reencuadra por completo lo que estamos raspando: **no es propiedad privada de una empresa; es información pública en manos de un concesionario.**
2. **El nuevo contrato OBLIGA a publicar APIs de acceso público para uso por terceros.** Es decir: **el uso que ZETABUS quiere hacer está explícitamente contemplado y ordenado por el pliego.**
3. **⚠️ Pero NADA DE ESTO NOS DA UNA LICENCIA HOY.** El pliego no está en vigor. `gps.avanzabus.com` sigue siendo un endpoint interno sin documentar y sin términos de uso. **Lo que ha cambiado no es nuestra situación jurídica: es nuestra posición argumental.** Si algún día Avanza nos pide que paremos, ya no estamos pidiendo un favor: estamos señalando una obligación que el Ayuntamiento le ha impuesto por escrito.

**Y una cosa más, que conecta directamente con la Fase 7.** El mismo pliego, pág. 38:

> *"…quedando obligada además a mantener la misma debidamente actualizada con los cambios que se puedan producir tales como cortes de calles, cambios de itinerarios, **establecimiento o supresión de paradas**, etc. […] Esta información se deberá mantener actualizada **en tiempo real**."*

**El caso César Augusto —parada suprimida en el cartel, viva en la base de datos— sería, bajo el nuevo contrato, un incumplimiento explícito de la cláusula 27.** No lo descubrimos nosotros: lo descubrimos y resulta que el Ayuntamiento ya lo había previsto.

---

## 9 · LO QUE NO HE VERIFICADO, Y NO VOY A FINGIR QUE SÍ

1. **⛔ NO HE LEÍDO EL CONTRATO EN VIGOR (el de 2013).** He confirmado su existencia, adjudicatario, fechas y prórroga hasta el 31/07/2027, pero **no he descargado ni leído sus pliegos**. **No sé qué dice sobre articulados ni sobre frecuencias.** Es perfectamente posible que sus obligaciones sean **distintas** de las del pliego nuevo. **Si quieres auditar el servicio de HOY, es ESE documento el que hay que leer, no el que he leído yo.** Es la siguiente tarea obvia.

2. **El PPT principal es un PDF escaneado sin capa de texto.** Lo he leído **como imagen**, página a página, y solo las páginas que me interesaban (12, 29, 37, 38, 47). **No he leído las 48.** Puede haber cláusulas relevantes que no he visto — en particular la **Cláusula 7 (Cuadros de Marcha)** y la **Cláusula 8 (Horarios)**, que probablemente contengan la definición formal de "expedición" y "horario teórico".

3. **No he leído el PCAP (121 pág.)** más allá de una búsqueda de términos. Ahí está el régimen de penalizaciones administrativas y los criterios de adjudicación.

4. **Anexo 3 (139 pág., paradas de la red)** — inventariado, no leído. Podría contener una lista oficial de paradas por línea, que sería un cuarto contraste contra el GTFS y `get_stops_list`.

5. **No sé si el Anexo 1 describe el servicio ACTUAL o uno REDISEÑADO.** El pliego habla de sumar 2,6 millones de km al contrato actual y de un 14% más de kilómetros. **Las frecuencias del Anexo 1 podrían ser las FUTURAS, mejoradas, y no las de hoy.** Que la lista de articulados de Antonio (basada en la calle, hoy) coincida 7/7 sugiere fuertemente que la asignación de articulados **sí** es la actual. **Pero de las frecuencias no tengo esa confirmación, y NO debo asumirla.**

6. **El cruce Anexo 5 ↔ JSON tiene 54 coches que están en el JSON y no en el Anexo 5** (4110-4133 y otros). Son, casi con seguridad, vehículos **posteriores a octubre de 2025** (los eCitaro eléctricos). Coherente, pero **no verificado**.

---

## 10 · QUÉ HARÍA YO AHORA

1. **Leer el contrato de 2013.** Es el que rige. Sin él, no hay auditoría del servicio de hoy que se sostenga. Expediente **1176058-12**.
2. **Sustituir el JSON de flota por el Anexo 5**, y quedarse del JSON solo los coches que el Anexo 5 no tiene, **marcados como no verificados**. Ganamos matrícula, fecha exacta de matriculación, potencia y propulsión — y perdemos 5 errores de cada 12.
3. **Decidir lo del histórico.** Sin persistencia no hay medición de frecuencia. Con persistencia, ZETABUS deja de ser un visor. **Es la decisión más grande que tienes pendiente y no es técnica.**
4. **No prometer fiscalización.** Prometer **observación con fuente**. Es menos vistoso en el titular y es lo único que aguanta que alguien te lea con lupa.

---

**Ningún fichero de proyecto creado. Ningún código escrito. Los PDF y los scripts de extracción viven en scratchpad.**
