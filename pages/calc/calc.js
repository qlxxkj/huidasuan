const fees = require('../../data/fees.js')
const { calcProfit } = require('../../utils/calculator.js')

const STORAGE_KEY = 'fba_calc_history'
const MAX_RECORDS = 200

Page({
  data: {
    site: 'US',
    siteIds: fees.SITE_IDS,
    sites: fees.SITES,
    taxRate: fees.TAX_RATES.US,
    categories: [
      { key: 'general', label: '通用', rate: 15 },
      { key: 'electronics', label: '电子产品', rate: 8 },
      { key: 'computers', label: '电脑/配件', rate: 7 },
      { key: 'oversize', label: '大件', rate: 12 }
    ],
    categoryIdx: 0,
    form: {
      price: '',
      purchaseCost: '',
      firstMile: '',
      side: '',
      weight: '',
      vatRate: '',
      dutyRate: '',
      adCpc: '',
      monthlyAds: '',
      other: ''
    },
    result: {}
  },

  onLoad(options) {
    // 支持从分享卡片进入：还原站点与类目
    if (options && options.site && fees.SITES[options.site]) {
      this.setData({
        site: options.site,
        taxRate: fees.TAX_RATES[options.site] || 0
      })
    }
    if (options && options.category) {
      const idx = this.data.categories.findIndex(c => c.key === options.category)
      if (idx >= 0) this.setData({ categoryIdx: idx })
    }
    this.recalc()
  },

  onShow() {
    // 从历史页删除/清空后回到此处可保持状态
  },

  // 切换站点
  onSiteTap(e) {
    const site = e.currentTarget.dataset.site
    this.setData({ site, taxRate: fees.TAX_RATES[site] })
    this.recalc()
  },

  onCategory(e) {
    const idx = Number(e.detail.value)
    this.setData({ categoryIdx: idx })
    this.recalc()
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    const form = { ...this.data.form }
    form[key] = e.detail.value
    this.setData({ form })
    this.recalc()
  },

  recalc() {
    const f = this.data.form
    const category = this.data.categories[this.data.categoryIdx].key
    const result = calcProfit({
      site: this.data.site,
      category,
      price: f.price,
      purchaseCost: f.purchaseCost,
      firstMile: f.firstMile,
      fbaSize: { side: f.side, weight: f.weight },
      vatRate: f.vatRate,
      dutyRate: f.dutyRate,
      adCpc: f.adCpc,
      monthlyAds: f.monthlyAds,
      monthlyQty: f.monthlyQty,
      other: f.other
    })
    this.setData({ result })
  },

  // 保存单条记录
  saveRecord() {
    const r = this.data.result
    if (!this.data.form.price) {
      wx.showToast({ title: '请先填写售价', icon: 'none' })
      return
    }
    const record = {
      id: Date.now(),
      site: this.data.site,
      siteName: this.data.sites[this.data.site].name,
      currency: r.currency,
      symbol: r.symbol,
      price: r.price,
      referralFee: r.referralFee,
      fbaFee: r.fbaFee,
      fbaTierLabel: r.fbaTierLabel,
      purchaseCost: r.purchaseCost,
      firstMile: r.firstMile,
      tax: r.tax,
      duty: r.duty,
      adFee: r.adFee,
      other: r.other,
      totalCost: r.totalCost,
      netProfit: r.netProfit,
      profitMargin: r.profitMargin,
      roi: r.roi,
      time: new Date().toISOString()
    }

    const list = wx.getStorageSync(STORAGE_KEY) || []
    list.unshift(record)
    if (list.length > MAX_RECORDS) list.length = MAX_RECORDS
    wx.setStorageSync(STORAGE_KEY, list)

    wx.showToast({ title: '已保存', icon: 'success' })
    wx.setTabBarBadge({ index: 1, text: String(list.length) })
  },

  // 分享给好友：把当前站点/类目带过去，对方打开可快速进入同站点
  onShareAppMessage() {
    const r = this.data.result || {}
    return {
      title: `我在算亚马逊${this.data.sites[this.data.site].name}站的利润，单品净赚${r.symbol || ''}${r.netProfit || 0}` ,
      path: `/pages/calc/calc?site=${this.data.site}&category=${this.data.categories[this.data.categoryIdx].key}`
    }
  },

  // 供历史页读取的常量导出
  static: {
    STORAGE_KEY,
    MAX_RECORDS
  }
})
