const fs = require("fs")

const entry = {
  lib: "./src/index.ts",
}

for (const file of fs.readdirSync("./test/")) {
  if (/.ts$/.test(file)) {
    const name = file.replace(/.ts$/, "")
    entry[`test/${name}`] = `./test/${file}`
  }
}

module.exports = {
  mode: process.env.NODE_ENV || "development",
  devtool: "inline-source-map",
  entry,
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      crypto: false,
    },
  },
  module: {
    rules: [{ test: /\.ts$/, use: "ts-loader" }],
  },
  output: {
    filename: "[name].js",
    path: `${__dirname}/dist`,
  },
}
