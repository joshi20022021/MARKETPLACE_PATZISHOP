import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.test-dist/**',
      '**/generated/**',
      '**/uploads/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
