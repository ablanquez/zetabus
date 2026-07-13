# Datos

## Qué hay aquí

| Fichero | Qué es | ¿Versionado? |
|---|---|---|
| `flota-avanza-zaragoza.json` | **El maestro de flota.** 403 vehículos, con procedencia escrita dentro de cada registro. | ✅ **Sí** |
| `referencia/` | El fichero de flota **heredado**. Material de auditoría, **no de producto**. | ✅ Sí — [ver por qué](referencia/README.md) |
| `gtfs/` | El GTFS del NAP. | ❌ **No** — [ver por qué](gtfs/README.md) |

---

## El maestro de flota

Regenerado el 13/07/2026 desde el **Anexo 5 del pliego de contratación municipal** (expediente
0034140-25), no parcheado desde el fichero anterior. La diferencia importa: ver
[`docs/LECCIONES.md` · L3](../docs/LECCIONES.md).

**Cada vehículo lleva su fuente y su confianza encima:**

```jsonc
{ "coche": 4889, "matricula": "5988-KYZ", "fechaMatriculacion": "2019-07-22",
  "fabricante": "VOLVO", "modelo": "7905", "longitudM": 18, "clase": "articulado",
  "fuente": "pliego-2025-anexo5", "confianza": "oficial" }
```

- **350 vehículos** con `confianza: "oficial"` — del registro del pliego.
- **53 vehículos** con `confianza: "sin_verificar"` — del fichero heredado. Son los que el
  registro oficial no tiene (autobuses eléctricos entregados **después** de octubre de 2025).
  **Se marcan, no se disimulan**, y en pantalla llevarán un asterisco.

### ⚠️ Dos advertencias que no se pueden ignorar

**1 · NO derivar la longitud del nombre del modelo.** Hay **72 Volvo 7905 de 12 metros y 35 de
18 metros** — mismo nombre. El fichero heredado la dedujo del modelo y erró **62 de 316 (20%)**,
siempre en el mismo sentido: ocultaba articulados.

**2 · El registro oficial NO es un censo completo.** Cubre el **87%** de los buses observados en
la calle. **Si un coche no está en el maestro, la interfaz dice `SIN DATOS`.** Nunca un valor por
defecto: un valor por defecto miente, y encima con confianza.

**El maestro caduca.** Cada autobús nuevo que Avanza matricule aparecerá en la calle antes que en
ningún documento. Hay que instrumentar el aviso: *«detectado el coche 4136, que no está en el
maestro»*.
