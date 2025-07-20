/**
 * Conditional logging utility for development vs production
 * Replaces console.log statements that affect production performance
 */

const isDev = __DEV__;

export const logger = {
  log: isDev ? console.log : () => {},
  warn: isDev ? console.warn : () => {},
  error: console.error, // Always log errors, even in production
  info: isDev ? console.info : () => {},
  debug: isDev ? console.debug : () => {},
};

// Convenience function for common debug logging
export const debugLog = isDev ? console.log : () => {};

// Specific loggers for different modules
export const dashboardLogger = {
  log: isDev ? (message: string, ...args: any[]) => console.log(`[Dashboard] ${message}`, ...args) : () => {},
  error: (message: string, ...args: any[]) => console.error(`[Dashboard] ${message}`, ...args),
};

export const hookLogger = {
  log: isDev ? (hook: string, message: string, ...args: any[]) => console.log(`[${hook}] ${message}`, ...args) : () => {},
  error: (hook: string, message: string, ...args: any[]) => console.error(`[${hook}] ${message}`, ...args),
};

export const dbLogger = {
  log: isDev ? (message: string, ...args: any[]) => console.log(`[DB] ${message}`, ...args) : () => {},
  error: (message: string, ...args: any[]) => console.error(`[DB] ${message}`, ...args),
};