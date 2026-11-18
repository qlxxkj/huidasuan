const fx = require('../../utils/fx.js')

const HISTORY_KEY = 'fx_history'
const MAX_HISTORY = 20

Page({
  data: {
    amount: '',
    fromIdx: 1,   // USD
    toIdx: 0,     // CNY
    resultText: '0',
    rateText: '1',
    currencyList: [],
    history: [],
    // 汇率来源状态
    source: 'loading',   // 'loading' | 'remote' | 'local' | 'failed'
    updatedAt: '',
    loading: true
  },

  onLoad() {
    this.buildCurrencyList()
    this.loadHistory()
    this.refreshRates()
  },

  buildCurrencyList() {
    const customRates = fx.getCustomRates()
    const codes = Object.keys(fx.BASE_RATES).filter(c => c !== 'CNY')
    const currencyList = codes.map(code => ({
      code,
      name: fx.CURRENCY_NAMES[code] || code,
      rate: customRates ? (customRates[code] || fx.BASE_RATES[code]) : fx.BASE_RATES[code]
    }))
    currencyList.unshift({
      code: 'CNY',
      name: fx.CURRENCY_NAMES.CNY,
      rate: 1,
      isBase: true
    })
    this.setData({ currencyList })
    this.recalc()
  },

  refreshRates() {
    this.setData({ loading: true, source: 'loading' })
    fx.fetchRemoteRates().then(({ rates, source }) => {
      const customRates = fx.getCustomRates()
      // 更新 currencyList 的 rate 字段
      const list = this.data.currencyList.map(item => {
        if (item.isBase) return item
        const remoteRate = rates[item.code]
        if (remoteRate != null) {
          return Object.assign({}, item, {
            rate: customRates && customRates[item.code] ? customRates[item.code] : remoteRate,
            source: source
          })
        }
        return item
      })
      this.setData({
        currencyList: list,
        source,
        loading: false,
        updatedAt: this.formatTime()
      })
      this.recalc()
    })
  },

  recalc() {
    const { amount, fromIdx, toIdx, currencyList, source } = this.data
    const from = currencyList[fromIdx].code
    const to = currencyList[toIdx].code
    // 优先用 custom，其次用 remote（存在 currencyList.rate 里），最后 base
    const customRates = fx.getCustomRates()
    const remoteRates = {}
    currencyList.forEach(item => {
      if (!item.isBase && item.rate) remoteRates[item.code] = item.rate
    })
    const rate = fx.getRate(from, to, customRates, remoteRates)
    const result = fx.convert(amount || 0, from, to, customRates, remoteRates)
    this.setData({
      rateText: rate,
      resultText: result,
      fromCurrency: from,
      toCurrency: to
    })
  },

  formatTime() {
    const d = new Date()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const dd = d.getMonth() + 1
    const month = String(dd).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day} ${hh}:${mm}`
  },

  onAmountInput(e) {
    this.setData({ amount: e.detail.value })
    this.recalc()
  },

  onFromPick(e) {
    const idx = Number(e.detail.value)
    if (idx === this.data.toIdx) {
      wx.showToast({ title: '请选择不同币种', icon: 'none' })
      return
    }
    this.setData({ fromIdx: idx })
    this.recalc()
  },

  onToPick(e) {
    const idx = Number(e.detail.value)
    if (idx === this.data.fromIdx) {
      wx.showToast({ title: '请选择不同币种', icon: 'none' })
      return
    }
    this.setData({ toIdx: idx })
    this.recalc()
  },

  onSwap() {
    const { fromIdx, toIdx, currencyList } = this.data
    const from = currencyList[fromIdx].code
    const to = currencyList[toIdx].code
    const customRates = fx.getCustomRates()
    const remoteRates = {}
    currencyList.forEach(item => {
      if (!item.isBase && item.rate) remoteRates[item.code] = item.rate
    })
    const result = fx.convert(this.data.amount || 0, from, to, customRates, remoteRates)
    this.setData({
      fromIdx: toIdx,
      toIdx: fromIdx,
      amount: result
    })
    this.recalc()
  },

  onRateInput(e) {
    const code = e.currentTarget.dataset.code
    const val = e.detail.value
    if (val === '' || parseFloat(val) === 0) {
      fx.saveCustomRate(code, 0)
      const idx = this.data.currencyList.findIndex(c => c.code === code)
      if (idx >= 0) {
        const remoteRates = {}
        this.data.currencyList.forEach(item => {
          if (!item.isBase && item.rate) remoteRates[item.code] = item.rate
        })
        const fallback = remoteRates[code] || fx.BASE_RATES[code]
        const list = this.data.currencyList.slice()
        list[idx] = Object.assign({}, list[idx], { rate: fallback, customRate: '' })
        this.setData({ currencyList: list })
      }
    } else {
      const rate = parseFloat(val)
      if (rate > 0) {
        fx.saveCustomRate(code, rate)
        const idx = this.data.currencyList.findIndex(c => c.code === code)
        if (idx >= 0) {
          const list = this.data.currencyList.slice()
          list[idx] = Object.assign({}, list[idx], { rate, customRate: val })
          this.setData({ currencyList: list })
        }
      }
    }
    this.recalc()
  },

  onHistoryTap(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const item = this.data.history[idx]
    if (!item) return
    this.setData({
      amount: item.amount,
      fromIdx: this.data.currencyList.findIndex(c => c.code === item.from),
      toIdx: this.data.currencyList.findIndex(c => c.code === item.to)
    })
    this.recalc()
  },

  saveHistory() {
    const { amount, fromIdx, toIdx, currencyList, resultText, rateText } = this.data
    const from = currencyList[fromIdx].code
    const to = currencyList[toIdx].code
    if (!amount || parseFloat(amount) === 0) return
    const item = {
      id: Date.now(),
      amount,
      from,
      to,
      result: resultText,
      rate: rateText,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    const list = this.data.history.slice()
    list.unshift(item)
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY
    this.setData({ history: list })
    wx.setStorageSync(HISTORY_KEY, list)
  },

  loadHistory() {
    const list = wx.getStorageSync(HISTORY_KEY) || []
    this.setData({ history: list })
  },

  onAmountBlur() {
    this.saveHistory()
  },

  onShareAppMessage() {
    const { amount, fromCurrency, toCurrency, resultText } = this.data
    return {
      title: `汇率：${amount || '1'} ${fromCurrency} ≈ ${resultText || '1'} ${toCurrency}`,
      path: '/pages/fx/fx'
    }
  }
})
