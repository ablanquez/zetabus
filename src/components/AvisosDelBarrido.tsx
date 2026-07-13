'use client';

import { useState } from 'react';

/**
 * ⚠️ EL BLOQUE DE AVISOS. ESTABA ROTO, Y ROTO DE LA PEOR MANERA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QUÉ PASABA A 360 px EN /linea/35:
 *
 *    · Los tres avisos de timeout OCUPABAN MÁS QUE EL RECUENTO.
 *    · Lo PRIMERO que se leía era un fallo, no el hallazgo.
 *    · Repetían la misma explicación TRES VECES.
 *    · Y enseñaban la URL completa del endpoint de Avanza, dentro de la interfaz.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ Y EL DAÑO NO ES ESTÉTICO. ES QUE DESTRUYE EL PRODUCTO ENTERO:
 *
 * **Un aviso que grita más que el dato hace que se dejen de leer LOS DOS.**
 * El usuario aprende a saltarse los avisos — y entonces, el día que el aviso
 * IMPORTA de verdad ("este dato es de hace cuatro minutos", "esta ficha no está
 * verificada"), tampoco lo lee. Y toda la honestidad de este proyecto, que se
 * apoya en que los avisos SE LEAN, se va por el desagüe.
 *
 * Un proyecto que avisa de todo no avisa de nada.
 *
 * ⇒ EL RECUENTO MANDA. El aviso se RESUME en una línea ("3 de 18 postes no
 *   respondieron") y el detalle se despliega SOLO SI ALGUIEN LO PIDE.
 *   La URL del endpoint, fuera: eso es para el log, no para el usuario.
 */

/** Todo lo que huela a interioridad técnica se queda fuera de la pantalla. */
function limpiar(aviso: string): string {
  return aviso
    .replace(/https?:\/\/\S+/g, '') // la URL de Avanza NO se enseña
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function AvisosDelBarrido({
  avisos,
  postesConsultados,
  postesFallidos,
  postesRancios,
}: {
  avisos: readonly string[];
  postesConsultados: number;
  postesFallidos: number;
  postesRancios: number;
}) {
  const [abierto, setAbierto] = useState(false);
  if (avisos.length === 0) return null;

  /**
   * ⚠️ NO RESPONDIÓ ≠ RESPONDIÓ VIEJO. Y CONFUNDIRLOS PRODUJO ESTO EN PANTALLA:
   *
   *     "Detectamos 4 autobuses"   ...   "17 de 17 postes NO RESPONDIERON"
   *
   * Si no respondió ninguno, ¿de dónde salían los cuatro autobuses? De la caché.
   * Servirlos estaba BIEN (con su trama de rancio y su edad a la vista). Lo que
   * estaba mal era el resumen: contaba como "fallido" a todo poste que hubiera
   * generado un aviso, incluidos los que SÍ dieron dato, solo que viejo.
   *
   * Una pantalla que se contradice consigo misma en dos líneas seguidas es la
   * pantalla coherente y falsa en su forma más tonta. Y el que la escribió era yo.
   */
  const partes: string[] = [];
  if (postesFallidos > 0) {
    partes.push(`${postesFallidos} de ${postesConsultados} postes no respondieron`);
  }
  if (postesRancios > 0) {
    partes.push(
      `${postesRancios} ${postesRancios === 1 ? 'dio' : 'dieron'} un dato viejo (se usa, pero se dice)`,
    );
  }
  const resumen = partes.length > 0
    ? `${partes.join(' · ')}.`
    : `${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'} durante el recuento.`;

  return (
    <div className="mt-2" data-papel="avisos-barrido">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex min-h-[36px] w-full items-center gap-2 rounded-lg border border-dashed border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-left"
      >
        <span className="text-[11px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
          ⚠ {resumen}{' '}
          <span className="font-semibold underline underline-offset-2">
            {abierto ? 'ocultar detalle' : 'ver detalle'}
          </span>
        </span>
      </button>

      {abierto && (
        <ul className="mt-1 flex flex-col gap-1 px-2" data-papel="avisos-detalle">
          {avisos.map((a, i) => (
            <li
              key={i}
              className="text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
            >
              · {limpiar(a)}
            </li>
          ))}
          <li className="mt-1 text-[11px] italic leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
            Un poste que no responde NO significa que no pase ningún autobús por él: significa que
            no hemos podido preguntarlo. Puede haber autobuses de esta línea que no salgan en el
            recuento.
          </li>
        </ul>
      )}
    </div>
  );
}
