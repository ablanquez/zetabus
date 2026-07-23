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
 * Desde una parada, la marca de la cabecera solo va al home. Esto responde a la
 * pregunta del que está en la marquesina ("¿qué para aquí y a dónde va?") y da la
 * vuelta a CUALQUIER línea que sirve la parada.
 *
 * ⭐⭐ DOS CAJAS PLEGABLES, MISMO MECANISMO QUE LAS SECCIONES DE LA HOME.
 *  · `<CajaLineas>`   → "Líneas que pasan por aquí" (borde sólido = lo estable).
 *  · `<CajaProvisionales>` → "Hoy, por un desvío" (borde punteado = lo provisional).
 *  Las dos son `<details>` PLEGADAS por defecto (en los dos anchos): las líneas son
 *  CONTEXTO, no el minuto de llegada. El rótulo dice qué hay dentro sin abrirlo, y el
 *  control de plegado es táctil (≥44 px) con el triángulo de la home. Plegado ocupa lo
 *  que un rótulo; se abre cuando de verdad se quiere navegar a una línea.
 *
 *  ⚠️ SON DOS PIEZAS SEPARADAS a propósito: arriba del corte, "Líneas" va en lo alto de
 *     la columna derecha y "Desvío" al fondo, con las llegadas en medio. Por eso ya no
 *     comparten un contenedor: cada una es una celda de la rejilla. Ver globals.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  El dato sale del ÍNDICE DIARIO (`engine/correspondencias`), rehecho cada noche
 *  barriendo el recorrido REAL de hoy: una desviada lejos NO aparece; las que HOY
 *  pasan por un desvío (y no están en la ruta oficial) salen en el recuadro punteado.
 *
 *  ⚠️ EL TÍTULO ES NEUTRO (H6). Sin índice (deploy nuevo, o barrido caído) el lector
 *     cae a MODO DEGRADADO: normales del GTFS, SIN provisionales. El título no promete
 *     "ahora" ni "siempre", y el recuadro de provisionales (lo único que afirma HOY) no
 *     aparece: sin recuadro, no se miente de hoy.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ UN SENTIDO = UNA ENTRADA, también en provisionales. El sentido de una provisional
 *    es irrecuperable tras el barrido, así que se guardó en el índice: "Hacia {destino}".
 * ⚠️ EL VACÍO SE DICE. Sin líneas NO es "no pasa nada": es que hoy no consta.
 */

function hrefDe(fingir: Fingimiento | null) {
  const sufijo = fingir ? `fingir=${fingir}` : '';
  return (short: string, dir: 0 | 1 | null): string => {
    const q = [dir !== null ? `sentido=${dir}` : '', sufijo].filter(Boolean).join('&');
    return `/linea/${encodeURIComponent(short)}${q ? `?${q}` : ''}`;
  };
}

/**
 * La caja plegable, común a las dos (un solo lenguaje, como el filtro). `<details>`
 * nativo → plegar/desplegar sin JS y accesible de fábrica. El `<summary>` es el
 * control táctil (≥44 px) con el rótulo y el triángulo de la home.
 */
function CajaPlegable({
  rotulo,
  punteado,
  papel,
  children,
}: {
  rotulo: React.ReactNode;
  punteado?: boolean;
  papel: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className={`group rounded-tarjeta border bg-[var(--color-papel)] px-3 ${
        punteado ? 'border-dashed' : ''
      } border-[var(--color-borde)]`}
      data-papel={papel}
    >
      <summary className="flex min-h-[var(--control)] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        {rotulo}
        {/* El triángulo gira 90° al abrir. Decorativo: el estado ya lo anuncia el summary. */}
        <span
          aria-hidden="true"
          className="shrink-0 text-[var(--color-tinta-tenue)] transition-transform duration-150 group-[[open]]:rotate-90"
        >
          ▸
        </span>
      </summary>
      <ul className="pb-1" data-papel="lista-lineas-pasan">
        {children}
      </ul>
    </details>
  );
}

/**
 * "Líneas que pasan por aquí". Si NO hay normales NI provisionales, el vacío SE DICE.
 * Si hay provisionales pero no normales, esta caja no sale (la de desvío lo cubre).
 */
export function CajaLineas({ paradaId, fingir }: { paradaId: StopId; fingir: Fingimiento | null }) {
  const { normales, provisionales } = correspondenciasDeParada(paradaId);
  const href = hrefDe(fingir);

  if (normales.length === 0) {
    if (provisionales.length === 0) {
      return (
        <p
          className="rounded-tarjeta border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="lineas-sin-dato"
        >
          Hoy no nos consta ninguna línea por esta parada. No es que no pase ninguna: es que no lo
          tenemos. No nos lo inventamos.
        </p>
      );
    }
    return null;
  }

  return (
    <CajaPlegable
      papel="lineas-que-pasan"
      rotulo={
        <h2
          className="text-nota font-bold leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="normales-rotulo"
        >
          Líneas que pasan por aquí
        </h2>
      }
    >
      {normales.map((e, i) => (
        <FilaLinea key={`${e.linea.shortName}-${clave(e)}`} e={e} href={href} conRaya={i > 0} />
      ))}
    </CajaPlegable>
  );
}

/** "Hoy, por un desvío". Solo existe si hay provisionales (y por tanto, si hay índice). */
export function CajaProvisionales({
  paradaId,
  fingir,
}: {
  paradaId: StopId;
  fingir: Fingimiento | null;
}) {
  const { provisionales } = correspondenciasDeParada(paradaId);
  if (provisionales.length === 0) return null;
  const href = hrefDe(fingir);

  return (
    <CajaPlegable
      punteado
      papel="provisionales-que-pasan"
      rotulo={
        <p
          className="text-nota font-bold leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="provisionales-rotulo"
        >
          Hoy, por un desvío
        </p>
      }
    >
      {provisionales.map((e, i) => (
        <FilaLinea
          key={`${e.linea.shortName}-${clave(e)}`}
          e={e}
          href={href}
          conRaya={i > 0}
          provisional
        />
      ))}
    </CajaPlegable>
  );
}

const clave = (e: LineaQuePasa): string =>
  e.rumbo.tipo === 'sentido'
    ? String(e.rumbo.directionId)
    : e.rumbo.tipo === 'circular'
      ? e.rumbo.por
      : e.rumbo.texto;

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
        <ChipLinea linea={e.linea} papel="chip-linea-pasa" enlace={false} />
        <span className="min-w-0 font-semibold">
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
