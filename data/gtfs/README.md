# El GTFS no está en el repositorio

**Hay que descargarlo.** Aquí está cómo, y por qué no viene incluido.

---

## Por qué NO se versiona

**La licencia lo permitiría.** La licencia de datos abiertos del MITMS autoriza expresamente
*«compartir (copiar, distribuir)»* los datos del NAP. **No es un problema legal.**

**El motivo es de frescura, y es más serio:**

- **Caduca.** El feed lleva un `feed_end_date` — el nuestro expiraba el **05/10/2026**. Un ZIP
  versionado no caduca: se queda ahí, pareciendo válido, mientras alguien construye contra él.
- **Cambia.** Avanza lo republica cada pocos meses. Mientras escribíamos esto, el NAP lo
  actualizó **el mismo día**.
- **Pesa 6,6 MB** de binario. Git guarda **todas** las versiones, para siempre.

> Un fichero de datos que se pudre en silencio dentro de un repositorio es exactamente el tipo
> de error que este proyecto lleva siete informes intentando no cometer.

---

## Cómo conseguirlo

**1 · Regístrate en el Punto de Acceso Nacional** (gratis, la ApiKey se emite al instante):

> https://nap.transportes.gob.es

**2 · Pon la clave en `.env.local`** (que está ignorado por git — compruébalo si dudas):

```bash
NAP_API_KEY=tu-clave-aqui
```

**3 · Descarga el fichero 1176** — «Transporte urbano de Zaragoza»:

```bash
curl -H "ApiKey: $NAP_API_KEY" \
     -o data/gtfs/zaragoza-gtfs.zip \
     "https://nap.transportes.gob.es/api/Fichero/download/1176"
```

**4 · Comprueba que es el que crees.** Mira `feed_info.txt`:

```
feed_start_date, feed_end_date, feed_version
```

⚠️ **Si `feed_end_date` ya pasó, el fichero está caducado. Descarga uno nuevo.**

---

## Qué pasa si no está

**El build falla, y falla ruidosamente.** No arranca con datos vacíos.

Un mapa sin paradas que no se queja es peor que un error: el error lo arreglas, y el mapa vacío
lo publicas.

---

## Atribución

Si redistribuyes estos datos, el MITMS exige: **«Powered by MITRAMS»** con enlace a
https://www.transportes.gob.es/, citar al MITMS como fuente, e indicar si el dato es **bruto o
procesado**. Ver [`THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md).
