export type CategoriaContaBancaria =
  | 'ADMINISTRACAO'
  | 'PROJETOS'
  | 'GRANTS'
  | 'TERMOS_PARCERIAS'
  | 'IMPORTACAO';

export interface TaxaAdministracaoConfig {
  // Configurações de Despesa (saída do dinheiro)
  despesa: {
    PROJETOS: {
      debito: string;        // 21504020 - PARTICIPAÇÃO FECD- PROJETOS
      descricaoDebito: string;
    };
    GRANTS: {
      debito: string;        // 21704020 - PARTICIPAÇÃO FECD - GRANTS
      descricaoDebito: string;
    };
    TERMOS_PARCERIAS: {
      debito: string;        // 21704020 - PARTICIPAÇÃO FECD - GRANTS
      descricaoDebito: string;
    };
    IMPORTACAO: {
      debito: string;        // 21104002 - IMPORTACAO/OPERAÇÃO DE CÂMBIO
      descricaoDebito: string;
      credito: string;       // 11010102 - BANCO ITAÚ C/C 12.860-9 - IMPORTACAO
      descricaoCredito: string;
    };
  };

  // Configurações de Receita (entrada na administração)
  receita: {
    contaDebito: string;     // 11010103 - BANCO ITAU C/C 14.300-4 - ADMINISTRACAO
    descricaoDebito: string;
    categorias: {
      PROJETOS: {
        credito: string;     // 35001006 - TAXA DE ADMINISTRACAO DE PROJETOS - FUNDACAO
        descricaoCredito: string;
      };
      GRANTS: {
        credito: string;     // 35001005 - TAXA DE ADMINISTRACAO DE GRANTS - FUNDACAO
        descricaoCredito: string;
      };
      TERMOS_PARCERIAS: {
        credito: string;     // 35001009 - TAXA DE ADMINISTRACAO DE TERMOS E PARCERIAS - FUNDACAO
        descricaoCredito: string;
      };
      IMPORTACAO: {
        credito: string;     // 35001003 - RECEITAS COM IMPORTACAO - FUNDACAO
        descricaoCredito: string;
      };
    };
  };

  // Classificações Financeiras que identificam Taxas de Administração
  classificacoesIdentificadoras: {
    PROJETOS: string[];
    GRANTS: string[];
    TERMOS_PARCERIAS: string[];
    IMPORTACAO: string[];
  };
}

// Configuração padrão
export const DEFAULT_TAXA_CONFIG: TaxaAdministracaoConfig = {
  classificacoesIdentificadoras: {
    PROJETOS: ['PROJ002.1.4.01.99'],
    GRANTS: ['GRANT002.1.4.01.99'],
    TERMOS_PARCERIAS: ['TEP002.1.4.01.99'],
    IMPORTACAO: ['IMP004.19']
  },
  despesa: {
    PROJETOS: {
      debito: '21504020',
      descricaoDebito: 'PARTICIPAÇÃO FECD- PROJETOS'
    },
    GRANTS: {
      debito: '21704020',
      descricaoDebito: 'PARTICIPAÇÃO FECD - GRANTS'
    },
    TERMOS_PARCERIAS: {
      debito: '21704020',
      descricaoDebito: 'PARTICIPAÇÃO FECD - GRANTS'
    },
    IMPORTACAO: {
      debito: '21104002',
      descricaoDebito: 'IMPORTACAO/OPERAÇÃO DE CÂMBIO',
      credito: '11010102',
      descricaoCredito: 'BANCO ITAÚ C/C 12.860-9 - IMPORTACAO'
    }
  },
  receita: {
    contaDebito: '11010103',
    descricaoDebito: 'BANCO ITAU C/C 14.300-4 - ADMINISTRACAO',
    categorias: {
      PROJETOS: {
        credito: '35001006',
        descricaoCredito: 'TAXA DE ADMINISTRACAO DE PROJETOS - FUNDACAO'
      },
      GRANTS: {
        credito: '35001005',
        descricaoCredito: 'TAXA DE ADMINISTRACAO DE GRANTS - FUNDACAO'
      },
      TERMOS_PARCERIAS: {
        credito: '35001009',
        descricaoCredito: 'TAXA DE ADMINISTRACAO DE TERMOS E PARCERIAS - FUNDACAO'
      },
      IMPORTACAO: {
        credito: '35001003',
        descricaoCredito: 'RECEITAS COM IMPORTACAO - FUNDACAO'
      }
    }
  }
};
