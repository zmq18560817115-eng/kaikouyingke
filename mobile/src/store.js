import { reactive } from 'vue'
import domain from './domain.mjs'
import { scenarios } from './data/library'
const KEY = 'kaikou-yingke-v1'
const SAVE_ERROR = '没有保存成功，请检查本机空间后重试。'
let cached
try { cached = uni.getStorageSync(KEY) } catch {}
export const state = reactive(domain.restoreState(cached, scenarios))
const write = snapshot => uni.setStorageSync(KEY, snapshot)
export function updateState(change) {
  const result = domain.transact(state, change, write)
  if (!result.ok) uni.showToast({ title: SAVE_ERROR, icon: 'none' })
  return result.ok
}
export const localDay = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
export const uid = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
export const markComplete = id => updateState(s => domain.completeLesson(s, id, localDay()))
export function queueReview(item) {
  let review
  return updateState(s => { review = domain.addReview(s, item) }) ? review : null
}
export function savePersonal(facts, draftId) {
  const card = domain.createPersonal(facts, uid('p'))
  if (!updateState(s => { s.personal.unshift(card); if (draftId) s.drafts = s.drafts.filter(d => d.id !== draftId) })) throw new Error(SAVE_ERROR)
  return card
}
export const removeRecording = id => updateState(s => domain.deleteRecording(s, id))
