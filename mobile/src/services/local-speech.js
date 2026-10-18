import { reactive } from 'vue'
import { getRecordingBlob } from './audio'

export const localSpeech = reactive({ status: 'idle', progress: 0, cached: false, error: '', totalBytes: 251888664 })
let worker, initialization, requestCounter = 0, pending, aborter, epoch = 0
const CACHE = 'kaikou-sensevoice-1.12.9'
let base = ''
// #ifdef H5
base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/') + 'speech/'
// #endif
export function localRecognitionSupported() {
  // #ifdef H5
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof caches !== 'undefined' && !!globalThis.crypto?.subtle
  // #endif
  // #ifndef H5
  return false
  // #endif
}
export async function checkLocalSpeechCache() {
  if (!localRecognitionSupported()) return false
  // #ifdef H5
  try { const cache = await caches.open(CACHE); localSpeech.cached = !!await cache.match(new URL(base + 'complete', location.href).href) } catch { localSpeech.cached = false }
  // #endif
  return localSpeech.cached
}
export async function readLocalSamples(record) {
  // #ifdef H5
  const blob = await getRecordingBlob(record.id)
  if (!blob) throw new Error('这条录音已不在本机，请重新录制。')
  const Context = window.AudioContext || window.webkitAudioContext
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext
  if (!Context || !Offline) throw new Error('当前浏览器无法分析录音，可以先回听。')
  const context = new Context()
  let decoded
  try { decoded = await context.decodeAudioData(await blob.arrayBuffer()) }
  catch { throw new Error('录音无法读取，请重新录制。') }
  finally { await context.close() }
  if (decoded.duration < .5 || decoded.duration > 61) throw new Error('请录制1到59秒，再查看练习反馈。')
  const offline = new Offline(1, Math.ceil(decoded.duration * 16000), 16000), source = offline.createBufferSource()
  source.buffer = decoded; source.connect(offline.destination); source.start()
  return (await offline.startRendering()).getChannelData(0)
  // #endif
  // #ifdef MP-WEIXIN
  if (typeof wx === 'undefined' || typeof wx.createWebAudioContext !== 'function') throw new Error('此微信版本暂不支持本机音频分析，可以回听录音；完整免费反馈可在网页版使用。')
  const bytes = await new Promise((resolve, reject) => uni.getFileSystemManager().readFile({ filePath: record.path, success: r => resolve(r.data), fail: () => reject(new Error('录音无法读取。')) }))
  const context = wx.createWebAudioContext()
  try {
    const decoded = await new Promise((resolve,reject) => {
      const returned = context.decodeAudioData(bytes,resolve,reject)
      if (returned?.then) returned.then(resolve,reject)
      else if (returned?.getChannelData) resolve(returned)
    })
    if (decoded.duration < .5 || decoded.duration > 61) throw new Error('请录制1到59秒，再查看练习反馈。')
    const length = Math.ceil(decoded.duration * 16000), output = new Float32Array(length)
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const input = decoded.getChannelData(c), ratio = decoded.sampleRate / 16000
      for (let i = 0; i < length; i++) { const position = i * ratio, low = Math.floor(position), high = Math.min(low + 1, input.length - 1); output[i] += (input[low] * (1 - position + low) + input[high] * (position - low)) / decoded.numberOfChannels }
    }
    return output
  } catch { throw new Error('当前微信环境未能分析这条录音，可以先回听，或在网页版练习。') }
  finally { context.close() }
  // #endif
  // #ifndef H5
  // #ifndef MP-WEIXIN
  throw new Error('当前安装包尚未接入本机音频分析，可以先回听录音。')
  // #endif
  // #endif
}

