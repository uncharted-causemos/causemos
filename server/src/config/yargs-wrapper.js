module.exports = require('yargs')
  .option('log-level', {
    describe: 'Logging level',
    choices: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
    default: 'info'
  })
  .options('cache-size', {
    describe: 'Size of the LRU cache',
    default: 5000
  })
  .argv;
