import type { BusProfile } from '@/modes/bus/profile';

/**
 * LA FICHA DEL VEHÍCULO. Y CÓMO SE RESOLVIÓ LA FILA QUE NO CABÍA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ EL PROBLEMA, MEDIDO (no intuido) EN LA REFERENCIA A 360 px:
 *
 *     fila de chips con sangría `pl-[52px]`:
 *     [Bus 4650] [Articulado] [Diésel]  →  286 px usados de ~307 disponibles
 *
 * Caben. Con 21 píxeles de margen. Y ZetaBus quiere meter ahí ADEMÁS la
 * CONFIANZA ("sin verificar", ~90 px) y el "SIN DATOS". 286 + 90 = 376 > 307.
 *
 * ⇒ NO CABE. Y no es una sospecha: es una medida.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⭐ LA SOLUCIÓN NO ES ENCOGER LOS CHIPS. ES QUITAR LA SANGRÍA.
 *
 * Esos 52 px de sangría existían para alinear los chips bajo el destino, por
 * estética. Cuestan el 17% del ancho de un móvil. Aquí la ficha ocupa **el
 * ancho completo de la tarjeta** y se recuperan esos 52 px de golpe.
 *
 * ⭐ Y LA CONFIANZA NO ES UN CHIP MÁS. Ese era el error de raíz.
 *
 * "Sin verificar" no es un atributo del autobús como lo son "articulado" o
 * "diésel". Es una propiedad DE TODA LA FICHA: dice si te puedes fiar de las
 * otras tres. Ponerlo al lado, como un chip hermano, lo iguala con ellos — y
 * entonces compite por sitio con lo que está calificando.
 *
 * Va DEBAJO, en su propia línea, calificando el bloque entero. Y la señal no es
 * un color: es un BORDE PUNTEADO alrededor de la ficha (`.es-sin-verificar`),
 * que sobrevive al gris, al daltonismo y a un móvil al sol.
 *
 * ⚠️ Y NO ES UN CASO RARO: son 53 de 403 vehículos. UNO DE CADA OCHO.
 *
 * ⚠️ SIN DATOS ≠ SIN RAREZA.
 * La referencia, cuando no tenía la ficha, SIMPLEMENTE NO PINTABA NADA. La
 * ausencia de dato era indistinguible de la ausencia de novedad. Aquí, si no
 * hay ficha, SE DICE. Va a pasar: el registro oficial cubre el 87% de lo que
 * circula, porque un autobús nuevo llega antes a la calle que a un documento.
 */

const LARGO: Record<string, string> = {
  diesel: 'diésel',
  hibrido: 'híbrido',
  electrico: 'eléctrico',
};

const CLASE: Record<string, string> = {
  articulado: 'articulado',
  sencillo: 'sencillo',
  microbus_pmrs: 'microbús',
};

export function FichaVehiculo({ coche, perfil }: { coche: string; perfil: BusProfile | null }) {
  // ── SIN DATOS. Se dice. No se calla, no se rellena, no se aproxima. ────────
  if (perfil === null) {
    return (
      <div className="es-sin-datos mt-3 px-3 py-2 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar">
        <span className="font-bold not-italic">Coche {coche}</span>
        {' — '}
        <span>SIN DATOS de este vehículo.</span>
        <span className="block not-italic mt-0.5 text-[11px] text-[var(--color-tinta-tenue)]">
          No está en el registro oficial. No inventamos su modelo ni su tamaño.
        </span>
      </div>
    );
  }

  const oficial = perfil.confidence === 'oficial';
  const rasgos = [
    `${perfil.manufacturer} ${perfil.model}`,
    perfil.lengthMeters !== null ? `${perfil.lengthMeters} m` : null,
    CLASE[perfil.busClass] ?? perfil.busClass,
    perfil.fuel !== null ? (LARGO[perfil.fuel] ?? perfil.fuel) : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={`mt-3 px-3 py-2 ${oficial ? 'border border-[var(--color-borde)] rounded-lg bg-[var(--color-fondo)]' : 'es-sin-verificar bg-[var(--color-fondo)]'}`}
      data-confianza={perfil.confidence}
    >
      <p className="text-[12px] leading-snug text-[var(--color-tinta)] sin-recortar">
        <span className="font-bold">Coche {coche}</span>
        <span className="text-[var(--color-tinta-tenue)]"> · </span>
        {/* ⚠️ Separadores con espacios a los lados: si la línea se parte, se
            parte por un espacio y NO por la mitad de "articulado". */}
        {rasgos.join(' · ')}
      </p>

      {/* ⭐ LA PROCEDENCIA. Debajo, calificando la ficha ENTERA. No un chip más. */}
      <p className="mt-1 text-[11px] leading-snug sin-recortar" data-papel="procedencia">
        {oficial ? (
          <span className="text-[var(--color-tinta-tenue)]">
            <span aria-hidden="true">✓ </span>
            Dato oficial (Anexo 5 del pliego municipal)
          </span>
        ) : (
          <span className="font-semibold text-[var(--color-aviso)]">
            <span aria-hidden="true">⚠ </span>
            SIN VERIFICAR — no consta en el registro oficial
          </span>
        )}
      </p>
    </div>
  );
}
