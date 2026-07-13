/**
 * INTENTAR REVENTAR EL PARSER.
 *
 * Regla de la casa: si nada se rompe al primer intento, sospecha del test.
 * Por eso cada protección tiene su CONTRAPRUEBA: se desactiva, y se comprueba
 * que SIN ELLA el dato malo pasa. Una protección que no se puede desactivar y
 * ver fallar es una protección que no sabemos si protege.
 */

import { describe, expect, it } from 'vitest';
import { parsearPoste, PosteIlegible } from '@/sources/avanza/parse-poste';
import { parsearKml, KmlIlegible } from '@/sources/avanza/kml';
import { parsearRecorrido, RecorridoIlegible } from '@/sources/avanza/recorrido';
import { POSTE_MUDO, respuestaPoste, respuestaRecorrido } from './dobles';

const UN_BUS = { coche: '9001', linea: '039', destino: 'VADORREY', eta: 3 };
const OTRO = { coche: '9002', linea: '029', destino: 'SAN GREGORIO', eta: 11 };

describe('el parser lee lo que Avanza manda de verdad', () => {
  it('saca línea y destino aunque el <i> los deje PEGADOS en el texto', () => {
    // `.text` del <strong> devuelve "039VADORREY". Un regex que parta por
    // espacios se lleva la línea de propina o se come el destino.
    const r = parsearPoste(respuestaPoste({ buses: [UN_BUS] }));
    expect(r.llegadas[0].lineaCruda).toBe('039');
    expect(r.llegadas[0].destino).toBe('VADORREY'); // ← ni "039VADORREY" ni ""
    expect(r.llegadas[0].etaMinutos).toBe(3);
  });

  it('el marcador de la parada NO es un autobús', () => {
    // maquinas["0"] es la parada. El proyecto viejo lo habría contado como bus.
    const r = parsearPoste(respuestaPoste({ buses: [UN_BUS, OTRO] }));
    expect(r.vehiculos).toHaveLength(2); // 2, no 3
    expect(r.marcadorParada).not.toBeNull();
    expect(r.vehiculos.map((v) => v.coche)).toEqual(['9001', '9002']);
  });

  it('y NO se filtra por la clave "0", que sería filtrar por suerte', () => {
    // Aquí la parada NO va en la posición 0. Si el filtro fuera por índice,
    // este test contaría 2 buses y se comería uno de verdad.
    const crudo = JSON.parse(respuestaPoste({ buses: [UN_BUS, OTRO] })) as {
      maquinas: Record<string, unknown>;
    };
    const reordenado = {
      ...JSON.parse(respuestaPoste({ buses: [UN_BUS, OTRO] })),
      maquinas: { 0: crudo.maquinas['1'], 1: crudo.maquinas['2'], 2: crudo.maquinas['0'] },
    };
    const r = parsearPoste(JSON.stringify(reordenado));
    expect(r.vehiculos).toHaveLength(2);
    expect(r.marcadorParada).not.toBeNull();
  });
});

