/**
 * ⭐ ¿QUÉ PASO AGUANTA? LA MEDIDA, REPETIDA — Y ESTA VEZ CONTRA EL PEOR CASO.
 *
 *      npx tsx scripts/paso.ts
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ SE REPITE LA MEDIDA DE LA TANDA 3.
 *
 * Aquella salió: paso 4 → 11 de 11 autobuses → 100%. Y me la creí.
 *
 * Pero se hizo sobre UNA línea, a UNA hora, con los autobuses REPARTIDOS. Antonio,
 * que coge el bus, dice haber visto TRES SEGUIDOS EN DOS PARADAS. Y eso no es una
 * anécdota: es el caso que rompe el muestreo, y no lo probé.
 *
 * Es el mismo error que ya cometí con el oráculo de desvíos: validar contra los
 * casos que NO ponen a prueba el detector, ver un número redondo, y creérselo.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⭐ Y HAY UNA RAZÓN ESTRUCTURAL PARA QUE ANTONIO TENGA RAZÓN. LA REGLA DE LOS DOS.
 *
 * Avanza anuncia, en cada poste, COMO MUCHO LOS DOS SIGUIENTES autobuses de cada
 * línea y sentido. Ponte los autobuses de un sentido en fila, del más adelantado
 * al más atrasado: B1, B2, B3, B4…
 *
 *   · En un poste dado, se anuncian los DOS que lo tienen más cerca por detrás.
 *   · Luego B3 SOLO es visible en los postes que hay entre B3 y B1. Más allá de
 *     B1 ya no es de los dos siguientes de nadie: lo tapan B1 y B2.
 *
 *   ⇒ LA VENTANA DE VISIBILIDAD DE UN AUTOBÚS ESTÁ LIMITADA POR LO CERCA QUE
 *     TENGA AL QUE VA **DOS** POSICIONES POR DELANTE.
 *
 * Un autobús suelto tiene una ventana enorme y cualquier paso lo pilla. Tres
 * apelotonados en dos paradas dejan al tercero con una ventana de DOS POSTES.
 * Y un paso 4 se salta tres postes de cada cuatro.
 *
 * ⭐ DE AHÍ SALE LA REGLA QUE DE VERDAD IMPORTA, Y NO ES ESTADÍSTICA:
 *
 *     un tramo de N postes CONSECUTIVOS siempre contiene un múltiplo de N.
 *     ⇒ el paso p encuentra SIEMPRE a un autobús cuya ventana mida ≥ p postes.
 *     ⇒ el paso que aguanta = LA VENTANA MÁS ESTRECHA que se observe.
 *
 * Por eso este script no se queda en el "% de cobertura de hoy" (que depende de
 * la suerte del día): mide LA VENTANA DE CADA AUTOBÚS. Eso sí sobrevive a mañana.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ⚠️ UNA SOLA CAPTURA POR LÍNEA. Los pasos se calculan sobre ella.
 *
 * Barrer los 67 postes, luego barrer 18 con paso, y comparar, NO VALE: entre los
 * dos barridos pasan 20 segundos y LOS AUTOBUSES SE MUEVEN. La diferencia no
 * distinguiría "el paso se dejó un autobús" de "ese autobús ya no circulaba". El
 * instrumento estaría midiendo su propio retraso y llamándolo cobertura.
 *
 * Como la respuesta de cada poste es independiente de las demás, el subconjunto
 * {0, 4, 8…} de una captura completa es una RÉPLICA EXACTA del barrido con paso 4
 * en ese instante. Cero deriva. Y cero peticiones de más.
 * ═════════════════════════════════════════════════════════════════════════════
 */
import { canonLinea, idLinea, idParada, lineas, posteDe, sentidosDe } from '@/engine/topologia';
import { leerPoste } from '@/sources/avanza/poste';
import { contador, transporteReal } from '@/sources/avanza/transporte';
import { mkdirSync, writeFileSync } from 'node:fs';

/** Las elige Antonio, y NO al azar: las que más autobuses tienen y peor van. */
const LINEAS = (process.argv[2] ?? '35,33,32').split(',');
const PASOS = [1, 2, 3, 4, 5];

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Avistamiento {
  readonly coche: string;
  readonly destino: string;
  readonly eta: number;
}

