import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: [".next/**", ".pnpm-store/**", ".tools/**", "node_modules/**"],
  },
  ...compat.extends("next/core-web-vitals"),
];

export default config;
