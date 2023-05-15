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
  entry: "./src/index.tsx",
  target: "browserslist",
  devtool: "source-map",
  output: {
    publicPath: "/",
    path: path.resolve(__dirname, "build"),
    filename: "[name].[chunkhash].js",
    clean: true,
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
      filename: "[name].[chunkhash].css",
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

    config.plugins.push(new WorkboxWebpackPlugin.GenerateSW());
  } else {
    config.mode = "development";
    config.output.clean = false;
  }
  return config;
};
