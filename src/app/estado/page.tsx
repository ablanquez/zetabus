import { estadoIndice } from '@/engine/correspondencias';
import { lineas, paradas, validez } from '@/engine/topologia';
import { feedStatus, feedWarning, type FeedStatus } from '@/core';
import {
  construirModelo,
  formatearEdad,
  formatearMillar,
  modeloSeguro,
  FRESCURA_MAX_HORAS,
  type ModeloPanel,
  type Veredicto,
} from '@/engine/panel-estado';

/**
 * ⭐⭐ `/estado` — EL PANEL DE CONTROL PÚBLICO. Solo lectura. Responde UNA pregunta:
 * «¿me puedo fiar del dato que me enseña ZetaBus ahora mismo?».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  CÓMO LEE EL ESTADO (Lectura B). NO fetchea `/api/diag` por HTTP —la doc de
 *  Next lo desaconseja (`production-checklist`: «do not call Route Handlers from
 *  Server Components») y ninguna página de este repo lo hace—. Importa las MISMAS
 *  funciones del motor que `/api/diag` usa. Ventaja de fondo (Ley 2): los campos
 *  de infraestructura (`pid`, `cwd`, todo `cache`) ni se importan aquí, así que no
 *  pueden filtrarse a una web pública. La lista blanca es el conjunto de imports.
 *
 *  ⚠️ `force-dynamic` NO es decoración: el panel calcula «edad = ahora − generadoEn»
 *     y lee un fichero que cambia cada noche. Si Next lo horneara estático, el
 *     «hace X h» se congelaría en la hora del build y el panel MENTIRÍA sobre su
 *     propia frescura —el peor caso imaginable para un instrumento de salud—.
 *
 *  ⚠️ El veredicto (fresco/rancio/degradado/ilegible), el umbral y la lista blanca
 *     viven en `@/engine/panel-estado` (núcleo puro, con test). Aquí SOLO se pinta.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Estado del servicio',
  description: 'Si los datos que muestra ZetaBus están al día, y hasta cuándo son válidos los oficiales.',
};

/** Lee el motor y construye el modelo, con el cinturón de la Ley 3 alrededor. */
function leerModelo(): ModeloPanel {
  return modeloSeguro(() => {
    const estado = estadoIndice();
    const ahora = new Date();
    const fs = feedStatus(validez, ahora);
    return construirModelo(
      estado,
      { estado: fs.kind, endDate: validez.endDate, aviso: feedWarning(fs, validez) },
      { lineas: lineas().length, paradas: paradas().length },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  LA PRESENTACIÓN DE CADA VEREDICTO. La FORMA (borde + glifo + palabra) dice cuál
//  es; el color solo acompaña. Los cuatro se distinguen en escala de grises:
//    · al-dia         borde sólido fino     ●   «Datos al día»
//    · desactualizado borde DISCONTINUO     ◐   «Datos desactualizados»
//    · degradado      RIEL izquierdo grueso  ▨   «Servicio reducido»
//    · ilegible       borde PUNTEADO+cursiva ✕   «No podemos leer el estado»
// ─────────────────────────────────────────────────────────────────────────────

interface CaraVeredicto {
  readonly glifo: string;
  readonly titulo: string;
  readonly caja: string;
  readonly acento: string;
}

const CARA: Record<Veredicto, CaraVeredicto> = {
  'al-dia': {
    glifo: '●',
    titulo: 'Datos al día',
    caja: 'border border-[var(--color-borde)] bg-[var(--color-papel)]',
    acento: 'text-[var(--color-tinta)]',
  },
  desactualizado: {
    glifo: '◐',
    titulo: 'Datos desactualizados',
    caja: 'border-2 border-dashed border-[var(--color-aviso)] bg-[var(--color-aviso-fondo)]',
    acento: 'text-[var(--color-aviso)]',
  },
  degradado: {
    glifo: '▨',
    titulo: 'Servicio reducido',
    caja: 'border-2 border-l-8 border-solid border-[var(--color-aviso)] bg-[var(--color-aviso-fondo)]',
    acento: 'text-[var(--color-aviso)]',
  },
  ilegible: {
    glifo: '✕',
    titulo: 'No podemos leer el estado ahora mismo',
    caja: 'border-2 border-dotted border-[var(--color-alerta)] bg-[var(--color-papel)] italic',
    acento: 'text-[var(--color-alerta)]',
  },
};

/** La frase que responde a «¿me fío?», por veredicto. */
const RESUMEN: Record<Veredicto, string> = {
  'al-dia': 'Los recorridos y los desvíos que ves son los de hoy.',
  desactualizado: `La actualización automática nocturna puede haber fallado: los datos llevan más de ${FRESCURA_MAX_HORAS} h sin renovarse.`,
  degradado: 'Estamos mostrando los recorridos oficiales; los desvíos de hoy no están disponibles ahora mismo.',
  ilegible: 'No podemos comprobar el estado del servicio en este momento. Vuelve a intentarlo en un rato.',
};

/** Etiqueta corta de la vigencia del feed (palabra, no solo tono). */
const FEED_ETIQUETA: Record<FeedStatus['kind'], string> = {
  vigente: 'Vigentes',
  'caduca-pronto': 'Caducan pronto',
  'por-empezar': 'Aún no vigentes',
  CADUCADO: 'CADUCADOS',
};

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)] p-4">
      <h2 className="text-micro font-semibold uppercase tracking-wide text-[var(--color-tinta-tenue)]">{titulo}</h2>
      <div className="mt-2 flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

/** Una cifra grande con su rótulo debajo. Números con `tabular-nums`. */
function Cifra({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <span className="text-dato font-black tabular-nums text-[var(--color-tinta)]">{valor}</span>{' '}
      <span className="text-menor text-[var(--color-tinta-suave)] sin-recortar">{rotulo}</span>
    </div>
  );
}

export default function Estado() {
  const modelo = leerModelo();
  const cara = CARA[modelo.veredicto];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-titulo font-black text-[var(--color-tinta)]">Estado del servicio</h1>
        <p className="mt-1 text-menor text-[var(--color-tinta-suave)] sin-recortar">
          Si te puedes fiar del dato que ves ahora mismo. Se actualiza solo cada noche.
        </p>
      </div>

      {/* EL VEREDICTO. Palabra + forma primero; el color solo acompaña. */}
      <div className={`rounded-panel p-4 ${cara.caja}`} role="status" aria-live="polite">
        <p className={`flex items-baseline gap-2 text-seccion font-black ${cara.acento}`}>
          <span aria-hidden className="text-titulo leading-none">
            {cara.glifo}
          </span>
          <span className="sin-recortar">{cara.titulo}</span>
        </p>
        <p className="mt-2 text-cuerpo leading-relaxed text-[var(--color-tinta)] sin-recortar">
          {RESUMEN[modelo.veredicto]}
        </p>
        {(modelo.veredicto === 'al-dia' || modelo.veredicto === 'desactualizado') && (
          <p className="mt-1 text-menor text-[var(--color-tinta-suave)] sin-recortar">
            Índice de correspondencias, actualizado <strong>{formatearEdad(modelo.edadSegundos)}</strong>.
          </p>
        )}
      </div>

      {/* EL DETALLE. Solo lo que el motor da en este estado; nada se rellena. */}
      {modelo.veredicto === 'ilegible' ? null : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Barrido: solo cuando hubo índice (al-dia / desactualizado). */}
          {(modelo.veredicto === 'al-dia' || modelo.veredicto === 'desactualizado') && modelo.barrido && (
            <Tarjeta titulo="Último barrido nocturno">
              <Cifra
                valor={`${modelo.barrido.sentidosRespondidos} de ${modelo.barrido.sentidosEsperados}`}
                rotulo="sentidos consultados a Avanza"
              />
              {modelo.barrido.sentidosFallidos > 0 && (
                <p className="text-menor text-[var(--color-aviso)] sin-recortar">
                  {modelo.barrido.sentidosFallidos} sentido(s) sin respuesta esa noche.
                </p>
              )}
              {modelo.barrido.sentidosSospechosos > 0 && (
                <p className="text-menor text-[var(--color-aviso)] sin-recortar">
                  {modelo.barrido.sentidosSospechosos} con lectura dudosa (sus desvíos no se marcaron).
                </p>
              )}
              {modelo.barrido.sentidosFallidos === 0 && modelo.barrido.sentidosSospechosos === 0 && (
                <p className="text-menor text-[var(--color-tinta-suave)] sin-recortar">
                  Todos respondieron, sin lecturas dudosas.
                </p>
              )}
            </Tarjeta>
          )}

          {/* Feed: siempre disponible (va en el bundle). */}
          <Tarjeta titulo="Datos oficiales de recorrido">
            <div>
              <span className="text-seccion font-black text-[var(--color-tinta)]">{FEED_ETIQUETA[modelo.feed.estado]}</span>{' '}
              <span className="text-menor text-[var(--color-tinta-suave)] sin-recortar">
                hasta el {modelo.feed.endDate}
              </span>
            </div>
            {modelo.feed.aviso && (
              <p className="text-menor leading-relaxed text-[var(--color-aviso)] sin-recortar">{modelo.feed.aviso}</p>
            )}
          </Tarjeta>

          {/* Cobertura. En degradado solo hay líneas/paradas; el resto sale del barrido. */}
          <Tarjeta titulo="Cobertura">
            <Cifra valor={String(modelo.totales.lineas)} rotulo="líneas" />
            <Cifra valor={String(modelo.totales.paradas)} rotulo="paradas" />
          </Tarjeta>

          {(modelo.veredicto === 'al-dia' || modelo.veredicto === 'desactualizado') && modelo.barrido && (
            /* ⚠️ B-09 · SIN "de hoy" EN EL RÓTULO. Esta tarjeta se pinta también en
               `desactualizado`, cuando el índice lleva más de 26 h sin renovarse (hasta ~2 días
               si el barrido nocturno falló). Un título que prometiera "de hoy" mentiría JUSTO
               debajo del banner ámbar "Datos desactualizados". La frescura la dice el banner y el
               "actualizado hace X" de arriba; el rótulo solo nombra QUÉ es. Y NO se condiciona al
               aviso (era la otra vía): un título que no promete tiempo no puede desincronizarse. */
            <Tarjeta titulo="Desvíos y correspondencias">
              <Cifra valor={String(modelo.barrido.lineasDesviadas)} rotulo="líneas con desvío" />
              <Cifra valor={formatearMillar(modelo.barrido.incidencias)} rotulo="correspondencias" />
              {modelo.barrido.postesSinCoordenadas > 0 && (
                <p className="mt-1 text-menor text-[var(--color-tinta-suave)] sin-recortar">
                  {modelo.barrido.postesSinCoordenadas} paradas pendientes de ubicar en el mapa.
                </p>
              )}
            </Tarjeta>
          )}
        </div>
      )}

      <p className="text-nota leading-relaxed text-[var(--color-tinta-tenue)] sin-recortar">
        Este panel solo lee y muestra el estado; no acciona nada. Los recorridos oficiales salen del GTFS de Avanza
        Zaragoza; los desvíos de hoy, de un barrido nocturno automático.
      </p>
    </div>
  );
}
