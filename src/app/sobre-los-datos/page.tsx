import Link from 'next/link';
import { generadoEn, nombresControl, paradas, validez } from '@/engine/topologia';
import { MARCAS } from '@/components/FichaVehiculo';
import artefacto from '@/generated';
import type { Confidence } from '@/core';
import type { BusProfile } from '@/modes/bus/profile';

/**
 * ⭐ A5 · LA PROCEDENCIA SE MUEVE AQUÍ. NO SE PIERDE.
 *
 * En la tarjeta de cada autobús ponía "✓ Dato oficial (Anexo 5 del pliego
 * municipal)". En la inmensa mayoría de los vehículos: **no es una excepción, es la
 * norma.** Y al que espera en la marquesina le da igual de qué documento sale el
 * dato. Se enseña la excepción, no la norma — pero la procedencia NO se tira: quien
 * quiera auditarnos tiene que poder, y aquí está entera.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️⚠️ NINGÚN NÚMERO DE ESTA PÁGINA SE ESCRIBE A MANO. NI UNO.
 *
 * Es LA página que promete decir de dónde sale cada dato. Un recuento cableado en la
 * prosa es una constante escondida: el día que cambie la flota, el texto queda viejo
 * y NADIE SE ACUERDA DE TOCARLO. Todo se DERIVA abajo, y
 * `tests/motor-vivo/sobre-los-datos.test.ts` revienta si lo pintado no cuadra.
 *
 * ⚠️ Y lo que NO se puede derivar, NO SE DICE. El cotejo contra busesmadrid se midió
 *   una vez contra los dos ficheros crudos; el artefacto solo guarda el campo
 *   GANADOR, así que ya no es recalculable. Se quitó en vez de dejarlo envejecer.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ Y EL DISEÑO ES PARTE DEL ARGUMENTO. Antes eran NUEVE tarjetas idénticas: la
 * fuente principal y una nota de tres vehículos pesaban lo mismo, y el lector no
 * sabía por dónde entrar. Ahora hay TRES FAMILIAS (de dónde sale · la flota · los
 * límites) y los cuatro niveles de procedencia son UNA TABLA, que es lo que son:
 * cuatro variantes del mismo concepto. Ver `/interno/sistema-visual` · Superficies:
 * el salto papel/fondo es de 1.10:1, así que apilar tarjetas NO crea jerarquía —
 * la crean el tamaño y el peso del texto.
 */

export const metadata = {
  title: 'Sobre los datos · ZetaBus',
  description: 'De dónde sale cada dato de ZetaBus, y qué NO sabemos.',
};

interface Artefacto {
  readonly flota: Record<string, BusProfile>;
}

const ORDEN: readonly Confidence[] = ['oficial', 'fuente_secundaria', 'observacion_propia', 'sin_verificar'];

const FUENTE_DE: Record<Confidence, { fuente: string; garantia: string }> = {
  oficial: { fuente: 'Anexo 5 del pliego municipal', garantia: 'Documento público. Es la norma: no se marca.' },
  fuente_secundaria: { fuente: 'busesmadrid.es', garantia: 'Especializada y citable, pero NO oficial.' },
  observacion_propia: { fuente: 'Visto en servicio, con fecha', garantia: 'Lo afirmamos nosotros. La más débil.' },
  sin_verificar: { fuente: 'Fichero heredado', garantia: 'Sin fuente. Puede ser correcto; no se demuestra.' },
};

