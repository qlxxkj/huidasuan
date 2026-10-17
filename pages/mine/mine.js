const H = require('../../utils/history.js')
const P = require('../../utils/pick.js')
const profile = require('../../utils/profile.js')

Page({
  data: {
    avatar: '',
    nick: '',
    profitCount: 0,
    pickCount: 0,
    version: '0.0.0'
  },

  onLoad() {
    const p = profile.get()
    this.setData({ avatar: p.avatar, nick: p.nick })
    // 优先读真机实际上传的版本（CI 用 miniprogram-ci 传入的 version），
    // 读不到再回退 package.json
    let v = ''
    try {
      v = wx.getAccountInfoSync().miniProgram.version || ''
    } catch (e) {}
    if (!v) {
      try { v = require('../../package.json').version } catch (e) {}
    }
    this.setData({ version: v || 'dev' })
  },

  onShow() {
    this.load()
  },

  load() {
    this.setData({
      profitCount: (H.getRecords() || []).length,
      pickCount: (P.getRecords() || []).length
    })
  },

  onChooseAvatar(e) {
    const p = profile.save({ avatar: e.detail.avatarUrl })
    this.setData({ avatar: p.avatar })
  },

  onNickInput(e) {
    this.setData({ nick: e.detail.value })
  },

  onNickBlur(e) {
    const p = profile.save({ nick: e.detail.value })
    this.setData({ nick: p.nick })
  },

  goProfit() {
    wx.navigateTo({ url: '/pages/history/history' })
  },

  goPicks() {
    wx.navigateTo({ url: '/pages/mypick/mypick' })
  },

  onShareAppMessage() {
    return { title: 'FBA利润计算器', path: '/pages/calc/calc' }
  }
})
