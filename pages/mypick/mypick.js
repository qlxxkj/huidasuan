const P = require('../../utils/pick.js')
const S = require('../../utils/scoring.js')

Page({
  data: {
    picks: []
  },

  onShow() {
    this.load()
  },

  load() {
    const list = P.getRecords()
    list.forEach(r => {
      const d = new Date(r.time)
      r.timeShort = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      const score = S.scoreOf(r.inputs)
      r.score = score
      r.verdict = S.getVerdict(score).text
      r.empty = !score
    })
    this.setData({ picks: list })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/pick-form/pick-form?id=${id}` })
  },

  addNew() {
    wx.reLaunch({ url: '/pages/pick/pick' })
  },

  clearAll() {
    wx.showModal({
      title: '清空选品',
      content: `将删除全部 ${this.data.picks.length} 条记录，确认？`,
      success: (res) => {
        if (res.confirm) {
          P.clearRecords()
          this.load()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  onShareAppMessage() {
    return { title: 'FBA 选品评分', path: '/pages/pick/pick' }
  }
})
