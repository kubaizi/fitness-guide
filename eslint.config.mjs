import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { rtlRules } from "./eslint.rtl.mjs";

/**
 * Flat config — the modern ESLint format. One file for the whole monorepo.
 *
 * The rules that matter most here are the last block: they make the two
 * expensive-to-retrofit decisions (RTL and integer money) enforceable by the
 * build rather than by remembering.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "preview.html",
      "apps/web/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // `import type` where possible — makes it obvious what disappears at
      // compile time, which matters when types are erased at runtime.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],

      // `any` defeats the entire point of TypeScript. Warn, don't block.
      "@typescript-eslint/no-explicit-any": "warn",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // ─── The RTL rule ────────────────────────────────────────────────────
      // Physical directions do not mirror in Arabic. Logical ones do.
      ...rtlRules,
    },
  },

  // Money must not be built out of floating-point literals. This catches the
  // most common slip — writing a price as a decimal instead of parsing it.
  {
    files: ["packages/**/*.ts", "apps/**/*.ts", "apps/**/*.tsx"],
    ignores: ["**/*.test.ts", "packages/core/src/money.ts", "scripts/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "round",
          message:
            "Rounding money by hand loses fils. Use the helpers in @fg/core instead.",
        },
      ],
    },
  },

  // Test files and build scripts get a longer leash.
  {
    files: ["**/*.test.ts", "scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-restricted-syntax": "off",
    },
  },

  // Must stay last — turns off every rule that would fight Prettier.
  prettier,
);
