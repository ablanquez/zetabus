/**
 * ⭐⭐ UN ESTADO QUE ES ÚNICO **POR PROCESO**, NO POR MÓDULO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  LA CICATRIZ, Y ESTÁ MEDIDA. `/api/diag` decía `avanza.peticiones: 0`
 *  **mientras ZetaBus estaba pidiendo datos a Avanza.**
 *
 *  Medido en el build de producción, un solo proceso, mismo `pid`, caché vacía:
 *
 *      paso 1 · GET /api/llegadas/744  (route handler)  →  peticiones = 1  ✔
 *      paso 2 · GET /parada/1228       (página)         →  peticiones = 1  ⛔
 *      paso 3 · GET /api/llegadas/1228 (route handler)  →  fallosDeCache 2,
 *                                                          llamadasAlOrigen 1
 *
 *  El paso 2 no movió NADA. Y sin embargo la página SÍ pidió: tras ese paso
 *  apareció `poste_1228-*.json` en el disco, que solo el render pudo escribir;
 *  y en el paso 3 la petición encontró el dato ya cacheado.
 *
 *  ⇒ LA CAUSA: en producción, **las páginas y los route handlers son grafos de
 *    módulos DISTINTOS aunque compartan proceso.** Un `let x` a nivel de módulo
 *    no es «uno por proceso»: es **uno por grafo**. `/api/diag` es un route
 *    handler, así que leía el ejemplar de los route handlers y el de las páginas
 *    le era invisible.
 *
 *  ⚠️ Y EL SESGO IBA AL LADO MALO: en una visita normal, la PRIMERA petición a
 *     Avanza es siempre la del render de la página (el cliente no refresca hasta
 *     el segundo 15). Se perdía sistemáticamente la petición que provoca todo
 *     usuario, y solo se contaban las de quien se quedaba mirando.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ POR QUÉ ASÍ, Y NO «UN SINGLETON A LA BRAVA».
 *
 * Ésta es la vía que documenta el propio Next.js. Su guía de instrumentación,
 * en «Importing files with side effects», dice textualmente que un fichero puede
 * *«definir un conjunto de variables globales»* y que **se sigue teniendo acceso
 * a ellas** desde cualquier parte. `globalThis` es el único sitio que TODOS los
 * grafos de un proceso ven, porque no pertenece a ninguno: pertenece al *realm*.
 *
 * Y la clave es `Symbol.for(...)`, no una cadena:
 *   · va al **registro global de símbolos**, así que dos grafos que pidan el
 *     mismo nombre reciben EL MISMO símbolo — que es justo lo que hace falta;
 *   · no colisiona con ninguna propiedad de nadie, ni aparece en un `for...in`,
 *     ni se serializa por accidente. Una cadena en `globalThis` sí puede chocar.
 *
 * ⚠️ NO se ha usado `instrumentation.ts` para esto, y conviene decir por qué:
 *    su `register()` corre una vez por servidor y sirve para **inicializar**. Lo
 *    que aquí hace falta es que quien llegue primero cree el objeto y los demás
 *    lo encuentren — sea quien sea y en el orden que sea. Esto no depende de que
 *    ningún gancho haya corrido antes, así que no puede fallar por orden de
 *    arranque. `instrumentation.ts` sería una pieza más que mantener a cambio de
 *    nada.
 *
 * ⚠️ LO QUE ESTO **NO** ARREGLA, y hay que saberlo: si Hostinger levanta VARIOS
 *    PROCESOS de Node, cada uno tendrá su propio `globalThis` y su propio
 *    contador. Eso NO es un fallo de aquí — es física de procesos. Lo que
 *    coordina a varios procesos es el piso de DISCO de la caché, y sigue siendo
 *    su trabajo. `/api/diag` enseña el `pid` precisamente para poder contarlos.
 */

/**
 * Dónde vive todo lo del proceso. Un solo tarro, para no sembrar `globalThis`.
 *
 * ⚠️ LA CLAVE NO LLEVA EL NOMBRE DEL PROYECTO, Y TIENE GRACIA POR QUÉ: la puse
 *    como `'zetabus.proceso'` y **el guardián del núcleo la rechazó**
 *    (`tests/tranvia-sin-tocar-el-nucleo.test.ts`), porque prohíbe la palabra
 *    «bus» en `src/core/` para que el modelo no dé por hecho que esto son
 *    autobuses… y «zetaBUS» la contiene. Es un falso positivo de una regla que
 *    hace bien su trabajo, así que **el que se adapta es este fichero, no el
 *    guardián**: aflojar una guarda para que pase mi código es exactamente lo que
 *    no se hace aquí. `zb/` identifica igual de bien y no pide excepciones.
 */
const TARRO = Symbol.for('zb/estado-por-proceso');

type Tarro = Record<string, unknown>;

const tarro = (): Tarro => {
  const g = globalThis as typeof globalThis & { [TARRO]?: Tarro };
  return (g[TARRO] ??= {});
};

/**
 * Devuelve el ejemplar ÚNICO DEL PROCESO asociado a `clave`, creándolo la primera
 * vez. Quien llegue primero lo crea; todos los demás —de cualquier grafo de
 * módulos— reciben ese mismo.
 *
 * ⚠️ `crear` tiene que ser **idempotente y sin efectos observables**: puede no
 *    llegar a ejecutarse nunca si otro grafo se adelantó.
 *
 * @example
 *   const contador = unicoPorProceso('avanza.contador', () => new ContadorAvanza());
 */
export function unicoPorProceso<T>(clave: string, crear: () => T): T {
  const t = tarro();
  if (!(clave in t)) t[clave] = crear();
  return t[clave] as T;
}

/**
 * SOLO PARA PRUEBAS: vacía el tarro.
 *
 * ⚠️ En producción esto no debe llamarlo nadie —tirar el contador y la caché a
 *    media vida es exactamente lo que este fichero existe para impedir—. Está
 *    aquí para que un test pueda partir de cero sin reiniciar el proceso, que si
 *    no obligaría a que cada test viviera en su propio proceso.
 */
export function vaciarElTarroDelProceso(): void {
  const g = globalThis as typeof globalThis & { [TARRO]?: Tarro };
  g[TARRO] = {};
}
