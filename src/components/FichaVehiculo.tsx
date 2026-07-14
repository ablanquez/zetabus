import type { Confidence } from '@/core';
import {
  CAMPOS_QUE_SE_ENSEÑAN,
  type BusProfile,
  type CampoDeFicha,
} from '@/modes/bus/profile';

/**
 * LA FICHA DEL VEHÍCULO, EN CHIPS. Clonada de la referencia.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⭐ A5 · FUERA "✓ Dato oficial (Anexo 5 del pliego municipal)".
 *
 * Ocupaba UNA LÍNEA ENTERA en 350 de 403 tarjetas. Es decir: en el 87% de los
 * casos. **Eso no es una excepción: es la norma.** Y al que está esperando el
 * autobús le da exactamente igual de qué documento sale el dato.
 *
 * Se enseña la excepción, no la norma. La procedencia no se pierde: se va a
 * `/sobre-los-datos`, entera y con sus enlaces.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⭐ A4 · TRES MARCAS, NO UNA. Y LA MARCA DICE **DE QUIÉN** ES EL DATO.
 *
 * En la Tanda 6 me negué a ascender los 53 eCitaro a "verificado" porque no
 * había ni una matrícula en ninguna fuente. Antonio aportó la que faltaba
 * (busesmadrid.es), y con ella 43 de los 53 tienen ya procedencia citable.
 *
 * Pero **NO se convierten en `oficial`**. Y aquí está lo importante:
 *
 *   ⚠️ UNA WEB DE AFICIONADOS NO ES UN PLIEGO MUNICIPAL, por buena que sea.
 *      Medida contra el Anexo 5 en los 350 vehículos comunes: acierta el 100%
 *      del fabricante y de la propulsión, y el 98,6% de la matrícula. Es decir:
 *      **transcribe a mano, y se equivoca ~1 de cada 70.** Excelente. No oficial.
 *
 * ⇒ Cada nivel tiene SU marca, y la nota al pie dice qué significa cada una:
 *
 *       (sin marca)  el pliego municipal. Es la NORMA: no se anuncia.
 *          *         busesmadrid.es — citable, no oficial.
 *          †         visto en servicio por el mantenedor. No citable.
 *          ?         no consta en ninguna parte.
 *
 * Un solo símbolo por ficha, detrás de todos los chips —no dentro de cada uno—:
 * la confianza no es un atributo del autobús como "articulado" o "eléctrico";
 * es una propiedad de TODO lo que se afirma sobre él.
 *
 * ⚠️ Y la señal sigue siendo FORMA (borde discontinuo + símbolo), no tono:
 *    sobrevive al gris, al daltonismo y a un móvil al sol.
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
const MARCAS: Record<Confidence, { simbolo: string; lectura: string } | null> = {
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
 * Un chip. 11 px, `px-2 py-0.5`, `rounded-md` — las medidas salen de medir los
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
        `inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-[15px] sin-recortar ` +
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

  const oficial = perfil.confidence === 'oficial';
  const marca = MARCAS[perfil.confidence];
  const clase = CLASE[perfil.busClass] ?? perfil.busClass;
  const medida = perfil.lengthMeters !== null ? `${clase} · ${perfil.lengthMeters} m` : clase;
  const combustible = perfil.fuel !== null ? (COMBUSTIBLE[perfil.fuel] ?? perfil.fuel) : null;

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
          ocultando articulados). Nuestro dato es correcto y se queda — pero con
          SU formato de chip, que era mejor que nuestro cajón. */}
      <Chip papel="chip-clase" discontinuo={!oficial}>
        {medida}
      </Chip>

      {combustible && (
        <Chip papel="chip-combustible" discontinuo={!oficial}>
          {combustible}
        </Chip>
      )}

      {/* ⭐ UNA SOLA MARCA, CALIFICANDO LA FICHA ENTERA. No una por chip.
          Y no es solo por sitio (aunque de eso también: con el símbolo dentro de
          cada chip la fila se partía en dos por DOS píxeles). Es que la confianza
          NO es un atributo del autobús como lo son "articulado" o "eléctrico": es
          una propiedad de TODO lo que se afirma sobre él. Meterla dentro de cada
          chip la iguala con ellos; puesta detrás, los califica a los dos. */}
      {marca && (
        <>
          <span
            aria-hidden="true"
            className="shrink-0 text-[13px] font-black leading-none text-[var(--color-tinta-suave)]"
            data-papel="marca-confianza"
            data-marca={perfil.confidence}
          >
            {marca.simbolo}
          </span>
          {/* El lector de pantalla NO ve el símbolo: le decimos la frase entera. */}
          <span className="sr-only">{marca.lectura}</span>
        </>
      )}
    </div>
  );
}

