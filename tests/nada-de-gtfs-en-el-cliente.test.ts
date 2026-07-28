/**
 * ⭐⭐ NINGÚN COMPONENTE DE CLIENTE PUEDE ALCANZAR EL GTFS HORNEADO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA CICATRIZ, MEDIDA CON `next build`:
 *
 *      /parada/[poste]        2.431 KB crudo · 546 KB gzip   ⛔
 *      todas las demás rutas   ~515 KB crudo · ~148 KB gzip
 *
 *  La diferencia era UN chunk de 1.900 KB que resultó ser, literalmente,
 *  `JSON.parse('{"generatedAt":…,"stops":[…]}')`: **el artefacto del GTFS
 *  entero**, descargado por cualquiera que abriera una parada.
 *
 *  ¿Por culpa de qué? De dos líneas de aspecto perfectamente inocente:
 *
 *      LlegadasVivas.tsx:7   import { linea } from '@/engine/topologia';
 *      MapaParada.tsx:9      import { linea } from '@/engine/topologia';
 *
 *  Y de una tercera, indirecta: `ChipLinea` pedía `esBuho` al mismo sitio.
 *  `topologia.ts` importa `@/generated`, así que **importar cualquier cosa de
 *  ahí se lleva 1,9 MB**. Lo que se hacía con ellos: dos llamadas, para sacar el
 *  color de un chip — un dato que la propia `LlegadaViva` ya traía dentro.
 *
 *  ⚠️ Y ÉSA ES LA LECCIÓN: **un coste que solo existe después de compilar no lo
 *     encuentra ninguna revisión de código.** Nada en `import { linea }` dice
 *     «esto son 1,9 megas». Solo se ve mirando dentro de los chunks.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR ESO ESTE TEST NO MIRA EL BUNDLE: mira **el grafo de importaciones**, que
 *    es donde está la causa y se puede comprobar sin compilar. Parte de cada
 *    fichero con `'use client'` y sigue sus importaciones internas hasta el final.
 *    Si alguna alcanza `@/generated`, lo dice **con el camino completo**, que es
 *    lo que hace falta para arreglarlo (el fichero culpable rara vez es el que
 *    escribió el import).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..');
const SRC = join(RAIZ, 'src');

/** Todos los `.ts`/`.tsx` de `src/`. */
function ficheros(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) ficheros(p, acc);
    else if (/\.tsx?$/.test(e)) acc.push(p);
  }
  return acc;
}

/** Resuelve un especificador a un fichero real. `null` si es un paquete de fuera. */
function resolver(desde: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(desde), spec);
  else return null; // node_modules: no es asunto nuestro
  for (const cand of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'), base]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

/**
 * Importaciones de un fichero. ⚠️ Se saltan las de SOLO TIPO (`import type …`):
 * desaparecen al compilar y no arrastran ni un byte. Contarlas daría falsos rojos
 * y acabaría con alguien apagando el test.
 */
function importaciones(fichero: string): string[] {
  const src = readFileSync(fichero, 'utf8');
  const fuera: string[] = [];
  const re = /(?:^|\n)\s*(?:import|export)\s+([^;]*?)\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const clausula = m[1];
    if (/^type\s/.test(clausula.trim())) continue; // `import type X from …`
    // `import { type A, type B } from …` — todas de tipo → tampoco cuenta.
    const llaves = clausula.match(/\{([^}]*)\}/);
    if (llaves && !/(?:^|,)\s*(?!type\s)[A-Za-z_$*]/.test(llaves[1])) continue;
    fuera.push(m[2]);
  }
  // ⚠️ IMPORTS DE EFECTO LATERAL: `import '@/generated';` — sin `from` ni binding.
  //    El regex de arriba EXIGE `from`, así que éstos se le escapaban: un `import '@/x'`
  //    ejecuta el módulo entero y arrastra su grafo (y su peso) igual que un import con
  //    nombre. NO puede ser de solo-tipo (esa sintaxis no existe), así que no se filtra.
  const reLado = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(reLado)) fuera.push(m[1]);
  return fuera;
}

/** Camino desde `entrada` hasta `@/generated`, o `null` si no llega. */
function caminoAlArtefacto(entrada: string): string[] | null {
  const vistos = new Set<string>();
  const cola: { f: string; camino: string[] }[] = [{ f: entrada, camino: [entrada] }];
  while (cola.length) {
    const { f, camino } = cola.shift()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    for (const spec of importaciones(f)) {
      if (spec === '@/generated' || spec.startsWith('@/generated/')) {
        return [...camino, spec];
      }
      const destino = resolver(f, spec);
      if (destino && !vistos.has(destino)) cola.push({ f: destino, camino: [...camino, destino] });
    }
  }
  return null;
}

const rel = (p: string) => p.replace(RAIZ, '').replace(/\\/g, '/').replace(/^\//, '');

const CLIENTES = ficheros(SRC).filter((f) => /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8')));

describe('⭐ el GTFS horneado NO llega al navegador', () => {
  it('el instrumento encuentra los componentes de cliente (si no, no prueba nada)', () => {
    // ⚠️ Sin esto, el día que alguien mueva los componentes este fichero pasaría
    //    con CERO comprobaciones y en verde. Es el «verde en vacío» de la Tanda 7.
    expect(CLIENTES.length, 'no se ha encontrado ni un componente con "use client"')
      .toBeGreaterThanOrEqual(5);
  });

  it.each(CLIENTES.map((f) => [rel(f), f] as const))(
    '⭐ %s no alcanza `@/generated` por ningún camino',
    (nombre, fichero) => {
      const camino = caminoAlArtefacto(fichero);
      expect(
        camino,
        camino
          ? `${nombre} arrastra el GTFS (1,9 MB) al navegador:\n     ${camino.map(rel).join('\n  →  ')}`
          : '',
      ).toBeNull();
    },
  );
});

describe('⛔ CONTRAPRUEBA · el instrumento SÍ ve el camino cuando lo hay', () => {
  it('una ruta de servidor que sí usa el artefacto se detecta, y con su camino', () => {
    // `/sobre-los-datos` importa `@/generated` a propósito: es una página de
    // servidor y ahí no cuesta nada. Sirve de testigo de que el rastreador anda.
    const camino = caminoAlArtefacto(join(SRC, 'app/sobre-los-datos/page.tsx'));
    expect(camino, 'el rastreador no encuentra un camino que EXISTE').not.toBeNull();
    expect(camino![camino!.length - 1]).toBe('@/generated');
  });

  it('⭐ y lo encuentra también cuando es INDIRECTO — que es como estaba', () => {
    // El camino real del fallo no era directo: LlegadasVivas → ChipLinea →
    // topologia → @/generated. Si el rastreador solo mirase el primer salto,
    // habría dado verde sobre el fallo. Se comprueba con la cadena de verdad.
    const camino = caminoAlArtefacto(join(SRC, 'engine/topologia.ts'));
    expect(camino).not.toBeNull();
    expect(camino!.length, 'el camino tiene que tener al menos un salto').toBeGreaterThan(1);
  });
});
