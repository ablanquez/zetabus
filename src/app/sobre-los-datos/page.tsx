import Link from 'next/link';
import { generadoEn, validez } from '@/engine/topologia';
import artefacto from '@/generated';
import type { BusProfile } from '@/modes/bus/profile';

/**
 * ⭐ A5 · LA PROCEDENCIA SE MUEVE AQUÍ. NO SE PIERDE.
 *
 * En la tarjeta de cada autobús ponía "✓ Dato oficial (Anexo 5 del pliego
 * municipal)". En 350 de 403 vehículos. Es decir: en el 87%.
 *
 * **Eso no es una excepción: es la norma.** Y al que está esperando el autobús
 * en la marquesina le da exactamente igual de qué documento sale el dato: quiere
 * saber si el bus es el largo o el corto. La línea de procedencia le robaba
 * píxeles a lo único que había ido a mirar.
 *
 * Se enseña la excepción, no la norma. Pero la procedencia NO se tira: quien
 * quiera auditarnos tiene que poder, y aquí está entera, con sus enlaces y sus
 * cifras contadas del propio artefacto (no escritas a mano, que se desactualizan).
 */

export const metadata = {
  title: 'Sobre los datos · ZetaBus',
  description: 'De dónde sale cada dato de ZetaBus, y qué NO sabemos.',
};

interface Artefacto {
  readonly flota: Record<string, BusProfile>;
}