const NOMBRE_DE_CAMPO: Record<CampoDeFicha, string> = {
  clase: 'Tipo',
  longitudM: 'Longitud',
  propulsion: 'Combustible',
  matricula: 'Matrícula',
  fabricante: 'Fabricante',
  modelo: 'Modelo',
  fechaMatriculacion: 'Matriculado',
};

const NOMBRE_DE_FUENTE: Record<Confidence, string> = {
  oficial: 'Pliego municipal',
  fuente_secundaria: 'busesmadrid.es',
  observacion_propia: 'Visto circular',
  sin_verificar: 'Sin procedencia',
};

/**
 * ⭐⭐ EL DETALLE. **Esta es mi objeción de la Tanda 8, cumplida.**
 *
 * Yo dije: *"mezclar procedencias produce fichas Frankenstein de las que ya no se
 * puede decir «esto viene de aquí»"*. Antonio contestó: **pues que se pueda.**
 *
 * Y aquí está. Campo a campo, con nombre y fecha cuando hay una persona detrás:
 *
 *     Tipo         Estándar     ← busesmadrid.es
 *     Longitud     12 m         ← Visto circular · Antonio Blánquez · 14/07/2026
 *     Combustible  Eléctrico    ← busesmadrid.es
 *
 * **Eso no es Frankenstein: es trazabilidad. Lo Frankenstein sería no saberlo.**
 *
 * ⚠️ Va dentro de un `<details>` PLEGADO: al que espera el autobús no le importa,
 *    y ocupar cuatro líneas en cada tarjeta sería el pecado del "✓ Dato oficial"
 *    otra vez. Pero está, y no hace falta abrir un JSON para verlo.
 *
 * ⛔⛔ Y VA **FUERA** DE LA FILA, NO DENTRO.
 *
 * Mi primera versión lo metió dentro del `<button data-papel="llegada">`. Un
 * `<details>` dentro de un `<button>` es **HTML inválido** —dos elementos
 * interactivos anidados— y en la práctica significa que **el desplegable no se
 * puede abrir**: el clic se lo come el botón de la fila.
 *
 * Y no lo cazó ningún test de accesibilidad: lo cazó el test del FILTRO, que
 * empezó a encontrar cuatro botones llamados "Ninguna" porque el texto para
 * lectores de pantalla («no consta en **ninguna** fuente publicada») se había
 * metido dentro del nombre accesible de la fila. **Un test de otra cosa, mirando
 * de reojo.** Por eso se escriben.
 */
export function DeDondeSaleCadaDato({ perfil }: { perfil: BusProfile | null }) {
  if (perfil === null || perfil.confidence === 'oficial') return null;
  return <Detalle perfil={perfil} />;
}

