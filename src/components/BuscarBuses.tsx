'use client';

import { useCallback, useRef, useState } from 'react';
import type { Observacion } from '@/core';
import type { BarridoDeLinea, ProgresoPoste } from '@/engine/barrido';
import { FichaVehiculo } from './FichaVehiculo';

/**
 * ⭐ EL BARRIDO BAJO DEMANDA. Y LA ESPERA COMO ESPECTÁCULO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⛔ AQUÍ NO SE BARRE NADA HASTA QUE ALGUIEN PULSA.
 *
 *  Antes, abrir /linea/35 disparaba 18 peticiones a Avanza que nadie había
 *  pedido. El que solo quería ver el recorrido las pagaba igual. Y el repo
 *  promete, POR ESCRITO Y EN PÚBLICO, no abusar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ Y LA BARRA MIDE ALGO DE VERDAD.
 *
 * Una barra de progreso que se rellena con una animación fija —sin saber por
 * dónde va el trabajo— es un instrumento mentiroso: promete información y no da
 * ninguna. Ésta cuenta POSTES REALES, uno a uno, según van cayendo por el
 * canal NDJSON. Si el barrido se atasca en el poste 12, la barra se queda en 12
 * y lo dice. Si Avanza se cae a mitad, los fallos van saliendo AHÍ MISMO.
 *
 * ⇒ Los fallos ya no tapan el resultado, porque ocurren ANTES que él.
 *
 * ⚠️ Y LO QUE NO SE DICE, PASE LO QUE PASE:
 *
 *    ⛔ "Localizando TODOS los autobuses"  → si Avanza tira 3 postes, no.
 *    ⛔ "Hay 11 autobuses"                 → estarías AFIRMANDO algo que no sabes.
 *                                            Avanza da los DOS SIGUIENTES de cada
 *                                            línea y sentido: puede haber un
 *                                            tercero circulando que no salga.
 *    ✅ "Hemos ENCONTRADO 11 autobuses."   → sigue siendo un hallazgo.
 *                                            Solo que no miente.
 */

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
          {/* ⚠️ SE DICE LO QUE CUESTA. Preguntamos a Avanza poste a poste, y ellos
              no nos deben nada. Que el usuario sepa que hay un coste detrás. */}
          Preguntaremos a Avanza poste a poste. Tarda unos segundos y son unas
          veinte peticiones a su servidor: por eso no lo hacemos solos.
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
        <p className="mt-1 text-[13px] font-bold leading-snug sin-recortar" data-papel="progreso-texto">
          {total === 0
            ? 'preparando el recorrido…'
            : `${hechos} de ${total} postes consultados`}
        </p>

        {/* LA BARRA. `aria-valuenow` con el número REAL: un lector de pantalla
            tiene que oír el mismo dato que se ve. */}
        <div
          className="mt-2 h-4 w-full overflow-hidden rounded-full border-2 border-[var(--color-tinta)] bg-[var(--color-fondo)]"
          role="progressbar"
          aria-valuenow={hechos}
          aria-valuemin={0}
          aria-valuemax={total || 1}
          aria-label={`${hechos} de ${total} postes consultados`}
          data-papel="barra"
        >
          <div
            className="h-full bg-[var(--color-tinta)] transition-[width] duration-200"
            style={{ width: `${pct}%` }}
            data-papel="barra-relleno"
            data-pct={pct}
          />
        </div>

        {/* ⭐ LOS FALLOS, MIENTRAS OCURREN. Ya no tapan el resultado: van antes. */}
        {fallos.length > 0 && (
          <ul className="mt-2 flex flex-col gap-0.5" data-papel="fallos-en-vivo">
            {fallos.slice(-3).map((f) => (
              <li
                key={f.poste}
                className="text-[11px] leading-snug text-[var(--color-aviso)] sin-recortar"
              >
                ⚠ el poste {f.poste} no ha respondido
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
      </div>
    );
  }

  const d = obs.datos;
  const n = d.detectados.length;
  const rancio = obs.edadSegundos >= 45;

  return (
    <div data-papel="barrido-hecho">
      <div
        className={`rounded-2xl border-2 border-[var(--color-tinta)] bg-[var(--color-papel)] p-4 ${rancio ? 'es-rancio' : ''}`}
        data-papel="hallazgo"
        data-total={n}
        data-peticiones={peticiones}
      >
        <p className="text-[18px] font-black leading-snug sin-recortar" data-papel="hallazgo-titular">
          {/* ⭐ "HEMOS ENCONTRADO". Ni "hay", ni "todos". Es un hallazgo, no un censo. */}
          {n === 0
            ? `No hemos encontrado ningún autobús en la línea ${linea}.`
            : `Hemos encontrado ${n} ${n === 1 ? 'autobús' : 'autobuses'} en la línea ${linea}.`}
        </p>

        {/* ⚠️ LA LETRA PEQUEÑA QUE HACE QUE EL TITULAR SEA VERDAD. */}
        <p
          className="mt-2 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar"
          data-papel="hallazgo-salvedad"
        >
          {d.postesConsultados} postes consultados
          {d.postesFallidos > 0 ? `, ${d.postesFallidos} sin respuesta` : ''}
          {d.postesRancios > 0 ? `, ${d.postesRancios} con dato viejo` : ''}. Puede haber alguno más
          que no aparezca aquí: Avanza solo anuncia los dos siguientes de cada línea y sentido.
          {' '}Dato de hace {obs.edadSegundos} s · {peticiones}{' '}
          {peticiones === 1 ? 'petición' : 'peticiones'} a Avanza.
        </p>

        <button
          type="button"
          onClick={onOtraVez}
          className="mt-3 min-h-[44px] rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 text-[13px] font-bold"
        >
          Buscar otra vez
        </button>
      </div>

      {/* ⭐ LA LISTA. El dato BRUTO: cuántos hay y CUÁLES SON.
          El usuario ve con sus ojos cuáles son articulados. No hay que contárselo:
          se ve. La geometría se explica sola; el texto hay que creérselo. */}
      {n > 0 && (
        <ol className="mt-3 flex flex-col gap-3" data-papel="lista-buses">
          {d.detectados.map((b) => (
            <li key={String(b.coche)}>
              <article
                className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-papel)] p-4"
                data-papel="bus-encontrado"
                data-coche={String(b.coche)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black leading-snug sin-recortar">
                      Coche {String(b.coche)}
                    </p>
                    <p className="text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
                      línea {d.linea} · sentido {b.destino}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <p
                      className={`text-[22px] font-black leading-none tabular-nums ${b.etaMinutos <= 1 ? 'es-inminente' : ''}`}
                      data-papel="minutos"
                    >
                      {b.etaMinutos}
                      <span className="ml-1 text-[12px] font-bold">min</span>
                    </p>
                    {b.etaMinutos <= 1 && (
                      <span className="mt-1 text-[10px] font-black uppercase tracking-wide" data-papel="ya-llega">
                        ya llega
                      </span>
                    )}
                  </div>
                </div>

                {/* ⚠️ "LLEGA A", no "está en". Lo primero es lo que la fuente
                    afirma. Lo segundo sería una deducción nuestra: un autobús a
                    14 minutos de esa parada puede estar a kilómetros. */}
                <p className="mt-1 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
                  llega a <strong>{b.paradaMasCercana}</strong> (poste {b.posteMasCercano})
                </p>

                {/* La ficha, con su procedencia. `null` → SIN DATOS, nunca un defecto. */}
                <FichaVehiculo coche={String(b.coche)} perfil={b.perfil} yaSeSabeElCoche />
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
