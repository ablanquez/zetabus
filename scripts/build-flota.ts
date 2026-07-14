/**
 * EL MAESTRO DE FLOTA SE REGENERA. NO SE PARCHEA. (L3)
 *
 *     npm run flota:build
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⭐⭐ TANDA 9 · LA PROCEDENCIA BAJA AL CAMPO.
 *
 * Este fichero ya NO mete vehículos. **Mete AFIRMACIONES**: "la fuente X dice que
 * el campo Y del coche Z vale V". Y luego, campo a campo, gana la fuente más alta.
 *
 * Yo defendí lo contrario —un vehículo, una fuente— con este argumento: *"mezclar
 * procedencias produce fichas Frankenstein de las que ya no se puede decir «esto
 * viene de aquí»"*. **Y perdí, con razón**: el sistema estaba obligando a Antonio
 * a CALLARSE que el 4114 mide 12 metros, porque una web de aficionados no lo
 * publica. Eso es **dejar de informar por pureza de diseño**.
 *
 * Mi objeción no se descarta: **se convierte en el requisito.** Que de cada campo
 * se pueda decir de dónde viene. Eso no es Frankenstein: es trazabilidad.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LAS CUATRO FUENTES, en orden de mando (y el orden se aplica CAMPO A CAMPO):
 *
 *   1. `oficial`            data/fuentes/anexo5-2025.json        ← el pliego MANDA
 *   2. `fuente_secundaria`  data/fuentes/busesmadrid-2026-…json
 *   3. `observacion_propia` data/flota-observada.json            ← Antonio
 *   4. `sin_verificar`      data/referencia/flota-anterior.json
 *
 * ⚠️ **EL SILENCIO DE UNA FUENTE NO GANA A UN DATO DE OTRA.** Si el pliego calla
 *    la longitud y Antonio la sabe, **manda Antonio**. Ese es el punto de todo esto.
 *
 * ⚠️ Y SI DOS FUENTES SE CONTRADICEN: gana la más alta, **pero SE GRITA**. Un
 *    desacuerdo entre el papel y los ojos ES UN DATO, no un conflicto que quitar de
 *    en medio. Ya nos pasó con Avenida Valencia.
 *
 * ⭐ EL CONTADOR DE CONTROL ES INDEPENDIENTE DEL RECORRIDO (L1). El Anexo 5 ya
 *   mordió una vez: el parser devolvió 349 de 350 EN SILENCIO por un carácter
 *   invisible del PDF.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HOY = '2026-07-14';
const SALIDA = 'data/flota-avanza-zaragoza.json';
const leer = (p: string) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));

type Confianza = 'oficial' | 'fuente_secundaria' | 'observacion_propia' | 'sin_verificar';
const ORDEN: Confianza[] = ['oficial', 'fuente_secundaria', 'observacion_propia', 'sin_verificar'];

const CAMPOS = [
  'matricula', 'fechaMatriculacion', 'fabricante', 'modelo', 'longitudM', 'clase', 'propulsion',
] as const;
type Campo = (typeof CAMPOS)[number];
/** Los que la pantalla enseña. Solo estos deciden la marca de la ficha. */
const SE_ENSEÑAN: Campo[] = ['clase', 'longitudM', 'propulsion'];

interface Procedencia {
  fuente: string;
  confidence: Confianza;
  quien?: string;
  fecha?: string;
  comoLoSupe?: string;
}
interface Afirmacion {
  coche: number;
  campo: Campo;
  valor: string | number | null;
  proc: Procedencia;
}

class DescuadreError extends Error {
  constructor(fuente: string, declarado: number, leido: number) {
    super(
      `⛔ ${fuente}: declara ${declarado} vehículos y he leído ${leido}.\n` +
        '   Un extractor que no cuadra con su propia fuente MIENTE CON CONFIANZA. Ver docs/LECCIONES.md · L1.',
    );
    this.name = 'DescuadreError';
  }
}
function cuadrar(fuente: string, declarado: number, leido: number): void {
  if (declarado !== leido) throw new DescuadreError(fuente, declarado, leido);
  console.log(`  ✅ ${fuente.padEnd(34)} declara ${String(declarado).padStart(3)} · leídos ${String(leido).padStart(3)}`);
}

