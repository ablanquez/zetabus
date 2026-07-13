import Link from 'next/link';
import { Buscador, type Entrada } from '@/components/Buscador';
import { idParada, lineas, paradas, posteDe } from '@/engine/topologia';

/**
 * LA PORTADA. Buscador arriba, y las 44 líneas debajo.
 *
 * DOS TOQUES hasta ver tu autobús: tocar la caja, teclear, tocar el resultado.
 * Eso lo resolvió bien la referencia y es conocimiento pagado.
 *
 * ⚠️ LO QUE FALTA, Y SE DICE: "cerca de mí". Para alguien que está DE PIE EN LA
 * MARQUESINA el camino correcto son CERO toques: abres y ves tu parada. La
 * referencia nunca lo construyó (su chip "Cerca de mí" es decorativo, sin
 * `onClick`), y ZetaBus TAMPOCO lo tiene todavía. No lo escondo: es el primer
 * cabo de la Tanda 5.
 */
export default function Home() {
  const entradas: Entrada[] = [
    ...lineas().map<Entrada>((l) => ({
      tipo: 'linea',
      clave: l.shortName.toLowerCase(),
      titulo: l.longName,
      sub: `línea ${l.shortName}`,
      color: l.color,
      colorTexto: l.textColor,
      href: `/linea/${encodeURIComponent(l.shortName)}`,
    })),
    ...paradas().flatMap<Entrada>((p) => {
      const poste = posteDe(idParada(String(p.id)));
      if (poste === null) return [];
      return [{
        tipo: 'parada',
        clave: String(poste),
        titulo: p.name,
        sub: `poste ${poste}`,
        href: `/parada/${poste}`,
      }];
    }),
  ];

  return (
    <div>
      <Buscador entradas={entradas} />

      <h2 className="mt-8 mb-2 text-[13px] font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
        Las {lineas().length} líneas
      </h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {lineas().map((l) => (
          <li key={String(l.id)}>
            <Link
              href={`/linea/${encodeURIComponent(l.shortName)}`}
              className="flex min-h-[56px] items-center gap-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2"
            >
              {/* COLOR DE LÍNEA = IDENTIDAD. Nunca estado. */}
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-black"
                style={{ backgroundColor: l.color, color: l.textColor }}
                aria-hidden="true"
              >
                {l.shortName}
              </span>
              {/* SIN TRUNCAR. Si no cabe, baja de línea. */}
              <span className="text-[13px] font-semibold leading-snug sin-recortar">{l.longName}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
