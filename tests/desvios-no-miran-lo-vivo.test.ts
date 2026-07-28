/**
 * ⭐⭐ EL MOTOR DE DESVÍOS NO MIRA LO VIVO. Y ahora, por fin, hay un test que lo dice.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA TESIS QUE ESTO PROTEGE — y no es un capricho, es EL proyecto.
 *
 *  Un poste callado puede ser un desvío, pueden ser las cuatro de la mañana, o
 *  puede ser un poste que Avanza no tiene dado de alta. La API viva devuelve
 *  LO MISMO en los tres casos. **Deducir un desvío de un silencio es
 *  inventárselo.** Por eso `desvios.ts` compara dos rutas (la del GTFS y la que
 *  el operador ejecuta hoy) y NO toca el canal de llegadas vivas: si mirase lo
 *  vivo, la tentación de "ese poste lleva mudo toda la mañana → desvío" volvería,
 *  y con una pinta perfectamente razonable.
 *
 *  El comentario de `src/engine/desvios.ts` promete desde siempre que ESTE test
 *  existe. Durante toda la vida del proyecto NO existió: la garantía estaba
 *  protegida solo por la disciplina —"que se olvida", como dice el propio
 *  comentario—. Esto es la red que se creía tener.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ BFS Y NO UN REGEX DEL FICHERO. El comentario dice "lee este fichero",
 *    que solo cazaría el import DIRECTO. La cicatriz de este repo (los 1,9 MB de
 *    GTFS que se colaron al cliente por un import INDIRECTO — ver
 *    `nada-de-gtfs-en-el-cliente.test.ts`) enseña que el peligro está en el
 *    camino de dos saltos. Así que aquí se rastrea el grafo, no una línea.
 *
 * ⚠️ POR QUÉ LA DIANA ES PRECISA Y NO "TODO sources/". `desvios.ts` importa
 *    `sources/avanza/recorrido` LEGÍTIMAMENTE: es la ruta operativa de hoy
 *    (`get_stops_list`), justo lo que el diff necesita. El canal PROHIBIDO es el
 *    de las LLEGADAS vivas — `engine/llegadas.ts` y su fuente
 *    `sources/avanza/poste.ts` (+ `parse-poste.ts`)—. Una diana amplia daría
 *    falso rojo sobre `recorrido`, y un guardián que da falsos rojos enseña a no
 *    mirarlo: peor que no tenerlo.
 *
 * ⚠️ Se saltan los `import type`: desaparecen al compilar y no arrastran ni un
 *    byte de código vivo, así que no pueden colar una llegada en el diff. Es la
 *    misma decisión —y el mismo motivo— que en `nada-de-gtfs-en-el-cliente`.
 *
 * Maquinaria (`resolver`, `importaciones`, BFS) COPIADA de
 * `nada-de-gtfs-en-el-cliente.test.ts`, que ya la tiene probada. No se comparte
 * por import a propósito: duplicar un rastreador probado es menos malo que tocar
 * un guardián que funciona en un proyecto que cierra.
 *
 * (Ojo: `horas-malas.test.ts` también lee `desvios.ts`, pero para OTRA garantía
 *  —que no razone con el calendario—. No se solapa con esto: aquello mira el
 *  texto en busca de `festivo|getDay(`; esto rastrea el grafo de imports.)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(__dirname, '..');
const SRC = join(RAIZ, 'src');

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
 * desaparecen al compilar y no arrastran ni un byte de código vivo.
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
  return fuera;
}

const DESVIOS = join(SRC, 'engine/desvios.ts');

/**
 * EL CANAL VIVO PROHIBIDO. Las llegadas de un poste y su fuente. NO la ruta de
 * hoy (`recorrido.ts`), que es legítima. Si esta lista deja fuera algún módulo
 * del canal vivo, la diana no vigila: por eso el primer test comprueba que los
 * tres existen.
 */
const CANAL_VIVO = new Set([
  join(SRC, 'engine/llegadas.ts'),
  join(SRC, 'sources/avanza/poste.ts'),
  join(SRC, 'sources/avanza/parse-poste.ts'),
]);

/** Camino desde `entrada` hasta cualquier módulo del canal vivo, o `null` si no llega. */
function caminoAlCanalVivo(entrada: string): string[] | null {
  const vistos = new Set<string>();
  const cola: { f: string; camino: string[] }[] = [{ f: entrada, camino: [entrada] }];
  while (cola.length) {
    const { f, camino } = cola.shift()!;
    if (vistos.has(f)) continue;
    vistos.add(f);
    for (const spec of importaciones(f)) {
      const destino = resolver(f, spec);
      if (!destino) continue;
      if (CANAL_VIVO.has(destino)) return [...camino, destino];
      if (!vistos.has(destino)) cola.push({ f: destino, camino: [...camino, destino] });
    }
  }
  return null;
}

const rel = (p: string) => p.replace(RAIZ, '').replace(/\\/g, '/').replace(/^\//, '');

describe('⭐⭐ el motor de desvíos NO mira lo vivo', () => {
  it('los tres módulos del canal vivo existen (si no, la diana no vigilaría nada)', () => {
    // El «verde en vacío»: si la diana apunta a ficheros que no existen, el BFS
    // nunca encontraría camino y el test pasaría sin comprobar nada.
    for (const d of CANAL_VIVO) {
      expect(existsSync(d) && statSync(d).isFile(), `${rel(d)} no existe: la diana está mal`).toBe(true);
    }
  });

  it('⭐ src/engine/desvios.ts no alcanza el canal vivo por NINGÚN camino (ni indirecto)', () => {
    const camino = caminoAlCanalVivo(DESVIOS);
    expect(
      camino,
      camino
        ? `desvios.ts llega al canal de llegadas vivas — deduciría desvíos de silencios:\n     ${camino
            .map(rel)
            .join('\n  →  ')}`
        : '',
    ).toBeNull();
  });
});

describe('⛔ CONTRAPRUEBA · el rastreador SÍ ve el camino cuando existe', () => {
  it('un fichero que sí llega al canal vivo se detecta, y con su ruta', () => {
    // ⚠️ Sin esto, un `null` en el test de arriba podría significar "no hay
    //    camino" O "el rastreador está roto". La página de parada pinta las
    //    llegadas vivas: DEBE encontrarse el camino, o el instrumento miente.
    const camino = caminoAlCanalVivo(join(SRC, 'app/parada/[poste]/page.tsx'));
    expect(camino, 'el rastreador no encuentra un camino que EXISTE — daría falso verde').not.toBeNull();
    expect(CANAL_VIVO.has(camino![camino!.length - 1]), 'el camino no termina en el canal vivo').toBe(true);
  });
});
