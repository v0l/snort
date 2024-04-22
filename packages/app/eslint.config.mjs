/* eslint-disable import/no-anonymous-default-export */
export default [
  {
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
    ],
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "formatjs", "react-refresh", "simple-import-sort"],
    rules: {
      "formatjs/enforce-id": [
        "error",
        {
          idInterpolationPattern: "[sha512:contenthash:base64:6]",
        },
      ],
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
    ignores: ["build/", "*.test.ts", "*.js"],
    env: {
      browser: true,
      worker: true,
      commonjs: true,
      node: false,
    },
  },
];
