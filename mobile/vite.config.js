import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
export default defineConfig({ plugins: [uni.default ? uni.default() : uni()], server: { host: '0.0.0.0', port: 5174, strictPort: true, proxy: { '/api/speech': { target: 'http://127.0.0.1:5176', changeOrigin: true } } } })