// ═══ 1 · SE RECOGEN TODAS LAS AFIRMACIONES, DE TODAS LAS FUENTES ═════════════
const afirmaciones: Afirmacion[] = [];
const afirmar = (coche: number, datos: Record<string, unknown>, proc: Procedencia) => {
  for (const campo of CAMPOS) {
    const valor = datos[campo];
    // ⛔ `undefined` y `null` NO son afirmaciones: son SILENCIO. Y el silencio de
    //    una fuente no le gana a nadie. Es literalmente la razón de esta tanda.
    if (valor === undefined || valor === null || valor === '') continue;
    afirmaciones.push({ coche, campo, valor: valor as string | number, proc });
  }
};

console.log('\n── FUENTES ─────────────────────────────────────────────────');

// ── (1) EL ANEXO 5. Documento municipal firmado. ────────────────────────────
const a5 = leer('data/fuentes/anexo5-2025.json');
cuadrar('anexo5-2025', a5._meta.vehiculos, a5.vehiculos.length);
for (const v of a5.vehiculos) {
  afirmar(v.coche, v, { fuente: a5._meta.id, confidence: 'oficial' });
}

// ── (2) BUSESMADRID. Especializada, citable, ⚠️ NO OFICIAL. ─────────────────
//    NO trae fecha de matriculación, NI longitud, NI potencia. Ese silencio es lo
//    que ahora puede rellenar Antonio — y solo Antonio, y solo diciendo quién es.
const bm = leer('data/fuentes/busesmadrid-2026-07-14.json');
cuadrar('busesmadrid-2026-07-14', bm._meta.vehiculos, bm.vehiculos.length);
for (const v of bm.vehiculos) {
  afirmar(v.coche, {
    matricula: v.matricula,
    fabricante: v.fabricante,
    modelo: v.carroceria,
    propulsion: v.propulsion,
    clase: v.articulado ? 'articulado' : 'sencillo',
    longitudM: null, // ⛔ LA FUENTE NO LA PUBLICA. Y no se deduce del modelo.
  }, { fuente: bm._meta.id, confidence: 'fuente_secundaria' });
}

// ── (3) LA OBSERVACIÓN PROPIA. Una persona, con nombre y fecha. ─────────────
const ob = leer('data/flota-observada.json');
cuadrar('flota-observada · vehículos', ob._meta.vehiculos, ob.vehiculos.length);

/** ⛔ SIN AUTOR, SIN FECHA Y SIN "CÓMO LO SUPE" NO ENTRA. Reventamos. */
const exigirCustodia = (v: Record<string, unknown>, donde: string) => {
  if (!v.observadoPor || !v.fechaObservacion || !v.comoLoSupe) {
    throw new Error(
      `⛔ ${donde} no dice QUIÉN lo vio, CUÁNDO, ni CÓMO lo sabe.\n` +
        '   Una afirmación editorial sin autor y sin fecha es exactamente el JSON heredado otra vez.',
    );
  }
  return {
    quien: String(v.observadoPor),
    fecha: String(v.fechaObservacion),
    comoLoSupe: String(v.comoLoSupe),
  };
};

for (const v of ob.vehiculos) {
  const c = exigirCustodia(v, `El coche ${v.coche} de data/flota-observada.json`);
  afirmar(v.coche, v, { fuente: 'observacion-propia', confidence: 'observacion_propia', ...c });
}

/**
 * ⭐ LAS SERIES OBSERVADAS. Antonio no afirma coche a coche: afirma **una serie**.
 *
 *     "La 41XX son eCitaro sencillos de 12 m; la 43XX, eCitaro G de 18 m.
 *      Lo sé porque los uso, no porque lo deduzca de un catálogo."
 *
 * ⚠️ Y ESTO ES LO QUE ROMPIÓ EL FICHERO HEREDADO — afirmar la longitud desde el
 *    modelo—, así que hay que decir con precisión por qué aquí sí vale:
 *
 *    El heredado lo DEDUJO DE UN CATÁLOGO, y un catálogo no determina la longitud:
 *    un VOLVO 7905 existe en 12 m Y en 18 m con el mismo nombre. Erró 62 de 316.
 *    Antonio **se sube**. El fuelle de un articulado se ve. Es OBSERVACIÓN.
 *
 * ⚠️ Y AUN ASÍ: la regla de serie SOLO se aplica al fabricante y modelo exactos que
 *    ella misma declara. Un Irisbus con número 43XX **no la toca**. La serie no es
 *    el número: es el número Y el modelo.
 */
