/**
 * ⭐ RECABLEA LA SKILL web-design-guidelines AL SNAPSHOT LOCAL. Idempotente.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL PROBLEMA QUE RESUELVE. La skill vive en `.claude/skills/`, que está
 *  GITIGNOREADO (lista blanca, regla `/*`). O sea: al clonar el repo, la skill NO
 *  viaja. Y si alguien la reinstala desde el repo de Vercel, vuelve a hacer WebFetch
 *  a `main` —la fuente MÓVIL que congelamos a propósito—.
 *
 *  Lo que SÍ viaja es la RECETA: este script y el snapshot
 *  (`docs/web-interface-guidelines.SNAPSHOT.md`, una cita con su SHA y su fecha).
 *  Versionamos la receta, no el artefacto —igual que con el GTFS: guardamos la
 *  instrucción de descarga, no el feed—. Correr esto reconstruye el cableado local:
 *  deja un `SKILL.md` que LEE el snapshot en vez de descargar nada.
 *
 *  IDEMPOTENTE: correrlo dos veces no rompe nada. Si el cableado ya está bien, lo
 *  dice y no toca nada; si falta o difiere, lo (re)escribe.
 *
 *  Uso:  node scripts/setup-skill.mjs      (o `npm run skill:setup`)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = join(RAIZ, 'docs', 'web-interface-guidelines.SNAPSHOT.md');

// El SKILL.md cableado al snapshot. ESTE es el contenido canónico: si cambia el
// snapshot de sitio o hay que ajustar la instrucción, se toca AQUÍ y se re-corre.
const SKILL_MD = `---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the FROZEN guidelines from the local snapshot below (do NOT WebFetch)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the snapshot
4. Output findings in the terse \`file:line\` format

## Guidelines Source

⚠️ ZetaBus audits against a FROZEN copy, not the live repo, so every report is
reproducible and traceable to an exact commit. Read the local snapshot:

\`\`\`
docs/web-interface-guidelines.SNAPSHOT.md
\`\`\`

The snapshot's provenance header records the source URL, commit SHA and download
date. The rules and output format live in that file, below its header comment.

⛔ Do NOT WebFetch \`raw.githubusercontent.com/.../main/command.md\`: auditing
against a moving \`main\` destroys traceability. To update the rules, re-download,
record the new SHA in the snapshot header, and decide by hand — same discipline
as any other cited source (the GTFS, the fleet master).

## Usage

When a user provides a file or pattern argument:
1. Read the rules from \`docs/web-interface-guidelines.SNAPSHOT.md\`
2. Read the specified files
3. Apply all rules from the snapshot
4. Output findings using the format specified in the snapshot

If no files specified, ask the user which files to review.
`;

// El snapshot es la fuente que la skill lee: sin él, cablear no tiene sentido.
if (!existsSync(SNAPSHOT)) {
  console.error(`✗ Falta el snapshot: ${relative(RAIZ, SNAPSHOT)}`);
  console.error('  Es la fuente congelada que la skill lee. Sin él no hay nada que cablear.');
  process.exit(1);
}

// Se cablea `.claude/skills/` (lo que lee Claude Code). Si existe también la copia
// universal `.agents/skills/` (otros agentes), se refresca; NO se crea si no está.
const destinos = [
  { dir: join(RAIZ, '.claude', 'skills', 'web-design-guidelines'), crear: true },
  { dir: join(RAIZ, '.agents', 'skills', 'web-design-guidelines'), crear: false },
];

let tocados = 0;
for (const { dir, crear } of destinos) {
  const existeDir = existsSync(dir);
  if (!existeDir && !crear) continue; // .agents solo si ya lo puso el instalador universal
  const skill = join(dir, 'SKILL.md');
  const yaOk = existsSync(skill) && readFileSync(skill, 'utf8') === SKILL_MD;
  if (yaOk) {
    console.log(`✓ ya cableado: ${relative(RAIZ, skill)}`);
    continue;
  }
  if (!existeDir) mkdirSync(dir, { recursive: true });
  writeFileSync(skill, SKILL_MD);
  console.log(`→ (re)cableado: ${relative(RAIZ, skill)}`);
  tocados++;
}

console.log(
  tocados === 0
    ? '\n✓ Nada que hacer: la skill ya lee el snapshot congelado.'
    : `\n✓ Listo. La skill lee ${relative(RAIZ, SNAPSHOT)} (sin WebFetch).`,
);
