import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,mkdir,rm,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import http from 'node:http'
import {createStaticServer} from '../scripts/serve-h5.mjs'
test('生产服务正确提供页面资源与健康检查，拒绝目录穿越和缺失资源',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'kaikou-server-')),root=join(parent,'public');await mkdir(root);await mkdir(join(root,'assets'))
 await writeFile(join(root,'index.html'),'<html>开口迎客</html>');await writeFile(join(root,'assets/app-abcdefgh.js'),'console.log("ok")');await writeFile(join(root,'demo.m4a'),'0123456789');await writeFile(join(parent,'secret.txt'),'private');await symlink(join(parent,'secret.txt'),join(root,'link.txt'))
 const server=createStaticServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 const raw=path=>new Promise((resolve,reject)=>{http.get(base+path,r=>{r.resume();r.on('end',()=>resolve(r.statusCode))}).on('error',reject)})
 try{
  let r=await fetch(base+'/');assert.equal(r.status,200);assert.match(await r.text(),/开口迎客/);assert.match(r.headers.get('content-type'),/text\/html/)
  r=await fetch(base+'/healthz');assert.equal(r.status,200);assert.equal((await r.json()).version,'0.3.0')
  r=await fetch(base+'/assets/app-abcdefgh.js',{method:'HEAD'});assert.equal(r.status,200);assert.equal(await r.text(),'');assert.match(r.headers.get('cache-control'),/immutable/)
  r=await fetch(base+'/demo.m4a',{headers:{Range:'bytes=2-5'}});assert.equal(r.status,206);assert.equal(await r.text(),'2345');assert.equal(r.headers.get('content-range'),'bytes 2-5/10');assert.equal(r.headers.get('content-type'),'audio/mp4')
  r=await fetch(base+'/demo.m4a',{headers:{Range:'bytes=-3'}});assert.equal(r.status,206);assert.equal(await r.text(),'789')
  for(const range of ['bytes=50-60','bytes=5-2','bytes=-0','bytes=1-2,4-5'])assert.equal((await fetch(base+'/demo.m4a',{headers:{Range:range}})).status,416)
  for(const path of ['/missing.js','/.env','/link.txt','/%2e%2e%2fsecret.txt','/%00'])assert.equal(await raw(path),404,path)
  assert.equal(await raw('/%ZZ'),400);assert.equal((await fetch(base+'/',{method:'POST'})).status,405)
 }finally{await new Promise(r=>server.close(r));await rm(parent,{recursive:true,force:true})}
})
