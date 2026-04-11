import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['electron-store'] })],
    build: {
      rollupOptions: {
        external: ['uiohook-napi', 'node-winautomation', 'instruo-native']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    }
  }
})
