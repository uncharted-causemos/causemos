import { createLogger, format, transports } from 'winston';
import argv from './yargs-wrapper';

const loglevel = ((argv as any).logLevel || 'info').toLowerCase();

const myFormat = format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`);

const appLogger = createLogger({
  level: loglevel,
  format: format.combine(format.timestamp(), myFormat),
});

appLogger.add(
  new transports.Console({
    level: loglevel,
  })
);

export default appLogger;
