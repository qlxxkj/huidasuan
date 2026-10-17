const H = require('../../utils/history.js')

Page({
  data: {
    records: []
  },

  onShow() {
    this.load()
  },

  load() {
    const list = H.getRecords()
    list.forEach(r => {
      const d = new Date(r.time)
      r.timeShort = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
    this.setData({ records: list })
  },

  // 点卡片 → 详情页（可编辑/查看/删除）
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/calc-detail/calc-detail?id=${id}` })
  },

  addNew() {
    wx.navigateTo({ url: '/pages/calc-detail/calc-detail?new=1' })
  },

  clearAll() {
    wx.showModal({
      title: '清空利润记录',
      content: `将删除全部 ${this.data.records.length} 条记录，确认？`,
      success: (res) => {
        if (res.confirm) {
          H.clearRecords()
          this.load()
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

  onShareAppMessage() {
    return {
      title: 'FBA利润计算器 - 我的利润',
      path: '/pages/calc/calc'
    }
  }
})
