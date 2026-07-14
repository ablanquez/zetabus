/**
 * EL MODO DE PRUEBA. Para poder VER los casos feos con las manos.
 *
 * Los casos que hay que mirar con los ojos —Avanza caído, Avanza lento, un dato
 * rancio, un bus sin ficha— no se pueden provocar pidiéndoselos a Avanza. Y
 * mirarlos solo en un test es quedarse a medias: hay que VERLOS en pantalla.
 *
 *      ZETABUS_DEMO=1 npm run start
 *      http://localhost:3000/parada/744?fingir=caido
 *
 * ⚠️ APAGADO POR DEFECTO Y CON DOBLE CERROJO.
 *
 * 1. La variable `ZETABUS_DEMO` tiene que valer "1". Sin eso, el parámetro
 *    `?fingir=` **se ignora por completo**.
 * 2. Y aunque estuviera encendida, jamás se sirve un dato falso sin decirlo: la
 *    respuesta viene marcada y la pantalla enseña una banda que no se puede
 *    ignorar.
 *
 * Un modo de prueba que pueda quedarse encendido en producción sin que se note
 * es una fábrica de pantallas falsas — que es justo lo que este proyecto
 * persigue. Por eso NO se activa solo con NODE_ENV: hay que pedirlo a mano.
 */

import type { Transporte } from '@/sources/avanza/transporte';
import { transporteReal } from '@/sources/avanza/transporte';

export type Fingimiento =
  /** Avanza no responde. La pantalla tiene que DECIRLO, no callar. */
  | 'caido'
  /** Avanza tarda 6 s: por encima del timeout de 4 s. */
  | 'lento'
  /** Poste válido, cero autobuses. NO es lo mismo que un error. */
  | 'sin-buses'
  /** Avanza devuelve HTML de error. Ilegible ≠ vacío. */
  | 'ilegible'
  /** Un autobús que NO está en el maestro de flota → SIN DATOS. */
  | 'sin-ficha'
  /** Un autobús con `confianza: sin_verificar` (53 de 403 son así). */
  | 'sin-verificar'
  /** DOS líneas en el mismo poste. Sin esto, el filtro no se puede probar:
   *  con una sola línea, apagarla y "Ninguna" hacen exactamente lo mismo y el
   *  test pasaría sin haber comprobado que el filtro FILTRA. */
  | 'dos-lineas'
  /**
   * ⭐ CADA POSTE TARDA 150 ms. Para poder VER la barra moverse.
   *
   * ⚠️ Los demás fingimientos responden INSTANTÁNEOS, y con eso el barrido de 18
   *    postes termina en 0 ms: React agrupa el render y la barra salta de 0 al
   *    final sin pasar por en medio. Un test sobre esa barra no probaría que
   *    mide: probaría que existe. Con Avanza de verdad tarda segundos; aquí se
   *    reproduce ese tiempo para poder comprobarlo SIN machacar a Avanza.
   */
  | 'barrido-lento';

// ⚠️ NO hay un fingimiento para "nombre de parada larguísimo": no hace falta
//    inventarlo. El poste 823 se llama "Vía Hispanidad N.º 73 / Nuestra Señora
//    De Los ángeles" — 53 caracteres, y es real. Fingir un caso que ya existe en
//    los datos sería probar mi invención en lugar de la realidad.
export const FINGIMIENTOS: readonly Fingimiento[] = [
  'caido', 'lento', 'sin-buses', 'ilegible', 'sin-ficha', 'sin-verificar', 'dos-lineas', 'barrido-lento',
];

export const demoEncendido = (): boolean => process.env.ZETABUS_DEMO === '1';

/** Lee `?fingir=` SOLO si el modo demo está encendido a propósito. */
export function fingimientoDe(sp: Record<string, string | string[] | undefined>): Fingimiento | null {
  if (!demoEncendido()) return null;
  const v = Array.isArray(sp.fingir) ? sp.fingir[0] : sp.fingir;
  return FINGIMIENTOS.includes(v as Fingimiento) ? (v as Fingimiento) : null;
}

// ── Las respuestas falsas. Estructura calcada de la real. ────────────────────

const bloque = (linea: string, destino: string, filas: { coche: string; eta: number }[]) => `<li>
  <a href="#"><i class="fa fa-dot-circle-o"></i><strong>${linea}
  <i class="fa fa-long-arrow-right fa-fw"></i>${destino}
  </strong></a><ul class="nav nav-second-level">${filas
    .map((f) => `<li><a href="https://gps.avanzabus.com/zaragoza/fParadas/744/${f.coche}">
      <i class="fa fa-map-marker fa-fw"></i>${f.coche} [${f.eta} mins]</a></li>`)
    .join('')}</ul></li>`;

