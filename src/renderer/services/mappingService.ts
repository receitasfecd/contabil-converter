import { ClassificacaoMapping, ContaBancariaMapping, PlanoContasItem, AppStore } from '../types/Mapping';
import { generateId } from '../utils/formatters';

// Simulação de persistência (será substituído por electron-store no main process)
class MappingService {
  private store: AppStore = {
    classificacoes: [],
    contasBancarias: [],
    planoContas: [],
    lastExportPath: '',
    preferences: {
      autoSave: true,
      validateOnImport: true,
    },
  };

  constructor() {
    this.loadFromLocalStorage();
  }

  // Classificações
  getClassificacoes(): ClassificacaoMapping[] {
    return this.store.classificacoes;
  }

  addClassificacao(classificacao: Omit<ClassificacaoMapping, 'id' | 'tipo'>): ClassificacaoMapping {
    const newClassificacao: ClassificacaoMapping = {
      id: generateId(),
      tipo: 'CLASSIFICACAO',
      ...classificacao,
    };
    this.store.classificacoes.push(newClassificacao);
    this.saveToLocalStorage();
    return newClassificacao;
  }

  updateClassificacao(id: string, updates: Partial<ClassificacaoMapping>): void {
    const index = this.store.classificacoes.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.store.classificacoes[index] = {
        ...this.store.classificacoes[index],
        ...updates,
      };
      this.saveToLocalStorage();
    }
  }

  deleteClassificacao(id: string): void {
    this.store.classificacoes = this.store.classificacoes.filter((c) => c.id !== id);
    this.saveToLocalStorage();
  }

  // Contas Bancárias
  getContasBancarias(): ContaBancariaMapping[] {
    return this.store.contasBancarias;
  }

  addContaBancaria(conta: Omit<ContaBancariaMapping, 'id' | 'tipo'>): ContaBancariaMapping {
    const newConta: ContaBancariaMapping = {
      id: generateId(),
      tipo: 'CONTA_BANCARIA',
      ...conta,
    };
    this.store.contasBancarias.push(newConta);
    this.saveToLocalStorage();
    return newConta;
  }

  updateContaBancaria(id: string, updates: Partial<ContaBancariaMapping>): void {
    const index = this.store.contasBancarias.findIndex((c) => c.id === id);
    if (index !== -1) {
      const conta = this.store.contasBancarias[index];

      this.store.contasBancarias[index] = {
        ...conta,
        ...updates,
      };

      // Se está atualizando o banco e a conta não tem tipoAplicacao (é conta corrente)
      if (updates.banco && !conta.tipoAplicacao) {
        // Encontrar todas as aplicações relacionadas (mesmo numeroConta)
        const aplicacoesRelacionadas = this.store.contasBancarias.filter(
          (c) => c.numeroConta === conta.numeroConta && c.tipoAplicacao && c.id !== id
        );

        // Atualizar o banco de todas as aplicações relacionadas
        aplicacoesRelacionadas.forEach((aplicacao) => {
          const appIndex = this.store.contasBancarias.findIndex((c) => c.id === aplicacao.id);
          if (appIndex !== -1) {
            this.store.contasBancarias[appIndex] = {
              ...this.store.contasBancarias[appIndex],
              banco: updates.banco,
            };
          }
        });

        if (aplicacoesRelacionadas.length > 0) {
          console.log(`✅ Banco atualizado para ${aplicacoesRelacionadas.length} aplicação(ões) relacionada(s)`);
        }
      }

      this.saveToLocalStorage();
    }
  }

  deleteContaBancaria(id: string): void {
    this.store.contasBancarias = this.store.contasBancarias.filter((c) => c.id !== id);
    this.saveToLocalStorage();
  }

  findContaBancaria(numeroConta: string): ContaBancariaMapping | undefined {
    return this.store.contasBancarias.find((c) => c.numeroConta === numeroConta);
  }

  // Encontrar conta pelo número com dígito (ex: 10789-1 -> 107891)
  findContaBancariaByNumeroComDigito(numeroComDigito: string): ContaBancariaMapping | undefined {
    // Remover hífen e espaços
    const numeroLimpo = numeroComDigito.replace(/[-\s]/g, '');

    // Tentar encontrar correspondência exata
    let conta = this.store.contasBancarias.find((c) => c.numeroConta === numeroLimpo);

    if (conta) return conta;

    // Se não encontrou, tentar sem o último dígito (caso seja dígito verificador)
    if (numeroLimpo.length > 1) {
      const semDigito = numeroLimpo.slice(0, -1);
      conta = this.store.contasBancarias.find((c) => c.numeroConta === semDigito);
    }

    return conta;
  }

  // Sugerir conta baseada no nome do arquivo
  suggestContaFromFilename(filename: string): ContaBancariaMapping | null {
    // Extrair número da conta do nome do arquivo
    // Padrões: 12345-6.xlsx, 12345-6A.xlsx, 107891.xlsx, etc.

    // Remover extensão
    const nomeBase = filename.replace(/\.(xlsx?|csv)$/i, '');

    // Procurar padrão: números seguidos opcionalmente por hífen, dígito e letra
    const patterns = [
      /(\d{5,6})-(\d)([A-Z]\d?)?/i,  // 12345-6A, 12345-6A2, 12345-6
      /(\d{6})([A-Z]\d?)?/i,          // 107891A, 107891A2, 107891
    ];

    for (const pattern of patterns) {
      const match = nomeBase.match(pattern);
      if (match) {
        const numeroBase = match[1];
        const digito = match[2] || '';
        const tipoAplicacao = match[3] || '';

        // Montar número completo (sem hífen)
        const numeroConta = numeroBase + digito;

        // Procurar conta
        const conta = this.store.contasBancarias.find((c) => {
          // Verificar se o número bate
          if (c.numeroConta !== numeroConta) return false;

          // Se tem tipo de aplicação no nome do arquivo, verificar se bate
          if (tipoAplicacao) {
            const tipoArquivo = tipoAplicacao.toUpperCase();
            return c.tipoAplicacao === tipoArquivo;
          }

          // Se não tem tipo no arquivo, preferir conta corrente (sem tipoAplicacao)
          return !c.tipoAplicacao;
        });

        if (conta) return conta;
      }
    }

    return null;
  }

  // Plano de Contas
  getPlanoContas(): PlanoContasItem[] {
    return this.store.planoContas;
  }

  addPlanoContasItem(item: Omit<PlanoContasItem, 'id' | 'tipo'>): PlanoContasItem {
    const newItem: PlanoContasItem = {
      id: generateId(),
      tipo: 'PLANO_CONTAS',
      ...item,
    };
    this.store.planoContas.push(newItem);
    this.saveToLocalStorage();
    return newItem;
  }

  updatePlanoContasItem(id: string, updates: Partial<PlanoContasItem>): void {
    const index = this.store.planoContas.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.store.planoContas[index] = {
        ...this.store.planoContas[index],
        ...updates,
      };
      this.saveToLocalStorage();
    }
  }

  deletePlanoContasItem(id: string): void {
    this.store.planoContas = this.store.planoContas.filter((c) => c.id !== id);
    this.saveToLocalStorage();
  }

  findPlanoContasByCodigo(codigo: string): PlanoContasItem | undefined {
    return this.store.planoContas.find((c) => c.codigo === codigo);
  }

  // Buscar nome da conta contábil no plano de contas
  getNomeContaContabil(codigoContabil: string): string | undefined {
    const conta = this.store.planoContas.find((c) => c.codigo === codigoContabil);
    return conta?.nome;
  }

  // Import/Export
  exportMappings(): string {
    return JSON.stringify(this.store, null, 2);
  }

  importMappings(jsonData: string): void {
    try {
      const imported = JSON.parse(jsonData) as Partial<AppStore>;

      // Mesclar dados importados com dados existentes
      if (imported.classificacoes) {
        this.store.classificacoes = imported.classificacoes;
      }
      if (imported.contasBancarias) {
        this.store.contasBancarias = imported.contasBancarias;
      }
      if (imported.planoContas) {
        this.store.planoContas = imported.planoContas;
      }
      if (imported.preferences) {
        this.store.preferences = imported.preferences;
      }

      this.saveToLocalStorage();
    } catch (error) {
      throw new Error('Formato de arquivo inválido');
    }
  }

  // Persistência
  private saveToLocalStorage(): void {
    localStorage.setItem('contabil-converter-store', JSON.stringify(this.store));
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('contabil-converter-store');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AppStore>;
        this.store = {
          classificacoes: parsed.classificacoes || [],
          contasBancarias: parsed.contasBancarias || [],
          planoContas: parsed.planoContas || [],
          lastExportPath: parsed.lastExportPath || '',
          preferences: parsed.preferences || {
            autoSave: true,
            validateOnImport: true,
          },
        };
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    }
  }

  // Preferences
  getPreferences() {
    return this.store.preferences;
  }

  updatePreferences(preferences: Partial<AppStore['preferences']>): void {
    this.store.preferences = {
      ...this.store.preferences,
      ...preferences,
    };
    this.saveToLocalStorage();
  }
}

export const mappingService = new MappingService();
