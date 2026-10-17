const P = require('../../utils/pick.js')
const S = require('../../utils/scoring.js')
const { DIMS, autoScore, calcDimWtd, calcTotal, getVerdict, initGrid, ROI_CELL } = S
// 国家站点与计算页保持一致（data/fees.js SITES）
const fees = require('../../data/fees.js')
const SITE_IDS = fees.SITE_IDS

function countryNames() { return SITE_IDS.map(id => fees.SITES[id].name) }
function countryStr(i) {
  const code = SITE_IDS[Number(i)]
  const s = fees.SITES[code]
  return s ? `${s.name}(${s.code})` : ''
}

Page({
  data: {
    id: 0,
    isNew: true,
    basic: { name: '', price: '', country: countryStr(0) },
    countryNames: countryNames(),
    countryIdx: 0,
    dims: DIMS,
    ratings: initGrid(DIMS, () => 0),
    inputs: initGrid(DIMS, () => ''),
    dimWtd: DIMS.map(() => '—'),
    activeRule: null,
    verdict: getVerdict(null)
  },

  onLoad(options) {
    if (options.new) {
      this.recalc()
      return
    }
    const rec = P.findRecord(options.id)
    if (!rec) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    const b = rec.basic || {}
    const cIdx = Math.max(0, SITE_IDS.findIndex(id => (b.country || '').includes(id)))
    this.setData({
      isNew: false,
      id: rec.id,
      basic: { name: b.name || rec.name || '', price: b.price != null ? b.price : (rec.price != null ? rec.price : ''), country: b.country || countryStr(cIdx) },
      countryIdx: cIdx,
      ratings: rec.ratings || initGrid(DIMS, () => 0),
      inputs: rec.inputs || initGrid(DIMS, () => '')
    })
    this.recalc()
  },

  onCountry(e) {
    const idx = Number(e.detail.value)
    this.setData({ countryIdx: idx, 'basic.country': countryStr(idx) })
  },

  onBasic(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`basic.${key}`]: e.detail.value })
  },

  onIndicatorInput(e) {
    const { di, ii } = e.currentTarget.dataset
    const raw = e.detail.value
    const rating = autoScore(DIMS[di].items[ii], raw)
    const row = this.data.ratings[di].slice()
    row[ii] = rating
    this.setData({
      [`inputs[${di}][${ii}]`]: raw,
      [`ratings[${di}]`]: row
    })
    // 毛利率（利润模型维度第1项）变化时自动算盈亏 ROI
    if (di === 3 && ii === 0) this.syncRoi()
    this.setData({
      [`dimWtd[${di}]`]: calcDimWtd(di, this.data.ratings, DIMS),
      verdict: getVerdict(calcTotal(this.data.ratings, DIMS))
    })
  },

  syncRoi() {
    const [rDi, rIi] = ROI_CELL
    const m = parseFloat(this.data.inputs[3][0])
    const roi = (m && m > 0) ? (100 / m).toFixed(2) : ''
    this.setData({
      [`inputs[${rDi}][${rIi}]`]: roi,
      [`ratings[${rDi}][${rIi}]`]: roi ? autoScore(DIMS[rDi].items[rIi], roi) : 0
    })
  },

  onEnumPick(e) {
    const { di, ii, val } = e.currentTarget.dataset
    const raw = String(val)
    const rating = autoScore(DIMS[di].items[ii], raw)
    const row = this.data.ratings[di].slice()
    row[ii] = rating
    this.setData({
      [`inputs[${di}][${ii}]`]: raw,
      [`ratings[${di}]`]: row,
      [`dimWtd[${di}]`]: calcDimWtd(di, this.data.ratings, DIMS),
      verdict: getVerdict(calcTotal(this.data.ratings, DIMS))
    })
  },

  recalc() {
    this.setData({
      dimWtd: DIMS.map((_, di) => calcDimWtd(di, this.data.ratings, DIMS)),
      verdict: getVerdict(calcTotal(this.data.ratings, DIMS))
    })
  },

  openRule(e) {
    const { di, ii } = e.currentTarget.dataset
    this.setData({ activeRule: DIMS[di].items[ii] })
  },
  closeRule() { this.setData({ activeRule: null }) },
  noop() {},

  save() {
    const { basic, ratings, inputs, verdict, id, isNew } = this.data
    const record = {
      id: isNew ? Date.now() : id,
      basic,
      ratings,
      inputs,
      name: basic.name,
      country: basic.country,
      price: basic.price,
      score: verdict.score,
      verdict: verdict.text,
      time: new Date().toISOString()
    }
    const list = P.getRecords()
    if (isNew) {
      list.unshift(record)
      if (list.length > 100) list.length = 100
    } else {
      const i = list.findIndex(x => String(x.id) === String(record.id))
      if (i >= 0) list[i] = record
    }
    P.saveRecords(list)
    this.setData({ isNew: false, id: record.id })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 800)
  },

  del() {
    wx.showModal({
      title: '删除选品',
      content: '确认删除这条？',
      success: (res) => {
        if (res.confirm) {
          P.deleteRecord(this.data.id)
          wx.navigateBack()
        }
      }
    })
  },

  onShareAppMessage() {
    const { basic, verdict } = this.data
    return {
      title: `选品评分：${basic.name || '未命名'} 得分 ${verdict.score}`,
      path: '/pages/pick/pick'
    }
  }
})
