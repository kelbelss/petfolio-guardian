import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  server: {
    proxy: {
      // Proxy requests starting with /api/1inch to the real 1inch API
      '/api/1inch': {
        target: 'https://api.1inch.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/1inch/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Log the request for debugging
            console.log('Proxying request to 1inch:', req.url);
          });
        },
      },
    },
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

