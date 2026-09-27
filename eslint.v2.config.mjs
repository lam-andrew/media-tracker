import js from "./apps/api/node_modules/@eslint/js/src/index.js";
import ts from "./apps/api/node_modules/typescript-eslint/dist/index.js";
export default ts.config(
  { ignores: ["**/node_modules/**", "**/dist/**"] },
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx", "packages/**/*.ts"],
    extends: [js.configs.recommended, ...ts.configs.recommended],
    languageOptions: {
      globals: {
        process: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        localStorage: "readonly",
        document: "readonly",
        RequestInit: "readonly",
        HTMLDialogElement: "readonly",
        HTMLInputElement: "readonly",
        React: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
