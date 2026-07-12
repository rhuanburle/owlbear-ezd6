import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // O Owlbear Rodeo (https) precisa buscar o manifest.json do dev server.
    // O Vite restringe CORS por padrão, então liberamos as origens do Owlbear.
    cors: {
      origin: [/\.owlbear\.rodeo$/, 'https://owlbear.rodeo', 'https://www.owlbear.rodeo'],
    },
  },
})
