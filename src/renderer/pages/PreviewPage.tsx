import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { Download, Edit, ArrowBack, Warning as WarningIcon } from '@mui/icons-material';
import { useAppContext } from '../AppContext';
import { ProcessedEntry } from '../types/Entry';
import { generateCSV, downloadCSV, generateFilename } from '../services/csvExporter';
import { loadImportedAccounts } from '../services/importedAccountsService';
import { ImportedAccount } from '../types/ImportedAccount';
import { formatAccountNumber } from '../utils/formatters';
import BankIcon from '../components/BankIcon';
import { mappingService } from '../services/mappingService';
import { getTaxasPendentes, getTaxasPareadas, getTaxasProcessadas } from '../services/taxaAdministracaoService';

export default function PreviewPage() {
  const navigate = useNavigate();
  const { processedEntries, setProcessedEntries, selectedAccount, transferStore } = useAppContext();
  const [editDialog, setEditDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProcessedEntry | null>(null);
  const [importedAccounts, setImportedAccounts] = useState<ImportedAccount[]>([]);
  const [selectedImportedAccount, setSelectedImportedAccount] = useState<ImportedAccount | null>(null);
  const [entries, setEntries] = useState<ProcessedEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'errors' | 'warnings' | 'ok'>('all');
  const [filterType, setFilterType] = useState<'all' | 'FINANCEIRO' | 'TRANSFERENCIA' | 'TX_ADM'>('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    // Carregar contas importadas
    const store = loadImportedAccounts();
    setImportedAccounts(store.accounts);

    // Se há processedEntries do contexto, usar eles
    if (processedEntries.length > 0) {
      setEntries(processedEntries);
    } else if (store.accounts.length > 0) {
      // Caso contrário, usar a primeira conta importada
      setSelectedImportedAccount(store.accounts[0]);
      setEntries(store.accounts[0].lancamentos);
    }
  }, [processedEntries]);

  const handleAccountChange = (accountId: string) => {
    const account = importedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedImportedAccount(account);
      setEntries(account.lancamentos);
    }
  };

  const currentAccount = selectedImportedAccount?.contaBancaria || selectedAccount;

  // Obter transferências e taxas de administração
  const allTransfers = transferStore.pending.concat(
    transferStore.paired.flatMap(p => [p.outTransfer, p.inTransfer])
  );

  const taxasPendentes = getTaxasPendentes();
  const taxasPareadas = getTaxasPareadas();
  const taxasProcessadas = getTaxasProcessadas();

  // Criar entradas para transferências
  const transferEntries: ProcessedEntry[] = allTransfers.map(t => ({
    id: t.id,
    data: t.date,
    debito: t.direction === 'OUT' ? t.accountCode : '',
    credito: t.direction === 'IN' ? t.accountCode : '',
    centroCusto: t.centroCusto,
    historico: t.historico,
    valor: t.amount,
    tipo: 'TRANSFERENCIA' as const,
    original: t.original,
    errors: [],
    warnings: []
  }));

  // Criar entradas para taxas de administração
  const taxaEntries: ProcessedEntry[] = [
    ...taxasPendentes,
    ...taxasPareadas,
    ...taxasProcessadas
  ].flatMap(taxa => {
    const entries: ProcessedEntry[] = [];
    if (taxa.transferOut) {
      entries.push({
        id: `taxa-out-${taxa.id}`,
        data: taxa.transferOut.date,
        debito: taxa.transferOut.accountCode,
        credito: '',
        centroCusto: '',
        historico: taxa.transferOut.historico,
        valor: taxa.transferOut.amount,
        tipo: 'TX_ADM' as const,
        original: {} as any,
        errors: [],
        warnings: []
      });
    }
    if (taxa.transferIn) {
      entries.push({
        id: `taxa-in-${taxa.id}`,
        data: taxa.transferIn.date,
        debito: '',
        credito: taxa.transferIn.accountCode,
        centroCusto: '',
        historico: taxa.transferIn.historico,
        valor: taxa.transferIn.amount,
        tipo: 'TX_ADM' as const,
        original: {} as any,
        errors: [],
        warnings: []
      });
    }
    return entries;
  });

  // Combinar todos os lançamentos
  const allEntries = [...entries, ...transferEntries, ...taxaEntries];

  // Filtrar por status
  const filteredByStatus = allEntries.filter(entry => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'errors') return entry.errors && entry.errors.length > 0;
    if (filterStatus === 'warnings') return entry.warnings && entry.warnings.length > 0;
    if (filterStatus === 'ok') return (!entry.errors || entry.errors.length === 0) && (!entry.warnings || entry.warnings.length === 0);
    return true;
  });

  // Filtrar por tipo
  const filteredByType = filteredByStatus.filter(entry => {
    if (filterType === 'all') return true;
    return entry.tipo === filterType;
  });

  // Filtrar por data
  const filteredEntries = filteredByType.filter(entry => {
    if (dataInicio || dataFim) {
      const entryDate = entry.data; // formato dd/mm/yyyy
      const [day, month, year] = entryDate.split('/');
      const entryDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (dataInicio) {
        const inicioObj = new Date(dataInicio);
        if (entryDateObj < inicioObj) return false;
      }

      if (dataFim) {
        const fimObj = new Date(dataFim);
        if (entryDateObj > fimObj) return false;
      }
    }

    return true;
  });

  const hasEmptyHistorico = (entry: ProcessedEntry) => {
    return !entry.historico || entry.historico.trim() === '';
  };

  const lancamentosSemHistorico = allEntries.filter(hasEmptyHistorico).length;

  const getRubricaName = (codigo: string): string => {
    if (!codigo) return '';
    const classificacoes = mappingService.getClassificacoes();
    const rubrica = classificacoes.find(c => c.codigoContabil === codigo);
    return rubrica?.descricao || '';
  };

  if (!currentAccount || allEntries.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Preview de Lançamentos
        </Typography>
        <Alert severity="warning">
          Nenhum lançamento processado. Volte para a página de importação ou contas.
        </Alert>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
          >
            Voltar para Importação
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/contas')}
          >
            Ver Contas Importadas
          </Button>
        </Stack>
      </Box>
    );
  }

  const currentSaldo = selectedImportedAccount?.saldo || 0;

  const handleEdit = (entry: ProcessedEntry) => {
    setEditingEntry(entry);
    setEditDialog(true);
  };

  const handleSaveEdit = (updatedEntry: ProcessedEntry) => {
    if (selectedImportedAccount) {
      // Atualizar na conta importada
      const { updateLancamento } = require('../services/importedAccountsService');
      updateLancamento(selectedImportedAccount.id, updatedEntry.id, updatedEntry);

      // Atualizar estado local
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    } else {
      // Atualizar no contexto (fluxo antigo)
      const updated = processedEntries.map((e) =>
        e.id === updatedEntry.id ? updatedEntry : e
      );
      setProcessedEntries(updated);
    }
    setEditDialog(false);
  };

  const handleExport = () => {
    const csv = generateCSV(entries);
    const filename = generateFilename(
      currentAccount.numeroConta,
      currentAccount.tipoAplicacao
    );
    downloadCSV(csv, filename);
  };

  const columns: GridColDef[] = [
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        const entry = params.row as ProcessedEntry;
        if (entry.errors && entry.errors.length > 0) {
          return <Chip label="Erro" color="error" size="small" />;
        }
        if (entry.warnings && entry.warnings.length > 0) {
          return <Chip label="Aviso" color="warning" size="small" />;
        }
        return <Chip label="OK" color="success" size="small" />;
      },
    },
    { field: 'data', headerName: 'Data', width: 120 },
    { field: 'debito', headerName: 'Débito', width: 150 },
    { field: 'credito', headerName: 'Crédito', width: 150 },
    { field: 'centroCusto', headerName: 'Centro de Custo', width: 130 },
    {
      field: 'historico',
      headerName: 'Histórico',
      width: 250,
      flex: 1,
      renderCell: (params) => {
        const entry = params.row as ProcessedEntry;
        const isEmpty = hasEmptyHistorico(entry);

        if (isEmpty) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Histórico vazio - clique em editar para adicionar">
                <WarningIcon color="warning" fontSize="small" />
              </Tooltip>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                (sem histórico)
              </Typography>
            </Box>
          );
        }

        return params.value;
      }
    },
    { field: 'valor', headerName: 'Valor', width: 120 },
    {
      field: 'tipo',
      headerName: 'Tipo',
      width: 130,
      renderCell: (params) => {
        const colors: Record<string, any> = {
          FINANCEIRO: 'primary',
          TRANSFERENCIA: 'secondary',
          TX_ADM: 'warning'
        };
        return (
          <Chip
            label={params.value === 'TX_ADM' ? 'Tx Adm' : params.value === 'TRANSFERENCIA' ? 'Transferência' : 'Financeiro'}
            color={colors[params.value] || 'default'}
            size="small"
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleEdit(params.row as ProcessedEntry)}>
          <Edit fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const rows: GridRowsProp = filteredEntries.map((entry) => ({
    id: entry.id,
    status: entry,
    data: entry.data,
    debito: entry.debito,
    credito: entry.credito,
    centroCusto: entry.centroCusto,
    historico: entry.historico,
    valor: entry.valor,
    tipo: entry.tipo,
    errors: entry.errors,
    warnings: entry.warnings,
  }));

  const totalDebitos = allEntries.filter((e) => e.debito).length;
  const totalCreditos = allEntries.filter((e) => e.credito).length;
  const totalErros = allEntries.filter((e) => e.errors && e.errors.length > 0).length;
  const totalAvisos = allEntries.filter((e) => e.warnings && e.warnings.length > 0).length;
  const totalOk = allEntries.filter((e) => (!e.errors || e.errors.length === 0) && (!e.warnings || e.warnings.length === 0)).length;
  const totalFinanceiro = allEntries.filter((e) => e.tipo === 'FINANCEIRO').length;
  const totalTransferencias = allEntries.filter((e) => e.tipo === 'TRANSFERENCIA').length;
  const totalTxAdm = allEntries.filter((e) => e.tipo === 'TX_ADM').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Preview de Lançamentos</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/')}>
            Voltar
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={totalErros > 0}
          >
            Exportar CSV
          </Button>
        </Stack>
      </Box>

      {importedAccounts.length > 1 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Selecionar Conta</InputLabel>
              <Select
                value={selectedImportedAccount?.id || ''}
                label="Selecionar Conta"
                onChange={(e) => handleAccountChange(e.target.value)}
              >
                {importedAccounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BankIcon banco={acc.contaBancaria.banco} size={20} />
                      {formatAccountNumber(acc.contaBancaria.numeroConta)} - {acc.contaBancaria.codigoContabil}
                      {acc.contaBancaria.tipoAplicacao && ` (${acc.contaBancaria.tipoAplicacao})`}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <BankIcon banco={currentAccount.banco} size={32} />
            <Box>
              <Typography variant="h6">
                Conta: {formatAccountNumber(currentAccount.numeroConta)} - {currentAccount.codigoContabil}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saldo: R$ {currentSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total de Lançamentos
              </Typography>
              <Typography variant="h6">{allEntries.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Débitos
              </Typography>
              <Typography variant="h6">{totalDebitos}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Créditos
              </Typography>
              <Typography variant="h6">{totalCreditos}</Typography>
            </Box>
            {totalErros > 0 && (
              <Box>
                <Typography variant="body2" color="error">
                  Erros
                </Typography>
                <Typography variant="h6" color="error">
                  {totalErros}
                </Typography>
              </Box>
            )}
            {totalAvisos > 0 && (
              <Box>
                <Typography variant="body2" color="warning.main">
                  Avisos
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {totalAvisos}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Filtros de Status */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Chip
              label={`Todos (${allEntries.length})`}
              onClick={() => setFilterStatus('all')}
              color={filterStatus === 'all' ? 'primary' : 'default'}
              variant={filterStatus === 'all' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Erros (${totalErros})`}
              onClick={() => setFilterStatus('errors')}
              color={filterStatus === 'errors' ? 'error' : 'default'}
              variant={filterStatus === 'errors' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Avisos (${totalAvisos})`}
              onClick={() => setFilterStatus('warnings')}
              color={filterStatus === 'warnings' ? 'warning' : 'default'}
              variant={filterStatus === 'warnings' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`OK (${totalOk})`}
              onClick={() => setFilterStatus('ok')}
              color={filterStatus === 'ok' ? 'success' : 'default'}
              variant={filterStatus === 'ok' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>

          {/* Filtros de Tipo */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Chip
              label={`Todos Tipos (${allEntries.length})`}
              onClick={() => setFilterType('all')}
              color={filterType === 'all' ? 'primary' : 'default'}
              variant={filterType === 'all' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Financeiro (${totalFinanceiro})`}
              onClick={() => setFilterType('FINANCEIRO')}
              color={filterType === 'FINANCEIRO' ? 'primary' : 'default'}
              variant={filterType === 'FINANCEIRO' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Transferências (${totalTransferencias})`}
              onClick={() => setFilterType('TRANSFERENCIA')}
              color={filterType === 'TRANSFERENCIA' ? 'secondary' : 'default'}
              variant={filterType === 'TRANSFERENCIA' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Tx Adm (${totalTxAdm})`}
              onClick={() => setFilterType('TX_ADM')}
              color={filterType === 'TX_ADM' ? 'warning' : 'default'}
              variant={filterType === 'TX_ADM' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>

          {/* Filtros de Data */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Data Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ width: 200 }}
            />
            <TextField
              label="Data Fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ width: 200 }}
            />
            {(dataInicio || dataFim) && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setDataInicio('');
                  setDataFim('');
                }}
              >
                Limpar Datas
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {lancamentosSemHistorico > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          <Typography variant="body2">
            <strong>{lancamentosSemHistorico} lançamento(s)</strong> sem histórico informado.
            Clique no ícone de edição para adicionar o histórico antes de exportar.
          </Typography>
        </Alert>
      )}

      {totalErros > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Existem {totalErros} lançamento(s) com erro. Corrija os erros antes de exportar.
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
              }}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>

      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          open={editDialog}
          onClose={() => setEditDialog(false)}
          onSave={handleSaveEdit}
        />
      )}
    </Box>
  );
}

function EditEntryDialog({
  entry,
  open,
  onClose,
  onSave,
}: {
  entry: ProcessedEntry;
  open: boolean;
  onClose: () => void;
  onSave: (entry: ProcessedEntry) => void;
}) {
  const [formData, setFormData] = useState(entry);

  React.useEffect(() => {
    setFormData(entry);
  }, [entry]);

  const handleSubmit = () => {
    onSave(formData);
  };

  const getRubricaName = (codigo: string): string => {
    if (!codigo) return '';
    const classificacoes = mappingService.getClassificacoes();
    const rubrica = classificacoes.find(c => c.codigoContabil === codigo);
    return rubrica?.descricao || '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Editar Lançamento</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Data"
            fullWidth
            value={formData.data}
            onChange={(e) => setFormData({ ...formData, data: e.target.value })}
          />
          <Box>
            <TextField
              label="Débito"
              fullWidth
              value={formData.debito}
              onChange={(e) => setFormData({ ...formData, debito: e.target.value })}
            />
            {formData.debito && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {getRubricaName(formData.debito)}
              </Typography>
            )}
          </Box>
          <Box>
            <TextField
              label="Crédito"
              fullWidth
              value={formData.credito}
              onChange={(e) => setFormData({ ...formData, credito: e.target.value })}
            />
            {formData.credito && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {getRubricaName(formData.credito)}
              </Typography>
            )}
          </Box>
          <TextField
            label="Centro de Custo"
            fullWidth
            value={formData.centroCusto}
            onChange={(e) => setFormData({ ...formData, centroCusto: e.target.value })}
          />
          <TextField
            label="Histórico"
            fullWidth
            multiline
            rows={3}
            value={formData.historico}
            onChange={(e) => setFormData({ ...formData, historico: e.target.value })}
          />
          <TextField
            label="Valor"
            fullWidth
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