describe('⚠️ DEGRADACIÓN SILENCIOSA: cambia una clase CSS y el motor tiene que GRITAR', () => {
  it('si <strong> pasa a ser <b>, NO devuelve una lista vacía: se planta', () => {
    const roto = respuestaPoste({ buses: [UN_BUS, OTRO], claseStrong: 'b' });
    // Lo que NO puede pasar: devolver `{llegadas: []}` y que la pantalla diga
    // "no hay autobuses" tan tranquila. Eso es el fallo que perseguimos.
    expect(() => parsearPoste(roto)).toThrow(PosteIlegible);
    expect(() => parsearPoste(roto)).toThrow(/no tiene <strong>/);
  });

  it('⭐ CONTRAPRUEBA: sin el cruce de canales, la degradación PASARÍA', () => {
    // Simulamos un parser que solo mira `tablatiempos` (lo que hacía el viejo).
    // Avanza cambia el HTML de la tabla pero `maquinas` sigue bien.
    const roto = respuestaPoste({ buses: [UN_BUS, OTRO], claseStrong: 'b' });
    const soloTabla = (cuerpo: string) => {
      const d = JSON.parse(cuerpo) as { tablatiempos: string };
      // El "parser ingenuo": busca <strong>, no encuentra, devuelve vacío.
      return /<strong>/.test(d.tablatiempos) ? ['algo'] : [];
    };
    expect(soloTabla(roto)).toEqual([]); // ← CERO LLEGADAS. Sin un solo error.
    // Un motor así pinta "no hay autobuses previstos" con toda la confianza.
    // El nuestro, sobre EXACTAMENTE el mismo cuerpo, revienta:
    expect(() => parsearPoste(roto)).toThrow();
  });

  it('si `tablatiempos` pierde un coche que `maquinas` sí trae → contradicción', () => {
    const roto = respuestaPoste({ buses: [UN_BUS, OTRO], ocultarDeTablatiempos: ['9002'] });
    expect(() => parsearPoste(roto)).toThrow(/se contradice/);
    expect(() => parsearPoste(roto)).toThrow(/solo en maquinas: \[9002\]/);
  });

  it('y también al revés: en `tablatiempos` y no en `maquinas`', () => {
    const roto = respuestaPoste({ buses: [UN_BUS, OTRO], ocultarDeMaquinas: ['9002'] });
    expect(() => parsearPoste(roto)).toThrow(/solo en tablatiempos: \[9002\]/);
  });

  it('⭐ CONTRAPRUEBA del cruce: con los dos canales coherentes, NO grita', () => {
    // Si el cruce saltara siempre, los tests de arriba estarían pasando por el
    // motivo equivocado y el "detector" sería un detector de nada.
    expect(() => parsearPoste(respuestaPoste({ buses: [UN_BUS, OTRO] }))).not.toThrow();
  });

  it('si el coche del ENLACE no es el del TEXTO, tampoco nos lo creemos', () => {
    const bueno = respuestaPoste({ buses: [UN_BUS] });
    const manipulado = bueno.replace('9001 [3 mins]', '9999 [3 mins]');
    expect(() => parsearPoste(manipulado)).toThrow(/no coincide con el del texto/);
  });
});

describe('⚠️ NULL ISLAND: un autobús sin coordenadas NO SE PINTA', () => {
  it('sin coordenadas → posicion null, y se dice en los avisos', () => {
    const r = parsearPoste(respuestaPoste({ buses: [{ ...UN_BUS, lat: null, lon: null }] }));
    expect(r.vehiculos[0].posicion).toBeNull(); // ← NO {lat:0, lon:0}
    expect(r.avisos.join()).toMatch(/sin coordenadas/);
    // ⭐ Y LA LLEGADA SE CONSERVA: sabemos que viene, no sabemos dónde está.
    expect(r.llegadas).toHaveLength(1);
    expect(r.llegadas[0].etaMinutos).toBe(3);
  });

  it('(0,0) es el golfo de Guinea, no una parada de Zaragoza', () => {
    const r = parsearPoste(respuestaPoste({ buses: [{ ...UN_BUS, lat: 0, lon: 0 }] }));
    expect(r.vehiculos[0].posicion).toBeNull();
  });

  it('⭐ CONTRAPRUEBA: si la comprobación fuera `?? 0`, el bus acabaría en el mar', () => {
    // Esto es LITERALMENTE lo que hacía el proyecto viejo.
    const ingenuo = (m: { LAT?: number; LON?: number }) => ({ lat: m.LAT ?? 0, lon: m.LON ?? 0 });
    expect(ingenuo({})).toEqual({ lat: 0, lon: 0 }); // ← se pinta. En el mar. Sin avisar.
    // El nuestro, con la misma entrada, devuelve null y no pinta nada.
    const r = parsearPoste(respuestaPoste({ buses: [{ ...UN_BUS, lat: null, lon: null }] }));
    expect(r.vehiculos[0].posicion).toBeNull();
  });

  it('la coordenada de la PARADA también puede faltar', () => {
    const r = parsearPoste(respuestaPoste({ buses: [], parada: null }));
    expect(r.marcadorParada).toBeNull();
    expect(r.llegadas).toEqual([]);
  });
});

