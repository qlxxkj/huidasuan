/**
 * 亚马逊 FBA 利润计算 - 费用数据表
 * =====================================================
 * 说明：
 *  1. 费率 / 费档为演示基准，请以亚马逊官方最新公告为准。
 *  2. 所有费率可按需在此文件内修改；修改后无需改动页面。
 *  3. 金额单位：各站点本币（site.currency）。
 * =====================================================
 */

// 各站点基础信息
const SITES = {
  US: { name: '美国', code: 'USD', symbol: '$', flag: '🇺🇸', fbaLabel: 'US FBA' },
  CA: { name: '加拿大', code: 'CAD', symbol: 'C$', flag: '🇨🇦', fbaLabel: 'CA FBA' },
  UK: { name: '英国', code: 'GBP', symbol: '£', flag: '🇬🇧', fbaLabel: 'UK FBA' },
  DE: { name: '德国', code: 'EUR', symbol: '€', flag: '🇩🇪', fbaLabel: 'EU FBA' },
  FR: { name: '法国', code: 'EUR', symbol: '€', flag: '🇫🇷', fbaLabel: 'EU FBA' },
  IT: { name: '意大利', code: 'EUR', symbol: '€', flag: '🇮🇹', fbaLabel: 'EU FBA' },
  ES: { name: '西班牙', code: 'EUR', symbol: '€', flag: '🇪🇸', fbaLabel: 'EU FBA' },
  MX: { name: '墨西哥', code: 'MXN', symbol: 'MX$', flag: '🇲🇽', fbaLabel: 'MX FBA' },
  JP: { name: '日本', code: 'JPY', symbol: '¥', flag: '🇯🇵', fbaLabel: 'JP FBA' },
  AU: { name: '澳大利亚', code: 'AUD', symbol: 'A$', flag: '🇦🇺', fbaLabel: 'AU FBA' },
  SG: { name: '新加坡', code: 'SGD', symbol: 'S$', flag: '🇸🇬', fbaLabel: 'SG FBA' },
  AE: { name: '阿联酋', code: 'AED', symbol: 'د.إ', flag: '🇦🇪', fbaLabel: 'AE FBA' }
}

// 各站点销售类目 - 销售佣金费率（%）。0 表示用其他固定规则。
// 演示基准：通用 15%；电子产品 8%；电脑配件 7%；大件 12%
const REFERRAL_FEES = {
  US: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  CA: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  UK: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  DE: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  FR: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  IT: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  ES: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  MX: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  JP: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  AU: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  SG: { general: 15, electronics: 8, computers: 7, oversize: 12 },
  AE: { general: 15, electronics: 8, computers: 7, oversize: 12 }
}

// FBA 配送费费档（每单位，本币）。
// 简化为 5 档：按"最大边(cm) 与 重量(g)"落入对应档位。
// 真实亚马逊费档非常多且分站点/分月，这里做可配置的简化基准。
const FBA_TIERS = [
  { id: 'T0', label: '微型 (≤ 6cm, ≤ 100g)', maxSide: 6,  maxWeight: 100,  fee: { US: 3.10, CA: 3.10, UK: 3.10, DE: 3.10, FR: 3.10, IT: 3.10, ES: 3.10, MX: 3.10, JP: 3.10, AU: 3.10, SG: 3.10, AE: 3.10 } },
  { id: 'T1', label: '标准小号 (≤ 15cm, ≤ 454g)', maxSide: 15, maxWeight: 454,  fee: { US: 3.75, CA: 3.75, UK: 3.75, DE: 3.75, FR: 3.75, IT: 3.75, ES: 3.75, MX: 3.75, JP: 3.75, AU: 3.75, SG: 3.75, AE: 3.75 } },
  { id: 'T2', label: '标准大号 (≤ 30cm, ≤ 907g)', maxSide: 30, maxWeight: 907,  fee: { US: 5.35, CA: 5.35, UK: 5.35, DE: 5.35, FR: 5.35, IT: 5.35, ES: 5.35, MX: 5.35, JP: 5.35, AU: 5.35, SG: 5.35, AE: 5.35 } },
  { id: 'T3', label: '大号 (≤ 45cm, ≤ 2268g)', maxSide: 45, maxWeight: 2268, fee: { US: 6.19, CA: 6.19, UK: 6.19, DE: 6.19, FR: 6.19, IT: 6.19, ES: 6.19, MX: 6.19, JP: 6.19, AU: 6.19, SG: 6.19, AE: 6.19 } },
  { id: 'T4', label: '超大号 (> 45cm / > 2268g)', maxSide: 9999, maxWeight: 99999, fee: { US: 8.45, CA: 8.45, UK: 8.45, DE: 8.45, FR: 8.45, IT: 8.45, ES: 8.45, MX: 8.45, JP: 8.45, AU: 8.45, SG: 8.45, AE: 8.45 } }
]

// 各站点 VAT / 销售税费率（%）。演示基准。
const TAX_RATES = {
  US: 0,    // 美国无统一 VAT
  CA: 5,    // GST
  UK: 20,   // VAT
  DE: 19,
  FR: 20,
  IT: 22,
  ES: 21,
  MX: 16,   // IVA
  JP: 10,   // 消费税
  AU: 10,   // GST
  SG: 8,    // GST
  AE: 5     // VAT
}

// 默认广告费假设（用于无 CPC 数据时的预估）：广告费 = 售价 * 默认占比
const AD_DEFAULT = {
  cpcRate: 0.15,      // 缺省假设：广告费占售价 15%
  monthlyAds: 0       // 若填了 monthlyAds，则按 monthlyAds / 月销量 分摊到每单
}

// 各币种符号（用于展示），与 SITES.symbol 一致，单独导出便于计算页引用
module.exports = {
  SITES,
  REFERRAL_FEES,
  FBA_TIERS,
  TAX_RATES,
  AD_DEFAULT,
  // 便捷：站点 id 列表
  SITE_IDS: Object.keys(SITES)
}
