const isDev = import.meta.env.MODE === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  }
};
