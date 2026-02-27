import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        request: resolve(__dirname, 'request.html'),
        users: resolve(__dirname, 'users.html'),
      }
    }
  }
})
