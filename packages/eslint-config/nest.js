// NestJS: decorators and DI need class-based patterns that strict rules flag.
import tseslint from 'typescript-eslint';
import base from './base.js';

export default tseslint.config(...base, {
  rules: {
    '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    // NestJS injects via constructor parameter types, so these imports are used at runtime.
    '@typescript-eslint/consistent-type-imports': 'off',
  },
});
