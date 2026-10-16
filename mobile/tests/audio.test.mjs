import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source=(await readFile(new URL('../src/services/audio.js',import.meta.url),'utf8')).replace(/\/\/ #ifndef H5[\s\S]*?\/\/ #endif/g,'').replace(/\/\/ #(?:ifdef H5|endif)/g,'')
test('连续停止及系统自然停止保留同一录音，释放麦克风',async()=>{
 const original={navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator'),MediaRecorder:globalThis.MediaRecorder}
 let stopped=0,instance
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++}}]})}}})
 globalThis.MediaRecorder=class{constructor(){instance=this;this.state='inactive';this.mimeType='audio/webm'}start(){this.state='recording'}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['sound'])});this.onstop()})}}
 try{
  const audio=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
  let interrupted=0;audio.onInterrupted(()=>interrupted++)
  await audio.startRecording();const [a,b]=await Promise.all([audio.stopRecording(),audio.stopRecording()]);assert.equal(a,b);assert.equal(a.blob.size,5);assert.equal(stopped,1);URL.revokeObjectURL(a.path)
  await audio.startRecording();instance.stop();await new Promise(r=>setImmediate(r));const natural=await audio.stopRecording();assert.equal(natural.blob.size,5);assert.equal(stopped,2);assert.equal(interrupted,2);URL.revokeObjectURL(natural.path)
 }finally{if(original.navigator)Object.defineProperty(globalThis,'navigator',original.navigator);else delete globalThis.navigator;globalThis.MediaRecorder=original.MediaRecorder}
})
