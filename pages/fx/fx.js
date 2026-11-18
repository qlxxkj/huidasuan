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
    rate100Text: '100',
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
    const currencyList = codes.map(code => {
      const rate = customRates ? (customRates[code] || fx.BASE_RATES[code]) : fx.BASE_RATES[code]
      return {
        code,
        name: fx.CURRENCY_NAMES[code] || code,
        rate,        // 1 CNY = rate × code
        rate100: this._rate100(code, rate)  // 100 code = ? CNY
      }
    })
    currencyList.unshift({
      code: 'CNY',
      name: fx.CURRENCY_NAMES.CNY,
      rate: 1,
      rate100: 100,
      isBase: true
    })
    this.setData({ currencyList })
    this.recalc()
  },

  // 100 code 兑 CNY = 100 × (1 / rate)，rate 为 1 CNY = rate × code
  _rate100(code, rate) {
    if (!rate || rate === 1 || code === 'CNY') return '100'
    return Math.round((100 / rate) * 10000) / 10000
  },

  refreshRates() {
    this.setData({ loading: true, source: 'loading' })
    fx.fetchRemoteRates().then(({ rates, source }) => {
      const customRates = fx.getCustomRates()
      const list = this.data.currencyList.map(item => {
        if (item.isBase) return item
        const remoteRate = rates[item.code]
        if (remoteRate != null) {
          const newRate = customRates && customRates[item.code] ? customRates[item.code] : remoteRate
          return Object.assign({}, item, {
            rate: newRate,
            rate100: this._rate100(item.code, newRate),
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
      rate100Text: Math.round(rate * 100 * 10000) / 10000,
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
      // 恢复内置（存 1 CNY = rate code，需换算）
      const idx = this.data.currencyList.findIndex(c => c.code === code)
      const item = this.data.currencyList[idx]
      const fallbackRate = (item && item.rate) ? item.rate : fx.BASE_RATES[code]
      fx.saveCustomRate(code, fallbackRate)
      if (idx >= 0) {
        const list = this.data.currencyList.slice()
        list[idx] = Object.assign({}, list[idx], {
          rate: fallbackRate,
          rate100: this._rate100(code, fallbackRate),
          customRate: ''
        })
        this.setData({ currencyList: list })
      }
    } else {
      // val 是 100 code = val CNY，换算成 1 CNY = rate code
      const valNum = parseFloat(val)
      if (valNum > 0) {
        const rate = Math.round((100 / valNum) * 1000000) / 1000000  // 1 CNY = ? code
        fx.saveCustomRate(code, rate)
        const idx = this.data.currencyList.findIndex(c => c.code === code)
        if (idx >= 0) {
          const list = this.data.currencyList.slice()
          list[idx] = Object.assign({}, list[idx], {
            rate,
            rate100: valNum,
            customRate: val
          })
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
