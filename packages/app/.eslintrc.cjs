module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  ignorePatterns: ["build/", "*.test.ts"],
  env: {
    browser: true,
    worker: true,
    commonjs: true,
    node: true,
  },
};
