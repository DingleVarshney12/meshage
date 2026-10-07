import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  ...nextVitals,

  {
    files: ["apps/api/**/*.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      next: { rootDir: "apps/web" },
    },
  },

  {
    files: ["apps/web/*.mjs"],
    settings: {
      next: { rootDir: "apps/web" },
    },
    rules: {
      // ESM config files expose their default-exported value to the consuming tool.
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "error",
    },
  },

  {
    files: ["**/*.{spec,test}.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      // Partial dependency mocks in unit tests intentionally model only the used methods.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/next-env.d.ts",
  ]),

  {
    // This legacy rule searches for a Pages Router folder; the web app uses App Router.
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  eslintConfigPrettier,
]);
