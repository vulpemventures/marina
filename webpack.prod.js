// @ts-nocheck
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new BundleAnalyzerPlugin({ analyzerMode: 'disabled' }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          ecma: 6,
          output: { 
             ascii_only: true 
          },
        },
      }),
    ],
  },
});
