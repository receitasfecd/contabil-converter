import { TaxaAdministracao, TaxaAdministracaoStore, CONTA_ADM, GRUPOS_CONTABEIS } from '../types/TaxaAdministracao';
import { Transfer } from '../types/Transfer';
import { mappingService } from './mappingService';
import { loadTaxaConfig } from './taxaConfigService';
import { loadTransferStore } from './transferStore';
import { saveTaxaToSupabase } from './supabaseTaxaService';

const STORAGE_KEY = 'taxas-administracao-store';

let currentStore: TaxaAdministracaoStore = { taxas: [] };

export function loadTaxasAdministracao(): TaxaAdministracaoStore {
  // Se já temos em memória, retornar. Útil para chamadas síncronas após o AppContext carregar.
  if (currentStore.taxas.length > 0) return currentStore;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        taxas: parsed.taxas.map((taxa: any) => ({
          ...taxa,
          pairedAt: taxa.pairedAt ? new Date(taxa.pairedAt) : undefined,
          processedAt: taxa.processedAt ? new Date(taxa.processedAt) : undefined,
        })),
      };
    }
  } catch (error) {
    console.error('Erro ao carregar taxas de administração:', error);
  }

  return { taxas: [] };
}

// Para ser usado pelo AppContext para injetar os dados do Supabase
export function setTaxasStore(store: TaxaAdministracaoStore): void {
  currentStore = store;
}

export function saveTaxasAdministracao(store: TaxaAdministracaoStore): void {
  currentStore = store;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error('Erro ao salvar taxas de administração:', error);
  }
}

// Identificar se uma transferência é taxa de administração
export function isTaxaAdministracao(transfer: Transfer): boolean {
  const historico = transfer.historico.toLowerCase();
  const config = loadTaxaConfig();

  console.log(`🔍 Verificando se é taxa: "${transfer.historico}" (Conta: ${transfer.accountNumber}, Valor: ${transfer.amount})`);

  // Verificar palavras-chave no histórico
  const keywords = [
    'taxa adm',
    'taxa de adm',
    'tx. adm',
    'tx.adm',
    'tx adm',
    'txadm',
    'taxa de administração',
    'taxa de administracao',
    'taxa administrativa',
    'tx administrativa',
    'tx. administrativa',
    'repasse taxa',
    'repasse de taxa'
  ];
  const hasTaxaKeyword = keywords.some(keyword => historico.includes(keyword));

  // Se for entrada na conta ADM (14300-4), ser mais inclusivo
  const isAdmIn = transfer.direction === 'IN' &&
                  (transfer.accountNumber === CONTA_ADM || transfer.accountNumber === CONTA_ADM.replace('-', ''));

  if (isAdmIn && !hasTaxaKeyword) {
     // Na conta ADM, entradas que mencionam projetos costumam ser taxas
     const projectKeywords = ['proj', 'grant', 'tep', 'imp'];
     if (projectKeywords.some(pk => historico.includes(pk))) {
        return true;
     }
  }

  // Verificar classificação financeira (se disponível no transfer)
  const classificacao = (transfer as any).original?.classificacaoFinanceira;
  let hasClassificacaoTaxa = false;

  if (classificacao) {
    // Normalizar: remover espaços e converter para maiúsculas
    const classifUpper = classificacao.toUpperCase().replace(/\s+/g, '');

    // Todas as classificações identificadoras configuradas
    const allIdentificadoras = [
      ...config.classificacoesIdentificadoras.PROJETOS,
      ...config.classificacoesIdentificadoras.GRANTS,
      ...config.classificacoesIdentificadoras.TERMOS_PARCERIAS,
      ...config.classificacoesIdentificadoras.IMPORTACAO
    ].map(c => c.toUpperCase().replace(/\s+/g, ''));

    hasClassificacaoTaxa = allIdentificadoras.some(ident => classifUpper.includes(ident)) ||
      classifUpper.startsWith('FECD001.1.4') ||
      classifUpper.startsWith('FECD001.1.5');

    if (hasClassificacaoTaxa) {
      console.log(`  ✅ Identificada por classificação financeira: ${classificacao}`);
    }
  }

  if (hasTaxaKeyword) {
    console.log(`  ✅ Identificada por palavra-chave no histórico`);
  }

  return hasTaxaKeyword || hasClassificacaoTaxa;
}

