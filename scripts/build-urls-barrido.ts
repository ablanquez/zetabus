/** Genera la lista COMPLETA de URLs de la Capa 1. Se escribe a e2e/lib/urls-barrido.json */
import { lineas, paradas, sentidosDe, idLinea, posteDe } from '@/engine/topologia';
import { writeFileSync, mkdirSync } from 'node:fs';

type Url = { url: string; tipo: 'linea' | 'parada' | 'especial'; que: string };
const out: Url[] = [];

// ── Las 44 líneas × sus 74 sentidos ──────────────────────────────────────────
// ⚠️ fingir=desviada: el transporte fingido intercepta TODA petición → CERO a Avanza,
//    y además da el layout más rico (desvío + parada provisional).
let sentidos = 0;
for (const l of lineas()) {
  for (const s of sentidosDe(idLinea(String(l.id)))) {
    sentidos++;
    out.push({
      url: `/linea/${encodeURIComponent(l.shortName)}?sentido=${s.directionId}&fingir=desviada`,
      tipo: 'linea',
      que: `${l.shortName}/${s.directionId}`,
    });
  }
}

// ── Las paradas ──────────────────────────────────────────────────────────────
// ⚠️ fingir=solo-oficiales: llegadas falsas deterministas, CERO peticiones a Avanza.
let sinPoste = 0;
for (const p of paradas()) {
  const poste = posteDe(p.id);
  if (poste === null) { sinPoste++; continue; }
  out.push({ url: `/parada/${poste}?fingir=solo-oficiales`, tipo: 'parada', que: `poste ${poste}` });
}

// ── Las especiales ───────────────────────────────────────────────────────────
for (const [url, que] of [
  ['/', 'home'],
  ['/sobre-los-datos', 'sobre-los-datos'],
  ['/interno/sistema-visual', 'guia'],
  ['/esta-ruta-no-existe-jamas', '404'],
] as const) {
  out.push({ url, tipo: 'especial', que });
}

mkdirSync('e2e/lib', { recursive: true });
writeFileSync('e2e/lib/urls-barrido.json', JSON.stringify(out, null, 0));

console.log(`sentidos de línea : ${sentidos}`);
console.log(`paradas con poste : ${out.filter((o) => o.tipo === 'parada').length}  (sin poste, fuera: ${sinPoste})`);
console.log(`especiales        : ${out.filter((o) => o.tipo === 'especial').length}`);
console.log(`TOTAL URLs        : ${out.length}   → ×2 anchos = ${out.length * 2} cargas`);
