'use client';

import { useCallback, useRef, useState } from 'react';
import type { Observacion } from '@/core';
import type { BarridoDeLinea, ProgresoPoste } from './barrido';
import { agruparFlota, type GrupoDeFlota } from './agrupar-flota';

/**
 * ⭐ EL BARRIDO BAJO DEMANDA. Y LA ESPERA COMO ESPECTÁCULO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⛔ AQUÍ NO SE BARRE NADA HASTA QUE ALGUIEN PULSA.
 *
 *  Antes, abrir /linea/35 disparaba peticiones a Avanza que nadie había pedido.
 *  El que solo quería ver el recorrido las pagaba igual. Y el repo promete, POR
 *  ESCRITO Y EN PÚBLICO, no abusar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ LA BARRA: SOLO EL PORCENTAJE.
 *
 * Antes ponía "12 de 18 postes consultados". Un poste es un concepto NUESTRO, de
 * fontanería: al que espera no le dice nada. Se queda el % —que es lo único que
 * responde a la única pregunta que tiene ("¿cuánto falta?")— y la barra.
 *
 * ⚠️ PERO EL NÚMERO DE DEBAJO SIGUE SIENDO REAL. `aria-valuenow` lleva los postes
 * de verdad, y el % sale de ellos. Una barra que se rellena con una animación
 * fija, sin saber por dónde va el trabajo, es un instrumento mentiroso: promete
 * información y no da ninguna. Quitar el rótulo NO es quitar la medida.
 *
 * ⭐ Y LOS FALLOS SE ENSEÑAN MIENTRAS OCURREN, no al final. Ésa fue la sorpresa de
 * la tanda anterior: el bloque de avisos gritaba más que el dato porque COMPETÍA
 * con él. Emitiéndolos según pasan, ya no compiten — SUCEDEN ANTES. El problema
 * no se maquilló: desapareció al cambiar CUÁNDO se cuenta la cosa.
 */

/**
 * ⚠️ LA EDAD, EN ALGO QUE UN HUMANO PUEDA LEER. Y NO ES COSMÉTICA.
 *
 * Un barrido real con Avanza degradada devolvió `edadSegundos: 2055`, y la
 * pantalla ponía, literalmente: **"Dato de hace 2055 s"**.
 *
 * El dato era correcto. La tarjeta estaba marcada como rancia. Todo funcionaba.
 * Y NADIE lee "2055 s" y piensa "media hora": lo lee, ve un número grande que no
 * significa nada, y sigue mirando los autobuses. La honestidad estaba puesta y
 * no se leía — que a efectos del que mira la pantalla es lo mismo que no estar.
 *
 * "34 min" sí se lee. Y entonces sí se decide no fiarse.
 */
