// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");
const IntlTsTransformer = require("@formatjs/ts-transformer");
const { DefinePlugin } = require('webpack');
const appConfig = require('config');
console.log(`Current config: ${JSON.stringify(appConfig, null, 2)}`);

const isProduction = process.env.NODE_ENV == "production";

const config = {
  entry: {
    main: "./src/index.tsx",
    pow: {
      import: require.resolve("@snort/system/dist/pow-worker.js"),
      filename: "pow.js",
    },
    bench: "./src/benchmarks.ts",
  },
  target: "browserslist",
  mode: isProduction ? "production" : "development",
  devtool: isProduction ? "source-map" : "cheap-module-source-map",
  output: {
    publicPath: "/",
    path: path.resolve(__dirname, "build"),
    filename: isProduction ? "[name].[chunkhash].js" : "[name].js",
    clean: isProduction,
  },
  devServer: {
    open: true,
    host: "localhost",
    historyApiFallback: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public/manifest.json" },
        { from: "public/robots.txt" },
        { from: "public/nostrich_512.png" },
        { from: "public/nostrich_256.png" },
        { from: "_headers" },
      ],
    }),
    new HtmlWebpackPlugin({
      template: "public/index.html",
      favicon: "public/favicon.ico",
      excludeChunks: ["pow", "bench"],
      templateParameters: {
        appTitle: appConfig.get('appTitle'),
      },
    }),
    new HtmlWebpackPlugin({
      filename: "bench.html",
      template: "public/bench.html",
      chunks: ["bench"],
    }),
    new ESLintPlugin({
      extensions: ["js", "mjs", "jsx", "ts", "tsx"],
      eslintPath: require.resolve("eslint"),
      failOnError: true,
      cache: true,
    }),
    new MiniCssExtractPlugin({
      filename: isProduction ? "[name].[chunkhash].css" : "[name].css",
    }),
    isProduction
      ? new WorkboxPlugin.InjectManifest({
          swSrc: "./src/service-worker.ts",
        })
      : false,
    new DefinePlugin({
      "process.env.APP_NAME": JSON.stringify(appConfig.get('appName')),
    }),
  ],
  module: {
    rules: [
      {
        enforce: "pre",
        exclude: /@babel(?:\/|\\{1,2})runtime/,
        test: /\.(js|mjs|jsx|ts|tsx|css)$/,
        loader: require.resolve("source-map-loader"),
        options: {
          filterSourceMappingUrl: (url, resourcePath) => {
            // disable warning for missing @scure-bip39 sourcemaps
            if (/.*\/.yarn\/cache\/@scure-bip39.*/.test(resourcePath)) {
              return false;
            }
            return true;
          },
        },
      },
      {
        test: /\.tsx?$/i,
        exclude: ["/node_modules/"],
        use: [
          {
            loader: require.resolve("babel-loader"),
            options: {
              babelrc: false,
              configFile: false,
              presets: [["@babel/preset-env"], ["@babel/preset-react", { runtime: "automatic" }]],
            },
          },
          {
            loader: require.resolve("ts-loader"),
            options: {
              getCustomTransformers() {
                return {
                  before: [
                    IntlTsTransformer.transform({
                      overrideIdFn: "[sha512:contenthash:base64:6]",
                      ast: true,
                    }),
                  ],
                };
              },
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, require.resolve("css-loader")],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif|webp|wasm)$/i,
        type: "asset",
      },
    ],
  },
  optimization: {
    chunkIds: "deterministic",
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          keep_classnames: isProduction,
          keep_fnames: isProduction,
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
  resolve: {
    aliasFields: ["browser"],
    extensions: ["...", ".tsx", ".ts", ".jsx", ".js"],
    modules: ["...", __dirname, path.resolve(__dirname, "src")],
    fallback: { crypto: false },
  },
};

module.exports = () => config;
