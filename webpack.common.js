const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { ProvidePlugin } = require('webpack');

module.exports = {
  experiments: {
    topLevelAwait: true,
    asyncWebAssembly: true,
    syncWebAssembly: true
  },
  entry: {
    'index': './src/presentation/index.tsx',
    'background-script': './src/background/background-script.ts',
    'content-script': './src/content/content-script.ts',
    'inject-script': './src/inject/inject-script',
  },
  module: {
    rules: [
      { test: /\.wasm$/, type: 'asset/inline' },
      { test: /\.tsx?$/, loader: 'ts-loader', options: { configFile: 'tsconfig.json', allowTsInNodeModules: true } },
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
    alias: {
      "tiny-secp256k1": path.resolve(__dirname, 'node_modules/tiny-secp256k1/lib/secp256k1.wasm'),
      "tiny-secp256k1-lib": path.resolve(__dirname, 'node_modules/tiny-secp256k1/lib'),
    },
    extensions: ['.tsx', '.ts', '.js', '.wasm'],
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
