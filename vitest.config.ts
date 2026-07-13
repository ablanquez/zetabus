import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // El GTFS real son 47 MB: cargarlo tres veces (bus, tranvía, ambos) no cabe
    // en 5 s. El timeout por defecto de Vitest estaba escondiendo un test lento,
    // no un test roto.
    testTimeout: 60_000,
  },
});
