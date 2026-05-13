// Sistema de log configurável
const DEBUG_MODE = false; // Mude para true para ver logs detalhados

export function debugLog(message: string, ...args: any[]): void {
  if (DEBUG_MODE) {
    console.log(message, ...args);
  }
}

export function infoLog(message: string, ...args: any[]): void {
  console.log(message, ...args);
}

export function errorLog(message: string, ...args: any[]): void {
  console.error(message, ...args);
}

export function warnLog(message: string, ...args: any[]): void {
  console.warn(message, ...args);
}
