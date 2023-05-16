// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TsTransformer = require("@formatjs/ts-transformer");

const isProduction = process.env.NODE_ENV == "production";

const config = {
  entry: {
    main: "./src/index.tsx",
  },
  target: "browserslist",
  devtool: isProduction ? "source-map" : "eval",
  output: {
    publicPath: "/",
    path: path.resolve(__dirname, "build"),
    filename: ({ runtime }) => {
      if (runtime === "sw") {
        return "[name].js";
      }
      return isProduction ? "[name].[chunkhash].js" : "[name].js";
    },
    clean: isProduction,
  },
  devServer: {
    open: true,
    host: "localhost",
    historyApiFallback: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "public/index.html",
      favicon: "public/favicon.ico",
    }),
    new ESLintPlugin(),
    new MiniCssExtractPlugin({
      filename: isProduction ? "[name].[chunkhash].css" : "[name].css",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        use: [
          "babel-loader",
          {
            loader: "ts-loader",
            options: {
              getCustomTransformers() {
                return {
                  before: [
                    TsTransformer.transform({
                      overrideIdFn: "[sha512:contenthash:base64:6]",
                    }),
                  ],
                };
              },
            },
          },
        ],
        exclude: ["/node_modules/"],
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif|webp)$/i,
        type: "asset",
      },
    ],
  },
  optimization: {
    usedExports: true,
    chunkIds: "deterministic",
    minimizer: ["...", new CssMinimizerPlugin()],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", "..."],
    modules: ["node_modules", __dirname, path.resolve(__dirname, "src")],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
    config.entry.sw = {
      import: "./src/service-worker.ts",
      name: "sw.js",
    };
  } else {
    config.mode = "development";
  }
  return config;
};
