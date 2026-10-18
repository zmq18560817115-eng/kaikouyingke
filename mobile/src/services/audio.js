let recorder, stream, browserRecorder, context, currentAudio
let interruptedHandler = () => {}
let nativeStarted = false, nativeCompletion, nativeResolve, nativeReject, nativeStartResolve, nativeStartReject
let browserCompletion
export function onInterrupted(fn) { interruptedHandler = fn }
export function speechAvailable() {
  // #ifdef H5
  return typeof speechSynthesis !== 'undefined'
  // #endif
  // #ifndef H5
  return false
  // #endif
}
export function stopPlayback() {
  // #ifdef H5
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  if (currentAudio) { const audio = currentAudio; currentAudio = null; audio.pause(); URL.revokeObjectURL(audio.src) }
  // #endif
  if (context) { context.stop(); context.destroy(); context = null }
}
export function speak(text, slow = false) {
  stopPlayback()
  // #ifdef H5
  if (typeof speechSynthesis !== 'undefined') { const msg = new SpeechSynthesisUtterance(text); msg.lang = 'zh-CN'; msg.rate = slow ? .65 : .88; speechSynthesis.speak(msg); return true }
  // #endif
  return false
}
export async function startRecording() {
  stopPlayback()
  // #ifdef H5
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器无法录音，请使用HTTPS或本机预览。')
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
  catch (e) { throw new Error(e.name === 'NotAllowedError' ? '未获得麦克风权限，可在浏览器设置中开启后重试。' : '没有打开麦克风，请检查设备后重试。') }
  const chunks = []
  try {
    browserRecorder = new MediaRecorder(stream)
    browserCompletion = new Promise((resolve, reject) => {
      const release = () => { stream?.getTracks().forEach(t => t.stop()); stream = null }
      browserRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      browserRecorder.onstop = () => {
        release()
        const blob = new Blob(chunks, { type: browserRecorder.mimeType })
        resolve(blob.size ? { blob, path: URL.createObjectURL(blob), mime: blob.type } : null)
        interruptedHandler()
      }
      browserRecorder.onerror = () => { release(); reject(new Error('录音中断，请重新录制。')); interruptedHandler() }
    })
    browserCompletion.catch(() => {})
    browserRecorder.start()
  } catch (e) { stream?.getTracks().forEach(t => t.stop()); stream = null; browserRecorder = null; throw e }
  return
  // #endif
  // #ifndef H5
  if (!recorder) {
    recorder = uni.getRecorderManager()
    recorder.onStart(() => { nativeStarted = true; nativeStartResolve?.() })
    recorder.onError(() => { nativeStarted = false; const error = new Error('无法录音，请检查麦克风权限和设备后重试。'); nativeStartReject?.(error); nativeReject?.(error); interruptedHandler() })
    recorder.onStop(result => { nativeStarted = false; uni.saveFile({ tempFilePath: result.tempFilePath, success: r => nativeResolve?.({ path: r.savedFilePath, mime: 'audio/mp3', duration: result.duration / 1000 }), fail: () => nativeReject?.(new Error('录音未能保存，请检查本机空间。')) }); interruptedHandler() })
    recorder.onInterruptionBegin(() => { if (nativeStarted) recorder.stop(); interruptedHandler() })
  }
  nativeCompletion = new Promise((resolve, reject) => { nativeResolve = resolve; nativeReject = reject })
  nativeCompletion.catch(() => {})
  await new Promise((resolve, reject) => { nativeStartResolve = resolve; nativeStartReject = reject; recorder.start({ duration: 60000, sampleRate: 16000, numberOfChannels: 1, format: 'mp3' }) })
  // #endif
}
export async function stopRecording() {
  // #ifdef H5
  if (!browserRecorder) return null
  if (browserRecorder.state !== 'inactive') browserRecorder.stop()
  return browserCompletion
  // #endif
  // #ifndef H5
  if (nativeStarted) recorder.stop()
  return nativeCompletion
  // #endif
}
async function mediaDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('kaikou-media', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('recordings')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
async function writeAudio(id, blob, remove = false) {
  const db = await mediaDB()
  try { await new Promise((resolve, reject) => {
    const tx = db.transaction('recordings', 'readwrite'), store = tx.objectStore('recordings')
    if (remove) store.delete(id); else store.put(blob, id)
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('本机存储操作中断'))
  }) } finally { db.close() }
}
export async function storeAudio(id, audio) {
  // #ifdef H5
  try { await writeAudio(id, audio.blob) } finally { URL.revokeObjectURL(audio.path) }
  // #endif
  return audio.path
}
export async function getRecordingBlob(id) {
  // #ifdef H5
  const db=await mediaDB()
  try{return await new Promise((resolve,reject)=>{const r=db.transaction('recordings').objectStore('recordings').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{db.close()}
  // #endif
}
export async function playRecording(record, startAt = 0) {
  stopPlayback()
  // #ifdef H5
  const db = await mediaDB()
  let blob
  try { blob = await new Promise((resolve, reject) => { const r = db.transaction('recordings').objectStore('recordings').get(record.id); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) }) } finally { db.close() }
  if (!blob) throw new Error('这条录音已不在本机，请重新录制。')
  const audio = new Audio(URL.createObjectURL(blob)); currentAudio = audio
  audio.onloadedmetadata = () => { if (startAt > 0 && startAt < audio.duration) audio.currentTime = startAt }
  const release = () => { URL.revokeObjectURL(audio.src); if (currentAudio === audio) currentAudio = null }
  audio.onended = release; audio.onerror = release
  try { await audio.play() } catch { release(); throw new Error('这条录音暂时无法播放，请重试。') }
  return
  // #endif
  // #ifndef H5
  context = uni.createInnerAudioContext(); context.src = record.path
  const audioContext = context
  if (startAt > 0) audioContext.startTime = startAt
  await new Promise((resolve, reject) => { audioContext.onPlay(resolve); audioContext.onError(() => { if (context === audioContext) stopPlayback(); reject(new Error('这条录音暂时无法播放，请重试。')) }); audioContext.onEnded(() => { if (context === audioContext) stopPlayback() }); audioContext.play() })
  // #endif
}
export async function playAudioPath(path) {
  stopPlayback()
  // #ifdef H5
  const audio = new Audio(path); currentAudio = audio
  const release = () => { if (currentAudio === audio) currentAudio = null }
  audio.onended = release; audio.onerror = release
  try { await audio.play() } catch { release(); throw new Error('示范暂时无法播放，请稍后再试。') }
  return
  // #endif
  // #ifndef H5
  context = uni.createInnerAudioContext(); context.src = path
  const audioContext = context
  await new Promise((resolve, reject) => { audioContext.onPlay(resolve); audioContext.onError(() => { if (context === audioContext) stopPlayback(); reject(new Error('示范暂时无法播放，请稍后再试。')) }); audioContext.onEnded(() => { if (context === audioContext) stopPlayback() }); audioContext.play() })
  // #endif
}
export async function deleteAudio(record) {
  stopPlayback()
  // #ifdef H5
  await writeAudio(record.id, null, true)
  // #endif
  // #ifndef H5
  await new Promise((resolve, reject) => uni.removeSavedFile({ filePath: record.path, success: resolve, fail: reject }))
  // #endif
}
