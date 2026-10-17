// 个人信息（头像 / 昵称）纯本地存取
const KEY = 'fba_profile'
const DEFAULT = { avatar: '', nick: '' }

function get() {
  return { ...DEFAULT, ...(wx.getStorageSync(KEY) || {}) }
}

function save(p) {
  const cur = get()
  const next = { ...cur, ...p }
  wx.setStorageSync(KEY, next)
  return next
}

module.exports = { get, save }
