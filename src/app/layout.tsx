import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { AvisoFeed } from '@/components/AvisoFeed';
import { Marca } from '@/components/Marca';
import { NOMBRE_MARCA } from '@/components/marca-fuente';

/**
 * ⭐ INTER, SELF-HOSTED. `next/font/google` descarga la fuente EN EL BUILD y la
 * sirve desde nuestro propio dominio: "no requests are sent to Google by the
 * browser" (doc oficial de Next, `13-fonts.md`). Es lo que pidió Antonio —
 * privacidad + sin depender de un CDN—, y es el modo Next, no un `<link>`.
 *
 * Inter es variable: no hace falta declarar pesos. Se expone como la variable
 * CSS `--font-inter`, que `globals.css` cablea a `--font-sans` (el token de
 * familia). Un solo sitio decide la tipografía de toda la app.
 */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

/**
 * ⭐ EL TÍTULO ES UNA PLANTILLA, no un texto por página. El layout declara el molde
 * (`ZetaBus | %s`) y cada página aporta SOLO su parte (`Sobre los datos` →
 * `ZetaBus | Sobre los datos`). El nombre de la marca vive en UN sitio
 * (`marca-fuente.ts`), el mismo que pinta el wordmark: no se teclea "ZetaBus" en cada
 * página. `default` (obligatorio con `template`) cubre las rutas sin título propio.
 *
 * ⛔ FUERA LA COLETILLA "el autobús de Zaragoza, ahora" que vivía aquí: con la
 *    plantilla, el título dice lo que ES CADA PÁGINA (mejor que un eslogan repetido en
 *    todas). El eslogan, si hace falta, es cosa de la home, no del molde.
 */
export const metadata: Metadata = {
  title: {
    template: `${NOMBRE_MARCA} | %s`,
    default: NOMBRE_MARCA,
  },
  description:
    'Los autobuses que hay AHORA MISMO en la calle, con la edad del dato a la vista. Sin inventar lo que no se sabe.',
};

