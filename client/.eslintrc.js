module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/recommended',
    '@vue/standard'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

    'no-unused-vars': ['error', { varsIgnorePattern: '^h$' }],
    'quote-props': ['error', 'consistent-as-needed'],

    // Turn off pure stylistic rules
    'space-before-function-paren': 'off',
    'no-multiple-empty-lines': 'off',
    'vue/html-closing-bracket-newline': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/component-name-in-template-casing': 'off',
    // Enforce semicolon
    'semi': [2, 'always'],
    'no-extra-semi': 2
  },
  parserOptions: {
    parser: 'babel-eslint'
  },
  plugins: ["@vue"],
  globals: {
    d3: true
  }
};
