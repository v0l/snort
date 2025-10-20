import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    rules: {},
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    ignores: ["build/", "*.test.ts", "*.js"],
  },
]);
