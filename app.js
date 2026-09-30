App({
  globalData: {
    // 各站点对应的本币币种代码，用于展示
    siteCurrencies: {
      US: 'USD',
      CA: 'CAD',
      UK: 'GBP',
      DE: 'EUR',
      FR: 'EUR',
      IT: 'EUR',
      ES: 'EUR',
      MX: 'MXN',
      JP: 'JPY',
      AU: 'AUD',
      SG: 'SGD',
      AE: 'AED'
    },
    fxRateToUSD: {
      USD: 1,
      CAD: 0.72,
      GBP: 1.27,
      EUR: 1.08,
      MXN: 0.056,
      JPY: 0.0068,
      AUD: 0.66,
      SGD: 0.74,
      AED: 0.27
    }
  },
  onLaunch() {}
})
