// Next.js + React: accessibility and "no hard-coded UI text" are enforced here.
import nextPlugin from '@next/eslint-plugin-next';
import i18next from 'eslint-plugin-i18next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import base from './base.js';

export default tseslint.config(
  ...base,
  {
    files: ['**/*.tsx', '**/*.ts'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': nextPlugin,
      i18next,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Every user-facing string must come from messages/{ar,he,en}.json.
      'i18next/no-literal-string': ['error', { mode: 'jsx-only' }],
      // XSS: raw HTML only through a reviewed, sanitised helper.
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': ['error', { enforceDynamicLinks: 'always' }],
      'react/prop-types': 'off',
    },
  },
  {
    files: ['**/*.test.tsx', '**/e2e/**'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
);
