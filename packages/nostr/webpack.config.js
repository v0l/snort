const fs = require("fs")

const isProduction = process.env.NODE_ENV == "production";

const entry = {
  lib: "./src/index.ts",
}
if (!isProduction) {
  for (const file of fs.readdirSync("./test/")) {
    if (/.ts$/.test(file)) {
      const name = file.replace(/.ts$/, "")
      entry[`test/${name}`] = `./test/${file}`
    }
  }
}

module.exports = {
  mode: process.env.NODE_ENV || "development",
  target: "browserslist",
  devtool: isProduction ? "source-map" : "eval",
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
    clean: true,
    library: {
      type: "umd",
      name: "Nostr",
    },
  },
  optimization: {
    usedExports: true,
  },
}
