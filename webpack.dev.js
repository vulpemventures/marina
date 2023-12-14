// @ts-nocheck
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = (env) => merge(common(env), {
  mode: 'development',
  devtool: 'inline-source-map',
  watch: true,
  watchOptions: {
    ignored: '**/node_modules/',
  }
});
