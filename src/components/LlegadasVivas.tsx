'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LlegadaViva, LlegadasDeParada } from '@/engine/llegadas';
import type { Observacion } from '@/core';
import { linea } from '@/engine/topologia';
import { DeDondeSaleCadaDato, FichaVehiculo, NotaSinVerificar } from './FichaVehiculo';
import { tonosDeChip } from './ChipLinea';

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
 *  ⇒ AQUÍ EL CONTADOR NO SE PARA CUANDO EL REFRESCO FALLA. SIGUE CORRIENDO.
 *
 *  ⚠️ Es UNA de las dos cosas que NO se clonan de ellos. La otra son sus chips
 *     de flota, que dicen "Estándar" sobre autobuses de 18 metros.
 *     TODO LO DEMÁS SE CLONA — y esta pantalla ahora sí.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Y LA EDAD SE CUENTA CON UN RELOJ MONÓTONO, NO CON LA HORA DEL MÓVIL.
 * `performance.now()` no sabe de husos, de cambios de hora ni de saltos de NTP.
 * `Date.now() - Date.parse(observadoEn)` mezclaría el reloj del servidor con el
 * del móvil del usuario, y el último domingo de octubre se equivocaría una hora.
 */

/**
 * ⭐ EL MAPA, ARRIBA. Y CARGADO EN EL CLIENTE, QUE NO ES UN CAPRICHO:
 *
 * Leaflet toca `window` al importarse. En el servidor no hay `window`, así que un
 * import normal revienta el render. La documentación oficial de Next lo dice sin
 * rodeos: *"`ssr: false` option will only work for Client Components"*. Este
 * fichero ES un Client Component, así que aquí sí vale — y solo aquí.
 */
