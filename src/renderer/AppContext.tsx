import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProcessedEntry } from './types/Entry';
import { ContaBancariaMapping } from './types/Mapping';
import { Transfer, TransferStore } from './types/Transfer';
import { loadTransferStore as loadTransferStoreLocal, saveTransferStore as saveTransferStoreLocal } from './services/transferStore';
import { loadTransferStore as loadTransferStoreSupabase, saveTransfers, savePairs, deleteTransferFromDB, deletePairFromDB, deleteTransfersByAccountFromDB } from './services/supabaseTransferService';
import { matchTransfers } from './services/transferMatcher';
import { updateLancamentoHistorico } from './services/importedAccountsService';
import { supabase } from './services/supabaseClient';

interface AppContextType {
  processedEntries: ProcessedEntry[];
  setProcessedEntries: (entries: ProcessedEntry[]) => void;
  selectedAccount: ContaBancariaMapping | null;
  setSelectedAccount: (account: ContaBancariaMapping | null) => void;
  transferStore: TransferStore;
  addTransfers: (transfers: Transfer[]) => void;
  addTransfersAndPair: (transfers: Transfer[]) => void;
  updateTransferStore: (store: TransferStore) => void;
  pairTransfers: () => void;
  markPairAsExported: (pairId: string) => void;
  deleteTransfer: (transferId: string) => void;
  deletePair: (pairId: string) => void;
  deleteTransfersByAccount: (accountNumber: string) => void;
  updateTransfer: (transfer: Transfer) => void;
  updateLancamentoHistorico: (accountId: string, lancamentoId: string, novoHistorico: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [processedEntries, setProcessedEntries] = useState<ProcessedEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ContaBancariaMapping | null>(null);
  const [transferStore, setTransferStore] = useState<TransferStore>({ pending: [], paired: [], exported: [] });
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
    } catch (error) {
      console.error('❌ Erro ao carregar dados do Supabase:', error);
    }
  };

  // Salvar transferStore (Supabase ou localStorage)
  useEffect(() => {
    if (isAuthenticated) {
      saveTransfers(transferStore.pending)
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
        updateTransferStore,
        pairTransfers,
        markPairAsExported,
        deleteTransfer,
        deletePair,
        deleteTransfersByAccount,
        updateTransfer,
        updateLancamentoHistorico: handleUpdateLancamentoHistorico,
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
