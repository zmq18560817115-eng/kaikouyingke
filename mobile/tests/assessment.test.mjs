import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {signedUrl,normalizeResult,evaluateSpeech,AssessmentError} from '../server/tencent-soe.mjs'
import {validateAudio} from '../server/assessment-api.mjs'
import {createStaticServer} from '../scripts/serve-h5.mjs'
import {encodeWav} from '../shared/wav.mjs'
import {validAssessment,averageAssessment} from '../shared/assessment.mjs'
const env={SPEECH_ASSESSMENT_ENABLED:'true',TENCENT_SOE_APP_ID:'123',TENCENT_SECRET_ID:'test-id',TENCENT_SECRET_KEY:'test-key',NODE_ENV:'production'}
const fixture={SentenceId:-1,PronAccuracy:84.6,PronFluency:.8,Words:[{Word:'青',PronAccuracy:94},{Word:'稞',PronAccuracy:62,Tone:{Valid:true,RefTone:1,HypTone:3}}]}
const samples=()=>Float32Array.from({length:32000},(_,i)=>Math.sin(i*.02)*.2)
const body=()=>({consent:true,format:'wav',audio:Buffer.from(encodeWav(samples())).toString('base64')})
test('签名遵循腾讯云原文排序与HMAC协议，使用普通话自由说及录音模式',()=>{
 const url=new URL(signedUrl(env,'wav','voice-id',1700000000,1234))
 const canonical='soe.cloud.tencent.com/soe/api/123?eval_mode=3&expired=1700000300&nonce=1234&rec_mode=1&score_coeff=3&secretid=test-id&sentence_info_enabled=1&server_engine_type=16k_zh&text_mode=0&timestamp=1700000000&voice_format=1&voice_id=voice-id'
 assert.equal(url.searchParams.get('signature'),createHmac('sha1','test-key').update(canonical).digest('base64'))
 assert.equal(url.searchParams.has('ref_text'),false);assert.equal(url.searchParams.get('rec_mode'),'1')
})
test('分数仅来自供应商最终结果，返回识别文本和字词建议',()=>{
 const result=normalizeResult(fixture,'real-request')
 assert.equal(result.score,85);assert.equal(result.fluency,80);assert.equal(result.transcript,'青稞');assert.match(result.advice,/稞/);assert.equal(result.words[1].toneIssue,true);assert.ok(validAssessment(result))
 for(const accuracy of [-1,101,null,'90',NaN])assert.throws(()=>normalizeResult({...fixture,PronAccuracy:accuracy},'r'),/有效的发音分数/)
 assert.throws(()=>normalizeResult({...fixture,Words:[]},'r'),/普通话/)
 assert.equal(validAssessment({...result,score:99}),null);assert.equal(validAssessment({...result,evidence:null}),null)
 assert.deepEqual(averageAssessment([{assessment:result},null,{assessment:{...result,accuracy:75,score:75}}]),{count:2,score:80})
})
function transport(messages){return class extends EventTarget{
 static sent=[]
 constructor(url){super();this.id=new URL(url).searchParams.get('voice_id');queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({code:0,voice_id:this.id})})))}
 send(data){this.constructor.sent.push(data);if(typeof data==='string')for(const message of messages)queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({code:0,voice_id:this.id,...message})})))}
 close(){this.dispatchEvent(new Event('close'))}
}}
test('握手后一次上传录音，收到最终标记才返回评分',async()=>{
 const Socket=transport([{result:fixture},{final:1}]);const result=await evaluateSpeech(Buffer.from('audio'),{format:'wav',env,WebSocketClass:Socket})
 assert.equal(result.score,85);assert.equal(Socket.sent.length,2);assert.equal(Socket.sent[1],'{"type":"end"}')
})
test('中间结果、静音、超时和取消不会冒充成功分数',async()=>{
 await assert.rejects(evaluateSpeech(Buffer.from('x'),{format:'wav',env,WebSocketClass:transport([{result:{...fixture,SentenceId:0}},{final:1}])}),e=>e.code==='NO_SCORE')
 await assert.rejects(evaluateSpeech(Buffer.from('x'),{format:'wav',env,WebSocketClass:transport([{code:4105}])}),e=>e.code==='NO_SPEECH')
 await assert.rejects(evaluateSpeech(Buffer.from('x'),{format:'wav',env,WebSocketClass:transport([]),timeoutMs:10}),e=>e.code==='TIMEOUT')
 const controller=new AbortController(),pending=evaluateSpeech(Buffer.from('x'),{format:'wav',env,WebSocketClass:transport([]),signal:controller.signal});controller.abort();await assert.rejects(pending,e=>e.code==='CANCELLED')
 await assert.rejects(evaluateSpeech(Buffer.from('x'),{env:{}}),e=>e.code==='NOT_CONFIGURED')
})
test('音频校验拒绝未授权、静音、过短、错误采样率和损坏文件',()=>{
 assert.equal(validateAudio(body()).duration,2)
 assert.throws(()=>validateAudio({...body(),consent:false}),e=>e.code==='CONSENT_REQUIRED')
 assert.throws(()=>validateAudio({...body(),audio:Buffer.from(encodeWav(new Float32Array(32000))).toString('base64')}),e=>e.code==='NO_SPEECH')
 assert.throws(()=>validateAudio({...body(),audio:Buffer.from(encodeWav(samples().slice(0,1000))).toString('base64')}),e=>e.code==='AUDIO_DURATION')
 const bad=Buffer.from(encodeWav(samples()));bad.writeUInt32LE(48000,24);assert.throws(()=>validateAudio({...body(),audio:bad.toString('base64')}),e=>e.code==='INVALID_AUDIO')
 assert.throws(()=>validateAudio({...body(),audio:'bad'}),e=>e.code==='INVALID_AUDIO')
})
test('未配置服务时接口明确停用，不提供上传令牌或虚构分数',async()=>{
 const server=createStaticServer(process.cwd(),{env:{}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 try{const capabilities=await(await fetch(base+'/api/speech/capabilities')).json();assert.equal(capabilities.enabled,false);assert.equal(capabilities.token,null);const r=await fetch(base+'/api/speech/assess',{method:'POST'});assert.equal(r.status,503);assert.equal((await r.json()).code,'NOT_CONFIGURED')}finally{await new Promise(r=>server.close(r))}
})
test('评测接口检查授权和来源，成功结果幂等返回且不重复调用供应商',async()=>{
 let calls=0,clock=Date.now()
 const server=createStaticServer(process.cwd(),{env,now:()=>clock,evaluate:async()=>{calls++;return normalizeResult(fixture,'test-request')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 try{
  const cap=await(await fetch(base+'/api/speech/capabilities')).json();assert.equal(cap.enabled,true);assert.equal(JSON.stringify(cap).includes('test-key'),false)
  const post=(payload,headers={})=>fetch(base+'/api/speech/assess',{method:'POST',headers:{'Content-Type':'application/json','X-Assessment-Token':cap.token,...headers},body:JSON.stringify(payload)})
  assert.equal((await post(body(),{'Origin':'https://untrusted.example'})).status,403)
  assert.equal((await post(body(),{'X-Assessment-Token':'fake'})).status,401)
  assert.equal((await post({...body(),consent:false})).status,400)
  let response=await post(body());assert.equal(response.status,200);assert.equal((await response.json()).score,85)
  clock+=4000;response=await post(body());assert.equal(response.status,200);assert.equal(calls,1)
  clock+=16*60*1000;assert.equal((await post(body())).status,401)
 }finally{await new Promise(r=>server.close(r))}
})
test('每日额度拒绝新的录音，但允许已完成录音幂等取回',async()=>{
 let calls=0
 const server=createStaticServer(process.cwd(),{env:{...env,SPEECH_DAILY_LIMIT:'1'},evaluate:async()=>{calls++;return normalizeResult(fixture,'quota-test')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
 try{const cap=await(await fetch(base+'/api/speech/capabilities')).json();const post=payload=>fetch(base+'/api/speech/assess',{method:'POST',headers:{'Content-Type':'application/json','X-Assessment-Token':cap.token},body:JSON.stringify(payload)});assert.equal((await post(body())).status,200);assert.equal((await post(body())).status,200);const other=samples();other[0]=.9;const response=await post({...body(),audio:Buffer.from(encodeWav(other)).toString('base64')});assert.equal(response.status,429);assert.equal((await response.json()).code,'DAILY_LIMIT');assert.equal(calls,1)}finally{await new Promise(r=>server.close(r))}
})
test('WAV编码固定为16kHz单声道并安全裁剪峰值',()=>{
 const data=new DataView(encodeWav(Float32Array.from([-2,-1,0,1,2,NaN])))
 assert.equal(data.getUint32(24,true),16000);assert.equal(data.getUint16(22,true),1);assert.equal(data.getInt16(44,true),-32768);assert.equal(data.getInt16(52,true),32767);assert.equal(data.getInt16(54,true),0)
})
