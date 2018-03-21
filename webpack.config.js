const { ReactPlugin } = require("./webpack/react-plugin");
const path = require("path");

const sourcePath = path.resolve(process.cwd(), "src");
const distPath = path.resolve(process.cwd(), "dist");

module.exports = {
  entry: {
    home: path.resolve(sourcePath, "pages/home"),
    containers: path.resolve(sourcePath, "containers/index"),
  },
  output: {
    path: distPath,
    libraryTarget: "umd"
  },
  plugins: [
    new ReactPlugin({
      excludedChunks: ['containers']
    })
  ],
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
}