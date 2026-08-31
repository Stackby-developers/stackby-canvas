import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    treeshake: true,
    external: ['react', 'react-dom', '@tanstack/react-query'],
    minify: false,
    clean: true,
  },
  {
    entry: { 'test-utils': 'src/test-utils/create-test-client.tsx' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom', '@tanstack/react-query', '@stackby/studio-sdk'],
    clean: false,
  },
]);
