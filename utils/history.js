/**
 * 历史记录工具：读取 / 导出 / 删除
 * 导出采用「复制到剪贴板」方式（纯本地，不依赖外部接口）
 */
const STORAGE_KEY = 'fba_calc_history'

function getRecords() {
  return wx.getStorageSync(STORAGE_KEY) || []
}

function saveRecords(list) {
  wx.setStorageSync(STORAGE_KEY, list)
}

function deleteRecord(id) {
  const list = getRecords().filter(r => r.id !== id)
  saveRecords(list)
  return list
}

function clearRecords() {
  wx.removeStorageSync(STORAGE_KEY)
  return []
}

// 导出为 CSV（含 BOM，便于 Excel 正确识别中文）
function exportCSV(list) {
  const head = [
    'id', 'time', 'site', 'currency', 'price',
    'referralFee', 'fbaFee', 'fbaTier', 'purchaseCost', 'firstMile',
    'tax', 'duty', 'adFee', 'other', 'totalCost', 'netProfit',
    'profitMargin(%)', 'roi(%)'
  ]
  const rows = list.map(r => [
    r.id, r.time, r.siteName, r.currency, r.price,
    r.referralFee, r.fbaFee, r.fbaFee && r.fbaTierLabel, r.purchaseCost, r.firstMile,
    r.tax, r.duty, r.adFee, r.other, r.totalCost, r.netProfit,
    r.profitMargin, r.roi
  ].map(v => {
    v = (v === null || v === undefined) ? '' : String(v)
    // 含逗号/引号/换行的包引号
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
  }).join(','))

  return '\uFEFF' + head.join(',') + '\n' + rows.join('\n')
}

// 导出为可读文本摘要
function exportText(list) {
  const lines = ['FBA利润计算器 - 历史导出', '共 ' + list.length + ' 条', '='.repeat(40)]
  list.forEach((r, i) => {
    lines.push(
      `[${i + 1}] ${r.time}`,
      `    站点 ${r.siteName} | 售价 ${r.symbol}${r.price}`,
      `    佣金 ${r.symbol}${r.referralFee} | FBA ${r.symbol}${r.fbaFee}(${r.fbaTierLabel || '-'})`,
      `    采购 ${r.symbol}${r.purchaseCost} | 头程 ${r.symbol}${r.firstMile}`,
      `    税 ${r.symbol}${r.tax} | 关税 ${r.symbol}${r.duty} | 广告 ${r.symbol}${r.adFee} | 其他 ${r.symbol}${r.other}`,
      `    总成本 ${r.symbol}${r.totalCost} → 净利 ${r.symbol}${r.netProfit} (利润率 ${r.profitMargin}% / ROI ${r.roi}%)`
    )
  })
  return lines.join('\n')
}

function copyToClipboard(content, done, fail) {
  wx.setClipboardData({
    data: content,
    success() {
      wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      done && done()
    },
    fail() {
      wx.showToast({ title: '复制失败', icon: 'none' })
      fail && fail()
    }
  })
}

module.exports = {
  STORAGE_KEY,
  getRecords,
  saveRecords,
  deleteRecord,
  clearRecords,
  exportCSV,
  exportText,
  copyToClipboard
}