const porSerie: { coche: number; campo: Campo }[] = [];
for (const s of ob.seriesObservadas ?? []) {
  const c = exigirCustodia(s, `La serie ${s.prefijo}XX de data/flota-observada.json`);
  const proc: Procedencia = { fuente: 'observacion-propia', confidence: 'observacion_propia', ...c };

  // ⚠️ ¿A qué coches alcanza? A los que YA existen en otra fuente con ESE modelo.
  //    No se inventan vehículos: se completan campos de vehículos que ya constan.
  const alcanza = new Set(
    afirmaciones
      .filter((a) => a.campo === 'modelo' && String(a.valor) === s.modelo)
      .filter((a) => String(a.coche).startsWith(s.prefijo))
      .map((a) => a.coche),
  );
  for (const coche of alcanza) {
    for (const campo of ['longitudM', 'clase'] as Campo[]) {
      if (s[campo] === undefined || s[campo] === null) continue;
      afirmaciones.push({ coche, campo, valor: s[campo], proc });
      porSerie.push({ coche, campo });
    }
  }
  console.log(`  ✅ serie ${s.prefijo}XX «${s.modelo}»`.padEnd(37) + ` alcanza ${String(alcanza.size).padStart(3)} coches`);
}

// ── (4) LO QUE NO CUBRE NADIE. ──────────────────────────────────────────────
const anterior = leer('data/referencia/flota-anterior.json');
cuadrar('huérfanos del heredado', anterior._meta.vehiculos, anterior.vehiculos.length);
for (const v of anterior.vehiculos) {
  afirmar(v.coche, v, { fuente: 'json-heredado-sin-verificar', confidence: 'sin_verificar' });
}

// ═══ 2 · SE RESUELVE. CAMPO A CAMPO. ════════════════════════════════════════
interface Discrepancia {
  coche: number;
  campo: string;
  manda: { valor: unknown; fuente: string; confianza: string };
  cede: { valor: unknown; fuente: string; confianza: string; quien?: string };
}
const discrepancias: Discrepancia[] = [];
const redundantes: { coche: number; campo: string }[] = [];

const ganador = new Map<string, Afirmacion>(); // "coche|campo" → la que manda
for (const a of afirmaciones) {
  const k = `${a.coche}|${a.campo}`;
  const ya = ganador.get(k);
  if (!ya) { ganador.set(k, a); continue; }

  const rangoYa = ORDEN.indexOf(ya.proc.confidence);
  const rangoA = ORDEN.indexOf(a.proc.confidence);
  const [manda, cede] = rangoYa <= rangoA ? [ya, a] : [a, ya];
  ganador.set(k, manda);

  // ⚠️ "VOLVO" y "Volvo" NO son un desacuerdo: son la misma marca escrita por dos
  //    personas distintas. Un detector que grita por eso enseña a ignorar el
  //    detector — y entonces el día que haya una discrepancia DE VERDAD, nadie la
  //    va a leer. Se compara el CONTENIDO, no la tipografía.
  const mismo = (a: unknown, b: unknown) =>
    typeof a === 'string' && typeof b === 'string'
      ? a.trim().toLowerCase() === b.trim().toLowerCase()
      : a === b;

  if (mismo(manda.valor, cede.valor)) {
    // Dicen LO MISMO. Si el que cede es una observación, ya sobra: una fuente
    // publicada lo ha alcanzado. Antonio puede borrar esa línea.
    if (cede.proc.confidence === 'observacion_propia' && manda.proc.confidence !== 'observacion_propia') {
      redundantes.push({ coche: a.coche, campo: a.campo });
    }
    continue;
  }
  // ⚠️ SE CONTRADICEN. Gana la más alta —eso no se discute— PERO NO EN SILENCIO.
  discrepancias.push({
    coche: a.coche,
    campo: a.campo,
    manda: { valor: manda.valor, fuente: manda.proc.fuente, confianza: manda.proc.confidence },
    cede: { valor: cede.valor, fuente: cede.proc.fuente, confianza: cede.proc.confidence, quien: cede.proc.quien },
  });
}

