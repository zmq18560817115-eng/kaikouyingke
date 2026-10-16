import { createHmac, randomInt, randomUUID } from 'node:crypto'
export class AssessmentError extends Error {
  constructor(code,message,status=422){super(message);this.code=code;this.status=status}
}
export function configured(env=process.env){return env.SPEECH_ASSESSMENT_ENABLED==='true'&&/^\d+$/.test(env.TENCENT_SOE_APP_ID||'')&&Boolean(env.TENCENT_SECRET_ID&&env.TENCENT_SECRET_KEY)}
export function signedUrl(env, format, requestId, now=Math.floor(Date.now()/1000), nonce=randomInt(1,2**31)) {
  const params={eval_mode:3,expired:now+300,nonce,rec_mode:1,score_coeff:3,secretid:env.TENCENT_SECRET_ID,sentence_info_enabled:1,server_engine_type:'16k_zh',text_mode:0,timestamp:now,voice_format:format==='wav'?1:2,voice_id:requestId}
  const entries=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)), canonical='soe.cloud.tencent.com/soe/api/'+env.TENCENT_SOE_APP_ID+'?'+entries.map(([k,v])=>k+'='+v).join('&')
  const signature=createHmac('sha1',env.TENCENT_SECRET_KEY).update(canonical).digest('base64')
  return 'wss://soe.cloud.tencent.com/soe/api/'+env.TENCENT_SOE_APP_ID+'?'+new URLSearchParams([...entries.map(([k,v])=>[k,String(v)]),['signature',signature]])
}
export function normalizeResult(result, requestId, partialWords=[]) {
  if(typeof result==='string'){try{result=JSON.parse(result)}catch{throw new AssessmentError('INVALID_RESULT','评测结果格式异常，请稍后重试。',502)}}
  if(!result||typeof result.PronAccuracy!=='number'||!Number.isFinite(result.PronAccuracy)||result.PronAccuracy<0||result.PronAccuracy>100)throw new AssessmentError('NO_SCORE','没有获得有效的发音分数，请在安静处重新录音。')
  const source=Array.isArray(result.Words)&&result.Words.length?result.Words:partialWords
  const words=source.filter(w=>typeof w.Word==='string'&&w.Word.trim()).map(w=>({text:w.Word.slice(0,30),accuracy:typeof w.PronAccuracy==='number'&&w.PronAccuracy>=0&&w.PronAccuracy<=100?Math.round(w.PronAccuracy):null,toneIssue:w.Tone?.Valid===true&&[1,2,3,4].includes(w.Tone.RefTone)&&[1,2,3,4].includes(w.Tone.HypothesisTone??w.Tone.HypTone)&&w.Tone.RefTone!==(w.Tone.HypothesisTone??w.Tone.HypTone)}))
  const transcript=words.map(w=>w.text).join('').slice(0,1200)
  if(!transcript)throw new AssessmentError('NO_SPEECH','没有识别到可评测的普通话，请靠近麦克风重新说一遍。')
  const accuracy=Math.round(result.PronAccuracy),fluency=typeof result.PronFluency==='number'&&result.PronFluency>=0&&result.PronFluency<=1?Math.round(result.PronFluency*100):null
  const weak=words.filter(w=>w.accuracy!==null&&(w.accuracy<80||w.toneIssue)).sort((a,b)=>a.accuracy-b.accuracy)[0]
  const advice=weak?`先回听“${weak.text}”，再放慢速度练一遍。${weak.toneIssue?'这处声调可以再对照示范。':''}`:fluency!==null&&fluency<70?'一句说完再停顿，试着把熟悉的介绍连贯地说出来。':'继续保持清楚的表达，可以再练一次更自然的接待。'
  return {provider:'tencent-soe',mode:'zh-free',score:accuracy,accuracy,fluency,transcript,words:words.filter(w=>w.accuracy!==null),advice,evidence:{requestId},assessedAt:new Date().toISOString()}
}
const providerError=code=>{
 if([4105,4108].includes(code))return new AssessmentError('NO_SPEECH','没有识别到有效人声，请在安静处重新录音。')
 if([4007,4107].includes(code))return new AssessmentError('AUDIO_FORMAT','录音格式无法评测，请重新录制。')
 if([4002,4003].includes(code))return new AssessmentError('PROVIDER_CONFIG','评测服务尚未正确开通，请联系管理员。',503)
 if([4004,4005,4006].includes(code))return new AssessmentError('PROVIDER_LIMIT','评测服务额度或并发已达上限，请稍后再试。',503)
 return new AssessmentError('PROVIDER_ERROR','语音评测暂未完成，录音仍保存在本机。',502)
}
export async function evaluateSpeech(audio,{format,env=process.env,signal,WebSocketClass=globalThis.WebSocket,timeoutMs=45000}={}) {
 if(!configured(env))throw new AssessmentError('NOT_CONFIGURED','发音评测服务尚未开通，录音仍保存在本机。',503)
 if(signal?.aborted)throw new AssessmentError('CANCELLED','已取消等待。',499)
 const requestId=randomUUID()
 return new Promise((resolve,reject)=>{
  let socket,settled=false,sent=false,aggregate
  const partials=new Map()
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);try{socket?.close()}catch{};if(error)reject(error);else resolve(result)}
  const abort=()=>finish(new AssessmentError('CANCELLED','已取消等待。',499))
  const timer=setTimeout(()=>finish(new AssessmentError('TIMEOUT','评分等待超时，请稍后重试，录音已保留。',504)),timeoutMs)
  signal?.addEventListener('abort',abort,{once:true})
  try {
   socket=new WebSocketClass(signedUrl(env,format,requestId))
   socket.addEventListener('message',event=>{
    if(settled)return
    try{
     const message=JSON.parse(typeof event.data==='string'?event.data:Buffer.from(event.data).toString())
     if(message.code!==0)return finish(providerError(message.code))
     if(message.voice_id&&message.voice_id!==requestId)return finish(new AssessmentError('INVALID_RESULT','评测结果与本次录音不匹配。',502))
     if(!sent){sent=true;socket.send(audio);socket.send(JSON.stringify({type:'end'}))}
     if(message.result){const result=typeof message.result==='string'?JSON.parse(message.result):message.result;if(result.SentenceId===-1||result.SentenceId===undefined)aggregate=result;else partials.set(result.SentenceId,result.Words||[])}
     if(message.final===1)finish(null,normalizeResult(aggregate,requestId,[...partials.values()].flat()))
    }catch(error){finish(error instanceof AssessmentError?error:new AssessmentError('INVALID_RESULT','没有获得完整的评测结果，请重试。',502))}
   })
   socket.addEventListener('error',()=>finish(new AssessmentError('NETWORK','暂时无法连接语音评测服务，请稍后重试。',502)))
   socket.addEventListener('close',()=>{if(!settled)finish(new AssessmentError('INCOMPLETE','评测连接中断，未生成分数，请重试。',502))})
  }catch{finish(new AssessmentError('NETWORK','暂时无法连接语音评测服务，请稍后重试。',502))}
 })
}
