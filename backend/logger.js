import winston from 'winston';
import 'winston-daily-rotate-file';

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'secret'];

const maskSensitiveData = winston.format((info) => {
  const clone = { ...info };
  if (clone.meta && clone.meta.req && clone.meta.req.body) {
      const body = { ...clone.meta.req.body };
      SENSITIVE_KEYS.forEach(key => {
          if (body[key]) body[key] = '***REDACTED***';
      });
      clone.meta.req.body = body;
  }
  return clone;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    maskSensitiveData(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => {
            return `${info.timestamp} [${info.level}]: ${info.message} ${info.stack || ''}`;
        })
      )
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '90d',
      maxSize: '20m'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '90d',
      maxSize: '20m'
    })
  ]
});

export default logger;
