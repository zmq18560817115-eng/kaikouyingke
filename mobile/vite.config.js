import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import {fileURLToPath} from 'node:url'
import {createStaticServer} from './scripts/serve-h5.mjs'
const speechFiles = {
  name: 'kaikou-local-speech-assets',
  configureServer(server) {
    // uni-app replaces Vite's public middleware with src/static; serve the H5-only pack explicitly.
    const handler = createStaticServer(fileURLToPath(new URL('./public',import.meta.url))).listeners('request')[0]
    server.middlewares.use((req,res,next) => {
      const base = server.config.base.replace(/\/$/,'')
      if (req.url?.startsWith(base+'/speech/')) { req.url=req.url.slice(base.length); return handler(req,res) }
      next()
    })
  }
}
export default defineConfig({ publicDir: process.env.UNI_PLATFORM === 'h5' ? fileURLToPath(new URL('./public',import.meta.url)) : '__static__', plugins: [speechFiles, uni.default ? uni.default() : uni()], server: { host: '0.0.0.0', port: 5174, strictPort: true, proxy: { '/api/speech': { target: 'http://127.0.0.1:5176', changeOrigin: true } } } })
