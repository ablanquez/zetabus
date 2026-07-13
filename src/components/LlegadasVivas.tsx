'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LlegadasDeParada } from '@/engine/llegadas';
import type { Observacion } from '@/core';
import { FichaVehiculo } from './FichaVehiculo';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⭐ LA EDAD DEL DATO. VIVA. Y EL ANTÍDOTO CONTRA EL PECADO DE LA REFERENCIA.
 *
 *  La referencia refresca cada 20 s y, si el fetch falla, hace esto:
 *
 *      if (!res.ok) return;    ← se rinde. Sin decir nada.
 *      catch { }               ← "preserve last known state". Ni un aviso.
 *
 *  ...y debajo, un texto FIJO: **"Se actualiza automáticamente cada 20 s"**.
 *
 *  Si Avanza se cae con la pantalla abierta, no pasa NADA visible. Los autobuses
 *  siguen ahí con sus minutos. Y ese texto **AFIRMA UNA FRESCURA QUE NO ESTÁ
 *  OCURRIENDO.** Diez minutos después sigues viendo el bus de las 13:04 con el
 *  cartel de "se actualiza cada 20 s" debajo.
 *
 *  ⇒ AQUÍ EL CONTADOR NO SE PARA CUANDO EL REFRESCO FALLA. SIGUE CORRIENDO.
 *    Si llevamos 4 minutos sin conseguir dato nuevo, la pantalla pone
 *    "hace 4 min" y se pone la trama de RANCIO. No hay forma de no verlo.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y LA EDAD SE CUENTA CON UN RELOJ MONÓTONO, NO CON LA HORA DEL MÓVIL.
 *
 * La tentación es `Date.now() - Date.parse(observadoEn)`. Pero ese cálculo mezcla
 * el reloj del SERVIDOR (que fechó el dato) con el reloj del CLIENTE (el móvil
 * del usuario). Si el móvil va tres minutos adelantado —cosa común—, la pantalla
 * diría "hace 3 minutos" sobre un dato recién traído. Y si va atrasado, "hace
 * -2 s". Y el último domingo de octubre, con el cambio de hora, una hora entera.
 *
 * `performance.now()` es MONÓTONO: cuenta desde que se abrió la página y no sabe
 * de husos, de cambios de hora ni de saltos de NTP. El servidor nos dice cuántos
 * segundos tenía el dato AL SALIR; nosotros solo sumamos lo que ha pasado desde
 * que llegó. Ni un reloj de pared en toda la cuenta.
 */

/** El motor cachea 15 s. Preguntar más a menudo no trae nada nuevo: solo ruido. */
const CADA_MS = 15_000;
/** A partir de aquí el dato deja de ser "fresco" y la pantalla lo dice. */
export const RANCIO_S = 45;

type Estado =
  | { tipo: 'ok'; obs: Observacion<LlegadasDeParada> }
  | { tipo: 'comprobando'; obs: Observacion<LlegadasDeParada> }
  /** El último dato bueno + el fallo del refresco. LOS DOS a la vez. */
  | { tipo: 'refresco-fallido'; obs: Observacion<LlegadasDeParada>; motivo: string };

