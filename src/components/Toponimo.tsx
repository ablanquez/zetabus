import type { ReactNode } from 'react';

/**
 * ⭐⭐ <Toponimo> · UN NOMBRE DE LUGAR QUE HEMOS CORREGIDO, PROTEGIDO DEL TRADUCTOR
 * DEL NAVEGADOR PERO SIN AFIRMAR QUE SEA UNA CITA LITERAL. HERMANO DE <Cita>.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  POR QUÉ NO ES UNA <Cita>. <Cita> marca lo VERBATIM: se pinta tal cual sale de
 *  la fuente, con su `data-cita`. Los DESTINOS del GTFS no son verbatim: los
 *  REESCRIBIMOS para arreglar el ucwords ("Siglo Xxi" → "Siglo XXI"). Meterlos en
 *  <Cita> sería mentir en el marcador —diría "literal de la fuente" sobre un texto
 *  que hemos cambiado—. Ver `engine/rumbo.ts` (corregirDestino) y /sobre-los-datos.
 *
 *  POR QUÉ SÍ NECESITAN PROTECCIÓN. Siguen siendo TOPÓNIMOS de Zaragoza, y el
 *  traductor del navegador los reescribe igual de silenciosamente que a una cita:
 *  "San José" → "Saint Joseph", "Plaza Aragón" → "Aragon Square", "Estación
 *  Delicias" → "Delights Station". `translate="no"` se lo impide (y se hereda a los
 *  hijos). El ataque viene de FUERA del código: por eso vive en un componente y no
 *  en un atributo suelto —la ley de las 26 copias—, igual que <Cita>.
 *
 *  ⇒ LA DIFERENCIA, EN UNA LÍNEA:
 *      <Cita>      → dato externo VERBATIM   (data-cita,     translate="no")
 *      <Toponimo>  → topónimo CORREGIDO por  (data-toponimo, translate="no")
 *                    nosotros, ya no verbatim
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Mínimo, como <Cita>: `translate="no"` (la defensa) y `data-toponimo` (marcador
 *    SIN valor, para que el guardián lo enumere en el DOM). Nada más.
 */
export function Toponimo({ children }: { children: ReactNode }) {
  return (
    <span translate="no" data-toponimo>
      {children}
    </span>
  );
}
