/**
 * EL MODELO ESTÁNDAR DEL BLOQUE DE SALIDAS. Un solo modelo para los 65 sentidos
 * con tabla, sin modos ni casos especiales. Spec: `docs/MODELO-BLOQUE-SALIDAS.md`,
 * verificada contra `docs/DATOS_CRUDOS_SALIDAS_RED_COMPLETA.md` (44 líneas, 20/07/26).
 *
 * El problema: la tabla de Avanza usa TRES columnas (hora · desde · hasta) para
 * transportar una CONSTANTE. Medido: en el 71 % de la red (46 de 65 sentidos) el
 * par origen→destino no cambia nunca. Aquí se saca ese par a la cabecera y las
 * horas van en flujo; solo las salidas que se APARTAN del par llevan una marca.
 *
 * ⚠️ TODO SALE DEL DATO, NADA DE LISTAS FIJAS. El par mayoritario, las marcas y el
 * desempate se CALCULAN de las salidas que llegan. Ninguna línea está codificada a
 * mano: si Avanza cambia mañana, el modelo se ajusta solo (y por eso las tres
 * erratas de etiqueta de la spec —Ci3→Ci2, 42→41, la lista de "3 pares"— no
 * afectan al render: no las lee de ahí, las recuenta).
 *
 * ⚠️ EL ORDEN CRONOLÓGICO NO SE TOCA. Se respeta el que da Avanza (que ya trae las
 * salidas de después de medianoche al final, no a las 00:00). Reordenar rompería
 * la única pregunta útil: "¿cuál es la siguiente?".
 */

import type { HorarioWeb, SalidaWeb } from '@/sources/avanza/horario';

export interface SalidaMarcada {
  readonly hora: string;
  /** Letra de marca (`a`, `b`, …) si la salida se aparta del par de cabecera; si no, `null`. */
  readonly marca: string | null;
}

export interface NotaSalidas {
  readonly marca: string;
  /** En qué se aparta esta salida del par de cabecera. Ver §3 de la spec. */
  readonly texto: string;
}

export interface FrecuenciaModelo {
  /** Los tres tipos coinciden → se enseña un solo número. */
  readonly uniforme: boolean;
  readonly laborables: number | null;
  readonly sabados: number | null;
  readonly festivos: number | null;
  /** La cita entera de Avanza. Es el plan B si el formato no se deja parsear. */
  readonly literal: string;
}

export interface ModeloSalidas {
  /** ¿Avanza publica tabla para este sentido? Si `false`, la pantalla lo DICE. */
  readonly hay: boolean;
  readonly cabecera: { readonly destino: string; readonly origen: string } | null;
  readonly primeras: readonly SalidaMarcada[];
  readonly ultimas: readonly SalidaMarcada[];
  readonly notas: readonly NotaSalidas[];
  readonly frecuencia: FrecuenciaModelo | null;
}

// Clave de par origen→destino. El separador es un carácter de control (unit
// separator, 0x1F) que NO aparece en ningún nombre de terminal —los nombres
// llevan espacios, así que partir por espacio los rompería—.
const SEP = String.fromCharCode(31);
const par = (s: SalidaWeb): string => `${s.desde}${SEP}${s.hasta}`;
const desdePar = (clave: string): { desde: string; hasta: string } => {
  const i = clave.indexOf(SEP);
  return { desde: clave.slice(0, i), hasta: clave.slice(i + 1) };
};

/**
 * El par MAYORITARIO sobre primeras + últimas juntas (§ regla 1). El porqué de
 * "juntas": en la 23 `-1` ninguna tabla por separado tiene mayoría; sumadas, sí.
 *
 * ⚠️ Desempate (§5): si dos pares empatan al máximo, gana el de la salida MÁS
 * TEMPRANA. Como se itera en orden cronológico, el primero que alcanza el máximo
 * es justo ese. Único caso real en la red: 41 `-2` (2 vs 2).
 */
