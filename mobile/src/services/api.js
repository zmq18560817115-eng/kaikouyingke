import { getRecordingBlob } from './audio'
import { encodeWav } from '../../shared/wav.mjs'
import { validAssessment } from '../../shared/assessment.mjs'
let base=import.meta.env.VITE_TRAINING_API_BASE||''
// #ifndef H5
base=base||'https://kaikouyingke-production.up.railway.app'
// #endif
base=base.replace(/\/$/,'')
let capabilities
function jsonRequest(path,{method='GET',data,header={},timeout=15000}={}){
 let task
 const promise=new Promise((resolve,reject)=>{
  task=uni.request({url:base+path,method,data,header,timeout,success:response=>{
   let body=response.data
   try{if(typeof body==='string')body=JSON.parse(body)}catch{return reject(new Error('评分服务返回异常，请稍后重试。'))}
   if(response.statusCode<200||response.statusCode>=300){const error=new Error(body?.message||'评分暂未完成，录音仍保存在本机。');error.code=body?.code;return reject(error)}
   resolve(body)
  },fail:()=>reject(new Error('网络暂时无法连接，录音仍保存在本机。'))})
 })
 return {promise,cancel:()=>task?.abort()}
}
export async function getAssessmentCapabilities(force=false){
 if(!force&&capabilities&&capabilities.expiry>Date.now())return capabilities.promise
 const promise=jsonRequest('/api/speech/capabilities').promise
 capabilities={promise,expiry:Date.now()+60000}
 try{return await promise}catch(error){capabilities=null;throw error}
}
export async function prepareAssessmentAudio(record){
 // #ifdef H5
 const blob=await getRecordingBlob(record.id)
 if(!blob)throw new Error('这条录音已不在本机，请重新录制。')
 const AudioContextClass=window.AudioContext||window.webkitAudioContext
 const OfflineContext=window.OfflineAudioContext||window.webkitOfflineAudioContext
 if(!AudioContextClass||!OfflineContext)throw new Error('当前浏览器无法处理录音，请换用支持录音的手机浏览器。')
 const context=new AudioContextClass()
 let decoded
 try{decoded=await context.decodeAudioData(await blob.arrayBuffer())}catch{throw new Error('录音无法读取，请重新录制。')}finally{await context.close()}
 if(decoded.duration<1.5||decoded.duration>60)throw new Error('请录制2到59秒的普通话讲述，再进行评分。')
 const offline=new OfflineContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource()
 source.buffer=decoded;source.connect(offline.destination);source.start()
 const mono=await offline.startRendering(),bytes=new Uint8Array(encodeWav(mono.getChannelData(0)))
 let binary=''
 for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768))
 return {format:'wav',audio:btoa(binary),duration:decoded.duration}
 // #endif
 // #ifndef H5
 if(record.duration<1.5||record.duration>60)throw new Error('请录制2到59秒的普通话讲述，再进行评分。')
 const audio=await new Promise((resolve,reject)=>uni.getFileSystemManager().readFile({filePath:record.path,encoding:'base64',success:r=>resolve(r.data),fail:()=>reject(new Error('录音文件无法读取，请重新录制。'))}))
 return {format:'mp3',audio,duration:record.duration}
 // #endif
}
export function requestAssessment(audio,token){
 const request=jsonRequest('/api/speech/assess',{method:'POST',data:{...audio,consent:true},header:{'Content-Type':'application/json','X-Assessment-Token':token},timeout:65000})
 return {cancel:request.cancel,promise:request.promise.then(result=>{const assessment=validAssessment(result);if(!assessment)throw new Error('没有获得有效的发音分数，请重新录音后再试。');return assessment}).catch(error=>{if(error.code==='TOKEN_EXPIRED')capabilities=null;throw error})}
}
