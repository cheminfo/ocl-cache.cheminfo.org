import react from '@vitejs/plugin-react';
import { cheminfoBuildInfo } from 'react-cheminfo/vite';
import { defineConfig } from 'vite';

// The backend's own port, derived from the project creation date. The dev
// server sits one above it, so a single value drives both and two checkouts
// never fight over Vite's stock 5173.
const backendPort = Number(process.env.PORT ?? 20822);
const devServerPort = Number(process.env.VITE_PORT ?? backendPort + 1);

export default defineConfig({
  plugins: [react(), cheminfoBuildInfo()],
  build: {
    target: 'esnext',
  },
  server: {
    port: devServerPort,
    // Fail loudly instead of drifting to the next free port, which would leave
    // the proxy target, the dev script and the README disagreeing.
    strictPort: true,
    proxy: {
      '/v1': `http://localhost:${backendPort}`,
    },
  },
});
