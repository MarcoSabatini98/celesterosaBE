'use strict';

const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'coverage/', 'logs/', 'uploads/'],
  },
  prettier,
];