function edadEnPalabras(s: number): string {
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

type Fase =
  | { tipo: 'quieto' }
  | { tipo: 'barriendo'; hechos: number; total: number; fallos: ProgresoPoste[] }
  | { tipo: 'hecho'; obs: Observacion<BarridoDeLinea>; peticiones: number }
  | { tipo: 'roto'; motivo: string };

export function BuscarBuses({ linea, fingir }: { linea: string; fingir?: string | null }) {
  const [fase, setFase] = useState<Fase>({ tipo: 'quieto' });
  const corriendo = useRef(false);

  const barrer = useCallback(async () => {
    // ⚠️ Doble pulsación = doble barrido = doble tráfico a Avanza. No.
    if (corriendo.current) return;
    corriendo.current = true;
    setFase({ tipo: 'barriendo', hechos: 0, total: 0, fallos: [] });

    try {
      const res = await fetch(
        `/api/barrido/${encodeURIComponent(linea)}${fingir ? `?fingir=${fingir}` : ''}`,
        { cache: 'no-store' },
      );
      if (!res.ok || !res.body) {
        const cuerpo = (await res.json().catch(() => null)) as { motivo?: string } | null;
        throw new Error(cuerpo?.motivo ?? `el servidor ha respondido con HTTP ${res.status}`);
      }

      // Lectura del NDJSON según va llegando. Una línea = un evento.
      const lector = res.body.getReader();
      const dec = new TextDecoder();
      let resto = '';

      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        resto += dec.decode(value, { stream: true });
        const lineas = resto.split('\n');
        resto = lineas.pop() ?? ''; // la última puede venir a medias

        for (const cruda of lineas) {
          if (!cruda.trim()) continue;
          const ev = JSON.parse(cruda) as
            | ({ tipo: 'poste' } & ProgresoPoste)
            | { tipo: 'fin'; observacion: Observacion<BarridoDeLinea>; peticionesAAvanza: number }
            | { tipo: 'error'; motivo: string };

          if (ev.tipo === 'poste') {
            setFase((f) =>
              f.tipo === 'barriendo'
                ? {
                    tipo: 'barriendo',
                    hechos: ev.hechos,
                    total: ev.total,
                    // ⭐ EL FALLO SE ENSEÑA MIENTRAS OCURRE.
                    fallos: ev.resultado === 'fallo' ? [...f.fallos, ev] : f.fallos,
                  }
                : f,
            );
          } else if (ev.tipo === 'fin') {
            setFase({ tipo: 'hecho', obs: ev.observacion, peticiones: ev.peticionesAAvanza });
          } else {
            setFase({ tipo: 'roto', motivo: ev.motivo });
          }
        }
      }
    } catch (e) {
      setFase({ tipo: 'roto', motivo: (e as Error)?.message ?? 'no se ha podido contactar' });
    } finally {
      corriendo.current = false;
    }
  }, [linea, fingir]);

  // ── QUIETO: nada se ha pedido, nada se ha gastado ────────────────────────
  if (fase.tipo === 'quieto') {
    return (
      <div data-papel="barrido-quieto">
        <button
          type="button"
          onClick={() => void barrer()}
          data-papel="boton-barrer"
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border-2 border-[var(--color-tinta)] bg-[var(--color-papel)] px-4 text-[15px] font-black"
        >
          Buscar los autobuses de esta línea
        </button>
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar">
          {/* ⚠️ SE DICE LO QUE CUESTA, Y AHORA CUESTA MÁS: se preguntan TODOS los
              postes de los DOS sentidos, porque muestrear perdía autobuses. Que el
              usuario sepa que hay un servicio ajeno pagando esto, y que tarda. */}
          Preguntaremos a Avanza por <strong>todas</strong> las paradas de la línea, en los dos
          sentidos. Tarda unos segundos y son bastantes peticiones a su servidor: por eso no lo
          hacemos solos.
        </p>
      </div>
    );
  }

  // ── BARRIENDO: la barra que mide de verdad ───────────────────────────────
  if (fase.tipo === 'barriendo') {
    const { hechos, total, fallos } = fase;
    const pct = total > 0 ? Math.round((hechos / total) * 100) : 0;

    return (
      <div
        className="rounded-2xl border-2 border-[var(--color-tinta)] bg-[var(--color-papel)] p-4"
        data-papel="barriendo"
        data-hechos={hechos}
        data-total={total}
        role="status"
        aria-live="polite"
      >
        <p className="text-[15px] font-black leading-snug sin-recortar">
          Buscando los autobuses de la línea {linea}…
        </p>

        {/* LA BARRA. `aria-valuenow` con el número REAL de postes: un lector de
            pantalla tiene que oír una medida, no una decoración. Lo que se quita
            es el RÓTULO de fontanería, no el instrumento. */}
        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-4 grow overflow-hidden rounded-full border-2 border-[var(--color-tinta)] bg-[var(--color-fondo)]"
            role="progressbar"
            aria-valuenow={hechos}
            aria-valuemin={0}
            aria-valuemax={total || 1}
            aria-label={`${pct}% del recorrido consultado`}
            data-papel="barra"
          >
            <div
              className="h-full bg-[var(--color-tinta)] transition-[width] duration-200"
              style={{ width: `${pct}%` }}
              data-papel="barra-relleno"
              data-pct={pct}
            />
          </div>
          <span
            className="w-[52px] shrink-0 text-right text-[15px] font-black tabular-nums"
            data-papel="progreso-pct"
          >
            {pct} %
          </span>
        </div>

        {/* ⭐ LOS FALLOS, MIENTRAS OCURREN. Ya no tapan el resultado: van antes. */}
        {fallos.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5" data-papel="fallos-en-vivo">
            {fallos.slice(-3).map((f) => (
              <li
                key={f.poste}
                className="text-[11px] leading-snug text-[var(--color-aviso)] sin-recortar"
              >
                ⚠ una parada no ha respondido (poste {f.poste})
              </li>
            ))}
            {fallos.length > 3 && (
              <li className="text-[11px] font-semibold text-[var(--color-aviso)]">
                …y {fallos.length - 3} más
              </li>
            )}
          </ul>
        )}
      </div>
    );
  }

  // ── ROTO ─────────────────────────────────────────────────────────────────
  if (fase.tipo === 'roto') {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-4"
        data-papel="barrido-roto"
        role="status"
      >
        <p className="text-[15px] font-bold leading-snug sin-recortar">
          No hemos podido buscar los autobuses
        </p>
        <p className="mt-1 text-[13px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
          {fase.motivo}{' '}
          <strong>Esto NO significa que no haya autobuses: significa que no lo sabemos.</strong>
        </p>
        <button
          type="button"
          onClick={() => void barrer()}
          className="mt-3 min-h-[44px] rounded-xl border-2 border-[var(--color-tinta)] px-4 text-[13px] font-bold"
        >
          Volver a intentarlo
        </button>
      </div>
    );
  }

  // ── HECHO ────────────────────────────────────────────────────────────────
  return <Resultado obs={fase.obs} peticiones={fase.peticiones} linea={linea} onOtraVez={() => void barrer()} />;
}