function Detalle({ perfil }: { perfil: BusProfile }) {
  const filas = CAMPOS_QUE_SE_ENSEÑAN.map((campo) => [campo, perfil.procedencias[campo]] as const)
    .filter((f): f is readonly [CampoDeFicha, NonNullable<(typeof f)[1]>] => f[1] !== undefined);
  if (filas.length === 0) return null;

  /**
   * ⛔ LA CITA VA UNA VEZ. Y esto lo vi ABRIENDO LA PÁGINA, no en un test.
   *
   * La primera versión pegaba el «cómo lo supe» debajo de CADA campo. Como Antonio
   * afirma el tipo, la longitud y la propulsión del 4330 con la misma frase, la
   * ficha salía con **el mismo párrafo repetido tres veces** — un muro de texto
   * cursivo donde antes había tres chips.
   *
   * Ningún test lo iba a cazar: el HTML era correcto, el contraste correcto, nada
   * truncado, nada desbordado. **Solo se ve mirándolo.**
   *
   * ⇒ Los campos dicen QUIÉN los afirma. La cita —que es la misma— se dice UNA vez.
   */
  const citas = new Map<string, { quien: string; fecha?: string; texto: string }>();
  for (const [, p] of filas) {
    if (p.comoLoSupe && p.quien) citas.set(p.comoLoSupe, { quien: p.quien, fecha: p.fecha, texto: p.comoLoSupe });
  }

  return (
    <details className="mt-1 pl-[52px]" data-papel="procedencia-detalle">
      <summary className="inline-flex min-h-[24px] cursor-pointer items-center text-[11px] font-semibold text-[var(--color-tinta-tenue)] underline underline-offset-2">
        De dónde sale cada dato
      </summary>

      <dl className="mt-1 text-[11px] leading-snug text-[var(--color-tinta-tenue)]">
        {filas.map(([campo, p]) => (
          <div key={campo} className="flex flex-wrap gap-x-1.5">
            <dt className="font-semibold">{NOMBRE_DE_CAMPO[campo]}</dt>
            <dd className="sin-recortar">
              ← {NOMBRE_DE_FUENTE[p.confidence]}
              {p.quien && (
                <>
                  {' · '}
                  <strong>{p.quien}</strong>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {[...citas.values()].map((c) => (
        <blockquote
          key={c.texto}
          className="mt-1 border-l-2 border-[var(--color-borde)] pl-2 text-[11px] italic leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
          data-papel="como-lo-supe"
        >
          «{c.texto}»
          <cite className="mt-0.5 block not-italic font-semibold">
            — {c.quien}
            {c.fecha && `, ${c.fecha}`}
          </cite>
        </blockquote>
      ))}
    </details>
  );
}

/**
 * ⭐ LA LEYENDA. UNA VEZ, AL PIE. No una vez encima de cada autobús.
 *
 * ⚠️ Y SOLO SE EXPLICAN LAS MARCAS QUE HAY EN PANTALLA. Si en esta parada no
 * circula ningún autobús observado a mano, la línea del `†` NO SE PINTA. Una
 * leyenda que explica símbolos que no están es ruido, y además miente sobre la
 * composición de lo que el usuario está viendo.
 *
 * Si un día el registro oficial los recoge a todos, esta nota DESAPARECE SOLA.
 * Nada que mantener, nada de lo que acordarse. Un aviso que hay que acordarse de
 * quitar acaba mintiendo, siempre.
 */
export function NotaSinVerificar({ presentes }: { presentes: readonly Confidence[] }) {
  const hay = (c: Confidence) => presentes.includes(c);
  if (!hay('fuente_secundaria') && !hay('observacion_propia') && !hay('sin_verificar')) return null;

  return (
    <div
      className="mt-2 space-y-1 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
      data-papel="nota-sin-verificar"
    >
      {hay('fuente_secundaria') && (
        <p data-papel="nota-fuente_secundaria">
          <span aria-hidden="true">* </span>
          <strong>No consta en el pliego municipal</strong> (octubre de 2025): es un autobús
          entregado después. El dato es de{' '}
          <a
            href="https://busesmadrid.es/autobuses-urbanos-de-zaragoza-s-a-auzsa/"
            className="underline underline-offset-2 font-semibold"
            rel="noreferrer"
          >
            busesmadrid.es
          </a>
          , una web especializada <strong>que no es oficial</strong>.
        </p>
      )}
      {hay('observacion_propia') && (
        <p data-papel="nota-observacion_propia">
          <span aria-hidden="true">† </span>
          <strong>Visto circular</strong>, pero no publicado en ninguna fuente. Lo afirmamos
          nosotros, con fecha. <strong>No es un dato citable.</strong>
        </p>
      )}
      {hay('sin_verificar') && (
        <p data-papel="nota-sin_verificar">
          <span aria-hidden="true">? </span>
          <strong>Sin procedencia conocida.</strong> No consta en ninguna fuente que podamos citar.
        </p>
      )}
      {/* ⚠️ 24 px DE ALTO, NO 15. Este enlace ya NO va dentro de una frase —tiene
          su propia línea—, así que la excepción "Inline" de WCAG 2.5.8 no le
          aplica: es un objetivo táctil de pleno derecho y le tocan sus 24 px.
          El detector lo cazó a 15. (Los enlaces que SÍ van dentro de una frase,
          como el de busesmadrid, sí están exentos, y por eso no se tocan.) */}
      <p>
        <a
          href="/sobre-los-datos"
          className="inline-flex min-h-[24px] items-center font-semibold underline underline-offset-2"
        >
          Sobre los datos
        </a>
      </p>
    </div>
  );
}
