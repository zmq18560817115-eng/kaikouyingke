export const LOCAL_FEEDBACK_VERSION = 1
export const LOCAL_RECOGNIZER = 'sherpa-onnx-sensevoice-1.12.9'
const round = n => Math.round(n * 100) / 100
const finite = n => typeof n === 'number' && Number.isFinite(n)
export function normalizeSpeechText(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/<\|[^>]*\|>/g, '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 600)
}

// Energy segmentation estimates audible activity; it does not identify phonemes or certify speech.
export function analyzeLocalAudio(samples, sampleRate = 16000) {
  if (!(samples instanceof Float32Array) || !samples.length || !finite(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new Error('录音数据无法分析，请重新录制。')
  const duration = samples.length / sampleRate
  if (duration < .5 || duration > 61) throw new Error('请录制1到59秒，再查看练习反馈。')
  const frameSize = Math.round(sampleRate * .02), frames = []
  let clipped = 0
  for (let i = 0; i < samples.length; i += frameSize) {
    let energy = 0
    const end = Math.min(i + frameSize, samples.length)
    for (let j = i; j < end; j++) {
      const n = finite(samples[j]) ? samples[j] : 0
      energy += n * n
      if (Math.abs(n) >= .99) clipped++
    }
    frames.push(Math.sqrt(energy / (end - i)))
  }
  const sorted = [...frames].sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * .2)], peak = sorted.at(-1)
  const threshold = Math.max(.008, Math.min(.035, floor * 2.8))
  const segments = []
  let start = null
  for (let i = 0; i <= frames.length; i++) {
    if (i < frames.length && frames[i] >= threshold) { if (start === null) start = i; continue }
    if (start === null) continue
    const a = start * .02, b = Math.min(i * .02, duration)
    start = null
    const previous = segments.at(-1)
    if (previous && a - previous.end < .18) previous.end = b
    else segments.push({ start: a, end: b })
  }
  const activity = segments.filter(s => s.end - s.start >= .16)
  const voiceSeconds = activity.reduce((sum, s) => sum + s.end - s.start, 0)
  const noVoice = peak < .008 || voiceSeconds < .3
  const pauses = noVoice ? [] : activity.slice(1).map((s, i) => ({ start: round(activity[i].end), end: round(s.start), duration: round(s.start - activity[i].end) })).filter(p => p.duration >= .6)
  return {
    duration: round(duration), voiceSeconds: noVoice ? 0 : round(voiceSeconds),
    spanSeconds: noVoice ? 0 : round(activity.at(-1).end - activity[0].start),
    longestRunSeconds: noVoice ? 0 : round(Math.max(...activity.map(s => s.end - s.start))),
    pauses, noVoice, noiseCaution: floor > .015 && floor / Math.max(peak, .001) > .6,
    clipped: clipped / samples.length > .005
  }
}

export function alignReading(reference, transcript) {
  const expected = [...normalizeSpeechText(reference)], spoken = [...normalizeSpeechText(transcript)]
  if (!expected.length || !spoken.length) return null
  const width = spoken.length + 1, matrix = new Uint16Array((expected.length + 1) * width)
  for (let i = 0; i <= expected.length; i++) matrix[i * width] = i
  for (let j = 0; j <= spoken.length; j++) matrix[j] = j
  for (let i = 1; i <= expected.length; i++) for (let j = 1; j <= spoken.length; j++) {
    matrix[i * width + j] = Math.min(matrix[(i - 1) * width + j] + 1, matrix[i * width + j - 1] + 1, matrix[(i - 1) * width + j - 1] + (expected[i - 1] === spoken[j - 1] ? 0 : 1))
  }
  const matched = new Set()
  let i = expected.length, j = spoken.length
  while (i || j) {
    if (i && j && matrix[i * width + j] === matrix[(i - 1) * width + j - 1] + (expected[i - 1] === spoken[j - 1] ? 0 : 1)) {
      if (expected[i - 1] === spoken[j - 1]) matched.add(i - 1)
      i--; j--
    } else if (i && matrix[i * width + j] === matrix[(i - 1) * width + j] + 1) i--
    else j--
  }
  const words = expected.map((text, index) => ({ text, matched: matched.has(index) }))
  const revisit = []
  for (const word of words) {
    if (word.matched) { if (revisit.at(-1) === '') revisit.pop(); revisit.push(''); continue }
    if (!revisit.length) revisit.push('')
    revisit[revisit.length - 1] += word.text
  }
  return { completeness: Math.round(matched.size / expected.length * 100), matched: matched.size, total: expected.length, words, revisit: revisit.filter(Boolean) }
}

export function buildLocalFeedback(metrics, { reference = '', mode = 'free', transcript = '', recognized = false } = {}) {
  const text = recognized && !metrics.noVoice ? String(transcript).replace(/<\|[^>]*\|>/g, '').trim().slice(0, 1200) : ''
  const reading = mode === 'repeat' && text ? alignReading(reference, text) : null
  const count = normalizeSpeechText(text).length
  return {
    version: LOCAL_FEEDBACK_VERSION, provider: 'local-audio', createdAt: new Date().toISOString(),
    mode: mode === 'repeat' ? 'repeat' : 'free', reference: mode === 'repeat' ? reference.slice(0, 600) : '',
    metrics, transcript: text, recognizer: text ? LOCAL_RECOGNIZER : null,
    reading, rate: count && metrics.spanSeconds >= 1 ? Math.round(count / metrics.spanSeconds * 60) : null
  }
}

export function validLocalFeedback(value) {
  if (!value || value.version !== LOCAL_FEEDBACK_VERSION || value.provider !== 'local-audio' || !['repeat', 'free'].includes(value.mode)) return null
  const m = value.metrics
  if (!m || !['duration', 'voiceSeconds', 'spanSeconds', 'longestRunSeconds'].every(k => finite(m[k]) && m[k] >= 0 && m[k] <= 61) || m.duration < .5 || m.voiceSeconds > m.duration + .05 || m.spanSeconds > m.duration + .05 || !Array.isArray(m.pauses) || m.pauses.length > 100) return null
  if (m.pauses.some(p => !p || !['start', 'end', 'duration'].every(k => finite(p[k]) && p[k] >= 0) || p.end > m.duration + .05 || p.start >= p.end || Math.abs(p.end - p.start - p.duration) > .05 || p.duration < .6)) return null
  if (typeof m.noVoice !== 'boolean' || typeof m.noiseCaution !== 'boolean' || typeof m.clipped !== 'boolean' || typeof value.reference !== 'string' || typeof value.transcript !== 'string' || value.reference.length > 600 || value.transcript.length > 1200) return null
  const result = buildLocalFeedback({ ...m, pauses: m.pauses.map(p => ({ ...p })) }, { reference: value.reference, mode: value.mode, transcript: value.transcript, recognized: value.recognizer === LOCAL_RECOGNIZER })
  result.createdAt = typeof value.createdAt === 'string' ? value.createdAt.slice(0, 40) : ''
  return result
}

export function compareLocalFeedback(current, previous) {
  const a = validLocalFeedback(current), b = validLocalFeedback(previous)
  if (!a || !b || a.metrics.noVoice || b.metrics.noVoice || a.mode !== b.mode || normalizeSpeechText(a.reference) !== normalizeSpeechText(b.reference)) return null
  return {
    completeness: a.reading && b.reading ? a.reading.completeness - b.reading.completeness : null,
    pauseChange: a.metrics.pauses.length - b.metrics.pauses.length,
    rateChange: a.rate !== null && b.rate !== null ? a.rate - b.rate : null
  }
}