/**
 * ⚠️ `width=device-width` Y NADA MÁS. Sin `maximum-scale`, sin `user-scalable=no`.
 *
 * Impedir el zoom en una app que se usa DE PIE, EN LA CALLE, deja fuera a quien
 * no ve bien. Y quien no ve bien es exactamente quien más necesita saber si el
 * autobús llega en 2 minutos o en 12.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={inter.variable}>
      {/* `font-sans` usa el token `--font-sans` (= Inter), fijado en globals.css. */}
      <body className="min-h-dvh font-sans">
        {/* ⚠️ El feed caducado se anuncia ARRIBA DEL TODO, en todas las páginas.
            Afecta a los recorridos de TODA la app, no a una parada concreta. */}
        <AvisoFeed />

        {/* ⛔ AQUÍ HABÍA UNA BANDA ROJA — "MODO DEMO ENCENDIDO · LOS DATOS PUEDEN
            SER FINGIDOS"— Y AFIRMABA ALGO FALSO.

            `ZETABUS_DEMO=1` no finge nada: solo desbloquea la lectura de `?fingir=`.
            Sin ese parámetro en la URL los datos son REALES, y se comprobó byte a
            byte. La banda confundía "la puerta está abierta" con "ha entrado
            alguien" — y este layout es justo lo único que NO puede saber si la
            página que envuelve está fingiendo.

            ⇒ La marca se ha movido a donde SÍ se sabe: cada página pinta
              <Fingiendo/> con su fingimiento concreto, y solo si lo hay.
              Ver `components/Fingiendo.tsx`. */}
        {/* ⛔ AQUÍ HABÍA UNA COLETILLA — "el autobús de Zaragoza, ahora" — Y COMPETÍA
            CON EL BUSCADOR. Es un eslogan, y en la cabecera lo único que importa es
            encontrar tu línea o tu parada. El eslogan NO se pierde: sigue en el
            <title> de metadata (`title` arriba), que es su sitio —pestaña del
            navegador y resultado de búsqueda—, no la barra de la app.

            ⚠️ `justify-center`: la marca va CENTRADA en la cabecera. Quitar la
            coletilla NO la centró —solo dejó el hueco a su derecha, alineada a la
            izquierda—; centrar es un acto aparte, y este es. Medido: el centro de la
            marca coincide con el de la cabecera (`justify-center` reparte el hueco a
            los dos lados). Sigue siendo enlace a `/` y ≥44 px de zona táctil. */}
        {/* ⚠️ `py-1` (4 px), no `py-2`: la banda se ceñía poco al contenido —61 px con una marca
            de 20—. Baja a ~53 px y el espacio ganado va al contenido (en móvil se agradece). NO
            puede bajar más sin comerse la zona táctil de 44 px de la marca (WCAG 2.5.5), que es el
            suelo real del alto: los 44 mandan sobre la banda. Medido en navegador, ver Marca.tsx. */}
        <header className="border-b border-[var(--color-borde)] bg-[var(--color-papel)]">
          <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-1">
            <Marca />
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-3 pb-16">{children}</main>

        {/*
          ⭐ B14 · EL PIE, CORTO. PERO LA LICENCIA NO SE NEGOCIA.
          ═════════════════════════════════════════════════════════════════════
          Antonio pidió acortarlo. Y tenía razón: tres líneas de créditos debajo
          de un autobús que llega en 2 minutos son ruido.

          ⚠️ PERO ACORTARLO NO PUEDE CARGARSE LA ATRIBUCIÓN. La licencia de datos
          abiertos del MITMS **exige** tres cosas, y NO son opcionales:

              1. la fórmula «Powered by MITRAMS»
              2. con ENLACE a https://www.transportes.gob.es/
              3. e indicar si el dato es **bruto o PROCESADO**

          ⛔ Y HOY NO SE CUMPLÍAN. El pie decía "GTFS oficial del NAP (Ministerio
             de Transportes)" —que suena bien y no vale—: sin la fórmula, sin el
             enlace y sin decir que lo procesamos. **Era un incumplimiento, no un
             descuido de estilo.** Se arregla aquí.

          ⚠️ Y lo que hacen otros NO es el criterio. Miré ZGZ Radar, que consume
             exactamente estos datos: **no tiene atribución ninguna.** Eso no nos
             autoriza a nada. Si mañana alguien de Avanza o del Ministerio abre
             esto, el pie es lo primero que va a mirar.

          El resto —licencias, qué se redistribuye y qué no, y por qué— vive
          entero en `/sobre-los-datos`, a un toque.
        */}
        {/* ⚠️ DOS PARTES, Y A PROPÓSITO. La PROSA (la atribución) va con interlineado
            normal; los ENLACES van en su propia fila. ¿Por qué no todo en un párrafo? Un
            enlace táctil de 44 px (WCAG 2.5.5) metido EN el texto revienta el interlineado
            de las líneas que lo rodean —medido: el pie quedaba grumoso, con huecos enormes—.
            Separados, la prosa se lee tersa y cada enlace es cómodo de pulsar. */}
        <footer className="mx-auto max-w-2xl px-4 pb-8" data-papel="pie">
          {/* ⚠️ LA FUENTE, NOMBRADA: el GTFS lo publica Avanza en el Punto de Acceso
              Nacional, y lo procesamos (las tres cosas que la licencia obliga a decir).
              Antes decía "GTFS del Powered by MITRAMS" —`del` pedía un nombre y había una
              FÓRMULA, no castellano—. El detalle largo vive en /sobre-los-datos. */}
          <p className="text-nota leading-relaxed text-[var(--color-tinta-tenue)] sin-recortar">
            Recorridos: GTFS de Avanza Zaragoza (Punto de Acceso Nacional), procesados. Tiempo real:
            Avanza Zaragoza.
          </p>
          {/* Los dos enlaces, en su fila. MISMO tratamiento exacto (mismas clases) y ≥44 px
              de zona táctil cada uno. El de MITRAMS es INTOCABLE: fórmula «Powered by
              MITRAMS» LITERAL + enlace a transportes.gob.es, que exige la licencia del MITMS
              (THIRD-PARTY-NOTICES.md §1) — no es estilo. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-5 text-nota text-[var(--color-tinta-tenue)]">
            <a
              href="https://www.transportes.gob.es/"
              className="inline-flex min-h-[var(--control)] items-center font-semibold underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              data-papel="atribucion-mitrams"
            >
              Powered by MITRAMS
            </a>
            <Link
              href="/sobre-los-datos"
              className="inline-flex min-h-[var(--control)] items-center font-semibold underline underline-offset-2"
            >
              Sobre los datos
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
