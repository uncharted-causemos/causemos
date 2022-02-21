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
  .options('morgan-format', {
    describe: 'Predefined morgan middleware format - this is an opt-in argument',
    choices: ['common', 'dev', 'combined', 'short', 'tiny'],
    default: undefined
  })
  .options('schedules', {
    describe: 'Defines a listing of comma delimited scheduled tasks from {dart, aligner} ',
    default: ''
  })
  .argv;
