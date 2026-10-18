import { validAssessment } from '../shared/assessment.mjs'
import { validLocalFeedback } from '../shared/local-feedback.mjs'
const fresh = () => ({
  version: 1,
  profile: { name: '朋友', occupation: 'product', region: '尚未选择', language: '普通话慢速' },
  currentScenario: 'product', completed: [], attempts: [], personal: [], drafts: [],
  reviews: [], reflections: [], recordings: [], checkpoint: null,
  settings: { largeText: false, voice: true, uploadConsent: false }, learningDates: []
})
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const unique = values => [...new Set(values)]
const records = value => {
  const seen = new Set()
  return (Array.isArray(value) ? value : []).filter(item => {
    if (!isObject(item) || !text(item.id) || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).map(item => ({ ...item }))
}
const validDay = day => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const parsed = new Date(day + 'T00:00:00Z')
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day
}

// 本机缓存可以来自旧版本或不完整写入，不能直接覆盖可运行状态。
function restoreState(cached, catalog) {
  const result = fresh()
  if (!isObject(cached) || cached.version !== result.version) return result
  const scenarios = new Set(catalog.map(s => s.id))
  const lessons = new Map(catalog.flatMap(s => s.lessons.map(l => [l.id, l])))
  const profile = isObject(cached.profile) ? cached.profile : {}
  result.profile = {
    name: text(profile.name, 16) || result.profile.name,
    occupation: ['homestay', 'food', 'product', 'craft', 'culture'].includes(profile.occupation) ? profile.occupation : 'product',
    region: text(profile.region, 40) || result.profile.region,
    language: result.profile.language
  }
  if (scenarios.has(cached.currentScenario)) result.currentScenario = cached.currentScenario
  result.completed = unique((Array.isArray(cached.completed) ? cached.completed : []).filter(id => lessons.has(id)))
  result.recordings = records(cached.recordings).filter(r => typeof r.path === 'string' && Number.isFinite(r.duration) && r.duration > 0).map(r => ({ ...r, assessment: validAssessment(r.assessment), localFeedback: validLocalFeedback(r.localFeedback) }))
  const recordingIds = new Set(result.recordings.map(r => r.id))
  const clearMissingAudio = r => ({ ...r, recordingId: recordingIds.has(r.recordingId) ? r.recordingId : null })
  result.attempts = records(cached.attempts).filter(r => typeof r.type === 'string').map(clearMissingAudio)
  result.drafts = records(cached.drafts).map(r => ({ ...clearMissingAudio(r), ...Object.fromEntries(['name','material','process','price','unit'].map(k => [k, text(r[k])])) }))
  result.reviews = records(cached.reviews).filter(r => typeof r.target === 'string' && text(r.title) && ['pronunciation', 'listening', 'expression', 'scenario', 'real'].includes(r.type)).map(r => ({ ...clearMissingAudio(r), key: r.target + '|' + r.type, done: r.done === true }))
  result.personal = records(cached.personal).filter(r => text(r.title) && typeof r.short === 'string' && typeof r.full === 'string' && Array.isArray(r.questions) && r.questions.length && r.questions.every(q => typeof q === 'string'))
  result.reflections = records(cached.reflections).filter(r => typeof r.result === 'string')
  result.learningDates = unique((Array.isArray(cached.learningDates) ? cached.learningDates : []).filter(validDay))
  if (isObject(cached.settings)) {
    for (const key of ['largeText', 'voice']) if (typeof cached.settings[key] === 'boolean') result.settings[key] = cached.settings[key]
  }
  const checkpoint = cached.checkpoint
  if (isObject(checkpoint) && lessons.has(checkpoint.lessonId) && Number.isInteger(checkpoint.step) && checkpoint.step >= 0 && checkpoint.step < lessons.get(checkpoint.lessonId).stages.length) {
    result.checkpoint = { lessonId: checkpoint.lessonId, step: checkpoint.step }
    result.currentScenario = catalog.find(s => s.lessons.some(l => l.id === checkpoint.lessonId)).id
  }
  return result
}

// 保存失败时还原内存，避免界面显示“保存成功”但重开后丢失。
function transact(state, change, write) {
  const before = JSON.parse(JSON.stringify(state))
  try {
    change(state)
    write(JSON.parse(JSON.stringify(state)))
    return { ok: true }
  } catch (error) {
    for (const key of Object.keys(state)) if (!(key in before)) delete state[key]
    Object.assign(state, before)
    return { ok: false, error }
  }
}
function completeLesson(state, id, day) {
  if (!state.completed.includes(id)) state.completed.push(id)
  if (!state.learningDates.includes(day)) state.learningDates.push(day)
  state.checkpoint = null
}
function addReview(state, item) {
  const key = item.target + '|' + item.type
  const existing = state.reviews.find(r => r.key === key && !r.done)
  if (existing) return existing
  const r = { ...item, key, id: item.id || 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), done: false }
  state.reviews.push(r)
  return r
}
function createPersonal(input, id) {
  const facts = {
    name: text(input.name, 30), material: text(input.material, 80), process: text(input.process, 200),
    price: String(input.price ?? '').trim(), unit: text(input.unit, 12)
  }
  if (!facts.name) throw new Error('请先确认名称')
  if (facts.price && !/^\d+(\.\d{1,2})?$/.test(facts.price)) throw new Error('请填写有效金额，最多保留两位小数')
  if (facts.price && !facts.unit) throw new Error('填写了价格后，还需要确认计价单位。')
  return {
    id, title: facts.name, createdAt: new Date().toISOString(), facts, status: '本人已确认',
    source: '本人描述与模板整理', visibility: 'private',
    short: `这是我们自家的${facts.name}。${facts.material ? `主要材料是${facts.material}。` : ''}`,
    full: [`这是我们自家的${facts.name}。`, facts.material && `主要材料是${facts.material}。`, facts.process && `制作时，${facts.process}。`, facts.price && facts.unit && `价格是${facts.price}元${facts.unit}。`].filter(Boolean).join(''),
    questions: ['这个商品叫什么？', facts.material ? '用什么材料制作？' : '你想补充哪项商品信息？', facts.process ? '可以介绍一下制作方法吗？' : '还有什么想告诉游客的？']
  }
}
function deleteRecording(state, id) {
  state.recordings = state.recordings.filter(r => r.id !== id)
  for (const list of [state.attempts, state.drafts, state.reviews]) {
    list.forEach(item => { if (item.recordingId === id) item.recordingId = null })
  }
}
const hasCompletedChapter = (state, scenario) => scenario.lessons.every(l => state.completed.includes(l.id))
export { fresh, restoreState, transact, completeLesson, addReview, createPersonal, deleteRecording, hasCompletedChapter }
export default { fresh, restoreState, transact, completeLesson, addReview, createPersonal, deleteRecording, hasCompletedChapter }
