import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { llegadasDePoste } from '@/engine/llegadas';
import { motor } from '@/engine/motor';
import { parada } from '@/engine/topologia';
import { nombreDePoste } from '@/engine/correspondencias';
import { nombreSoloBarrido, resolverParada } from '@/engine/paradas';
import { dispararErrorFingido, fingimientoDe, transporteDe } from '@/engine/fingir';
import { Fingiendo } from '@/components/Fingiendo';
import { LlegadasVivas } from '@/components/LlegadasVivas';
import { CajaLineas, CajaProvisionales, CajaProvisionalesDePoste } from '@/components/LineasQuePasan';
import { Cita } from '@/components/Cita';
import { IconoParada } from '@/components/IconoParada';

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

// ⚠️ NO lo quites para "arreglar" el 404 en blanco sin JS: no es la causa (lo es el
//    notFound() de abajo servido en streaming; el porqué y las vías descartadas, ahí · B-03).
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ poste: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * ⭐ EL TÍTULO DE LA PESTAÑA usa el MISMO nombre que la pantalla (`p.name`): el de
 * Avanza si lo hay, el del GTFS marcado si no. NUNCA el nombre crudo del GTFS por su
 * cuenta: si en la parada sale "Av. de Cataluña", en la pestaña también. La plantilla
 * del layout antepone "ZetaBus | ".
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { poste: crudo } = await params;
  const pv = resolverParada(crudo);
  // ⚠️ Poste inválido → el componente hará notFound(). El título de una ruta dinámica que
  //    llama a notFound() lo pone SU generateMetadata (no `not-found.tsx`), así que se pone
  //    aquí para que la pestaña diga "ZetaBus | Página no encontrada", no el default pelado.
  if (pv === null) return { title: 'Página no encontrada' };
  if (pv.clase === 'gtfs') {
    const p = parada(pv.paradaId);
    return p ? { title: p.name } : { title: 'Página no encontrada' };
  }
  // Solo-barrido: el nombre del ÍNDICE (sin red aquí — metadata no pide a Avanza), o un
  // genérico en degradado. El nombre fresco del feed lo pone el <h1> de la página.
  return { title: nombreDePoste(pv.poste) ?? `Parada · poste ${pv.poste}` };
}