/** Los índices consultados con un paso. EXACTAMENTE lo que hace `barrerLinea`. */
function muestreo(total: number, paso: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < total; i += paso) s.add(i);
  s.add(total - 1); // el último SIEMPRE, como en el motor
  return s;
}

/** Tramos de índices CONSECUTIVOS. `[3,4,5,9]` → `[[3,4,5],[9]]`. */
function tramos(indices: number[]): number[][] {
  const orden = [...indices].sort((a, b) => a - b);
  const out: number[][] = [];
  for (const i of orden) {
    const ultimo = out[out.length - 1];
    if (ultimo && i === ultimo[ultimo.length - 1] + 1) ultimo.push(i);
    else out.push([i]);
  }
  return out;
}

async function medirLinea(etiqueta: string) {
  const l = lineas().find((x) => x.shortName === etiqueta);
  if (!l) throw new Error(`no existe la línea ${etiqueta}`);
  const id = idLinea(String(l.id));
  const canon = canonLinea(l.shortName);

  // La unión de postes, en orden, tal cual la construye barrerLinea.
  const enOrden: number[] = [];
  const vistos = new Set<number>();
  /** poste → posición dentro de SU sentido (para medir pelotones en ruta). */
  const ordinalEnSentido = new Map<number, Map<number, number>>(); // dirId → (poste → ordinal)
  for (const s of sentidosDe(id)) {
    const m = new Map<number, number>();
    let n = 0;
    for (const sid of s.official.stops) {
      const p = posteDe(idParada(sid));
      if (p === null) continue;
      m.set(p, n++);
      if (!vistos.has(p)) { vistos.add(p); enOrden.push(p); }
    }
    ordinalEnSentido.set(s.directionId, m);
  }
  const cabecera = new Map<number, string>(sentidosDe(id).map((s) => [s.directionId as number, s.headsign]));

  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  LÍNEA ${l.shortName} · ${enOrden.length} postes (los DOS sentidos, unidos y sin repetir)`);
  console.log(`${'═'.repeat(78)}\n`);
  console.log(`  Pidiendo los ${enOrden.length} postes, UNA vez, a 4 peticiones/segundo…`);

  /** índice en enOrden → lo que ese poste anunció de ESTA línea. */
  const captura = new Map<number, Avistamiento[]>();
  const fallidos: number[] = [];
  const t0 = Date.now();

  for (let i = 0; i < enOrden.length; i++) {
    try {
      const r = await leerPoste(enOrden[i], transporteReal);
      captura.set(
        i,
        r.llegadas
          .filter((ll) => canonLinea(ll.lineaCruda) === canon)
          .map((ll) => ({ coche: ll.coche, destino: ll.destino, eta: ll.etaMinutos })),
      );
    } catch {
      fallidos.push(enOrden[i]);
    }
    await dormir(250);
  }

  const segundos = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`  → hecho en ${segundos} s · ${fallidos.length} postes sin respuesta` +
    `${fallidos.length ? ` (${fallidos.join(' ')})` : ''}\n`);

  // ── Los autobuses, y DÓNDE se les ve ──────────────────────────────────────
  /** coche → índices de enOrden donde aparece. */
  const donde = new Map<string, number[]>();
  const destinoDe = new Map<string, string>();
  for (const [i, avs] of captura) {
    for (const a of avs) {
      const arr = donde.get(a.coche) ?? [];
      arr.push(i);
      donde.set(a.coche, arr);
      destinoDe.set(a.coche, a.destino);
    }
  }

  const buses = [...donde.keys()];
  if (buses.length === 0) {
    console.log('  ⚠️ NO CIRCULA NI UN AUTOBÚS de esta línea ahora mismo. Esta línea NO MIDE NADA.\n');
    return { etiqueta, postes: enOrden.length, buses: 0, fallidos: fallidos.length, filas: [], ventanaMin: null, pelotones: [] };
  }

  console.log(`  AUTOBUSES DETECTADOS (captura completa): ${buses.length}\n`);

  // ── LA TABLA DEL PASO ─────────────────────────────────────────────────────
  console.log('     paso  peticiones  encontrados  perdidos  cobertura');
  console.log('     ────  ──────────  ───────────  ────────  ─────────');
  const filas: { paso: number; peticiones: number; hallados: number; pct: number; perdidos: string[] }[] = [];
  for (const paso of PASOS) {
    const idx = muestreo(enOrden.length, paso);
    const hallados = buses.filter((c) => donde.get(c)!.some((i) => idx.has(i)));
    const perdidos = buses.filter((c) => !hallados.includes(c));
    const pct = Math.round((100 * hallados.length) / buses.length);
    filas.push({ paso, peticiones: idx.size, hallados: hallados.length, pct, perdidos });
    console.log(
      `     ${String(paso).padStart(4)}  ${String(idx.size).padStart(10)}  ` +
        `${String(hallados.length).padStart(11)}  ${String(perdidos.length).padStart(8)}  ` +
        `${String(pct).padStart(8)}%${paso === 4 ? '  ← el de hoy' : ''}` +
        `${perdidos.length ? `   PIERDE: ${perdidos.join(' ')}` : ''}`,
    );
  }

  // ── ⭐ LA VENTANA DE CADA AUTOBÚS. El número que sobrevive a mañana. ───────
  console.log('\n  ⭐ VENTANA DE VISIBILIDAD (en cuántos postes CONSECUTIVOS se le ve):\n');
  console.log('     coche   destino                        postes   ventana   paso máx. que lo garantiza');
  console.log('     ─────   ────────────────────────────   ──────   ───────   ──────────────────────────');
  let ventanaMin = Infinity;
  let elEstrecho = '';
  const ordenados = buses.sort((a, b) => Math.min(...donde.get(a)!) - Math.min(...donde.get(b)!));
  for (const c of ordenados) {
    const idxs = donde.get(c)!;
    const mayor = Math.max(...tramos(idxs).map((t) => t.length));
    if (mayor < ventanaMin) { ventanaMin = mayor; elEstrecho = c; }
    console.log(
      `     ${c.padEnd(7)} ${(destinoDe.get(c) ?? '?').slice(0, 28).padEnd(30)} ` +
        `${String(idxs.length).padStart(6)}   ${String(mayor).padStart(7)}   ${String(mayor).padStart(3)}` +
        `${mayor < 4 ? '   ⚠️ EL PASO 4 SE LO PUEDE COMER' : ''}`,
    );
  }
  console.log(`\n     ⇒ VENTANA MÁS ESTRECHA: ${ventanaMin} postes (coche ${elEstrecho}).`);
  console.log(`       El paso ${ventanaMin} está GARANTIZADO hoy. El ${ventanaMin + 1} ya depende de dónde caiga.\n`);

  // ── ⭐ ¿HAY PELOTONES? Distancia EN POSTES entre autobuses consecutivos ────
  console.log('  ⭐ PELOTONES · distancia en postes entre autobuses consecutivos del MISMO sentido:\n');
  const pelotones: { sentido: string; a: string; b: string; postes: number }[] = [];
  for (const [dirId, mapa] of ordinalEnSentido) {
    const headsign = cabecera.get(dirId) ?? String(dirId);
    // La "posición" de un autobús ≈ el poste MÁS CERCANO que lo ve por delante.
    // ⚠️ EL SENTIDO DE CADA AUTOBÚS SE DEDUCE DE LOS DATOS, NO DEL RÓTULO.
    //    Mi primera versión comparaba el `destino` de Avanza con el `headsign`
    //    del GTFS por trozos de cadena. Eso es adivinar: son dos vocabularios
    //    distintos y bastaría una tilde para asignar mal un autobús entero.
    //    Se cuenta en cuántos postes DE CADA SENTIDO se le ve, y gana el mayor.
    const enEsteSentido = buses
      .map((c) => {
        const postesVistos = donde.get(c)!.map((i) => enOrden[i]);
        const míos = postesVistos.filter((p) => mapa.has(p));
        const ajenos = postesVistos.length - míos.length;
        if (míos.length === 0 || míos.length <= ajenos) return null; // no es de este sentido
        const ords = míos.map((p) => mapa.get(p)!);
        return { coche: c, cabeza: Math.min(...ords), n: ords.length };
      })
      .filter((x): x is { coche: string; cabeza: number; n: number } => x !== null)
      .sort((a, b) => a.cabeza - b.cabeza);

    console.log(`     sentido → ${headsign}: ${enEsteSentido.length} autobuses`);
    if (enEsteSentido.length < 2) { console.log('        (menos de dos: no hay distancia que medir)\n'); continue; }
    for (let i = 1; i < enEsteSentido.length; i++) {
      const a = enEsteSentido[i - 1];
      const b = enEsteSentido[i];
      const d = b.cabeza - a.cabeza;
      pelotones.push({ sentido: headsign, a: a.coche, b: b.coche, postes: d });
      console.log(
        `        ${a.coche} → ${b.coche}: ${String(d).padStart(2)} postes` +
          `${d <= 2 ? '   ⚠️⚠️ PELOTÓN' : d <= 4 ? '   ⚠️ juntos' : ''}`,
      );
    }
    console.log('');
  }

  return {
    etiqueta, postes: enOrden.length, buses: buses.length, fallidos: fallidos.length,
    filas, ventanaMin, pelotones,
  };
}

async function main() {
  const ahora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ZETABUS · ¿QUÉ PASO AGUANTA? · una sola captura por línea               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n  ${ahora} (hora de Zaragoza)`);
  console.log('  ⚠️ LA HORA IMPORTA: sin pelotones, esta medida no prueba nada.\n');

  const res = [];
  for (const e of LINEAS) res.push(await medirLinea(e));

  // ── EL RESUMEN. La peor de las tres MANDA. ────────────────────────────────
  console.log(`\n${'═'.repeat(78)}`);
  console.log('  EL RESUMEN — Y MANDA LA PEOR, NO LA MEDIA');
  console.log(`${'═'.repeat(78)}\n`);
  console.log('     línea  buses  ventana+estrecha   paso 2      paso 3      paso 4      paso 5');
  console.log('     ─────  ─────  ────────────────   ─────────   ─────────   ─────────   ─────────');
  for (const r of res) {
    if (!r.filas.length) { console.log(`     ${r.etiqueta.padEnd(6)} ${String(r.buses).padStart(5)}  (sin autobuses: no mide)`); continue; }
    const f = (p: number) => {
      const x = r.filas.find((y) => y.paso === p)!;
      return `${x.pct}% (${x.peticiones}p)`.padEnd(11);
    };
    console.log(
      `     ${r.etiqueta.padEnd(6)} ${String(r.buses).padStart(5)}  ${String(r.ventanaMin).padStart(11)}      ` +
        `${f(2)} ${f(3)} ${f(4)} ${f(5)}`,
    );
  }

  const conDatos = res.filter((r) => r.filas.length);
  if (conDatos.length) {
    const peorVentana = Math.min(...conDatos.map((r) => r.ventanaMin as number));
    const coste = (p: number) => conDatos.reduce((a, r) => a + (r.filas.find((f) => f.paso === p)?.peticiones ?? 0), 0);
    console.log(`\n  ⭐ VENTANA MÁS ESTRECHA DE LAS ${conDatos.length} LÍNEAS: ${peorVentana} postes.`);
    console.log(`     ⇒ EL PASO QUE AGUANTA EN LA PEOR ES ${peorVentana}.`);
    console.log(`\n  COSTE POR LÍNEA (media de estas ${conDatos.length}):`);
    for (const p of PASOS) console.log(`     paso ${p} → ${Math.round(coste(p) / conDatos.length)} peticiones por línea`);
    const apelotonados = conDatos.flatMap((r) => r.pelotones).filter((p) => p.postes <= 2);
    console.log(`\n  PELOTONES (dos autobuses a ≤2 postes): ${apelotonados.length}`);
    for (const p of apelotonados) console.log(`     ${p.a} y ${p.b} a ${p.postes} postes · ${p.sentido}`);
  }

  const c = contador.cuenta;
  console.log(`\n  LA CUENTA: ${c.peticiones} peticiones a Avanza · ${c.errores} errores · ` +
    `${c.timeouts} timeouts · ${c.peticiones ? Math.round(c.msAcumulados / c.peticiones) : 0} ms de media\n`);

  mkdirSync('capturas', { recursive: true });
  writeFileSync(
    'capturas/paso.json',
    JSON.stringify({ medidoEn: new Date().toISOString(), hora: ahora, lineas: res }, null, 2),
  );
  console.log('  (la captura queda en capturas/paso.json — ignorada por git)\n');
}

void main();