// Vincular automaticamente contas de despesa e receita baseado na classificação financeira
function vincularContasAutomaticamente(taxa: TaxaAdministracao): void {
  console.log(`🔗 Tentando vincular contas automaticamente para taxa ${taxa.id}`);

  if (!taxa.grupoContabil) {
    console.log(`⚠️ Taxa sem grupo contábil definido`);
    return;
  }

  // Buscar a classificação financeira da transferência
  const transfer = taxa.transferOut || taxa.transferIn;
  if (!transfer) {
    console.log(`⚠️ Taxa sem transferência associada`);
    return;
  }

  const classificacao = (transfer as any).original?.classificacaoFinanceira;
  console.log(`📋 Classificação financeira encontrada: ${classificacao}`);

  if (!classificacao) {
    console.log(`⚠️ Transferência sem classificação financeira`);
    return;
  }

  // Buscar no mapeamento de classificações
  const classificacoes = mappingService.getClassificacoes();
  console.log(`📚 Total de classificações no mapeamento: ${classificacoes.length}`);

  const mapping = classificacoes.find(c => c.classificacaoFinanceira === classificacao);
  console.log(`🔍 Mapeamento encontrado:`, mapping);

  if (mapping) {
    // Normalizar: remover espaços e converter para maiúsculas
    const classifUpper = classificacao.toUpperCase().replace(/\s+/g, '');

    // Se for despesa (PROJ, GRANT, TEP, IMP)
    if (classifUpper.includes('PROJ002.1.4.01.99') ||
        classifUpper.includes('GRANT002.1.4.01.99') ||
        classifUpper.includes('TEP002.1.4.01.99') ||
        classifUpper.includes('IMP004.19')) {
      // Conta de despesa vem do mapeamento
      taxa.contaDespesa = mapping.codigoContabil;
      console.log(`✓ Conta de despesa vinculada automaticamente: ${taxa.contaDespesa} (${mapping.descricao})`);
    }

    // Se for receita (FECD001.1.4 ou FECD001.1.5)
    if (classifUpper.startsWith('FECD001.1.4') || classifUpper.startsWith('FECD001.1.5')) {
      // Conta de receita vem do mapeamento
      taxa.contaReceita = mapping.codigoContabil;
      console.log(`✓ Conta de receita vinculada automaticamente: ${taxa.contaReceita} (${mapping.descricao})`);
    }
  } else {
    console.log(`⚠️ Nenhum mapeamento encontrado para classificação: ${classificacao}`);
  }
}

// Adicionar transferência como taxa de administração
export function addTaxaAdministracao(transfer: Transfer): TaxaAdministracao {
  const store = loadTaxasAdministracao();

  const taxaData = {
    transferId: transfer.id,
    accountNumber: transfer.accountNumber,
    accountCode: transfer.accountCode,
    date: transfer.date,
    amount: transfer.amount,
    historico: transfer.historico,
  };

  let resultTaxa: TaxaAdministracao;

  // Verificar se é saída (débito) ou entrada (crédito)
  const isOut = transfer.direction === 'OUT';
  const isIn = transfer.direction === 'IN';

  // Verificar se já existe uma taxa pendente que pode parear
  const existingTaxa = store.taxas.find(t => {
    if (!t.status.startsWith('PENDING')) return false;

    const tDate = t.transferIn?.date || t.transferOut?.date;
    const tAmount = t.transferIn?.amount || t.transferOut?.amount;

    // Se a nova transferência é saída (OUT), procurar taxa que está esperando saída (PENDING_IN)
    if (isOut && t.status === 'PENDING_IN' && t.transferIn) {
      return tDate === transfer.date && tAmount === transfer.amount;
    }

    // Se a nova transferência é entrada (IN), procurar taxa que está esperando entrada (PENDING_OUT)
    if (isIn && t.status === 'PENDING_OUT' && t.transferOut) {
      return tDate === transfer.date && tAmount === transfer.amount;
    }

    return false;
  });

  if (existingTaxa) {
    // Parear com taxa existente
    if (isOut) {
      existingTaxa.transferOut = taxaData;
    } else {
      existingTaxa.transferIn = taxaData;
    }
    existingTaxa.status = 'PAIRED';
    existingTaxa.pairedAt = new Date();

    // Identificar grupo contábil automaticamente (usar a transferência atual que tem a classificação)
    const grupoIdentificado = identificarGrupoContabil(transfer);
    if (grupoIdentificado) {
      existingTaxa.grupoContabil = grupoIdentificado;
    }

    // Vincular contas automaticamente usando a transferência atual
    vincularContasAutomaticamenteDirect(existingTaxa, transfer);
    resultTaxa = existingTaxa;
  } else {
    // Criar nova taxa pendente
    const grupoIdentificado = identificarGrupoContabil(transfer);

    const novaTaxa: TaxaAdministracao = {
      id: crypto.randomUUID(),
      status: isOut ? 'PENDING_OUT' : 'PENDING_IN',
      grupoContabil: grupoIdentificado,
    };

    if (isOut) {
      novaTaxa.transferOut = taxaData;
    } else {
      novaTaxa.transferIn = taxaData;
    }

    // Vincular contas automaticamente usando a transferência atual
    vincularContasAutomaticamenteDirect(novaTaxa, transfer);

    store.taxas.push(novaTaxa);
    resultTaxa = novaTaxa;
  }

  saveTaxasAdministracao(store);
  return resultTaxa;
}

