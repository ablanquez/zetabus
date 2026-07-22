'use client';

/**
 * ⭐ A4 · EL ÚLTIMO CERROJO: cuando lo que revienta es el PROPIO LAYOUT.
 *
 * `error.tsx` vive DENTRO del layout: si el que falla es el layout, no llega a
 * pintarse nunca. Para eso está esto.
 *
 * ⚠️ Y por eso tiene que traer su propio `<html>` y su propio `<body>`: **está
 * sustituyendo al layout raíz**, no anidándose dentro. Lo dice la documentación
 * oficial sin rodeos (`…/file-conventions/error.md`):
 *
 *   > "Global error UI must define its own `<html>` and `<body>` tags, since it is
 *    replacing the root layout or template when active."
 *
 * ⇒ Sin `<html>`/`<body>`, esta página NO se pinta y volvemos a la pantalla en
 *   blanco de Next. Que es exactamente lo que venimos a evitar.
 *
 * ⚠️ Y AQUÍ NO HAY TAILWIND NI VARIABLES DE COLOR: si el layout ha reventado, el
 * CSS puede no haberse cargado. Los estilos van EN LÍNEA, a propósito. Una página
 * de emergencia que depende de que todo lo demás funcione no es una página de
 * emergencia.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: '24px 16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#ffffff',
          color: '#111111',
        }}
      >
        {/* ⚠️ El <title> a mano, y React 19 lo iza a <head>. NO se lee de `marca-fuente`
            A PROPÓSITO: ésta es la página de emergencia —sustituye al layout raíz cuando
            ha reventado—, y no depende de NINGÚN módulo por si el que ha fallado es justo
            ése. Es la MISMA excepción declarada que el "ZetaBus" del <h1> de abajo. */}
        <title>ZetaBus | Algo se ha roto</title>
        <main style={{ maxWidth: 480, margin: '0 auto' }} data-papel="global-error">
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#b91c1c',
            }}
          >
            Algo se ha roto
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 24, lineHeight: 1.2 }}>
            ZetaBus no ha podido arrancar
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.55, color: '#404040' }}>
            El fallo es <strong>nuestro</strong>. No dice nada sobre los autobuses: puede que estén
            llegando con toda normalidad.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              minHeight: 48,
              width: '100%',
              borderRadius: 12,
              border: 0,
              background: '#111111',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Volver a intentarlo
          </button>

          {/* ⛔ NI `error.message` NI EL STACK. Solo el hash, que no dice nada de
              lo que ha pasado pero permite cruzarlo con el log del servidor. */}
          {error.digest && (
            <p style={{ marginTop: 16, fontSize: 11, color: '#737373' }}>
              Referencia del fallo: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
