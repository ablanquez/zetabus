/**
 * ⭐ EL CÓDIGO DE SALIDA QUE DISTINGUE «LA FUENTE NO RESPONDIÓ» DE «FALLO NUESTRO».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Lo usan `build-nombres.ts` y `build-correspondencias.ts` al SALIR, y lo leen
 *  `ensure-nombres.ts` y `ensure-correspondencias.ts` al recoger su `spawnSync`.
 *
 *  ⚠️ POR QUÉ SE MARCA SOLO EL FALLO BENIGNO, Y NO EL INTERNO. Un error interno
 *     —un módulo que no resuelve, un error de sintaxis, una excepción no
 *     capturada— MATA al hijo antes de que corra una sola línea nuestra: nunca
 *     podría elegir un código de salida. Así que el interno NO se detecta: se
 *     DEDUCE por complemento. Marcamos en positivo la ÚNICA caída benigna —«Avanza
 *     no respondió lo bastante», que sí es una rama deliberada de nuestro código—
 *     y tratamos TODO LO DEMÁS (código 1, crash, no-arranca, señal) como fallo
 *     propio. Es robusto precisamente porque no depende de que el hijo llegue vivo.
 *
 *  Y por eso los `ensure` reaccionan distinto:
 *    · fuente caída  → recuadro honesto, el build CONTINÚA (app en degradado);
 *    · fallo nuestro → el build PARA. No se despliega un fallo que no entendemos
 *      disfrazado de caída de Avanza. Mismo criterio que `fetch-gtfs` con la
 *      `NAP_API_KEY` ausente: un fallo propio y permanente no se traga.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Salida de los `build-*` cuando la FUENTE (Avanza) no llegó al suelo de respuestas. */
export const CODIGO_FUENTE_CAIDA = 3;
