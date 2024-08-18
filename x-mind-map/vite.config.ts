import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, './src/index.ts'),
      name: 'x-mind-map',
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          dir: 'dist/es',
          entryFileNames: '[name].js',
          preserveModulesRoot: 'src',
          preserveModules: true,
        },
        {
          format: 'cjs',
          dir: 'dist/lib',
          entryFileNames: '[name].js',
          preserveModulesRoot: 'src',
          preserveModules: true,
        },
      ],
    },
  },
  plugins: [
    dts({
      entryRoot: './src',
      tsconfigPath: './tsconfig.json',
      outDir: ['dist/es', 'dist/lib'],
    }),
  ],
})