function parMayoritario(todas: readonly SalidaWeb[]): string {
  const cuenta = new Map<string, number>();
  for (const s of todas) cuenta.set(par(s), (cuenta.get(par(s)) ?? 0) + 1);
  const max = Math.max(...cuenta.values());
  for (const s of todas) if (cuenta.get(par(s)) === max) return par(s);
  return par(todas[0]); // inalcanzable con todas.length > 0; deja el tipo cerrado
}

/** El texto del pie para una marca, según en qué se aparta del par de cabecera (§3). */
function textoNota(clavePar: string, cabecera: { destino: string; origen: string }): string {
  const { desde, hasta } = desdePar(clavePar);
  const cambiaDestino = hasta !== cabecera.destino;
  const cambiaOrigen = desde !== cabecera.origen;
  if (cambiaOrigen && cambiaDestino) return `de ${desde} a ${hasta}`;
  if (cambiaDestino) return `termina en ${hasta}, no en ${cabecera.destino}`;
  return `sale de ${desde}, no de ${cabecera.origen}`;
}

/**
 * "Frecuencia media: laborables: 13, sábados: 17, domingos y festivos: 17 min."
 * → los tres números. Si el formato no encaja, los números quedan `null` y la
 * pantalla cae a la cita literal. No se calcula nada: se lee lo que Avanza pone.
 */
export function parsearFrecuencia(raw: string | null): FrecuenciaModelo | null {
  if (!raw) return null;
  const num = (re: RegExp): number | null => {
    const m = raw.match(re);
    return m ? Number.parseInt(m[1], 10) : null;
  };
  const laborables = num(/laborables:\s*(\d+)/i);
  const sabados = num(/s[áa]bados:\s*(\d+)/i);
  const festivos = num(/(?:domingos?|festivos)[^:]*:\s*(\d+)/i);
  const nums = [laborables, sabados, festivos].filter((n): n is number => n !== null);
  const uniforme = nums.length > 0 && nums.every((n) => n === nums[0]);
  return { uniforme, laborables, sabados, festivos, literal: raw };
}

/**
 * De la tabla pelada de Avanza al modelo que pinta el bloque. Función PURA: mismo
 * horario, mismo modelo. Sin fecha, sin estado (por eso la frecuencia enseña los
 * tres tipos de día: clasificar "hoy" exigiría un calendario de festivos que NO
 * tenemos, y errar un festivo por laborable sería peor que enseñar los tres).
 */
export function modelarSalidas(horario: HorarioWeb): ModeloSalidas {
  const todas = [...horario.primeras, ...horario.ultimas];
  const frecuencia = parsearFrecuencia(horario.frecuencia);

  // Sentido sin tabla (búhos y demás): no hay cabecera ni marcas. La pantalla dirá
  // "Avanza no publica los horarios" — un bloque en blanco mentiría por omisión.
  if (todas.length === 0) {
    return { hay: false, cabecera: null, primeras: [], ultimas: [], notas: [], frecuencia };
  }

  const mayoritario = parMayoritario(todas);
  const cabecera = desdePar(mayoritario);
  const cab = { destino: cabecera.hasta, origen: cabecera.desde };

  // Una letra por cada par distinto del mayoritario, en orden de PRIMERA aparición
  // cronológica (no alfabético) — se itera primeras y luego últimas, ya ordenadas.
  const marcaDe = new Map<string, string>();
  for (const s of todas) {
    const clave = par(s);
    if (clave !== mayoritario && !marcaDe.has(clave)) {
      marcaDe.set(clave, String.fromCharCode(97 + marcaDe.size)); // a, b, c…
    }
  }

  const marcar = (salidas: readonly SalidaWeb[]): SalidaMarcada[] =>
    salidas.map((s) => ({ hora: s.hora, marca: marcaDe.get(par(s)) ?? null }));

  const notas: NotaSalidas[] = [...marcaDe.entries()].map(([clave, marca]) => ({
    marca,
    texto: textoNota(clave, cab),
  }));

  return {
    hay: true,
    cabecera: cab,
    primeras: marcar(horario.primeras),
    ultimas: marcar(horario.ultimas),
    notas,
    frecuencia,
  };
}
