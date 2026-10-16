<template>
  <view class="assessment-card card" aria-live="polite">
    <view class="row-between"><text class="card-title">讲述发音打分</text><text v-if="result" class="badge green">已评测</text></view>
    <template v-if="result">
      <view class="assessment-score"><view><text class="score-number">{{result.score}}</text><text class="muted"> / 100</text><text class="small muted score-label">发音准确度</text></view><view class="fluency-score"><text class="strong">{{result.fluency===null?'未返回':result.fluency+' / 100'}}</text><text class="small muted score-label">表达流利度</text></view></view>
      <text class="eyebrow">这次识别到的讲述</text>
      <view class="assessment-transcript"><template v-if="result.words.length"><text v-for="(word,i) in result.words" :key="i" :class="{'word-needs-practice':word.accuracy<80||word.toneIssue}">{{word.text}}</text></template><text v-else>{{result.transcript}}</text></view>
      <text class="small muted">标色的字词可以优先回听、再练一遍。</text>
      <view class="assessment-advice green"><AppIcon name="speaker-high" :size="22"/><text>{{result.advice}}</text></view>
      <text class="tiny muted">来源：腾讯云普通话自由说评测。分数用于发音练习，不判断经营事实或接待能力。</text>
    </template>
    <template v-else>
      <view v-if="busy" class="assessment-progress"><AppIcon name="waveform" :size="30"/><text>{{preparing?'正在整理录音…':'正在上传并评测…'}}</text><text class="small muted">请稍等，原录音仍保存在本机。</text></view>
      <text v-else-if="error" class="body-copy assessment-error">{{error}}</text>
      <text v-else-if="checking" class="small muted">正在检查评测服务…</text>
      <text v-else-if="capability?.enabled" class="small muted">{{recording?'录音已保存，点下方按钮查看发音分数和练习建议。':'录下本次回答，结束后可进行发音打分。'}}</text>
      <text v-else class="small muted">发音打分尚未开通。录音仍保存在本机，可以先回听。</text>
    </template>
    <button v-if="busy" role="button" class="secondary" @click="cancel">取消等待</button>
    <button v-else-if="!readOnly&&recording&&!result&&capability?.enabled" role="button" class="primary" @click="assess">{{error?'重新尝试发音打分':'发音打分'}}</button>
    <button v-else-if="!readOnly&&error&&!capability" role="button" class="secondary" @click="refresh">重新连接评测服务</button>
    <text v-if="!result&&capability?.enabled&&!busy" class="service-note">只在你同意本次上传后，才发送录音进行评测。</text>
  </view>
</template>
<script setup>
import {ref,computed,onMounted,onUnmounted,watch} from 'vue'
import AppIcon from './AppIcon.vue'
import {getAssessmentCapabilities,prepareAssessmentAudio,requestAssessment} from '../services/api'
import {state,updateState} from '../store'
import {validAssessment} from '../../shared/assessment.mjs'
const props=defineProps({recording:{type:Object,default:null},question:{type:String,default:''},readOnly:{type:Boolean,default:false}})
const capability=ref(null),checking=ref(false),preparing=ref(false),busy=ref(false),error=ref('')
const result=computed(()=>validAssessment(props.recording?.assessment))
let request,sequence=0,disposed=false
async function refresh(){checking.value=true;error.value='';try{const value=await getAssessmentCapabilities(true);if(!disposed)capability.value=value}catch(e){if(!disposed)error.value=e.message}finally{if(!disposed)checking.value=false}}
function consent(){return new Promise(resolve=>uni.showModal({title:'上传本次录音并评分？',content:'本次回答将发送至腾讯云进行普通话发音评测。本站仅临时处理，不保存云端录音文件；评分结果保存在本机。服务商按其数据政策处理音频。',confirmText:'同意并评分',cancelText:'暂不上传',confirmColor:'#237a59',success:r=>resolve(r.confirm),fail:()=>resolve(false)}))}
async function assess(){
 if(busy.value||!props.recording||!capability.value?.enabled)return
 const id=props.recording.id,question=props.question,record=props.recording,consentSequence=sequence
 if(!await consent()||disposed||consentSequence!==sequence||props.recording?.id!==id)return
 const current=++sequence;busy.value=true;preparing.value=true;error.value=''
 try{
  const cap=await getAssessmentCapabilities()
  if(!cap.enabled)throw new Error('发音评测服务尚未开通，录音仍保存在本机。')
  const audio=await prepareAssessmentAudio(record)
  if(disposed||sequence!==current)return
  preparing.value=false;request=requestAssessment(audio,cap.token)
  const assessment=await request.promise
  if(disposed||sequence!==current||props.recording?.id!==id)return
  if(!state.recordings.some(r=>r.id===id))return
  if(!updateState(s=>{s.recordings.find(r=>r.id===id).assessment={...assessment,question}}))error.value='评分已返回，但本机保存失败。请检查空间后重试。'
 }catch(e){if(!disposed&&sequence===current)error.value=e.message||'评分暂未完成，录音仍保存在本机。'}finally{if(sequence===current){busy.value=false;preparing.value=false;request=null}}
}
function cancel(){sequence++;request?.cancel();request=null;busy.value=false;preparing.value=false;error.value='已取消等待，原录音仍在本机。'}
watch(()=>props.recording?.id,()=>{sequence++;request?.cancel();request=null;busy.value=false;preparing.value=false;error.value=''})
onMounted(async()=>{if(props.readOnly)return;checking.value=true;try{const value=await getAssessmentCapabilities();if(!disposed)capability.value=value}catch(e){if(!disposed)error.value=e.message}finally{if(!disposed)checking.value=false}})
onUnmounted(()=>{disposed=true;sequence++;request?.cancel()})
</script>
