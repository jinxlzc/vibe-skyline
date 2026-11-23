import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["**/*.test.ts"],
    files: [
      "apps/web/src/**/*.{ts,tsx}",
      "packages/{contracts,core,adapters-core,registry,geometry,logos}/src/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "node:*",
            "@vibeskyline/adapters-node",
            "**/adapters-node/**",
          ],
        },
      ],
    },
  },
);