export default function SobreLosDatos() {
  // ⚠️ LAS CIFRAS SE CUENTAN, NO SE ESCRIBEN. Un "350 vehículos" a mano en el
  //    texto es un número que caduca en silencio el día que cambie el maestro.
  const flota = Object.values((artefacto as unknown as Artefacto).flota);
  const cuantos = (c: BusProfile['confidence']) => flota.filter((v) => v.confidence === c).length;
  const oficiales = cuantos('oficial');
  const secundarios = cuantos('fuente_secundaria');
  const observados = cuantos('observacion_propia');
  const marcados = cuantos('sin_verificar');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center text-menor font-semibold underline underline-offset-2"
        >
          ← volver
        </Link>
        <h1 className="mt-2 text-titulo font-black leading-tight sin-recortar">Sobre los datos</h1>
        <p className="mt-1 text-cuerpo leading-relaxed text-[var(--color-tinta-suave)] sin-recortar">
          De dónde sale cada cosa. Y, sobre todo, <strong>qué no sabemos</strong>.
        </p>
      </div>

      <Bloque titulo="Los autobuses que ves llegar" fuente="Avanza Zaragoza · gps.avanzabus.com">
        <p>
          Se piden en directo, uno por parada, y se guardan 15 segundos para no molestar. La pantalla
          escribe siempre <strong>la edad del dato</strong>: no decimos «se actualiza cada 20 s»,
          decimos cuándo se miró de verdad.
        </p>
        <p className="mt-2">
          ⚠️ Son los autobuses <strong>DETECTADOS</strong>, no todos: Avanza anuncia como mucho los
          dos siguientes de cada línea y sentido. Un tercero muy pegado a otros dos existe, circula
          lleno de gente, y <strong>no lo publica nadie</strong>.
        </p>
      </Bloque>

      <Bloque
        titulo="Las paradas, las líneas y los recorridos"
        fuente="GTFS oficial · Punto de Acceso Nacional (NAP) del Ministerio de Transportes"
      >
        <p>
          Se descarga y se hornea en el build. Nada se pide en caliente. Publica{' '}
          <strong>{validez.publisher}</strong>.{' '}
          <strong>Vigencia del feed: hasta el {validez.endDate}.</strong> Generado el{' '}
          {new Date(generadoEn).toLocaleDateString('es-ES')}. Cuando caduque, la aplicación lo dice
          arriba, en rojo, sin que nadie tenga que acordarse.
        </p>
      </Bloque>

      <Bloque
        titulo={`La ficha de cada autobús — ${oficiales} de ${flota.length} vehículos`}
        fuente="Anexo 5 del pliego municipal · expediente 0034140-25 · Ayuntamiento de Zaragoza"
      >
        <p>
          El modelo, la longitud, la clase y el combustible de{' '}
          <strong>{oficiales} vehículos</strong> salen del registro de flota adscrita al contrato,
          aprobado por el Gobierno de Zaragoza el 24/10/2025.
        </p>
        <p className="mt-2">
          <a
            className="font-semibold underline underline-offset-2"
            href="https://www.zaragoza.es/sede/servicio/contratacion-publica/7615"
            target="_blank"
            rel="noreferrer"
          >
            Ficha del expediente
          </a>
        </p>
        <p className="mt-2 text-[var(--color-tinta-tenue)]">
          ⚠️ Ese pliego <strong>está pendiente de adjudicar</strong>. Describe la flota a fecha de
          octubre de 2025, y <strong>no es un censo de lo que circula hoy</strong>.
        </p>
      </Bloque>

      <Bloque
        titulo={`* Fuente especializada, NO oficial — ${secundarios} vehículos`}
        fuente="busesmadrid.es · consultado el 14/07/2026"
      >
        <p>
          <strong>{secundarios} autobuses</strong> circulan y <strong>no</strong> están en el pliego:
          son eléctricos entregados <strong>después</strong> de octubre de 2025. Su ficha sale de{' '}
          <a
            className="font-semibold underline underline-offset-2"
            href="https://busesmadrid.es/autobuses-urbanos-de-zaragoza-s-a-auzsa/"
            target="_blank"
            rel="noreferrer"
          >
            busesmadrid.es
          </a>
          , una web especializada en flotas de autobuses.
        </p>
        <p className="mt-2">
          La hemos medido contra el pliego en los <strong>350 vehículos que están en los dos</strong>
          : acierta el <strong>100 % del fabricante y de la propulsión</strong>, y el{' '}
          <strong>98,6 % de las matrículas</strong>. Es muy buena. <strong>Pero no es oficial</strong>
          : las pocas matrículas que fallan son letras cambiadas de orden, la huella de una
          transcripción a mano. Donde es <strong>la única</strong> fuente, ese error{' '}
          <strong>no lo podemos detectar</strong> — y por eso llevan asterisco.
        </p>
        <p className="mt-2 text-[var(--color-tinta-tenue)]">
          De ahí sacamos <strong>matrícula, modelo y propulsión</strong>. La{' '}
          <strong>longitud no la publica</strong>, así que no la decimos: un articulado sale como
          «Articulado», sin metros. Deducir «18 m» del nombre del modelo es exactamente el error que
          estropeó 62 fichas del fichero anterior.
        </p>
      </Bloque>

      {observados > 0 && (
        <Bloque
          titulo={`† Visto circular — ${observados} vehículos`}
          fuente="Observación propia, con fecha. NO es una fuente citable."
        >
          <p>
            <strong>{observados} autobuses</strong> que <strong>hemos visto en servicio</strong> y que
            no aparecen en ninguna fuente publicada. Lo afirmamos nosotros, con nombre y fecha, y
            queda registrado en el historial del proyecto.
          </p>
          <p className="mt-2">
            No es un apaño temporal. <strong>La flota real va siempre por delante de sus fuentes</strong>
            : el pliego es de octubre de 2025 y <strong>ni siquiera está adjudicado</strong>. Un
            autobús llega a la calle mucho antes que a un documento — y mientras tanto, tú lo ves
            llegar.
          </p>
          <p className="mt-2 text-[var(--color-tinta-tenue)]">
            ⚠️ Es la fuente <strong>más débil de todas</strong>, y va marcada como tal. Si mañana el
            registro oficial dice otra cosa, <strong>manda el registro</strong> — pero{' '}
            <strong>la contradicción se anota, no se borra</strong>.
          </p>
        </Bloque>
      )}

      <Bloque
        titulo={`? Sin procedencia conocida — ${marcados} vehículos`}
        fuente="Sin ninguna fuente. Y así se marca."
        alerta
      >
        <p>
          <strong>{marcados} autobuses</strong> no constan <strong>en ninguna parte</strong>: ni en el
          pliego, ni en busesmadrid. Su ficha viene de un fichero heredado del proyecto anterior,{' '}
          <strong>sin matrícula y sin procedencia documentada</strong>.
        </p>
        <p className="mt-2">
          En pantalla van con una <strong>interrogación</strong> y el borde discontinuo. No se
          disfrazan de oficiales, y tampoco se les grita encima: es probable que el dato sea correcto
          — simplemente <strong>no lo podemos demostrar</strong>.
        </p>
      </Bloque>

      <Bloque titulo="Un autobús que no conocemos" fuente="Se dice. No se rellena.">
        <p>
          Si Avanza anuncia un coche que no está en ninguna de las dos listas, la pantalla pone{' '}
          <strong>«Sin datos de este autobús»</strong>. Nunca un valor por defecto: un valor por
          defecto miente, y encima con toda la confianza del mundo.
        </p>
      </Bloque>

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
    </div>
  );
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
      className={`rounded-2xl border bg-[var(--color-papel)] p-4 ${alerta ? 'es-sin-verificar' : 'border-[var(--color-borde)]'}`}
      data-papel="bloque-datos"
    >
      <h2 className="text-seccion font-black leading-snug sin-recortar">{titulo}</h2>
      <p className="mt-0.5 text-nota font-semibold uppercase not-italic tracking-wide text-[var(--color-tinta-tenue)] sin-recortar">
        {fuente}
      </p>
      <div className="mt-2 text-menor leading-relaxed not-italic text-[var(--color-tinta-suave)] sin-recortar">
        {children}
      </div>
    </section>
  );
}