describe('⚠️ LOS EXTREMOS', () => {
  it('el poste mudo se lee sin drama: cero llegadas, cero error', () => {
    const r = parsearPoste(POSTE_MUDO);
    expect(r.llegadas).toEqual([]);
    expect(r.vehiculos).toEqual([]);
    expect(r.marcadorParada).toBeNull();
  });

  it('un poste con marcador pero sin buses (el caso del 262)', () => {
    const r = parsearPoste(respuestaPoste({ buses: [] }));
    expect(r.llegadas).toEqual([]);
    expect(r.marcadorParada).toEqual({ lat: 41.649996, lon: -0.876037 });
  });

  it('eta = 0 es válido: el autobús está entrando', () => {
    const r = parsearPoste(respuestaPoste({ buses: [{ ...UN_BUS, eta: 0 }] }));
    expect(r.llegadas[0].etaMinutos).toBe(0);
  });

  it('eta negativo NO es válido', () => {
    const roto = respuestaPoste({ buses: [UN_BUS] }).replace('[3 mins]', '[-5 mins]');
    expect(() => parsearPoste(roto)).toThrow(/fuera de rango/);
  });

  it('eta absurdo (999 min) NO es válido', () => {
    const roto = respuestaPoste({ buses: [UN_BUS] }).replace('[3 mins]', '[999 mins]');
    expect(() => parsearPoste(roto)).toThrow(/fuera de rango/);
  });

  it('el borde exacto: 240 min pasa, 241 no', () => {
    const base = respuestaPoste({ buses: [UN_BUS] });
    expect(() => parsearPoste(base.replace('[3 mins]', '[240 mins]'))).not.toThrow();
    expect(() => parsearPoste(base.replace('[3 mins]', '[241 mins]'))).toThrow(/fuera de rango/);
  });

  it('20 autobuses en un poste (una cabecera con mucho tráfico)', () => {
    const muchos = Array.from({ length: 20 }, (_, i) => ({
      coche: String(9100 + i), linea: '0' + (30 + (i % 5)), destino: 'DESTINO', eta: i,
    }));
    const r = parsearPoste(respuestaPoste({ buses: muchos }));
    expect(r.llegadas).toHaveLength(20);
    expect(r.vehiculos).toHaveLength(20);
  });
});

describe('⚠️ LA FUENTE DEVUELVE BASURA', () => {
  it('HTML de error en vez de JSON → grita, y dice por dónde empieza', () => {
    const html = '<!DOCTYPE html><html><body><h1>503 Service Unavailable</h1></body></html>';
    expect(() => parsearPoste(html)).toThrow(/no ha devuelto JSON/);
    expect(() => parsearPoste(html)).toThrow(/<!DOCTYPE html>/);
  });

  it('una página del WAF (captcha) tampoco cuela', () => {
    expect(() => parsearPoste('<html><title>Access denied</title></html>')).toThrow(PosteIlegible);
  });

  it('JSON válido pero que no es lo que esperamos', () => {
    expect(() => parsearPoste('[]')).toThrow(/no es un objeto/);
    expect(() => parsearPoste('null')).toThrow(/no es un objeto/);
    expect(() => parsearPoste('{"otracosa":1}')).toThrow(/falta la clave .tablatiempos./);
  });

  it('cuerpo vacío', () => {
    expect(() => parsearPoste('')).toThrow(/no ha devuelto JSON/);
  });

  it('⭐ un icono nuevo NO degrada en silencio: lo caza el cruce de canales', () => {
    // Este test lo escribí esperando "se anota y sigue". Y falló. El motivo es
    // MEJOR que mi expectativa: si Avanza cambiara el icono del autobús, ese
    // vehículo desaparecería de `maquinas` pero seguiría en `tablatiempos`, y el
    // cruce lo detecta como contradicción. Es más fuerte que un aviso: el motor
    // se planta en vez de enseñar un poste al que le faltan puntos en el mapa.
    const raro = respuestaPoste({ buses: [UN_BUS], iconoRaro: 'tranvia.png' });
    expect(() => parsearPoste(raro)).toThrow(/se contradice/);
    expect(() => parsearPoste(raro)).toThrow(/solo en tablatiempos: \[9001\]/);
  });

  it('...y si el icono raro es un marcador de más, se anota y NO se cuenta como bus', () => {
    // Aquí sí hay aviso: el elemento raro no está en `tablatiempos`, así que el
    // cruce cuadra. No sabemos qué es → no lo damos por autobús, pero se dice.
    const base = JSON.parse(respuestaPoste({ buses: [UN_BUS] })) as { maquinas: Record<string, unknown> };
    base.maquinas['99'] = {
      coordenadas: { 0: { LAT: 41.65, LON: -0.88 } },
      icon: 'https://gps.avanzabus.com/img/patinete.png',
      title: 'algo nuevo',
    };
    const r = parsearPoste(JSON.stringify(base));
    expect(r.avisos.join()).toMatch(/icono desconocido "patinete.png"/);
    expect(r.vehiculos).toHaveLength(1); // el bus de verdad, y solo ese
    expect(r.llegadas).toHaveLength(1);
  });
});

