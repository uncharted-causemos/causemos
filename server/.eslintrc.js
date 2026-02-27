module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: {
    node: true,
    mocha: true,
    es2020: true,
  },
  rules: {
    // Use TypeScript variant; ignore args/vars prefixed with _
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Allow snake_case identifiers that come from external API contracts (query params, ES fields, etc.)
    camelcase: [
      'error',
      { ignoreDestructuring: true, properties: 'never', allow: ['[a-z]+_[a-z_]+'] },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },
};
