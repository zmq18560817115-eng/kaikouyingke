import http from 'node:http'
import { createAssessmentApi } from '../server/assessment-api.mjs'
import { createReadStream, existsSync } from 'node:fs'
import { stat, realpath } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
const MIME = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.wasm':'application/wasm' }
export function createStaticServer(directory = fileURLToPath(new URL('../dist/build/h5/', import.meta.url)), options = {}) {
  const root = resolve(directory), assessmentApi = createAssessmentApi(options)
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    const reply = (code, body) => { res.writeHead(code, { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' }); res.end(req.method === 'HEAD' ? undefined : body) }
    let pathname
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname) } catch { return reply(400, 'Bad request') }
    if (await assessmentApi(req, res, pathname)) return
    if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return reply(405,'Method not allowed') }
    if (pathname === '/healthz') { res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); return res.end(req.method === 'HEAD' ? undefined : '{"status":"ok","version":"0.3.0"}') }
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(s => s.startsWith('.'))) return reply(404,'Not found')
    let path = resolve(root, '.' + pathname)
    if (path !== root && !path.startsWith(root + sep)) return reply(404,'Not found')
    try {
      let info = await stat(path)
      if (info.isDirectory()) { path = resolve(path,'index.html'); info = await stat(path) }
      const actual = await realpath(path), actualRoot = await realpath(root)
      if (!info.isFile() || !actual.startsWith(actualRoot + sep)) return reply(404,'Not found')
      const headers = { 'Content-Type': MIME[extname(path)] || 'application/octet-stream', 'Content-Length': info.size, 'Accept-Ranges':'bytes', 'Cache-Control': (/\/assets\//.test(pathname) && /[-.][\w-]{8,}\./.test(pathname)) || /\/speech\/runtime-v1\.12\.9\//.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache' }
      let start=0,end=info.size-1,status=200
      if(req.headers.range){
        const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
        if(!range||(!range[1]&&!range[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end()}
        if(!range[1])start=Math.max(0,info.size-Number(range[2]));else start=Number(range[1])
        if(range[1]&&range[2])end=Math.min(end,Number(range[2]))
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end()}
        status=206;headers['Content-Length']=end-start+1;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`
      }
      res.writeHead(status,headers)
      if (req.method === 'HEAD') return res.end()
      const stream = createReadStream(path, info.size ? {start,end} : {})
      stream.on('error', () => res.destroy()); stream.pipe(res)
    } catch { reply(404,'Not found') }
  })
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(fileURLToPath(new URL('../dist/build/h5/index.html', import.meta.url)))) throw new Error('H5 build missing. Run npm run build:h5 first.')
  const server = createStaticServer(), port = Number(process.env.PORT || 3000)
  server.listen(port, '0.0.0.0', () => console.log(`Kaikou Yingke listening on ${port}`))
  process.on('SIGTERM', () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10000).unref() })
}
