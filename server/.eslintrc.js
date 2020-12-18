module.exports = {
  "extends": "standard",
  "env": {
    "node": true,
    "mocha": true
  },
  rules: {
    'quote-props': ['error', 'consistent-as-needed'],
     // Turn off pure stylistic rules
    'space-before-function-paren': 'off',
    'no-multiple-empty-lines': 'off',
    // Enforce semicolon
    'semi': [2, 'always'],
    'no-extra-semi': 2,
    'camelcase': ["error", {ignoreDestructuring: true, properties: 'never'}]
  },
  globals: {
    'rootRequire': true
  }
};
