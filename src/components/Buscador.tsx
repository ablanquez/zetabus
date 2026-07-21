'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AcuseDeToque } from './AcuseDeToque';
import { Cita } from './Cita';
import { buscar, indexar, type Entrada } from '@/engine/busqueda';

export type { Entrada };

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

export function Buscador({ entradas }: { entradas: Entrada[] }) {
  const [q, setQ] = useState('');

  // ⭐ El índice y la búsqueda viven en `engine/busqueda` (puro, con tests). Aquí
  //    solo queda la caja y el pintado. Ver ahí el porqué de los alias y el orden.
  const indice = useMemo(() => indexar(entradas), [entradas]);
  const resultados = useMemo(() => buscar(indice, q), [q, indice]);

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
        className="mt-1 min-h-[var(--control-fuerte)] w-full rounded-tarjeta border-2 border-[var(--color-borde)] bg-[var(--color-papel)] px-4 text-seccion"
        /* 16px: por debajo de eso, iOS hace zoom al enfocar y descoloca la página. */
      />
      <p className="mt-1 text-nota text-[var(--color-tinta-tenue)] sin-recortar">
        El número del poste es el que está impreso en la marquesina.
      </p>

      {buscando && resultados.length === 0 && (
        <p className="mt-4 rounded-tarjeta border border-dashed border-[var(--color-borde)] bg-[var(--color-papel)] p-3 text-menor sin-recortar">
          No encontramos nada con «{q}».
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
          {resultados.map((e, i) => (
            <li key={`${e.tipo}-${e.clave}`} className={i > 0 ? 'border-t border-[var(--color-borde)]' : ''}>
              <Link
                href={e.href}
                data-acusa="si"
                className="flex min-h-[var(--control-fila)] items-center gap-3 px-4 py-3"
              >
                {/* Se queda marcado tras soltar, hasta que carga el destino. */}
                <AcuseDeToque />
                <span
                  className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-caja px-1.5 text-nota font-black"
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
                  {/* SIN TRUNCAR. Nunca. El título es CITA (nombre de parada o de
                      línea, del GTFS) → <Cita>: el traductor no lo reescribe. El `sub`
                      ("línea 35" / "poste 744") es NUESTRO rótulo + un número. */}
                  <span className="block text-cuerpo font-semibold leading-snug sin-recortar">
                    <Cita>{e.titulo}</Cita>
                  </span>
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
