type Level = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (import.meta.env.VITE_LOG_LEVEL || 'info').toLowerCase() as Level;
const currentLevel: Level = envLevel in levelPriority ? envLevel : 'info';

function shouldLog(level: Level) {
  return levelPriority[level] >= levelPriority[currentLevel];
}

function fmt(scope: string, message: string) {
  return `[${scope}] ${message}`;
}

export const logger = {
  debug(scope: string, message: string, ...meta: unknown[]) {
    if (!shouldLog('debug')) return;
    console.debug(fmt(scope, message), ...meta);
  },
  info(scope: string, message: string, ...meta: unknown[]) {
    if (!shouldLog('info')) return;
    console.info(fmt(scope, message), ...meta);
  },
  warn(scope: string, message: string, ...meta: unknown[]) {
    if (!shouldLog('warn')) return;
    console.warn(fmt(scope, message), ...meta);
  },
  error(scope: string, message: string, ...meta: unknown[]) {
    if (!shouldLog('error')) return;
    console.error(fmt(scope, message), ...meta);
  },
};
