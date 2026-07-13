/**
 * L1 · TODO EXTRACTOR NECESITA UN CONTADOR DE CONTROL INDEPENDIENTE.
 *
 * "Un extractor que no sabe cuántas filas DEBERÍA haber sacado, miente con
 * confianza."  — docs/LECCIONES.md
 *
 * La cicatriz: al parsear el Anexo 5 del pliego, el extractor devolvió 349
 * vehículos de 350. Sin errores. Sin avisos. Sin excepciones. Un carácter
 * invisible (U+200D) pegado a un número hizo que una fila no casara con el
 * patrón, y el parser SIGUIÓ A LO SUYO. Se detectó porque se contaron las
 * matrículas POR SEPARADO —otra señal, otro método— y no cuadraban.
 *
 * Esto convierte esa lección en código. Todo extractor de este proyecto emite
 * DOS números y falla si no coinciden.
 *
 * ⚠️ LA REGLA QUE HACE QUE FUNCIONE:
 *    El contador de control tiene que ser INDEPENDIENTE del parser. Si cuentas
 *    con la misma expresión regular con la que extraes, no has verificado nada:
 *    has repetido el mismo error dos veces.
 */

export class ControlCountError extends Error {
  constructor(
    readonly subject: string,
    readonly expected: number,
    readonly got: number,
    readonly how: string,
  ) {
    super(
      `[contador de control] ${subject}: se esperaban ${expected} y se obtuvieron ${got} ` +
        `(faltan ${expected - got}).\n` +
        `  Cómo se contó lo esperado: ${how}\n` +
        `  Esto NO es un aviso. El extractor ha perdido filas EN SILENCIO y no se puede ` +
        `confiar en su salida. Ver docs/LECCIONES.md · L1.`,
    );
    this.name = 'ControlCountError';
  }
}

/**
 * Falla RUIDOSAMENTE si el extractor no sacó lo que debía.
 *
 * @param subject  Qué se estaba extrayendo. Sale en el mensaje de error.
 * @param expected Cuántas filas debería haber. Contadas de forma INDEPENDIENTE.
 * @param got      Cuántas sacó el parser.
 * @param how      Cómo se obtuvo `expected`. Obligatorio: si no sabes explicarlo,
 *                 probablemente lo has contado con el mismo método que `got`,
 *                 y entonces no has verificado nada.
 */
export function assertCount(
  subject: string,
  expected: number,
  got: number,
  how: string,
): void {
  if (expected !== got) {
    throw new ControlCountError(subject, expected, got, how);
  }
}

/** Lo que un extractor reporta de sí mismo. Se imprime en el build. */
export interface ControlReport {
  readonly subject: string;
  readonly expected: number;
  readonly got: number;
  readonly how: string;
}

export function control(
  subject: string,
  expected: number,
  got: number,
  how: string,
): ControlReport {
  assertCount(subject, expected, got, how);
  return { subject, expected, got, how };
}
