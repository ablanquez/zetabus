/**
 * ⭐ LAS LÍNEAS QUE PASAN POR UNA PARADA — el camino de vuelta, con su sentido.
 *
 * Se prueba contra la topología REAL (el GTFS horneado), no un mock: los postes de
 * ejemplo son de verdad. Lo que se ata:
 *   · una línea que pasa en LOS DOS sentidos → dos entradas, dos destinos DISTINTOS;
 *   · una circular → una entrada pelada, SIN sentido inventado;
 *   · un poste sin dato → `[]` (el vacío se dice arriba, no se pinta como un cero).
 */
import { describe, it, expect } from 'vitest';
import { lineasQuePasanPor, paradaDelPoste, idParada } from '@/engine/topologia';

describe('⭐ líneas que pasan por una parada, con sentido', () => {
  it('una línea en LOS DOS sentidos da dos entradas con destinos distintos', () => {
    // poste 15 (Camino de Juslibol): la 36 pasa en los dos sentidos.
    const id = paradaDelPoste(15)!;
    expect(id).not.toBeNull();
    const del36 = lineasQuePasanPor(id).filter((e) => e.linea.shortName === '36');
    expect(del36).toHaveLength(2);
    // los dos son de tipo 'sentido', con directionId 0 y 1, y destinos DISTINTOS
    const dirs = del36.map((e) => (e.rumbo.tipo === 'sentido' ? e.rumbo.directionId : null));
    expect(new Set(dirs)).toEqual(new Set([0, 1]));
    const destinos = del36.map((e) => (e.rumbo.tipo === 'sentido' ? e.rumbo.destino : ''));
    expect(destinos[0]).not.toBe(destinos[1]);
    expect(destinos.every((d) => d.length > 0)).toBe(true);
  });

  it('una CIRCULAR da una entrada pelada, sin inventar sentido', () => {
    // poste 20 (Asalto n.º 53): la 30 es circular.
    const id = paradaDelPoste(20)!;
    const del30 = lineasQuePasanPor(id).filter((e) => e.linea.shortName === '30');
    expect(del30).toHaveLength(1);
    const r = del30[0].rumbo;
    // NO es 'sentido' (no se elige un directionId por defecto): es 'circular'.
    expect(r.tipo).toBe('circular');
    if (r.tipo === 'circular') expect(r.por.length).toBeGreaterThan(0);
  });

  it('un poste que no está en el dato devuelve [] (el vacío se dice, no se pinta)', () => {
    // Un StopId que no existe en ninguna dirección del GTFS.
    expect(lineasQuePasanPor(idParada('___no-existe___'))).toEqual([]);
  });

  it('cada par (línea, sentido) aparece UNA vez, y la lista va ordenada por línea', () => {
    const id = paradaDelPoste(744)!;
    const ls = lineasQuePasanPor(id);
    // sin duplicados de (línea, directionId)
    const claves = ls.map((e) => `${e.linea.shortName}·${e.rumbo.tipo === 'sentido' ? e.rumbo.directionId : 'pelada'}`);
    expect(new Set(claves).size).toBe(claves.length);
    // orden natural por número de línea
    const nums = ls.map((e) => e.linea.shortName);
    const ordenado = [...nums].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    expect(nums).toEqual(ordenado);
  });
});
