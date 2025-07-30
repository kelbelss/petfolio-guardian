import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  server: {
    // No longer need local proxy since we're using Vercel proxy
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  optimizeDeps: {
    include: ['assert'],
    esbuildOptions: {
      define: { 
        global: 'globalThis', 
        'process.env': '{}' 
      }
    }
  },
});

