import {createStaticServer} from './serve-h5.mjs'
createStaticServer().listen(5176,'127.0.0.1',()=>console.log('Speech API development server: http://127.0.0.1:5176'))
