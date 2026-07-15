'use client';

import { useEffect, useState } from 'react';

/**
 * ⭐⭐ LA PIEZA QUE HACE QUE LA GUÍA NO PUEDA MENTIR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  La guía de la referencia describe sus tokens en ARRAYS escritos a mano AL LADO
 *  del CSS. El día que el CSS cambia y el array no, la guía miente. Es la copia a
 *  mano aplicada a la propia guía.
 *
 *  Aquí NO hay array de valores. Este componente ENUMERA los custom properties del
 *  stylesheet REAL (el que Tailwind compila desde `@theme`) y LEE su valor
 *  resuelto con `getComputedStyle`. Si `--color-alerta` es `#b91c1c`, esta página
 *  lo dice porque lo LEE, no porque alguien lo tecleó. No puede quedarse vieja.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface TokenLeido {
  readonly nombre: string;
  readonly valor: string;
}

/**
 * Recorre TODAS las hojas de estilo del documento, encuentra los custom
 * properties cuyo nombre empieza por alguno de los prefijos, y devuelve su valor
 * COMPUTADO (el resuelto, no el declarado). Cero valores a mano.
 */
function recoger(
  reglas: CSSRuleList,
  prefijos: readonly string[],
  excluir: RegExp | null,
  nombres: Set<string>,
): void {
  for (const regla of Array.from(reglas)) {
    // ⚠️ Tailwind v4 mete el `:root` de los tokens DENTRO de un `@layer`. Una regla
    //    de agrupación (@layer, @media, @supports) lleva sus propias `cssRules`:
    //    hay que RECURRIR o los tokens de dentro no se ven. (Esto me costó un rojo:
    //    `--color-alerta` salía y `--color-tinta` no, según en qué capa cayera.)
    const anidadas = (regla as CSSGroupingRule).cssRules;
    if (anidadas && anidadas.length) recoger(anidadas, prefijos, excluir, nombres);

    const estilo = (regla as CSSStyleRule).style as CSSStyleDeclaration | undefined;
    if (!estilo) continue;
    for (let i = 0; i < estilo.length; i++) {
      const n = estilo[i];
      if (prefijos.some((p) => n.startsWith(p)) && !(excluir && excluir.test(n))) {
        nombres.add(n);
      }
    }
  }
}

function leerTokens(prefijos: readonly string[], excluir: RegExp | null = null): TokenLeido[] {
  const nombres = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      recoger(sheet.cssRules, prefijos, excluir, nombres); // tira si es de otro origen
    } catch {
      continue;
    }
  }
  const cs = getComputedStyle(document.documentElement);
  return [...nombres]
    .sort()
    .map((nombre) => ({ nombre, valor: cs.getPropertyValue(nombre).trim() }))
    .filter((t) => t.valor.length > 0);
}

/**
 * ⭐ LA PALETA VIVA. Un swatch por token de color. El fondo se pinta con `var()`
 * (el color REAL) y la etiqueta muestra el valor LEÍDO. Los dos, del mismo sitio.
 */
/**
 * ⚠️ Tailwind v4 vuelca SU paleta por defecto (`--color-amber-100`, `--color-red-500`…)
 * al `:root`. Eso es ruido: no son NUESTROS tokens. Los suyos acaban en un número
 * (`-\d+`) o son las cinco palabras clave; los nuestros (`--color-tinta`,
 * `--color-alerta`, `--color-sin-color`…) no. Se excluyen por patrón, así que un
 * token NUEVO nuestro aparece solo, sin tener que apuntarlo en ningún sitio.
 */
const SOLO_NUESTROS_COLORES = /(-\d+$)|^--color-(black|white|transparent|current|inherit)$/;
/** Igual con la tipografía: fuera los `--text-xs/sm/base/lg/xl/2xl…` de Tailwind. */
const SOLO_NUESTROS_TEXTOS = /--line-height$|^--text-(xs|sm|base|lg|\d?xl)$/;

export function PaletaViva() {
  const [tokens, setTokens] = useState<TokenLeido[] | null>(null);
  useEffect(() => {
    setTokens(leerTokens(['--color-'], SOLO_NUESTROS_COLORES));
  }, []);

  if (tokens === null) {
    return <p className="text-nota text-[var(--color-tinta-tenue)]">Leyendo los tokens del CSS…</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-papel="paleta-viva">
      {tokens.map((t) => (
        <div
          key={t.nombre}
          className="overflow-hidden rounded-xl border border-[var(--color-borde)]"
          data-papel="token-color"
          data-token={t.nombre}
          data-valor={t.valor}
        >
          {/* El bloque se pinta con el color REAL (var), no con el valor leído. */}
          <div className="h-12 w-full" style={{ background: `var(${t.nombre})` }} />
          <div className="bg-[var(--color-papel)] px-2 py-1.5">
            <p className="text-micro font-bold text-[var(--color-tinta)] sin-recortar">{t.nombre}</p>
            <p className="text-micro tabular-nums text-[var(--color-tinta-tenue)] sin-recortar">{t.valor}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const EJEMPLO = 'Bus 4848 llega en 3 min · poste 744 · línea 21';

/**
 * ⭐ LA ESCALA VIVA. Cada peldaño se pinta CON SU UTILIDAD (`text-titulo`…), así
 * que muestra el tamaño REAL, y a su lado el px LEÍDO del token. Si cambias el
 * token, cambian los dos.
 */
export function EscalaViva() {
  const [tokens, setTokens] = useState<TokenLeido[] | null>(null);
  useEffect(() => {
    // Solo NUESTROS tamaños (`--text-dato`…), sin los `--line-height` ni la escala
    // por defecto de Tailwind (`--text-sm`, `--text-2xl`…).
    setTokens(leerTokens(['--text-'], SOLO_NUESTROS_TEXTOS));
  }, []);

  if (tokens === null) {
    return <p className="text-nota text-[var(--color-tinta-tenue)]">Leyendo la escala del CSS…</p>;
  }

  return (
    <div className="flex flex-col gap-3" data-papel="escala-viva">
      {tokens.map((t) => {
        const clase = t.nombre.replace('--text-', 'text-'); // --text-dato → text-dato
        return (
          <div key={t.nombre} className="flex items-baseline gap-3 border-b border-[var(--color-borde)] pb-2">
            <code className="w-28 shrink-0 text-micro text-[var(--color-tinta-tenue)]">
              {clase}
              <span className="ml-1 tabular-nums">{t.valor}</span>
            </code>
            {/* La muestra usa la utilidad REAL: enseña el tamaño de verdad. */}
            <p className={`${clase} min-w-0 font-bold text-[var(--color-tinta)] sin-recortar`} data-papel="muestra-tipo">
              {EJEMPLO}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * ⭐ LA CONTRAPRUEBA DEL GRIS, EN VIVO. Un botón que pone la sección en escala de
 * grises. La regla del proyecto: el estado va en FORMA, no en tono — así que en
 * gris se sigue distinguiendo. Aquí se ve pulsando, no prometiendo.
 */
export function PruebaGris({ children }: { children: React.ReactNode }) {
  const [gris, setGris] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setGris((g) => !g)}
        className="mb-3 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 py-1.5 text-menor font-semibold"
        data-papel="toggle-gris"
        aria-pressed={gris}
      >
        {gris ? '● Volver al color' : '◐ Ver en escala de grises'}
      </button>
      <div style={{ filter: gris ? 'grayscale(1)' : 'none' }} data-papel="zona-gris" data-gris={gris ? 'si' : 'no'}>
        {children}
      </div>
    </div>
  );
}
