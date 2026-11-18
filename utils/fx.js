/**
 * 汇率工具模块
 * - 内置离线汇率（基准 CNY，1 CNY = X），作为兜底
 * - 远程汇率：通过 Supabase Edge Function fx-get 获取，重试 3 次
 * - 可手动覆盖（本地持久化），优先级最高
 */

// 内置离线汇率（兜底）
const BASE_RATES = {
  CNY: 1,
  USD: 0.138,
  EUR: 0.128,
  GBP: 0.110,
  JPY: 21.2,
  CAD: 0.190,
  AUD: 0.207,
  SGD: 0.186,
  MXN: 2.72,
  AED: 0.505,
  HKD: 1.08
}

const CURRENCY_NAMES = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  GBP: '英镑',
  JPY: '日元',
  CAD: '加元',
  AUD: '澳元',
  SGD: '新加坡元',
  MXN: '墨西哥比索',
  AED: '阿联酋迪拉姆',
  HKD: '港币'
}

const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  MXN: 'MX$',
  AED: 'د.إ',
  HKD: 'HK$'
}

const STORAGE_KEY = 'fx_custom_rates'
const REMOTE_CACHE_KEY = 'fx_remote_rates'   // 缓存远程汇率结果
const REMOTE_CACHE_TTL = 6 * 3600 * 1000     // 本地缓存 6h（与 Edge Function 刷新周期一致）

// Supabase 配置
const FX_FUNCTION_URL = 'https://supabase.70kj.vip/functions/v1/fx-get'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 800

/**
 * 获取远程汇率（带重试 + 本地缓存）
 * @returns {Promise<{rates: Object, source: string}>}
 *   rates: { USD: 0.138, ... }
 *   source: 'cache' | 'api' | 'local' | 'failed'
 */
function fetchRemoteRates() {
  // 先查本地缓存
  try {
    const cached = wx.getStorageSync(REMOTE_CACHE_KEY)
    if (cached && cached.rates && cached.ts && (Date.now() - cached.ts < REMOTE_CACHE_TTL)) {
      return Promise.resolve({ rates: cached.rates, source: 'local' })
    }
  } catch (e) { /* ignore */ }

  function attempt(n) {
    return new Promise((resolve) => {
      wx.request({
        url: FX_FUNCTION_URL,
        method: 'GET',
        header: { 'Content-Type': 'application/json' },
        timeout: 8000,
        success(res) {
          if (res.statusCode === 200 && res.data && res.data.rates) {
            // 写本地缓存
            try {
              wx.setStorageSync(REMOTE_CACHE_KEY, { rates: res.data.rates, ts: Date.now() })
            } catch (e) { /* ignore */ }
            resolve({ rates: res.data.rates, source: res.data.source || 'api' })
          } else if (n < MAX_RETRIES) {
            setTimeout(() => attempt(n + 1).then(resolve), RETRY_DELAY_MS * n)
          } else {
            // 全部失败 → 用内置汇率兜底
            resolve({ rates: BASE_RATES, source: 'failed' })
          }
        },
        fail() {
          if (n < MAX_RETRIES) {
            setTimeout(() => attempt(n + 1).then(resolve), RETRY_DELAY_MS * n)
          } else {
            resolve({ rates: BASE_RATES, source: 'failed' })
          }
        }
      })
    })
  }

  return attempt(1)
}

/**
 * 获取指定币对汇率（from → to）
 * @param {string} from 源币种代码
 * @param {string} to   目标币种代码
 * @param {Object|null} customRates 用户自定义汇率（优先级最高）
 * @param {Object} [remoteRates] 远程汇率（次优先）
 * @returns {number} 1 from = ? to
 */
function getRate(from, to, customRates, remoteRates) {
  // 优先级：custom > remote > base
  const rates = Object.assign({}, BASE_RATES, remoteRates || {}, customRates || {})
  const fromToCny = 1 / (rates[from] || 1)
  const cnyTo = rates[to] || 1
  return fromToCny * cnyTo
}

/**
 * 互换金额
 */
function convert(amount, from, to, customRates, remoteRates) {
  const n = parseFloat(amount)
  if (isNaN(n)) return 0
  const rate = getRate(from, to, customRates, remoteRates)
  return Math.round(n * rate * 10000) / 10000
}

/**
 * 读取用户自定义汇率
 */
function getCustomRates() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || null
  } catch (e) {
    return null
  }
}

/**
 * 保存用户自定义汇率
 */
function saveCustomRate(currency, rate) {
  const current = getCustomRates() || {}
  if (rate > 0) {
    current[currency] = rate
  } else {
    delete current[currency]
  }
  wx.setStorageSync(STORAGE_KEY, current)
}

/**
 * 格式化金额展示
 */
function formatAmount(amount, currency, digits = 2) {
  const n = parseFloat(amount)
  if (isNaN(n)) return '0'
  const fixed = n.toFixed(digits)
  return CURRENCY_SYMBOLS[currency] ? CURRENCY_SYMBOLS[currency] + fixed : fixed
}

module.exports = {
  BASE_RATES,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
  fetchRemoteRates,
  getRate,
  convert,
  getCustomRates,
  saveCustomRate,
  formatAmount,
}
