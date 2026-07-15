import type { Metadata } from 'next';
import { GRUPOS, grupoDe, lineas } from '@/engine/topologia';
import { ChipLinea, NOCHE } from '@/components/ChipLinea';
import { MARCAS } from '@/components/FichaVehiculo';
import { Marca } from '@/components/Marca';
import { PaletaViva, EscalaViva, PruebaGris } from '@/components/interno/TokensVivos';
import type { Confidence } from '@/core';

/**
 * ⭐⭐ LA GUÍA DE ESTILO VIVA. Y "VIVA" NO ES UN ADJETIVO: ES CÓMO ESTÁ HECHA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Una guía en un .md miente en cuanto el código cambia. Una guía que describe
 *  sus tokens en arrays (la de la referencia) miente en cuanto el array y el CSS
 *  divergen. Esta NO puede mentir, porque no describe NADA: LEE.
 *
 *    · los colores      ← se enumeran del stylesheet y se leen con getComputedStyle
 *    · la tipografía    ← cada peldaño se pinta con su utilidad real
 *    · las 44 líneas    ← <ChipLinea> de producción sobre lineas()
 *    · la procedencia   ← el mapa MARCAS, importado
 *    · los búhos        ← la const NOCHE, importada
 *    · la marca         ← el componente <Marca> de verdad
 *
 *  Si algo NO se puede leer de la fuente real, NO va en esta página. Y esa
 *  ausencia es una señal: significa que aún no es token.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ INTERNA. `noindex`, y NO enlazada desde la app pública. Es la mesa de
 *    trabajo del sistema visual, no una página para el usuario.
 */
export const metadata: Metadata = {
  title: 'Sistema visual · ZetaBus (interno)',
  robots: { index: false, follow: false },
};

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8" data-papel="seccion-guia">
      <h2 className="text-titulo font-black">{titulo}</h2>
      {nota && <p className="mt-1 mb-3 text-menor text-[var(--color-tinta-suave)] sin-recortar">{nota}</p>}
      {!nota && <div className="mb-3" />}
      {children}
    </section>
  );
}

