import { AssetsByNetwork } from '../../src/domain/asset';

export const testAssets: AssetsByNetwork = {
  liquid: {
    ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2: {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': {
      name: 'Liquid Bitcoin',
      ticker: 'L-BTC',
    },
  },
  regtest: {},
};

export const testAssetsUpdated1: AssetsByNetwork = {
  liquid: {
    ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2: {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': {
      name: 'Liquid Bitcoin',
      ticker: 'L-BTC',
    },
  },
  regtest: {
    '60d4a99f2413d67ad58a66a6e0d108957208f66484c1208a8aacebac4fc148bb': {
      name: 'Random Shitcoin',
      ticker: 'SHIT',
      precision: 8,
    },
  },
};

export const testAssetsUpdated2: AssetsByNetwork = {
  liquid: {
    ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2: {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': {
      name: 'Liquid Bitcoin',
      ticker: 'L-BTC',
    },
  },
  regtest: {
    '74cf7361647e720a11c11b214c7b96d3e539bb42d01e02b8fa5ef4cfaba2fb0d': {
      name: 'Vulpem',
      precision: 8,
      ticker: 'VLP',
    },
    '9958d94b2967b1abe83d6023881dfdeef2143aea05f8ebffce81c45a1e14fa38': {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    abc376a4f45831203a704745614709cafdaca0c422b428e0e6588b53f64831ad: {
      name: 'Sticker pack',
      precision: 8,
      ticker: 'STIKR',
    },
  },
};

// testAssetsUpdated1 + testAssetsUpdated2
export const testAssetsUpdated3: AssetsByNetwork = {
  liquid: {
    ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2: {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': {
      name: 'Liquid Bitcoin',
      ticker: 'L-BTC',
    },
  },
  regtest: {
    '60d4a99f2413d67ad58a66a6e0d108957208f66484c1208a8aacebac4fc148bb': {
      name: 'Random Shitcoin',
      precision: 8,
      ticker: 'SHIT',
    },
    '74cf7361647e720a11c11b214c7b96d3e539bb42d01e02b8fa5ef4cfaba2fb0d': {
      name: 'Vulpem',
      precision: 8,
      ticker: 'VLP',
    },
    '9958d94b2967b1abe83d6023881dfdeef2143aea05f8ebffce81c45a1e14fa38': {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    abc376a4f45831203a704745614709cafdaca0c422b428e0e6588b53f64831ad: {
      name: 'Sticker pack',
      precision: 8,
      ticker: 'STIKR',
    },
  },
};
