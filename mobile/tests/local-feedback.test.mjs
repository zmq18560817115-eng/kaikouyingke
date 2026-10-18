import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeLocalAudio, alignReading, buildLocalFeedback, validLocalFeedback, compareLocalFeedback, LOCAL_RECOGNIZER } from '../shared/local-feedback.mjs'
import domain from '../src/domain.mjs'
const tone = (duration, sections) => {
  const samples = new Float32Array(Math.round(duration * 16000))
  for (const [a, b] of sections) for (let i = Math.round(a * 16000); i < Math.round(b * 16000); i++) samples[i] = .18 * Math.sin(i * Math.PI * 2 * 220 / 16000)
  return samples
}
test('纯静音不产生完整度、语速和伪造发音分', () => {
  const metrics = analyzeLocalAudio(new Float32Array(32000))
  const value = buildLocalFeedback(metrics, { mode: 'repeat', reference: '欢迎光临', transcript: '欢迎光临', recognized: true })
  assert.equal(metrics.noVoice, true); assert.equal(value.reading, null); assert.equal(value.rate, null); assert.equal(value.transcript, ''); assert.equal('score' in value, false)
})
test('停顿仅统计语音内部，排除首尾静音与短词间隔', () => {
  const metrics = analyzeLocalAudio(tone(7, [[1, 2], [2.1, 3], [4.2, 5.2]]))
  assert.equal(metrics.noVoice, false); assert.equal(metrics.pauses.length, 1)
  assert.equal(metrics.pauses[0].start, 3); assert.equal(metrics.pauses[0].end, 4.2); assert.equal(metrics.pauses[0].duration, 1.2)
  assert.equal(metrics.spanSeconds, 4.2); assert.equal(metrics.longestRunSeconds, 2)
})
test('低能量噪声不算有效有声片段，持续背景能量给出提示', () => {
  assert.equal(analyzeLocalAudio(new Float32Array(32000).fill(.003)).noVoice, true)
  assert.equal(analyzeLocalAudio(new Float32Array(32000).fill(.08)).noiseCaution, true)
  assert.equal(analyzeLocalAudio(new Float32Array(32000).fill(1)).clipped, true)
})
test('跟读按顺序核对文字，重复说同一字不会补齐其他字', () => {
  assert.equal(alignReading('欢迎光临！', '欢迎，光临。').completeness, 100)
  assert.equal(alignReading('欢迎光临', '欢迎').completeness, 50)
  assert.equal(alignReading('欢迎光临', '欢欢欢欢').matched, 1)
  assert.ok(alignReading('欢迎光临', '临光迎欢').completeness < 100)
  assert.equal(alignReading('欢迎光临', ''), null)
  assert.deepEqual(alignReading('欢迎光临', '欢迎').revisit, ['光临'])
})
test('没有真实识别结果时，跟读不出现完整度和语速', () => {
  const metrics = analyzeLocalAudio(tone(3, [[.3, 2.5]]))
  const pending = buildLocalFeedback(metrics, { mode: 'repeat', reference: '欢迎光临' })
  assert.equal(pending.reading, null); assert.equal(pending.rate, null)
  const recognized = buildLocalFeedback(metrics, { mode: 'repeat', reference: '欢迎光临', transcript: '欢迎光临', recognized: true })
  assert.equal(recognized.reading.completeness, 100); assert.equal(recognized.recognizer, LOCAL_RECOGNIZER)
})
test('自由讲述不以参考句计算完整度；语速按实际识别字数及首尾有声跨度估算', () => {
  const value = buildLocalFeedback(analyzeLocalAudio(tone(4, [[1, 3]])), { mode: 'free', reference: '欢迎光临', transcript: '这是我们自家做的商品', recognized: true })
  assert.equal(value.reference, ''); assert.equal(value.reading, null); assert.equal(value.rate, 300)
})
test('缓存重算文字匹配，拒绝无效声学数据和陌生识别来源', () => {
  const value = buildLocalFeedback(analyzeLocalAudio(tone(3, [[.3, 2.5]])), { mode: 'repeat', reference: '欢迎光临', transcript: '欢迎', recognized: true })
  value.reading.completeness = 100; value.rate = 9999
  assert.equal(validLocalFeedback(value).reading.completeness, 50)
  assert.notEqual(validLocalFeedback(value).rate, 9999)
  assert.equal(validLocalFeedback({ ...value, recognizer: 'text-input' }).reading, null)
  assert.equal(validLocalFeedback({ ...value, metrics: { ...value.metrics, duration: NaN } }), null)
  assert.equal(validLocalFeedback({ ...value, metrics: { ...value.metrics, pauses: [{ start: 2, end: 1, duration: 1 }] } }), null)
})
test('仅比较同一句两次练习，损坏缓存不阻止旧记录恢复', () => {
  const metrics = analyzeLocalAudio(tone(3, [[.3, 2.5]]))
  const a = buildLocalFeedback(metrics, { mode: 'repeat', reference: '欢迎光临', transcript: '欢迎光临', recognized: true })
  const b = buildLocalFeedback(metrics, { mode: 'repeat', reference: '欢迎光临', transcript: '欢迎', recognized: true })
  assert.equal(compareLocalFeedback(a, b).completeness, 50)
  assert.equal(compareLocalFeedback(a, { ...b, reference: '请进' }), null)
  const state = domain.restoreState({ ...domain.fresh(), recordings: [{ id: 'one', path: 'blob:x', duration: 3, localFeedback: a }, { id: 'two', path: 'blob:y', duration: 3, localFeedback: { version: 1 } }] }, [{ id: 'product', lessons: [] }])
  assert.equal(state.recordings[0].localFeedback.reading.completeness, 100); assert.equal(state.recordings[1].localFeedback, null)
  domain.deleteRecording(state, 'one'); assert.equal(state.recordings.length, 1)
})