export default async function ParadaPage({ params, searchParams }: Props) {
  const { poste: crudo } = await params;
  const sp = await searchParams;

  // ⭐ B-05 · `?fingir=error` (solo en demo) revienta AQUÍ, en el render del servidor,
  //    para poder VER `error.tsx`. Va lo primero: el fallo que simula es de render, no
  //    de datos, así que no espera a pedir nada. Ver `dispararErrorFingido`.
  dispararErrorFingido(sp);

  // ⭐ EL GUARDIA (L4). La fuente NO distingue un poste inexistente de uno sin
  //    autobuses: devuelve `{"tablatiempos":""}` para los dos. Así que se valida
  //    AQUÍ: contra el GTFS y, si no, contra las 9 solo-barrido del fichero estático.
  //    Un poste que no es de ninguna clase → notFound(); a Avanza ni se le pregunta.
  const pv = resolverParada(crudo);
  // ⚠️ B-03 · ESTE notFound() SALE EN BLANCO SIN JS — Y SE DEJA ASÍ, A SABIENDAS.
  //    Como la ruta es `force-dynamic`, Next sirve el not-found por STREAMING: el HTML
  //    inicial es un shell vacío y "Aquí no hay nada" se pinta al hidratar. (El 404 de
  //    una ruta INEXISTENTE —`not-found.tsx` a nivel de enrutado— sí renderiza en
  //    servidor; el que falla es este, el de un poste que no existe.) Se acepta porque
  //    el status es 404 + noindex (SEO intacto) y el único afectado es alguien con JS
  //    desactivado en una URL de parada equivocada.
  //    ⛔ NO lo "arregles": quitar `force-dynamic` NO es la causa —`/estado` es
  //       force-dynamic SIN notFound() y renderiza bien— y además mata el dato en vivo;
  //       un `loading.tsx` cambia el blanco por un spinner que sin JS no acaba nunca y
  //       mete estado de carga en TODA la app; `global-not-found` es experimental y solo
  //       cubre las rutas inexistentes, que YA funcionan. Diagnóstico completo: B-03.
  if (pv === null) notFound();

  const numero = pv.poste;
  // Solo las paradas GTFS tienen `Stop` (nombre y posición del GTFS). Las solo-barrido
  // no: NO se llama a `parada()`, petaría. Su nombre y posición vienen del feed/fichero.
  const stop = pv.clase === 'gtfs' ? parada(pv.paradaId)! : null;

  const fingir = fingimientoDe(sp);
  const inicial = await llegadasDePoste(numero, motor(transporteDe(fingir), fingir));

  // El nombre y su procedencia, según la clase. Solo-barrido: el del feed (si la
  // observación trae datos) con fallback al índice / "poste N"; procedencia SIEMPRE
  // `avanza-web` (el GTFS no las conoce → el aviso "sin confirmar" no les aplica).
  const nombreParada = stop
    ? stop.name
    : nombreSoloBarrido(numero, 'datos' in inicial ? inicial.datos.nombreParada : null);
  const fuenteNombre = stop ? stop.nombreProc.fuente : ('avanza-web' as const);

  // ⭐ EL NOMBRE (a todo el ancho). Es un SLOT: se pinta en el servidor y la rejilla
  //    cliente lo coloca en su área. Cabecera compacta a propósito: cada píxel de aquí
  //    es un píxel que le quita al primer minuto de llegada.
  // ⛔ NO hay flecha "←" de volver: la marca de la cabecera ya enlaza a `/` en toda
  //    pantalla. Tampoco hay enlace de vuelta al fondo — sería ruido con la llegada arriba.
  const nombre = (
    <div className="min-w-0">
      <h1
        className="text-titulo font-black leading-tight sin-recortar"
        data-papel="nombre-parada"
        data-nombre-fuente={fuenteNombre}
      >
        {/* ⭐ EL ICONO DE PARADA (un nodo en el recorrido), decorativo (aria-hidden): el
            nombre y el "poste N" ya lo dicen todo. Ver `IconoParada.tsx`. */}
        <IconoParada className="mr-1.5 inline-block h-[0.78em] w-[0.78em] shrink-0 align-[-0.04em] text-[var(--color-tinta-suave)]" />
        {/* ⭐ EL POSTE COMO CHIP, IGUAL EN LOS DOS ANCHOS: [icono] [chip: número] [nombre].
            El chip lleva SOLO EL NÚMERO —el contorno ya dice que es una etiqueta y el
            usuario está EN la parada—; va contorneado, con su gris, al tamaño del nombre
            (todo en globals.css). ⚠️ `aria-label`: un lector de pantalla NO ve el contorno,
            así que a él SÍ se le dice "poste N" —si no, oiría "823" a secas—. El visible es
            solo el número, como se pidió. */}
        <span
          className="chip-poste-cabecera"
          data-papel="chip-poste-cabecera"
          role="img"
          aria-label={`poste ${numero}`}
        >
          {numero}
        </span>
        {/* ⚠️ SIN TRUNCAR. Si el nombre es largo, BAJA DE LÍNEA. <Cita>: nombre del
            GTFS/Avanza; el traductor del navegador no lo reescribe. */}
        <Cita>{nombreParada}</Cita>
      </h1>
      {/* Solo si de verdad se está fingiendo, y diciendo QUÉ. Ver `Fingiendo.tsx`. */}
      <Fingiendo que={fingir} />

      {/* ⭐ A1 · EL NOMBRE SIN CONFIRMAR SE DICE, NO SE TAPA. Avanza no da el nombre de
          las paradas suprimidas por un desvío; se quedan con el del GTFS, que puede venir
          roto. La señal NO va solo en el tono: borde punteado (forma) + palabra + icono. */}
      {fuenteNombre === 'gtfs-marcado' && (
        <p
          className="es-sin-verificar mt-1.5 inline-flex flex-wrap items-baseline gap-x-1.5 px-2 py-1 text-nota leading-snug text-[var(--color-tinta-suave)] sin-recortar"
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
  );

  // ⭐ LA VISTA DE PARADA es una REJILLA de la que `LlegadasVivas` (cliente, con el estado
  //    mapa↔lista↔filtro) es dueña. Aplana 7 piezas como hijas directas para que las áreas
  //    CSS las recoloquen por ancho —una columna abajo del corte (como hoy), dos arriba—.
  //    El nombre y las dos cajas de líneas entran como SLOTS de servidor. Ver globals.css.
  return (
    <LlegadasVivas
      inicial={inicial}
      poste={numero}
      fingir={fingir}
      nombre={nombre}
      // ⭐ Las solo-barrido son 100% provisionales (no están en la ruta oficial de
      //    nadie): NO llevan la caja sólida "Líneas que pasan por aquí" —no tienen
      //    normales—, solo la punteada "Hoy, por un desvío" (o su nota en degradado).
      lineas={pv.clase === 'gtfs' ? <CajaLineas paradaId={pv.paradaId} fingir={fingir} /> : null}
      desvio={
        pv.clase === 'gtfs' ? (
          <CajaProvisionales paradaId={pv.paradaId} fingir={fingir} />
        ) : (
          <CajaProvisionalesDePoste poste={numero} fingir={fingir} />
        )
      }
    />
  );
}
