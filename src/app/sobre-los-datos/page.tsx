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
  const oficiales = flota.filter((v) => v.confidence === 'oficial').length;
  const marcados = flota.length - oficiales;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center text-[13px] font-semibold underline underline-offset-2"
        >
          ← volver
        </Link>
        <h1 className="mt-2 text-[24px] font-black leading-tight sin-recortar">Sobre los datos</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-tinta-suave)] sin-recortar">
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
        titulo={`⚠️ Lo que NO hemos podido verificar — ${marcados} vehículos`}
        fuente="Sin fuente oficial. Y así se marca."
        alerta
      >
        <p>
          <strong>{marcados} autobuses</strong> (uno de cada ocho) no constan en el registro oficial:
          son eléctricos entregados <strong>después</strong> de octubre de 2025. Su ficha viene de un
          fichero de elaboración manual heredado del proyecto anterior,{' '}
          <strong>sin matrícula y sin procedencia documentada</strong>.
        </p>
        <p className="mt-2">
          En pantalla van con un <strong>asterisco</strong> y el borde discontinuo. No se disfrazan
          de oficiales, y tampoco se les grita encima: es muy probable que el dato sea correcto —
          simplemente <strong>no lo podemos demostrar</strong>.
        </p>
        <p className="mt-2 text-[var(--color-tinta-tenue)]">
          Para poder quitar el asterisco haría falta una fuente citable con la{' '}
          <strong>matrícula</strong> de cada coche (un registro municipal actualizado, o el propio
          Avanza). No la tenemos, y <strong>no nos la inventamos</strong>.
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
      <h2 className="text-[16px] font-black leading-snug sin-recortar">{titulo}</h2>
      <p className="mt-0.5 text-[11px] font-semibold uppercase not-italic tracking-wide text-[var(--color-tinta-tenue)] sin-recortar">
        {fuente}
      </p>
      <div className="mt-2 text-[13px] leading-relaxed not-italic text-[var(--color-tinta-suave)] sin-recortar">
        {children}
      </div>
    </section>
  );
}
