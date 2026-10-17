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
      // 优先用保存时记录的得分；无（旧数据）才按 inputs 重算
      const score = (r.score != null && r.score !== '') ? String(r.score) : S.scoreOf(r.inputs)
      r.score = score
      r.verdict = S.getVerdict(score).text
      r.empty = !score || score === '—'
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

  exportText() {
    P.copyToClipboard(P.exportText(P.getRecords()))
  },

  exportCSV() {
    P.copyToClipboard(P.exportCSV(P.getRecords()))
  },

  slimRecord(r) {
    return {
      id: r.id, time: r.time, name: r.name || '', country: r.country || '',
      price: r.price != null ? r.price : '', score: r.score, verdict: r.verdict,
      inputs: r.inputs || []
    }
  },

  onShareAppMessage() {
    const list = this.data.picks
    const max = Math.min(list.length, 10)
    const slim = list.slice(0, max).map(r => this.slimRecord(r))
    return {
      title: `我在FBA选品评分存了${list.length}条选品，看看？`,
      path: `/pages/shared-list/shared-list?type=pick&d=${encodeURIComponent(JSON.stringify(slim))}`
    }
  }
})
