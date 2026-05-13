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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { loadImportedAccounts, saveImportedAccounts } from '../services/importedAccountsService';
import { loadTransferStore, saveTransferStore } from '../services/transferStore';
import { loadTaxasAdministracao } from '../services/taxaAdministracaoService';
import { ImportedAccount } from '../types/ImportedAccount';
import { ProcessedEntry } from '../types/Entry';
import { generateCSV, downloadCSV, generateFilename } from '../services/csvExporter';
import BankIcon from '../components/BankIcon';

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
  const [accounts, setAccounts] = useState<ImportedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<ImportedAccount | null>(null);
  const [combinedEntries, setCombinedEntries] = useState<CombinedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CombinedEntry | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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
    setSelectedAccount(account);

    // Carregar lançamentos financeiros
    const financialEntries: CombinedEntry[] = account.lancamentos.map(lanc => ({
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

    // Carregar transferências
    const transferStore = loadTransferStore();
    const accountTransfers = [
      ...transferStore.pending.filter(t => t.accountNumber === account.contaBancaria.numeroConta),
      ...transferStore.paired.flatMap(p => {
        const transfers = [];
        if (p.outTransfer.accountNumber === account.contaBancaria.numeroConta) {
          transfers.push(p.outTransfer);
        }
        if (p.inTransfer.accountNumber === account.contaBancaria.numeroConta) {
          transfers.push(p.inTransfer);
        }
        return transfers;
      })
    ];

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
    const taxas = loadTaxasAdministracao();
    const accountTaxas = taxas.filter(t => t.accountNumber === account.contaBancaria.numeroConta);

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
    allEntries.sort((a, b) => {
      const dateA = parseDate(a.data);
      const dateB = parseDate(b.data);
      return dateA.getTime() - dateB.getTime();
    });

    // Calcular saldo parcial
    let saldo = 0;
    allEntries.forEach(entry => {
      const valor = parseFloat(entry.valor.replace(',', '.'));

      // Se débito = conta bancária, é saída (-)
      // Se crédito = conta bancária, é entrada (+)
      if (entry.debito === account.contaBancaria.codigoContabil) {
        saldo -= valor;
      } else if (entry.credito === account.contaBancaria.codigoContabil) {
        saldo += valor;
      }

      entry.saldoParcial = saldo;
    });

    setCombinedEntries(allEntries);
  };

  const determineGrupo = (lanc: ProcessedEntry): string => {
    const hist = lanc.historico.toLowerCase();
    if (hist.includes('projeto')) return 'Projeto';
    if (hist.includes('grant')) return 'Grants';
    if (hist.includes('importação')) return 'Importação';
    if (hist.includes('tep')) return 'TEP';
    if (hist.includes('adm')) return 'ADM';
    return 'Outros';
  };

  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
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
      const transferStore = loadTransferStore();

      // Atualizar em pending
      const pendingIndex = transferStore.pending.findIndex(t => t.id === editingEntry.id);
      if (pendingIndex >= 0) {
        transferStore.pending[pendingIndex] = {
          ...transferStore.pending[pendingIndex],
          date: editingEntry.data,
          historico: editingEntry.historico,
          amount: editingEntry.valor,
          centroCusto: editingEntry.centroCusto,
        };
      }

      // Atualizar em paired
      transferStore.paired.forEach(pair => {
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

      saveTransferStore(transferStore);
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
      const transferStore = loadTransferStore();
      transferStore.pending = transferStore.pending.filter(t => t.id !== entry.id);
      transferStore.paired = transferStore.paired.filter(p =>
        p.outTransfer.id !== entry.id && p.inTransfer.id !== entry.id
      );
      saveTransferStore(transferStore);
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
            Todos os Lançamentos ({combinedEntries.length})
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
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
                {combinedEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{entry.data}</TableCell>
                    <TableCell>{entry.debito || '-'}</TableCell>
                    <TableCell>{entry.credito || '-'}</TableCell>
                    <TableCell>{entry.centroCusto || '-'}</TableCell>
                    <TableCell>
                      <Chip label={entry.grupo} size="small" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>{entry.historico}</TableCell>
                    <TableCell align="right">{formatCurrency(entry.valor)}</TableCell>
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
    </Box>
  );
}
