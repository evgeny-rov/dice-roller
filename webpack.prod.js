const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const dev = require("./webpack.dev");
const merge = require("webpack-merge");

module.exports = merge(dev, {
  mode: 'production',
  output: { filename: 'bundle.js' },
  devtool: false,
  plugins: [
    new CleanWebpackPlugin(),
  ],
});