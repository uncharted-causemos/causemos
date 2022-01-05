module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/standard',
    '@vue/typescript/recommended',
  ],
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    "@typescript-eslint/ban-ts-ignore": "warn",

    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    'no-unused-vars': 'off',
    // This rule extends and replaces `eslint-no-unused-vars` to add support for
    //  TypeScript features, such as types
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^h$' }],

    'quote-props': ['error', 'consistent-as-needed'],

    // Turn off pure stylistic rules
    'space-before-function-paren': 'off',
    'no-multiple-empty-lines': 'off',
    'vue/html-closing-bracket-newline': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/component-name-in-template-casing': 'off',
    '@typescript-eslint/camelcase': 'off',
    // Enforce semicolon
    'semi': [2, 'always'],
    'no-extra-semi': 2
  },
  globals: {
    d3: true
  }
};
