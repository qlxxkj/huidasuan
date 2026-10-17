// 小程序运行时无法可靠 require 根目录 package.json（CI 上传才用得到），
// 所以版本号写死在这个会打进包里的模块。改版本时请同步 package.json 与本文件。
module.exports = '0.5.0'
