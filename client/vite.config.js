import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, Vite reenvía /api y /photos al servidor Express (puerto 3001)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Escuchar en todas las direcciones (IPv4 e IPv6). También permite abrir
    // el sitio desde un celular conectado al mismo Wi-Fi.
    host: true,
    // Los proyectos nativos reciben una copia de dist; no hay que vigilarlos
    watch: { ignored: ['**/android/**', '**/ios/**'] },
    proxy: {
      '/api': 'http://localhost:3001',
      '/photos': 'http://localhost:3001',
    },
  },
});
