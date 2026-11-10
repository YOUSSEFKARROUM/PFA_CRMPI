import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En dev, Vite (5173) relaie /api vers FastAPI (8000) : même origine, cookie de session inclus.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