export default function SobreLosDatos() {
  // ⚠️ LAS CIFRAS SE CUENTAN, NO SE ESCRIBEN.
  const flota = Object.values((artefacto as unknown as Artefacto).flota);
  const cuantos = (c: Confidence) => flota.filter((v) => v.confidence === c).length;
  const oficiales = cuantos('oficial');
  const secundarios = cuantos('fuente_secundaria');
  const observados = cuantos('observacion_propia');
  const marcados = cuantos('sin_verificar');

  const sinConfirmar = paradas().filter((s) => s.nombreProc.fuente === 'gtfs-marcado').length;
  const { comparables, distintos } = nombresControl;
  const pctDistintos = comparables > 0 ? Math.round((distintos / comparables) * 1000) / 10 : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[var(--control)] items-center text-menor font-semibold underline underline-offset-2"
        >
          ← volver
        </Link>
        <h1 className="mt-2 text-titulo font-black leading-tight sin-recortar">Sobre los datos</h1>
        <p className="mt-1 text-cuerpo leading-relaxed text-[var(--color-tinta-suave)] sin-recortar">
          De dónde sale cada cosa. Y, sobre todo, <strong>qué no sabemos</strong>.
        </p>
      </div>

      {/* ═══ FAMILIA 1 ═══════════════════════════════════════════════════════ */}
      <Familia titulo="De dónde salen los datos" nota="Tres fuentes, y cada una sabe una cosa distinta.">
        <div className="divide-y divide-[var(--color-borde)] overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
          <Fuente titulo="Los autobuses que ves llegar" fuente="Avanza Zaragoza · gps.avanzabus.com">
            <p>
              Se piden en directo, uno por parada, y se guardan 15 segundos para no molestar. La
              pantalla escribe siempre <strong>la edad del dato</strong>: no decimos «se actualiza
              cada 20 s», decimos cuándo se miró de verdad.
            </p>
            <Nota>
              Son los autobuses <strong>DETECTADOS</strong>, no todos: Avanza anuncia como mucho los
              dos siguientes de cada línea y sentido. Un tercero muy pegado a otros dos existe,
              circula lleno de gente, y <strong>no lo publica nadie</strong>.
            </Nota>
          </Fuente>

          <Fuente
            titulo="Las paradas, las líneas y los recorridos"
            fuente="GTFS oficial · Punto de Acceso Nacional (NAP) del Ministerio de Transportes"
          >
            <p>
              Se descarga y se hornea en el build. Nada se pide en caliente. Publica{' '}
              <strong>{validez.publisher}</strong>.{' '}
              <strong>Vigencia: hasta el {validez.endDate}.</strong> Generado el{' '}
              {new Date(generadoEn).toLocaleDateString('es-ES')}. Cuando caduque, la aplicación lo
              dice arriba, en rojo, sin que nadie tenga que acordarse.
            </p>
            <Nota>
              <strong>Pero su calendario no es de fiar, y los horarios ya no salen de aquí.</strong> A
              veces dice que una línea <strong>no circula hoy</strong> y la línea circula: lo vimos en
              la <strong>44</strong>, con <strong>cero viajes</strong> en el feed mientras sus
              autobuses salían en el tiempo real. Del GTFS usamos la <strong>topología</strong>; la
              hora se la preguntamos al operador.
            </Nota>
          </Fuente>

          <Fuente
            titulo="Los horarios de hoy y los avisos de cada línea"
            fuente="Avanza Zaragoza · página de línea (zaragoza.avanzagrupo.com)"
          >
            <p>
              De aquí salen las <strong>primeras y últimas salidas de hoy</strong> —hora, desde y
              hasta— y la <strong>frecuencia media</strong>, tal y como las publica el operador. Son{' '}
              <strong>del día</strong>: si hoy una línea acorta su terminal, la tabla lo dice. Se rasca{' '}
              <strong>una vez al día</strong>. Son horas de <strong>salida</strong> (de cabecera),{' '}
              <strong>no la hora a la que el bus pasa por tu parada</strong>.
            </p>
            <Nota>
              El texto de <strong>«Información adicional»</strong>{' '}
              <strong>lo mantienen ellos a mano</strong>, y lo enseñamos <strong>tal cual</strong>: es
              una cita <strong>según Avanza</strong>, no una afirmación nuestra.{' '}
              <strong>Si lo dejan viejo, no lo podemos saber.</strong>
            </Nota>
          </Fuente>

          <Fuente titulo="Los nombres de las paradas" fuente="GTFS + Avanza. Y el GTFS los trae rotos.">
            <p>
              El GTFS pasa los nombres por un <code>ucwords()</code> y los destroza:{' '}
              <strong>«Pedro III»</strong> sale «Pedro Iii»; <strong>«Alhama de Aragón»</strong>,
              «Alhama De Aragón». Medido:{' '}
              <strong>el operador escribe distinto el {pctDistintos} %</strong> de los que podemos
              comparar ({distintos} de {comparables}). Por eso el nombre bueno{' '}
              <strong>se le pide a Avanza</strong>.
            </p>
            <Nota>
              Las <strong>{sinConfirmar} paradas</strong> que Avanza no da hoy se quedan con el del
              GTFS y <strong>van marcadas</strong> como «nombre sin confirmar». No se corrige a mano
              ni uno: de «Pedro Iii» no se recupera «Pedro III» sin adivinar.
            </Nota>
          </Fuente>

          <Fuente titulo="Los destinos de las líneas" fuente="GTFS (trip_headsign). Con el mismo ucwords roto.">
            <p>
              El destino que ves arriba de una línea (<strong>«Hacia Siglo XXI»</strong>) y en la
              home sale del mismo GTFS, con el mismo <code>ucwords()</code>: «Siglo XXI» llegaba como
              «Siglo Xxi», «Aljafería» como «Aljaferia», «San José» como «San Jose», y hasta un
              numeral deletreado —«Plaza Emperador Carlos V» venía como{' '}
              <strong>«Carlos Quinto»</strong>—. Aquí <strong>sí se corrigen a mano</strong>, y es la
              diferencia con las paradas: son <strong>un puñado</strong> de topónimos conocidos de
              Zaragoza —no cientos— y no hay una fuente limpia que pedir. La forma correcta es un
              hecho del callejero, no una adivinanza.
            </p>
            <Nota>
              Por eso el destino corregido <strong>ya no es una cita</strong> literal —lo hemos
              reescrito—: se protege de la traducción automática del navegador, pero no se marca como
              verbatim. Y la <strong>línea 60</strong> es el cabo suelto: su GTFS dice «Actur-Rey
              Fernando» y la web de Avanza «Valle de Broto». Son dos fuentes que no coinciden y no
              sabemos cuál es la de hoy: se muestra la del GTFS, sin inventar.
            </Nota>
            <p>
              Y hay un paso más, que ya no es ortografía: a veces el GTFS dice algo{' '}
              <strong>distinto</strong> de lo que la línea es, y manda el conocimiento de campo. La{' '}
              <strong>barra no separa dos destinos</strong>: nombra una zona. La cabecera de la{' '}
              <strong>21</strong> es «Oliver / Miralbueno» (el GTFS solo pone «Miralbueno») y la de la{' '}
              <strong>28</strong> es «Montañana / Peñaflor». No se parte por la barra. Y las
              lanzaderas <strong>C1 y C4</strong> vienen con los sentidos mal emparejados: su par de
              destinos se pone a mano. Son decisiones apuntadas como tales, no limpiezas.
            </p>
          </Fuente>
        </div>
      </Familia>

      {/* ═══ FAMILIA 2 ═══════════════════════════════════════════════════════ */}
      <Familia
        titulo={`La ficha de cada autobús — ${flota.length} vehículos`}
        nota="Cuatro niveles de procedencia. La ficha de la parada los pinta todos IGUAL; aquí es donde se cuentan y se explican."
      >
        <div className="overflow-hidden rounded-panel border border-[var(--color-borde)] bg-[var(--color-papel)]">
          <table className="w-full border-collapse text-menor leading-snug">
            <thead>
              <tr className="border-b border-[var(--color-borde)] text-micro font-bold uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                <th className="px-3 py-2 text-left font-bold">Marca</th>
                <th className="px-1 py-2 text-right font-bold">Veh.</th>
                <th className="px-3 py-2 text-left font-bold">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {ORDEN.map((c) => {
                const m = MARCAS[c];
                const n = cuantos(c);
                const f = FUENTE_DE[c];
                return (
                  <tr key={c} data-papel="nivel-procedencia" data-confianza={c} data-veh={n}>
                    <td className="px-3 py-2 align-top">
                      <span className="text-cuerpo font-black text-[var(--color-tinta)]">
                        {m?.simbolo ?? '—'}
                      </span>
                    </td>
                    <td className="px-1 py-2 text-right align-top text-cuerpo font-black tabular-nums">{n}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="font-semibold text-[var(--color-tinta)]">{f.fuente}</span>
                      <span className="block text-nota text-[var(--color-tinta-tenue)] sin-recortar">
                        {f.garantia}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* El detalle de cada nivel: comprimido, debajo, y sin perder una idea. */}
        <div className="mt-3 flex flex-col gap-2 text-menor leading-relaxed text-[var(--color-tinta-suave)]">
          <p data-papel="detalle-nivel" data-confianza="oficial">
            <Etiqueta>— {oficiales} oficiales</Etiqueta> Modelo, longitud, clase y combustible salen
            del registro de flota adscrita al contrato (expediente 0034140-25), aprobado por el
            Gobierno de Zaragoza el 24/10/2025 —{' '}
            <a
              className="font-semibold underline underline-offset-2"
              href="https://www.zaragoza.es/sede/servicio/contratacion-publica/7615"
              target="_blank"
              rel="noreferrer"
            >
              ficha del expediente
            </a>
            . ⚠️ Ese pliego <strong>está pendiente de adjudicar</strong>: describe la flota a octubre
            de 2025, y <strong>no es un censo de lo que circula hoy</strong>.
          </p>
          <p data-papel="detalle-nivel" data-confianza="fuente_secundaria">
            <Etiqueta>* {secundarios} de busesmadrid</Etiqueta> Circulan y <strong>no</strong> están
            en el pliego: eléctricos entregados <strong>después</strong> de octubre de 2025. Su ficha
            sale de{' '}
            <a
              className="font-semibold underline underline-offset-2"
              href="https://busesmadrid.es/autobuses-urbanos-de-zaragoza-s-a-auzsa/"
              target="_blank"
              rel="noreferrer"
            >
              busesmadrid.es
            </a>
            . Es muy buena, <strong>pero no es oficial</strong>: donde es la <strong>única</strong>{' '}
            fuente, un error suyo <strong>no lo podemos detectar</strong> — y por eso llevan
            asterisco. De ahí sacamos matrícula, modelo y propulsión; la{' '}
            <strong>longitud no la publica</strong>, así que no la decimos (un articulado sale como
            «Articulado», sin metros: deducirla del modelo sería inventar).
          </p>
          {observados > 0 && (
            <p data-papel="detalle-nivel" data-confianza="observacion_propia">
              <Etiqueta>† {observados} vistos en servicio</Etiqueta> No aparecen en ninguna fuente
              publicada. Lo afirmamos nosotros, con nombre y fecha, y queda en el historial del
              proyecto. <strong>No es un apaño</strong>: la flota real va siempre por delante de sus
              fuentes —el pliego es de octubre de 2025 y ni siquiera está adjudicado—, y un autobús
              llega a la calle mucho antes que a un documento. ⚠️ Es la fuente{' '}
              <strong>más débil</strong>: si mañana el registro oficial dice otra cosa,{' '}
              <strong>manda el registro</strong>, pero <strong>la contradicción se anota, no se borra</strong>.
            </p>
          )}
          <p data-papel="detalle-nivel" data-confianza="sin_verificar">
            <Etiqueta>? {marcados} sin procedencia</Etiqueta> No constan{' '}
            <strong>en ninguna parte</strong>: ni en el pliego, ni en busesmadrid. Vienen de un
            fichero heredado del proyecto anterior, <strong>sin matrícula y sin procedencia
            documentada</strong>. No se disfrazan de oficiales —su procedencia se cuenta aquí—, pero
            tampoco se les grita encima: es probable que el dato sea correcto, simplemente{' '}
            <strong>no lo podemos demostrar</strong>.
          </p>
        </div>
      </Familia>

      {/* ═══ FAMILIA 3 ═══════════════════════════════════════════════════════ */}
      <Familia titulo="Los límites, dichos en voz alta" nota="Lo que sabemos ver, lo que no, y lo que pasa cuando no sabemos.">
        <div className="flex flex-col gap-3">
          <Bloque
            titulo="Los desvíos que SÍ detectamos"
            fuente="Cruce: recorrido oficial (GTFS) × ruta real de hoy (Avanza)"
          >
            <p>
              El recorrido que ves es el de <strong>hoy</strong> —la ruta que Avanza publica para
              esta jornada—, <strong>no el plano oficial</strong>, haya desvío o no. Lo comparamos
              con el recorrido oficial del GTFS: lo que está en el GTFS y <strong>no</strong> en la
              ruta de hoy, el autobús <strong>ya no pasa</strong>, y se tacha; lo que está en la ruta
              y <strong>no</strong> en el GTFS: <strong>parada provisional</strong>, y se pinta como
              tal. (Si esa ruta de hoy no se puede leer, se pinta el oficial y se avisa.)
            </p>
            <p className="mt-2">
              <strong>Se auto-apaga</strong>: el día que restauren la calle las dos listas vuelven a
              coincidir y el aviso desaparece solo. No hay ninguna lista de desvíos que mantener — y
              un aviso que hay que acordarse de apagar acaba mintiendo. Si el cruce sale absurdo,
              decimos <strong>«no lo sabemos»</strong> en vez de tachar media línea.
            </p>
            <p className="mt-2">
              Eso es la <strong>vista de línea</strong>, que se comprueba <strong>al abrirla</strong>.
              Pero en una <strong>parada</strong>, la lista de «líneas que pasan por aquí» —y las que
              hoy pasan por un desvío— sale de un <strong>índice que se rehace cada noche</strong>, no
              en caliente. Así que puede ir <strong>hasta un día por detrás</strong>, y en las{' '}
              <strong>dos direcciones</strong>: un desvío que empieza hoy puede no aparecer hasta esta
              noche, y uno que terminó de madrugada puede seguir listado hasta la siguiente
              reconstrucción. La <strong>edad exacta</strong> de ese índice no la ponemos en la
              pantalla de la parada —sería ruido para quien espera el autobús—; vive en{' '}
              <a
                className="font-semibold underline underline-offset-2"
                href="/api/diag"
                target="_blank"
                rel="noreferrer"
              >
                /api/diag
              </a>{' '}
              y en el panel, con los postes provisionales que aún no tienen coordenada.
            </p>
          </Bloque>

          {/* ⚠️ INTACTO. Ni una coma. */}
          <Bloque titulo="Lo que NO detectamos" fuente="La asimetría, dicha en voz alta." alerta>
            <p>
              Detectamos <strong>desvíos de ruta</strong> (el autobús no pasa por la calle): la ruta
              operativa cambia y la fuente lo refleja.
            </p>
            <p className="mt-2">
              <strong>NO detectamos supresiones de parada</strong> (el autobús pasa pero no para). La
              ruta no cambia, así que <strong>ninguna fuente lo dice</strong>. Está comprobado: con el
              comunicado de Avanza diciendo por escrito que una parada estaba suprimida, su propia API
              seguía anunciando autobuses en ella. Ponen el cartel en la marquesina y no desconectan el
              poste.
            </p>
          </Bloque>

          {/* ⚠️ INTACTO. Ni una coma. */}
          <Bloque titulo="Un autobús que no conocemos" fuente="Se dice. No se rellena.">
            <p>
              Si Avanza anuncia un coche que no está en ninguna de las dos listas, la pantalla pone{' '}
              <strong>«Sin datos de este autobús»</strong>. Nunca un valor por defecto: un valor por
              defecto miente, y encima con toda la confianza del mundo.
            </p>
          </Bloque>
        </div>
      </Familia>
    </div>
  );
}

/**
 * ⭐ LA CABECERA DE FAMILIA. La jerarquía la hace el TAMAÑO y el PESO, no la
 * superficie: con un salto papel/fondo de 1.10:1 (ver `/interno/sistema-visual`),
 * meter más tarjetas no jerarquiza nada. Va sobre el lienzo, sin caja, y por eso
 * se lee como divisoria — también en escala de grises.
 */
function Familia({ titulo, nota, children }: { titulo: string; nota: string; children: React.ReactNode }) {
  return (
    <section data-papel="familia">
      <h2 className="text-seccion font-black leading-snug sin-recortar">{titulo}</h2>
      <p className="mb-3 mt-0.5 text-nota text-[var(--color-tinta-tenue)] sin-recortar">{nota}</p>
      {children}
    </section>
  );
}

/** Una fuente dentro de la familia 1. NO es una tarjeta: es una fila de la tarjeta. */
function Fuente({ titulo, fuente, children }: { titulo: string; fuente: string; children: React.ReactNode }) {
  return (
    <div className="p-4" data-papel="fuente-dato">
      <h3 className="text-cuerpo font-black leading-snug sin-recortar">{titulo}</h3>
      <p className="mt-0.5 text-micro font-semibold uppercase not-italic tracking-wide text-[var(--color-tinta-tenue)] sin-recortar">
        {fuente}
      </p>
      <div className="mt-2 text-menor leading-relaxed not-italic text-[var(--color-tinta-suave)] sin-recortar">
        {children}
      </div>
    </div>
  );
}

/** El matiz. Más pequeño y más tenue que el cuerpo: se ve que es de segundo orden. */
function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-nota leading-relaxed text-[var(--color-tinta-tenue)] sin-recortar">⚠️ {children}</p>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <strong className="text-[var(--color-tinta)]">{children} ·</strong>;
}

function Bloque({
  titulo, fuente, alerta = false, children,
}: {
  titulo: string;
  fuente: string;
  alerta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-panel border bg-[var(--color-papel)] p-4 ${alerta ? 'es-sin-verificar' : 'border-[var(--color-borde)]'}`}
      data-papel="bloque-datos"
    >
      <h3 className="text-cuerpo font-black leading-snug sin-recortar">{titulo}</h3>
      <p className="mt-0.5 text-micro font-semibold uppercase not-italic tracking-wide text-[var(--color-tinta-tenue)] sin-recortar">
        {fuente}
      </p>
      <div className="mt-2 text-menor leading-relaxed not-italic text-[var(--color-tinta-suave)] sin-recortar">
        {children}
      </div>
    </section>
  );
}
