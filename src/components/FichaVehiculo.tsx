import type { BusProfile } from '@/modes/bus/profile';

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
 * ⚠️⚠️ A4 · EL "SIN VERIFICAR" DEJA DE SER UNA ALARMA. Y AQUÍ HAY QUE SER MUY
 *          PRECISO, PORQUE ANTONIO Y YO NO ESTAMOS DE ACUERDO EN LOS HECHOS.
 *
 * Antonio dice: los eCitaro «SON POSTERIORES AL ANEXO 5 Y ESTÁN VERIFICADOS,
 * con matrícula», y pide un tercer valor `posterior_verificado`.
 *
 * ⛔ LO HE BUSCADO Y NO HAY NINGUNA MATRÍCULA. Ni una:
 *
 *     data/flota-avanza-zaragoza.json ...... los 53 tienen `matricula: null`
 *     data/referencia/…heredado.json ....... 0 matrículas de 369 registros
 *     el propio maestro dice de esa fuente .. "Procedencia desconocida"
 *
 * Ascenderlos a "verificado" sin una fuente sería INVENTARME LA PROCEDENCIA —
 * que es exactamente el pecado del JSON heredado (L3): dato correcto, origen
 * desconocido, y toda la confianza del mundo. Así que NO lo hago, y lo digo.
 *
 * ⭐ PERO ANTONIO TIENE RAZÓN EN EL DAÑO, Y ESE SÍ SE ARREGLA:
 *
 * Pintábamos un ⚠ ÁMBAR, en mayúsculas, sobre 53 de 403 autobuses (1 de cada 8).
 * Un aviso que sale siempre no es un aviso: es ruido. Y un aviso que grita sobre
 * un dato que probablemente es correcto **enseña al usuario a ignorar los
 * avisos** — con lo cual el día que uno importe, no lo leerá.
 *
 * ⇒ La marca se queda (es VERDAD que no consta en el registro oficial), pero
 *   deja de gritar: un asterisco y un borde discontinuo. La explicación va UNA
 *   vez al pie de la lista, no 53 veces encima de cada autobús.
 *
 * ⚠️ Y la señal sigue siendo FORMA (borde discontinuo), no tono: sobrevive al
 *    gris, al daltonismo y a un móvil al sol. La prueba de escala de grises manda.
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

      {/* ⭐ UN SOLO ASTERISCO, CALIFICANDO LA FICHA ENTERA. No uno por chip.
          Y no es solo por sitio (aunque de eso también: con un asterisco dentro de
          cada chip la fila se partía en dos por DOS píxeles). Es que la confianza
          NO es un atributo del autobús como lo son "articulado" o "eléctrico": es
          una propiedad de TODO lo que se afirma sobre él. Meterla dentro de cada
          chip la iguala con ellos; puesta detrás, los califica a los dos. */}
      {!oficial && (
        <>
          <span
            aria-hidden="true"
            className="shrink-0 text-[13px] font-black leading-none text-[var(--color-tinta-suave)]"
            data-papel="marca-sin-verificar"
          >
            *
          </span>
          <span className="sr-only">
            Estos datos no constan en el registro oficial del pliego municipal.
          </span>
        </>
      )}
    </div>
  );
}

/**
 * ⭐ LA NOTA DEL ASTERISCO. UNA VEZ, AL PIE. No 53 veces encima de cada autobús.
 *
 * La pinta la lista si —y solo si— hay algún vehículo marcado. Si un día el
 * registro oficial los recoge a todos, esta nota DESAPARECE SOLA. Nada que
 * mantener, nada de lo que acordarse. Un aviso que hay que acordarse de quitar
 * acaba mintiendo, siempre.
 */
export function NotaSinVerificar() {
  return (
    <p
      className="mt-2 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
      data-papel="nota-sin-verificar"
    >
      <span aria-hidden="true">* </span>
      Estos datos <strong>no constan en el registro oficial</strong> del pliego municipal (octubre de
      2025): son autobuses entregados después. No los hemos podido verificar contra una fuente
      oficial.{' '}
      <a href="/sobre-los-datos" className="underline underline-offset-2 font-semibold">
        Sobre los datos
      </a>
    </p>
  );
}