// Vincular contas usando diretamente a transferência (que tem o original com classificação)
function vincularContasAutomaticamenteDirect(taxa: TaxaAdministracao, transfer: Transfer): void {
  if (!taxa.grupoContabil) {
    return;
  }

  // Carregar configurações
  const config = loadTaxaConfig();

  // Buscar a conta bancária para pegar a categoria
  const contaBancaria = mappingService.getContasBancarias().find(
    c => c.numeroConta === transfer.accountNumber
  );

  if (!contaBancaria) {
    return;
  }

  // Determinar se é despesa (OUT) ou receita (IN)
  const isDespesa = transfer.direction === 'OUT';
  const isReceita = transfer.direction === 'IN';

  if (isDespesa) {
    // Lançamento de Despesa
    switch (taxa.grupoContabil) {
      case 'PROJETOS':
        taxa.contaDespesa = config.despesa.PROJETOS.debito;
        break;
      case 'GRANTS':
        taxa.contaDespesa = config.despesa.GRANTS.debito;
        break;
      case 'TERMOS_PARCERIAS':
        taxa.contaDespesa = config.despesa.TERMOS_PARCERIAS.debito;
        break;
      case 'IMPORTACOES':
        taxa.contaDespesa = config.despesa.IMPORTACAO.debito;
        break;
    }
  }

  if (isReceita) {
    // Lançamento de Receita
    switch (taxa.grupoContabil) {
      case 'PROJETOS':
        taxa.contaReceita = config.receita.categorias.PROJETOS.credito;
        break;
      case 'GRANTS':
        taxa.contaReceita = config.receita.categorias.GRANTS.credito;
        break;
      case 'TERMOS_PARCERIAS':
        taxa.contaReceita = config.receita.categorias.TERMOS_PARCERIAS.credito;
        break;
      case 'IMPORTACOES':
        taxa.contaReceita = config.receita.categorias.IMPORTACAO.credito;
        break;
    }
  }
}

