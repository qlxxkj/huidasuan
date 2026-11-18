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
    const customRates = fx.getCustomRates() || {}
    const codes = Object.keys(fx.BASE_RATES).filter(c => c !== 'CNY')
    const currencyList = codes.map(code => {
      const isCustom = customRates[code] != null
      const rate = isCustom ? customRates[code] : fx.BASE_RATES[code]
      return {
        code,
        name: fx.CURRENCY_NAMES[code] || code,
        rate,
        rateDisplay: this._per1(rate),      // 1 code = ? CNY
        rate100: this._rate100(rate),       // 100 code = ? CNY
        customRate: isCustom ? this._per1(rate) : ''
      }
    })
    currencyList.unshift({
      code: 'CNY',
      name: fx.CURRENCY_NAMES.CNY,
      rate: 1,
      rateDisplay: '1',
      rate100: '100',
      customRate: '',
      isBase: true
    })
    this.setData({ currencyList })
    this.recalc()
  },

  // 1 code = ? CNY（rate = 1 CNY = rate code）
  _per1(rate) {
    if (!rate || rate === 1) return '1'
    return Math.round((1 / rate) * 1000000) / 1000000
  },

  // 100 code = ? CNY
  _rate100(rate) {
    if (!rate || rate === 1) return '100'
    return Math.round((100 / rate) * 10000) / 10000
  },

  refreshRates() {
    this.setData({ loading: true, source: 'loading' })
    fx.fetchRemoteRates().then(({ rates, source }) => {
      const customRates = fx.getCustomRates() || {}
      const list = this.data.currencyList.map(item => {
        if (item.isBase) return item
        const remoteRate = rates[item.code]
        if (remoteRate == null) return item
        // 有自定义则保留，否则用远程值
        const newRate = customRates[item.code] != null ? customRates[item.code] : remoteRate
        return Object.assign({}, item, {
          rate: newRate,
          rateDisplay: this._per1(newRate),
          rate100: this._rate100(newRate),
          source
        })
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
    const idx = this.data.currencyList.findIndex(c => c.code === code)
    if (idx < 0) return

    if (val === '' || parseFloat(val) === 0) {
      // 填 0 或清空 → 清除自定义，恢复实时/内置
      fx.saveCustomRate(code, 0)
      const item = this.data.currencyList[idx]
      const fallbackRate = item.rate || fx.BASE_RATES[code]
      const list = this.data.currencyList.slice()
      list[idx] = Object.assign({}, list[idx], {
        rate: fallbackRate,
        rateDisplay: this._per1(fallbackRate),
        rate100: this._rate100(fallbackRate),
        customRate: ''
      })
      this.setData({ currencyList: list })
    } else {
      const per1 = parseFloat(val)   // 1 code = per1 CNY
      if (per1 > 0) {
        const rate = Math.round((1 / per1) * 1000000) / 1000000  // 1 CNY = rate code
        fx.saveCustomRate(code, rate)
        const list = this.data.currencyList.slice()
        list[idx] = Object.assign({}, list[idx], {
          rate,
          rateDisplay: val,
          rate100: this._rate100(rate),
          customRate: val
        })
        this.setData({ currencyList: list })
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
