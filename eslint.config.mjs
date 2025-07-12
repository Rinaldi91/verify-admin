import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Tambahkan objek konfigurasi baru untuk aturan kustom
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn", // Atau "error" jika Anda ingin itu menjadi error yang menghentikan kompilasi
        {
          argsIgnorePattern: "^_", // Abaikan argumen fungsi yang dimulai dengan '_'
          varsIgnorePattern: "^_", // Abaikan variabel yang dimulai dengan '_'
          caughtErrorsIgnorePattern: "^_", // Abaikan kesalahan yang ditangkap di blok catch yang dimulai dengan '_'
        },
      ],
    },
  },
];

export default eslintConfig;