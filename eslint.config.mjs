import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    // External read-only research clones; see AGENTS.md.
    ignores: ["archived/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // TypeScript tracks unused vars itself; keep the argsIgnorePattern
      // convention so deliberately-ignored params (e.g. `_`) stay legal.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // `catch {}` is idiomatic for expected errors in tests.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
