export interface ExcelEntry {
  data: Date;
  documento: string;
  historico: string;
  status: string;
  classificacaoFinanceira: string;
  codigoCentroCusto: string;
  valorDebito: number | null;
  valorCredito: number | null;
  saldo: number;
  simbolo: 'D' | 'C';
}

export interface ProcessedEntry {
  id: string;
  data: string; // dd/mm/aaaa
  debito: string;
  credito: string;
  centroCusto: string;
  historico: string;
  valor: string; // formato BR sem R$
  tipo: 'FINANCEIRO' | 'TRANSFERENCIA';
  original: ExcelEntry;
  warnings?: string[];
  errors?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
