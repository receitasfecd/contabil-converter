import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Stack,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  getImportedAccount,
  updateLancamento,
  deleteLancamento,
} from '../services/importedAccountsService';
import { generateBalancete, downloadBalanceteCSV } from '../services/balanceteService';
import { ImportedAccount, BalanceteItem } from '../types/ImportedAccount';
import { ProcessedEntry } from '../types/Entry';
import { useAppContext } from '../AppContext';
import { mappingService } from '../services/mappingService';

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { updateLancamentoHistorico } = useAppContext();
  const [account, setAccount] = useState<ImportedAccount | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLancamento, setSelectedLancamento] = useState<ProcessedEntry | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [balancete, setBalancete] = useState<BalanceteItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'errors' | 'warnings' | 'ok'>('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const loadAccount = () => {
    if (accountId) {
      const acc = getImportedAccount(accountId);
      setAccount(acc || null);
      if (acc) {
        const bal = generateBalancete(acc.lancamentos);
        setBalancete(bal);
      }
    }
  };

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  const handleEdit = (lancamento: ProcessedEntry) => {
    setSelectedLancamento(lancamento);
    setEditDialogOpen(true);
  };

  const handleDelete = (lancamentoId: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      if (accountId) {
        deleteLancamento(accountId, lancamentoId);
        loadAccount();
      }
    }
  };

  const handleSaveEdit = () => {
    if (selectedLancamento && accountId) {
      updateLancamento(accountId, selectedLancamento.id, selectedLancamento);
      setEditDialogOpen(false);
      setSelectedLancamento(null);
      loadAccount();
    }
  };

  const handleQuickEditHistorico = (lancamentoId: string, novoHistorico: string) => {
    if (accountId) {
      updateLancamentoHistorico(accountId, lancamentoId, novoHistorico);
      loadAccount();
    }
  };

  const getRubricaName = (codigo: string): string => {
    if (!codigo) return '';
    const classificacoes = mappingService.getClassificacoes();
    const rubrica = classificacoes.find(c => c.codigoContabil === codigo);
    return rubrica?.descricao || '';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (entry: ProcessedEntry) => {
    if (entry.errors && entry.errors.length > 0) return 'error';
    if (entry.warnings && entry.warnings.length > 0) return 'warning';
    return 'success';
  };

  const hasEmptyHistorico = (entry: ProcessedEntry) => {
    return !entry.historico || entry.historico.trim() === '';
  };

  const lancamentosSemHistorico = account?.lancamentos.filter(hasEmptyHistorico).length || 0;

  // Filtrar lançamentos por status e data
  const filteredLancamentos = account?.lancamentos.filter(entry => {
    // Filtro de status
    if (filterStatus === 'errors' && (!entry.errors || entry.errors.length === 0)) return false;
    if (filterStatus === 'warnings' && (!entry.warnings || entry.warnings.length === 0)) return false;
    if (filterStatus === 'ok' && ((entry.errors && entry.errors.length > 0) || (entry.warnings && entry.warnings.length > 0))) return false;

    // Filtro de data
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
  }) || [];

  // Contar por status
  const countErrors = account?.lancamentos.filter(e => e.errors && e.errors.length > 0).length || 0;
  const countWarnings = account?.lancamentos.filter(e => e.warnings && e.warnings.length > 0).length || 0;
  const countOk = account?.lancamentos.filter(e => (!e.errors || e.errors.length === 0) && (!e.warnings || e.warnings.length === 0)).length || 0;

  const columns: GridColDef[] = [
    { field: 'data', headerName: 'Data', width: 110 },
    { field: 'debito', headerName: 'Débito', width: 150 },
    { field: 'credito', headerName: 'Crédito', width: 150 },
    { field: 'centroCusto', headerName: 'Centro de Custo', width: 130 },
    {
      field: 'historico',
      headerName: 'Histórico',
      flex: 1,
      minWidth: 200,
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
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'TRANSFERENCIA' ? 'secondary' : 'primary'}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        const entry = params.row as ProcessedEntry;
        const color = getStatusColor(entry);
        return (
          <Chip
            label={color === 'success' ? 'OK' : color === 'warning' ? 'Aviso' : 'Erro'}
            size="small"
            color={color}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleEdit(params.row as ProcessedEntry)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const balanceteColumns: GridColDef[] = [
    { field: 'codigo', headerName: 'Código', width: 150 },
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 250 },
    { field: 'nivel', headerName: 'Nível', width: 80 },
    {
      field: 'saldoDevedor',
      headerName: 'Saldo Devedor',
      width: 150,
      renderCell: (params) => formatCurrency(params.value as number),
    },
    {
      field: 'saldoCredor',
      headerName: 'Saldo Credor',
      width: 150,
      renderCell: (params) => formatCurrency(params.value as number),
    },
    {
      field: 'saldo',
      headerName: 'Saldo',
      width: 150,
      renderCell: (params) => {
        const value = params.value as number;
        return (
          <Typography color={value >= 0 ? 'success.main' : 'error.main'}>
            {formatCurrency(Math.abs(value))} {value >= 0 ? 'D' : 'C'}
          </Typography>
        );
      },
    },
  ];

  const handleExportBalancete = () => {
    if (account) {
      const filename = `balancete-${account.contaBancaria.numeroConta}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadBalanceteCSV(balancete, filename);
    }
  };

  if (!account) {
    return (
      <Box>
        <Alert severity="error">Conta não encontrada</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/contas')}>
          Voltar
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/contas')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">
            Conta {account.contaBancaria.numeroConta}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {account.contaBancaria.codigoContabil}
          </Typography>
        </Box>
        <Chip
          label={
            account.contaBancaria.tipoAplicacao
              ? `Aplicação ${account.contaBancaria.tipoAplicacao}`
              : 'Conta Corrente'
          }
          color={account.contaBancaria.tipoAplicacao ? 'secondary' : 'primary'}
        />
      </Box>

      {/* Resumo */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total de Lançamentos
              </Typography>
              <Typography variant="h5">{account.lancamentos.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Saldo da Conta
              </Typography>
              <Typography
                variant="h5"
                color={account.saldo >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(account.saldo)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Última Atualização
              </Typography>
              <Typography variant="body2">
                {new Date(account.lastUpdated).toLocaleString('pt-BR')}
              </Typography>
            </Box>
          </Stack>

          {/* Filtros de Status */}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Chip
              label={`Todos (${account.lancamentos.length})`}
              onClick={() => setFilterStatus('all')}
              color={filterStatus === 'all' ? 'primary' : 'default'}
              variant={filterStatus === 'all' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Débitos (${account.lancamentos.filter(e => e.debito).length})`}
              color="default"
              variant="outlined"
            />
            <Chip
              label={`Créditos (${account.lancamentos.filter(e => e.credito).length})`}
              color="default"
              variant="outlined"
            />
            <Chip
              label={`Erros (${countErrors})`}
              onClick={() => setFilterStatus('errors')}
              color={filterStatus === 'errors' ? 'error' : 'default'}
              variant={filterStatus === 'errors' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`Avisos (${countWarnings})`}
              onClick={() => setFilterStatus('warnings')}
              color={filterStatus === 'warnings' ? 'warning' : 'default'}
              variant={filterStatus === 'warnings' ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label={`OK (${countOk})`}
              onClick={() => setFilterStatus('ok')}
              color={filterStatus === 'ok' ? 'success' : 'default'}
              variant={filterStatus === 'ok' ? 'filled' : 'outlined'}
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

      {/* Aviso de lançamentos sem histórico */}
      {lancamentosSemHistorico > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <Typography variant="body2">
            <strong>{lancamentosSemHistorico} lançamento(s)</strong> sem histórico informado.
            Clique no ícone de edição para adicionar o histórico antes de exportar.
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Lançamentos" />
          <Tab label="Balancete" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {tabValue === 0 && (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={filteredLancamentos}
                columns={columns}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
                }}
                disableRowSelectionOnClick
              />
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Balancete Contábil
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={handleExportBalancete}
                >
                  Exportar CSV
                </Button>
              </Box>
              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={balancete}
                  columns={balanceteColumns}
                  getRowId={(row) => row.codigo}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  disableRowSelectionOnClick
                />
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Lançamento</DialogTitle>
        <DialogContent>
          {selectedLancamento && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Data"
                value={selectedLancamento.data}
                onChange={(e) =>
                  setSelectedLancamento({ ...selectedLancamento, data: e.target.value })
                }
                fullWidth
              />
              <Box>
                <TextField
                  label="Débito"
                  value={selectedLancamento.debito}
                  onChange={(e) =>
                    setSelectedLancamento({ ...selectedLancamento, debito: e.target.value })
                  }
                  fullWidth
                />
                {selectedLancamento.debito && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {getRubricaName(selectedLancamento.debito)}
                  </Typography>
                )}
              </Box>
              <Box>
                <TextField
                  label="Crédito"
                  value={selectedLancamento.credito}
                  onChange={(e) =>
                    setSelectedLancamento({ ...selectedLancamento, credito: e.target.value })
                  }
                  fullWidth
                />
                {selectedLancamento.credito && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {getRubricaName(selectedLancamento.credito)}
                  </Typography>
                )}
              </Box>
              <TextField
                label="Centro de Custo"
                value={selectedLancamento.centroCusto}
                onChange={(e) =>
                  setSelectedLancamento({ ...selectedLancamento, centroCusto: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Histórico"
                value={selectedLancamento.historico}
                onChange={(e) =>
                  setSelectedLancamento({ ...selectedLancamento, historico: e.target.value })
                }
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                label="Valor"
                value={selectedLancamento.valor}
                onChange={(e) =>
                  setSelectedLancamento({ ...selectedLancamento, valor: e.target.value })
                }
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
