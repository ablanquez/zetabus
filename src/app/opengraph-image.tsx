import { ImageResponse } from 'next/og';
import { BANDERA, NOMBRE_MARCA, POSTE, STROKE_MARCA, VISTA, Z_PATH } from '@/components/marca-fuente';
import { lineas, paradas } from '@/engine/topologia';
import { URL_SITIO } from '@/sitio';

/**
 * ⭐⭐ LA TARJETA AL COMPARTIR EL ENLACE (Open Graph, 1200×630). Generada por código
 * con `ImageResponse` (convención `opengraph-image` de Next 16), no un PNG hecho fuera:
 * versionada, derivada, coherente con cómo trabaja el repo.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  PATRÓN (heredado de Linaje): la previsualización describe QUÉ ES la app —marca +
 *  esencia—, NUNCA un dato de sesión ni de usuario. Aquí: la marca, el nombre, un
 *  subtítulo, la URL y el tamaño de la red (44 líneas · 934 paradas), que son hechos
 *  del propio proyecto, no de nadie que la use.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ EL SÍMBOLO SALE DE LA FUENTE ÚNICA. Se interpola `Z_PATH` (+ `POSTE`/`BANDERA`)
 *    igual que en `app/icon.tsx`: NO se redibuja la Z (lo vigila `marca-z-unica.test.ts`,
 *    que exige un solo `d=` en `marca-fuente.ts`). Va como `<img>` con un data-URI SVG
 *    porque Satori (el motor de `ImageResponse`) renderiza SVG así, no como `<svg>` inline.
 *
 * ⚠️ HEX A PELO, y con el mismo motivo que el favicon: una imagen NO puede leer
 *    `var(--color-marca)`. Los valores son EXACTAMENTE los tokens del sistema visual
 *    (globals.css), y su copia está en el allowlist del guardián anti-hex
 *    (`tests/sistema-visual.test.ts`). Si el token cambia, hay que cambiarlo aquí.
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'ZetaBus — el autobús de Zaragoza en vivo, y cuando no lo sabe, lo dice';

// Valores de token (Satori no lee var()). Ver allowlist en tests/sistema-visual.test.ts.
const MARCA = '#7048e8'; //        --color-marca
const MARCA_POSTE = '#4e22b8'; //  --color-marca-poste
const TINTA = '#0f172a'; //        --color-tinta
const TINTA_SUAVE = '#475569'; //  --color-tinta-suave
const PAPEL = '#ffffff'; //        --color-papel

// La marca (Z + poste + bandera) desde la fuente única, como data-URI SVG. `${Z_PATH}`
// se interpola (no es un `d=` literal), así que la Z sigue viviendo solo en marca-fuente.ts.
const MARCA_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VISTA}">` +
  `<path d="${Z_PATH}" fill="none" stroke="${MARCA}" stroke-width="${STROKE_MARCA}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<line x1="${POSTE.x}" y1="${POSTE.yBase}" x2="${POSTE.x}" y2="${POSTE.yAlto}" stroke="${MARCA_POSTE}" stroke-width="${POSTE.grosor}" stroke-linecap="round"/>` +
  `<rect x="${BANDERA.x}" y="${BANDERA.y}" width="${BANDERA.ancho}" height="${BANDERA.alto}" rx="${BANDERA.radio}" fill="${MARCA_POSTE}"/>` +
  `</svg>`;
const MARCA_URI = `data:image/svg+xml;base64,${btoa(MARCA_SVG)}`;

// ⚠️ PROVISIONAL — el subtítulo lo elige Antonio (se le enseñan 3 opciones). No fijar sin su OK.
const SUBTITULO = 'Autobuses de Zaragoza en tiempo real. Y cuando no lo sabe, lo dice.';

export default function OpengraphImage() {
  const dominio = URL_SITIO.replace(/^https?:\/\//, '');
  const red = `${lineas().length} líneas · ${paradas().length} paradas`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPEL,
          padding: '88px 96px',
        }}
      >
        {/* Marca + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARCA_URI} width={188} height={188} alt="" />
          <div style={{ fontSize: 148, fontWeight: 900, color: TINTA, letterSpacing: -4 }}>
            {NOMBRE_MARCA}
          </div>
        </div>

        {/* Subtítulo — la esencia */}
        <div style={{ display: 'flex', fontSize: 52, lineHeight: 1.22, color: TINTA_SUAVE, maxWidth: 1000 }}>
          {SUBTITULO}
        </div>

        {/* Pie: dominio + tamaño de la red (derivado, no a mano) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: MARCA }}>{dominio}</div>
          <div style={{ display: 'flex', fontSize: 34, color: TINTA_SUAVE }}>{red}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
