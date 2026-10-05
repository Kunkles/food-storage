import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to your repo name when deploying to GitHub Pages, e.g. '/FoodStorage/'
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
