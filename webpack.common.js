const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { ProvidePlugin } = require('webpack');

module.exports = {
  entry: {
    'index': './src/presentation/index.tsx',
    'background-script': './src/background/background-script.ts',
    'content-script': './src/content/content-script.ts',
    'inject-script': './src/inject/inject-script',
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader', options: { allowTsInNodeModules: true } },
      { test: /\.css$/i, include: path.resolve(__dirname, 'src'), use: ['style-loader', 'css-loader', 'postcss-loader'] },
    ],
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
    new CopyWebpackPlugin({
      patterns: [
        { from: './public' }, 
      ],
    }),
  ],
  output: { filename: '[name].js', path: path.resolve(__dirname, 'dist') },
};
