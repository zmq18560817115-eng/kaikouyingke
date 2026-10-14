const fs=require('fs'),path=require('path')
const sharp=require('sharp')
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../assets'),dest=path.join(root,'src/static/images'),iconDest=path.join(root,'src/static/icons')
fs.mkdirSync(dest,{recursive:true});fs.mkdirSync(iconDest,{recursive:true})
const icons=['arrow-left','caret-right','caret-down','check','check-circle','house','book-open','user-circle','user','note','waveform','clipboard-text','hand-waving','mountains','currency-cny','qr-code','signpost','chats-circle','jar','bowl-food','basket','ear','text-aa','microphone','image','flag','speaker-high','headphones','plant','calendar','pencil-simple','download-simple','gear','lock-key','gauge','stop','play','camera','plus','question','trash']
const colors={green:'#237a59',blue:'#287bb1',amber:'#a96b0a',muted:'#737d75',white:'#ffffff'}
;(async()=>{for(const f of fs.readdirSync(source).filter(f=>f.endsWith('.png'))){await sharp(path.join(source,f)).resize(f==='landscape.png'?960:400).jpeg({quality:84,mozjpeg:true}).toFile(path.join(dest,f.replace('.png','.jpg')))}
for(const n of icons){const f=path.join(root,'node_modules/@phosphor-icons/core/assets/regular',n+'.svg');if(!fs.existsSync(f))throw Error('Unknown Phosphor icon: '+n);for(const [tone,color]of Object.entries(colors)){let svg=fs.readFileSync(f,'utf8').replace(/currentColor/g,color);if(!/<svg[^>]*fill=/.test(svg))svg=svg.replace('<svg ','<svg fill="'+color+'" ');await sharp(Buffer.from(svg)).resize(96,96).png().toFile(path.join(iconDest,n+'-'+tone+'.png'))}}
console.log('Prepared source illustration JPEGs and official Phosphor icons')})().catch(e=>{console.error(e);process.exit(1)})
