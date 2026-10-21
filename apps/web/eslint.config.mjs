import next from '@eta/eslint-config/next';

// e2e/mock-api.mjs is a plain Node script outside the TypeScript project.
export default [{ ignores: ['e2e/*.mjs'] }, ...next];
