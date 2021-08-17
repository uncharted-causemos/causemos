const { createLogger, format, transports } = require('winston');
// const fs = require('fs');
const argv = require('./yargs-wrapper');
const loglevel = (argv.logLevel || 'info').toLowerCase();

// ensure the logs directory exists or nothing will be logged to the file.
// const logDir = 'logs';
// if (!fs.existsSync(logDir)) {
//   fs.mkdirSync(logDir);
// }

// Configure the default logger
// let appLogger = new winston.Logger({});
// const myFormat = format.printf(info => `${info.timestamp} [${info.level}]: ${decodeURIComponent(info.message)}`);
const myFormat = format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`);

const appLogger = createLogger({
  level: loglevel,
  format: format.combine(
    format.timestamp(),
    myFormat
  )
});

appLogger.add(new transports.Console({
  timestamp: true,
  colorize: true,
  prettyPrint: true,
  level: loglevel
}));

// log to file as well as console.
// appLogger.add(new transports.File({
//   timestamp: true,
//   filename: logDir + '/server.log',
//   json: false,
//   prettyPrint: true,
//   zippedArchive: true,
//   level: loglevel
// }));


module.exports = appLogger;
