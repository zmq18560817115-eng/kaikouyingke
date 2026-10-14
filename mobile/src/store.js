import { reactive } from 'vue'
import domain from './domain.mjs'
const KEY='kaikou-yingke-v1'
let cached
try{cached=uni.getStorageSync(KEY)}catch{}
export const state=reactive({...domain.fresh(),...(cached&&cached.version===1?cached:{}),settings:{...domain.fresh().settings,...cached?.settings}})
export function persist(){try{uni.setStorageSync(KEY,JSON.parse(JSON.stringify(state)))}catch{uni.showToast({title:'手机空间不足，请先管理录音',icon:'none'})}}
export function localDay(){return new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10)}
export function markComplete(id){domain.completeLesson(state,id,localDay());persist()}
export function queueReview(item){const r=domain.addReview(state,item);persist();return r}
export function savePersonal(facts){const c=domain.createPersonal(facts,'p-'+Date.now());state.personal.unshift(c);persist();return c}
export function removeRecording(id){domain.deleteRecording(state,id);persist()}
export const uid=prefix=>prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)
