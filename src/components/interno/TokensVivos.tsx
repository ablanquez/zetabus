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
          className="overflow-hidden rounded-tarjeta border border-[var(--color-borde)]"
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

  // ⚠️ DE MAYOR A MENOR, y el orden se DERIVA del px leído — no de una lista a mano
  //    ni del alfabeto. Alfabético (cuerpo, dato, menor, micro…) no se lee como
  //    escala: parece un glosario. Una escala se lee cuando está ordenada.
  const porTamano = [...tokens].sort((a, b) => Number.parseFloat(b.valor) - Number.parseFloat(a.valor));

  return (
    <div className="flex flex-col gap-3" data-papel="escala-viva">
      {porTamano.map((t) => {
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

/** Fuera los radios por defecto de Tailwind (`--radius-md/lg/xl…`); quedan los nuestros. */
const SOLO_NUESTROS_RADIOS = /^--radius-(xs|sm|md|lg|\d?xl)$/;

/**
 * ⭐ LOS RADIOS, LEÍDOS. Cada caja se dibuja CON su radio real (`var(--radius-…)`)
 * y muestra el valor leído. El sistema 6/8/12/16 que estaba disperso, a la vista.
 */
export function RadiosVivos() {
  const [tokens, setTokens] = useState<TokenLeido[] | null>(null);
  useEffect(() => {
    setTokens(leerTokens(['--radius-'], SOLO_NUESTROS_RADIOS));
  }, []);

  if (tokens === null) {
    return <p className="text-nota text-[var(--color-tinta-tenue)]">Leyendo los radios del CSS…</p>;
  }

  return (
    <div className="flex flex-wrap gap-4" data-papel="radios-vivos">
      {tokens.map((t) => (
        <div key={t.nombre} data-papel="token-radio" data-token={t.nombre} data-valor={t.valor}>
          <div
            className="h-16 w-16 border-2 border-[var(--color-tinta)] bg-[var(--color-fondo)]"
            style={{ borderRadius: `var(${t.nombre})` }}
          />
          <p className="mt-1 text-micro font-bold text-[var(--color-tinta)]">
            {t.nombre.replace('--radius-', 'rounded-')}
          </p>
          <p className="text-micro tabular-nums text-[var(--color-tinta-tenue)]">{t.valor}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * ⭐ LAS ALTURAS DE CONTROL, LEÍDAS. Cada barra tiene la altura REAL del token.
 * Son los objetivos táctiles (24 mín WCAG, 44 cómodo, 48 principal, 56 fila).
 */
export function ControlVivo() {
  const [tokens, setTokens] = useState<TokenLeido[] | null>(null);
  useEffect(() => {
    setTokens(leerTokens(['--control']));
  }, []);

  if (tokens === null) {
    return <p className="text-nota text-[var(--color-tinta-tenue)]">Leyendo las alturas del CSS…</p>;
  }

  return (
    <div className="flex flex-col gap-2" data-papel="control-vivo">
      {tokens.map((t) => (
        <div key={t.nombre} className="flex items-center gap-3" data-papel="token-control" data-token={t.nombre} data-valor={t.valor}>
          <code className="w-40 shrink-0 text-micro text-[var(--color-tinta-tenue)]">
            {t.nombre} <span className="tabular-nums">{t.valor}</span>
          </code>
          {/* La barra tiene la altura REAL del token. */}
          <div
            className="rounded-caja border border-[var(--color-borde)] bg-[var(--color-fondo)]"
            style={{ height: `var(${t.nombre})`, width: 120 }}
          />
        </div>
      ))}
    </div>
  );
}

/** rgb(a) → luminancia relativa WCAG. Se LEE del computed style, no se teclea. */
function luminancia(css: string): number | null {
  const m = css.match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((n) => Number(n) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contraste(a: string, b: string): number | null {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Dos niveles y solo dos: los que el sistema usa de verdad. No se inventan cuatro. */
const NIVELES = [
  { token: '--color-fondo', papel: 'Fondo de página', uso: 'el lienzo. Nunca lleva contenido directo.' },
  { token: '--color-papel', papel: 'Tarjeta / panel', uso: 'todo lo que agrupa contenido se levanta a este nivel.' },
] as const;

/**
 * ⭐ LA ESCALA DE SUPERFICIES, APILADA Y MEDIDA.
 *
 * Las muestras van UNA DENTRO DE OTRA, que es como se usan de verdad: así se ve el
 * salto real entre niveles en vez de dos cuadrados sueltos que no se comparan.
 *
 * ⚠️ Y SE MIDE EL SALTO, que es la regla de la guía maestra: «cada nivel se
 * distingue del de al lado SIN NECESIDAD DE UN BORDE». Si el contraste medido no da,
 * la página lo DICE en vez de esconderlo. Declarar el techo es parte del sistema.
 */
export function SuperficiesVivas() {
  const [datos, setDatos] = useState<{ valores: string[]; salto: number | null; borde: string } | null>(null);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const valores = NIVELES.map((n) => cs.getPropertyValue(n.token).trim());
    const borde = cs.getPropertyValue('--color-borde').trim();
    // El salto se calcula sobre el color RESUELTO por el navegador, no sobre el hex.
    const pintado = (v: string) => {
      const d = document.createElement('div');
      d.style.color = v;
      document.body.appendChild(d);
      const rgb = getComputedStyle(d).color;
      d.remove();
      return rgb;
    };
    setDatos({ valores, salto: contraste(pintado(valores[0]), pintado(valores[1])), borde });
  }, []);

  if (datos === null) {
    return <p className="text-nota text-[var(--color-tinta-tenue)]">Leyendo las superficies del CSS…</p>;
  }

  const seDistinguenSolos = datos.salto !== null && datos.salto >= 1.2;

  return (
    <div data-papel="superficies-vivas" data-salto={datos.salto?.toFixed(3) ?? '?'}>
      {/* APILADAS: el nivel 2 va DENTRO del nivel 1, como en la app. */}
      <div className="rounded-panel p-4" style={{ background: `var(${NIVELES[0].token})` }} data-papel="nivel-superficie" data-nivel="0">
        <p className="text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
          {NIVELES[0].papel} · <code className="normal-case">{NIVELES[0].token}</code>{' '}
          <span className="tabular-nums">{datos.valores[0]}</span>
        </p>
        <p className="mt-0.5 text-nota text-[var(--color-tinta-suave)] sin-recortar">{NIVELES[0].uso}</p>

        <div
          className="mt-3 rounded-tarjeta border border-[var(--color-borde)] p-3"
          style={{ background: `var(${NIVELES[1].token})` }}
          data-papel="nivel-superficie"
          data-nivel="1"
        >
          <p className="text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
            {NIVELES[1].papel} · <code className="normal-case">{NIVELES[1].token}</code>{' '}
            <span className="tabular-nums">{datos.valores[1]}</span>
          </p>
          <p className="mt-0.5 text-nota text-[var(--color-tinta-suave)] sin-recortar">{NIVELES[1].uso}</p>
        </div>
      </div>

      <p className="mt-3 text-menor text-[var(--color-tinta-suave)] sin-recortar">
        <strong>Dos niveles, y solo dos.</strong> El sistema no tiene una escala de cuatro
        superficies: tiene lienzo y tarjeta. Nombrar los que hay, no inventar los que no.
      </p>
      <p className="mt-2 text-menor text-[var(--color-tinta-suave)] sin-recortar" data-papel="veredicto-superficies">
        {seDistinguenSolos ? (
          <>
            ✅ El salto entre los dos niveles es de{' '}
            <strong className="tabular-nums">{datos.salto?.toFixed(2)}:1</strong>: se distinguen{' '}
            <strong>sin necesidad de borde</strong>.
          </>
        ) : (
          <>
            ⚠️ <strong>EL TECHO DEL SISTEMA, DICHO EN VOZ ALTA.</strong> El salto entre los dos niveles
            es de <strong className="tabular-nums">{datos.salto?.toFixed(2)}:1</strong> — prácticamente
            nada. La regla dice que cada nivel debería distinguirse del de al lado{' '}
            <strong>sin necesidad de un borde</strong>, y aquí <strong>no se cumple</strong>: lo que
            separa una tarjeta del fondo es el <code>{datos.borde}</code> de{' '}
            <code>--color-borde</code>, no la superficie. Consecuencia real: apilar muchas tarjetas
            iguales aplana la página, porque todas pesan lo mismo. Se dice, no se esconde.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * ⭐ EL RITMO VERTICAL QUE SE USA DE VERDAD.
 *
 * No hay token `--space-*`: el sistema es el de Tailwind, y estaba latente en los
 * `gap-*`/`p-*` del código. Aquí se NOMBRA lo que se usa (contado sobre el propio
 * código), y cada barra se dibuja con su utilidad REAL y se MIDE en píxeles.
 */
const RITMO = [
  { clase: 'h-0.5', papel: 'Apretado', uso: 'entre dos líneas de la misma idea' },
  { clase: 'h-1', papel: 'Mínimo', uso: 'etiqueta y su valor' },
  { clase: 'h-1.5', papel: 'Corto', uso: 'chips, listas densas' },
  { clase: 'h-2', papel: 'Base', uso: 'el peldaño por defecto entre elementos' },
  { clase: 'h-3', papel: 'Interno', uso: 'dentro de una tarjeta, entre bloques' },
  { clase: 'h-4', papel: 'Tarjeta', uso: 'el padding de una tarjeta (p-4)' },
  { clase: 'h-6', papel: 'Sección', uso: 'entre secciones de una página' },
] as const;

export function EspaciadoVivo() {
  const [medidas, setMedidas] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    const out: Record<string, number> = {};
    for (const r of RITMO) {
      const d = document.createElement('div');
      d.className = r.clase;
      d.style.width = '1px';
      document.body.appendChild(d);
      out[r.clase] = Math.round(d.getBoundingClientRect().height * 100) / 100;
      d.remove();
    }
    setMedidas(out);
  }, []);

  if (medidas === null) {
    return <p className="text-nota text-[var(--color-tinta-tenue)]">Midiendo el ritmo…</p>;
  }

  return (
    <div className="flex flex-col gap-2" data-papel="espaciado-vivo">
      {RITMO.map((r) => (
        <div key={r.clase} className="flex items-center gap-3" data-papel="peldano-espacio" data-clase={r.clase} data-px={medidas[r.clase]}>
          <code className="w-24 shrink-0 text-micro text-[var(--color-tinta-tenue)]">
            {r.clase} <span className="tabular-nums">{medidas[r.clase]}px</span>
          </code>
          {/* La barra tiene la altura REAL de la utilidad: se mide, no se describe. */}
          <div className={`${r.clase} w-16 shrink-0 rounded-caja bg-[var(--color-tinta-tenue)]`} />
          <p className="min-w-0 text-nota text-[var(--color-tinta-suave)] sin-recortar">
            <strong>{r.papel}</strong> · {r.uso}
          </p>
        </div>
      ))}
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
        className="mb-3 rounded-caja border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3 py-1.5 text-menor font-semibold"
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
