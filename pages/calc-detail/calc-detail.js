const fees = require('../../data/fees.js')
const { calcProfit } = require('../../utils/calculator.js')
const H = require('../../utils/history.js')

Page({
  data: {
    id: 0,
    isNew: true,
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
    form: { price: '', purchaseCost: '', firstMile: '', side: '', weight: '', vatRate: '', dutyRate: '', adCpc: '', monthlyAds: '', other: '' },
    result: {}
  },

  onLoad(options) {
    if (options.new) {
      this.setData({ isNew: true })
      this.recalc()
      return
    }
    const rec = H.getRecords().find(r => String(r.id) === String(options.id))
    if (!rec) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.loadRecord(rec)
  },

  loadRecord(rec) {
    // 旧记录没有 form/category 字段：用结果反推
    const form = rec.form || {
      price: rec.price, purchaseCost: rec.purchaseCost, firstMile: rec.firstMile,
      side: '', weight: '', vatRate: rec.rates ? rec.rates.vatRate : '',
      dutyRate: rec.rates ? rec.rates.dutyRate : '', adCpc: rec.adFee, monthlyAds: '', other: rec.other
    }
    const catIdx = Math.max(0, this.data.categories.findIndex(c => c.key === (rec.category || 'general')))
    this.setData({
      isNew: false,
      id: rec.id,
      site: rec.site,
      taxRate: fees.TAX_RATES[rec.site] || 0,
      form,
      categoryIdx: catIdx,
      result: rec.result || this.recalc()
    })
  },

  onSiteTap(e) {
    const site = e.currentTarget.dataset.site
    this.setData({ site, taxRate: fees.TAX_RATES[site] })
    this.recalc()
  },

  onCategory(e) {
    this.setData({ categoryIdx: Number(e.detail.value) })
    this.recalc()
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
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
    return result
  },

  save() {
    const r = this.data.result
    if (!this.data.form.price) {
      wx.showToast({ title: '请先填写售价', icon: 'none' })
      return
    }
    const record = {
      id: this.data.isNew ? Date.now() : this.data.id,
      site: this.data.site,
      category: this.data.categories[this.data.categoryIdx].key,
      form: { ...this.data.form },
      result: r,
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
    const list = H.getRecords()
    if (this.data.isNew) {
      list.unshift(record)
      if (list.length > 200) list.length = 200
    } else {
      const i = list.findIndex(x => String(x.id) === String(record.id))
      if (i >= 0) list[i] = record
    }
    H.saveRecords(list)
    this.setData({ id: record.id, isNew: false })
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  del() {
    wx.showModal({
      title: '删除记录',
      content: '确认删除这条？',
      success: (res) => {
        if (res.confirm) {
          H.deleteRecord(this.data.id)
          wx.navigateBack()
        }
      }
    })
  },

  onShareAppMessage() {
    const r = this.data.result || {}
    return {
      title: `我在算亚马逊${this.data.sites[this.data.site].name}站的利润，单品净赚${r.symbol || ''}${r.netProfit || 0}`,
      path: `/pages/calc/calc?site=${this.data.site}`
    }
  }
})
