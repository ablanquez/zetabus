'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LlegadaViva } from '@/engine/llegadas';
import type { LatLon } from '@/core';

/**
 * ⭐ EL MAPA DE LA PARADA. ARRIBA, COMO EN LA REFERENCIA.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POR QUÉ VA ARRIBA, Y POR QUÉ ANTES NO.
 *
 * En la Tanda 4 medí que el mapa de 288 px de la referencia empujaba el primer
 * tiempo de llegada a y=789 en un móvil de 360×780 — es decir, FUERA DE LA
 * PANTALLA. Y decidí bajarlo. La medida era correcta.
 *
 * ⛔ Y LA DECISIÓN ERA MÍA, QUE NO COJO EL BUS.
 *
 * Antonio la usa. Y dice que su usabilidad es la correcta: llegas a la parada,
 * miras el mapa, ves DÓNDE está tu autobús, y luego bajas a los minutos. El
 * mapa no es un adorno que estorba: es la primera pregunta.
 *
 * Medí una capa (la geometría) y afirmé sobre otra (el uso). Es la L7 otra vez.
 * El test de flotación se ha retirado, y NO por descuido: por decisión suya.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LO QUE NO SE HACE, PASE LO QUE PASE:
 *
 *  ⛔ NO SE PROYECTA EL AUTOBÚS SOBRE EL TRAZADO. Avanza no da `trip_id`: no
 *     sabemos en qué sentido va. "Acercarlo" a la línea más próxima lo pintaría,
 *     la mitad de las veces, en la calzada contraria. Se pinta donde el GPS dice.
 *
 *  ⛔ NULL ISLAND. Un autobús sin coordenadas NO SE PINTA. Nada de `?? 0`, que
 *     lo mandaría al golfo de Guinea con toda la naturalidad del mundo. Y se
 *     DICE cuántos faltan: un mapa con 3 buses cuando la lista tiene 5 miente
 *     por omisión, y es la clase de mentira que nadie nota.
 */

/** El icono de un autobús: un chip con su número de línea. No un pin genérico. */
function iconoBus(etiqueta: string, color: string | null, inminente: boolean): L.DivIcon {
  const fondo = color ?? '#94a3b8';
  // ⚠️ El estado (inminente) va en la FORMA —un anillo—, no en el tono: el color
  //    ya está ocupado por la IDENTIDAD de la línea. La 31 ES roja.
  const anillo = inminente ? 'box-shadow:0 0 0 3px #111827,0 0 0 6px #fff;' : 'box-shadow:0 1px 3px rgba(0,0,0,.4);';
  // ⚠️ 30×24, NO 30×22. La primera versión medía 22 px de alto y el detector de
  //    objetivos táctiles la cazó: WCAG 2.5.8 exige 24×24 mínimo, y un marcador de
  //    autobús SE PULSA (resalta su fila en la lista). Dos píxeles de menos en algo
  //    que se toca con el pulgar, en un móvil, andando por la calle.
  return L.divIcon({
    className: 'zb-bus',
    html:
      `<span style="display:flex;align-items:center;justify-content:center;` +
      `width:30px;height:24px;border-radius:6px;background:${fondo};color:#fff;` +
      `font:900 12px/1 system-ui,sans-serif;border:2px solid #fff;${anillo}">${etiqueta}</span>`,
    iconSize: [30, 24],
    iconAnchor: [15, 12],
  });
}

/** La parada. Un rombo, para que NO se confunda con un autobús ni en gris. */
const ICONO_PARADA = L.divIcon({
  className: 'zb-parada',
  html:
    '<span style="display:block;width:18px;height:18px;background:#111827;' +
    'border:3px solid #fff;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,.5)"></span>',
  iconSize: [24, 24], // WCAG 2.5.8: 24×24 mínimo. Ni un píxel menos.
  iconAnchor: [12, 12],
});

/**
 * Encuadra el mapa sobre TODO lo que hay que ver. Si solo está la parada, se
 * queda con un zoom cómodo de barrio; si hay autobuses, los mete a todos dentro.
 */
