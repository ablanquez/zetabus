import Link from 'next/link';
import { correspondenciasDeParada, type LineaQuePasa } from '@/engine/correspondencias';
import { ChipLinea } from '@/components/ChipLinea';
import { Toponimo } from '@/components/Toponimo';
import { Cita } from '@/components/Cita';
import { AcuseDeToque } from '@/components/AcuseDeToque';
import type { StopId } from '@/core';
import type { Fingimiento } from '@/engine/fingir';

/**
 * ⭐ LAS LÍNEAS QUE PASAN POR ESTA PARADA — Y EL CAMINO DE VUELTA A CADA UNA.
 *
 * Desde una parada, la marca de la cabecera solo va al home. Esta sección responde a
 * la pregunta del que está en la marquesina ("¿qué para aquí y a dónde va?") y, de
 * paso, da la vuelta a CUALQUIER línea que sirve la parada —mejor que la vieja flecha,
 * que solo volvía a la de procedencia—.
 *
 * ⚠️ VA DEBAJO de las llegadas: el primer minuto de llegada manda (ver el test de
 *    flotación). Esto es contexto, no el dato por el que se abre la app.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⭐⭐ AHORA EL DATO SALE DEL ÍNDICE DIARIO (`engine/correspondencias`), NO DEL GTFS.
 *
 *  El índice se rehace cada noche barriendo el recorrido REAL de hoy. Por eso:
 *   · el TÍTULO ya no dice "habitualmente": lo que sale son líneas que HOY pasan por
 *     aquí (una desviada lejos NO aparece). El rótulo se ganó el cambio.
 *   · las que HOY pasan por un DESVÍO —y que no están en la ruta oficial— salen en un
 *     recuadro punteado aparte: son provisionales, y puede que mañana no estén.
 *
 *  ⚠️ EL TÍTULO ES NEUTRO A PROPÓSITO (H6). Si un día no hay índice (deploy nuevo, o
 *     el barrido cayó), el lector cae a MODO DEGRADADO: normales del GTFS, SIN
 *     provisionales. En ese modo las normales vuelven a ser "habituales" —pero el
 *     título no promete "ahora" ni "siempre", y el recuadro de provisionales (la única
 *     pieza que afirma algo de HOY) no aparece—. Sin recuadro, no se miente de hoy: la
 *     lista desnuda es "líneas que pasan por aquí", cierta en los dos modos. El
 *     degradado se nota donde toca —/api/diag y el panel—, no en esta pantalla.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ UN SENTIDO = UNA ENTRADA, también en las provisionales. "¿A dónde va?" tiene DOS
 *    respuestas cuando la línea pasa en los dos sentidos. El sentido de una provisional
 *    es IRRECUPERABLE tras el barrido (no está en el oficial), así que se guardó en el
 *    índice: aquí se pinta "Hacia {destino}" igual que en una normal.
 *
 * ⚠️ EL VACÍO SE DICE. Sin líneas NO es "no pasa nada": es que hoy no consta. Se pinta
 *    el aviso, no un cero mudo (ley del proyecto).
 */
