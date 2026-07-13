import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { AvisoFeed } from '@/components/AvisoFeed';
import { demoEncendido } from '@/engine/fingir';

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
    <html lang="es">
      <body className="min-h-dvh">
        {/* ⚠️ El feed caducado se anuncia ARRIBA DEL TODO, en todas las páginas.
            Afecta a los recorridos de TODA la app, no a una parada concreta. */}
        <AvisoFeed />

        {/* ⚠️ EL MODO DEMO NO PUEDE PASAR DESAPERCIBIDO.
            Si está encendido, la pantalla puede estar enseñando datos FINGIDOS.
            Un modo de prueba invisible es una fábrica de pantallas falsas — que
            es exactamente lo que este proyecto persigue. Así que se grita. */}
        {demoEncendido() && (
          <div
            className="bg-[var(--color-alerta)] px-4 py-1.5 text-center text-[11px] font-black uppercase tracking-wide text-white"
            data-papel="banda-demo"
          >
            ⚠ modo demo encendido · los datos pueden ser FINGIDOS
          </div>
        )}

        <header className="border-b border-[var(--color-borde)] bg-[var(--color-papel)]">
          <div className="mx-auto flex max-w-2xl items-baseline gap-2 px-4 py-2">
            <Link href="/" className="text-[17px] font-black tracking-tight">
              ZetaBus
            </Link>
            <span className="text-[11px] text-[var(--color-tinta-tenue)] sin-recortar">
              el autobús de Zaragoza, ahora
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-3 pb-16">{children}</main>

        <footer className="mx-auto max-w-2xl px-4 pb-8 text-[11px] leading-relaxed text-[var(--color-tinta-tenue)] sin-recortar">
          Recorridos: GTFS oficial del NAP (Ministerio de Transportes). Llegadas en tiempo real:
          Avanza Zaragoza, consultadas como cliente. ZetaBus no redistribuye sus datos.
        </footer>
      </body>
    </html>
  );
}
