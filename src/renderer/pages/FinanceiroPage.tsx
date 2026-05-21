import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Checkbox,
  Grid,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  FindReplace as FindReplaceIcon,
  DeleteSweep as DeleteSweepIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { loadImportedAccounts, saveImportedAccounts } from '../services/importedAccountsService';
import { loadTaxasAdministracao } from '../services/taxaAdministracaoService';
import { ImportedAccount } from '../types/ImportedAccount';
import { ProcessedEntry } from '../types/Entry';
import { generateCSV, downloadCSV, generateFilename } from '../services/csvExporter';
import BankIcon from '../components/BankIcon';
import { useAppContext } from '../AppContext';

interface CombinedEntry {
  id: string;
  data: string;
  debito: string;
  credito: string;
  centroCusto: string;
  grupo: string;
  historico: string;
  valor: string;
  tipo: 'FINANCEIRO' | 'TRANSFERENCIA' | 'TAXA';
  saldoParcial: number;
  original: any;
}

export default function FinanceiroPage() {
  const navigate = useNavigate();
  const { transferStore, updateTransferStore } = useAppContext();
  const [accounts, setAccounts] = useState<ImportedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ImportedAccount | null>(null);
  const [combinedEntries, setCombinedEntries] = useState<CombinedEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CombinedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CombinedEntry | null>(null);

  // Seleção múltipla
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Filtros
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [filterGrupo, setFilterGrupo] = useState<string>('TODOS');
  const [filterSearch, setFilterSearch] = useState('');

  // Ordenação
  const [sortBy, setSortBy] = useState<'data' | 'valor' | 'tipo'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dialogs
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [findReplaceDialogOpen, setFindReplaceDialogOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    console.log('🔄 useEffect FILTROS executado');
    console.log('🔄 selectedAccount:', selectedAccount?.contaBancaria.numeroConta);
    console.log('🔄 combinedEntries.length:', combinedEntries.length);

    if (!selectedAccount) return;

    let filtered = [...combinedEntries];
    console.log('🔄 filtered inicial:', filtered.length);

    // Filtro por data
    if (filterDateStart) {
      filtered = filtered.filter(e => {
        const entryDate = parseDate(e.data);
        const startDate = parseBRDate(filterDateStart);
        if (!startDate) return true;
        return entryDate >= startDate;
      });
    }
    if (filterDateEnd) {
      filtered = filtered.filter(e => {
        const entryDate = parseDate(e.data);
        const endDate = parseBRDate(filterDateEnd);
        if (!endDate) return true;
        return entryDate <= endDate;
      });
    }

    // Filtro por tipo
    if (filterTipo !== 'TODOS') {
      filtered = filtered.filter(e => e.tipo === filterTipo);
    }

    // Filtro por grupo
    if (filterGrupo !== 'TODOS') {
      filtered = filtered.filter(e => e.grupo === filterGrupo);
    }

    // Filtro por busca (histórico, débito, crédito)
    if (filterSearch) {
      const search = filterSearch.toLowerCase();
      filtered = filtered.filter(e =>
        e.historico.toLowerCase().includes(search) ||
        e.debito.toLowerCase().includes(search) ||
        e.credito.toLowerCase().includes(search)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'data') {
        comparison = parseDate(a.data).getTime() - parseDate(b.data).getTime();
      } else if (sortBy === 'valor') {
        const valorA = parseFloat(a.valor.replace(/\./g, '').replace(',', '.'));
        const valorB = parseFloat(b.valor.replace(/\./g, '').replace(',', '.'));
        comparison = valorA - valorB;
      } else if (sortBy === 'tipo') {
        comparison = a.tipo.localeCompare(b.tipo);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    console.log('🔄 filtered FINAL após ordenação:', filtered.length);
    setFilteredEntries(filtered);
  }, [combinedEntries, filterDateStart, filterDateEnd, filterTipo, filterGrupo, filterSearch, sortBy, sortOrder, selectedAccount]);

  const loadData = () => {
    try {
      const store = loadImportedAccounts();
      setAccounts(store.accounts);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      setLoading(false);
    }
  };

  const loadAccountDetails = (account: ImportedAccount) => {
    console.log('🔍 === INÍCIO loadAccountDetails ===');
    console.log('📊 Conta:', account.contaBancaria.numeroConta);
    console.log('📊 account.lancamentos:', account.lancamentos);
    console.log('📊 account.lancamentos.length:', account.lancamentos?.length);
    console.log('📊 Saldo da conta:', account.saldo);

    setSelectedAccount(account);

    // Carregar lançamentos financeiros
    const financialEntries: CombinedEntry[] = (account.lancamentos || []).map(lanc => ({
      id: lanc.id || crypto.randomUUID(),
      data: lanc.data,
      debito: lanc.debito || '',
      credito: lanc.credito || '',
      centroCusto: lanc.centroCusto || '',
      grupo: determineGrupo(lanc),
      historico: lanc.historico,
      valor: lanc.valor,
      tipo: 'FINANCEIRO' as const,
      saldoParcial: 0,
      original: lanc
    }));

    console.log('💵 financialEntries criados:', financialEntries.length);
    console.log('💵 Primeiros 3 financialEntries:', financialEntries.slice(0, 3));

    // Carregar transferências
    console.log('🔄 transferStore do contexto:', transferStore);
    console.log('🔄 transferStore.pending:', transferStore.pending?.length || 0);
    console.log('🔄 transferStore.paired:', transferStore.paired?.length || 0);

    const accountTransfers = [
      ...(transferStore?.pending || []).filter(t => t && t.accountNumber === account.contaBancaria.numeroConta),
      ...(transferStore?.paired || []).flatMap(p => {
        const transfers = [];
        if (p?.outTransfer && p.outTransfer.accountNumber === account.contaBancaria.numeroConta) {
          transfers.push(p.outTransfer);
        }
        if (p?.inTransfer && p.inTransfer.accountNumber === account.contaBancaria.numeroConta) {
          transfers.push(p.inTransfer);
        }
        return transfers;
      })
    ];

    console.log('🔄 accountTransfers encontradas:', accountTransfers.length);
    console.log('🔄 Primeiras 3 accountTransfers:', accountTransfers.slice(0, 3));

    const transferEntries: CombinedEntry[] = accountTransfers.map(t => ({
      id: t.id,
      data: t.date,
      debito: t.direction === 'OUT' ? t.accountCode : '',
      credito: t.direction === 'IN' ? t.accountCode : '',
      centroCusto: t.centroCusto || '',
      grupo: 'Transferência',
      historico: t.historico,
      valor: t.amount,
      tipo: 'TRANSFERENCIA' as const,
      saldoParcial: 0,
      original: t
    }));

    // Carregar taxas de administração
    const taxasStore = loadTaxasAdministracao();
    console.log('💰 taxasStore:', taxasStore);
    console.log('💰 taxasStore.taxas:', taxasStore.taxas?.length || 0);
    const accountTaxas = (taxasStore?.taxas || []).filter(t => {
      const outAcc = t?.transferOut?.accountNumber;
      const inAcc = t?.transferIn?.accountNumber;
      return outAcc === account.contaBancaria.numeroConta || inAcc === account.contaBancaria.numeroConta;
    });
    console.log('💰 accountTaxas desta conta:', accountTaxas.length);

    const taxaEntries: CombinedEntry[] = accountTaxas.map(t => ({
      id: t.id,
      data: t.date,
      debito: t.debitoAccount || '',
      credito: t.creditoAccount || '',
      centroCusto: t.centroCusto || '',
      grupo: 'Taxa Administração',
      historico: t.historico,
      valor: t.amount,
      tipo: 'TAXA' as const,
      saldoParcial: 0,
      original: t
    }));

    // Combinar e ordenar por data
    const allEntries = [...financialEntries, ...transferEntries, ...taxaEntries];

    console.log('📦 allEntries ANTES de ordenar:', allEntries.length);
    console.log('📦 Composição: financeiros=' + financialEntries.length + ', transferências=' + transferEntries.length + ', taxas=' + taxaEntries.length);

    allEntries.sort((a, b) => {
      const dateA = parseDate(a.data);
      const dateB = parseDate(b.data);
      return dateA.getTime() - dateB.getTime();
    });

    // Calcular saldo inicial baseado no primeiro lançamento financeiro
    // Buscar o primeiro lançamento FINANCEIRO (não transferência) que tem o saldo do Excel
    const primeiroFinanceiro = allEntries.find(e => e.tipo === 'FINANCEIRO' && e.original?.original?.saldo !== undefined);

    let saldoInicial = 0;
    if (primeiroFinanceiro && primeiroFinanceiro.original?.original?.saldo !== undefined) {
      const primeiroValor = parseFloat(primeiroFinanceiro.valor.replace(/\./g, '').replace(',', '.'));
      const saldoAposPrimeiro = primeiroFinanceiro.original.original.saldo;

      // Calcular saldo inicial: saldo após - efeito do lançamento
      // Se a conta está no CRÉDITO = SAÍDA, então saldo inicial = saldo após + valor
      // Se a conta está no DÉBITO = ENTRADA, então saldo inicial = saldo após - valor
      if (primeiroFinanceiro.credito === account.contaBancaria.codigoContabil) {
        saldoInicial = saldoAposPrimeiro + primeiroValor;
      } else if (primeiroFinanceiro.debito === account.contaBancaria.codigoContabil) {
        saldoInicial = saldoAposPrimeiro - primeiroValor;
      }

      console.log('💰 Saldo inicial calculado:', saldoInicial);
      console.log('💰 Primeiro lançamento - Saldo no Excel:', saldoAposPrimeiro, 'Valor:', primeiroValor);
    } else {
      console.warn('⚠️ Não foi possível calcular saldo inicial - usando 0');
    }

    console.log('💰 Saldo final esperado:', account.saldo);

    let saldo = saldoInicial;
    console.log('💰 Iniciando cálculo de saldo. Código contábil da conta:', account.contaBancaria.codigoContabil);
    console.log('💰 Saldo inicial:', saldoInicial);

    allEntries.forEach((entry, index) => {
      const valor = parseFloat(entry.valor.replace(/\./g, '').replace(',', '.'));

      // Transferências não afetam o saldo (são movimentações entre contas)
      // Apenas lançamentos FINANCEIROS e TAXAS afetam o saldo
      if (entry.tipo !== 'TRANSFERENCIA') {
        // Para conta bancária (ATIVO):
        // Débito na conta = ENTRADA (+)
        // Crédito na conta = SAÍDA (-)
        if (entry.debito === account.contaBancaria.codigoContabil) {
          saldo += valor;
        } else if (entry.credito === account.contaBancaria.codigoContabil) {
          saldo -= valor;
        }

        // Log dos primeiros 100 lançamentos para debug
        if (index < 100) {
          console.log(`Lançamento ${index + 1}:`, {
            data: entry.data,
            debito: entry.debito,
            credito: entry.credito,
            valor: valor,
            tipo: entry.tipo,
            saldoCalculado: saldo.toFixed(2),
            historico: entry.historico.substring(0, 50)
          });
        }
      }

      entry.saldoParcial = saldo;
    });

    console.log('💰 Saldo final calculado:', saldo);
    console.log('💰 Saldo esperado da conta:', account.saldo);

    setCombinedEntries(allEntries);
    setFilteredEntries(allEntries);

    console.log('✅ Estados atualizados!');
    console.log('✅ combinedEntries:', allEntries.length);
    console.log('✅ filteredEntries:', allEntries.length);
    console.log('✅ Saldo final calculado:', saldo);
    console.log('🔍 === FIM loadAccountDetails ===');
  };

  const determineGrupo = (lanc: ProcessedEntry): string => {
    const hist = (lanc.historico || '').toLowerCase();
    if (hist.includes('projeto')) return 'Projeto';
    if (hist.includes('grant')) return 'Grants';
    if (hist.includes('importação')) return 'Importação';
    if (hist.includes('tep')) return 'TEP';
    if (hist.includes('adm')) return 'ADM';
    return 'Outros';
  };

  const parseDate = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date();
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const parseBRDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const handleEdit = (entry: CombinedEntry) => {
    setEditingEntry({ ...entry });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry || !selectedAccount) return;

    // Atualizar o lançamento correspondente
    if (editingEntry.tipo === 'FINANCEIRO') {
      const store = loadImportedAccounts();
      const accountIndex = store.accounts.findIndex(a => a.id === selectedAccount.id);
      if (accountIndex >= 0) {
        const lancIndex = store.accounts[accountIndex].lancamentos.findIndex(l => l.id === editingEntry.id);
        if (lancIndex >= 0) {
          store.accounts[accountIndex].lancamentos[lancIndex] = {
            ...store.accounts[accountIndex].lancamentos[lancIndex],
            data: editingEntry.data,
            debito: editingEntry.debito,
            credito: editingEntry.credito,
            centroCusto: editingEntry.centroCusto,
            historico: editingEntry.historico,
            valor: editingEntry.valor,
          };
          saveImportedAccounts(store);
        }
      }
    } else if (editingEntry.tipo === 'TRANSFERENCIA') {
      const updatedStore = { ...transferStore };

      // Atualizar em pending
      const pendingIndex = updatedStore.pending.findIndex(t => t.id === editingEntry.id);
      if (pendingIndex >= 0) {
        updatedStore.pending[pendingIndex] = {
          ...updatedStore.pending[pendingIndex],
          date: editingEntry.data,
          historico: editingEntry.historico,
          amount: editingEntry.valor,
          centroCusto: editingEntry.centroCusto,
        };
      }

      // Atualizar em paired
      updatedStore.paired.forEach(pair => {
        if (pair.outTransfer.id === editingEntry.id) {
          pair.outTransfer = {
            ...pair.outTransfer,
            date: editingEntry.data,
            historico: editingEntry.historico,
            amount: editingEntry.valor,
            centroCusto: editingEntry.centroCusto,
          };
        }
        if (pair.inTransfer.id === editingEntry.id) {
          pair.inTransfer = {
            ...pair.inTransfer,
            date: editingEntry.data,
            historico: editingEntry.historico,
            amount: editingEntry.valor,
            centroCusto: editingEntry.centroCusto,
          };
        }
      });

      updateTransferStore(updatedStore);
    }

    setEditDialogOpen(false);
    setEditingEntry(null);
    loadAccountDetails(selectedAccount);
  };

  const handleDelete = (entry: CombinedEntry) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    if (!selectedAccount) return;

    if (entry.tipo === 'FINANCEIRO') {
      const store = loadImportedAccounts();
      const accountIndex = store.accounts.findIndex(a => a.id === selectedAccount.id);
      if (accountIndex >= 0) {
        store.accounts[accountIndex].lancamentos = store.accounts[accountIndex].lancamentos.filter(
          l => l.id !== entry.id
        );
        saveImportedAccounts(store);
      }
    } else if (entry.tipo === 'TRANSFERENCIA') {
      const updatedStore = { ...transferStore };
      updatedStore.pending = updatedStore.pending.filter(t => t.id !== entry.id);
      updatedStore.paired = updatedStore.paired.filter(p =>
        p.outTransfer.id !== entry.id && p.inTransfer.id !== entry.id
      );
      updateTransferStore(updatedStore);
    }

    loadAccountDetails(selectedAccount);
  };

  const handleExport = () => {
    if (!selectedAccount) return;
    const csv = generateCSV(selectedAccount.lancamentos);
    const filename = generateFilename(
      selectedAccount.contaBancaria.numeroConta,
      selectedAccount.contaBancaria.tipoAplicacao
    );
    downloadCSV(csv, filename);
  };

  // Seleção múltipla
  const handleSelectAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map(e => e.id));
    }
  };

  const handleSelectEntry = (id: string) => {
    if (selectedEntries.includes(id)) {
      setSelectedEntries(selectedEntries.filter(eid => eid !== id));
    } else {
      setSelectedEntries([...selectedEntries, id]);
    }
  };

  // Exclusão em massa
  const handleBulkDelete = () => {
    if (selectedEntries.length === 0) {
      alert('Selecione pelo menos um lançamento');
      return;
    }
    if (!confirm(`Deseja realmente excluir ${selectedEntries.length} lançamento(s)?`)) return;
    if (!selectedAccount) return;

    const store = loadImportedAccounts();
    const updatedTransferStore = { ...transferStore };
    const accountIndex = store.accounts.findIndex(a => a.id === selectedAccount.id);

    selectedEntries.forEach(entryId => {
      const entry = combinedEntries.find(e => e.id === entryId);
      if (!entry) return;

      if (entry.tipo === 'FINANCEIRO' && accountIndex >= 0) {
        store.accounts[accountIndex].lancamentos = store.accounts[accountIndex].lancamentos.filter(
          l => l.id !== entryId
        );
      } else if (entry.tipo === 'TRANSFERENCIA') {
        updatedTransferStore.pending = updatedTransferStore.pending.filter(t => t.id !== entryId);
        updatedTransferStore.paired = updatedTransferStore.paired.filter(p =>
          p.outTransfer.id !== entryId && p.inTransfer.id !== entryId
        );
      }
    });

    saveImportedAccounts(store);
    updateTransferStore(updatedTransferStore);
    setSelectedEntries([]);
    loadAccountDetails(selectedAccount);
  };

  // Find & Replace
  const handleFindReplace = () => {
    if (!findText) {
      alert('Digite o texto a ser encontrado');
      return;
    }
    if (!selectedAccount) return;

    let replacedCount = 0;
    const store = loadImportedAccounts();
    const updatedTransferStore = { ...transferStore };
    const accountIndex = store.accounts.findIndex(a => a.id === selectedAccount.id);

    if (accountIndex >= 0) {
      store.accounts[accountIndex].lancamentos.forEach(lanc => {
        if (lanc.historico.includes(findText)) {
          lanc.historico = lanc.historico.replace(new RegExp(findText, 'g'), replaceText);
          replacedCount++;
        }
      });
    }

    // Atualizar transferências
    updatedTransferStore.pending.forEach(t => {
      if (t.accountNumber === selectedAccount.contaBancaria.numeroConta && t.historico.includes(findText)) {
        t.historico = t.historico.replace(new RegExp(findText, 'g'), replaceText);
        replacedCount++;
      }
    });

    updatedTransferStore.paired.forEach(p => {
      if (p.outTransfer.accountNumber === selectedAccount.contaBancaria.numeroConta && p.outTransfer.historico.includes(findText)) {
        p.outTransfer.historico = p.outTransfer.historico.replace(new RegExp(findText, 'g'), replaceText);
        replacedCount++;
      }
      if (p.inTransfer.accountNumber === selectedAccount.contaBancaria.numeroConta && p.inTransfer.historico.includes(findText)) {
        p.inTransfer.historico = p.inTransfer.historico.replace(new RegExp(findText, 'g'), replaceText);
        replacedCount++;
      }
    });

    saveImportedAccounts(store);
    updateTransferStore(updatedTransferStore);
    setFindReplaceDialogOpen(false);
    setFindText('');
    setReplaceText('');
    alert(`${replacedCount} ocorrência(s) substituída(s)`);
    loadAccountDetails(selectedAccount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (!selectedAccount) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Financeiro
        </Typography>

        {accounts.length === 0 ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            Nenhuma conta importada ainda. Vá para a página de Importar para começar.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 3 }}>
            {accounts.map((account) => (
              <Card key={account.id} sx={{ cursor: 'pointer' }} onClick={() => loadAccountDetails(account)}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <BankIcon banco={account.contaBancaria.banco} />
                      <Box>
                        <Typography variant="h6">
                          Conta {account.contaBancaria.numeroConta}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.contaBancaria.codigoContabil} - {account.contaBancaria.descricao}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h5" color="primary">
                      {formatCurrency(account.saldo)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedAccount(null)} sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BankIcon banco={selectedAccount.contaBancaria.banco} />
              <Box>
                <Typography variant="h5">
                  Conta {selectedAccount.contaBancaria.numeroConta}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedAccount.contaBancaria.codigoContabil} - {selectedAccount.contaBancaria.descricao}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h4" color="primary">
                {formatCurrency(combinedEntries[combinedEntries.length - 1]?.saldoParcial || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saldo Final
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ mt: 2 }}
          >
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Todos os Lançamentos ({filteredEntries.length} de {combinedEntries.length})
          </Typography>

          {/* Filtros */}
          <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon fontSize="small" />
              Filtros e Ordenação
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={2}>
                <TextField
                  placeholder="Data Início (dd/mm/aaaa)"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  placeholder="Data Fim (dd/mm/aaaa)"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    label="Tipo"
                  >
                    <MenuItem value="TODOS">Todos</MenuItem>
                    <MenuItem value="FINANCEIRO">Financeiro</MenuItem>
                    <MenuItem value="TRANSFERENCIA">Transferência</MenuItem>
                    <MenuItem value="TAXA">Taxa</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Grupo</InputLabel>
                  <Select
                    value={filterGrupo}
                    onChange={(e) => setFilterGrupo(e.target.value)}
                    label="Grupo"
                  >
                    <MenuItem value="TODOS">Todos</MenuItem>
                    <MenuItem value="Projeto">Projeto</MenuItem>
                    <MenuItem value="Grants">Grants</MenuItem>
                    <MenuItem value="Importação">Importação</MenuItem>
                    <MenuItem value="TEP">TEP</MenuItem>
                    <MenuItem value="ADM">ADM</MenuItem>
                    <MenuItem value="Transferência">Transferência</MenuItem>
                    <MenuItem value="Taxa Administração">Taxa Administração</MenuItem>
                    <MenuItem value="Outros">Outros</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Buscar (histórico, débito, crédito)"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ordenar por</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    label="Ordenar por"
                  >
                    <MenuItem value="data">Data</MenuItem>
                    <MenuItem value="valor">Valor</MenuItem>
                    <MenuItem value="tipo">Tipo</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Ordem</InputLabel>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    label="Ordem"
                  >
                    <MenuItem value="asc">Crescente</MenuItem>
                    <MenuItem value="desc">Decrescente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>

          {/* Ações em Massa */}
          {selectedEntries.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">
                  {selectedEntries.length} lançamento(s) selecionado(s)
                </Typography>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleBulkDelete}
                >
                  Excluir Selecionados
                </Button>
              </Stack>
            </Alert>
          )}

          {/* Botões de Ação */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              size="small"
              startIcon={<FindReplaceIcon />}
              onClick={() => setFindReplaceDialogOpen(true)}
              variant="outlined"
            >
              Localizar e Substituir
            </Button>
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                      indeterminate={selectedEntries.length > 0 && selectedEntries.length < filteredEntries.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Débito</TableCell>
                  <TableCell>Crédito</TableCell>
                  <TableCell>Centro Custo</TableCell>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Histórico</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="right">Saldo Parcial</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onChange={() => handleSelectEntry(entry.id)}
                      />
                    </TableCell>
                    <TableCell>{entry.data}</TableCell>
                    <TableCell>{entry.debito || '-'}</TableCell>
                    <TableCell>{entry.credito || '-'}</TableCell>
                    <TableCell>{entry.centroCusto || '-'}</TableCell>
                    <TableCell>
                      <Chip label={entry.grupo} size="small" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>{entry.historico}</TableCell>
                    <TableCell align="right">
                      <Typography
                        color={
                          entry.original?.valorDebito ? 'error.main' : 
                          entry.original?.valorCredito ? 'info.main' : 
                          'inherit'
                        }
                        fontWeight="medium"
                      >
                        {formatCurrency(entry.valor)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        color={entry.saldoParcial >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {formatCurrency(entry.saldoParcial)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.tipo}
                        size="small"
                        color={
                          entry.tipo === 'FINANCEIRO' ? 'primary' :
                          entry.tipo === 'TRANSFERENCIA' ? 'secondary' : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(entry)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(entry)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Lançamento</DialogTitle>
        <DialogContent>
          {editingEntry && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Data"
                value={editingEntry.data}
                onChange={(e) => setEditingEntry({ ...editingEntry, data: e.target.value })}
                fullWidth
              />
              <TextField
                label="Débito"
                value={editingEntry.debito}
                onChange={(e) => setEditingEntry({ ...editingEntry, debito: e.target.value })}
                fullWidth
              />
              <TextField
                label="Crédito"
                value={editingEntry.credito}
                onChange={(e) => setEditingEntry({ ...editingEntry, credito: e.target.value })}
                fullWidth
              />
              <TextField
                label="Centro de Custo"
                value={editingEntry.centroCusto}
                onChange={(e) => setEditingEntry({ ...editingEntry, centroCusto: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Grupo</InputLabel>
                <Select
                  value={editingEntry.grupo}
                  onChange={(e) => setEditingEntry({ ...editingEntry, grupo: e.target.value })}
                  label="Grupo"
                >
                  <MenuItem value="Projeto">Projeto</MenuItem>
                  <MenuItem value="Grants">Grants</MenuItem>
                  <MenuItem value="Importação">Importação</MenuItem>
                  <MenuItem value="TEP">TEP</MenuItem>
                  <MenuItem value="ADM">ADM</MenuItem>
                  <MenuItem value="Transferência">Transferência</MenuItem>
                  <MenuItem value="Taxa Administração">Taxa Administração</MenuItem>
                  <MenuItem value="Outros">Outros</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Histórico"
                value={editingEntry.historico}
                onChange={(e) => setEditingEntry({ ...editingEntry, historico: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                label="Valor"
                value={editingEntry.valor}
                onChange={(e) => setEditingEntry({ ...editingEntry, valor: e.target.value })}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Localizar e Substituir */}
      <Dialog open={findReplaceDialogOpen} onClose={() => setFindReplaceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Localizar e Substituir no Histórico</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Localizar"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              fullWidth
              placeholder="Digite o texto a ser encontrado"
            />
            <TextField
              label="Substituir por"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              fullWidth
              placeholder="Digite o texto de substituição"
            />
            <Alert severity="info">
              Esta operação irá substituir todas as ocorrências do texto no histórico dos lançamentos desta conta.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFindReplaceDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleFindReplace} variant="contained" color="primary">
            Substituir Tudo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
