export class AppLogger {
  static format(level: string, message: string, meta: Record<string, any> = {}) {
    return { timestamp: new Date().toISOString(), level, message, ...meta };
  }
  static info(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify(this.format('INFO', message, meta)));
  }
  static warn(message: string, meta?: Record<string, any>) {
    console.warn(JSON.stringify(this.format('WARN', message, meta)));
  }
  static error(message: string, error?: any, meta?: Record<string, any>) {
    const errorDetails = error ? { error: error.message || String(error), stack: error.stack } : {};
    console.error(JSON.stringify(this.format('ERROR', message, { ...meta, ...errorDetails })));
  }
}
