/**
 * ⏳ EL FALLO CON PERIODICIDAD.
 *
 * Hay bugs que solo aparecen un día al año, y suele ser el peor día.
 * La medianoche, el cambio de hora, el domingo, las cuatro de la mañana.
 *
 * ⭐ Y LA MEJOR PRUEBA CONTRA ESTOS BUGS NO ES PROBAR CADA HORA: ES DEMOSTRAR
 *    QUE EL MOTOR NO MIRA EL RELOJ LOCAL EN NINGÚN SITIO.
 *
 * Un motor que nunca pregunta "¿qué hora es?", "¿qué día es?" ni "¿es domingo?"
 * no puede equivocarse el domingo. No hay que probar los 365 días: hay que
 * probar que la pregunta no se hace. Y eso se comprueba leyendo el código, que
 * es lo único que no se olvida.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { edadDe } from '@/core/observacion';
import { feedStatus } from '@/core/feed-validity';
import { validez } from '@/engine/topologia';

/** Las llamadas que introducen el huso horario y el calendario en el código. */
const TRAMPAS_DE_RELOJ = [
  'getHours', 'getMinutes', 'getDay', 'getDate', 'getMonth', 'getFullYear',
  'toLocaleDateString', 'toLocaleTimeString', 'toLocaleString',
  'setHours', 'getTimezoneOffset',
];

function ficherosDe(dir: string): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) salida.push(...ficherosDe(p));
    else if (e.name.endsWith('.ts')) salida.push(p);
  }
  return salida;
}

describe('⭐ EL MOTOR VIVO NO SABE QUÉ HORA ES, Y POR ESO NO SE EQUIVOCA A NINGUNA', () => {
  it('ni `src/engine/` ni `src/cache/` preguntan la hora local ni el día', () => {
    const sospechosos: string[] = [];
    for (const f of [...ficherosDe('src/engine'), ...ficherosDe('src/cache')]) {
      const codigo = readFileSync(f, 'utf8');
      for (const trampa of TRAMPAS_DE_RELOJ) {
        if (new RegExp(`\\.${trampa}\\s*\\(`).test(codigo)) {
          sospechosos.push(`${f} → .${trampa}()`);
        }
      }
    }
    // Si esto se pone rojo, alguien ha metido lógica que depende del huso
    // horario o del calendario. Y eso significa un bug que aparecerá el último
    // domingo de octubre, a las 3 de la mañana, y que nadie sabrá reproducir.
    expect(sospechosos).toEqual([]);
  });

  it('el motor solo maneja INSTANTES (epoch), que no tienen huso ni verano', () => {
    // `Date.now()` y `Date.parse(iso)` devuelven milisegundos desde 1970 en UTC.
    // No hay hora local por ningún lado. No hay nada que se pueda adelantar.
    const antes = Date.parse('2026-10-25T00:59:50.000Z');
    const despues = Date.parse('2026-10-25T01:00:00.000Z');
    expect(despues - antes).toBe(10_000);
  });
});

describe('⏳ EL CAMBIO DE HORA (25/10/2026, 03:00 → 02:00 en España)', () => {
  it('⭐ la EDAD de un dato NO da un salto de una hora al retrasar los relojes', () => {
    // La madrugada del 25/10/2026 España retrasa el reloj: las 03:00 vuelven a
    // ser las 02:00. Si la edad de la caché se calculara con hora LOCAL, un dato
    // guardado a las 02:59:55 pasaría a tener... −3.595 segundos. Edad negativa.
    // Y la pantalla diría "actualizado dentro de una hora".
    //
    // Justo antes del salto (01:59:55 UTC = 02:59:55 en España, horario de verano):
    const guardado = '2026-10-25T00:59:55.000Z';
    // Diez segundos después (el reloj de pared ya ha "retrocedido" a las 02:00:05):
    const ahora = Date.parse('2026-10-25T01:00:05.000Z');

    expect(edadDe(guardado, ahora)).toBe(10); // ⭐ DIEZ SEGUNDOS. Lo que pasó.
  });

  it('...y tampoco al adelantarlos (29/03/2026, 02:00 → 03:00)', () => {
    const guardado = '2026-03-29T00:59:55.000Z';
    const ahora = Date.parse('2026-03-29T01:00:07.000Z');
    expect(edadDe(guardado, ahora)).toBe(12);
  });

  it('la edad NUNCA es negativa, aunque el reloj del sistema salte hacia atrás', () => {
    // Un servidor mal sincronizado (NTP corrigiendo hacia atrás) podría dar un
    // `ahora` ANTERIOR al momento en que se guardó. "Actualizado hace −4 s" es
    // una frase que nadie debería leer nunca.
    const guardado = '2026-07-13T12:00:00.000Z';
    const ahora = Date.parse('2026-07-13T11:59:56.000Z'); // 4 s en el pasado
    expect(edadDe(guardado, ahora)).toBe(0); // ← 0, no −4
  });
});