describe('el KML', () => {
  const KML = (coords: string) =>
    `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><LineString><coordinates>${coords}</coordinates></LineString></Placemark></Document></kml>`;

  it('lee las coordenadas y las INVIERTE: KML va (lon,lat)', () => {
    const g = parsearKml(KML('-0.876037,41.649996,0 -0.873833,41.647631,0'));
    // Si esto saliera al revés, el trazado de Zaragoza aparecería en Somalia.
    expect(g[0]).toEqual({ lat: 41.649996, lon: -0.876037 });
    expect(g[0].lat).toBeGreaterThan(40); // Zaragoza, no el ecuador
  });

  it('un KML corrupto grita', () => {
    expect(() => parsearKml('<html>404 not found</html>')).toThrow(KmlIlegible);
    expect(() => parsearKml(KML(''))).toThrow(/no es un trazado/);
    expect(() => parsearKml(KML('-0.87,41.64,0'))).toThrow(/1 punto/);
  });

  it('un punto ilegible no se salta en silencio', () => {
    expect(() => parsearKml(KML('-0.87,41.64,0 patata,41.65,0'))).toThrow(/punto ilegible/);
  });

  it('Null Island dentro del KML se descarta, no se pinta', () => {
    const g = parsearKml(KML('-0.87,41.64,0 0,0,0 -0.88,41.65,0'));
    expect(g).toHaveLength(2);
    expect(g.every((p) => p.lat !== 0)).toBe(true);
  });
});

describe('el recorrido de hoy (get_stops_list)', () => {
  it('lee los postes en ORDEN y descarta el <option> de relleno', () => {
    const r = parsearRecorrido(
      respuestaRecorrido([
        { poste: 1297, nombre: 'Cosuenda / Paseo de Longares' },
        { poste: 3022, nombre: 'Marqués de La Cadena n.º 40' },
      ]),
    );
    expect(r.map((p) => p.poste)).toEqual([1297, 3022]); // el orden ES el dato
    expect(r[0].nombre).toBe('Cosuenda / Paseo de Longares'); // sin el "1297 - "
    expect(r).toHaveLength(2); // "Seleccionar poste" NO cuenta
  });

  it('⚠️ vacío es vacío, y NO es "han quitado todas las paradas"', () => {
    expect(parsearRecorrido('')).toEqual([]);
    expect(parsearRecorrido('   ')).toEqual([]);
  });

  it('⚠️ si SOLO viene el relleno, grita en vez de devolver []', () => {
    // Devolver [] aquí sería catastrófico: el motor de desvíos daría TODAS las
    // paradas de la línea por suprimidas y tacharía media pantalla.
    expect(() => parsearRecorrido('<option value="posteDefault">Seleccionar poste</option>')).toThrow(
      RecorridoIlegible,
    );
    expect(() => parsearRecorrido('<option value="posteDefault">x</option>')).toThrow(/TODAS las paradas/);
  });

  it('un poste ilegible grita', () => {
    expect(() => parsearRecorrido('<option value="patata">x</option>')).toThrow(/poste ilegible/);
  });

  it('HTML de error no cuela por poste', () => {
    expect(() => parsearRecorrido('{"error":"nope"}')).toThrow(/no parece HTML/);
  });
});
