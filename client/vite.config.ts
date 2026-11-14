import path from 'path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Where the Express server is running on THIS computer.
// It must match PORT in server/.env
const SERVER_URL = 'http://localhost:5001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    // Listen on every address of this computer, not only on localhost, so a
    // phone on the same wifi can open http://<ip-of-this-computer>:5173
    // (this is what "npm run dev -- --host" was doing by hand).
    host: true,
    port: 5173,
    // The React app and the Express server are two different programs on two
    // different ports. A phone cannot reach the server port by writing
    // "localhost", because for the phone "localhost" is the phone itself.
    //
    // So the browser never talks to the server directly: it asks the Vite
    // dev server for everything, and Vite passes on to Express whatever
    // starts with /api, /uploads or /socket.io. One single address for the
    // browser means no CORS problem and the httpOnly login cookie simply
    // works, on the laptop and on the phone.
    proxy: {
      '/api': { target: SERVER_URL, changeOrigin: true },
      '/uploads': { target: SERVER_URL, changeOrigin: true },
      // ws: true, because the socket is a line that stays open (websocket)
      // and a normal proxy rule would not carry it.
      '/socket.io': { target: SERVER_URL, changeOrigin: true, ws: true },
    },
  },
  resolve: {
    alias: {
      // "@" points to the src folder, so we can write "@/components/..."
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
