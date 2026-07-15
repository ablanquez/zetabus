import Link from 'next/link';
import { notFound } from 'next/navigation';
import { llegadasDePoste } from '@/engine/llegadas';
import { motor } from '@/engine/motor';
import { parada, paradaDelPoste, posteDe } from '@/engine/topologia';
import { fingimientoDe, transporteDe } from '@/engine/fingir';
import { LlegadasVivas } from '@/components/LlegadasVivas';

/**
 * ⭐ LA PANTALLA DE PARADA. Y EL ORDEN **ES** EL DISEÑO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LO PRIMERO QUE SE VE AL ABRIR UNA PARADA ES CUÁNDO LLEGA EL AUTOBÚS.
 *  No un botón de "guardar". No un mapa. El dato.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTO NO ES UNA OPINIÓN DE DISEÑO. ES UNA MEDIDA.
 *
 * En la referencia, abierta en un Chromium de 360 px:
 *
 *     barra "Guardar esta parada"   y = 183
 *     el MAPA                       y = 249   alto = 288 px  (39% del viewport)
 *     ⭐ EL PRIMER TIEMPO            y = 789   ⛔ 49 px POR DEBAJO DE LA PANTALLA
 *
 * Alguien de pie en la marquesina, con prisa, abría la app y NO VEÍA NI UNA
 * LLEGADA. Tenía que hacer scroll. Y el mapa era precioso, y el diseño era
 * coherente, y estaba mal.
 *
 * Aquí el mapa vendrá en la Tanda 5 y vendrá **DEBAJO**. Nunca por encima del
 * dato por el que la gente abre la aplicación.
 *
 * ⭐ Y NO SE CONFÍA A LA BUENA VOLUNTAD: `e2e/flotacion.spec.ts` comprueba en
 *    CADA tanda que el primer tiempo de llegada cae dentro del viewport de
 *    360 px. Si no cabe, la tanda no se cierra.
 */

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ poste: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ParadaPage({ params, searchParams }: Props) {
  const { poste: crudo } = await params;
  const sp = await searchParams;

  // ⭐ EL GUARDIA (L4). La fuente NO distingue un poste inexistente de uno sin
  //    autobuses: devuelve `{"tablatiempos":""}` para los dos. Así que se
  //    valida AQUÍ, contra nuestro GTFS, y a Avanza ni se le pregunta.
  const paradaId = paradaDelPoste(crudo);
  if (paradaId === null) notFound();

  const p = parada(paradaId)!;
  const numero = posteDe(paradaId)!;

  const fingir = fingimientoDe(sp);
  const inicial = await llegadasDePoste(numero, motor(transporteDe(fingir), fingir));

  return (
    <div>
      {/* Cabecera COMPACTA a propósito: cada píxel que gasta aquí es un píxel
          que le quita al primer tiempo de llegada. */}
      <div className="mb-3">
        <h1
          className="text-[20px] font-black leading-tight sin-recortar"
          data-papel="nombre-parada"
          data-nombre-fuente={p.nombreProc.fuente}
        >
          {/* ⚠️ SIN TRUNCAR. Si el nombre es largo, BAJA DE LÍNEA.
              "Av. de Ranillas / Centro de Historias…" no es un dato: es un acertijo. */}
          {p.name}
        </h1>
        <p className="text-[12px] text-[var(--color-tinta-tenue)]">
          poste {numero}
          {fingir && (
            <span className="ml-2 font-bold text-[var(--color-alerta)]">· FINGIENDO «{fingir}»</span>
          )}
        </p>

        {/* ⭐ A1 · EL NOMBRE SIN CONFIRMAR SE DICE, NO SE TAPA.
            Avanza no da el nombre de las paradas suprimidas por un desvío (los 4 de
            Avenida de Valencia, por ejemplo). Esas se quedan con el del GTFS, que
            puede venir roto por el exportador ("Av. De Valencia"), y el usuario tiene
            derecho a saber que ese nombre NO está confirmado por el operador.

            ⚠️ La señal NO va solo en el tono: borde punteado (forma) + la palabra
               (texto) + el icono. En gris se sigue leyendo. La procedencia por campo
               que montamos para la flota, aplicada al nombre de la parada. */}
        {p.nombreProc.fuente === 'gtfs-marcado' && (
          <p
            className="es-sin-verificar mt-1.5 inline-flex flex-wrap items-baseline gap-x-1.5 px-2 py-1 text-[11px] leading-snug text-[var(--color-tinta-suave)] sin-recortar"
            data-papel="nombre-sin-confirmar"
            role="note"
          >
            <span className="font-bold not-italic">⚠ nombre sin confirmar.</span>
            <span className="not-italic">
              Avanza no lo da (parada en desvío o fuera de toda ruta). El que ves viene del GTFS y
              puede estar mal escrito. Solo se comprueba mirando el rótulo de la calle.
            </span>
          </p>
        )}
      </div>

      {/* ⭐ AQUÍ. LO PRIMERO. */}
      <LlegadasVivas inicial={inicial} poste={numero} fingir={fingir} />

      {/* ⚠️ 44 px de alto MÍNIMO. El instrumento lo cazó: este enlace medía
          152×16 px, por debajo del mínimo táctil de 24 (WCAG 2.5.8). En una app
          que se usa CON EL PULGAR, DE PIE, EN LA CALLE, un blanco de 16 píxeles
          de alto no se acierta. Y no lo vi leyendo el código: lo midió Chromium. */}
      <Link
        href="/"
        className="mt-6 inline-flex min-h-[44px] items-center text-[13px] text-[var(--color-tinta-suave)] underline underline-offset-2"
      >
        ← buscar otra parada o línea
      </Link>
    </div>
  );
}
