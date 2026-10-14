const base=import.meta.env.VITE_TRAINING_API_BASE
export const aiConfigured=Boolean(base)
export async function requestAssessment(recording,context){
  if(!base)throw new Error('AI分析尚未连接。录音已保存在本机，可以先回听和对照练习。')
  return new Promise((resolve,reject)=>uni.uploadFile({url:base+'/v1/attempts',filePath:recording.path,name:'audio',formData:{context:JSON.stringify(context)},success:r=>{try{const result=JSON.parse(r.data);if(r.statusCode>=400||!result.evidence)throw new Error(result.message||'分析暂未完成');resolve(result)}catch(e){reject(e)}},fail:()=>reject(new Error('网络暂时无法连接，录音已保留。'))}))
}