export default function SistemaVisualPage() {
  const ordenConfianza: Confidence[] = ['oficial', 'fuente_secundaria', 'observacion_propia', 'sin_verificar'];

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <Marca />
        <span className="text-nota font-bold uppercase tracking-wide text-[var(--color-alerta)]">interno</span>
      </div>
      <h1 className="mt-2 text-titulo font-black">Sistema visual</h1>
      <p className="mt-1 text-menor text-[var(--color-tinta-suave)] sin-recortar">
        Esta página <strong>LEE</strong> los tokens del CSS y usa los componentes de producción. No
        describe nada al lado: si el token cambia, esto cambia. No puede quedarse vieja.
      </p>

      {/* ── COLORES ─────────────────────────────────────────────────────────── */}
      <Seccion
        titulo="Colores"
        nota="Enumerados del stylesheet y leídos con getComputedStyle. El bloque se pinta con var(); la etiqueta muestra el valor leído. Los dos, del mismo sitio."
      >
        <PaletaViva />
      </Seccion>

      {/* ── TIPOGRAFÍA ──────────────────────────────────────────────────────── */}
      <Seccion
        titulo="Tipografía · Inter"
        nota="Inter, self-hosted (next/font, sin CDN). 7 peldaños con nombre. Cada muestra usa su utilidad real (text-titulo…), así que enseña el tamaño de verdad; el px sale leído del token."
      >
        <EscalaViva />
      </Seccion>

      {/* ── LÍNEAS ──────────────────────────────────────────────────────────── */}
      <Seccion
        titulo={`Las ${lineas().length} líneas`}
        nota="El color es IDENTIDAD (lo impone el operador, sale del GTFS). El número se pinta con el color que MÁS CONTRASTE da (D1): se calcula, no se elige a mano. Chips reales de <ChipLinea>."
      >
        <div className="flex flex-col gap-4">
          {GRUPOS.map((g) => {
            const ls = lineas().filter((l) => grupoDe(l) === g.clave);
            if (ls.length === 0) return null;
            return (
              <div key={g.clave} data-papel="grupo-lineas" data-grupo={g.clave}>
                <p className="mb-1.5 text-nota font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                  {g.titulo} · <span className="font-normal normal-case">{g.nota}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ls.map((l) => (
                    <ChipLinea key={String(l.id)} linea={l} papel="chip-guia" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-nota text-[var(--color-tinta-suave)] sin-recortar">
          Los <strong>búhos</strong> se invierten sobre azul noche{' '}
          <code className="rounded bg-[var(--color-fondo)] px-1" data-papel="valor-noche">
            {NOCHE}
          </code>{' '}
          (la categoría va en la INVERSIÓN, no en un color: no gasta identidad). Valor importado de la
          const NOCHE, no tecleado.
        </p>
      </Seccion>

      {/* ── PROCEDENCIA ─────────────────────────────────────────────────────── */}
      <Seccion
        titulo="Procedencia del dato"
        nota="Cuatro niveles, cuatro marcas. Del mapa MARCAS, importado. La señal va en FORMA + símbolo, nunca solo en tono."
      >
        <ul className="flex flex-col gap-2" data-papel="niveles-procedencia">
          {ordenConfianza.map((c) => {
            const m = MARCAS[c];
            return (
              <li key={c} className="flex items-baseline gap-3" data-papel="nivel" data-confianza={c}>
                <span className="w-6 shrink-0 text-center text-menor font-black text-[var(--color-tinta-suave)]">
                  {m?.simbolo ?? '—'}
                </span>
                <span className="text-menor text-[var(--color-tinta)] sin-recortar">
                  <code className="text-nota text-[var(--color-tinta-tenue)]">{c}</code>
                  {' · '}
                  {m ? m.lectura : 'El pliego municipal. Es la NORMA: no se marca.'}
                </span>
              </li>
            );
          })}
        </ul>
      </Seccion>

      {/* ── ESTADOS (con la contraprueba del gris) ──────────────────────────── */}
      <Seccion
        titulo="Estados"
        nota="El estado va en FORMA + palabra, NUNCA solo en tono. Prueba: ponlo en gris; si el estado desaparece, estaba en el color."
      >
        <PruebaGris>
          <div className="flex flex-col gap-3" data-papel="muestras-estado">
            <p className="text-cuerpo">
              Llega ya:{' '}
              <span className="es-inminente text-dato font-black tabular-nums">2 min</span>{' '}
              <span className="ml-1 text-nota font-black uppercase tracking-wide text-[var(--color-alerta)]">
                ya llega
              </span>
            </p>
            <div className="es-rancio rounded-xl border-2 border-[var(--color-borde)] bg-[var(--color-papel)] px-3 py-2">
              <p className="text-menor">Rancio — el dato es viejo, y lo decimos (trama + borde + edad).</p>
            </div>
            <div className="es-sin-verificar px-3 py-2">
              <p className="text-menor not-italic">Sin verificar — borde punteado + la palabra.</p>
            </div>
            <div className="es-sin-datos px-3 py-2">
              <p className="text-menor">Sin datos — no lo sabemos, y se dice.</p>
            </div>
          </div>
        </PruebaGris>
      </Seccion>

      {/* ── MARCA ───────────────────────────────────────────────────────────── */}
      <Seccion
        titulo="Marca"
        nota="Hoy un wordmark de texto con su token de color. El hueco del logo (Fase 5) está reservado en el componente <Marca>: se cambia una pieza."
      >
        <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-papel)] p-4">
          <Marca />
        </div>
      </Seccion>

      {/* ── REGLAS Y EXCEPCIONES ────────────────────────────────────────────── */}
      <Seccion titulo="Reglas y excepciones">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-menor text-[var(--color-tinta-suave)]">
          <li>El estado NO va en el tono (22 de 44 líneas caen en rojo/ámbar/verde). Forma + palabra.</li>
          <li>
            El texto NUNCA se recorta con puntos suspensivos: si no cabe, baja de línea. La interfaz no
            usa ninguna utilidad de recorte de CSS, y un test lo vigila.
          </li>
          <li>El color del texto de un chip SE CALCULA del contraste (D1), no se elige a mano.</li>
          <li>
            <code>global-error.tsx</code> usa hex crudos a propósito: se renderiza SIN el layout ni el
            CSS de tokens. Es la única excepción, y está documentada.
          </li>
          <li>
            El latido (<code>--dur-latido</code>) y el zoom del mapa (<code>ZOOM_SUELO/TECHO</code>) son
            COMPORTAMIENTO, no estilo: tienen nombre pero NO salen aquí. Los toca quien entiende la regla.
          </li>
        </ul>
      </Seccion>
    </div>
  );
}