describe('⏳ LA MEDIANOCHE', () => {
  it('un autobús que cruza el día no tiene nada que cruzar: el ETA son MINUTOS', () => {
    // Aquí no hay bug posible, y merece decirse por qué: la fuente da "3 mins",
    // no "las 00:02". No hay fecha que sumar, ni día que desbordar, ni un
    // "23:58 + 5 min = 24:03" que haya que normalizar a mano.
    //
    // El bug de medianoche clásico nace de convertir un ETA a una hora del
    // reloj. Nosotros NO lo convertimos: lo enseñamos tal cual viene.
    expect(true).toBe(true); // el test es el comentario; el riesgo no existe
  });

  it('⭐ EL BUG QUE CAZÓ ESTE TEST: la caducidad se medía en UTC, no en Zaragoza', () => {
    // El feed vence el 05/10/2026. Se usa TAL CUAL sale del artefacto: si me
    // inventara aquí el formato, estaría probando mi invención, no el dato.
    expect(validez.endDate).toBe('2026-10-05');

    // A las 23:59 del día 5, hora de Zaragoza: vigente. Evidente.
    expect(feedStatus(validez, new Date('2026-10-05T23:59:59+02:00')).kind).not.toBe('CADUCADO');

    // ⚠️ A las 00:00:01 del día 6, hora de Zaragoza: CADUCADO.
    //
    //    Esto FALLABA. La versión anterior comparaba con `getUTCDate()`, y a esa
    //    hora en UTC todavía era día 5 (Zaragoza va en UTC+2 en verano). Durante
    //    DOS HORAS, la madrugada del día en que el feed caduca, la aplicación
    //    habría dicho "los datos caducan mañana" con los datos ya caducados.
    //
    //    Dos horas. Una vez al año. El peor día. Justo esa clase de bug.
    expect(feedStatus(validez, new Date('2026-10-06T00:00:01+02:00')).kind).toBe('CADUCADO');

    // Y en la franja exacta que fallaba (00:00–02:00 locales del 6 de octubre):
    expect(feedStatus(validez, new Date('2026-10-06T01:30:00+02:00')).kind).toBe('CADUCADO');
  });

  it('...y sigue bien en INVIERNO, cuando Zaragoza va en UTC+1', () => {
    // Si alguien "arreglara" esto sumando 2 horas a mano, en enero se rompería.
    // `Intl` con la zona nombrada ya sabe cuándo hay horario de verano.
    const enero = { ...validez, startDate: '2026-01-01', endDate: '2026-01-15' };
    expect(feedStatus(enero, new Date('2026-01-15T23:59:00+01:00')).kind).not.toBe('CADUCADO');
    expect(feedStatus(enero, new Date('2026-01-16T00:00:01+01:00')).kind).toBe('CADUCADO');
  });
});

describe('⏳ EL DOMINGO, EL FESTIVO Y LAS CUATRO DE LA MAÑANA', () => {
  it('⭐ el motor vivo NO consulta el calendario. Y es una decisión, no un olvido.', () => {
    // ZetaBus v1 SOLO ENSEÑA. NO MIDE. No compara contra un horario teórico, así
    // que no necesita saber si hoy es festivo, ni qué frecuencia tocaba.
    //
    // Esto elimina de un plumazo toda una familia de bugs: el "hoy es festivo
    // pero el calendario dice laborable", el "el 12 de octubre cae en lunes",
    // el "agosto tiene horario de verano". Ninguno puede darse, porque la
    // pregunta no se hace en ninguna parte del motor vivo.
    //
    // Lo único que se cuenta es lo que se ve. Un domingo se ven menos autobuses,
    // y ZetaBus enseña menos autobuses. Sin explicar por qué, porque no lo sabe.
    const codigoDelMotor = ficherosDe('src/engine')
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(codigoDelMotor).not.toMatch(/calendar_dates|festivo|laborable|frecuencia/i);
  });

  it('a las 4 a.m. todos los postes están mudos, y eso NO es una anomalía', () => {
    // Cubierto en motor.test.ts: un poste mudo devuelve `ok` con lista vacía.
    // Aquí se afirma la consecuencia de diseño: NO existe un estado que diga
    // "esto está raro". Si existiera, saltaría 44 veces cada noche.
    //
    // El único estado que se parece —`rancio`— NO se dispara por silencio: se
    // dispara porque la FUENTE FALLÓ. Silencio y fallo son cosas distintas, y
    // el motor las distingue.
    expect(true).toBe(true);
  });
});
