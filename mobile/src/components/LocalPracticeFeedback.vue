<template>
  <view class="local-feedback card" aria-live="polite">
    <view class="row-between"><text class="card-title">{{reference?'跟读练习反馈':'讲述练习反馈'}}</text><text class="badge green">本机分析</text></view>
    <text class="small muted">{{reference?'核对说了哪些字，再听听哪里可以更连贯。':'自由讲述只反馈语速和停顿，内容由你自己组织。'}}</text>
    <template v-if="result">
      <view v-if="result.metrics.noVoice" class="feedback-message amber">这次没有检测到足够的有声片段。请靠近麦克风，在安静处再录一遍。</view>
      <template v-else>
        <view class="local-metrics">
          <view><text class="local-metric-label">{{reference?'跟读完整度':'已识别字数'}}</text><text class="local-metric-value">{{reference?(result.reading?result.reading.completeness+'%':'待核对'):(result.transcript?recognizedCount+' 字':'待识别')}}</text><text class="tiny muted">{{reference?'仅按识别文字比对':'自由讲述不计算完整度'}}</text></view>
          <view><text class="local-metric-label">语速</text><text class="local-metric-value">{{result.rate===null?(result.transcript?'片段过短':'待识别'):result.rate}}</text><text class="tiny muted">{{result.rate===null?(result.transcript?'有声跨度不足1秒':'需识别文字后估算'):'字/分钟 · 估算'}}</text></view>
          <view><text class="local-metric-label">较长停顿</text><text class="local-metric-value">{{result.metrics.pauses.length}}<text class="small"> 处</text></text><text class="tiny muted">0.6 秒及以上 · 估算</text></view>
        </view>
        <view v-if="result.transcript" class="local-transcript"><text class="eyebrow">本机识别到</text><text>{{result.transcript}}</text><text class="tiny muted">识别可能有误，请结合原录音回听。</text></view>
        <view v-if="result.reading" class="reading-alignment"><text class="eyebrow">对照练习原句</text><view><text v-for="(w,i) in result.reading.words" :key="i" :class="{'reading-revisit':!w.matched}">{{w.text}}</text></view><text class="small muted">{{result.reading.revisit.length?'标色内容未能从识别文字中核对到，建议回听；不代表发音一定有错。':'这次识别文字覆盖了原句，可以再听听语气和句尾。'}}</text></view>
        <view v-if="result.metrics.pauses.length" class="pause-list"><text class="eyebrow">这些位置可以再听一遍</text><button role="button" v-for="(pause,i) in result.metrics.pauses.slice(0,5)" :key="i" class="pause-item" :disabled="recordingActive" @click="listen(pause.start)"><AppIcon name="play" :size="18"/><text>{{pause.start.toFixed(1)}}–{{pause.end.toFixed(1)}} 秒</text><text class="small muted">停顿 {{pause.duration.toFixed(1)}} 秒</text></button><text v-if="result.metrics.pauses.length>5" class="tiny muted">另有 {{result.metrics.pauses.length-5}} 处，可回听整段录音。</text></view>
        <text class="small muted local-detail">录音 {{result.metrics.duration}} 秒 · 有声片段约 {{result.metrics.voiceSeconds}} 秒 · 最长连续片段 {{result.metrics.longestRunSeconds}} 秒</text>
        <text v-if="result.metrics.noiseCaution||result.metrics.clipped" class="small local-warning">{{result.metrics.clipped?'录音音量偏大，试着离麦克风远一点。':'背景音可能持续存在，建议换到安静处重录，停顿估计可能不准。'}}</text>
        <view v-if="comparison" class="local-comparison green"><text class="strong">与上次同一句练习对比</text><text v-if="comparison.completeness!==null">文字完整度{{delta(comparison.completeness,' 个百分点')}}</text><text>较长停顿{{delta(comparison.pauseChange,' 处')}}</text><text v-if="comparison.rateChange!==null">语速{{delta(comparison.rateChange,' 字/分')}}</text><text class="tiny muted">数值变化供回听参考，语速越快或停顿越少不一定越好。</text></view>
      </template>
    </template>
    <text v-if="error" class="small local-warning">{{error}}</text>
    <text v-if="basicBusy" class="small muted local-status">正在本机分析录音…</text>
    <text v-else-if="!recording" class="small muted local-status">录下一次回答，结束后即可查看停顿；文字核对需要加载识别包。</text>
    <template v-if="!readOnly&&recording&&result&&!result.metrics.noVoice&&!result.transcript&&supported">
      <view v-if="modelBusy" class="local-model-progress"><text>{{localSpeech.status==='initializing'?'正在本机启动识别…':'加载文字识别包 '+localSpeech.progress+'%'}}</text><view class="progress-track"><view :style="{width:localSpeech.progress+'%'}"/></view><button role="button" class="text-button" @click="cancelModel">取消加载</button></view>
      <button role="button" v-else class="secondary" :disabled="recognizing||recordingActive" @click="recognize">{{recognizing?'正在本机核对…':localSpeech.status==='ready'?'核对这次录音':localSpeech.cached?'加载已下载的文字识别包':'下载文字识别包并核对'}}</button>
      <text v-if="!localSpeech.cached&&localSpeech.status!=='ready'&&!modelBusy" class="tiny muted">首次约 240 MB，建议使用 Wi-Fi；下载模型后在本机识别，录音不上传。设备内存或存储不足时可继续回听。</text>
      <button role="button" v-if="recognizing" class="text-button" @click="cancelRecognition">取消本次核对</button>
    </template>
    <text v-if="recording&&!supported&&!readOnly" class="tiny muted local-status">此端暂不支持本机文字识别；可用网页版核对跟读内容。</text>
    <button role="button" v-if="!readOnly&&recording&&!result&&!basicBusy" class="secondary" :disabled="recordingActive" @click="analyze">重新分析录音</button>
    <text class="tiny muted local-boundary">本机反馈用于练习，不提供声母、韵母、声调或发音准确度评分。</text>
    <template v-if="!readOnly&&allowProfessional"><button role="button" class="text-button local-professional" @click="showProfessional=!showProfessional">{{showProfessional?'收起专业评测':'更多：专业发音评测'}}</button><PronunciationAssessment v-if="showProfessional" :recording="recording" :question="question"/></template>
  </view>
