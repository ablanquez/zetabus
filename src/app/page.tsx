import Link from 'next/link';
import { Buscador, type Entrada } from '@/components/Buscador';
import { ChipLinea } from '@/components/ChipLinea';
import { Cita } from '@/components/Cita';
import { Toponimo } from '@/components/Toponimo';
import { AcuseDeToque } from '@/components/AcuseDeToque';
import { GRUPOS, giroDe, grupoDe, idLinea, idParada, lineas, paradas, posteDe, sentidosParaRumbo } from '@/engine/topologia';
import { destinoDeSentido, dosDestinos } from '@/engine/rumbo';
import { ALIAS_LINEA } from '@/engine/busqueda';

/**
 * Los destinos de una línea, en una cadena, para INDEXARLOS en el buscador (no se
 * muestran). Salen del mismo `destinoDeSentido` que la home y la botonera —un solo
 * sitio—. La mayoría ya viven en el longName; esto cierra el hueco de las circulares
 * ("Circular N" no dice a dónde va): sin esto, "Paseo de la Ribera" no hallaba la Ci4.
 */
function destinosParaBuscar(id: string): string {
  const sents = sentidosParaRumbo(idLinea(id));
  return [...new Set(sents.map((s) => destinoDeSentido(s, sents)))].join(' ');
}

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
      // Alias de búsqueda (romanos: "quinto"→Carlos V, "21"→Siglo XXI). No se muestra.
      alias: ALIAS_LINEA[l.shortName],
      // Destinos indexados (cierra el hueco de las circulares). Tampoco se muestran.
      destinos: destinosParaBuscar(String(l.id)),
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
            {/* ⭐ FUERA EL SUBTÍTULO DEL GRUPO ("las de todos los días", "de madrugada"…).
                La gente sabe leer: "Diurnas", "Circulares", "Lanzaderas" y "Búhos" se
                explican solos —mismo criterio que quitar "EL RECORRIDO · 32 PARADAS"—, y
                el de las circulares además lo dice mejor el icono ↻. (El texto sobrevive
                como referencia en el guía vivo /interno/sistema-visual, que sí lo usa.) */}
            <h2 className="mb-2 text-menor font-black uppercase tracking-wide">
              {g.titulo}{' '}
              <span className="font-bold text-[var(--color-tinta-tenue)]">({delGrupo.length})</span>
            </h2>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {delGrupo.map((l) => {
                // ⭐ DOS DESTINOS, uno por renglón (corregidos), en vez del nombre largo
                //    que se parte donde cae. Aplica a las DIURNAS DE DOBLE SENTIDO y a las
                //    LANZADERAS (C1/C4, con el par que da Antonio). El resto —circulares,
                //    sentido único, búhos— se quedan con su nombre. `dosDestinos` devuelve
                //    null si no hay dos extremos distintos (bucle, sentido único), así que
                //    las circulares numeradas (30, 54-59) caen solas al nombre + icono.
                const g = grupoDe(l);
                const destinos =
                  g === 'diurna' || g === 'lanzadera'
                    ? dosDestinos(sentidosParaRumbo(idLinea(String(l.id))), l.longName)
                    : null;
                // ↻/↺ para las circulares. Lo da Antonio (ver `giroDe`), no la geometría.
                const giro = giroDe(l);
                return (
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
                    {/* SIN TRUNCAR (regla del proyecto: si no cabe, baja de línea).
                        `ml-3` da la separación chip↔nombre (antes `gap-3`).
                        · Diurna doble sentido → DOS destinos, uno por renglón, en
                          <Toponimo> (corregidos, protegidos del traductor).
                        · El resto → su nombre largo verbatim, en <Cita>. */}
                    {destinos ? (
                      <span
                        className="ml-3 flex flex-col text-menor font-semibold leading-snug sin-recortar"
                        data-papel="destinos-home"
                      >
                        <Toponimo>{destinos[0]}</Toponimo>
                        <Toponimo>{destinos[1]}</Toponimo>
                      </span>
                    ) : (
                      <span className="ml-3 text-menor font-semibold leading-snug sin-recortar">
                        <Cita>{l.longName}</Cita>
                      </span>
                    )}
                    {/* ⭐ EL ICONO DE GIRO va al FINAL (ml-auto lo empuja al borde
                        derecho): así la columna de chips y nombres NO se mueve. Es
                        accesible —`role="img"` + `aria-label`, no un glifo mudo—, de modo
                        que quien no ve la forma oye "Circular, sentido horario". Cae en la
                        misma línea del nombre: no cambia la altura de la tarjeta. */}
                    {giro && (
                      <span
                        role="img"
                        aria-label={`Circular, sentido ${giro}`}
                        data-papel="giro"
                        data-giro={giro}
                        className="ml-auto pl-2 text-cuerpo leading-none text-[var(--color-tinta-tenue)]"
                      >
                        {giro === 'horario' ? '↻' : '↺'}
                      </span>
                    )}
                  </Link>
                </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
