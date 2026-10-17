const STORAGE_KEY = 'fba_pick_history'
const MAX_RECORDS = 100

// 6 个维度，权重固定。每项指标声明：
//   数值项 type: 'num-up'(越大越好)/'num-down'(越小越好) + thresholds + unit
//   枚举项 type: 'enum' + options[最优..最差]
//   所有项 rules: { grades: [5条档位文案], source: '数据获取方式' }
const DIMS = [
  {
    key: 'market', label: '市场容量', weight: 0.20, weightStr: '20%',
    items: [
      { id: 1, label: '核心词月搜索量', type: 'num-up', unit: '次', ph: '月搜索量',
        thresholds: { min4: 10000, min3: 5000, min2: 2000, min1: 500 },
        rules: { grades: ['≥10000 = 5分', '5000–9999 = 4分', '2000–4999 = 3分', '500–1999 = 2分', '<500 = 1分'],
          source: 'ABA → Search Terms 看 Search Frequency Rank（前10万=大词，前30万=中，>50万=小）。无 ABA：下拉联想丰富度 + 前台结果页数 + Keepa 反推（竞品销量÷转化率÷点击占比）。' } },
      { id: 2, label: '小类 BSR Top10 月销', type: 'num-up', unit: '件', ph: 'Top10月销',
        thresholds: { min4: 2000, min3: 1000, min2: 500, min1: 300 },
        rules: { grades: ['≥2000 = 5分', '1000–1999 = 4分', '500–999 = 3分', '300–499 = 2分', '<300 = 1分'],
          source: 'Keepa 看小类 BSR#10/#30/#100 → 用该类目经验表。例 Home Kitchen 小类：#10≈1500-2500，#30≈800-1200，#100≈300-500。' } },
      { id: 3, label: '谷歌趋势（近 5 年）', type: 'enum',
        options: ['稳定上升', '平稳', '波动但有峰', '波动下行', '持续下滑'],
        rules: { grades: ['稳定上升 = 5分', '平稳 = 4分', '波动但有峰 = 3分', '波动下行 = 2分', '持续下滑 = 1分'],
          source: 'trends.google.com 输核心词，看 5 年趋势曲线。' } }
    ]
  },
  {
    key: 'compete', label: '竞争环境', weight: 0.15, weightStr: '15%',
    items: [
      { id: 4, label: '首页竞品平均 Review 数', type: 'num-down', unit: '条', ph: '平均Review',
        thresholds: { max1: 200, max2: 500, max3: 1000, max4: 2000 },
        rules: { grades: ['≤200 = 5分', '201–500 = 4分', '501–1000 = 3分', '1001–2000 = 2分', '>2000 = 1分'],
          source: '前台第一页搜核心词 → 记前 10-20 个 organic ASIN 的 Review 数 → 求平均。' } },
      { id: 5, label: '品牌集中度（TOP10 不同品牌数）', type: 'num-up', unit: '个', ph: '品牌数',
        thresholds: { min4: 9, min3: 7, min2: 5, min1: 3 },
        rules: { grades: ['≥9 = 5分', '7–8 = 4分', '5–6 = 3分', '3–4 = 2分', '1–2 = 1分'],
          source: '录「前10不同品牌数」（不是百分比，无工具好算）。' } }
    ]
  },
  {
    key: 'product', label: '产品属性', weight: 0.15, weightStr: '15%',
    items: [
      { id: 6, label: '差评痛点改进空间', type: 'enum',
        options: ['明确可改', '部分可改', '较难改进', '同质化严重', '物理不可改'],
        rules: { grades: ['明确可改 = 5分', '部分可改 = 4分', '较难改进 = 3分', '同质化严重 = 2分', '物理不可改 = 1分'],
          source: '提炼共性问题：材质差、尺寸小、易破、异味、安装难…' } },
      { id: 7, label: '体积重量（g，是否轻小）', type: 'num-down', unit: 'g', ph: '重量g',
        thresholds: { max1: 500, max2: 1200, max3: 2000, max4: 3000 },
        rules: { grades: ['≤500g = 5分', '501–1200g = 4分', '1201–2000g = 3分', '2001–3000g = 2分', '>3000g = 1分'],
          source: '1688 规格 + 包材估重；尺寸判 FBA 档。' } },
      { id: 8, label: '季节性依赖', type: 'enum',
        options: ['无', '弱', '中', '强', '极端'],
        rules: { grades: ['无 = 5分', '弱 = 4分', '中 = 3分', '强 = 2分', '极端 = 1分'],
          source: '根据类目自行判断。' } }
    ]
  },
  {
    key: 'profit', label: '利润模型', weight: 0.25, weightStr: '25% 🔴核心',
    items: [
      { id: 9, label: '预估毛利率 %', type: 'num-up', unit: '%', ph: '毛利率%',
        thresholds: { min4: 40, min3: 30, min2: 20, min1: 10 },
        rules: { grades: ['≥40% = 5分', '30–39% = 4分', '20–29% = 3分', '10–19% = 2分', '≤10% = 1分'],
          source: '毛利 = 售价 −（采购USD + 头程 + FBA费 + 佣金%）。FBA Calculator 估费；头程海运¥30-40/kg、空运¥60-80；采购÷汇率。' } },
      { id: 10, label: '单件净利（$）', type: 'num-up', unit: '$', ph: '净利$',
        thresholds: { min4: 10, min3: 6, min2: 3, min1: 1 },
        rules: { grades: ['≥$10 = 5分', '$6–9.99 = 4分', '$3–5.99 = 3分', '$1–2.99 = 2分', '≤$1 = 1分'],
          source: '净利 ≈ 毛利 −（售价×广告%10-15% + 退率×售价×50% + 其他2%）。' } },
      { id: 11, label: '退货率预估 %', type: 'num-down', unit: '%', ph: '退货率%',
        thresholds: { max1: 5, max2: 8, max3: 12, max4: 20 },
        rules: { grades: ['≤5% = 5分', '5.01–8% = 4分', '8.01–12% = 3分', '12.01–20% = 2分', '≥20% = 1分'],
          source: '竞品 Review 中 return/defect 比例 + 类目经验。Home 标品3-5%；纺织15-30%；电子5-10%；易碎8-15%。' } }
    ]
  },
  {
    key: 'ads', label: '广告可行性', weight: 0.20, weightStr: '20% 🔥重点',
    items: [
      { id: 12, label: '预估 CPC（$）', type: 'num-down', unit: '$', ph: 'CPC',
        thresholds: { max1: 0.5, max2: 1, max3: 1.5, max4: 2 },
        rules: { grades: ['≤$0.5 = 5分', '$0.51–1.0 = 4分', '$1.01–1.5 = 3分', '$1.51–2.0 = 2分', '>$2 = 1分'],
          source: '前台搜核心词看顶部 SP 广告密度（高→中高CPC）；类目经验值。Home$0.5-1.0；电子$1.0-1.8；Pet$0.6-1.1；Office$0.5-0.9。' } },
      { id: 13, label: '自然转化率 %', type: 'num-up', unit: '%', ph: '转化率%',
        thresholds: { min4: 18, min3: 12, min2: 8, min1: 5 },
        rules: { grades: ['≥18% = 5分', '12–17% = 4分', '8–11% = 3分', '5–7% = 2分', '<5% = 1分'],
          source: '竞品销量 ÷（搜量×10-15%点击率）反推；类目基准。Home12-18%；Pet10-15%；电子8-12%；服装5-10%。' } },
      { id: 14, label: '盈亏平衡 ROI', type: 'num-down', unit: 'x', ph: 'ROI',
        thresholds: { max1: 2.5, max2: 3, max3: 4, max4: 5 },
        rules: { grades: ['≤2.5 = 5分', '2.51–3 = 4分', '3.01–4 = 3分', '4.01–5 = 2分', '>5 = 1分'],
          source: 'ROI = 1/毛利率（毛利率用小数，40%→0.4→ROI=2.5）。' } }
    ]
  },
  {
    key: 'risk', label: '风险控制', weight: 0.05, weightStr: '5%',
    items: [
      { id: 15, label: '专利/侵权风险', type: 'enum',
        options: ['无', '可规避', '模糊', '疑似', '明确'],
        rules: { grades: ['无 = 5分', '可规避 = 4分', '模糊 = 3分', '疑似 = 2分', '明确 = 1分'],
          source: 'USPTO 简单搜关键词/外观；Google 图片；避开特有造型/品牌词。' } },
      { id: 16, label: '认证合规难度', type: 'enum',
        options: ['无', '简单', '普通', '复杂', '禁止'],
        rules: { grades: ['无 = 5分', '简单 = 4分', '普通 = 3分', '复杂 = 2分', '禁止 = 1分'],
          source: '亚马逊类目要求页 + 常识。' } }
    ]
  }
]

