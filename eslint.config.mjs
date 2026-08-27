import js from "@eslint/js";
import globals from "globals";

export default [
  {
    // External read-only research clones; see AGENTS.md.
    ignores: ["archived/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // `catch {}` is idiomatic for expected errors in tests.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
