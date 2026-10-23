import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
    host: true,   // expose on LAN so phones can access QR codes
    allowedHosts: ["5aff-103-124-139-197.ngrok-free.app"]
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  optimizeDeps: {
    include: ['qrcode', 'gif.js'],
  },
});
