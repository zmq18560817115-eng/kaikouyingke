// 小程序使用包内根目录；H5 跟随构建 base，支持 GitHub Pages 子目录。
let base = '/'
// #ifdef H5
base = import.meta.env.BASE_URL || '/'
// #endif
export const staticAsset = path => base.replace(/\/?$/, '/') + 'static/' + path.replace(/^\//, '')
