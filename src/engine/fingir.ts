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
  /** Uno de CADA nivel de confianza, para ver los cuatro tratamientos a la vez. */
  | 'sin-verificar'
  /**
   * ⭐ SOLO OFICIALES. **El caso NORMAL** — 350 de 403 (87%).
   *
   * ⚠️ Faltaba, y no era un detalle: sin él **no se podía probar que la leyenda de
   * procedencias DESAPARECE cuando no hay nada que explicar**. Escribí la
   * contraprueba con `?fingir=ok`… que NO EXISTE: `fingimientoDe` devolvía `null`,
   * la página servía datos REALES de Avanza, y salían autobuses marcados.
   *
   * El test se puso rojo y tenía razón. **Un fingimiento que no existe se ignora en
   * silencio** — el mismo modo de fallo que ya nos costó tres verdes falsos.
   */
  | 'solo-oficiales'
  /** DOS líneas en el mismo poste. Sin esto, el filtro no se puede probar:
   *  con una sola línea, apagarla y "Ninguna" hacen exactamente lo mismo y el
   *  test pasaría sin haber comprobado que el filtro FILTRA. */
  | 'dos-lineas'
  /**
   * ⭐ EL MAPA, CON SUS TRES CASOS FEOS A LA VEZ: un autobús INMINENTE (late), uno
   * de OTRA LÍNEA (otro color de marcador), uno SIN GPS (no se pinta, y se dice) y
   * uno LEJOS (cae fuera del encuadre, y se dice). Ninguno se podía ver antes.
   */
  | 'mapa';

// ⚠️ SE HA IDO `barrido-lento`. Existía SOLO para ver moverse la barra de progreso
//    del barrido de línea, que está aparcado (`docs/BARRIDO_APARCADO.md`). Un
//    fingimiento que ya nada puede disparar es código muerto con pinta de vivo — y
//    en un modo demo eso es peor que en otro sitio: el día que alguien lo vea en la
//    lista, creerá que hay algo que probar.

