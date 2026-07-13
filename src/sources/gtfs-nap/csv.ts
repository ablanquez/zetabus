import { control, type ControlReport } from '@/core';

/**
 * Parser CSV para GTFS (RFC 4180: comillas dobles, comas dentro de comillas,
 * CRLF, BOM).
 *
 * ⚠️ Escrito a mano y no con `split(',')` porque el GTFS de Zaragoza tiene
 * campos entrecomillados con comas dentro:
 *     16487,PA00002,"Agustín Príncipe N. º 2",,41.65,-0.92,...
 * Un `split(',')` los parte por la mitad y desplaza TODAS las columnas
 * siguientes. Silenciosamente.
 */

export interface CsvTable {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly control: ControlReport;
}

/**
 * ⭐ EL CONTADOR DE CONTROL — INDEPENDIENTE DEL PARSER (L1).
 *
 * Cuenta registros recorriendo el texto carácter a carácter y alternando el
 * estado "dentro de comillas". NO comparte una sola línea de lógica con
 * `parseCsv`, que trocea campos.
 *
 * Si contara con el mismo método con el que extraigo, no habría verificado
 * nada: habría repetido el mismo error dos veces.
 */
export function countCsvRecords(text: string): number {
  let records = 0;
  let inQuotes = false;
  let sawContent = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') i++; // comilla escapada
        else inQuotes = false;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      sawContent = true;
    } else if (c === '\n') {
      if (sawContent) records++;
      sawContent = false;
    } else if (c !== '\r') {
      sawContent = true;
    }
  }
  if (sawContent) records++; // última línea sin salto final
  return records;
}

/** Trocea el texto en filas y campos. Nada de contar aquí. */
function splitRecords(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let touched = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    if (touched) {
      endField();
      out.push(row);
    }
    row = [];
    field = '';
    touched = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      touched = true;
    } else if (c === ',') {
      endField();
      touched = true;
    } else if (c === '\n') {
      endRow();
    } else if (c !== '\r') {
      field += c;
      touched = true;
    }
  }
  endRow();
  return out;
}

/**
 * Parsea una tabla CSV y VERIFICA que no ha perdido filas.
 *
 * Lanza `ControlCountError` si el troceado y el contador independiente no
 * coinciden. No devuelve una tabla incompleta con un aviso: **falla**.
 */
export function parseCsv(name: string, raw: string): CsvTable {
  // El BOM se quita ANTES de las dos cuentas, para que ambas vean lo mismo.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const expected = countCsvRecords(text); // ← señal independiente
  const records = splitRecords(text); // ← el parser

  const rep = control(
    `${name}: registros CSV`,
    expected,
    records.length,
    'recuento carácter a carácter alternando el estado "dentro de comillas", sin trocear campos',
  );

  if (records.length === 0) {
    return { header: [], rows: [], control: rep };
  }
  const [header, ...rows] = records;
  return { header, rows, control: rep };
}

/** Vista por nombre de columna. Falla si falta una columna obligatoria. */
export function columns(t: CsvTable, required: readonly string[]): (row: readonly string[], col: string) => string {
  const idx = new Map(t.header.map((h, i) => [h.trim(), i]));
  const missing = required.filter((c) => !idx.has(c));
  if (missing.length > 0) {
    throw new Error(
      `columnas obligatorias ausentes: ${missing.join(', ')}. Presentes: ${t.header.join(', ')}`,
    );
  }
  return (row, col) => {
    const i = idx.get(col);
    return i === undefined ? '' : (row[i] ?? '').trim();
  };
}

/** ¿Tiene la tabla esta columna? (GTFS tiene muchas opcionales.) */
export function hasColumn(t: CsvTable, col: string): boolean {
  return t.header.some((h) => h.trim() === col);
}

/**
 * Recorre una tabla grande SIN materializarla.
 *
 * `stop_times.txt` son 47 MB y ~1,1 M de filas. Construir el array completo se
 * come cientos de megas para nada: solo necesitamos recorrerlo dos veces.
 *
 * ⚠️ El contador de control SIGUE ESTANDO. Este atajo es de memoria, no de
 * rigor: si aquí se perdiera una fila en silencio, tendríamos exactamente el
 * fallo del Anexo 5 otra vez.
 */
export function streamCsv(
  name: string,
  raw: string,
  onRow: (get: (col: string) => string) => void,
): ControlReport {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const expected = countCsvRecords(text); // ← señal independiente, igual que arriba

  const records = splitRecords(text);
  if (records.length === 0) {
    return control(`${name}: registros CSV`, expected, 0, 'recuento independiente');
  }
  const header = records[0];
  const idx = new Map(header.map((h, i) => [h.trim(), i]));

  let seen = 1; // la cabecera cuenta como registro
  for (let r = 1; r < records.length; r++) {
    const row = records[r];
    onRow((col) => {
      const i = idx.get(col);
      return i === undefined ? '' : (row[i] ?? '').trim();
    });
    seen++;
  }

  return control(
    `${name}: registros CSV`,
    expected,
    seen,
    'recuento carácter a carácter alternando el estado "dentro de comillas", sin trocear campos',
  );
}
