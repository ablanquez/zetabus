import Link from 'next/link';
import { lineasQuePasanPor } from '@/engine/topologia';
import { ChipLinea } from '@/components/ChipLinea';
import { Toponimo } from '@/components/Toponimo';
import { Cita } from '@/components/Cita';
import { AcuseDeToque } from '@/components/AcuseDeToque';
import type { StopId } from '@/core';
import type { Fingimiento } from '@/engine/fingir';

/**
 * ⭐ LAS LÍNEAS QUE PASAN POR ESTA PARADA — Y EL CAMINO DE VUELTA A CADA UNA.
 *
 * Desde una parada, la marca de la cabecera solo va al home. Esta sección es la
 * respuesta a la pregunta del que está en la marquesina ("¿qué para aquí y a dónde
 * va?") y, de contestarla bien, sale gratis la vuelta a CUALQUIER línea que sirve
 * la parada —mejor que la vieja flecha, que solo volvía a la de procedencia—.
 *
 * ⚠️ VA DEBAJO de las llegadas: el primer minuto de llegada manda (ver el test de
 *    flotación). Esto es contexto, no el dato por el que se abre la app.
 *
 * ⚠️ EL RÓTULO DICE "HABITUALMENTE", Y NO ES ADORNO. El dato es la ruta OFICIAL del
 *    GTFS (`official.stops`): estructural, completa, e independiente de si hay bus
 *    ahora (una línea sin llegadas previstas hoy SÍ aparece). Pero en una línea
 *    desviada HOY, esa ruta nominal puede nombrarla aunque hoy no pase. Saber el
 *    estado de desvío costaría una petición por línea, y esta pantalla no la paga.
 *    Así que se matiza el dato en el rótulo en vez de afirmar "pasa por aquí" a
 *    secas —que podría ser falso hoy—. O se matiza el dato, o se matiza el rótulo:
 *    callarlo, no.
 *
 * ⚠️ UN SENTIDO = UNA ENTRADA. Si la línea pasa en los dos sentidos, son dos
 *    destinos distintos, dos enlaces (`?sentido=`). Circular / búho / sentido
 *    irresoluble → enlace pelado, sin elegir un sentido por defecto. Nada inventado.
 *
 * ⚠️ EL VACÍO SE DICE. Sin líneas en el dato NO es "no pasa nada": es "no lo
 *    sabemos". Se pinta el aviso, no un cero mudo (ley del proyecto).
 */
export function LineasQuePasan({
  paradaId,
  fingir,
}: {
  paradaId: StopId;
  fingir: Fingimiento | null;
}) {
  const lineas = lineasQuePasanPor(paradaId);
  const sufijo = fingir ? `fingir=${fingir}` : '';
  const href = (short: string, dir: 0 | 1 | null): string => {
    const q = [dir !== null ? `sentido=${dir}` : '', sufijo].filter(Boolean).join('&');
    return `/linea/${encodeURIComponent(short)}${q ? `?${q}` : ''}`;
  };

  return (
    <section className="mt-6" data-papel="lineas-que-pasan" aria-labelledby="lineas-que-pasan-titulo">
      <h2
        id="lineas-que-pasan-titulo"
        className="text-menor font-bold text-[var(--color-tinta-tenue)] sin-recortar"
      >
        Líneas que pasan por aquí habitualmente
      </h2>

      {lineas.length === 0 ? (
        // ⚠️ No es "no pasa ninguna": es que no consta en NUESTRO dato.
        <p
          className="mt-2 rounded-tarjeta border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="lineas-sin-dato"
        >
          No nos consta qué líneas pasan por esta parada. No es que no pase ninguna: es que no lo
          tenemos en el GTFS. No nos lo inventamos.
        </p>
      ) : (
        <ul className="mt-1" data-papel="lista-lineas-pasan">
          {lineas.map((e, i) => {
            const dir = e.rumbo.tipo === 'sentido' ? e.rumbo.directionId : null;
            const aria =
              e.rumbo.tipo === 'sentido'
                ? `Ver la línea ${e.linea.shortName}, hacia ${e.rumbo.destino}`
                : e.rumbo.tipo === 'circular'
                  ? `Ver la línea ${e.linea.shortName}, circular por ${e.rumbo.por}`
                  : `Ver la línea ${e.linea.shortName}`;
            return (
              <li key={`${e.linea.shortName}-${dir ?? 'x'}`}>
                <Link
                  href={href(e.linea.shortName, dir)}
                  aria-label={aria}
                  data-papel="linea-que-pasa"
                  data-linea={e.linea.shortName}
                  className={`flex min-h-[var(--control)] items-center gap-2.5 py-1 text-cuerpo leading-snug text-[var(--color-tinta)] sin-recortar ${
                    i > 0 ? 'border-t border-[var(--color-borde)]' : ''
                  }`}
                >
                  {/* El chip lleva el COLOR de la línea (identidad, no decoración) y su
                      número (texto): la información sobrevive al gris. */}
                  <ChipLinea linea={e.linea} papel="chip-linea-pasa" enlace={false} />
                  <span className="min-w-0 font-semibold">
                    {/* "Hacia"/"Circular por" son NUESTROS; el destino es toponimia del
                        GTFS corregida → <Toponimo>; el "por" del circular y el nombre del
                        búho van verbatim → <Cita>, igual que en la página de línea. */}
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
          })}
        </ul>
      )}
    </section>
  );
}
