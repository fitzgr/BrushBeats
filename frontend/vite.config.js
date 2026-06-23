import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const defaultBasePath = repositoryName ? `/${repositoryName}/` : '/BrushBeats/'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || defaultBasePath,
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
})