// No recording is sent through fetch: only static model files are downloaded here.
export function loadLocalSpeech() {
  if (localSpeech.status === 'ready') return Promise.resolve()
  if (initialization) return initialization
  if (!localRecognitionSupported()) return Promise.reject(new Error('当前环境暂不支持本机文字识别，可以先回听和查看停顿。'))
  const generation = ++epoch
  aborter = new AbortController()
  localSpeech.status = 'loading'; localSpeech.error = ''; localSpeech.progress = 0
  initialization = (async () => {
    // #ifdef H5
    let cache
    try { cache = await caches.open(CACHE) } catch {}
    const response = await fetch(base + 'runtime-v1.12.9/manifest.json', { signal: aborter.signal })
    if (!response.ok) throw new Error('本站尚未准备好文字识别包，可以先用语音停顿反馈。')
    const manifest = await response.json()
    if (manifest.version !== '1.12.9' || !Array.isArray(manifest.files) || manifest.files.length !== 4) throw new Error('文字识别包版本不匹配。')
    let loaded = 0
    const buffers = {}
    for (const file of manifest.files) {
      if (!/^sherpa-onnx-[\w.-]+$/.test(file.name) || !Number.isInteger(file.size) || file.size > 260000000 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('文字识别包清单不完整。')
      const url = new URL(base + 'runtime-v1.12.9/' + file.name, location.href).href
      let found = await cache?.match(url), bytes
      if (found) bytes = await found.arrayBuffer()
      else {
        const res = await fetch(url, { signal: aborter.signal })
        if (!res.ok) throw new Error('识别包下载失败，请检查网络后重试。')
        const reader = res.body.getReader(), chunks = []
        let length = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value); length += value.byteLength
          if (length > file.size) { await reader.cancel(); throw new Error('识别包大小异常，请重新下载。') }
          localSpeech.progress = Math.min(99, Math.round((loaded + length) / manifest.totalBytes * 100))
        }
        bytes = new Uint8Array(length)
        let offset = 0
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
        bytes = bytes.buffer
      }
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('')
      if (bytes.byteLength !== file.size || digest !== file.sha256) { await cache?.delete(url); throw new Error('识别包校验失败，请重新下载。') }
      if (!found && cache) { try { await cache.put(url, new Response(bytes)) } catch { cache = null; localSpeech.cached = false } }
      buffers[file.name] = bytes; loaded += file.size
      localSpeech.progress = Math.min(99, Math.round(loaded / manifest.totalBytes * 100))
      if (generation !== epoch) throw new Error('已取消加载。')
    }
    if (cache) { try { await cache.put(new URL(base + 'complete', location.href).href, new Response('1')); localSpeech.cached = true } catch { localSpeech.cached = false } }
    localSpeech.status = 'initializing'
    worker = new Worker(new URL(base + 'local-asr-worker.js', location.href))
    const apiBlob = new Blob([buffers['sherpa-onnx-asr.js']], { type: 'text/javascript' }), runtimeBlob = new Blob([buffers['sherpa-onnx-wasm-main-vad-asr.js']], { type: 'text/javascript' })
    const apiUrl = URL.createObjectURL(apiBlob), runtimeUrl = URL.createObjectURL(runtimeBlob)
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('识别包启动超时，可以重试或先回听。')), 90000)
        const finish = error => { clearTimeout(timeout); pending = null; error ? reject(error) : resolve() }
        pending = { reject: error => finish(error) }
        worker.onerror = () => finish(new Error('本机识别未能启动，可能是设备内存不足。'))
        worker.onmessage = ({ data }) => { if (data.type === 'ready') finish(); else if (data.type === 'error') finish(new Error(data.message)) }
        const wasm = buffers['sherpa-onnx-wasm-main-vad-asr.wasm'], model = buffers['sherpa-onnx-wasm-main-vad-asr.data']
        worker.postMessage({ type: 'init', wasm, model, apiUrl, runtimeUrl }, [wasm, model])
      })
      if (generation !== epoch) throw new Error('已取消加载。')
      localSpeech.status = 'ready'; localSpeech.progress = 100
      worker.onmessage = ({ data }) => {
        if (!pending || data.id !== pending.id) return
        const task = pending; pending = null; clearTimeout(task.timeout)
        data.type === 'result' ? task.resolve(data.text) : task.reject(new Error(data.message))
      }
      worker.onerror = () => { pending?.reject(new Error('本机识别中断，可以重试。')); if (pending?.timeout) clearTimeout(pending.timeout); pending = null; worker?.terminate(); worker = null; localSpeech.status = 'error'; localSpeech.error = '本机识别中断，请重新加载。' }
    } finally { URL.revokeObjectURL(apiUrl); URL.revokeObjectURL(runtimeUrl) }
    // #endif
  })().catch(error => {
    if (generation === epoch) { worker?.terminate(); worker = null; localSpeech.status = 'error'; localSpeech.error = error.message || '本机识别包加载失败。' }
    throw error
  }).finally(() => { if (generation === epoch) initialization = null })
  return initialization
}
export function recognizeLocalSamples(samples) {
  if (localSpeech.status !== 'ready' || !worker) return Promise.reject(new Error('请先加载文字识别包。'))
  if (pending) return Promise.reject(new Error('另一条录音正在核对，请稍后再试。'))
  const copy = new Float32Array(samples), id = ++requestCounter
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cancelLocalSpeech(); reject(new Error('这次识别超时，可以重试或缩短录音。')) }, 90000)
    pending = { id, resolve, reject, timeout }
    worker.postMessage({ type: 'recognize', id, samples: copy.buffer }, [copy.buffer])
  })
}
export function cancelLocalSpeech() {
  epoch++; aborter?.abort(); aborter = null; initialization = null
  if (pending?.timeout) clearTimeout(pending.timeout)
  pending?.reject(new Error('已取消本机识别，录音仍然保留。')); pending = null
  worker?.terminate(); worker = null; localSpeech.status = 'idle'; localSpeech.error = ''
}
export async function deleteLocalSpeechCache() {
  cancelLocalSpeech()
  // #ifdef H5
  await caches.delete(CACHE)
  // #endif
  localSpeech.cached = false
}
