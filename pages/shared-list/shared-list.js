const S = require('../../utils/scoring.js')


// 分享列表只带最近的记录（URL 长度有限）
const MAX_SHARED = 10

Page({
  data: {
    type: 'profit',
    title: '',
    list: []
  },

  onLoad(options) {
    const type = options.type === 'pick' ? 'pick' : 'profit'
    let list = []
    if (options.d) {
      try {
        list = JSON.parse(decodeURIComponent(options.d))
      } catch (e) {
        list = []
      }
    }
    if (!Array.isArray(list)) list = []
    list = list.slice(0, MAX_SHARED)
    list.forEach(r => {
      const d = new Date(r.time)
      r.timeShort = isNaN(d) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      if (type === 'pick') {
        // 分享时带上了保存的得分就优先用，没有才按 inputs 重算
        const score = (r.score != null && r.score !== '') ? String(r.score) : S.scoreOf(r.inputs)
        r.score = score
        r.verdict = r.verdict || S.getVerdict(score).text
        r.empty = !score || score === '—'
      }
    })
    this.setData({
      type,
      title: type === 'pick' ? `好友的选品评分 · ${list.length}条` : `好友的利润记录 · ${list.length}条`,
      list
    })
  },

  onShareAppMessage() {
    const { type, list } = this.data
    const max = Math.min(list.length, MAX_SHARED)
    return {
      title: type === 'pick' ? `FBA 选品评分，共${max}条，看看？` : `FBA 利润记录，共${max}条，看看？`,
      path: `/pages/shared-list/shared-list?type=${type}&d=${encodeURIComponent(JSON.stringify(list.slice(0, max)))}`
    }
  }
})