// Identificar grupo contábil baseado na classificação financeira
function identificarGrupoContabil(transfer: Transfer): 'PROJETOS' | 'GRANTS' | 'TERMOS_PARCERIAS' | 'IMPORTACOES' | undefined {
  const classificacao = (transfer as any).original?.classificacaoFinanceira;
  const config = loadTaxaConfig();

  if (classificacao) {
    const classifUpper = classificacao.toUpperCase().replace(/\s+/g, '');

    // Identificar por classificação financeira de despesa usando a configuração
    if (config.classificacoesIdentificadoras.PROJETOS.some(c => classifUpper.includes(c.toUpperCase().replace(/\s+/g, '')))) {
      return 'PROJETOS';
    }
    if (config.classificacoesIdentificadoras.GRANTS.some(c => classifUpper.includes(c.toUpperCase().replace(/\s+/g, '')))) {
      return 'GRANTS';
    }
    if (config.classificacoesIdentificadoras.TERMOS_PARCERIAS.some(c => classifUpper.includes(c.toUpperCase().replace(/\s+/g, '')))) {
      return 'TERMOS_PARCERIAS';
    }
    if (config.classificacoesIdentificadoras.IMPORTACAO.some(c => classifUpper.includes(c.toUpperCase().replace(/\s+/g, '')))) {
      return 'IMPORTACOES';
    }

    // Receitas (FECD001.1.4 e FECD001.1.5) - identificar pelo subgrupo específico
    if (classifUpper.startsWith('FECD001.1.4') || classifUpper.startsWith('FECD001.1.5')) {
      if (classifUpper.includes('.01.')) {
        return 'PROJETOS';
      }
      if (classifUpper.includes('.02.')) {
        return 'GRANTS';
      }
      if (classifUpper.includes('.03.')) {
        return 'TERMOS_PARCERIAS';
      }
      if (classifUpper.includes('.04.')) {
        return 'IMPORTACOES';
      }
    }
  }

  // Fallback: identificar pela conta específica de importações
  const accountNumber = transfer.accountNumber;
  if (accountNumber === GRUPOS_CONTABEIS.IMPORTACOES.contaEspecifica) {
    return 'IMPORTACOES';
  }

  // Fallback: buscar no plano de contas
  const contaBancaria = mappingService.getContasBancarias().find(
    c => c.numeroConta === accountNumber
  );

  if (!contaBancaria) {
    return undefined;
  }

  const codigoContabil = contaBancaria.codigoContabil;

  // Identificar grupo pelo código contábil
  if (codigoContabil.startsWith('1102010')) {
    return 'PROJETOS';
  }
  if (codigoContabil.startsWith('1102011')) {
    return 'GRANTS';
  }
  if (codigoContabil.startsWith('1102012')) {
    return 'TERMOS_PARCERIAS';
  }

  return undefined;
}

// Definir contas contábeis para uma taxa
export function definirContasTaxa(
  taxaId: string,
  grupoContabil: 'PROJETOS' | 'GRANTS' | 'TERMOS_PARCERIAS' | 'IMPORTACOES',
  contaDespesa: string,
  contaReceita: string
): void {
  const store = loadTaxasAdministracao();
  const taxa = store.taxas.find(t => t.id === taxaId);

  if (taxa) {
    taxa.grupoContabil = grupoContabil;
    taxa.contaDespesa = contaDespesa;
    taxa.contaReceita = contaReceita;
    saveTaxasAdministracao(store);
  }
}

// Processar taxa pareada em lançamentos contábeis
export function processarTaxa(taxaId: string): {
  lancamentoDespesa: any;
  lancamentoReceita: any;
} | null {
  const store = loadTaxasAdministracao();
  const taxa = store.taxas.find(t => t.id === taxaId);

  if (!taxa || taxa.status !== 'PAIRED' || !taxa.grupoContabil) {
    return null;
  }

  if (!taxa.transferOut || !taxa.transferIn) {
    return null;
  }

  // Carregar configurações
  const config = loadTaxaConfig();

  // Determinar crédito para despesa
  let creditoDespesa = taxa.transferOut.accountCode; // Padrão: banco de origem

  // Importação tem crédito fixo
  if (taxa.grupoContabil === 'IMPORTACOES') {
    creditoDespesa = config.despesa.IMPORTACAO.credito;
  }

  // Calcular valor efetivo (menor valor entre as pernas)
  const parseBrazilianValue = (valStr: string): number => {
    if (!valStr) return 0;
    return parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
  };

  const valOut = parseBrazilianValue(taxa.transferOut.amount);
  const valIn = parseBrazilianValue(taxa.transferIn.amount);
  const minVal = Math.min(valOut, valIn);
  const valorEfetivoStr = minVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Lançamento de Despesa: Débito Despesa, Crédito Banco (saída)
  const lancamentoDespesa = {
    data: taxa.transferOut.date,
    debito: taxa.contaDespesa || (taxa.grupoContabil === 'IMPORTACOES' ? config.despesa.IMPORTACAO.debito : config.despesa[taxa.grupoContabil].debito),
    credito: creditoDespesa,
    centroCusto: '',
    historico: `Taxa de Administração - ${GRUPOS_CONTABEIS[taxa.grupoContabil!].descricao}`,
    valor: valorEfetivoStr,
    tipo: 'FINANCEIRO',
  };

  // Lançamento de Receita: Débito Banco Adm (14300-4), Crédito Receita
  const lancamentoReceita = {
    data: taxa.transferIn.date,
    debito: config.receita.contaDebito, // Sempre 11010103 - BANCO ITAU C/C 14.300-4
    credito: taxa.contaReceita || (taxa.grupoContabil === 'IMPORTACOES' ? config.receita.categorias.IMPORTACAO.credito : config.receita.categorias[taxa.grupoContabil].credito),
    centroCusto: '',
    historico: `Receita Taxa de Administração - ${GRUPOS_CONTABEIS[taxa.grupoContabil!].descricao}`,
    valor: valorEfetivoStr,
    tipo: 'FINANCEIRO',
  };

  // Marcar como processada
  taxa.status = 'PROCESSED';
  taxa.processedAt = new Date();
  saveTaxasAdministracao(store);

  return { lancamentoDespesa, lancamentoReceita };
}

