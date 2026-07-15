import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { AvisoFeed } from '@/components/AvisoFeed';
import { Marca } from '@/components/Marca';
import { demoEncendido } from '@/engine/fingir';

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

export const metadata: Metadata = {
  title: 'ZetaBus · el autobús de Zaragoza, ahora',
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

        {/* ⚠️ EL MODO DEMO NO PUEDE PASAR DESAPERCIBIDO.
            Si está encendido, la pantalla puede estar enseñando datos FINGIDOS.
            Un modo de prueba invisible es una fábrica de pantallas falsas — que
            es exactamente lo que este proyecto persigue. Así que se grita. */}
        {demoEncendido() && (
          <div
            className="bg-[var(--color-alerta)] px-4 py-1.5 text-center text-nota font-black uppercase tracking-wide text-white"
            data-papel="banda-demo"
          >
            ⚠ modo demo encendido · los datos pueden ser FINGIDOS
          </div>
        )}

        <header className="border-b border-[var(--color-borde)] bg-[var(--color-papel)]">
          <div className="mx-auto flex max-w-2xl items-baseline gap-2 px-4 py-2">
            <Marca />
            <span className="text-nota text-[var(--color-tinta-tenue)] sin-recortar">
              el autobús de Zaragoza, ahora
            </span>
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
        <footer
          className="mx-auto max-w-2xl px-4 pb-8 text-nota leading-relaxed text-[var(--color-tinta-tenue)] sin-recortar"
          data-papel="pie"
        >
          Recorridos: GTFS del{' '}
          <a
            href="https://www.transportes.gob.es/"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
            data-papel="atribucion-mitrams"
          >
            <strong>Powered by MITRAMS</strong>
          </a>{' '}
          — <strong>datos procesados</strong>. Tiempo real: Avanza Zaragoza.{' '}
          <Link
            href="/sobre-los-datos"
            className="inline-flex min-h-[var(--control-min)] items-center font-semibold underline underline-offset-2"
          >
            Sobre los datos
          </Link>
        </footer>
      </body>
    </html>
  );
}
