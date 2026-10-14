let recorder,stream,chunks=[],browserRecorder,context,currentAudio
let interruptedHandler=()=>{}
let nativeStarted=false,nativeCompletion,nativeResolve,nativeReject,nativeStartResolve,nativeStartReject
export function onInterrupted(fn){interruptedHandler=fn}
export function speechAvailable(){
  // #ifdef H5
  return typeof speechSynthesis!=='undefined'
  // #endif
  // #ifndef H5
  return false
  // #endif
}
export function stopPlayback(){
  // #ifdef H5
  if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel()
  if(currentAudio){currentAudio.pause();URL.revokeObjectURL(currentAudio.src);currentAudio=null}
  // #endif
  if(context){context.stop();context.destroy();context=null}
}
export function speak(text,slow=false){
  stopPlayback()
  // #ifdef H5
  if(typeof speechSynthesis!=='undefined'){const msg=new SpeechSynthesisUtterance(text);msg.lang='zh-CN';msg.rate=slow?.65:.88;speechSynthesis.speak(msg);return true}
  // #endif
  return false
}
export async function startRecording(){
  stopPlayback()
  // #ifdef H5
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('当前浏览器无法录音，请使用HTTPS或本机预览。')
  stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[]
  try{browserRecorder=new MediaRecorder(stream)}catch(e){stream.getTracks().forEach(t=>t.stop());throw e}
  browserRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
  browserRecorder.start();return
  // #endif
  // #ifndef H5
  if(!recorder){
    recorder=uni.getRecorderManager()
    recorder.onStart(()=>{nativeStarted=true;nativeStartResolve?.()})
    recorder.onError(e=>{nativeStarted=false;const error=new Error(e.errMsg||'无法打开麦克风');nativeStartReject?.(error);nativeReject?.(error)})
    recorder.onStop(result=>{nativeStarted=false;uni.saveFile({tempFilePath:result.tempFilePath,success:r=>nativeResolve?.({path:r.savedFilePath,mime:'audio/mp3'}),fail:e=>nativeReject?.(e)})})
    recorder.onInterruptionBegin(()=>{if(nativeStarted)recorder.stop();interruptedHandler()})
  }
  nativeCompletion=new Promise((resolve,reject)=>{nativeResolve=resolve;nativeReject=reject})
  nativeCompletion.catch(()=>{})
  await new Promise((resolve,reject)=>{nativeStartResolve=resolve;nativeStartReject=reject;recorder.start({duration:60000,sampleRate:16000,numberOfChannels:1,format:'mp3'})})
  // #endif
}
export async function stopRecording(){
  // #ifdef H5
  if(!browserRecorder||browserRecorder.state==='inactive')return null
  return new Promise(resolve=>{browserRecorder.onstop=()=>{const blob=new Blob(chunks,{type:browserRecorder.mimeType});stream?.getTracks().forEach(t=>t.stop());resolve({blob,path:URL.createObjectURL(blob),mime:blob.type})};browserRecorder.stop()})
  // #endif
  // #ifndef H5
  if(nativeStarted)recorder.stop()
  return nativeCompletion
  // #endif
}
async function mediaDB(){
  return new Promise((resolve,reject)=>{const r=indexedDB.open('kaikou-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('recordings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
}
export async function storeAudio(id,audio){
  // #ifdef H5
  const db=await mediaDB();await new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').put(audio.blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();URL.revokeObjectURL(audio.path)
  // #endif
  return audio.path
}
export async function playRecording(record){
  stopPlayback()
  // #ifdef H5
  const db=await mediaDB();const blob=await new Promise((resolve,reject)=>{const r=db.transaction('recordings').objectStore('recordings').get(record.id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();if(!blob)throw new Error('这条录音已不在本机，请重新录制。');currentAudio=new Audio(URL.createObjectURL(blob));await currentAudio.play();return
  // #endif
  // #ifndef H5
  context=uni.createInnerAudioContext();context.src=record.path;context.play()
  // #endif
}
export async function deleteAudio(record){
  stopPlayback()
  // #ifdef H5
  const db=await mediaDB();await new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').delete(record.id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()
  // #endif
  // #ifndef H5
  await new Promise((resolve,reject)=>uni.removeSavedFile({filePath:record.path,success:resolve,fail:reject}))
  // #endif
}
