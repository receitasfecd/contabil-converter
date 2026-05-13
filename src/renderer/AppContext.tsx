import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProcessedEntry } from './types/Entry';
import { ContaBancariaMapping } from './types/Mapping';
import { Transfer, TransferStore, TransferPair } from './types/Transfer';
import { loadTransferStore, saveTransferStore } from './services/transferStore';
import { matchTransfers } from './services/transferMatcher';
import { updateLancamentoHistorico } from './services/importedAccountsService';

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
  const [transferStore, setTransferStore] = useState<TransferStore>(() => loadTransferStore());

  // Salvar transferStore no localStorage sempre que mudar
  useEffect(() => {
    saveTransferStore(transferStore);
  }, [transferStore]);

  const addTransfers = (transfers: Transfer[]) => {
    console.log(`📥 AppContext.addTransfers: Adicionando ${transfers.length} transferências`);
    setTransferStore(prev => {
      const newStore = {
        ...prev,
        pending: [...prev.pending, ...transfers]
      };
      console.log(`📊 Novo estado: ${newStore.pending.length} pendentes, ${newStore.paired.length} pareados`);
      return newStore;
    });
  };

  const addTransfersAndPair = (transfers: Transfer[]) => {
    console.log(`📥 AppContext.addTransfersAndPair: Adicionando ${transfers.length} transferências e pareando`);
    setTransferStore(prev => {
      // Adicionar novas transferências
      const allPending = [...prev.pending, ...transfers];
      console.log(`📊 Total de pendentes para parear: ${allPending.length}`);

      // Executar pareamento
      const newPairs = matchTransfers(allPending);
      console.log(`✓ Pareamento concluído: ${newPairs.length} pares encontrados`);

      // IDs das transferências pareadas
      const pairedIds = new Set<string>();
      newPairs.forEach(pair => {
        pairedIds.add(pair.outTransfer.id);
        pairedIds.add(pair.inTransfer.id);
        console.log(`  Par: ${pair.outTransfer.accountNumber} → ${pair.inTransfer.accountNumber} | ${pair.outTransfer.amount} | Score: ${pair.matchScore}`);
      });

      // Atualizar status das transferências pareadas
      const updatedPending = allPending.map(t =>
        pairedIds.has(t.id) ? { ...t, status: 'PAIRED' as const } : t
      );

      // Remover transferências pareadas de pending
      const stillPending = updatedPending.filter(t => t.status === 'PENDING');

      const newStore = {
        ...prev,
        pending: stillPending,
        paired: [...prev.paired, ...newPairs]
      };

      console.log(`📊 Após pareamento: ${newStore.pending.length} pendentes, ${newStore.paired.length} pareados`);
      return newStore;
    });
  };

  const updateTransferStore = (store: TransferStore) => {
    setTransferStore(store);
  };

  const pairTransfers = () => {
    console.log(`🔗 AppContext.pairTransfers: Iniciando pareamento com ${transferStore.pending.length} transferências pendentes`);
    const newPairs = matchTransfers(transferStore.pending);
    console.log(`✓ Pareamento concluído: ${newPairs.length} pares encontrados`);

    // IDs das transferências pareadas
    const pairedIds = new Set<string>();
    newPairs.forEach(pair => {
      pairedIds.add(pair.outTransfer.id);
      pairedIds.add(pair.inTransfer.id);
      console.log(`  Par: ${pair.outTransfer.accountNumber} → ${pair.inTransfer.accountNumber} | ${pair.outTransfer.amount} | Score: ${pair.matchScore}`);
    });

    // Atualizar status das transferências pareadas
    const updatedPending = transferStore.pending.map(t =>
      pairedIds.has(t.id) ? { ...t, status: 'PAIRED' as const } : t
    );

    // Remover transferências pareadas de pending
    const stillPending = updatedPending.filter(t => t.status === 'PENDING');

    setTransferStore(prev => {
      const newStore = {
        ...prev,
        pending: stillPending,
        paired: [...prev.paired, ...newPairs]
      };
      console.log(`📊 Após pareamento: ${newStore.pending.length} pendentes, ${newStore.paired.length} pareados`);
      return newStore;
    });
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

  const deleteTransfer = (transferId: string) => {
    console.log(`🗑️ Excluindo transferência: ${transferId}`);
    setTransferStore(prev => {
      const newStore = {
        ...prev,
        pending: prev.pending.filter(t => t.id !== transferId)
      };
      console.log(`✅ Transferência excluída. Restam ${newStore.pending.length} pendentes`);
      return newStore;
    });
  };

  const deletePair = (pairId: string) => {
    console.log(`🗑️ Excluindo par: ${pairId}`);
    setTransferStore(prev => {
      const pair = prev.paired.find(p => p.id === pairId);
      if (!pair) return prev;

      // Retornar as transferências para pending se não foram exportadas
      const newPending = pair.exported
        ? prev.pending
        : [
            ...prev.pending,
            { ...pair.outTransfer, status: 'PENDING' as const },
            { ...pair.inTransfer, status: 'PENDING' as const }
          ];

      const newStore = {
        ...prev,
        pending: newPending,
        paired: prev.paired.filter(p => p.id !== pairId),
        exported: prev.exported.filter(id => id !== pairId)
      };

      console.log(`✅ Par excluído. ${newStore.paired.length} pares restantes`);
      return newStore;
    });
  };

  const deleteTransfersByAccount = (accountNumber: string) => {
    console.log(`🗑️ Excluindo todas as transferências da conta: ${accountNumber}`);
    setTransferStore(prev => {
      const pendingBefore = prev.pending.length;
      const pairedBefore = prev.paired.length;

      const newPending = prev.pending.filter(t => t.accountNumber !== accountNumber);
      const newPaired = prev.paired.filter(
        p => p.outTransfer.accountNumber !== accountNumber &&
            p.inTransfer.accountNumber !== accountNumber
      );

      const pendingRemoved = pendingBefore - newPending.length;
      const pairedRemoved = pairedBefore - newPaired.length;

      console.log(`✅ Removidas: ${pendingRemoved} pendentes, ${pairedRemoved} pares`);

      return {
        ...prev,
        pending: newPending,
        paired: newPaired
      };
    });
  };

  const updateTransfer = (transfer: Transfer) => {
    console.log(`✏️ Atualizando transferência: ${transfer.id}`);
    setTransferStore(prev => {
      // Atualizar em pending
      const updatedPending = prev.pending.map(t =>
        t.id === transfer.id ? transfer : t
      );

      // Atualizar em paired
      const updatedPaired = prev.paired.map(pair => {
        if (pair.outTransfer.id === transfer.id) {
          return { ...pair, outTransfer: transfer };
        }
        if (pair.inTransfer.id === transfer.id) {
          return { ...pair, inTransfer: transfer };
        }
        return pair;
      });

      console.log(`✅ Transferência atualizada`);
      return {
        ...prev,
        pending: updatedPending,
        paired: updatedPaired
      };
    });
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
