module.exports = {
  root: true,

  env: {
    node: true
  },

  extends: [
    'plugin:vue/vue3-essential',
    '@vue/standard',
    '@vue/typescript/recommended',
    'prettier'
  ],

  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',

    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

    'no-unused-vars': 'off',
    // This rule extends and replaces `eslint-no-unused-vars` to add support for
    //  TypeScript features, such as types
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],

    // Annoying vue default
    'vue/require-valid-default-prop': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/no-useless-template-attributes': 'off', // FIXME: might want to address
    '@typescript-eslint/ban-types': 'off', // FIXME: might want to address

    camelcase: 'off',
    'prefer-regex-literals': 'off'
  },

  globals: {
    d3: true
  },

  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  }
};
