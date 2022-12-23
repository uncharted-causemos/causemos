module.exports = {
  extends: [
    'standard',
    'prettier'
  ],
  env: {
    node: true,
    mocha: true
  },
  rules: {
    'camelcase': ['error', { ignoreDestructuring: true, properties: 'never' }]
  },
  globals: {
    rootRequire: true
  }
}