function Encuadre({ puntos }: { puntos: LatLon[] }) {
  const map = useMap();
  const clave = puntos.map((p) => `${p.lat},${p.lon}`).join('|');
  const previo = useRef('');

  useEffect(() => {
    if (puntos.length === 0 || clave === previo.current) return;
    previo.current = clave;
    if (puntos.length === 1) {
      map.setView([puntos[0].lat, puntos[0].lon], 16);
      return;
    }
    map.fitBounds(
      L.latLngBounds(puntos.map((p) => [p.lat, p.lon] as [number, number])),
      { padding: [36, 36], maxZoom: 16 },
    );
  }, [map, clave, puntos]);

  return null;
}

export function MapaParada({
  parada,
  llegadas,
  seleccionado,
  onSeleccionar,
}: {
  parada: LatLon | null;
  /** YA FILTRADAS. El mapa no filtra: lee el mismo estado único que la lista. */
  llegadas: readonly LlegadaViva[];
  /** El coche resaltado. Es el MISMO estado que resalta la fila de la lista. */
  seleccionado: string | null;
  onSeleccionar: (coche: string | null) => void;
}) {
  // ⭐ NULL ISLAND: se separan los que TIENEN posición de los que no. Y los que
  //    no la tienen NO se pintan — pero SE CUENTAN, y se dice cuántos son.
  const conPosicion = useMemo(() => llegadas.filter((l) => l.posicion !== null), [llegadas]);
  const sinPosicion = llegadas.length - conPosicion.length;

  const puntos = useMemo(() => {
    const ps: LatLon[] = conPosicion.map((l) => l.posicion!);
    if (parada) ps.push(parada);
    return ps;
  }, [conPosicion, parada]);

  // Sin NADA que pintar (ni siquiera la parada) no se monta un mapa vacío: se dice.
  if (!parada && conPosicion.length === 0) {
    return (
      <div
        className="es-sin-datos mb-4 px-3 py-3 text-[12px] leading-snug text-[var(--color-tinta-suave)] sin-recortar"
        data-papel="mapa-sin-datos"
      >
        No podemos dibujar el mapa: no tenemos la posición de esta parada ni la de ningún autobús.
        <strong className="not-italic"> No la inventamos.</strong>
      </div>
    );
  }

  const centro: [number, number] = parada
    ? [parada.lat, parada.lon]
    : [conPosicion[0].posicion!.lat, conPosicion[0].posicion!.lon];

  return (
    <div className="mb-4" data-papel="mapa">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-borde)] shadow-sm">
        <MapContainer
          center={centro}
          zoom={16}
          scrollWheelZoom={false}
          className="h-72 w-full"
          data-papel="lienzo-mapa"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Encuadre puntos={puntos} />

          {parada && <Marker position={[parada.lat, parada.lon]} icon={ICONO_PARADA} />}

          {conPosicion.map((l) => {
            const coche = String(l.coche);
            const etiqueta = l.linea ?? l.etiquetaCruda;
            return (
              <Marker
                key={coche}
                position={[l.posicion!.lat, l.posicion!.lon]}
                icon={iconoBus(etiqueta, l.color, coche === seleccionado || l.etaMinutos <= 1)}
                // ⭐ LA SINCRONÍA MAPA → LISTA. Es el MISMO estado, no dos copias.
                eventHandlers={{
                  click: () => onSeleccionar(coche === seleccionado ? null : coche),
                }}
                alt={`Línea ${etiqueta}, coche ${coche}, a ${l.etaMinutos} min`}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* ⚠️ LO QUE EL MAPA NO PUEDE ENSEÑAR, SE DICE. Un mapa con 3 autobuses
          cuando la lista tiene 5 miente por omisión, y nadie lo nota. */}
      {sinPosicion > 0 && (
        <p
          className="mt-1.5 text-[11px] leading-snug text-[var(--color-aviso)] sin-recortar"
          data-papel="sin-posicion"
        >
          ⚠ {sinPosicion === 1 ? 'Un autobús no sale' : `${sinPosicion} autobuses no salen`} en el mapa:
          Avanza no da su posición. Sí {sinPosicion === 1 ? 'está' : 'están'} en la lista de abajo.
        </p>
      )}
    </div>
  );
}