function respuesta(buses: { coche: string; linea: string; destino: string; eta: number }[]): string {
  const grupos = new Map<string, typeof buses>();
  for (const b of buses) {
    const k = `${b.linea}|${b.destino}`;
    grupos.set(k, [...(grupos.get(k) ?? []), b]);
  }
  let tabla = '';
  for (const [k, lista] of grupos) {
    const [linea, destino] = k.split('|');
    tabla += bloque(linea, destino, lista);
  }
  const maquinas: Record<string, unknown> = {
    0: { coordenadas: { 0: { LAT: 41.6499, LON: -0.876 } }, icon: 'https://gps.avanzabus.com/img/bus_rojo.png', title: 'Parada' },
  };
  buses.forEach((b, i) => {
    maquinas[String(i + 1)] = {
      coordenadas: { 0: { LAT: 41.64 + i * 0.002, LON: -0.87 } },
      icon: 'https://gps.avanzabus.com/img/bus.png',
      title: `${b.linea} ${b.coche}`,
    };
  });
  return JSON.stringify({ tablatiempos: tabla, maquinas });
}

/** 4889: Volvo 7905, 18 m, ARTICULADO, oficial. El coche que la referencia llamaba "Estándar". */
const OFICIAL = respuesta([
  { coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 1 },
  { coche: '4845', linea: '035', destino: 'PARQUE GOYA', eta: 7 },
]);
/** 9999 no existe en el maestro → perfil null → SIN DATOS. */
const SIN_FICHA = respuesta([{ coche: '9999', linea: '035', destino: 'PARQUE GOYA', eta: 4 }]);

/**
 * ⚠️ EL 4114 ES `sin_verificar` DE VERDAD (Mercedes-Benz eCitaro eléctrico).
 *
 * La primera versión de este fichero devolvía el coche OFICIAL también para
 * `?fingir=sin-verificar`. Abrí la página, vi un "✓ Dato oficial" y por poco lo
 * doy por bueno. **Un modo de prueba que no prueba lo que dice es peor que no
 * tenerlo: da confianza falsa.** Es lo que yo mismo escribí en `motor.ts` sobre
 * la caché, y volví a caer en ello tres ficheros después.
 *
 * Se pone junto a uno oficial para poder VER LOS DOS TRATAMIENTOS A LA VEZ y
 * comprobar que no se parecen.
 */
const SIN_VERIFICAR = respuesta([
  { coche: '4114', linea: '035', destino: 'PARQUE GOYA', eta: 1 },
  { coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 9 },
]);

/** Dos líneas, cuatro autobuses. Para poder PULSAR el filtro y ver qué se apaga. */
const DOS_LINEAS = respuesta([
  { coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 1 },
  { coche: '4114', linea: '035', destino: 'PARQUE GOYA', eta: 8 },
  { coche: '4132', linea: '029', destino: 'SAN GREGORIO', eta: 3 },
  { coche: '4131', linea: '029', destino: 'SAN GREGORIO', eta: 12 },
]);

export function transporteFingido(f: Fingimiento): Transporte {
  switch (f) {
    case 'dos-lineas':
      return async () => ({ status: 200, texto: DOS_LINEAS });
    case 'barrido-lento':
      return async (_u, { senal }) =>
        new Promise((resolver, rechazar) => {
          const t = setTimeout(() => resolver({ status: 200, texto: DOS_LINEAS }), 150);
          senal.addEventListener('abort', () => { clearTimeout(t); rechazar(senal.reason ?? new Error('abortado')); });
        });
    case 'sin-verificar':
      return async () => ({ status: 200, texto: SIN_VERIFICAR });
    case 'caido':
      return async () => { throw new Error('ECONNREFUSED (fingido)'); };
    case 'lento':
      return async (_u, { senal }) =>
        new Promise((_r, rechazar) => {
          const t = setTimeout(() => rechazar(new Error('tardó 6 s')), 6_000);
          senal.addEventListener('abort', () => { clearTimeout(t); rechazar(senal.reason ?? new Error('abortado')); });
        });
    case 'sin-buses':
      return async () => ({ status: 200, texto: '{"tablatiempos":""}' });
    case 'ilegible':
      return async () => ({ status: 200, texto: '<html><body><h1>502 Bad Gateway</h1></body></html>' });
    case 'sin-ficha':
      return async () => ({ status: 200, texto: SIN_FICHA });
    default:
      return async () => ({ status: 200, texto: OFICIAL });
  }
}

/** El transporte que toca: el real, salvo que se pida fingir a propósito. */
export const transporteDe = (f: Fingimiento | null): Transporte =>
  f ? transporteFingido(f) : transporteReal;
