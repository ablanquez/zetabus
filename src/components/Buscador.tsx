'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

/**
 * EL BUSCADOR. Conocimiento pagado por la referencia, y se reutiliza.
 *
 * Lo que hicieron BIEN y no hay que redescubrir:
 *   · indexa PARADAS Y LÍNEAS JUNTAS, en una sola caja
 *   · el NÚMERO DE POSTE es la señal más fuerte (es lo que pone en la marquesina)
 *   · expande abreviaturas de callejero (Av → avenida, Pza → plaza…)
 *   · DOS TOQUES desde que abres hasta que ves tu autobús
 *
 * ⚠️ Lo que NO se copia: sus buscadores FALSOS. Tenían un `<input readOnly>` en
 * `/moverme` que el usuario tocaba, escribía... y no hacía nada. Y una ruta
 * `/buscar` a la que no enlazaba nadie. Un control que no funciona es peor que
 * no tenerlo: enseña a desconfiar de los que sí funcionan.
 *
 * ⚠️ Y LO QUE NO TIENEN Y ES EL CAMINO MÁS CORTO DE VERDAD: "cerca de mí".
 * `navigator.geolocation` NO SE USA NI UNA VEZ en todo su repositorio; su chip
 * "Cerca de mí" es un `<span aria-hidden>` decorativo, con el comentario
 * "placeholder visual, sin lógica real". Para alguien que está DE PIE EN LA
 * MARQUESINA, el camino correcto son CERO toques. NO ESTÁ HECHO AQUÍ TAMPOCO, y
 * queda anotado como el primer cabo de la Tanda 5.
 */

export interface Entrada {
  tipo: 'parada' | 'linea';
  clave: string;
  titulo: string;
  sub: string;
  color?: string;
  colorTexto?: string;
  href: string;
}

const ABREVIATURAS: [RegExp, string][] = [
  [/\bav(da?)?\.?\b/g, 'avenida'],
  [/\bc\/|\bcl\.?\b/g, 'calle'],
  [/\bpza?\.?\b|\bpl\.?\b/g, 'plaza'],
  [/\bp(º|so|seo)\.?\b/g, 'paseo'],
  [/\bctra\.?\b/g, 'carretera'],
  [/\bcno\.?\b|\bcmno\.?\b/g, 'camino'],
];

const normalizar = (s: string) => {
  let t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, con] of ABREVIATURAS) t = t.replace(re, con);
  return t.replace(/\s+/g, ' ').trim();
};

const MAX = 8;

export function Buscador({ entradas }: { entradas: Entrada[] }) {
  const [q, setQ] = useState('');

  const indice = useMemo(
    () => entradas.map((e) => ({ e, n: normalizar(`${e.titulo} ${e.sub} ${e.clave}`) })),
    [entradas],
  );

  const resultados = useMemo(() => {
    const nq = normalizar(q);
    // Un solo carácter vale si es un dígito: "5" es un poste o una línea.
    if (nq.length < 2 && !/^\d$/.test(nq)) return [];

    return indice
      .map(({ e, n }) => {
        // ⭐ EL NÚMERO DE POSTE MANDA. Es lo que la persona tiene delante,
        //    impreso en la marquesina. Si teclea "744", quiere el poste 744.
        let puntos = 99;
        if (e.clave === nq) puntos = 0;
        else if (e.clave.startsWith(nq)) puntos = 1;
        else if (n.startsWith(nq)) puntos = 3;
        else if (n.includes(nq)) puntos = 4;
        else if (nq.split(' ').every((t) => n.includes(t))) puntos = 6;
        return { e, puntos };
      })
      .filter((r) => r.puntos < 99)
      .sort((a, b) => a.puntos - b.puntos || a.e.titulo.length - b.e.titulo.length)
      .slice(0, MAX)
      .map((r) => r.e);
  }, [q, indice]);

  const buscando = q.trim().length > 0;

  return (
    <div>
      <label htmlFor="q" className="block text-menor font-bold text-[var(--color-tinta-suave)]">
        Busca tu parada o tu línea
      </label>
      <input
        id="q"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={q}
        onChange={(ev) => setQ(ev.target.value)}
        placeholder="744 · Plaza San Miguel · 35 · Ci3"
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-[var(--color-borde)] bg-[var(--color-papel)] px-4 text-seccion"
        /* 16px: por debajo de eso, iOS hace zoom al enfocar y descoloca la página. */
      />
      <p className="mt-1 text-nota text-[var(--color-tinta-tenue)] sin-recortar">
        El número del poste es el que está impreso en la marquesina.
      </p>

      {buscando && resultados.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-3 text-menor sin-recortar">
          No encontramos nada con «{q}».
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-borde)] bg-[var(--color-papel)]">
          {resultados.map((e, i) => (
            <li key={`${e.tipo}-${e.clave}`} className={i > 0 ? 'border-t border-[var(--color-borde)]' : ''}>
              <Link href={e.href} className="flex min-h-[56px] items-center gap-3 px-4 py-3">
                <span
                  className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-nota font-black"
                  style={
                    e.tipo === 'linea'
                      ? { backgroundColor: e.color, color: e.colorTexto }
                      : { backgroundColor: 'var(--color-fondo)', color: 'var(--color-tinta-tenue)' }
                  }
                  aria-hidden="true"
                >
                  {e.clave}
                </span>
                <span className="min-w-0">
                  {/* SIN TRUNCAR. Nunca. */}
                  <span className="block text-cuerpo font-semibold leading-snug sin-recortar">{e.titulo}</span>
                  <span className="block text-nota text-[var(--color-tinta-tenue)] sin-recortar">{e.sub}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
