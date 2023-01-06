const { createLogger, format, transports } = require('winston');
const argv = require('./yargs-wrapper');
const loglevel = (argv.logLevel || 'info').toLowerCase();

// Configure the default logger
// let appLogger = new winston.Logger({});
// const myFormat = format.printf(info => `${info.timestamp} [${info.level}]: ${decodeURIComponent(info.message)}`);
const myFormat = format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`);

const appLogger = createLogger({
  level: loglevel,
  format: format.combine(format.timestamp(), myFormat),
});

appLogger.add(
  new transports.Console({
    timestamp: true,
    colorize: true,
    prettyPrint: true,
    level: loglevel,
  })
);

module.exports = appLogger;