// ═══ 3 · SE MONTAN LOS VEHÍCULOS ════════════════════════════════════════════
const coches = [...new Set(afirmaciones.map((a) => a.coche))].sort((a, b) => a - b);
const vehiculos = coches.map((coche) => {
  const campos: Record<string, { valor: unknown; procedencia: Procedencia }> = {};
  const plano: Record<string, unknown> = {};
  for (const campo of CAMPOS) {
    const g = ganador.get(`${coche}|${campo}`);
    plano[campo] = g ? g.valor : null;
    if (g) campos[campo] = { valor: g.valor, procedencia: g.proc };
  }

  // ⭐⭐ LA CONFIANZA DE LA FICHA = LA DEL CAMPO MÁS DÉBIL QUE SE ENSEÑA.
  //    Un solo campo observado ⇒ la ficha entera lleva el †. NO SE BLANQUEA.
  let confianza: Confianza = 'oficial';
  for (const campo of SE_ENSEÑAN) {
    const c = campos[campo]?.procedencia.confidence;
    if (c && ORDEN.indexOf(c) > ORDEN.indexOf(confianza)) confianza = c;
  }
  return { coche, ...plano, confianza, campos } as {
    coche: number; confianza: Confianza; campos: typeof campos;
    matricula: string | null; longitudM: number | null;
  } & Record<string, unknown>;
});

// ═══ 4 · EL CONTROL (L1) ════════════════════════════════════════════════════
console.log('\n── CONTROL (L1) ────────────────────────────────────────────');
const declarado = a5._meta.vehiculos + bm._meta.vehiculos + ob._meta.vehiculos + anterior._meta.vehiculos;
const unicos = new Set<number>();
for (const f of [a5, bm, ob, anterior]) for (const v of f.vehiculos) unicos.add(v.coche);
if (unicos.size !== vehiculos.length) throw new DescuadreError('MAESTRO', unicos.size, vehiculos.length);
console.log(`  ✅ ${declarado} filas leídas en 4 fuentes → ${unicos.size} coches únicos → ${vehiculos.length} escritos`);

// ⚠️ Y UN SEGUNDO CONTADOR, QUE MIRA OTRA COSA: que ningún campo se haya quedado
//    sin procedencia. Un valor sin padre es el pecado que llevamos 9 tandas cazando.
const huerfanos = vehiculos.filter((v) =>
  CAMPOS.some((c) => (v as Record<string, unknown>)[c] !== null && !(v.campos as Record<string, unknown>)[c]),
);
if (huerfanos.length) {
  throw new Error(`⛔ ${huerfanos.length} vehículos tienen un valor SIN PROCEDENCIA: ${huerfanos.map((v) => v.coche).join(' ')}`);
}
console.log(`  ✅ ${[...ganador.keys()].length} campos escritos · TODOS con procedencia`);

// ── LAS DOS COSAS QUE SE DICEN EN VOZ ALTA ─────────────────────────────────
if (redundantes.length) {
  console.log('\n── ✅ YA SOBRAN EN `data/flota-observada.json` ─────────────');
  console.log('  Una fuente publicada los afirma YA, y dice LO MISMO.');
  for (const r of redundantes) console.log(`     coche ${r.coche} · campo ${r.campo}`);
}
if (discrepancias.length) {
  console.log('\n' + '█'.repeat(62));
  console.log('⛔⛔  DISCREPANCIA ENTRE FUENTES');
  console.log('█'.repeat(62));
  console.log('  Manda la más alta —eso no se discute—, PERO ESTO NO SE RESUELVE');
  console.log('  EN SILENCIO. Un desacuerdo entre el papel y los ojos ES UN DATO:');
  console.log('  o el documento va con retraso, o alguien miró mal.');
  console.log('  Queda escrito en `_meta.discrepancias` del maestro.\n');
  for (const d of discrepancias) {
    console.log(`  🚌 coche ${d.coche} · campo "${d.campo}"`);
    console.log(`      ✅ MANDA   ${String(d.manda.valor).padEnd(12)} ← ${d.manda.confianza} (${d.manda.fuente})`);
    console.log(`      ⛔ CEDE    ${String(d.cede.valor).padEnd(12)} ← ${d.cede.confianza}${d.cede.quien ? ` (${d.cede.quien})` : ''}`);
  }
  console.log('\n  ⚠️ MÍRALO. Si el documento está desactualizado, hay que decirlo.');
  console.log('     Si la observación estaba mal, hay que corregirla.\n' + '█'.repeat(62));
}

