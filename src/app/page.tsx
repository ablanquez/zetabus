import Link from 'next/link';
import { Buscador, type Entrada } from '@/components/Buscador';
import { ChipLinea } from '@/components/ChipLinea';
import { Cita } from '@/components/Cita';
import { AcuseDeToque } from '@/components/AcuseDeToque';
import { GRUPOS, grupoDe, idParada, lineas, paradas, posteDe } from '@/engine/topologia';

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

      {/* ⭐ EL ÍNDICE AGRUPADO. Clonado de la referencia: DIURNAS / CIRCULARES /
          LANZADERAS / BÚHOS. Cuarenta y cuatro tarjetas sueltas no se leen; cuatro
          grupos de once, sí. Y cada grupo dice QUÉ ES, porque "Ci3" no se explica
          solo y "N5" tampoco. */}
      {GRUPOS.map((g) => {
        const delGrupo = lineas().filter((l) => grupoDe(l) === g.clave);
        if (delGrupo.length === 0) return null;
        return (
          <section key={g.clave} className="mt-7" data-papel="grupo-lineas" data-grupo={g.clave}>
            <h2 className="mb-0.5 text-menor font-black uppercase tracking-wide">
              {g.titulo}{' '}
              <span className="font-bold text-[var(--color-tinta-tenue)]">({delGrupo.length})</span>
            </h2>
            <p className="mb-2 text-nota text-[var(--color-tinta-tenue)] sin-recortar">{g.nota}</p>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {delGrupo.map((l) => (
                <li key={String(l.id)}>
                  <Link
                    href={`/linea/${encodeURIComponent(l.shortName)}`}
                    data-acusa="si"
                    /* ⭐ MARGEN UNIFORME AL CHIP POR SUS TRES LADOS (arriba, abajo,
                       izquierda) = `p-2` (8 px), un peldaño de la escala. Antonio lo
                       veía "centrado": el chip flotaba a 24 px del borde izquierdo y a
                       solo 8 del de arriba. De esos 24, 12 eran `px-3` y OTROS 12 un
                       `gap-3` FANTASMA — el <AcuseDeToque> es un <span> sin tamaño pero,
                       dentro de un flex, es un ÍTEM que consume una ranura de gap antes
                       del chip. Se quita el `gap` (mata el fantasma), el padding baja a
                       8 en los cuatro lados, y la separación chip↔nombre vuelve como
                       `ml-3` en el nombre. Así los 44 chips arrancan en la MISMA x. */
                    className="flex min-h-[var(--control-fila)] items-center rounded-tarjeta border border-[var(--color-borde)] bg-[var(--color-papel)] p-2"
                  >
                    {/* Se queda marcada tras soltar, hasta que carga la línea. */}
                    <AcuseDeToque />
                    {/* ⭐ D1 · UN SOLO SITIO SABE PINTAR UNA LÍNEA.
                        El color = IDENTIDAD (qué línea). La inversión = CATEGORÍA
                        (¿es nocturna?). Dos canales, dos preguntas. Y si cada
                        pantalla lo dedujera por su cuenta, bastaría con que una se
                        despistara para que la N7 saliera de diurna aquí y de búho
                        allí. Es el fallo del "0C1" con otro traje. */}
                    <ChipLinea linea={l} papel="chip-indice" grande />
                    {/* SIN TRUNCAR. Si no cabe, baja de línea. `ml-3` da la
                        separación chip↔nombre que antes ponía `gap-3` (ahora fuera).
                        <Cita>: el nombre de línea es del GTFS; el traductor no lo reescribe. */}
                    <span className="ml-3 text-menor font-semibold leading-snug sin-recortar">
                      <Cita>{l.longName}</Cita>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
