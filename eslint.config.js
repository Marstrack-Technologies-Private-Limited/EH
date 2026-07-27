import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // The crash-catcher. `vite build` does no scope analysis, so an undeclared
      // identifier compiles fine and only blows up at runtime in the browser.
      "no-undef": "error",

      // Components referenced only inside JSX still count as used.
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",

      "no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" },
      ],

      // The react-compiler-backed hook rules are advisory here: they flag
      // load-on-mount effects and event-handler Date.now() calls that are
      // intentional. Kept visible as warnings so `lint` fails on real breakage.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/component-hook-factories": "warn",
      // `const Icon = categoryIcon(...)` looks like a component factory but is a
      // lookup into a fixed map of lucide icons, so the identity is stable.
      "react-hooks/static-components": "warn",
      "react-refresh/only-export-components": "off",
    },
  },
];