// ⚠️ NO hay un fingimiento para "nombre de parada larguísimo": no hace falta
//    inventarlo. El poste 823 se llama "Vía Hispanidad N.º 73 / Nuestra Señora
//    De Los ángeles" — 53 caracteres, y es real. Fingir un caso que ya existe en
//    los datos sería probar mi invención en lugar de la realidad.
export const FINGIMIENTOS: readonly Fingimiento[] = [
  'caido', 'lento', 'sin-buses', 'ilegible', 'sin-ficha', 'sin-verificar', 'solo-oficiales', 'dos-lineas', 'mapa',
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

/**
 * ⭐⭐ `sinGps` · Y AQUÍ EL TEST ME ENSEÑÓ ALGO QUE YO NO SABÍA. DOS COSAS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  1 · MI PRIMERA VERSIÓN FABRICABA UN CASO QUE EL PARSER DECLARA IMPOSIBLE.
 *
 *  Quité el coche de `maquinas` y dejé su llegada en `tablatiempos`. Resultado: la
 *  pantalla entera salió **ILEGIBLE**. Y con razón — el contador de control (L1)
 *  cruza los dos canales y, si no anuncian los mismos autobuses, **no se cree la
 *  respuesta**. Yo estaba inventando una avería de Avanza que Avanza no comete, y
 *  el parser me paró en 90 segundos.
 *
 *  El camino real por el que un autobús se queda sin punto es OTRO: viene en
 *  `maquinas`, con su título correcto, y **sus `coordenadas` no valen**. Ahí el
 *  parser conserva la LLEGADA, pierde el PUNTO, y anota un aviso. Es el único
 *  hueco por donde `posicion` puede ser `null`. Es este.
 *
 *  2 · ⚠️ Y ESTE CASO **NUNCA SE HA OBSERVADO**. Medido sobre las capturas reales
 *      guardadas en `.cache/fixtures-reales`:
 *
 *          22 postes · 86 autobuses reales · **0 sin coordenadas válidas**
 *
 *      ⇒ NO se dice "esto pasa a veces". Se dice lo que hay: **la defensa existe
 *        porque el precio de equivocarse es un `?? 0` que manda el autobús al golfo
 *        de Guinea**, no porque lo hayamos visto. Un aviso de pantalla que jamás
 *        nadie ha visto disparar no es una prueba de nada — pero borrarlo sería
 *        apostar a que Avanza nunca falla, y esa apuesta no la hace este proyecto.
 * ═══════════════════════════════════════════════════════════════════════════
 */
function respuesta(
  buses: { coche: string; linea: string; destino: string; eta: number; sinGps?: boolean }[],
): string {
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
  /**
   * ⚠️ LA POSICIÓN FINGIDA SE DEDUCE DEL TIEMPO ANUNCIADO. Y ANTES NO.
   *
   * Antes era `LAT: 41.64 + i * 0.002` — el ÍNDICE en el array. O sea: un autobús
   * anunciado "a 1 minuto" podía pintarse a 1,5 km de la parada, y otro "a 12
   * minutos" pegado a ella. **El mapa de la demo se contradecía con su propia lista**,
   * y yo he estado mirando esas capturas dando por buena la geometría.
   *
   * Ahora: ~300 m por minuto (velocidad comercial de un urbano con paradas), en
   * diagonal al sureste. Un bus a 1 min sale a 300 m; uno a 12 min, a 3,6 km. Que es
   * justo lo que hace que B3 tenga sentido — y lo que hace que el aviso de «fuera del
   * encuadre» se pueda ver con los ojos en vez de solo prometerse.
   */
  buses.forEach((b, i) => {
    maquinas[String(i + 1)] = {
      // ⭐ NULL ISLAND: el coche ESTÁ (si no, L1 tumbaría la respuesta entera), pero
      //    sin un punto. Ni uno falso, ni un (0,0). Vacío.
      coordenadas: b.sinGps
        ? {}
        : { 0: { LAT: 41.6499 - b.eta * 0.0027, LON: -0.876 + b.eta * 0.0009 } },
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
 * ⭐ LAS TRES PROCEDENCIAS, JUNTAS, PARA PODER MIRARLAS A LA VEZ.
 *
 * La primera versión de este fichero devolvía el coche OFICIAL también para
 * `?fingir=sin-verificar`. Abrí la página, vi un "✓ Dato oficial" y por poco lo
 * doy por bueno. **Un modo de prueba que no prueba lo que dice es peor que no
 * tenerlo: da confianza falsa.**
 *
 * ⚠️ Y EN LA TANDA 7 CASI VUELVE A PASAR, AL REVÉS: este fingimiento usaba el
 *    4114, que ERA `sin_verificar`… hasta que Antonio aportó busesmadrid.es y
 *    pasó a `fuente_secundaria`. El test visual se cayó — **y tenía razón**: el
 *    fingimiento ya no producía lo que su nombre prometía.
 *
 * ⇒ Ahora trae UNO DE CADA, para que los cuatro tratamientos se vean a la vez y
 *   se pueda comprobar que NO SE PARECEN:
 *
 *     4889  oficial             sin marca   pliego municipal — es la NORMA
 *     4640  fuente_secundaria   *           busesmadrid.es — citable, no oficial
 *     4330  observacion_propia  †           Antonio se sube a él a diario
 *     4610  sin_verificar       ?           no consta en ninguna parte
 *
 * ⚠️ EL `*` ERA EL 4114 Y HA TENIDO QUE CAMBIAR. En la Tanda 9 la procedencia bajó
 *    al campo, y el 4114 —cuya LONGITUD la aporta Antonio— pasó a llevar el †. El
 *    test visual se cayó pidiendo "un coche fuente_secundaria" y no lo encontraba.
 *    **Tenía razón**: ya no lo era. El `*` puro es ahora un Irisbus (4640), que
 *    busesmadrid cubre entero y del que Antonio no afirma nada.
 *
 * ⚠️ Y LOS CUATRO SON REALES. Ni uno solo está fabricado para que la demo salga
 *    bonita: los cuatro coches existen en `data/flota-avanza-zaragoza.json` con esa
 *    confianza exacta. En la Tanda 7 el † NO SE PODÍA FINGIR —no había ni un
 *    vehículo observado— y se dijo, en vez de inventarlo. Ahora hay siete.
 */
const SIN_VERIFICAR = respuesta([
  { coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 1 },
  { coche: '4640', linea: '035', destino: 'PARQUE GOYA', eta: 4 },
  { coche: '4330', linea: '035', destino: 'PARQUE GOYA', eta: 8 },
  { coche: '4610', linea: '035', destino: 'PARQUE GOYA', eta: 12 },
]);

/**
 * ⭐ B4/B5/B6 · EL MAPA, CON SUS TRES CASOS FEOS A LA VEZ:
 *
 *   4889  eta 1   CON GPS   → INMINENTE: el marcador late
 *   4132  eta 3   CON GPS   → otra línea (otro color de chip: se ve que el marcador
 *                             lleva el color de SU línea, no uno genérico)
 *   4845  eta 7   SIN GPS   → ⭐ NO SE PINTA. Y se dice que no se pinta.
 *   4610  eta 12  CON GPS   → el más lejano: cae FUERA DEL ENCUADRE de barrio
 *
 * ⚠️ Sin el 4845 no se podía comprobar que el mapa NO MIENTE POR OMISIÓN, y sin el
 *    4610 no se podía comprobar que B3 (abrir en la parada) **paga su precio a la
 *    vista** en lugar de esconder los autobuses lejanos.
 */
const MAPA = respuesta([
  { coche: '4889', linea: '035', destino: 'PARQUE GOYA', eta: 1 },
  { coche: '4132', linea: '029', destino: 'SAN GREGORIO', eta: 3 },
  { coche: '4845', linea: '035', destino: 'PARQUE GOYA', eta: 7, sinGps: true },
  { coche: '4610', linea: '035', destino: 'PARQUE GOYA', eta: 12 },
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
    case 'sin-verificar':
      return async () => ({ status: 200, texto: SIN_VERIFICAR });
    case 'solo-oficiales':
      return async () => ({ status: 200, texto: OFICIAL });
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
    case 'mapa':
      return async () => ({ status: 200, texto: MAPA });
  }
  /**
   * ⛔ SIN `default`. Y ES DELIBERADO.
   *
   * Antes había un `default: return OFICIAL`. Es decir: **un fingimiento nuevo que
   * se me olvidara enchufar aquí devolvía datos oficiales tan campante**, y el test
   * que lo usara pasaría en verde probando otra cosa. Es EXACTAMENTE el fallo que ya
   * nos costó un verde falso con `?fingir=ok`, que no existía y se ignoraba en
   * silencio.
   *
   * Ahora el `switch` es exhaustivo: si mañana alguien añade un fingimiento a la
   * unión y no lo enchufa, **TypeScript no compila**. El fallo salta en el build, no
   * en una captura que alguien mira dos semanas después.
   */
  const jamas: never = f;
  throw new Error(`fingimiento sin enchufar: ${String(jamas)}`);
}

/** El transporte que toca: el real, salvo que se pida fingir a propósito. */
export const transporteDe = (f: Fingimiento | null): Transporte =>
  f ? transporteFingido(f) : transporteReal;
