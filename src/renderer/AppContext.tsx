import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProcessedEntry } from './types/Entry';
import { ContaBancariaMapping } from './types/Mapping';
import { Transfer, TransferStore } from './types/Transfer';
import { loadTransferStore as loadTransferStoreLocal, saveTransferStore as saveTransferStoreLocal } from './services/transferStore';
import { loadTransferStore as loadTransferStoreSupabase, saveTransfers, savePairs, deleteTransferFromDB, deletePairFromDB, deleteTransfersByAccountFromDB } from './services/supabaseTransferService';
import { loadTaxasFromSupabase, saveTaxaToSupabase, deleteTaxaFromSupabase, clearAllTaxasFromSupabase } from './services/supabaseTaxaService';
import { matchTransfers } from './services/transferMatcher';
import { updateLancamentoHistorico } from './services/importedAccountsService';
import { setTaxasStore, isTaxaAdministracao, addTaxaAdministracao, loadTaxasAdministracao } from './services/taxaAdministracaoService';
import { TaxaAdministracao, TaxaAdministracaoStore } from './types/TaxaAdministracao';
import { supabase } from './services/supabaseClient';

interface AppContextType {
  processedEntries: ProcessedEntry[];
  setProcessedEntries: (entries: ProcessedEntry[]) => void;
  selectedAccount: ContaBancariaMapping | null;
  setSelectedAccount: (account: ContaBancariaMapping | null) => void;
  transferStore: TransferStore;
  addTransfers: (transfers: Transfer[]) => void;
  addTransfersAndPair: (transfers: Transfer[]) => void;
  addTransfersPairAndTaxas: (transfers: Transfer[]) => void;
  updateTransferStore: (store: TransferStore) => void;
  pairTransfers: () => void;
  markPairAsExported: (pairId: string) => void;
  deleteTransfer: (transferId: string) => void;
  deletePair: (pairId: string) => void;
  deleteTransfersByAccount: (accountNumber: string) => void;
  updateTransfer: (transfer: Transfer) => void;
  updateLancamentoHistorico: (accountId: string, lancamentoId: string, novoHistorico: string) => void;
  taxaStore: TaxaAdministracaoStore;
  setTaxaStore: (store: TaxaAdministracaoStore) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [processedEntries, setProcessedEntries] = useState<ProcessedEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ContaBancariaMapping | null>(null);
  const [transferStore, setTransferStore] = useState<TransferStore>({ pending: [], paired: [], exported: [] });
  const [taxaStore, setTaxaStoreInternal] = useState<TaxaAdministracaoStore>({ taxas: [] });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticação e carregar dados
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        loadData();
      } else {
        setTransferStore(loadTransferStoreLocal());
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const store = await loadTransferStoreSupabase();
      setTransferStore(store);

      const taxas = await loadTaxasFromSupabase();
      setTaxaStoreInternal(taxas);
      setTaxasStore(taxas);
    } catch (error) {
      console.error('❌ Erro ao carregar dados do Supabase:', error);
    }
  };

  const setTaxaStore = (store: TaxaAdministracaoStore) => {
    setTaxaStoreInternal(store);
    setTaxasStore(store);
  };

  // Salvar transferStore (Supabase ou localStorage)
  useEffect(() => {
    if (isAuthenticated) {
      const allTransfers = [
        ...transferStore.pending,
        ...transferStore.paired.flatMap(p => [p.outTransfer, p.inTransfer])
      ];
      saveTransfers(allTransfers)
        .catch(err => console.error('❌ Erro ao salvar transferências:', err));

      savePairs(transferStore.paired)
        .catch(err => console.error('❌ Erro ao salvar pares:', err));
    } else {
      saveTransferStoreLocal(transferStore);
    }
  }, [transferStore, isAuthenticated]);

  const addTransfers = (transfers: Transfer[]) => {
    setTransferStore(prev => ({
      ...prev,
      pending: [...prev.pending, ...transfers]
    }));
  };

  const addTransfersAndPair = (transfers: Transfer[]) => {
    setTransferStore(prev => {
      const allPending = [...prev.pending, ...transfers];
      const newPairs = matchTransfers(allPending);
      const pairedIds = new Set<string>();
      
      newPairs.forEach(pair => {
        pairedIds.add(pair.outTransfer.id);
        pairedIds.add(pair.inTransfer.id);
      });

      const updatedPending = allPending.map(t =>
        pairedIds.has(t.id) ? { ...t, status: 'PAIRED' as const } : t
      );

      const stillPending = updatedPending.filter(t => t.status === 'PENDING');

      return {
        ...prev,
        pending: stillPending,
        paired: [...prev.paired, ...newPairs]
      };
    });
  };

  const addTransfersPairAndTaxas = (transfers: Transfer[]) => {
    console.log(`📦 addTransfersPairAndTaxas: Processando ${transfers.length} transferências`);

    // 1. Identificar taxas e atualizar taxaStore
    const newTaxas: TaxaAdministracao[] = [];
    transfers.forEach(t => {
      if (isTaxaAdministracao(t)) {
        console.log(`💰 Adicionando taxa à store: ${t.historico}`);
        const taxa = addTaxaAdministracao(t);
        newTaxas.push(taxa);
      }
    });

    console.log(`📊 Total de taxas detectadas: ${newTaxas.length}`);

    if (newTaxas.length > 0) {
      const updatedTaxaStore = loadTaxasAdministracao();
      console.log(`📚 Taxa store atualizada. Total de taxas na store: ${updatedTaxaStore.taxas.length}`);
      setTaxaStore(updatedTaxaStore);

      if (isAuthenticated) {
        console.log(`☁️ Salvando ${newTaxas.length} taxas no Supabase...`);
        newTaxas.forEach(taxa => {
           saveTaxaToSupabase(taxa).catch(err => console.error('❌ Erro ao salvar taxa no Supabase:', err));
        });
      } else {
        console.log(`⚠️ Usuário não autenticado - taxas não serão salvas no Supabase`);
      }
    } else {
      console.log(`⚠️ Nenhuma taxa detectada neste lote de transferências`);
    }

    // 2. Proceder com o pareamento normal de transferências
    addTransfersAndPair(transfers);
  };

  const updateTransferStore = (store: TransferStore) => {
    setTransferStore(store);
  };

  const pairTransfers = () => {
    const newPairs = matchTransfers(transferStore.pending);
    const pairedIds = new Set<string>();
    
    newPairs.forEach(pair => {
      pairedIds.add(pair.outTransfer.id);
      pairedIds.add(pair.inTransfer.id);
    });

    const updatedPending = transferStore.pending.map(t =>
      pairedIds.has(t.id) ? { ...t, status: 'PAIRED' as const } : t
    );

    const stillPending = updatedPending.filter(t => t.status === 'PENDING');

    setTransferStore(prev => ({
      ...prev,
      pending: stillPending,
      paired: [...prev.paired, ...newPairs]
    }));
  };

  const markPairAsExported = (pairId: string) => {
    setTransferStore(prev => {
      const updatedPairs = prev.paired.map(pair =>
        pair.id === pairId
          ? {
              ...pair,
              exported: true,
              outTransfer: { ...pair.outTransfer, status: 'EXPORTED' as const },
              inTransfer: { ...pair.inTransfer, status: 'EXPORTED' as const }
            }
          : pair
      );

      return {
        ...prev,
        paired: updatedPairs,
        exported: [...prev.exported, pairId]
      };
    });
  };

  const deleteTransfer = async (transferId: string) => {
    if (isAuthenticated) {
      try {
        await deleteTransferFromDB(transferId);
      } catch (error) {
        console.error('Erro ao excluir transferência do Supabase:', error);
      }
    }

    setTransferStore(prev => ({
      ...prev,
      pending: prev.pending.filter(t => t.id !== transferId)
    }));
  };

  const deletePair = async (pairId: string) => {
    if (isAuthenticated) {
      try {
        await deletePairFromDB(pairId);
      } catch (error) {
        console.error('Erro ao excluir par do Supabase:', error);
      }
    }

    setTransferStore(prev => {
      const pair = prev.paired.find(p => p.id === pairId);
      if (!pair) return prev;

      const newPending = pair.exported
        ? prev.pending
        : [
            ...prev.pending,
            { ...pair.outTransfer, status: 'PENDING' as const },
            { ...pair.inTransfer, status: 'PENDING' as const }
          ];

      return {
        ...prev,
        pending: newPending,
        paired: prev.paired.filter(p => p.id !== pairId),
        exported: prev.exported.filter(id => id !== pairId)
      };
    });
  };

  const deleteTransfersByAccount = async (accountNumber: string) => {
    if (isAuthenticated) {
      try {
        await deleteTransfersByAccountFromDB(accountNumber);
      } catch (error) {
        console.error('Erro ao excluir transferências do Supabase:', error);
      }
    }

    setTransferStore(prev => ({
      ...prev,
      pending: prev.pending.filter(t => t.accountNumber !== accountNumber),
      paired: prev.paired.filter(
        p => p.outTransfer.accountNumber !== accountNumber &&
            p.inTransfer.accountNumber !== accountNumber
      )
    }));
  };

  const updateTransfer = (transfer: Transfer) => {
    setTransferStore(prev => ({
      ...prev,
      pending: prev.pending.map(t => t.id === transfer.id ? transfer : t),
      paired: prev.paired.map(pair => {
        if (pair.outTransfer.id === transfer.id) return { ...pair, outTransfer: transfer };
        if (pair.inTransfer.id === transfer.id) return { ...pair, inTransfer: transfer };
        return pair;
      })
    }));
  };

  const handleUpdateLancamentoHistorico = (accountId: string, lancamentoId: string, novoHistorico: string) => {
    updateLancamentoHistorico(accountId, lancamentoId, novoHistorico);
  };

  return (
    <AppContext.Provider
      value={{
        processedEntries,
        setProcessedEntries,
        selectedAccount,
        setSelectedAccount,
        transferStore,
        addTransfers,
        addTransfersAndPair,
        addTransfersPairAndTaxas,
        updateTransferStore,
        pairTransfers,
        markPairAsExported,
        deleteTransfer,
        deletePair,
        deleteTransfersByAccount,
        updateTransfer,
        updateLancamentoHistorico: handleUpdateLancamentoHistorico,
        taxaStore,
        setTaxaStore,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