// 自动评分：根据输入值按阈值/枚举档位算 1-5 分；未填或输入中返回 0
function autoScore(item, raw) {
  if (raw === '' || raw === undefined || raw === null) return 0
  if (item.type === 'enum') {
    const i = parseInt(raw, 10)
    if (isNaN(i) || i < 0 || i >= item.options.length) return 0
    return 5 - i  // index 0(最优)→5分 … 4(最差)→1分
  }
  const v = parseFloat(raw)
  if (isNaN(v)) return 0  // 输入中途（如 "."）不显示徽章
  if (item.type === 'num-up') {
    const t = item.thresholds
    if (v >= t.min4) return 5
    if (v >= t.min3) return 4
    if (v >= t.min2) return 3
    if (v >= t.min1) return 2
    return 1
  }
  const t = item.thresholds
  if (v <= t.max1) return 1
  if (v <= t.max2) return 2
  if (v <= t.max3) return 3
  if (v <= t.max4) return 4
  return 5
}

// 维度加权合计（按已填指标求平均再乘维度权重）
function calcDimWtd(dimIdx, ratings, dims) {
  const dim = dims[dimIdx]
  let sum = 0, filled = 0
  for (let i = 0; i < dim.items.length; i++) {
    const r = ratings[dimIdx][i]
    if (r > 0) { sum += r; filled++ }
  }
  if (filled === 0) return '—'
  return ((sum / filled) * dim.weight).toFixed(2)
}