// ─────────────────────────────────────────────────────────────────────────────

function Resultado({
  obs,
  peticiones,
  linea,
  onOtraVez,
}: {
  obs: Observacion<BarridoDeLinea>;
  peticiones: number;
  linea: string;
  onOtraVez: () => void;
}) {
  if (obs.estado !== 'ok') {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-4"
        data-papel="barrido-roto"
        role="status"
      >
        <p className="text-[15px] font-bold leading-snug sin-recortar">
          No hemos podido buscar los autobuses de la línea {linea}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
          {obs.motivo}{' '}
          <strong>Esto NO significa que no haya autobuses: significa que no lo sabemos.</strong>
        </p>
        {/* ⚠️⚠️ ESTE BOTÓN NO ESTABA, Y LO CAZÓ UN TEST. Y FALTABA EN EL PEOR SITIO.
            Cuando falla la RED del navegador sí se ofrecía reintentar. Cuando el
            que se cae es AVANZA —que es el fallo COMÚN, el que pasa de verdad, el
            que hemos visto tres veces este mes— la pantalla se quedaba en un
            callejón sin salida: te decía que no lo sabía y ahí te dejaba, sin más
            salida que recargar la página entera a mano.
            El caso raro estaba mejor atendido que el caso frecuente. */}
        <button
          type="button"
          onClick={onOtraVez}
          className="mt-3 min-h-[44px] rounded-xl border-2 border-[var(--color-tinta)] px-4 text-[13px] font-bold"
        >
          Volver a intentarlo
        </button>
      </div>
    );
  }

  const d = obs.datos;
  const n = d.detectados.length;
  const rancio = obs.edadSegundos >= 45;
  const grupos = agruparFlota(d.detectados);

  return (
    <div data-papel="barrido-hecho">
      <div
        className={`rounded-2xl border-2 border-[var(--color-tinta)] bg-[var(--color-papel)] p-4 ${rancio ? 'es-rancio' : ''}`}
        data-papel="hallazgo"
        data-total={n}
        data-peticiones={peticiones}
      >
        <p className="text-[18px] font-black leading-snug sin-recortar" data-papel="hallazgo-titular">
          {/* ═══════════════════════════════════════════════════════════════════
              ⭐ AQUÍ LLEVO LA CONTRARIA, Y CON UNA MEDIDA EN LA MANO.

              La Tanda 5B pide el titular "Hay X autobuses". La Tanda 5A prohibía
              exactamente esa frase ("⛔ NO: 'Hay 11 autobuses' a secas"), y la
              medición del paso, hecha HOY, es la que dice cuál de las dos manda:

              Avanza anuncia en cada poste, como mucho, LOS DOS SIGUIENTES de cada
              línea y sentido. Si TRES autobuses caben entre dos postes seguidos —y
              se han medido DOS PAREJAS A CERO POSTES DE DISTANCIA, así que caben—,
              el tercero no es de los dos siguientes de NINGÚN poste. No sale. Y no
              sale POR MUCHO QUE PREGUNTEMOS A TODOS: no es un fallo del barrido, es
              que la información no está en la fuente.

              ⇒ "HAY 11" es una afirmación que NO PODEMOS SOSTENER. Justo hoy, con
                el barrido completo, es cuando más tentador es decirla y cuando peor
                fundada está.

              He quitado el adorno ("...en la línea 35" sobraba: el rótulo de arriba
              ya dice la línea). He dejado el verbo. Si aun así lo quieres, es UNA
              cadena y la cambias tú.
              ═══════════════════════════════════════════════════════════════════ */}
          {n === 0
            ? 'No hemos encontrado ningún autobús.'
            : `Hemos encontrado ${n} ${n === 1 ? 'autobús' : 'autobuses'}.`}
        </p>

        {/* ⚠️⚠️ UN BARRIDO ABANDONADO NO ES UN BARRIDO COMPLETO CON MENOS AUTOBUSES.
            Si nos hemos rendido a mitad, la cifra de arriba está calculada sobre
            una parte de la línea, y eso NO puede ir en la letra pequeña: cambia
            lo que significa el titular. Va aquí, en grande, y con su forma. */}
        {d.abandonado && (
          <p
            className="es-rancio mt-2 px-3 py-2 text-[13px] font-bold leading-snug text-[var(--color-aviso)] sin-recortar"
            data-papel="abandonado"
          >
            ⚠ Hemos dejado de preguntar: Avanza no contestaba a ninguna parada. Solo hemos podido
            mirar {d.postesConsultados} de {d.postesDeLaLinea}, así que <strong>puede haber
            bastantes más autobuses</strong> de los que salen aquí.
          </p>
        )}

        {/* ⚠️ LA LETRA PEQUEÑA QUE HACE QUE EL TITULAR SEA VERDAD. Pequeña, pero va. */}
        <p
          className="mt-2 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
          data-papel="hallazgo-salvedad"
        >
          {d.postesConsultados} paradas consultadas
          {d.abandonado ? ` de ${d.postesDeLaLinea}` : ' (los dos sentidos)'}
          {d.postesFallidos > 0 ? `, ${d.postesFallidos} sin respuesta` : ''}
          {d.postesRancios > 0 ? `, ${d.postesRancios} con dato viejo` : ''}. Puede haber alguno más
          que no aparezca: Avanza solo anuncia los dos siguientes de cada línea y sentido, así que
          un tercero muy pegado a otros dos no lo publica nadie.
          {' '}Dato de hace {edadEnPalabras(obs.edadSegundos)} · {peticiones}{' '}
          {peticiones === 1 ? 'petición' : 'peticiones'} a Avanza.
        </p>

        {/* ⭐⭐ Y SI EL DATO ES MUY VIEJO, NO BASTA CON PONER LA EDAD EN PEQUEÑO.
            Un barrido real con Avanza degradada sirvió postes de hace MEDIA HORA
            —de la caché, que para eso está— y la pantalla lo decía en 11 píxeles,
            al final de una frase larga. Un autobús de hace 34 minutos no está
            donde dice: es basura con formato de dato. Se dice fuerte, o no se dice. */}
        {obs.edadSegundos >= 120 && (
          <p
            className="mt-2 text-[13px] font-bold leading-snug text-[var(--color-aviso)] sin-recortar"
            data-papel="dato-viejo"
          >
            ⚠ Avanza no está contestando bien. Parte de esto es de hace{' '}
            {edadEnPalabras(obs.edadSegundos)}: <strong>esos autobuses ya no están ahí</strong>.
          </p>
        )}

        <button
          type="button"
          onClick={onOtraVez}
          className="mt-3 min-h-[44px] rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 text-[13px] font-bold"
        >
          Buscar otra vez
        </button>
      </div>

      {n > 0 && (
        <div className="mt-3 flex flex-col gap-3" data-papel="grupos-flota">
          {grupos.map((g) => (
            <GrupoFlota key={g.clave} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ⭐ UN TIPO DE VEHÍCULO, Y LOS COCHES QUE LO SON. Tres bloques y se ve la flota.
 *
 * ⚠️ LA CONFIANZA ES UNA PROPIEDAD DEL BLOQUE ENTERO, y se dice con la FORMA (el
 * borde), no con el color: `.es-sin-verificar` es discontinuo, `.es-sin-datos` es
 * de puntos. Los dos sobreviven a la escala de grises, al daltonismo y a un móvil
 * al sol — y hay un test que lo demuestra apagando el color.
 */
function GrupoFlota({ g }: { g: GrupoDeFlota }) {
  // ── SIN FICHA. Su propio grupo, SIEMPRE. Nunca dentro de otro. ────────────
  if (g.confianza === null) {
    return (
      <section
        className="es-sin-datos bg-[var(--color-papel)] p-4"
        data-papel="grupo-flota"
        data-confianza="sin_ficha"
      >
        <h3 className="text-[13px] font-black uppercase leading-snug tracking-wide sin-recortar">
          Sin datos · {g.coches.length} {g.coches.length === 1 ? 'autobús' : 'autobuses'}
        </h3>
        <p className="mt-0.5 text-[11px] leading-snug not-italic text-[var(--color-tinta-tenue)] sin-recortar">
          No constan en el registro oficial. No inventamos su modelo ni su tamaño.
        </p>
        <Coches coches={g.coches} />
      </section>
    );
  }

  const oficial = g.confianza === 'oficial';
  const rasgos = [
    g.clase,
    g.metros !== null ? `${g.metros} m` : null,
    g.combustible,
  ].filter(Boolean) as string[];

  return (
    <section
      className={`p-4 ${oficial ? 'rounded-2xl border border-[var(--color-borde)] bg-[var(--color-papel)]' : 'es-sin-verificar bg-[var(--color-papel)]'}`}
      data-papel="grupo-flota"
      data-confianza={g.confianza}
      data-coches={g.coches.length}
    >
      <h3 className="text-[15px] font-black leading-snug sin-recortar">{g.modelo}</h3>
      <p className="mt-0.5 text-[12px] font-bold uppercase leading-snug tracking-wide text-[var(--color-tinta-suave)] sin-recortar">
        {/* Separadores con espacios a los lados: si la línea se parte, se parte
            por un espacio y NO por la mitad de "articulado". */}
        {rasgos.join(' · ')}
      </p>

      {!oficial && (
        <p
          className="mt-1 text-[11px] font-semibold leading-snug text-[var(--color-aviso)] sin-recortar"
          data-papel="procedencia"
        >
          <span aria-hidden="true">⚠ </span>
          SIN VERIFICAR — no constan en el registro oficial
        </p>
      )}

      <Coches coches={g.coches} />
    </section>
  );
}

/** Los números de coche. El dato bruto: lo único que le sirve al que mira el bus. */
function Coches({ coches }: { coches: readonly string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" data-papel="coches">
      {coches.map((c) => (
        <li
          key={c}
          className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-2 py-1 text-[13px] font-black tabular-nums leading-none sin-recortar"
          data-coche={c}
        >
          {c}
        </li>
      ))}
    </ul>
  );
}
