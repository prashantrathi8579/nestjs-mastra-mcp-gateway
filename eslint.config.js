const globals = require('globals');
const pluginJs = require('@eslint/js');
const nPlugin = require('eslint-plugin-n');
const tseslint = require('typescript-eslint');
const unicorn = require('eslint-plugin-unicorn');

const recommendedPlugins = [pluginJs.configs.recommended, ...tseslint.configs.recommended];

const allowedFiles = ['src/**/*.ts'];
const ignoredFiles = ['dist/*.js', 'node_modules/*'];

module.exports = [
  ...recommendedPlugins,
  {
    files: allowedFiles,
    ignores: ignoredFiles,

    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      n: nPlugin,
      unicorn: unicorn,
    },

    rules: {
      'n/callback-return': ['error', ['callback', 'done', 'res.end', 'res.send', 'res.status', 'next']],
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'warn',
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],
    },
  },
];
