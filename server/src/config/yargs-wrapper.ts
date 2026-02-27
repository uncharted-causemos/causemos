import yargs from 'yargs';

const argv = yargs
  .option('log-level', {
    describe: 'Logging level',
    choices: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'] as const,
    default: 'info',
  })
  .options('cache-size', {
    describe: 'Size of the LRU cache',
    default: 5000,
  })
  .options('morgan-format', {
    describe: 'Predefined morgan middleware format - this is an opt-in argument',
    choices: ['common', 'dev', 'combined', 'short', 'tiny'] as const,
    default: undefined,
  })
  .options('schedules', {
    describe: 'Defines a listing of comma delimited scheduled tasks from {dart, aligner} ',
    default: '',
  })
  .options('dojo-sync', {
    describe: 'Should metadata changes be sent to Dojo?',
    type: 'boolean',
    default: false,
  })
  .options('allow-model-runs', {
    describe: 'Should model runs be sent to Dojo for execution?',
    type: 'boolean',
    default: false,
  })
  .parseSync();

export default argv;