// ═══ 5 · SE ESCRIBE ═════════════════════════════════════════════════════════
const porConfianza = (c: string) => vehiculos.filter((v) => v.confianza === c).length;
const camposDe = (c: Confianza) =>
  [...ganador.values()].filter((a) => a.proc.confidence === c).length;

writeFileSync(SALIDA, JSON.stringify({
  _meta: {
    nombre: 'Maestro de flota · Avanza Zaragoza',
    generado: HOY,
    generadoPor: 'scripts/build-flota.ts — ⛔ NO EDITAR A MANO. Se regenera, no se parchea.',
    advertencia: 'NO derivar la longitud del nombre del modelo. Un VOLVO 7905 existe en 12 m Y en 18 m. Ese error costó 62 vehículos mal clasificados en el fichero heredado.',
    procedenciaPorCampo: '⭐ CADA CAMPO dice de dónde viene, en `campos`. La `confianza` del vehículo NO es su fuente: es la del CAMPO MÁS DÉBIL QUE LA PANTALLA ENSEÑA (clase, longitud, propulsión). Una ficha con un solo dato observado NO se blanquea por tener el resto del pliego.',
    niveles: {
      oficial: 'Anexo 5 del pliego municipal. Documento firmado por el Ayuntamiento.',
      fuente_secundaria: 'busesmadrid.es. Sitio especializado y citable, ⚠️ PERO NO OFICIAL.',
      observacion_propia: 'Visto en servicio por una persona, con nombre y fecha. NO es citable. Su cadena de custodia es el git blame.',
      sin_verificar: 'Sin ninguna procedencia. No consta en ninguna fuente.',
    },
    fuentes: [
      { id: a5._meta.id, confianza: 'oficial', documento: a5._meta.documento, organo: a5._meta.organo, url: a5._meta.url, fechaConsulta: a5._meta.fechaConsulta, vehiculos: porConfianza('oficial'), campos: camposDe('oficial'), salvedad: a5._meta.salvedad },
      { id: bm._meta.id, confianza: 'fuente_secundaria', documento: bm._meta.documento, autor: bm._meta.autor, url: bm._meta.url, fechaConsulta: bm._meta.fechaConsulta, vehiculos: porConfianza('fuente_secundaria'), campos: camposDe('fuente_secundaria'), salvedad: bm._meta.salvedad },
      { id: 'observacion-propia', confianza: 'observacion_propia', documento: ob._meta.documento, autor: ob._meta.autor, url: null, vehiculos: porConfianza('observacion_propia'), campos: camposDe('observacion_propia'), salvedad: ob._meta.reglaDeOro },
      { id: 'json-heredado-sin-verificar', confianza: 'sin_verificar', documento: 'autobuses-avanza-zaragoza.json (proyecto 00 ZGZ RADAR)', url: null, vehiculos: porConfianza('sin_verificar'), campos: camposDe('sin_verificar'), salvedad: 'Procedencia desconocida. Lo que ninguna otra fuente cubre.' },
    ],
    reglaDeUso: 'Si un coche no figura en este fichero, la interfaz muestra SIN DATOS. Nunca un valor por defecto.',
    discrepancias,
    yaSobranEnLaObservacion: redundantes,
  },
  vehiculos,
}, null, 1) + '\n', 'utf8');

console.log('\n── MAESTRO · vehículos por la marca que sale en pantalla ────');
for (const c of ORDEN) console.log(`  ${c.padEnd(20)} ${String(porConfianza(c)).padStart(3)}`);
console.log(`  ${'TOTAL'.padEnd(20)} ${String(vehiculos.length).padStart(3)}   → ${SALIDA}`);
console.log('\n── …y CAMPOS por procedencia (que es lo que ahora se puede decir) ──');
for (const c of ORDEN) console.log(`  ${c.padEnd(20)} ${String(camposDe(c)).padStart(4)} campos`);
console.log(`\n  con matrícula: ${vehiculos.filter((v) => v.matricula).length}/${vehiculos.length}`);
console.log(`  con longitud:  ${vehiculos.filter((v) => v.longitudM).length}/${vehiculos.length}`);
console.log(`  ⭐ longitudes que aporta la OBSERVACIÓN DE SERIE: ${porSerie.filter((p) => p.campo === 'longitudM').length}`);
