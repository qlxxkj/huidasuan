const H = require('../../utils/history.js')
const P = require('../../utils/pick.js')

const PICK_KEY = 'fba_pick_history'

Page({
  data: {
    profit: [],
    picks: []
  },

  onShow() {
    this.loadProfit()
    this.loadPicks()
    this.setBadges()
  },

  // 我的利润（计算记录）
  loadProfit() {
    const list = H.getRecords()
    list.forEach(r => {
      const d = new Date(r.time)
      r.timeShort = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
    this.setData({ profit: list })
  },

  // 我的选品
  loadPicks() {
    const list = P.getRecords()
    list.forEach(r => {
      const d = new Date(r.time)
      r.timeShort = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      r.empty = !r.score || r.score === '—'
    })
    this.setData({ picks: list })
  },

  setBadges() {
    const p = wx.getStorageSync(H.STORAGE_KEY) || []
    const k = wx.getStorageSync(PICK_KEY) || []
    if (p.length > 0) wx.setTabBarBadge({ index: 1, text: String(p.length) })
    else wx.removeTabBarBadge({ index: 1 })
    if (k.length > 0) wx.setTabBarBadge({ index: 0, text: String(k.length) })
    else wx.removeTabBarBadge({ index: 0 })
  },

  // 删除单条利润
  delProfit(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确认删除这条？',
      success: (res) => {
        if (res.confirm) {
          H.deleteRecord(id)
          this.loadProfit()
          this.setBadges()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  clearProfit() {
    wx.showModal({
      title: '清空利润记录',
      content: `将删除全部 ${this.data.profit.length} 条记录，确认？`,
      success: (res) => {
        if (res.confirm) {
          H.clearRecords()
          this.loadProfit()
          this.setBadges()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  exportText() {
    H.copyToClipboard(H.exportText(H.getRecords()))
  },

  exportCSV() {
    H.copyToClipboard(H.exportCSV(H.getRecords()))
  },

  // 删除单条选品
  delPick(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除选品',
      content: '确认删除这条？',
      success: (res) => {
        if (res.confirm) {
          P.deleteRecord(id)
          this.loadPicks()
          this.setBadges()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  clearPicks() {
    wx.showModal({
      title: '清空选品',
      content: `将删除全部 ${this.data.picks.length} 条记录，确认？`,
      success: (res) => {
        if (res.confirm) {
          P.clearRecords()
          this.loadPicks()
          this.setBadges()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  onShareAppMessage() {
    return { title: 'FBA利润计算器 - 我的记录', path: '/pages/mine/mine' }
  }
})
