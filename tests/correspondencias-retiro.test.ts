/**
 * ⭐ GUARDIÁN DEL RETIRO. `transbordosDe` y `lineasQuePasanPor` se fueron las dos: quien
 * arma las líneas que pasan y los transbordos es AHORA `engine/correspondencias` (una
 * fuente, con el índice diario y su red de resiliencia). Retirar una y dejar la otra
 * calculando no sería "una fuente". Este test se pone rojo si alguna vuelve —por la
 * puerta de atrás de la topología, o colándose de nuevo en un componente—.
 *
 * La disciplina se olvida. Un test, no. (Como `desvios-no-miran-lo-vivo`.)
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import * as topologia from '@/engine/topologia';

describe('⭐ transbordosDe y lineasQuePasanPor están RETIRADAS', () => {
  it('la topología ya no las exporta', () => {
    expect((topologia as Record<string, unknown>).transbordosDe).toBeUndefined();
    expect((topologia as Record<string, unknown>).lineasQuePasanPor).toBeUndefined();
  });

  it('la topología expone la fuente cruda del degradado (paresOficialesDe)', () => {
    expect(typeof topologia.paresOficialesDe).toBe('function');
  });

  it('ningún componente vuelve a importar las funciones retiradas', () => {
    for (const f of ['src/components/Itinerario.tsx', 'src/components/LineasQuePasan.tsx']) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} sigue nombrando transbordosDe`).not.toMatch(/transbordosDe/);
      expect(src, `${f} sigue nombrando lineasQuePasanPor`).not.toMatch(/lineasQuePasanPor/);
    }
  });

  it('los dos consumidores leen del índice (engine/correspondencias)', () => {
    const itin = readFileSync('src/components/Itinerario.tsx', 'utf8');
    const pasan = readFileSync('src/components/LineasQuePasan.tsx', 'utf8');
    expect(itin).toMatch(/from '@\/engine\/correspondencias'/);
    expect(pasan).toMatch(/from '@\/engine\/correspondencias'/);
  });
});
