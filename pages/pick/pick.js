const S = require('../../utils/scoring.js')
const P = require('../../utils/pick.js')
const { DIMS, autoScore, calcDimWtd, calcTotal, getVerdict, initGrid } = S

const COUNTRIES = [
  { code: 'US', name: '美国' },
  { code: 'UK', name: '英国' },
  { code: 'DE', name: '德国' },
  { code: 'JP', name: '日本' },
  { code: 'CA', name: '加拿大' },
  { code: 'FR', name: '法国' },
  { code: 'IT', name: '意大利' },
  { code: 'ES', name: '西班牙' }
]

function countryNames() { return COUNTRIES.map(c => c.name) }
function countryStr(i) {
  const c = COUNTRIES[Number(i)]
  return c ? `${c.name}(${c.code})` : ''
}

Page({
  data: {
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

  onLoad() {
    this.setData({
      dimWtd: DIMS.map((_, di) => calcDimWtd(di, this.data.ratings, DIMS)),
      verdict: getVerdict(calcTotal(this.data.ratings, DIMS))
    })
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
      [`ratings[${di}]`]: row,
      [`dimWtd[${di}]`]: calcDimWtd(di, this.data.ratings, DIMS),
      verdict: getVerdict(calcTotal(this.data.ratings, DIMS))
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

  openRule(e) {
    const { di, ii } = e.currentTarget.dataset
    this.setData({ activeRule: DIMS[di].items[ii] })
  },
  closeRule() { this.setData({ activeRule: null }) },
  noop() {},

  savePick() {
    const { basic, ratings, inputs, verdict } = this.data
    const record = {
      id: Date.now(),
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
    P.addRecord(record)
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  viewHistory() {
    wx.navigateTo({ url: '/pages/mypick/mypick' })
  },

  onShareAppMessage() {
    const { basic, verdict } = this.data
    return {
      title: `选品评分：${basic.name || '未命名'} 得分 ${verdict.score}`,
      path: '/pages/pick/pick'
    }
  }
})
