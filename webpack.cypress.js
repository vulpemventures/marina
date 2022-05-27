// @ts-nocheck
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');
const { EnvironmentPlugin } = require('webpack');

module.exports = merge(common, {
  mode: 'none',
  plugins: [
    new EnvironmentPlugin({
      NODE_ENV: 'test',
      NETWORK: 'regtest',
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 6,
          mangle: {
            reserved: ['Buffer']
          },
        },
      }),
    ],
  },
});
