import Link from 'next/link';
import { Buscador, type Entrada } from '@/components/Buscador';
import { ChipLinea } from '@/components/ChipLinea';
import { Cita } from '@/components/Cita';
import { Toponimo } from '@/components/Toponimo';
import { AcuseDeToque } from '@/components/AcuseDeToque';
import { GRUPOS, giroDe, grupoDe, idLinea, idParada, lineas, paradas, posteDe, sentidosParaRumbo } from '@/engine/topologia';
import { destinoDeSentido, dosDestinos } from '@/engine/rumbo';
import { ALIAS_LINEA } from '@/engine/busqueda';
import { NOMBRE_MARCA } from '@/components/marca-fuente';

/**
 * ⭐ LO QUE ES ESTA PÁGINA, EN UNA FRASE. Se escribe UNA vez y se usa en DOS sitios: la
 * pestaña y el `<h1>`. No es reutilización por ahorrar: si fueran dos cadenas a mano, la
 * pestaña podría prometer una cosa y el encabezado anunciar otra, y divergirían en
 * silencio — que es exactamente la clase de mentira que este proyecto persigue (L42).
 */
const LO_QUE_ES = 'Listado de líneas de transporte de Zaragoza';

// ⚠️ La home es el segmento RAÍZ, el mismo que declara la plantilla → la plantilla NO se
//    le aplica (Next: `template` solo envuelve a los HIJOS). Por eso el título se escribe
//    entero aquí, pero el nombre se LEE de la fuente única (no se teclea "ZetaBus").
export const metadata = { title: `${NOMBRE_MARCA} | ${LO_QUE_ES}` };

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
      {/* ⭐⭐ EL ENCABEZADO DE LA PÁGINA. No se ve, y ESO ES LA DECISIÓN, no un descuido.
          ⚠️ LA CICATRIZ: la home NO TENÍA NINGÚN <h1>. Lo encontró el barrido total de las
          1.012 páginas —fue su único hallazgo real en 2.024 cargas— y no lo cazó ninguna de
          las ~30 specs, porque todas miran pantallas concretas y ninguna preguntaba «¿toda
          página anuncia exactamente un h1?». Quien navega por encabezados con un lector de
          pantalla llegaba a la portada y no encontraba de qué iba.

          POR QUÉ EN `sr-only` Y NO VISIBLE: la página YA dice lo que es por vía visual —el
          logo centrado arriba y el buscador como primer control—. Un título visible aquí
          sería un cambio de MAQUETA, no un arreglo de accesibilidad, y la maqueta no está
          en juego. `sr-only` lo saca del flujo visual SIN sacarlo del árbol de
          accesibilidad, que es donde hacía falta. (Comprobado en el ÁRBOL con `getByRole`,
          no en el CSS: ver `e2e/un-solo-h1.spec.ts`.)

          Y VA EL PRIMERO, antes del buscador: es el orden en que se lee, y deja los <h2> de
          los grupos colgando de él en vez de arrancar la jerarquía en el nivel 2. */}
      <h1 className="sr-only">{LO_QUE_ES}</h1>

      <Buscador entradas={entradas} />

      {/* ⭐ EL ÍNDICE AGRUPADO. Clonado de la referencia: DIURNAS / CIRCULARES /
          LANZADERAS / BÚHOS. Cuarenta y cuatro tarjetas sueltas no se leen; cuatro
          grupos de once, sí. Y cada grupo dice QUÉ ES, porque "Ci3" no se explica
          solo y "N5" tampoco. */}
      {/* ⭐ LA REJILLA SE ENSANCHA, EL BUSCADOR NO. El buscador (arriba) se queda en la columna
          estrecha de `main` —una línea de texto larga se lee mal, el ojo pierde el sitio—; la
          rejilla ROMPE a un ancho amplio, porque aquí el ancho es beneficio puro: más líneas de
          un vistazo, menos scroll. La jerarquía es la buscada: el buscador es UNA ENTRADA, la
          rejilla es EL CONTENIDO.

          Cómo rompe sin tocar `main` ni las demás páginas: `ml-[50%]` lleva el borde izquierdo al
          centro del contenedor (que ya está centrado en el viewport), y `-translate-x-1/2` la
          recentra por su propio ancho → queda centrada en la ventana a cualquier anchura. El ancho
          `min(72rem, 100vw-2rem)`: el tope de 72rem la deja en 4 columnas COMO MÁXIMO; el
          `100vw-2rem` deja 16 px de aire a los lados y NUNCA desborda (los cortes por columna van
          en la `<ul>`). */}
      <div className="ml-[50%] w-[min(72rem,calc(100vw_-_2rem))] -translate-x-1/2">
        {GRUPOS.map((g) => {
        const delGrupo = lineas().filter((l) => grupoDe(l) === g.clave);
        if (delGrupo.length === 0) return null;
        return (
          <details
            key={g.clave}
            open
            className="group mt-7"
            data-papel="grupo-lineas"
            data-grupo={g.clave}
          >
            {/* ⭐ SECCIÓN PLEGABLE NATIVA (`<details>/<summary>`): pliega y despliega
                SIN JS y es accesible de fábrica —el summary ya es un botón con estado
                expandido/plegado que el lector de pantalla anuncia—. Nada de div+onClick.
                ABIERTA por defecto: no se esconde contenido al cargar (y así el buscador
                de arriba sigue viendo todo, y los tests miden las tarjetas).

                ⭐ FUERA EL CONTADOR "(31)": saber cuántas líneas hay no ayuda a quien
                busca la suya. Nadie lo leía (ni test ni aria-label ni la búsqueda). Y
                antes ya se fue el subtítulo ("las de todos los días"…): los cuatro
                rótulos —Diurnas, Circulares, Lanzaderas, Búhos— se explican solos. */}
            <summary className="flex min-h-[var(--control)] cursor-pointer list-none items-center justify-between gap-3 border-b border-[var(--color-borde)] pb-2 [&::-webkit-details-marker]:hidden">
              <h2 className="text-menor font-black uppercase tracking-wide">{g.titulo}</h2>
              {/* El triángulo va a la DERECHA y gira 90° al abrir. Decorativo: el estado
                  ya lo anuncia el <summary>; el triángulo es la pista visual. */}
              <span
                aria-hidden="true"
                className="shrink-0 text-[var(--color-tinta-tenue)] transition-transform duration-150 group-[[open]]:rotate-90"
              >
                ▸
              </span>
            </summary>

            {/* ⭐ LOS CORTES NO SON REDONDOS: salen del ancho MÍNIMO en que la tarjeta del PEOR
                nombre (un búho de 60 car., p.ej. la N2 "Pza. Aragón - La Almozara - …") sigue en
                2 líneas → 280 px, MEDIDO en navegador. `auto-fill minmax(280, 1fr)`: el navegador
                mete tantas columnas de ≥280 como quepan y las estira a partes iguales. Traducido a
                ancho de VENTANA: 2 columnas a 600 px, 3 a 888, 4 a 1176 (y ahí topa, ver el div de
                arriba). El `min(17.5rem, 100%)` evita que en un móvil de <312 px una columna de 280
                desborde: baja el suelo al 100% del hueco. Antes era `grid-cols-1 sm:grid-cols-2`. */}
            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(17.5rem,100%),1fr))] gap-2">
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
          </details>
          );
        })}
      </div>
    </div>
  );
}
