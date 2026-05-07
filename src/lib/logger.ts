export const logger = {
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, context);
  },
};
