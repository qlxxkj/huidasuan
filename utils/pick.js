/**
 * 选品记录工具：读取 / 删除 / 清空 / 导出（纯本地）
 */
const STORAGE_KEY = 'fba_pick_history'

function getRecords() {
  return wx.getStorageSync(STORAGE_KEY) || []
}

function addRecord(record) {
  const list = getRecords()
  list.unshift(record)
  if (list.length > 100) list.length = 100
  saveRecords(list)
  return list
}

function saveRecords(list) {
  wx.setStorageSync(STORAGE_KEY, list)
}

function deleteRecord(id) {
  const list = getRecords().filter(r => r.id !== id)
  wx.setStorageSync(STORAGE_KEY, list)
  return list
}

function findRecord(id) {
  return getRecords().find(r => String(r.id) === String(id))
}

function clearRecords() {
  wx.removeStorageSync(STORAGE_KEY)
  return []
}

// CSV 单元格：含逗号/引号/换行的包引号
function csvCell(v) {
  v = (v === null || v === undefined) ? '' : String(v)
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

// 导出为 CSV（含 BOM，便于 Excel 正确识别中文）
function exportCSV(list) {
  const head = ['id', 'time', 'name', 'country', 'price', 'score', 'verdict']
  const rows = list.map(r => [
    r.id, r.time, r.name, r.country, r.price, r.score, r.verdict
  ].map(csvCell).join(','))
  return '\uFEFF' + head.join(',') + '\n' + rows.join('\n')
}

// 导出为可读文本摘要
function exportText(list) {
  const lines = ['FBA选品评分 - 导出', '共 ' + list.length + ' 条', '='.repeat(40)]
  list.forEach((r, i) => {
    lines.push(
      `[${i + 1}] ${r.time}`,
      `    ${r.name || '未命名'} | ${r.country || '-'} | 售价 $${r.price || '-'}`,
      `    综合得分 ${r.score || '—'} · ${r.verdict || '未评分'}`
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
  addRecord,
  saveRecords,
  deleteRecord,
  findRecord,
  clearRecords,
  exportCSV,
  exportText,
  copyToClipboard
}
