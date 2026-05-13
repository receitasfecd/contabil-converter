export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatCurrency(value: number): string {
  // Formato brasileiro: 1.500,00 (sem R$)
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseExcelDate(excelDate: any): Date {
  // Se já é uma data
  if (excelDate instanceof Date) {
    return excelDate;
  }

  // Se é um número serial do Excel
  if (typeof excelDate === 'number') {
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
  }

  // Se é string, tentar parsear
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error(`Formato de data inválido: ${excelDate}`);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Formatar número da conta com dígito verificador
// Ex: 107891 -> 10789-1
export function formatAccountNumber(numeroConta: string): string {
  if (!numeroConta || numeroConta.length < 2) return numeroConta;

  // Se já tem hífen, retornar como está
  if (numeroConta.includes('-')) return numeroConta;

  // Adicionar hífen antes do último dígito
  const base = numeroConta.slice(0, -1);
  const digito = numeroConta.slice(-1);

  return `${base}-${digito}`;
}
