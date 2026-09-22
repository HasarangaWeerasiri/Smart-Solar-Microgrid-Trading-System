/*
 * File: vite.config.js
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Vite build configuration for the web client. Adds the React and Tailwind
 *              plugins and fixes the dev server to port 5173, which is the origin allowed
 *              by the API's "WebClient" CORS policy.
 */

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true
  }
})