// 综合得分 = Σ(维度均分 × 维度权重) / Σ权重（满分5）
function calcTotal(ratings, dims) {
  let weightedSum = 0, weightTotal = 0
  for (let di = 0; di < dims.length; di++) {
    const dim = dims[di]
    let sum = 0, filled = 0
    for (let ii = 0; ii < dim.items.length; ii++) {
      const r = ratings[di][ii]
      if (r > 0) { sum += r; filled++ }
    }
    if (filled > 0) { weightedSum += (sum / filled) * dim.weight; weightTotal += dim.weight }
  }
  if (weightTotal === 0) return null
  return (weightedSum / weightTotal).toFixed(2)
}

function getVerdict(scoreStr) {
  if (!scoreStr) return { score: '—', text: '请完成各维度评分后查看结果', emoji: '📋', cls: '' }
  const s = parseFloat(scoreStr)
  if (s >= 3.8) return { score: scoreStr, text: '优质，优先测款（200-300件）', emoji: '✅', cls: 'good' }
  if (s >= 3.3) return { score: scoreStr, text: '合格，需优化（成本/差异/毛利）后复测', emoji: '⚠️', cls: 'ok' }
  if (s >= 3.0) return { score: scoreStr, text: '边缘，仅当极适合供应链/资源才考虑', emoji: '❓', cls: 'mid' }
  return { score: scoreStr, text: '直接放弃', emoji: '❌', cls: 'bad' }
}

function initGrid(dims, factory) {
  return dims.map(d => d.items.map(factory))
}

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

function countryNames() {
  return COUNTRIES.map(c => c.name)
}

function countryStr(e) {
  const c = COUNTRIES[Number(e)]
  if (!c) return ''
  return `${c.name}(${c.code})`
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
    verdict: { score: '—', text: '请完成各维度评分后查看结果', emoji: '📋', cls: '' }
  },

  onCountry(e) {
    const idx = Number(e.detail.value)
    this.setData({ countryIdx: idx, 'basic.country': countryStr(idx) })
  },

  onBasic(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`basic.${key}`]: e.detail.value })
  },

  // 数值输入：击键实时自动评分（路径式 setData，避免每次击键深克隆整个二维数组）
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

  // 枚举 chips 点选：val 是 option index
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
      name: basic.name,
      country: basic.country,
      price: basic.price,
      ratings,
      inputs,
      score: verdict.score,
      verdict: verdict.text,
      time: new Date().toISOString()
    }
    const list = wx.getStorageSync(STORAGE_KEY) || []
    list.unshift(record)
    if (list.length > MAX_RECORDS) list.length = MAX_RECORDS
    wx.setStorageSync(STORAGE_KEY, list)
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onShareAppMessage() {
    const { basic, verdict } = this.data
    return {
      title: `选品评分：${basic.name || '未命名'} 得分 ${verdict.score}`,
      path: '/pages/pick/pick'
    }
  }
})
