import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // senza questo il CSS compilato userebbe la sintassi (width<=900px), che i
    // telefoni piu' vecchi ignorano: il sito uscirebbe in versione desktop
    cssTarget: 'safari14',
  },
})