// Obter taxas por status
export function getTaxasPendentes(): TaxaAdministracao[] {
  const store = loadTaxasAdministracao();
  return store.taxas.filter(t => t.status.startsWith('PENDING'));
}

export function getTaxasPareadas(): TaxaAdministracao[] {
  const store = loadTaxasAdministracao();
  return store.taxas.filter(t => t.status === 'PAIRED');
}

export function getTaxasProcessadas(): TaxaAdministracao[] {
  const store = loadTaxasAdministracao();
  return store.taxas.filter(t => t.status === 'PROCESSED');
}

// Excluir taxa
export function deleteTaxa(taxaId: string): void {
  const store = loadTaxasAdministracao();
  store.taxas = store.taxas.filter(t => t.id !== taxaId);
  saveTaxasAdministracao(store);
}

// Limpar todas as taxas
export function clearAllTaxas(): void {
  saveTaxasAdministracao({ taxas: [] });
}

// Limpar taxas de uma conta específica
export function clearTaxasByAccount(accountNumber: string): void {
  const store = loadTaxasAdministracao();
  store.taxas = store.taxas.filter(t => {
    const outAccount = t.transferOut?.accountNumber;
    const inAccount = t.transferIn?.accountNumber;
    return outAccount !== accountNumber && inAccount !== accountNumber;
  });
  saveTaxasAdministracao(store);
}

// Exportar taxas processadas para CSV
export function exportTaxasProcessadas(): { csv: string; taxasExportadas: TaxaAdministracao[] } {
  const store = loadTaxasAdministracao();
  const taxasParaExportar = store.taxas.filter(t => t.status === 'PROCESSED' && !t.exported);

  if (taxasParaExportar.length === 0) {
    return { csv: '', taxasExportadas: [] };
  }

  // Gerar linhas do CSV
  const linhas: string[] = [];
  const erros: string[] = [];

  const parseBrazilianValue = (valStr: string): number => {
    if (!valStr) return 0;
    return parseFloat(valStr.replace(/\./g, '').replace(',', '.'));
  };

  taxasParaExportar.forEach(taxa => {
    if (!taxa.transferOut || !taxa.transferIn || !taxa.grupoContabil) {
      erros.push(`Taxa ${taxa.id}: dados incompletos`);
      return;
    }

    const config = loadTaxaConfig();

    // Lançamento de Despesa
    const creditoDespesa = taxa.grupoContabil === 'IMPORTACOES'
      ? config.despesa.IMPORTACAO.credito
      : taxa.transferOut.accountCode;

    const debitoDespesa = taxa.contaDespesa || '';

    // Validar lançamento de despesa
    if (!debitoDespesa || !creditoDespesa) {
      erros.push(`Taxa ${taxa.id} (Despesa): débito ou crédito vazio`);
      return;
    }
    if (debitoDespesa === creditoDespesa) {
      erros.push(`Taxa ${taxa.id} (Despesa): débito igual ao crédito`);
      return;
    }

    const valOut = parseBrazilianValue(taxa.transferOut.amount);
    const valIn = parseBrazilianValue(taxa.transferIn.amount);
    const minVal = Math.min(valOut, valIn);
    const valorEfetivoStr = minVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    linhas.push([
      taxa.transferOut.date,
      debitoDespesa,
      creditoDespesa,
      '',
      `Taxa de Administração - ${GRUPOS_CONTABEIS[taxa.grupoContabil].descricao}`,
      valorEfetivoStr,
      'FINANCEIRO'
    ].join(';'));

    // Lançamento de Receita
    const debitoReceita = config.receita.contaDebito;
    const creditoReceita = taxa.contaReceita || '';

    // Validar lançamento de receita
    if (!debitoReceita || !creditoReceita) {
      erros.push(`Taxa ${taxa.id} (Receita): débito ou crédito vazio`);
      return;
    }
    if (debitoReceita === creditoReceita) {
      erros.push(`Taxa ${taxa.id} (Receita): débito igual ao crédito`);
      return;
    }

    linhas.push([
      taxa.transferIn.date,
      debitoReceita,
      creditoReceita,
      '',
      `Receita Taxa de Administração - ${GRUPOS_CONTABEIS[taxa.grupoContabil].descricao}`,
      valorEfetivoStr,
      'FINANCEIRO'
    ].join(';'));
  });

  // Se houver erros, lançar exceção
  if (erros.length > 0) {
    throw new Error(
      `Não é possível exportar: ${erros.length} erro(s) encontrado(s):\n` +
      erros.join('\n')
    );
  }

  const csv = '﻿' + linhas.join('\n');

  // Marcar como exportadas
  taxasParaExportar.forEach(taxa => {
    taxa.exported = true;
    taxa.exportedAt = new Date();
  });

  saveTaxasAdministracao(store);

  return { csv, taxasExportadas: taxasParaExportar };
}

