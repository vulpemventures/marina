// @ts-nocheck
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env) => merge(common(env), {
  mode: 'production',
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
