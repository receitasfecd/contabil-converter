// Sistema de logging para arquivo
// Os logs são salvos em localStorage e podem ser exportados

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
}

class LogService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Manter últimos 1000 logs
  private storageKey = 'app-logs';

  constructor() {
    this.loadLogs();
    // Interceptar console.log, console.error, etc
    this.interceptConsole();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  }

  private saveLogs() {
    try {
      // Manter apenas os últimos maxLogs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Erro ao salvar logs:', error);
    }
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      this.log('info', 'console', args.join(' '), args.length > 1 ? args : undefined);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.log('error', 'console', args.join(' '), args.length > 1 ? args : undefined);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.log('warn', 'console', args.join(' '), args.length > 1 ? args : undefined);
      originalWarn.apply(console, args);
    };
  }

  log(level: LogEntry['level'], category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);
    this.saveLogs();
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  getLogs(filter?: { level?: string; category?: string; since?: Date }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter?.category) {
      filtered = filtered.filter(log => log.category === filter.category);
    }

    if (filter?.since) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.since!);
    }

    return filtered;
  }

  getRecentErrors(minutes: number = 5): LogEntry[] {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.getLogs({ level: 'error', since });
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  exportLogsAsText(): string {
    return this.logs.map(log => {
      const data = log.data ? `\n  Data: ${JSON.stringify(log.data)}` : '';
      return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${data}`;
    }).join('\n');
  }

  downloadLogs() {
    const text = this.exportLogsAsText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
  }
}

export const logService = new LogService();
