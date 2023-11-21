module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "formatjs"],
  rules: {
    "formatjs/enforce-id": [
      "error",
      {
        idInterpolationPattern: "[sha512:contenthash:base64:6]",
      },
    ],
  },
  root: true,
  ignorePatterns: ["build/", "*.test.ts", "*.js"],
  env: {
    browser: true,
    worker: true,
    commonjs: true,
    node: false,
  },
};