// Obter taxas processadas não exportadas
export function getTaxasProcessadasNaoExportadas(): TaxaAdministracao[] {
  const store = loadTaxasAdministracao();
  return store.taxas.filter(t => t.status === 'PROCESSED' && !t.exported);
}

// Parear taxas manualmente
export function parearTaxasManualmente(principalId: string, candidatasIds: string[]): void {
  const store = loadTaxasAdministracao();
  const principal = store.taxas.find(t => t.id === principalId);
  if (!principal) return;

  const candidatas = store.taxas.filter(t => candidatasIds.includes(t.id));
  if (candidatas.length === 0) return;

  const transferStore = loadTransferStore();

  const findOriginalTransfer = (transferId: string): Transfer | undefined => {
    return transferStore.pending.find(t => t.id === transferId) ||
           transferStore.paired.flatMap(p => [p.outTransfer, p.inTransfer]).find(t => t.id === transferId);
  };

  const isOut = principal.status === 'PENDING_OUT';
  const newPairedTaxas: TaxaAdministracao[] = [];

  candidatas.forEach(candidata => {
    const outData = isOut ? principal.transferOut : candidata.transferOut;
    const inData = isOut ? candidata.transferIn : principal.transferIn;

    if (!outData || !inData) return;

    // Buscar transferências originais
    const transferOut = findOriginalTransfer(outData.transferId);
    const transferIn = findOriginalTransfer(inData.transferId);

    // Identificar grupo contábil usando as transferências
    let grupo: 'PROJETOS' | 'GRANTS' | 'TERMOS_PARCERIAS' | 'IMPORTACOES' | undefined;
    if (transferOut) {
      grupo = identificarGrupoContabil(transferOut);
    }
    if (!grupo && transferIn) {
      grupo = identificarGrupoContabil(transferIn);
    }

    const novaTaxa: TaxaAdministracao = {
      id: crypto.randomUUID(),
      status: 'PAIRED',
      transferOut: outData,
      transferIn: inData,
      grupoContabil: grupo,
      pairedAt: new Date()
    };

    // Vincular contas automaticamente
    if (transferOut) {
      vincularContasAutomaticamenteDirect(novaTaxa, transferOut);
    } else if (transferIn) {
      vincularContasAutomaticamenteDirect(novaTaxa, transferIn);
    }

    newPairedTaxas.push(novaTaxa);
  });

  // Remover a principal e as candidatas
  const idsToRemove = new Set([principalId, ...candidatasIds]);
  store.taxas = [
    ...store.taxas.filter(t => !idsToRemove.has(t.id)),
    ...newPairedTaxas
  ];

  saveTaxasAdministracao(store);
}

