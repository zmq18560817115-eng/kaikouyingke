import {randomBytes,createHmac,timingSafeEqual,createHash} from 'node:crypto'
import {AssessmentError,configured,evaluateSpeech} from './tencent-soe.mjs'
const MAX_AUDIO=2*1024*1024,MAX_BODY=3*1024*1024
export function validateAudio(body){
 if(!body||body.consent!==true)throw new AssessmentError('CONSENT_REQUIRED','请先同意将本次录音发送至腾讯云进行发音评测。',400)
 if(!['wav','mp3'].includes(body.format)||typeof body.audio!=='string'||!body.audio.length||body.audio.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.audio))throw new AssessmentError('INVALID_AUDIO','录音数据无效，请重新录制。',400)
 const audio=Buffer.from(body.audio,'base64')
 if(!audio.length||audio.length>MAX_AUDIO)throw new AssessmentError('AUDIO_TOO_LARGE','录音过大，请将本次讲述控制在一分钟内。',413)
 let duration
 if(body.format==='wav'){
  if(audio.length<44||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE'||audio.readUInt32LE(4)+8!==audio.length)throw new AssessmentError('INVALID_AUDIO','录音格式无效，请重新录制。',400)
  let offset=12,formatOk=false,data
  while(offset+8<=audio.length){const size=audio.readUInt32LE(offset+4),end=offset+8+size;if(end>audio.length)throw new AssessmentError('INVALID_AUDIO','录音文件不完整，请重新录制。',400);const chunk=audio.toString('ascii',offset,offset+4);if(chunk==='fmt '&&size>=16)formatOk=audio.readUInt16LE(offset+8)===1&&audio.readUInt16LE(offset+10)===1&&audio.readUInt32LE(offset+12)===16000&&audio.readUInt32LE(offset+16)===32000&&audio.readUInt16LE(offset+20)===2&&audio.readUInt16LE(offset+22)===16;if(chunk==='data')data=audio.subarray(offset+8,end);offset=end+(size%2)}
  if(!formatOk||!data||data.length%2)throw new AssessmentError('INVALID_AUDIO','请使用16kHz单声道录音。',400)
  duration=data.length/32000
  if(!data.some(byte=>byte!==0))throw new AssessmentError('NO_SPEECH','没有录到声音，请检查麦克风后重新录制。')
 }else{
  if(!(audio.toString('ascii',0,3)==='ID3'||(audio[0]===0xff&&(audio[1]&0xe0)===0xe0)))throw new AssessmentError('INVALID_AUDIO','MP3录音格式无效，请重新录制。',400)
  duration=body.duration
 }
 if(typeof duration!=='number'||!Number.isFinite(duration)||duration<1.5||duration>60)throw new AssessmentError('AUDIO_DURATION','请录制2到59秒的普通话讲述，再进行评分。')
 return {audio,format:body.format,duration}
}
export function createAssessmentApi({env=process.env,evaluate=evaluateSpeech,now=()=>Date.now()}={}){
 const secret=randomBytes(32),quota=new Map(),cache=new Map();let concurrent=0,dailyCount=0,day=''
 const sign=text=>createHmac('sha256',secret).update(text).digest('base64url')
 const ip=req=>(String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',').pop().trim()).slice(0,100)
 const tokenFor=req=>{const data=Math.floor(now()/1000)+'.'+randomBytes(12).toString('hex');return data+'.'+sign(data+'|'+ip(req))}
 const verify=(token,req)=>{if(typeof token!=='string'||token.length>160)return false;const parts=token.split('.');if(parts.length!==3)return false;const age=now()/1000-Number(parts[0]);if(!Number.isFinite(age)||age<0||age>900)return false;const expected=Buffer.from(sign(parts[0]+'.'+parts[1]+'|'+ip(req))),actual=Buffer.from(parts[2]);return expected.length===actual.length&&timingSafeEqual(expected,actual)}
 const limit=Number(env.SPEECH_DAILY_LIMIT)||100
 const allowedOrigin=req=>{if(!req.headers.origin)return true;try{const origin=new URL(req.headers.origin);return ['http:','https:'].includes(origin.protocol)&&(origin.host===req.headers.host||(env.SPEECH_ALLOWED_ORIGINS||'').split(',').includes(origin.origin)||(env.NODE_ENV!=='production'&&['http://127.0.0.1:5174','http://localhost:5174'].includes(origin.origin)))}catch{return false}}
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
 return async function assessmentApi(req,res,pathname){
  if(!pathname.startsWith('/api/speech/'))return false
  try{
   if(!allowedOrigin(req))throw new AssessmentError('ORIGIN_DENIED','此来源不能调用语音评测。',403)
   if(pathname==='/api/speech/capabilities'&&req.method==='GET'){
    const enabled=configured(env)
    json(res,200,{enabled,provider:'tencent-soe',language:'zh-CN',mode:'free-speech',maxDuration:59,token:enabled?tokenFor(req):null,expiresAt:now()+14*60*1000,message:enabled?'录音结束后可上传本次回答，查看发音分数。':'发音评测服务尚未开通，当前录音只保存在本机。'})
    return true
   }
   if(pathname!=='/api/speech/assess')throw new AssessmentError('NOT_FOUND','没有找到此接口。',404)
   if(req.method!=='POST')throw new AssessmentError('METHOD_NOT_ALLOWED','请使用POST上传录音。',405)
   if(!configured(env))throw new AssessmentError('NOT_CONFIGURED','发音评测服务尚未开通，录音仍保存在本机。',503)
   if(!verify(req.headers['x-assessment-token'],req))throw new AssessmentError('TOKEN_EXPIRED','评分授权已过期，请重新点击发音打分。',401)
   if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new AssessmentError('CONTENT_TYPE','录音上传格式无效。',415)
   const currentDay=new Date(now()+8*60*60*1000).toISOString().slice(0,10)
   if(day!==currentDay){day=currentDay;dailyCount=0;quota.clear()}
   const caller=ip(req)
   if(concurrent>=2)throw new AssessmentError('BUSY','评分正在排队，请稍后再试。',429)
   concurrent++
   if(Number(req.headers['content-length'])>MAX_BODY){concurrent--;req.resume();throw new AssessmentError('AUDIO_TOO_LARGE','录音过大，请缩短后重试。',413)}
   const controller=new AbortController(),onClose=()=>{if(!res.writableEnded)controller.abort()}
   res.on('close',onClose)
   try{
    let bytes=0,chunks=[]
    const readTimer=setTimeout(()=>controller.abort(),15000)
    const onAbort=()=>req.destroy()
    controller.signal.addEventListener('abort',onAbort,{once:true})
    let body
    try{for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BODY)throw new AssessmentError('AUDIO_TOO_LARGE','录音过大，请缩短后重试。',413);chunks.push(chunk)}body=JSON.parse(Buffer.concat(chunks).toString())}catch(error){if(error instanceof AssessmentError)throw error;throw new AssessmentError('INVALID_BODY','录音上传不完整，请重试。',400)}finally{clearTimeout(readTimer);controller.signal.removeEventListener('abort',onAbort);chunks=[]}
    const input=validateAudio(body),hash=createHash('sha256').update(caller).update(input.audio).digest('hex')
    for(const [key,value]of cache)if(value.expiry<now())cache.delete(key)
    const existing=cache.get(hash)
    if(existing){json(res,200,await existing.promise);return true}
    const usage=quota.get(caller)||{count:0,last:0}
    if(dailyCount>=Math.min(Math.max(limit,1),1000)||usage.count>=20)throw new AssessmentError('DAILY_LIMIT','今日评测体验次数已用完，请明天再练。',429)
    if(now()-usage.last<3000)throw new AssessmentError('RATE_LIMIT','正在处理，请稍后再点击评分。',429)
    dailyCount++;quota.set(caller,{count:usage.count+1,last:now()})
    const promise=evaluate(input.audio,{format:input.format,env,signal:controller.signal})
    cache.set(hash,{promise,expiry:now()+10*60*1000})
    try{const result=await promise;if(!controller.signal.aborted)json(res,200,result)}catch(error){cache.delete(hash);throw error}
   }finally{concurrent--;res.removeListener('close',onClose)}
  }catch(error){
   if(!res.destroyed&&!res.writableEnded)json(res,error instanceof AssessmentError?error.status:500,{code:error instanceof AssessmentError?error.code:'INTERNAL',message:error instanceof AssessmentError?error.message:'评分暂未完成，录音仍保存在本机。'})
  }
  return true
 }
}
