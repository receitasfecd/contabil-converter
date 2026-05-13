export interface TaxaAdministracao {
  id: string;
  transferOut?: {
    transferId: string;
    accountNumber: string;
    accountCode: string;
    date: string;
    amount: string;
    historico: string;
  };
  transferIn?: {
    transferId: string;
    accountNumber: string;
    accountCode: string;
    date: string;
    amount: string;
    historico: string;
  };
  status: 'PENDING_OUT' | 'PENDING_IN' | 'PAIRED' | 'PROCESSED';
  grupoContabil?: 'PROJETOS' | 'GRANTS' | 'TERMOS_PARCERIAS' | 'IMPORTACOES';
  contaDespesa?: string; // Código contábil da despesa
  contaReceita?: string; // Código contábil da receita
  pairedAt?: Date;
  processedAt?: Date;
  exported?: boolean; // Se já foi exportada
  exportedAt?: Date; // Data de exportação
}

export interface TaxaAdministracaoStore {
  taxas: TaxaAdministracao[];
}

// Mapeamento de grupos contábeis para contas de despesa
export const GRUPOS_CONTABEIS = {
  PROJETOS: {
    nome: 'Projetos',
    contaDespesa: '', // A definir
    descricao: 'Repasse FECD - Projetos'
  },
  GRANTS: {
    nome: 'Grants',
    contaDespesa: '', // A definir
    descricao: 'Repasse FECD - Grants'
  },
  TERMOS_PARCERIAS: {
    nome: 'Termos e Parcerias',
    contaDespesa: '', // A definir
    descricao: 'Repasse FECD - Termos e Parcerias'
  },
  IMPORTACOES: {
    nome: 'Importações',
    contaDespesa: '', // A definir
    descricao: 'Repasse FECD - Importações',
    contaEspecifica: '128609' // Conta 12860-9
  }
};

// Conta de administração que recebe as taxas
export const CONTA_ADM = '143004'; // 14300-4
