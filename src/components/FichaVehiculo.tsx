import type { Confidence } from '@/core';
import type { BusProfile } from '@/modes/bus/profile';

/**
 * LA FICHA DEL VEHÍCULO, EN CHIPS. Clonada de la referencia.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⭐ FUERA LA PROCEDENCIA DE ESTA PANTALLA. Antonio: «al usuario le importa tres
 * pimientos de dónde saques el dato». La vista de parada es OPERATIVA —cuándo llega
 * mi autobús—, y llevaba tres cosas que eran metadato de fuente:
 *
 *   · la marca suelta al final de los chips (`*` busesmadrid, `†` visto, `?` sin
 *     procedencia),
 *   · el borde DISCONTINUO de los chips que afirmaban algo del bus, que en el
 *     sistema visual significa «sin verificar»,
 *   · el enlace «De dónde sale cada dato», colgando de un autobús concreto.
 *
 * Las tres se han quitado A LA VEZ (dejar el borde sin la marca sería un borde raro
 * sin nada que lo explique). Ahora TODOS los chips llevan el mismo tratamiento.
 *
 * ⚠️ LA PROCEDENCIA NO SE PIERDE: sigue entera en `/sobre-los-datos` —la tabla de
 *    los cuatro niveles con sus recuentos y sus fuentes—. El mapa `MARCAS` se queda
 *    (lo leen esa página y la guía `/interno/sistema-visual`), solo deja de pintarse
 *    aquí. Se conserva `data-confianza` en la ficha: no se ve, pero deja comprobar
 *    en un test que los cuatro niveles se pintan IGUAL.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CLASE: Record<string, string> = {
  articulado: 'Articulado',
  sencillo: 'Estándar',
  microbus_pmrs: 'Microbús',
};

const COMBUSTIBLE: Record<string, string> = {
  diesel: 'Diésel',
  hibrido: 'Híbrido',
  electrico: 'Eléctrico',
};

/**
 * ⭐ LA MARCA DICE DE QUIÉN ES EL DATO. Y `oficial` NO TIENE MARCA.
 *
 * No por descuido: **se enseña la excepción, no la norma.** El pliego cubre 350
 * de 403 (87%). Un símbolo que sale casi siempre no informa de nada — y encima
 * enseña a ignorar los símbolos, que es como se pierde el que sí importa.
 */
export const MARCAS: Record<Confidence, { simbolo: string; lectura: string } | null> = {
  oficial: null,
  // ⚠️ LAS LECTURAS SON CORTAS, Y ESO TAMBIÉN SE APRENDIÓ ROMPIENDO ALGO.
  //
  //    La primera versión metía una frase larga en cada `sr-only`… que va DENTRO
  //    del botón de la fila. Resultado: el nombre accesible de cada llegada pasó a
  //    ser un párrafo entero («…No consta en ninguna fuente publicada.»), y quien
  //    navega con lector de pantalla se lo comía en CADA autobús.
  //
  //    Lo cazó el test del filtro, que empezó a encontrar cuatro botones llamados
  //    "Ninguna" — porque la palabra estaba dentro de esas frases. Un test de otra
  //    cosa, mirando de reojo.
  //
  //    ⇒ Aquí, lo justo para saber QUÉ ES. La explicación entera vive UNA vez, en
  //      la leyenda del pie, que es donde se lee sin repetirla seis veces.
  fuente_secundaria: {
    simbolo: '*',
    lectura: 'Dato no oficial, de busesmadrid punto es.',
  },
  observacion_propia: {
    simbolo: '†',
    lectura: 'Dato observado en servicio, no publicado.',
  },
  sin_verificar: {
    simbolo: '?',
    lectura: 'Dato sin procedencia conocida.',
  },
};

/**
 * Un chip. 11 px, `px-2 py-0.5`, `rounded-chip` — las medidas salen de medir los
 * suyos con Playwright a 360 px (21 px de alto), no de elegirlas a ojo.
 */
function Chip({
  children,
  papel,
  discontinuo = false,
  fuerte = false,
}: {
  children: React.ReactNode;
  papel: string;
  discontinuo?: boolean;
  fuerte?: boolean;
}) {
  return (
    <span
      data-papel={papel}
      className={
        `inline-flex shrink-0 items-center gap-1 rounded-chip px-1.5 py-0.5 text-nota leading-[15px] sin-recortar ` +
        (fuerte ? 'font-semibold ' : 'font-medium ') +
        (discontinuo
          ? 'border border-dashed border-[var(--color-tinta-tenue)] bg-[var(--color-fondo)] text-[var(--color-tinta-suave)]'
          : 'bg-[var(--color-fondo)] text-[var(--color-tinta-suave)]')
      }
    >
      {children}
    </span>
  );
}

export function FichaVehiculo({ coche, perfil }: { coche: string; perfil: BusProfile | null }) {
  // ── SIN FICHA. Se dice. No se calla, no se rellena, no se aproxima. ────────
  //    El registro oficial cubre el 87% de lo que circula: un autobús nuevo llega
  //    antes a la calle que a un documento. Meterlo en "Estándar, 12 m" porque es
  //    lo más común sería inventarse el dato justo donde no lo tenemos.
  if (perfil === null) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1" data-papel="ficha" data-confianza="sin_ficha">
        <Chip papel="chip-coche" fuerte>
          Bus {coche}
        </Chip>
        <Chip papel="chip-sin-datos" discontinuo fuerte>
          Sin datos de este autobús
        </Chip>
      </div>
    );
  }

  const clase = CLASE[perfil.busClass] ?? perfil.busClass;
  const medida = perfil.lengthMeters !== null ? `${clase} · ${perfil.lengthMeters} m` : clase;
  const combustible = perfil.fuel !== null ? (COMBUSTIBLE[perfil.fuel] ?? perfil.fuel) : null;

  // ⭐ TODOS LOS CHIPS, EL MISMO TRATAMIENTO. Sin marca, sin borde discontinuo: la
  //    procedencia (de qué fuente sale cada campo) ya no vive en esta pantalla, vive
  //    en /sobre-los-datos. `data-confianza` se queda —invisible— para poder probar
  //    que los cuatro niveles se pintan idénticos.
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1"
      data-papel="ficha"
      data-confianza={perfil.confidence}
    >
      <Chip papel="chip-coche" fuerte>
        Bus {coche}
      </Chip>

      {/* ⚠️ LA MEDIDA REAL, NO LA SUYA. La referencia pone "Estándar" sobre
          autobuses de 18 METROS (su fichero erraba 62 longitudes de 316, siempre
          ocultando articulados). Nuestro dato es correcto y se queda. */}
      <Chip papel="chip-clase">{medida}</Chip>

      {combustible && <Chip papel="chip-combustible">{combustible}</Chip>}
    </div>
  );
}
