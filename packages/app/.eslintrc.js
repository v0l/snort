/* eslint-disable import/no-anonymous-default-export */
module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "formatjs", "react-refresh", "simple-import-sort"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-refresh/only-export-components": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
  },
  overrides: [
    {
      files: ["*.tsx"],
      rules: {
        "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
      },
    },
  ],
  root: true,
  ignorePatterns: ["build/", "*.test.ts", "*.js"],
  env: {
    browser: true,
    worker: true,
    commonjs: true,
    node: false,
  },
};
