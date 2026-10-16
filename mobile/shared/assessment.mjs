const percent = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100
export function validAssessment(value) {
  if (!value || value.provider !== 'tencent-soe' || value.mode !== 'zh-free' || !percent(value.accuracy) || value.score !== value.accuracy || !value.evidence?.requestId || typeof value.transcript !== 'string') return null
  return {
    provider: 'tencent-soe', mode: 'zh-free', score: value.accuracy, accuracy: value.accuracy,
    fluency: percent(value.fluency) ? value.fluency : null,
    transcript: value.transcript.slice(0, 1200), advice: typeof value.advice === 'string' ? value.advice.slice(0, 240) : '',
    words: (Array.isArray(value.words) ? value.words : []).filter(w => typeof w.text === 'string' && percent(w.accuracy)).slice(0, 600).map(w => ({text:w.text.slice(0,30),accuracy:w.accuracy,toneIssue:w.toneIssue === true})),
    evidence: {requestId:String(value.evidence.requestId).slice(0,128)},
    assessedAt: typeof value.assessedAt === 'string' ? value.assessedAt.slice(0,40) : '',
    question: typeof value.question === 'string' ? value.question.slice(0,160) : ''
  }
}
export function averageAssessment(recordings) {
  const scored = recordings.map(r => validAssessment(r?.assessment)).filter(Boolean)
  return scored.length ? {score:Math.round(scored.reduce((sum,r)=>sum+r.score,0)/scored.length),count:scored.length} : null
}
