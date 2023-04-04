module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  ignorePatterns: ["dist/", "src/legacy"],
  env: {
    browser: true,
    node: true,
    mocha: true,
  },
  rules: {
    "require-await": "error",
    eqeqeq: "error",
    "object-shorthand": "warn",
  },
}
