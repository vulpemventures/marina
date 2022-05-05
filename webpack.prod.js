// @ts-nocheck
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyEsPlugin = require('uglifyjs-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new UglifyEsPlugin({
        uglifyOptions: {
          mangle: {
            reserved: [
              'Buffer',
              'BigInteger',
              'Point',
              'ECPubKey',
              'ECKey',
              'sha512_asm',
              'asm',
              'ECPair',
              'HDNode'
            ]
          }
        }
      })
    ],
  },
});
