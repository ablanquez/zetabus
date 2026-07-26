/**
 * ⭐⭐ EL SITEMAP NO MIENTE. Y la mentira más cara es la incoherencia con robots.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  Un sitemap que lista una URL que `robots.txt` bloquea es una contradicción que
 *  Google marca ("Sitemap contains URLs which are blocked by robots.txt"). Como
 *  `robots` prohíbe `/parada/*`, meter una parada aquí —las 934 o las 9
 *  solo-barrido— sería justo eso. Este test lo IMPIDE.
 *
 *  ⚠️ CONTRAPRUEBA (rojo demostrado en bitácora): metiendo `/parada/617` en el
 *     sitemap, el test de coherencia se pone ROJO. Si pasara con la parada dentro,
 *     no probaría nada.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { lineas, generadoEn } from '@/engine/topologia';
import { URL_SITIO } from '@/sitio';

const entradas = sitemap();
const urls = entradas.map((e) => e.url);
const paths = urls.map((u) => new URL(u).pathname);

/** Los `disallow` de robots que son PREFIJOS de ruta (no patrones de query). */
function disallowsDeRuta(): string[] {
  const r = robots();
  const reglas = Array.isArray(r.rules) ? r.rules : [r.rules];
  const fuera = new Set<string>();
  for (const regla of reglas) {
    const d = regla?.disallow;
    for (const patron of Array.isArray(d) ? d : d ? [d] : []) {
      // Los patrones con comodín/query (`/*?fingir=`) no son prefijos de ruta: se
      // comprueban aparte (ninguna URL del sitemap lleva query, ver test dedicado).
      if (!patron.includes('*') && !patron.includes('?')) fuera.add(patron);
    }
  }
  return [...fuera];
}

describe('⭐ el sitemap es coherente con robots (la mentira más cara)', () => {
  it('⛔ NINGUNA URL del sitemap cae bajo un disallow de robots', () => {
    const bloqueados = disallowsDeRuta();
    expect(bloqueados).toContain('/parada/'); // sanity: robots sí bloquea paradas
    for (const p of paths) {
      for (const dis of bloqueados) {
        expect(p.startsWith(dis), `el sitemap lista "${p}", bloqueado por robots "${dis}"`).toBe(false);
      }
    }
  });

  it('no hay ninguna /parada/* en el sitemap (ni las 934 ni las 9 solo-barrido)', () => {
    expect(paths.some((p) => p.startsWith('/parada/'))).toBe(false);
  });

  it('robots declara Sitemap: apuntando al sitemap real', () => {
    expect(robots().sitemap).toBe(`${URL_SITIO}/sitemap.xml`);
  });
});

describe('⭐ el conjunto de URLs: 3 fijas + las 44 líneas, de lineas()', () => {
  it('las líneas salen de lineas() (si mañana hay 45, el sitemap tiene 45; no es número mágico)', () => {
    const deLineas = paths.filter((p) => p.startsWith('/linea/'));
    expect(deLineas.length).toBe(lineas().length);
    // y una por cada shortName real, sin duplicar
    const esperadas = lineas().map((l) => `/linea/${encodeURIComponent(l.shortName)}`).sort();
    expect(deLineas.sort()).toEqual(esperadas);
  });

  it('están las 3 fijas exactas', () => {
    expect(paths).toContain('/');
    expect(paths).toContain('/sobre-los-datos');
    expect(paths).toContain('/estado');
    // 3 fijas + las líneas, nada más
    expect(entradas.length).toBe(3 + lineas().length);
  });

  it('⛔ ninguna URL lleva ?sentido= (el sentido es query, no una URL distinta)', () => {
    for (const u of urls) {
      expect(u.includes('?'), `"${u}" no debe llevar query`).toBe(false);
      expect(new URL(u).search).toBe('');
    }
  });

  it('todas las URLs son ABSOLUTAS contra el dominio de producción (no localhost)', () => {
    for (const u of urls) {
      expect(u.startsWith(`${URL_SITIO}/`), `"${u}" debe ser absoluta contra ${URL_SITIO}`).toBe(true);
      expect(u).not.toContain('localhost');
    }
  });
});

describe('⭐ lastmod honesto: líneas = generadoEn del GTFS; fijas y /estado, sin lastmod', () => {
  it('cada línea lleva lastModified = generadoEn del GTFS (no new Date())', () => {
    const deLineas = entradas.filter((e) => new URL(e.url).pathname.startsWith('/linea/'));
    expect(deLineas.length).toBeGreaterThan(0); // no vacío (L47)
    for (const e of deLineas) {
      expect(e.lastModified, `${e.url}`).toBe(generadoEn);
    }
  });

  it('las 3 fijas (incl. /estado) NO llevan lastModified', () => {
    for (const ruta of ['/', '/sobre-los-datos', '/estado']) {
      const e = entradas.find((x) => new URL(x.url).pathname === ruta)!;
      expect(e.lastModified, `${ruta} no debe llevar lastmod`).toBeUndefined();
    }
  });

  it('nadie lleva priority ni changeFrequency (Google los ignora)', () => {
    for (const e of entradas) {
      expect(e.priority).toBeUndefined();
      expect(e.changeFrequency).toBeUndefined();
    }
  });
});
