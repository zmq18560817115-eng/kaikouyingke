/* Model/runtime: sherpa-onnx v1.12.9 + SenseVoice. See speech/NOTICES.md. */
let recognizer, booting = false
var Module
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    if (booting) return
    booting = true
    try {
      Module = {
        wasmBinary: data.wasm,
        getPreloadedPackage: () => data.model,
        locateFile: name => new URL('runtime-v1.12.9/' + name, self.location.href).href,
        print: () => {}, printErr: () => {},
        onAbort: () => self.postMessage({ type: 'error', message: '本机识别未能启动，可能是设备内存不足。可以继续回听和查看停顿。' }),
        onRuntimeInitialized: () => {
          try {
            recognizer = new OfflineRecognizer({
              featConfig: { sampleRate: 16000, featureDim: 80 },
              modelConfig: { tokens: './tokens.txt', numThreads: 1, debug: 0, provider: 'cpu', senseVoice: { model: './sense-voice.onnx', language: 'zh', useInverseTextNormalization: 0 } },
              decodingMethod: 'greedy_search'
            }, Module)
            if (!recognizer.handle) throw new Error('no recognizer')
            data.model = null; data.wasm = null
            self.postMessage({ type: 'ready' })
          } catch { self.postMessage({ type: 'error', message: '本机识别包加载失败，请重新加载。' }) }
        }
      }
      importScripts(data.apiUrl, data.runtimeUrl)
    } catch { self.postMessage({ type: 'error', message: '本机识别包无法加载，请重试。' }) }
  }
  if (data.type === 'recognize') {
    let stream
    try {
      if (!recognizer) throw new Error('not ready')
      const samples = new Float32Array(data.samples)
      if (!samples.length || samples.length > 16000 * 61) throw new Error('invalid audio')
      stream = recognizer.createStream()
      stream.acceptWaveform(16000, samples)
      recognizer.decode(stream)
      const result = recognizer.getResult(stream)
      self.postMessage({ type: 'result', id: data.id, text: result.text || '' })
    } catch { self.postMessage({ type: 'error', id: data.id, message: '这次未能识别出内容，可以回听后再录一遍。' }) }
    finally { stream?.free() }
  }
}