</template>
<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import PronunciationAssessment from './PronunciationAssessment.vue'
import { state, updateState } from '../store'
import { playRecording } from '../services/audio'
import { analyzeLocalAudio, buildLocalFeedback, compareLocalFeedback, normalizeSpeechText, validLocalFeedback } from '../../shared/local-feedback.mjs'
import { localSpeech, localRecognitionSupported, checkLocalSpeechCache, readLocalSamples, loadLocalSpeech, recognizeLocalSamples, cancelLocalSpeech } from '../services/local-speech'
const props = defineProps({ recording: { type: Object, default: null }, reference: { type: String, default: '' }, question: { type: String, default: '' }, readOnly: Boolean, recordingActive: Boolean, allowProfessional: { type: Boolean, default: true } })
const result = computed(() => validLocalFeedback(props.recording?.localFeedback))
const supported = localRecognitionSupported(), basicBusy = ref(false), recognizing = ref(false), error = ref(''), showProfessional = ref(false)
const modelBusy = computed(() => ['loading', 'initializing'].includes(localSpeech.status))
const recognizedCount = computed(() => normalizeSpeechText(result.value?.transcript).length)
const comparison = computed(() => {
  if (!props.reference || !props.recording?.practiceKey || !result.value) return null
  const index = state.recordings.findIndex(r => r.id === props.recording.id)
  const previous = state.recordings.slice(index + 1).find(r => r.practiceKey === props.recording.practiceKey && validLocalFeedback(r.localFeedback))
  return previous ? compareLocalFeedback(result.value, previous.localFeedback) : null
})
let disposed = false, sequence = 0, ownsModel = false
const delta = (value, unit) => value === 0 ? '持平' : (value > 0 ? '增加 ' : '减少 ') + Math.abs(value) + unit
function save(recordId, feedback) {
  if (!state.recordings.some(r => r.id === recordId)) return
  if (!updateState(s => { s.recordings.find(r => r.id === recordId).localFeedback = feedback })) throw new Error('反馈未能保存，请检查本机空间后重试。')
}
async function analyze() {
  if (!props.recording || props.readOnly || basicBusy.value || result.value) return
  const id = props.recording.id, record = props.recording, reference = props.reference, current = ++sequence
  basicBusy.value = true; error.value = ''
  try {
    const samples = await readLocalSamples(record), metrics = analyzeLocalAudio(samples)
    if (disposed || current !== sequence || props.recording?.id !== id) return
    save(id, buildLocalFeedback(metrics, { reference, mode: reference ? 'repeat' : 'free' }))
  } catch (e) { if (!disposed && current === sequence) error.value = e.message }
  finally { if (current === sequence) basicBusy.value = false }
}
async function recognize() {
  if (!props.recording || !result.value || recognizing.value || modelBusy.value || props.recordingActive) return
  const id = props.recording.id, record = props.recording, reference = props.reference, current = ++sequence
  error.value = ''
  try {
    if (localSpeech.status !== 'ready') {
      if (!localSpeech.cached) {
        const consent = await new Promise(resolve => uni.showModal({ title: '下载本机文字识别包？', content: '首次需要下载约240 MB，建议连接 Wi-Fi。识别在本机进行，录音不会上传；清除浏览器数据后需要重新下载。', confirmText: '下载并核对', cancelText: '暂不下载', confirmColor: '#237a59', success: r => resolve(r.confirm), fail: () => resolve(false) }))
        if (!consent || disposed || current !== sequence) return
      }
      ownsModel = true
      await loadLocalSpeech()
      ownsModel = false
    }
    if (disposed || current !== sequence || props.recording?.id !== id) return
    recognizing.value = true
    const samples = await readLocalSamples(record), transcript = await recognizeLocalSamples(samples)
    if (disposed || current !== sequence || props.recording?.id !== id) return
    if (!normalizeSpeechText(transcript)) throw new Error('这次没有识别到清楚的文字，可以回听后再录一遍。')
    save(id, buildLocalFeedback(analyzeLocalAudio(samples), { reference, mode: reference ? 'repeat' : 'free', transcript, recognized: true }))
  } catch (e) { if (!disposed && current === sequence) error.value = e.message }
  finally { ownsModel = false; if (current === sequence) recognizing.value = false }
}
async function listen(start) { if (props.recordingActive) return; try { await playRecording(props.recording, Math.max(0, start - .4)) } catch (e) { error.value = e.message } }
function cancelModel() { if (!ownsModel) return; cancelLocalSpeech(); ownsModel = false }
function cancelRecognition() { sequence++; cancelLocalSpeech(); recognizing.value = false; error.value = '已取消核对，录音仍保存在本机。' }
watch(() => props.recording?.id, () => { sequence++; if (ownsModel || recognizing.value) cancelLocalSpeech(); ownsModel = false; recognizing.value = false; basicBusy.value = false; error.value = ''; showProfessional.value = false; if (!props.readOnly) analyze() }, { immediate: true })
if (!props.readOnly) checkLocalSpeechCache()
onUnmounted(() => { disposed = true; sequence++; if (ownsModel || recognizing.value) cancelLocalSpeech() })
</script>
