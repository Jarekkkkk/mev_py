const { addColors, createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        logFormat,
        colorize({ all: true }),
    ),
    transports: [new transports.Console()],
});

module.exports = {
  logger
}
