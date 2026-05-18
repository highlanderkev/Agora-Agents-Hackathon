import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';

export default [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        fetch: 'readonly',
        Response: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'react/jsx-uses-vars': 'error',
    },
  },
];