const MapaParada = dynamic(() => import('./MapaParada').then((m) => m.MapaParada), {
  ssr: false,
  loading: () => (
    <div
      className="mb-4 h-72 w-full animate-pulse rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo)]"
      data-papel="mapa-cargando"
      aria-label="Cargando el mapa"
    />
  ),
});

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

  const edadAlLlegar = useRef<number>('edadSegundos' in inicial ? inicial.edadSegundos : 0);
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
    setEstado((e) => ({ tipo: 'comprobando', obs: e.obs }));
    try {
      const url = `/api/llegadas/${poste}${fingir ? `?fingir=${fingir}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const cuerpo = (await res.json()) as Observacion<LlegadasDeParada>;

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
      // ⭐ NO se resetea `llegoEn`: el contador SIGUE SUBIENDO desde el último
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
    const alVolver = () => { if (!document.hidden) void refrescar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [refrescar]);

  const obs = estado.obs;
  const rancio = edad >= RANCIO_S || obs.estado === 'rancio';
  const fallando = estado.tipo === 'refresco-fallido';
  const hayDatos = obs.estado === 'ok' || obs.estado === 'rancio';

  // ═══════════════════════════════════════════════════════════════════════════
  //  ⭐ UN SOLO ESTADO GOBIERNA EL MAPA Y LA LISTA. NO DOS SINCRONIZADOS.
  //
  //  Lo descubrí PULSANDO su web, no leyéndola. Medido en su pantalla:
  //      pulso "Ninguna"  → lista 4 → 0 filas · mapa 5 → 1 marcadores
  //      apago una línea  → lista 4 → 2       · mapa 5 → 3
  //
  //  No hay dos filtros que mantener en sincronía: hay UNO, y las dos vistas lo
  //  leen. Por eso no se pueden desincronizar — no hay nada que desincronizar.
  //  Lo mismo vale para el coche SELECCIONADO: pulsar un bus en el mapa resalta
  //  su fila, y pulsar la fila resalta el bus. Un estado, dos vistas.
  // ═══════════════════════════════════════════════════════════════════════════
  const [apagadas, setApagadas] = useState<ReadonlySet<string>>(new Set());
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const lineasDelPoste = useMemo(() => {
    if (!hayDatos) return [];
    const vistas = new Map<string, { etiqueta: string; color: string | null }>();
    for (const l of obs.datos.llegadas) {
      const k = l.linea ?? l.etiquetaCruda;
      if (!vistas.has(k)) vistas.set(k, { etiqueta: k, color: l.color });
    }
    return [...vistas.values()].sort((a, b) =>
      a.etiqueta.localeCompare(b.etiqueta, 'es', { numeric: true }),
    );
  }, [obs, hayDatos]);

  const visibles = useMemo<readonly LlegadaViva[]>(() => {
    if (!hayDatos) return [];
    return obs.datos.llegadas.filter((l) => !apagadas.has(l.linea ?? l.etiquetaCruda));
  }, [obs, apagadas, hayDatos]);

  const alternar = (etiqueta: string) =>
    setApagadas((prev) => {
      const s = new Set(prev);
      if (s.has(etiqueta)) s.delete(etiqueta);
      else s.add(etiqueta);
      return s;
    });

  const todasApagadas = lineasDelPoste.length > 0 && apagadas.size === lineasDelPoste.length;

  return (
    <section aria-label="Próximas llegadas">
      {/* ⭐ EL MAPA, ARRIBA. Decisión de Antonio, que es el que coge el bus. */}
      {hayDatos && (
        <MapaParada
          parada={obs.datos.posicionParada}
          llegadas={visibles}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
        />
      )}

      <BarraDeEdad
        edad={edad}
        rancio={rancio}
        comprobando={estado.tipo === 'comprobando'}
        fallando={fallando}
        motivo={fallando ? estado.motivo : null}
        origen={'origen' in obs ? obs.origen : null}
        onRefrescar={() => void refrescar()}
      />

      {lineasDelPoste.length > 1 && (
        <FiltroDeLineas
          lineas={lineasDelPoste}
          apagadas={apagadas}
          onAlternar={alternar}
          onTodas={() => setApagadas(new Set())}
          onNinguna={() => setApagadas(new Set(lineasDelPoste.map((l) => l.etiqueta)))}
        />
      )}

      <Cuerpo
        obs={obs}
        rancio={rancio}
        visibles={visibles}
        apagadasTodas={todasApagadas}
        seleccionado={seleccionado}
        onSeleccionar={setSeleccionado}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ B4 · LOS FILTROS, CLONADOS. Antes eran dos pastillas sueltas y no se
 * entendía qué hacían. Medido en la referencia a 360 px:
 *
 *     título "Líneas en esta parada"  h2 · 16 px · bold
 *     "Todas" / "Ninguna"             botones redondos, A LA DERECHA (66×34, 81×34)
 *     los chips de línea              56×56, rounded-2xl, 17 px, centrados
 *
 * El título es lo que convierte dos botones en un FILTRO: sin él, nadie sabe
 * qué está tocando.
 */
function FiltroDeLineas({
  lineas, apagadas, onAlternar, onTodas, onNinguna,
}: {
  lineas: { etiqueta: string; color: string | null }[];
  apagadas: ReadonlySet<string>;
  onAlternar: (e: string) => void;
  onTodas: () => void;
  onNinguna: () => void;
}) {
  return (
    <div className="mb-4" data-papel="filtro-lineas">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-bold leading-snug sin-recortar">Líneas en esta parada</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onTodas}
            data-papel="filtro-todas"
            className="min-h-[44px] shrink-0 rounded-full border border-[var(--color-borde)] bg-[var(--color-papel)] px-3.5 text-[13px] font-semibold"
          >
            Todas
          </button>
          <button
            type="button"
            onClick={onNinguna}
            data-papel="filtro-ninguna"
            className="min-h-[44px] shrink-0 rounded-full border border-[var(--color-borde)] bg-[var(--color-papel)] px-3.5 text-[13px] font-semibold"
          >
            Ninguna
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {lineas.map(({ etiqueta, color }) => {
          const off = apagadas.has(etiqueta);
          return (
            <button
              key={etiqueta}
              type="button"
              onClick={() => onAlternar(etiqueta)}
              aria-pressed={!off}
              aria-label={`${off ? 'Mostrar' : 'Ocultar'} la línea ${etiqueta}`}
              data-papel="chip-filtro"
              data-linea={etiqueta}
              data-apagada={off ? 'si' : 'no'}
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-[17px] font-bold"
              style={
                off
                  ? {
                      // ⛔ APAGADA. Y el estado NO va en el tono: va en FORMA.
                      //    Borde discontinuo + tachado. En escala de grises esto
                      //    se sigue leyendo; "gris vs color" no.
                      background: 'var(--color-fondo)',
                      color: 'var(--color-tinta-tenue)',
                      border: '2px dashed var(--color-tinta-tenue)',
                      textDecoration: 'line-through',
                    }
                  : { backgroundColor: color ?? '#94a3b8', color: '#fff', border: '2px solid transparent' }
              }
            >
              {etiqueta}
            </button>
          );
        })}
      </div>
    </div>
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
      className={`mb-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2 ${rancio || fallando ? 'es-rancio' : ''}`}
      data-papel="edad"
      data-rancio={rancio || fallando ? 'si' : 'no'}
      data-edad={edad}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-snug sin-recortar">
          {/* ⚠️ NUNCA "se actualiza cada 20 s". Eso es una PROMESA.
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
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 text-[13px] font-semibold"
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

function Cuerpo({
  obs, rancio, visibles, apagadasTodas, seleccionado, onSeleccionar,
}: {
  obs: Observacion<LlegadasDeParada>;
  rancio: boolean;
  visibles: readonly LlegadaViva[];
  apagadasTodas: boolean;
  seleccionado: string | null;
  onSeleccionar: (c: string | null) => void;
}) {
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

  // ⚠️ "HAS APAGADO TODAS LAS LÍNEAS" NO ES "NO HAY AUTOBUSES".
  if (apagadasTodas) {
    return (
      <Aviso
        titulo="Has ocultado todas las líneas"
        cuerpo="Sí hay autobuses viniendo. Pulsa «Todas», o enciende alguna línea del filtro, para verlos."
        papel="todas-apagadas"
      />
    );
  }

  const ocultos = llegadas.length - visibles.length;
  // ⚠️ NO es "¿hay algún marcado?" sino "¿CUÁLES hay?". La leyenda explica
  //    únicamente los símbolos que el usuario tiene delante en ESTA parada.
  const confianzasPresentes = [
    ...new Set(visibles.map((l) => l.perfil?.confidence).filter((c) => c !== undefined && c !== 'oficial')),
  ];

  return (
    <>
      <h2 className="mb-3 text-[16px] font-bold leading-snug sin-recortar">Próximas llegadas</h2>

      {ocultos > 0 && (
        <p
          className="mb-2 text-[12px] font-semibold text-[var(--color-tinta-suave)] sin-recortar"
          data-papel="ocultos-por-filtro"
        >
          {ocultos === 1 ? 'Hay 1 autobús oculto' : `Hay ${ocultos} autobuses ocultos`} por el filtro
          de líneas.
        </p>
      )}

      {/* ⭐ B5 · UNA SOLA TARJETA CON FILAS, no seis tarjetas con hueco entre ellas.
          Medido a 360 px: su fila mide 102 px y la nuestra medía 160. Caben 8
          llegadas donde nosotros metíamos 4 — y el que espera el bus quiere ver
          la siguiente, no admirar el margen. */}
      <ol
        className={`overflow-hidden rounded-2xl border border-[var(--color-borde)] bg-[var(--color-papel)] ${rancio ? 'es-rancio' : ''}`}
        data-papel="lista-llegadas"
      >
        {visibles.map((l, i) => (
          <li
            key={`${l.coche}-${l.etiquetaCruda}-${i}`}
            className={i > 0 ? 'border-t border-[var(--color-borde)]' : ''}
          >
            <Llegada
              l={l}
              seleccionado={String(l.coche) === seleccionado}
              onSeleccionar={onSeleccionar}
            />
            {/* ⭐ EL DETALLE DE PROCEDENCIA, **FUERA DEL BOTÓN DE LA FILA**.
                Un `<details>` dentro de un `<button>` es HTML inválido y, en la
                práctica, un desplegable que NO SE PUEDE ABRIR: el clic se lo come
                el botón. Va aquí, como hermano suyo dentro del `<li>`. */}
            <div className="px-4 pb-2">
              <DeDondeSaleCadaDato perfil={l.perfil} />
            </div>
          </li>
        ))}
      </ol>

      <NotaSinVerificar presentes={confianzasPresentes} />

      {/* ⚠️ EL CONTRATO DE DATOS. Ni una pantalla sin esto. */}
      <p className="mt-2 text-[11px] leading-snug text-[var(--color-tinta-tenue)] sin-recortar" data-papel="contrato">
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

/**
 * ⭐ B3 · "YA LLEGA": TRES CANALES, NO UNO.
 *
 *   1. LA PALABRA  ....... "YA LLEGA"      ← sobrevive a todo
 *   2. LA FORMA .......... anillo + latido ← sobrevive al gris y al daltonismo
 *   3. el color .......... (de apoyo)
 *
 * ⚠️ Y EL COLOR NO PUEDE SER EL ÚNICO. La línea 31 de Zaragoza es LITERALMENTE
 * del mismo rojo que una alerta (#D1221D). Si el estado fuera solo color, un
 * autobús de la 31 parecería urgente SIEMPRE. Por eso el estado va en la forma
 * y hay una prueba de escala de grises que lo demuestra apagando el color.
 */
function Llegada({
  l, seleccionado, onSeleccionar,
}: {
  l: LlegadaViva;
  seleccionado: boolean;
  onSeleccionar: (c: string | null) => void;
}) {
  const inminente = l.etaMinutos <= 1;
  const coche = String(l.coche);
  // `null` = Avanza anuncia una línea que nuestro GTFS no conoce.
  const suya = l.lineaId ? linea(l.lineaId) : null;
  const tonos = suya ? tonosDeChip(suya) : null;

  return (
    <button
      type="button"
      // ⭐ LA SINCRONÍA LISTA → MAPA. El mismo estado que resalta el marcador.
      onClick={() => onSeleccionar(seleccionado ? null : coche)}
      aria-pressed={seleccionado}
      className={`flex w-full flex-col gap-2 px-4 py-3.5 text-left ${seleccionado ? 'bg-[var(--color-fondo)]' : ''}`}
      data-papel="llegada"
      data-inminente={inminente ? 'si' : 'no'}
      data-coche={coche}
      data-seleccionado={seleccionado ? 'si' : 'no'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* ⭐ D1 · El color = IDENTIDAD. La inversión = CATEGORÍA (nocturna).
              Los tonos salen de `tonosDeChip`, el MISMO sitio que los calcula en
              el índice y en el itinerario. Si aquí se dedujeran otra vez, una N7
              podría salir de diurna en esta pantalla y de búho en la otra. */}
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold"
            style={
              tonos
                ? { backgroundColor: tonos.fondo, color: tonos.texto }
                : // Avanza anuncia una línea que el GTFS no tiene. Se pinta gris y
                  // SE ENSEÑA IGUAL: el autobús existe y va lleno de gente.
                  { backgroundColor: '#94a3b8', color: '#1e293b' }
            }
            data-papel="chip-linea"
            data-linea={l.linea ?? l.etiquetaCruda}
            data-buho={tonos?.buho ? 'si' : 'no'}
            aria-hidden="true"
          >
            {l.linea ?? l.etiquetaCruda}
          </span>
          {/* ⚠️ AQUÍ NO SE TRUNCA. Ellos ponen `truncate` y "Vía Hispanidad N.º 73
              / Nuestra Señora De Los Ángeles" se queda en "Vía Hispanid…". Un dato
              recortado es un dato que miente. Preferimos que la fila crezca. */}
          <p className="min-w-0 text-[15px] font-bold leading-snug sin-recortar" data-papel="destino">
            {l.destino}
          </p>
        </div>

        {/* ⭐ LOS MINUTOS. LO PRIMERO, LO MÁS GRANDE, ARRIBA A LA DERECHA. */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <p
            className={`text-[22px] font-black leading-none tabular-nums ${inminente ? 'es-inminente' : ''}`}
            data-papel="minutos"
          >
            {l.etaMinutos}
            <span className="ml-0.5 text-[13px] font-bold">min</span>
          </p>
          {/* ⚠️ EL TERCER CANAL: LA PALABRA. Ni el color ni el latido van solos.
              (La referencia la esconde con `motion-reduce:hidden` — es decir, a
              quien pide menos animación le quita TAMBIÉN el texto. Eso no se
              clona: es justo al revés de lo que hay que hacer.) */}
          {inminente && (
            <span className="text-[10px] font-black uppercase tracking-wide" data-papel="ya-llega">
              ya llega
            </span>
          )}
        </div>
      </div>

      <div className="pl-[52px]">
        <FichaVehiculo coche={coche} perfil={l.perfil} />
      </div>
    </button>
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
