/**
 * ⭐⭐ LA CONTRAPRUEBA DEL ENDPOINT DE REGENERACIÓN: QUE FALLA CERRADO.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  QUÉ SE PRUEBA AQUÍ, Y POR QUÉ ES ESTO Y NO OTRA COSA.
 *
 *  `POST /api/regenerar` lanza 74 peticiones contra Avanza. El fallo que hay que
 *  hacer imposible no es «el token es débil»: es **que el endpoint quede abierto
 *  cuando la variable de entorno NO ESTÁ**, porque ése es el fallo que ocurre solo
 *  —una variable que no se copió al panel de Hostinger— y no avisa de nada.
 *
 *  ⚠️ Y NO BASTA CON MIRAR EL CÓDIGO DE ESTADO. Un 503 que además haya lanzado el
 *     barrido sería un aprobado con el daño hecho. Por eso `next/server` está
 *     sustituido por un doble que **APUNTA el trabajo programado en vez de
 *     ejecutarlo**: así se puede afirmar que no se programó NADA, que es la
 *     afirmación que importa. Y de paso ningún test toca la red.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `vi.mock` se iza por encima de los imports: la lista tiene que nacer antes.
const { programado } = vi.hoisted(() => ({ programado: [] as unknown[] }));
vi.mock('next/server', () => ({
  after: (fn: unknown) => {
    programado.push(fn);
  },
}));

import { vaciarElTarroDelProceso } from '@/core/proceso';
import { barridoEnCursoDesdeMs, CERROJO_TTL_MS, tomarElCerrojo, vistaOficial } from '@/engine/barrido';
import { POST } from '@/app/api/regenerar/route';

const VARIABLE = 'ZETABUS_REGEN_TOKEN';
const BUENO = 'a'.repeat(48);

const pedir = (cabecera?: string): Promise<Response> =>
  POST(new Request('https://zetabus.antonioblanquez.es/api/regenerar', {
    method: 'POST',
    ...(cabecera === undefined ? {} : { headers: { authorization: cabecera } }),
  }));

const original = process.env[VARIABLE];

beforeEach(() => {
  programado.length = 0;
  vaciarElTarroDelProceso(); // el cerrojo vive en el tarro del proceso
  delete process.env[VARIABLE];
});

afterEach(() => {
  if (original === undefined) delete process.env[VARIABLE];
  else process.env[VARIABLE] = original;
});

describe('POST /api/regenerar · falla cerrado', () => {
  it('⭐ SIN la variable de entorno: 503, y NO programa ningún barrido', async () => {
    const res = await pedir(`Bearer ${BUENO}`);

    expect(res.status).toBe(503);
    // Lo que de verdad se está probando:
    expect(programado).toHaveLength(0);
    expect(barridoEnCursoDesdeMs()).toBeNull();

    const cuerpo = (await res.json()) as { error: string; detalle: string };
    expect(cuerpo.error).toBe('no configurado');
    // El mensaje nombra la variable: quien lo lee a las 02:00 tiene que saber cuál.
    expect(cuerpo.detalle).toContain(VARIABLE);
  });

  it('sin variable NI cabecera: sigue siendo 503, no 401 — no hay contra qué comparar', async () => {
    const res = await pedir();
    expect(res.status).toBe(503);
    expect(programado).toHaveLength(0);
  });

  it('⭐ con un token DEMASIADO CORTO: 503 (mal configurado), y tampoco ejecuta nada', async () => {
    process.env[VARIABLE] = 'corto123';
    // Incluso acertando el token entero, que es el caso peor.
    const res = await pedir('Bearer corto123');

    expect(res.status).toBe(503);
    expect(programado).toHaveLength(0);
    expect(barridoEnCursoDesdeMs()).toBeNull();
  });
});

describe('POST /api/regenerar · la puerta', () => {
  beforeEach(() => {
    process.env[VARIABLE] = BUENO;
  });

  it('sin cabecera Authorization: 401, y nada programado', async () => {
    const res = await pedir();
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
    expect(programado).toHaveLength(0);
    expect(barridoEnCursoDesdeMs()).toBeNull();
  });

  it('con un token equivocado del MISMO largo: 401', async () => {
    const res = await pedir(`Bearer ${'b'.repeat(48)}`);
    expect(res.status).toBe(401);
    expect(programado).toHaveLength(0);
  });

  it('con un token de OTRO largo: 401 y no revienta (los digests miden lo mismo)', async () => {
    const res = await pedir('Bearer x');
    expect(res.status).toBe(401);
    expect(programado).toHaveLength(0);
  });

  it('sin el esquema Bearer (token a pelo): 401', async () => {
    const res = await pedir(BUENO);
    expect(res.status).toBe(401);
    expect(programado).toHaveLength(0);
  });

  it('⭐ con el token bueno: 202, y AHORA SÍ hay exactamente un barrido programado', async () => {
    const res = await pedir(`Bearer ${BUENO}`);

    expect(res.status).toBe(202);
    expect(programado).toHaveLength(1);

    const cuerpo = (await res.json()) as { aceptado: boolean; resultadoEn: string };
    expect(cuerpo.aceptado).toBe(true);
    // La respuesta NO afirma que se haya regenerado nada: dice dónde se mira.
    expect(cuerpo.resultadoEn).toContain('/api/diag');
  });

  it('⭐ dos peticiones seguidas: la segunda es 409 y NO programa un segundo barrido', async () => {
    const primera = await pedir(`Bearer ${BUENO}`);
    const segunda = await pedir(`Bearer ${BUENO}`);

    expect(primera.status).toBe(202);
    expect(segunda.status).toBe(409);
    expect(programado).toHaveLength(1);

    const cuerpo = (await segunda.json()) as { desdeHaceSegundos: number };
    expect(cuerpo.desdeHaceSegundos).toBeGreaterThanOrEqual(0);
  });

  it('no se responde a GET: el módulo no exporta ninguna otra verbo', async () => {
    const modulo = await import('@/app/api/regenerar/route');
    expect(Object.keys(modulo).filter((k) => /^[A-Z]+$/.test(k))).toEqual(['POST']);
  });
});

describe('el cerrojo del barrido', () => {
  beforeEach(() => vaciarElTarroDelProceso());

  it('el segundo intento no lo toma, y dice cuánto lleva el primero', () => {
    const a = tomarElCerrojo(1_000);
    const b = tomarElCerrojo(4_000);

    expect(a.tomado).toBe(true);
    expect(b.tomado).toBe(false);
    if (!b.tomado) expect(b.desdeHaceMs).toBe(3_000);
  });

  it('soltarlo lo libera, y soltarlo dos veces no abre nada', () => {
    const a = tomarElCerrojo(1_000);
    if (!a.tomado) throw new Error('debería haberlo tomado');
    a.soltar();
    a.soltar();

    expect(barridoEnCursoDesdeMs()).toBeNull();
    expect(tomarElCerrojo(2_000).tomado).toBe(true);
  });

  it('⚠️ pasado el TTL se da por muerto: un barrido colgado no lo echa para siempre', () => {
    tomarElCerrojo(1_000);
    expect(tomarElCerrojo(1_000 + CERROJO_TTL_MS - 1).tomado).toBe(false);
    expect(tomarElCerrojo(1_000 + CERROJO_TTL_MS).tomado).toBe(true);
  });

  it('⚠️ el que caducó NO suelta el cerrojo del que vino después', () => {
    const viejo = tomarElCerrojo(1_000);
    const nuevo = tomarElCerrojo(1_000 + CERROJO_TTL_MS);
    expect(nuevo.tomado).toBe(true);

    if (viejo.tomado) viejo.soltar(); // llega tarde: no es suyo
    expect(barridoEnCursoDesdeMs()).toBe(1_000 + CERROJO_TTL_MS);
  });
});

describe('la vista del GTFS que barre (del artefacto horneado, no del zip)', () => {
  it('pide un sentido por cada sentido del GTFS, y conoce los postes', () => {
    const v = vistaOficial();

    // Sanity con suelo, no con un número exacto que caduque con el feed.
    expect(v.peticiones.length).toBeGreaterThan(60);
    expect(v.lineas).toBeGreaterThan(30);
    expect(v.oficial.postesGtfs.size).toBeGreaterThan(800);

    // Cada petición es una línea real y un sentido de Avanza (-1 / -2).
    for (const p of v.peticiones) {
      expect(p.lineaEtiqueta).not.toBe('');
      expect([-1, -2]).toContain(p.sentido);
    }

    // Y la ruta oficial de un sentido cualquiera no viene vacía.
    const primera = v.peticiones[0];
    const postes = v.oficial.postesDeSentido(primera.lineaEtiqueta, primera.sentido === -1 ? 0 : 1);
    expect(postes && postes.size).toBeGreaterThan(0);
  });
});
