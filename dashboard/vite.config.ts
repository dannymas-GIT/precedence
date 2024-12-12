import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/dashboard-api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dashboard-api/, '')
      }
    },
    hmr: {
      path: '/ws',
      port: 5173,
      protocol: 'ws',
      clientPort: 5173
    }
  },
  build: {
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    assetsDir: 'assets',
    manifest: true,
    outDir: 'dist',
    emptyOutDir: true
  },
  base: '/dashboard/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
