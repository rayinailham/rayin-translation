
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(new URL(import.meta.url).pathname), './src').replace(/^\/([a-zA-Z]:)/, '$1'), // Windows fix
    },
  },
  build: {
    // Enable CSS code splitting for lazy-loaded routes
    cssCodeSplit: true,
    // Minify CSS more aggressively
    cssMinify: 'lightningcss',
    // Improve chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for Vue ecosystem
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          // Supabase in its own chunk
          'supabase': ['@supabase/supabase-js'],
          // Marked library
          'marked': ['marked'],
        },
      },
    },
    // Target modern browsers for smaller builds
    target: 'es2020',
  },
})
