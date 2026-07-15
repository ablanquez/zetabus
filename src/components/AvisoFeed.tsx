import { feedStatus, feedWarning } from '@/core';
import { validez } from '@/engine/topologia';

/**
 * ⚠️ EL GTFS CADUCA EL 05/10/2026. ESE DÍA, LA APP TIENE QUE DECIRLO.
 *
 * El dato lleva grabado en el artefacto desde la Tanda 2 y la lógica de vigencia
 * está probada desde entonces (incluido el bug de que la caducidad se medía en
 * UTC y no en la hora de Zaragoza — dos horas de mentira una vez al año).
 *
 * **Ésta es la tanda en la que ese trabajo por fin se VE.** Un feed caducado que
 * se sigue sirviendo miente en silencio: sus recorridos y sus paradas siguen
 * ahí, con la misma pinta de siempre, y nadie se entera. Esta banda es lo único
 * que separa a ZetaBus de mentir el 6 de octubre.
 *
 * Va en el LAYOUT, no en una pantalla: la caducidad afecta a los recorridos de
 * toda la aplicación, no a una parada concreta.
 *
 * ⚠️ Y SE CALLA CUANDO NO HAY NADA QUE DECIR (`feedWarning` → null). Un aviso
 * que sale siempre deja de ser un aviso a los tres días.
 */
export function AvisoFeed({ ahora = new Date() }: { ahora?: Date }) {
  const estado = feedStatus(validez, ahora);
  const texto = feedWarning(estado, validez);
  if (!texto) return null;

  const caducado = estado.kind === 'CADUCADO';

  return (
    <div
      className="border-b-2 border-dashed px-4 py-2"
      style={{
        background: 'var(--color-aviso-fondo)',
        borderColor: caducado ? 'var(--color-alerta)' : 'var(--color-aviso-borde)',
      }}
      data-papel="aviso-feed"
      data-estado={estado.kind}
      role="status"
    >
      <p className="mx-auto max-w-2xl text-nota font-semibold leading-snug sin-recortar"
         style={{ color: caducado ? 'var(--color-alerta)' : 'var(--color-aviso)' }}>
        {caducado ? '⛔ ' : '⚠ '}
        {texto}
      </p>
    </div>
  );
}