export function LlegadasVivas({
  inicial,
  poste,
  fingir,
}: {
  inicial: Observacion<LlegadasDeParada>;
  poste: number;
  fingir?: string | null;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'ok', obs: inicial });

  /** Segundos que tenía el dato CUANDO SALIÓ DEL SERVIDOR. */
  const edadAlLlegar = useRef<number>('edadSegundos' in inicial ? inicial.edadSegundos : 0);
  /** Marca MONÓTONA de cuándo llegó. Nunca `Date.now()`. */
  const llegoEn = useRef<number>(0);
  const [edad, setEdad] = useState<number>(edadAlLlegar.current);

  useEffect(() => {
    llegoEn.current = performance.now();
  }, []);

  // ── EL CONTADOR. Corre SIEMPRE. Le da igual que el refresco funcione. ──────
  useEffect(() => {
    const t = setInterval(() => {
      const transcurrido = (performance.now() - llegoEn.current) / 1000;
      setEdad(Math.max(0, Math.round(edadAlLlegar.current + transcurrido)));
    }, 1_000);
    return () => clearInterval(t);
  }, []);

  const refrescar = useCallback(async () => {
    // ⚠️ "COMPROBANDO…" SE DICE. No se pinta el estado bueno por defecto
    //    mientras se comprueba: eso fabrica un silencio falso en la interfaz.
    setEstado((e) => ({ tipo: 'comprobando', obs: e.obs }));
    try {
      const url = `/api/llegadas/${poste}${fingir ? `?fingir=${fingir}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const cuerpo = (await res.json()) as Observacion<LlegadasDeParada>;

      // Un 404/502/503 TRAE un cuerpo con su estado: no es un fallo de refresco,
      // es una respuesta con información. Se pinta tal cual.
      if (cuerpo && typeof cuerpo === 'object' && 'estado' in cuerpo) {
        if (cuerpo.estado === 'ok' || cuerpo.estado === 'rancio') {
          edadAlLlegar.current = cuerpo.edadSegundos;
          llegoEn.current = performance.now();
          setEdad(cuerpo.edadSegundos);
        }
        setEstado({ tipo: 'ok', obs: cuerpo });
        return;
      }
      throw new Error(`respuesta inesperada (HTTP ${res.status})`);
    } catch (e) {
      // ⭐ AQUÍ ESTÁ LA DIFERENCIA CON LA REFERENCIA.
      //    NO se resetea `llegoEn`. El contador SIGUE SUBIENDO desde el último
      //    dato bueno. Y se guarda el motivo, y se ENSEÑA.
      setEstado((prev) => ({
        tipo: 'refresco-fallido',
        obs: prev.obs,
        motivo: (e as Error)?.message ?? 'no se ha podido contactar con el servidor',
      }));
    }
  }, [poste, fingir]);

  useEffect(() => {
    const t = setInterval(() => { void refrescar(); }, CADA_MS);
    // ⚠️ Y al volver a la pestaña se refresca YA. La referencia no lo hacía: al
    //    reenfocar podías estar hasta 20 s viendo datos rancios sin saberlo.
    const alVolver = () => { if (!document.hidden) void refrescar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [refrescar]);

  const obs = estado.obs;
  const rancio = edad >= RANCIO_S || obs.estado === 'rancio';
  const fallando = estado.tipo === 'refresco-fallido';

  return (
    <section aria-label="Próximas llegadas">
      {/* ⭐ LA BARRA DE FRESCURA. Lo primero que se lee después de los minutos. */}
      <BarraDeEdad
        edad={edad}
        rancio={rancio}
        comprobando={estado.tipo === 'comprobando'}
        fallando={fallando}
        motivo={fallando ? estado.motivo : null}
        origen={'origen' in obs ? obs.origen : null}
        onRefrescar={() => void refrescar()}
      />

      <Cuerpo obs={obs} rancio={rancio} />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BarraDeEdad({
  edad, rancio, comprobando, fallando, motivo, origen, onRefrescar,
}: {
  edad: number; rancio: boolean; comprobando: boolean; fallando: boolean;
  motivo: string | null; origen: string | null; onRefrescar: () => void;
}) {
  const texto =
    edad < 5 ? 'ahora mismo'
    : edad < 60 ? `hace ${edad} s`
    : edad < 3600 ? `hace ${Math.floor(edad / 60)} min ${edad % 60 ? `${edad % 60} s` : ''}`.trim()
    : `hace más de ${Math.floor(edad / 3600)} h`;

  return (
    <div
      className={`mb-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 ${rancio || fallando ? 'es-rancio' : ''}`}
      data-papel="edad"
      data-rancio={rancio || fallando ? 'si' : 'no'}
      data-edad={edad}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-snug sin-recortar">
          {/* ⚠️ NUNCA "se actualiza cada 20 s". Eso es una promesa.
              Esto es un HECHO: cuándo se miró por última vez. */}
          <span className="text-[var(--color-tinta-tenue)]">Datos de Avanza </span>
          <span className="font-bold" data-papel="edad-texto">{texto}</span>
          {comprobando && (
            <span className="ml-2 text-[var(--color-tinta-tenue)]" data-papel="comprobando">
              · comprobando…
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onRefrescar}
          className="shrink-0 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 min-h-[44px] min-w-[44px] text-[13px] font-semibold"
          aria-label="Actualizar ahora"
        >
          ↻
        </button>
      </div>

      {/* ⭐ EL FALLO DEL REFRESCO **SE DICE**. Esto es lo que la referencia calla. */}
      {fallando && (
        <p
          className="mt-2 text-[12px] font-semibold leading-snug text-[var(--color-alerta)] sin-recortar"
          data-papel="refresco-fallido"
          role="status"
        >
          ⚠ NO ESTAMOS CONSIGUIENDO DATOS NUEVOS.
          <span className="block font-normal text-[var(--color-tinta-suave)]">
            Lo que ves abajo es de {texto} y NO se está actualizando. ({motivo})
          </span>
        </p>
      )}

      {!fallando && rancio && (
        <p className="mt-2 text-[12px] leading-snug text-[var(--color-aviso)] sin-recortar" data-papel="rancio">
          ⚠ Este dato ya no es fresco. Un autobús se mueve mucho en {edad} segundos.
        </p>
      )}

      {origen === 'disco' && (
        <p className="mt-1 text-[11px] text-[var(--color-tinta-tenue)]">
          servido de la caché compartida, no pedido de nuevo a Avanza
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Cuerpo({ obs, rancio }: { obs: Observacion<LlegadasDeParada>; rancio: boolean }) {
  // ⚠️ CINCO ESTADOS, CINCO MENSAJES. El proyecto viejo tenía uno para todos, y
  //    ese uno decía "no hay llegadas" — que es MENTIRA en cuatro de los cinco.
  if (obs.estado === 'desconocido') {
    return <Aviso titulo="Ese poste no existe" cuerpo={obs.motivo} papel="desconocido" />;
  }
  if (obs.estado === 'caido') {
    return (
      <Aviso
        titulo="Avanza no responde"
        cuerpo={`No hemos podido preguntar. Esto NO significa que no haya autobuses: significa que no lo sabemos. (${obs.motivo})`}
        papel="caido"
      />
    );
  }
  if (obs.estado === 'ilegible') {
    return (
      <Aviso
        titulo="No entendemos lo que ha contestado Avanza"
        cuerpo={`Ha respondido, pero su respuesta no cuadra consigo misma y no nos la creemos. Preferimos decir esto a enseñarte una lista incompleta con cara de estar completa. (${obs.motivo})`}
        papel="ilegible"
      />
    );
  }

  const { llegadas, avisos } = obs.datos;

  if (llegadas.length === 0) {
    return (
      <Aviso
        titulo="Ahora mismo no viene ningún autobús"
        cuerpo="La parada existe y Avanza ha contestado: simplemente no anuncia ninguna llegada en este momento. No es un error."
        papel="sin-llegadas"
      />
    );
  }

  return (
    <>
      <ol className="flex flex-col gap-3" data-papel="lista-llegadas">
        {llegadas.map((l, i) => (
          <li key={`${l.coche}-${l.etiquetaCruda}-${i}`}>
            <Llegada l={l} rancio={rancio} />
          </li>
        ))}
      </ol>

      {/* ⚠️ EL CONTRATO DE DATOS. Ni una pantalla sin esto. */}
      <p className="mt-3 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar" data-papel="contrato">
        Son los autobuses <strong>DETECTADOS</strong>, no todos. Avanza anuncia como mucho los dos
        siguientes de cada línea y sentido: puede haber un tercero circulando que no salga aquí.
      </p>

      {avisos.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1" data-papel="avisos">
          {avisos.map((a, i) => (
            <li key={i} className="text-[11px] leading-snug text-[var(--color-aviso)] sin-recortar">
              ⚠ {a}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Llegada({ l, rancio }: { l: LlegadasDeParada['llegadas'][number]; rancio: boolean }) {
  const inminente = l.etaMinutos <= 1;

  return (
    <article
      className={`rounded-2xl border border-[var(--color-borde)] bg-[var(--color-papel)] p-4 ${rancio ? 'es-rancio' : ''}`}
      data-papel="llegada"
      data-inminente={inminente ? 'si' : 'no'}
      data-coche={l.coche}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* COLOR DE LÍNEA = IDENTIDAD. Aquí, y en ningún otro sitio. */}
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-black"
            style={{ backgroundColor: l.color ?? '#94a3b8', color: l.color ? '#fff' : '#1e293b' }}
            data-papel="chip-linea"
            data-linea={l.linea ?? l.etiquetaCruda}
            aria-hidden="true"
          >
            {l.linea ?? l.etiquetaCruda}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-snug sin-recortar" data-papel="destino">
              {l.destino}
            </p>
            <p className="text-[12px] text-[var(--color-tinta-tenue)] sin-recortar">
              línea {l.linea ?? `${l.etiquetaCruda} (desconocida)`}
            </p>
          </div>
        </div>

        {/* ⭐ LOS MINUTOS. LO PRIMERO, LO MÁS GRANDE, ARRIBA A LA DERECHA. */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p
            className={`text-[26px] font-black leading-none tabular-nums ${inminente ? 'es-inminente' : ''}`}
            data-papel="minutos"
          >
            {l.etaMinutos === 0 ? '0' : l.etaMinutos}
            <span className="ml-1 text-[13px] font-bold">min</span>
          </p>
          {/* ⚠️ TERCER CANAL: LA PALABRA. Ni el color ni el latido van solos. */}
          {inminente && (
            <span
              className="text-[10px] font-black uppercase tracking-wide"
              data-papel="ya-llega"
            >
              ya llega
            </span>
          )}
        </div>
      </div>

      <FichaVehiculo coche={String(l.coche)} perfil={l.perfil} />
    </article>
  );
}

function Aviso({ titulo, cuerpo, papel }: { titulo: string; cuerpo: string; papel: string }) {
  return (
    <div
      className="rounded-2xl border-2 border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-4"
      data-papel={papel}
      role="status"
    >
      <p className="text-[15px] font-bold leading-snug sin-recortar">{titulo}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-tinta-suave)] sin-recortar">{cuerpo}</p>
    </div>
  );
}
