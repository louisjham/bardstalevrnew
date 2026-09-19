import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl()
  ],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0) for Quest/Vision Pro/mobile VR testing
    port: 5173,
    https: true
  },
  preview: {
    host: true,
    port: 4173,
    https: true
  }
});
