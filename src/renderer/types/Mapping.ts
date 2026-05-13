export interface Mapping {
  id: string;
  tipo: 'CLASSIFICACAO' | 'CONTA_BANCARIA' | 'PLANO_CONTAS';
}

export interface ClassificacaoMapping extends Mapping {
  tipo: 'CLASSIFICACAO';
  classificacaoFinanceira: string;
  classificacaoContabil: string;
  descricao?: string;
}

export interface ContaBancariaMapping extends Mapping {
  tipo: 'CONTA_BANCARIA';
  numeroConta: string;
  codigoContabil: string;
  descricao?: string;
  tipoAplicacao?: 'A' | 'A2' | 'A3' | null;
  banco?: 'BB' | 'ITAU' | null;
  categoria?: 'ADMINISTRACAO' | 'PROJETOS' | 'GRANTS' | 'TERMOS_PARCERIAS' | 'IMPORTACAO';
}

export interface PlanoContasItem extends Mapping {
  tipo: 'PLANO_CONTAS';
  codigo: string;
  nome: string;
  idInterno?: string;
  nivel: number;
}

export type AnyMapping = ClassificacaoMapping | ContaBancariaMapping | PlanoContasItem;

export interface AppStore {
  classificacoes: ClassificacaoMapping[];
  contasBancarias: ContaBancariaMapping[];
  planoContas: PlanoContasItem[];
  lastExportPath: string;
  preferences: {
    autoSave: boolean;
    validateOnImport: boolean;
  };
}
