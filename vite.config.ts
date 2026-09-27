import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_TARGET || 'https://arckaton-os.onrender.com';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Sans ce proxy, /api/* part vers le serveur de dev Vite qui n'a pas
      // d'API : la connexion echoue avec "NetworkError when attempting to
      // fetch resource". On relaie donc vers le backend.
      // Pour tester contre une instance locale :
      //   $env:VITE_API_TARGET="http://localhost:3001"; npm run dev
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          secure: true,
          // Le plan gratuit Render se met en veille : un froid demarrage
          // depasse le delai par defaut de 30 s.
          timeout: 120000,
          proxyTimeout: 120000,
        },
      },
    },
  };
});
