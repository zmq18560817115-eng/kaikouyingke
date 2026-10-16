export function encodeWav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer)
  const ascii = (offset, text) => { for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i)) }
  ascii(0,'RIFF');view.setUint32(4,36+samples.length*2,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,samples.length*2,true)
  for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,Number.isFinite(samples[i])?samples[i]:0));view.setInt16(44+i*2,s<0?s*32768:s*32767,true)}
  return buffer
}
