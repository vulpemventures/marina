const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { ProvidePlugin } = require('webpack');

module.exports = {
  entry: {
    popup: './src/presentation/index.tsx',
    'background-script': './src/background-script.ts',
    'content-script': './src/content-script.ts',
    'inject-script': './src/inject-script',
  },
  module: {
    rules: [{ test: /\.tsx?$/, loader: 'ts-loader', options: { allowTsInNodeModules: true } }],
  },
  resolve: {
    fallback: { 
      "crypto": require.resolve("crypto-browserify"), 
      "stream": require.resolve("stream-browserify"), 
      "path": require.resolve("path-browserify"), 
      "fs": false 
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    }),
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    new HtmlWebpackPlugin({ template: 'src/popup.html' }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './public/manifest.json' }, 
        { from: './public/assets', to: 'assets' },
        { from: './public/home.html' }
      ],
    }),
  ],
  output: { filename: '[name].js', path: path.resolve(__dirname, 'dist') },
};
