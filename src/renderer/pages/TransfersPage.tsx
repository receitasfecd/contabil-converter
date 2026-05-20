import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Stack,
  Chip,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  DeleteSweep as DeleteSweepIcon,
  Edit as EditIcon,
  Link as LinkIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAppContext } from '../AppContext';
import { generateTransferCSV, downloadCSV, generateTransferFilename } from '../services/csvExporter';
import { TransferPair, Transfer } from '../types/Transfer';
import { mappingService } from '../services/mappingService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transfer-tabpanel-${index}`}
      aria-labelledby={`transfer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TransfersPage() {
  const { transferStore, markPairAsExported, deleteTransfer, deletePair, deleteTransfersByAccount, updateTransfer } = useAppContext();
  const [tabIndex, setTabIndex] = useState(0);
  const [exportError, setExportError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    accountCode: '',
    amount: '',
    historico: '',
    centroCusto: '',
  });
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtros para a aba de Pendentes
  const [filtroConta, setFiltroConta] = useState('TODAS');
  const [filtroDirecao, setFiltroDirecao] = useState('TODAS');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Estados para o diálogo de Pareamento Manual
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [sourceTransfer, setSourceTransfer] = useState<Transfer | null>(null);
  const [selectedCounterpartId, setSelectedCounterpartId] = useState<string>('');
  const [dialogFiltroConta, setDialogFiltroConta] = useState('TODAS');
  const [dialogBuscaTexto, setDialogBuscaTexto] = useState('');
  const [dialogFiltroValor, setDialogFiltroValor] = useState('');

  console.log('🔍 TransfersPage - Estado atual:', {
    pending: transferStore.pending.length,
    paired: transferStore.paired.length,
    exported: transferStore.exported.length
  });

  // Log dos pares para debug
  if (transferStore.paired.length > 0) {
    console.log('📋 Pares encontrados:', transferStore.paired);
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Obter lista única de contas
  const accountsList = useMemo(() => {
    const accounts = new Set<string>();
    transferStore.pending.forEach(t => accounts.add(t.accountNumber));
    transferStore.paired.forEach(p => {
      accounts.add(p.outTransfer.accountNumber);
      accounts.add(p.inTransfer.accountNumber);
    });
    return Array.from(accounts).sort();
  }, [transferStore]);

  const handleDeleteTransfer = (transferId: string) => {
    if (confirm('Deseja realmente excluir esta transferência?')) {
      deleteTransfer(transferId);
    }
  };

  const handleDeletePair = (pairId: string) => {
    if (confirm('Deseja realmente excluir este par? As transferências voltarão para pendentes.')) {
      deletePair(pairId);
    }
  };

  const handleDeleteByAccount = (accountNumber: string) => {
    if (confirm(`Deseja realmente excluir TODAS as transferências da conta ${accountNumber}?`)) {
      deleteTransfersByAccount(accountNumber);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setEditFormData({
      date: transfer.date,
      accountCode: transfer.accountCode,
      amount: transfer.amount,
      historico: transfer.historico,
      centroCusto: transfer.centroCusto,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTransfer) return;

    const updatedTransfer: Transfer = {
      ...editingTransfer,
      date: editFormData.date,
      accountCode: editFormData.accountCode,
      amount: editFormData.amount,
      historico: editFormData.historico,
      centroCusto: editFormData.centroCusto,
    };

    updateTransfer(updatedTransfer);
    setEditDialogOpen(false);
  };

  const getRubricaName = (codigo: string): string => {
    if (!codigo) return '';
    const classificacoes = mappingService.getClassificacoes();
    const rubrica = classificacoes.find(c => c.codigoContabil === codigo);
    return rubrica?.descricao || '';
  };

  // Obter lista única de contas apenas com transferências pendentes para o seletor
  const pendingAccountsList = useMemo(() => {
    const accounts = new Set<string>();
    transferStore.pending.forEach(t => accounts.add(t.accountNumber));
    return Array.from(accounts).sort();
  }, [transferStore.pending]);

  // Filtrar as transferências pendentes exibidas no DataGrid
  const filteredPendingTransfers = useMemo(() => {
    return transferStore.pending.filter(t => {
      if (filtroConta !== 'TODAS' && t.accountNumber !== filtroConta) return false;
      if (filtroDirecao !== 'TODAS' && t.direction !== filtroDirecao) return false;
      if (buscaTexto) {
        const query = buscaTexto.toLowerCase();
        const histMatch = t.historico.toLowerCase().includes(query);
        const codeMatch = t.accountCode.toLowerCase().includes(query);
        const amountMatch = t.amount.toLowerCase().includes(query);
        const dateMatch = t.date.toLowerCase().includes(query);
        if (!histMatch && !codeMatch && !amountMatch && !dateMatch) return false;
      }
      return true;
    });
  }, [transferStore.pending, filtroConta, filtroDirecao, buscaTexto]);

  // Lista de contrapartidas candidatas para o diálogo de pareamento manual
  const counterpartCandidates = useMemo(() => {
    if (!sourceTransfer) return [];
    const targetDirection = sourceTransfer.direction === 'OUT' ? 'IN' : 'OUT';
    
    return transferStore.pending.filter(t => {
      // Deve ser direção oposta
      if (t.direction !== targetDirection) return false;
      // Não pode ser o mesmo registro
      if (t.id === sourceTransfer.id) return false;
      
      // Filtro de conta no diálogo
      if (dialogFiltroConta !== 'TODAS' && t.accountNumber !== dialogFiltroConta) return false;
      
      // Filtro de valor no diálogo (busca textual ou valor exato se for preenchido)
      if (dialogFiltroValor) {
        if (!t.amount.includes(dialogFiltroValor)) return false;
      }
      
      // Busca geral no diálogo
      if (dialogBuscaTexto) {
        const query = dialogBuscaTexto.toLowerCase();
        const histMatch = t.historico.toLowerCase().includes(query);
        const dateMatch = t.date.toLowerCase().includes(query);
        const codeMatch = t.accountCode.toLowerCase().includes(query);
        if (!histMatch && !dateMatch && !codeMatch) return false;
      }
      
      return true;
    });
  }, [transferStore.pending, sourceTransfer, dialogFiltroConta, dialogFiltroValor, dialogBuscaTexto]);

  // Iniciar o processo de pareamento manual a partir de uma linha
  const handleStartManualPair = (transfer: Transfer) => {
    setSourceTransfer(transfer);
    setSelectedCounterpartId('');
    setDialogFiltroConta('TODAS');
    setDialogBuscaTexto('');
    setDialogFiltroValor('');
    setPairingDialogOpen(true);
  };

  // Confirmar o pareamento manual e atualizar o store global
  const handleManualPairConfirm = () => {
    if (!sourceTransfer || !selectedCounterpartId) return;
    const counterpartTransfer = transferStore.pending.find(t => t.id === selectedCounterpartId);
    if (!counterpartTransfer) return;

    // Determina quem é saída (OUT - origem) e quem é entrada (IN - destino)
    const outTransfer = sourceTransfer.direction === 'OUT' ? sourceTransfer : counterpartTransfer;
    const inTransfer = sourceTransfer.direction === 'IN' ? sourceTransfer : counterpartTransfer;

    const newPair: TransferPair = {
      id: `manual-${outTransfer.id}-${inTransfer.id}-${Date.now()}`,
      outTransfer: {
        ...outTransfer,
        status: 'PAIRED',
        pairedWith: inTransfer.id,
        counterpartAccount: inTransfer.accountNumber
      },
      inTransfer: {
        ...inTransfer,
        status: 'PAIRED',
        pairedWith: outTransfer.id,
        counterpartAccount: outTransfer.accountNumber
      },
      matchScore: 100, // 100% de match score por ser manual
      matchedAt: new Date(),
      exported: false
    };

    // Remove do array de pendentes
    const updatedPending = transferStore.pending.filter(
      t => t.id !== outTransfer.id && t.id !== inTransfer.id
    );

    const newStore = {
      ...transferStore,
      pending: updatedPending,
      paired: [...transferStore.paired, newPair]
    };

    updateTransferStore(newStore);
    setPairingDialogOpen(false);
    setSourceTransfer(null);
    setSelectedCounterpartId('');
  };

  // Estatísticas
  const pendingCount = transferStore.pending.length;
  const readyCount = transferStore.paired.filter(p => !p.exported).length;
  const exportedCount = transferStore.paired.filter(p => p.exported).length;

  // Pares prontos para exportar
  const readyPairs = useMemo(() => {
    return transferStore.paired.filter(p => {
      if (p.exported) return false;

      // Filtro de data
      if (dataInicio || dataFim) {
        const pairDate = p.outTransfer.date; // formato dd/mm/yyyy
        const [day, month, year] = pairDate.split('/');
        const pairDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (dataInicio) {
          const inicioObj = new Date(dataInicio);
          if (pairDateObj < inicioObj) return false;
        }

        if (dataFim) {
          const fimObj = new Date(dataFim);
          if (pairDateObj > fimObj) return false;
        }
      }

      return true;
    });
  }, [transferStore.paired, dataInicio, dataFim]);

  // Pares já exportados
  const exportedPairs = useMemo(() => {
    return transferStore.paired.filter(p => p.exported);
  }, [transferStore.paired]);

  const handleExport = () => {
    setExportError('');

    if (readyPairs.length === 0) {
      setExportError('Nenhum par disponível para exportação');
      return;
    }

    try {
      // Gerar CSV
      const csv = generateTransferCSV(readyPairs);
      const filename = generateTransferFilename();

      // Download
      downloadCSV(csv, filename);

      // Marcar como exportados
      readyPairs.forEach(pair => {
        markPairAsExported(pair.id);
      });

      // Mudar para aba de histórico
      setTabIndex(3);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao exportar transferências');
    }
  };

  // Colunas para transferências pendentes
  const pendingColumns: GridColDef[] = [
    { field: 'date', headerName: 'Data', width: 120 },
    {
      field: 'accountNumber',
      headerName: 'Conta',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    { field: 'accountCode', headerName: 'Código Contábil', width: 150 },
    {
      field: 'direction',
      headerName: 'Direção',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value === 'OUT' ? 'Saída' : 'Entrada'}
          color={params.value === 'OUT' ? 'error' : 'success'}
          size="small"
        />
      ),
    },
    { field: 'amount', headerName: 'Valor', width: 120 },
    { field: 'historico', headerName: 'Histórico', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Ações',
      width: 160,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<LinkIcon />}
          label="Parear Manualmente"
          onClick={() => handleStartManualPair(params.row)}
          color="success"
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Editar"
          onClick={() => handleEditTransfer(params.row)}
          color="primary"
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Excluir"
          onClick={() => handleDeleteTransfer(params.row.id)}
          color="error"
        />,
      ],
    },
  ];

  // Colunas para pares
  const pairColumns: GridColDef[] = [
    {
      field: 'date',
      headerName: 'Data',
      width: 120,
      valueGetter: (value, row) => row?.outTransfer?.date || '',
    },
    {
      field: 'outAccount',
      headerName: 'Origem',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.outTransfer?.accountNumber || ''}
          size="small"
          variant="outlined"
          color="error"
        />
      ),
    },
    {
      field: 'outAccountCode',
      headerName: 'Cód. Origem',
      width: 130,
      valueGetter: (value, row) => row?.outTransfer?.accountCode || '',
    },
    {
      field: 'inAccount',
      headerName: 'Destino',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row?.inTransfer?.accountNumber || ''}
          size="small"
          variant="outlined"
          color="success"
        />
      ),
    },
    {
      field: 'inAccountCode',
      headerName: 'Cód. Destino',
      width: 130,
      valueGetter: (value, row) => row?.inTransfer?.accountCode || '',
    },
    {
      field: 'amount',
      headerName: 'Valor',
      width: 120,
      valueGetter: (value, row) => row?.outTransfer?.amount || '',
    },
    {
      field: 'matchScore',
      headerName: 'Confiança',
      width: 120,
      renderCell: (params) => {
        const score = params.value || 0;
        const color = score >= 90 ? 'success' : score >= 70 ? 'warning' : 'error';
        return <Chip label={`${score}%`} color={color} size="small" />;
      },
    },
    {
      field: 'historico',
      headerName: 'Histórico',
      flex: 1,
      valueGetter: (value, row) => row?.outTransfer?.historico || '',
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Ações',
      width: 80,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Excluir"
          onClick={() => handleDeletePair(params.row.id)}
          color="error"
        />,
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">
          Gestão de Transferências
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={accountsList.length === 0}
          >
            Excluir por Conta
          </Button>
        </Stack>
      </Box>

      {/* Estatísticas */}
      <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 3 }}>
        <Card sx={{ minWidth: 150 }}>
          <CardContent>
            <Typography variant="h5" color="warning.main">
              {pendingCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pendentes
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150 }}>
          <CardContent>
            <Typography variant="h5" color="success.main">
              {readyCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prontos
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 150 }}>
          <CardContent>
            <Typography variant="h5" color="text.secondary">
              {exportedCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Exportados
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label={`Pendentes (${pendingCount})`} />
          <Tab label={`Prontos (${readyCount})`} />
          <Tab label={`Histórico (${exportedCount})`} />
        </Tabs>
      </Box>

      {/* Conteúdo das Tabs */}
      <TabPanel value={tabIndex} index={0}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Transferências aguardando pareamento com contrapartida
        </Typography>

        {/* Barra de Filtros */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, mt: 1 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="filtro-conta-label">Filtrar por Conta</InputLabel>
            <Select
              labelId="filtro-conta-label"
              id="filtro-conta"
              value={filtroConta}
              label="Filtrar por Conta"
              onChange={(e) => setFiltroConta(e.target.value)}
            >
              <MenuItem value="TODAS">Todas as Contas</MenuItem>
              {pendingAccountsList.map((acc) => (
                <MenuItem key={acc} value={acc}>
                  Conta {acc}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="filtro-direcao-label">Direção</InputLabel>
            <Select
              labelId="filtro-direcao-label"
              id="filtro-direcao"
              value={filtroDirecao}
              label="Direção"
              onChange={(e) => setFiltroDirecao(e.target.value)}
            >
              <MenuItem value="TODAS">Todas as Direções</MenuItem>
              <MenuItem value="OUT">Saída (OUT)</MenuItem>
              <MenuItem value="IN">Entrada (IN)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Buscar..."
            placeholder="Histórico, valor, data..."
            size="small"
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <SearchIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
              ),
            }}
          />

          {(filtroConta !== 'TODAS' || filtroDirecao !== 'TODAS' || buscaTexto) && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFiltroConta('TODAS');
                setFiltroDirecao('TODAS');
                setBuscaTexto('');
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </Stack>

        <DataGrid
          rows={filteredPendingTransfers}
          columns={pendingColumns}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Pares confirmados e prontos para exportação
          </Typography>

          {/* Filtros de Data */}
          <Stack direction="row" spacing={2}>
            <TextField
              label="Data Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ placeholder: '' }}
              size="small"
              sx={{ width: 200 }}
            />
            <TextField
              label="Data Fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ placeholder: '' }}
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

          {exportError && <Alert severity="error">{exportError}</Alert>}

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={readyPairs.length === 0}
            sx={{ alignSelf: 'flex-start' }}
          >
            Exportar Lote de Transferências ({readyPairs.length})
          </Button>

          {readyPairs.length === 0 ? (
            <Alert severity="info">Nenhum par pronto para exportar.</Alert>
          ) : (
            <DataGrid
              rows={readyPairs}
              columns={pairColumns}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              sx={{ minHeight: 400 }}
            />
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tabIndex} index={2}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Transferências já exportadas
        </Typography>
        <DataGrid
          rows={exportedPairs}
          columns={pairColumns}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      </TabPanel>

      {/* Diálogo de Exclusão por Conta */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excluir Transferências por Conta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Selecione uma conta para excluir todas as suas transferências (pendentes e pareadas):
          </Typography>
          <List>
            {accountsList.map((account) => (
              <ListItem
                key={account}
                button
                onClick={() => handleDeleteByAccount(account)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    backgroundColor: 'error.light',
                    borderColor: 'error.main',
                  },
                }}
              >
                <ListItemText
                  primary={account}
                  secondary={`${transferStore.pending.filter(t => t.accountNumber === account).length} pendentes, ${transferStore.paired.filter(p => p.outTransfer.accountNumber === account || p.inTransfer.accountNumber === account).length} em pares`}
                />
                <IconButton edge="end" color="error">
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Edição */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Transferência</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Data"
              fullWidth
              value={editFormData.date}
              onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
            />
            <Box>
              <TextField
                label="Código Contábil"
                fullWidth
                value={editFormData.accountCode}
                onChange={(e) => setEditFormData({ ...editFormData, accountCode: e.target.value })}
              />
              {editFormData.accountCode && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {getRubricaName(editFormData.accountCode)}
                </Typography>
              )}
            </Box>
            <TextField
              label="Valor"
              fullWidth
              value={editFormData.amount}
              onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
            />
            <TextField
              label="Histórico"
              fullWidth
              multiline
              rows={3}
              value={editFormData.historico}
              onChange={(e) => setEditFormData({ ...editFormData, historico: e.target.value })}
            />
            <TextField
              label="Centro de Custo"
              fullWidth
              value={editFormData.centroCusto}
              onChange={(e) => setEditFormData({ ...editFormData, centroCusto: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Pareamento Manual */}
      <Dialog open={pairingDialogOpen} onClose={() => setPairingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Pareamento Manual de Transferência</DialogTitle>
        <DialogContent dividers>
          {sourceTransfer && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Lançamento Selecionado (Origem):
              </Typography>
              <Card variant="outlined" sx={{ bgcolor: 'action.hover', borderLeft: 5, borderColor: sourceTransfer.direction === 'OUT' ? 'error.main' : 'success.main' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip
                          label={sourceTransfer.direction === 'OUT' ? 'Saída' : 'Entrada'}
                          color={sourceTransfer.direction === 'OUT' ? 'error' : 'success'}
                          size="small"
                        />
                        <Chip label={`Conta: ${sourceTransfer.accountNumber}`} size="small" variant="outlined" />
                        <Typography variant="body2" color="text.secondary">
                          {sourceTransfer.date}
                        </Typography>
                      </Stack>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {sourceTransfer.historico}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cód. Contábil: {sourceTransfer.accountCode} {getRubricaName(sourceTransfer.accountCode) && `(${getRubricaName(sourceTransfer.accountCode)})`}
                      </Typography>
                    </Box>
                    <Typography variant="h6" color={sourceTransfer.direction === 'OUT' ? 'error.main' : 'success.main'} sx={{ fontWeight: 'bold' }}>
                      R$ {sourceTransfer.amount}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}

          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
            Localizar e Selecionar Contrapartida Correspondente:
          </Typography>

          {/* Filtros da Contrapartida */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="dialog-filtro-conta-label">Filtrar por Conta</InputLabel>
              <Select
                labelId="dialog-filtro-conta-label"
                id="dialog-filtro-conta"
                value={dialogFiltroConta}
                label="Filtrar por Conta"
                onChange={(e) => setDialogFiltroConta(e.target.value)}
              >
                <MenuItem value="TODAS">Todas as Contas</MenuItem>
                {accountsList.map((acc) => (
                  <MenuItem key={acc} value={acc}>
                    Conta {acc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Filtrar por Valor"
              placeholder="Ex: 650,00"
              size="small"
              value={dialogFiltroValor}
              onChange={(e) => setDialogFiltroValor(e.target.value)}
              sx={{ width: 150 }}
            />

            <TextField
              label="Buscar no Histórico/Código..."
              size="small"
              value={dialogBuscaTexto}
              onChange={(e) => setDialogBuscaTexto(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <SearchIcon color="action" sx={{ mr: 1, fontSize: 20 }} />
                ),
              }}
            />

            {(dialogFiltroConta !== 'TODAS' || dialogFiltroValor || dialogBuscaTexto) && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setDialogFiltroConta('TODAS');
                  setDialogFiltroValor('');
                  setDialogBuscaTexto('');
                }}
              >
                Limpar
              </Button>
            )}
          </Stack>

          {/* Tabela de Candidatas */}
          <Box sx={{ height: 350, width: '100%' }}>
            <DataGrid
              rows={counterpartCandidates}
              columns={[
                { field: 'date', headerName: 'Data', width: 110 },
                {
                  field: 'accountNumber',
                  headerName: 'Conta',
                  width: 100,
                  renderCell: (params) => (
                    <Chip label={params.value} size="small" variant="outlined" color="primary" />
                  ),
                },
                {
                  field: 'direction',
                  headerName: 'Direção',
                  width: 90,
                  renderCell: (params) => (
                    <Chip
                      label={params.value === 'OUT' ? 'Saída' : 'Entrada'}
                      color={params.value === 'OUT' ? 'error' : 'success'}
                      size="small"
                    />
                  ),
                },
                { field: 'amount', headerName: 'Valor', width: 110 },
                { field: 'historico', headerName: 'Histórico', flex: 1 },
              ]}
              pageSizeOptions={[5, 10, 20]}
              initialState={{
                pagination: { paginationModel: { pageSize: 5 } },
              }}
              rowSelectionModel={selectedCounterpartId ? [selectedCounterpartId] : []}
              onRowSelectionModelChange={(newSelection) => {
                if (newSelection.length > 0) {
                  setSelectedCounterpartId(newSelection[0] as string);
                } else {
                  setSelectedCounterpartId('');
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPairingDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleManualPairConfirm}
            variant="contained"
            color="success"
            disabled={!selectedCounterpartId}
            startIcon={<LinkIcon />}
          >
            Confirmar Pareamento Manual
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
