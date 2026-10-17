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

  // 每条只取展示需要的字段，控制 URL 长度
  slimRecord(r) {
    return {
      id: r.id, time: r.time, siteName: r.siteName, currency: r.currency, symbol: r.symbol,
      price: r.price, totalCost: r.totalCost, profitMargin: r.profitMargin, netProfit: r.netProfit,
      name: r.name || ''
    }
  },

  onShareAppMessage() {
    const list = this.data.records
    const max = Math.min(list.length, 20)
    const slim = list.slice(0, max).map(r => this.slimRecord(r))
    return {
      title: `我在FBA利润计算器存了${list.length}条利润记录，看看？`,
      path: `/pages/shared-list/shared-list?type=profit&d=${encodeURIComponent(JSON.stringify(slim))}`
    }
  }
})
