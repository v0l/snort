module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "formatjs", "react-refresh"],
  rules: {
    "formatjs/enforce-id": [
      "error",
      {
        idInterpolationPattern: "[sha512:contenthash:base64:6]",
      },
    ],
    "react/react-in-jsx-scope": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-refresh/only-export-components": "warn",
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
