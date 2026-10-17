/**
 * 选品记录工具：读取 / 删除 / 清空（纯本地）
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

module.exports = {
  STORAGE_KEY,
  getRecords,
  addRecord,
  saveRecords,
  deleteRecord,
  findRecord,
  clearRecords
}
