const STORAGE_KEY = 'fba_pick_history'
const MAX_RECORDS = 100

// 6个维度，权重固定，指标固定
const DIMS = [
  {
    key: 'market', label: '市场容量', weight: 0.20, weightStr: '20%',
    items: [
      { id: 1, label: '核心词月搜索量', ph: '月搜索量', hint: '≥10000=5分，<500=1分' },
      { id: 2, label: '小类BSR Top10月销', ph: 'Top10月销', hint: '≥2000=5分，<300=1分' },
      { id: 3, label: '谷歌趋势（过去5年）', input: true, inputType: 'text', ph: '趋势描述', hint: '稳定上升=5分，持续下滑=1分' }
    ]
  },
  {
    key: 'compete', label: '竞争环境', weight: 0.15, weightStr: '15%',
    items: [
      { id: 4, label: '首页竞品平均 Review 数', ph: '平均Review', hint: '≤200=5分，>2000=1分' },
      { id: 5, label: '品牌集中度（TOP10不同品牌数）', ph: '品牌数', hint: '≥9=5分，1=1分' }
    ]
  },
  {
    key: 'product', label: '产品属性', weight: 0.15, weightStr: '15%',
    items: [
      { id: 6, label: '差评痛点改进空间', input: true, inputType: 'text', ph: '痛点描述', hint: '明确可改=5分，物理不可改=1分' },
      { id: 7, label: '体积重量（g，是否轻小）', ph: '重量g', hint: '≤500g=5分，≥5000g=1分' },
      { id: 8, label: '季节性依赖', input: true, inputType: 'text', ph: '无/弱/中/强/极端', hint: '无=5分，极端=1分' }
    ]
  },
  {
    key: 'profit', label: '利润模型', weight: 0.25, weightStr: '25% 🔴核心',
    items: [
      { id: 9, label: '预估毛利率 %', ph: '毛利率%', hint: '≥40%=5分，≤10%=1分' },
      { id: 10, label: '单件净利（$）', ph: '净利$' , hint: '≥$10=5分，≤$1=1分' },
      { id: 11, label: '退货率预估 %', ph: '退货率%', hint: '≤5%=5分，≥20%=1分' }
    ]
  },
  {
    key: 'ads', label: '广告可行性', weight: 0.20, weightStr: '20% 🔥重点',
    items: [
      { id: 12, label: '预估 CPC（$）', ph: 'CPC', hint: '≤$0.5=5分，>$2=1分' },
      { id: 13, label: '自然转化率 %', ph: '转化率%', hint: '≥18%=5分，<5%=1分' },
      { id: 14, label: '盈亏平衡 ROI', ph: 'ROI', hint: '≤2.5=5分，>5=1分' }
    ]
  },
  {
    key: 'risk', label: '风险控制', weight: 0.05, weightStr: '5%',
    items: [
      { id: 15, label: '专利/侵权风险', input: true, inputType: 'text', ph: '无/可规避/疑似/明确', hint: '无=5分，明确=1分' },
      { id: 16, label: '认证合规难度', input: true, inputType: 'text', ph: '无/简单/普通/复杂/禁止', hint: '无=5分，禁止=1分' }
    ]
  }
]

// 16个指标对应的评分函数（根据指标类型和阈值判断）
function scoreItem(dimIdx, itemIdx, value, rating) {
  // 如果用户手动选了评分，直接用；否则留空让综合得分算
  return rating
}

// 维度加权合计 = Σ(指标评分 × 维度权重 / 指标数)
function calcDimWtd(dimIdx, ratings, dims) {
  const dim = dims[dimIdx]
  let sum = 0
  let filled = 0
  for (let i = 0; i < dim.items.length; i++) {
    const r = ratings[dimIdx][i]
    if (r > 0) {
      sum += r
      filled++
    }
  }
  if (filled === 0) return '—'
  // 维度得分 = 平均评分 × 维度权重（按已填比例归一）
  const avg = sum / filled
  const wtd = avg * dim.weight
  return wtd.toFixed(2)
}

// 综合得分 = Σ各维度加权得分 / Σ权重（即加权平均，满分5）
function calcTotal(ratings, dims) {
  let weightedSum = 0
  let weightTotal = 0
  for (let di = 0; di < dims.length; di++) {
    const dim = dims[di]
    let sum = 0, filled = 0
    for (let ii = 0; ii < dim.items.length; ii++) {
      const r = ratings[di][ii]
      if (r > 0) { sum += r; filled++ }
    }
    if (filled > 0) {
      weightedSum += (sum / filled) * dim.weight
      weightTotal += dim.weight
    }
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

// 初始化：每个维度每个指标的评分数组
function initRatings(dims) {
  return dims.map(d => d.items.map(() => 0))
}
function initInputs(dims) {
  return dims.map(d => d.items.map(() => ''))
}

const COUNTRIES = ['US', 'UK', 'DE', 'JP', 'CA', 'FR', 'IT', 'ES']

Page({
  data: {
    basic: { name: '', price: '', country: 'US' },
    countries: COUNTRIES,
    countryIds: COUNTRIES,
    countryIdx: 0,
    dims,
    ratings: initRatings(DIMS),
    inputs: initInputs(DIMS),
    dimWtd: DIMS.map(() => '—'),
    verdict: { score: '—', text: '请完成各维度评分后查看结果', emoji: '📋', cls: '' }
  },

  onCountry(e) {
    const idx = Number(e.detail.value)
    this.setData({ countryIdx: idx, 'basic.country': COUNTRIES[idx] })
  },

  onBasic(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`basic.${key}`]: e.detail.value })
  },

  onInputTap(e) {
    const { dim, item } = e.currentTarget.dataset
    const inputs = JSON.parse(JSON.stringify(this.data.inputs))
    inputs[dim][item] = e.detail.value
    this.setData({ inputs })
  },

  onRateTap(e) {
    const { dim, item, score } = e.currentTarget.dataset
    const ratings = JSON.parse(JSON.stringify(this.data.ratings))
    // 再次点击同一分数 → 取消
    if (ratings[dim][item] === score) {
      ratings[dim][item] = 0
    } else {
      ratings[dim][item] = score
    }
    const dimWtd = DIMS.map((d, di) => calcDimWtd(di, ratings, DIMS))
    const total = calcTotal(ratings, DIMS)
    this.setData({ ratings, dimWtd, verdict: getVerdict(total) })
  },

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
