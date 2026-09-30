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
    // 时间转短格式
    list.forEach(r => {
      const d = new Date(r.time)
      r.timeShort = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
    this.setData({ records: list })

    // 同步 tabBar 角标
    if (list.length > 0) {
      wx.setTabBarBadge({ index: 1, text: String(list.length) })
    } else {
      wx.removeTabBarBadge({ index: 1 })
    }
  },

  onTapRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确认删除这条？',
      success: (res) => {
        if (res.confirm) {
          H.deleteRecord(id)
          this.load()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  clearAll() {
    wx.showModal({
      title: '清空记录',
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

  // 分享给好友：带过去历史页
  onShareAppMessage() {
    return {
      title: 'FBA利润计算器 - 历史记录',
      path: '/pages/history/history'
    }
  }
})
