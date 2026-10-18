import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const name = 'sherpa-onnx-wasm-simd-1.12.9-vad-asr-zh_en_ja_ko_cantonese-sense_voice_small'
const archiveHash = '7f5ef4cec861cc6da6fbd98e8b4732e986aacd082604d41503700e325a4e4fdb'
const url = `https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.9/${name}.tar.bz2`
const files = ['sherpa-onnx-asr.js', 'sherpa-onnx-wasm-main-vad-asr.js', 'sherpa-onnx-wasm-main-vad-asr.wasm', 'sherpa-onnx-wasm-main-vad-asr.data']
const destination = resolve(root, 'public/speech/runtime-v1.12.9'), work = resolve(root, '.work/local-speech')
await mkdir(work, { recursive: true })
const archive = process.argv[2] ? resolve(process.argv[2]) : resolve(work, 'sensevoice-wasm.tar.bz2')
try {
  await access(archive)
} catch {
  console.log('Downloading pinned sherpa-onnx / SenseVoice bundle (158 MiB compressed)…')
  const response = await fetch(url, { signal: AbortSignal.timeout(300000) })
  if (!response.ok) throw new Error(`Speech bundle download failed: HTTP ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archive + '.part'))
  const { rename } = await import('node:fs/promises')
  await rename(archive + '.part', archive)
}
const hash = createHash('sha256')
for await (const chunk of createReadStream(archive)) hash.update(chunk)
if (hash.digest('hex') !== archiveHash) throw new Error('Speech bundle SHA-256 mismatch; delete the local archive and download again.')
execFileSync('tar', ['-xjf', archive, '-C', work])
await mkdir(destination, { recursive: true })
const assets = []
for (const nameOfFile of files) {
  const bytes = await readFile(resolve(work, name, nameOfFile))
  await cp(resolve(work, name, nameOfFile), resolve(destination, nameOfFile))
  assets.push({ name: nameOfFile, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
}
await writeFile(resolve(destination, 'manifest.json'), JSON.stringify({ version: '1.12.9', source: url, archiveHash, totalBytes: assets.reduce((sum, f) => sum + f.size, 0), files: assets }, null, 2) + '\n')
await rm(resolve(work, name), { recursive: true, force: true })
console.log('Local speech pack prepared: public/speech/runtime-v1.12.9 (about 240 MiB). Audio inference stays in the browser worker.')