export function LineasQuePasan({
  paradaId,
  fingir,
}: {
  paradaId: StopId;
  fingir: Fingimiento | null;
}) {
  const { normales, provisionales } = correspondenciasDeParada(paradaId);
  const sufijo = fingir ? `fingir=${fingir}` : '';
  const href = (short: string, dir: 0 | 1 | null): string => {
    const q = [dir !== null ? `sentido=${dir}` : '', sufijo].filter(Boolean).join('&');
    return `/linea/${encodeURIComponent(short)}${q ? `?${q}` : ''}`;
  };

  const vacio = normales.length === 0 && provisionales.length === 0;

  return (
    <section className="mt-6" data-papel="lineas-que-pasan" aria-label="Líneas que pasan por aquí">
      {vacio ? (
        // ⚠️ No es "no pasa ninguna": es que hoy no consta en NUESTRO dato.
        <p
          className="mt-2 rounded-tarjeta border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="lineas-sin-dato"
        >
          Hoy no nos consta ninguna línea por esta parada. No es que no pase ninguna: es que no lo
          tenemos. No nos lo inventamos.
        </p>
      ) : (
        <>
          {/* ⭐ LAS NORMALES, EN SU PROPIA CAJA. Antes iban sueltas sobre el lienzo y las
              provisionales en caja: parecían dos jerarquías cuando son dos CATEGORÍAS del
              mismo nivel. Ahora son DOS BLOQUES HERMANOS. La forma los distingue —borde
              SÓLIDO (lo estable) frente al PUNTEADO de abajo (lo provisional)—, y CADA uno
              lleva su rótulo DENTRO, arriba a la izquierda: "Líneas que pasan por aquí" y
              "Hoy, por un desvío", el mismo tratamiento para los dos. */}
          {normales.length > 0 && (
            <div
              className="mt-2 rounded-tarjeta border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2"
              data-papel="normales-que-pasan"
            >
              <h2 className="text-nota font-bold leading-snug text-[var(--color-tinta-suave)] sin-recortar" data-papel="normales-rotulo">
                Líneas que pasan por aquí
              </h2>
              <ul className="mt-0.5" data-papel="lista-lineas-pasan">
                {normales.map((e, i) => (
                  <FilaLinea key={`${e.linea.shortName}-${clave(e)}`} e={e} href={href} conRaya={i > 0} />
                ))}
              </ul>
            </div>
          )}

          {/* ⭐ EL RECUADRO PUNTEADO ENVUELVE AL GRUPO DE PROVISIONALES. La forma
              (borde punteado) las separa; la palabra ("Hoy, por un desvío") las nombra
              —forma + texto, nunca forma sola: en gris se sigue leyendo, ley del
              proyecto—. Y ese texto ES la promesa de HOY: en modo degradado este bloque
              no existe (no hay provisionales), así que nunca se afirma "hoy" en falso. */}
          {provisionales.length > 0 && (
            <div
              className="mt-3 rounded-tarjeta border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2"
              data-papel="provisionales-que-pasan"
            >
              <p className="text-nota font-bold leading-snug text-[var(--color-tinta-suave)] sin-recortar" data-papel="provisionales-rotulo">
                Hoy, por un desvío
              </p>
              <ul className="mt-0.5" data-papel="lista-provisionales-pasan">
                {provisionales.map((e, i) => (
                  <FilaLinea key={`${e.linea.shortName}-${clave(e)}`} e={e} href={href} conRaya={i > 0} provisional />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const clave = (e: LineaQuePasa): string =>
  e.rumbo.tipo === 'sentido' ? String(e.rumbo.directionId) : e.rumbo.tipo === 'circular' ? e.rumbo.por : e.rumbo.texto;

/**
 * Una fila: chip de línea (color = identidad) + a dónde va. Igual para normales y
 * provisionales —el reparto lo hace el contenedor, no la fila—.
 */
function FilaLinea({
  e,
  href,
  conRaya,
  provisional,
}: {
  e: LineaQuePasa;
  href: (short: string, dir: 0 | 1 | null) => string;
  conRaya: boolean;
  provisional?: boolean;
}) {
  const dir = e.rumbo.tipo === 'sentido' ? e.rumbo.directionId : null;
  const aria =
    e.rumbo.tipo === 'sentido'
      ? `Ver la línea ${e.linea.shortName}, hacia ${e.rumbo.destino}`
      : e.rumbo.tipo === 'circular'
        ? `Ver la línea ${e.linea.shortName}, circular por ${e.rumbo.por}`
        : `Ver la línea ${e.linea.shortName}`;
  return (
    <li>
      <Link
        href={href(e.linea.shortName, dir)}
        aria-label={aria}
        data-papel="linea-que-pasa"
        data-linea={e.linea.shortName}
        data-provisional={provisional ? 'si' : undefined}
        className={`flex min-h-[var(--control)] items-center gap-2.5 py-1 text-cuerpo leading-snug text-[var(--color-tinta)] sin-recortar ${
          conRaya ? 'border-t border-[var(--color-borde)]' : ''
        }`}
      >
        {/* El chip lleva el COLOR de la línea (identidad, no decoración) y su número
            (texto): la información sobrevive al gris. */}
        <ChipLinea linea={e.linea} papel="chip-linea-pasa" enlace={false} />
        <span className="min-w-0 font-semibold">
          {/* "Hacia"/"Circular por" son NUESTROS; el destino es toponimia del GTFS
              corregida → <Toponimo>; el "por" y el nombre del búho, verbatim → <Cita>. */}
          {e.rumbo.tipo === 'sentido' ? (
            <>
              Hacia <Toponimo>{e.rumbo.destino}</Toponimo>
            </>
          ) : e.rumbo.tipo === 'circular' ? (
            <>
              Circular por <Cita>{e.rumbo.por}</Cita>
            </>
          ) : (
            <Cita>{e.rumbo.texto}</Cita>
          )}
        </span>
        <AcuseDeToque />
      </Link>
    </li>
  );
}
