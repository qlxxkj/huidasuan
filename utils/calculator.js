/**
 * FBA 利润计算核心（纯函数，无 wx 依赖，便于单测与导出）
 * ------------------------------------------------------------
 * 输入 input 字段：
 *   site       : 站点 id (US/CA/UK/DE/FR/IT/ES/MX/JP/AU/CN)
 *   category   : 'general' | 'electronics' | 'computers' | 'oversize'
 *   price      : 售价（本币）
 *   purchaseCost: 采购成本（本币）
 *   firstMile  : 头程物流（本币，含海运/空运分摊到单品）
 *   vatRate    : 增值税率（%，可选，默认按站点 TAX_RATES）
 *   dutyRate   : 关税率（%，可选）
 *   adCpc      : 单次点击广告费（本币，可选）
 *   monthlyAds : 月广告预算（本币，可选，按 monthlyQty 分摊）
 *   monthlyQty : 月销量（件，用于广告分摊，可选）
 *   fbaSize    : { side: 最大边 cm, weight: 重量 g }
 *   other      : 其他杂费（本币，可填）
 *   returnRate : 退货损耗率（%，可选，作用在售价上）
 *
 * 输出 result 字段：
 *   price, referralFee, fbaFee, fbaTierLabel, purchaseCost, firstMile,
 *   tax, duty, adFee, other, returnLoss, totalCost,
 *   netProfit, profitMargin, roi, currency, symbol
 */
const fees = require('../data/fees.js')

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

// 匹配 FBA 费档
function matchFbaTier(size, siteId) {
  const side = num(size && size.side)
  const weight = num(size && size.weight)
  for (const tier of fees.FBA_TIERS) {
    if (side <= tier.maxSide && weight <= tier.maxWeight) {
      return { tier, fee: tier.fee[siteId] }
    }
  }
  // 兜底最大档
  const last = fees.FBA_TIERS[fees.FBA_TIERS.length - 1]
  return { tier: last, fee: last.fee[siteId] }
}

// 广告费：优先用 monthlyAds/monthlyQty 分摊，其次用 adCpc，最后用默认占比
function calcAdFee(input) {
  const monthlyAds = num(input.monthlyAds)
  const monthlyQty = num(input.monthlyQty)
  if (monthlyAds > 0 && monthlyQty > 0) return monthlyAds / monthlyQty
  const adCpc = num(input.adCpc)
  if (adCpc > 0) return adCpc
  // 默认：售价 * cpcRate
  return num(input.price) * fees.AD_DEFAULT.cpcRate
}

function round2(v) {
  return Math.round(v * 100) / 100
}

/**
 * 主计算函数
 * @param {Object} input
 * @returns {Object} result
 */
function calcProfit(input) {
  const siteId = input.site || 'US'
  const site = fees.SITES[siteId] || fees.SITES.US
  const currency = site.code
  const symbol = site.symbol

  // 1. 销售佣金
  const catRate = (fees.REFERRAL_FEES[siteId] || fees.REFERRAL_FEES.US)[input.category || 'general']
  const referralFee = round2(num(input.price) * catRate / 100)

  // 2. FBA 配送费
  const fba = matchFbaTier(input.fbaSize, siteId)
  const fbaFee = round2(fba.fee)

  // 3. 采购 + 头程
  const purchaseCost = round2(num(input.purchaseCost))
  const firstMile = round2(num(input.firstMile))

  // 4. 税务
  const vatRate = num(input.vatRate) || fees.TAX_RATES[siteId] || 0
  // VAT 含在售价里时，税成本 = price * vatRate / (100 + vatRate)；简化按 price * vatRate/100
  const tax = round2(num(input.price) * vatRate / 100)
  const dutyRate = num(input.dutyRate)
  // 关税通常按货值(采购成本)计
  const duty = round2(purchaseCost * dutyRate / 100)

  // 5. 广告
  const adFee = round2(calcAdFee(input))

  // 6. 其他杂费
  const other = round2(num(input.other))

  // 7. 退货损耗
  const returnRate = num(input.returnRate)
  const returnLoss = round2(num(input.price) * returnRate / 100)

  // 汇总
  const totalCost = round2(
    referralFee + fbaFee + purchaseCost + firstMile + tax + duty + adFee + other + returnLoss
  )
  const netProfit = round2(num(input.price) - totalCost)
  const price = num(input.price)
  const profitMargin = price > 0 ? round2(netProfit / price * 100) : 0
  const costBasis = purchaseCost + firstMile
  const roi = costBasis > 0 ? round2(netProfit / costBasis * 100) : 0

  return {
    currency,
    symbol,
    site,
    price,
    referralFee,
    fbaFee,
    fbaTier: fba.tier,
    fbaTierLabel: fba.tier.label,
    fbaTierId: fba.tier.id,
    purchaseCost,
    firstMile,
    tax,
    duty,
    adFee,
    other,
    returnLoss,
    totalCost,
    netProfit,
    profitMargin,
    roi,
    // 费率快照，便于导出
    rates: {
      referralRate: catRate,
      vatRate,
      dutyRate
    }
  }
}

module.exports = {
  calcProfit,
  matchFbaTier,
  num,
  round2
}
