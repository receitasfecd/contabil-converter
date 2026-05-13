import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Alert,
  Collapse,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add, Edit, Delete, Upload, Download, ExpandMore, ChevronRight, CloudUpload } from '@mui/icons-material';
import { mappingService } from '../services/mappingService';
import { ClassificacaoMapping, ContaBancariaMapping, PlanoContasItem } from '../types/Mapping';
import BankIcon from '../components/BankIcon';
import { formatAccountNumber } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function MappingPage() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [classificacoes, setClassificacoes] = useState<ClassificacaoMapping[]>(
    mappingService.getClassificacoes()
  );
  const [contas, setContas] = useState<ContaBancariaMapping[]>(
    mappingService.getContasBancarias()
  );
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>(
    mappingService.getPlanoContas()
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogType, setDialogType] = useState<'classificacao' | 'conta' | 'plano'>('classificacao');
  const [selectedContas, setSelectedContas] = useState<string[]>([]);
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkBanco, setBulkBanco] = useState<'BB' | 'ITAU' | ''>('');

  const handleAddClassificacao = () => {
    setDialogType('classificacao');
    setEditingItem(null);
    setOpenDialog(true);
  };

  const handleAddConta = () => {
    setDialogType('conta');
    setEditingItem(null);
    setOpenDialog(true);
  };

  const handleAddPlanoContas = () => {
    setDialogType('plano');
    setEditingItem(null);
    setOpenDialog(true);
  };

  const handleEdit = (item: any, type: 'classificacao' | 'conta' | 'plano') => {
    setDialogType(type);
    setEditingItem(item);
    setOpenDialog(true);
  };

  const handleDelete = (id: string, type: 'classificacao' | 'conta' | 'plano') => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      if (type === 'classificacao') {
        mappingService.deleteClassificacao(id);
        setClassificacoes(mappingService.getClassificacoes());
      } else if (type === 'conta') {
        mappingService.deleteContaBancaria(id);
        setContas(mappingService.getContasBancarias());
      } else {
        mappingService.deletePlanoContasItem(id);
        setPlanoContas(mappingService.getPlanoContas());
      }
    }
  };

  const handleSave = (formData: any) => {
    if (dialogType === 'classificacao') {
      if (editingItem) {
        mappingService.updateClassificacao(editingItem.id, formData);
      } else {
        mappingService.addClassificacao(formData);
      }
      setClassificacoes(mappingService.getClassificacoes());
    } else if (dialogType === 'conta') {
      if (editingItem) {
        mappingService.updateContaBancaria(editingItem.id, formData);
      } else {
        mappingService.addContaBancaria(formData);
      }
      setContas(mappingService.getContasBancarias());
    } else {
      if (editingItem) {
        mappingService.updatePlanoContasItem(editingItem.id, formData);
      } else {
        mappingService.addPlanoContasItem(formData);
      }
      setPlanoContas(mappingService.getPlanoContas());
    }
    setOpenDialog(false);
  };

  const handleExport = () => {
    const data = mappingService.exportMappings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mapeamentos-completo.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          mappingService.importMappings(data);
          setClassificacoes(mappingService.getClassificacoes());
          setContas(mappingService.getContasBancarias());
          setPlanoContas(mappingService.getPlanoContas());
          alert('Dados importados com sucesso!');
        } catch (error) {
          alert('Erro ao importar arquivo');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSelectAllContas = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContas(contas.map(c => c.id));
    } else {
      setSelectedContas([]);
    }
  };

  const handleSelectConta = (id: string) => {
    setSelectedContas(prev => {
      if (prev.includes(id)) {
        return prev.filter(cid => cid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleOpenBulkEdit = () => {
    setBulkBanco('');
    setBulkEditDialog(true);
  };

  const handleBulkEdit = () => {
    if (!bulkBanco) {
      alert('Selecione um banco');
      return;
    }

    selectedContas.forEach(id => {
      const conta = contas.find(c => c.id === id);
      if (conta) {
        mappingService.updateContaBancaria(id, {
          ...conta,
          banco: bulkBanco as 'BB' | 'ITAU'
        });

        // Se for conta corrente, atualizar aplicações relacionadas
        if (!conta.tipoAplicacao) {
          const aplicacoesRelacionadas = contas.filter(
            c => c.numeroConta === conta.numeroConta && c.tipoAplicacao && c.id !== id
          );

          aplicacoesRelacionadas.forEach(app => {
            mappingService.updateContaBancaria(app.id, {
              ...app,
              banco: bulkBanco as 'BB' | 'ITAU'
            });
          });
        }
      }
    });

    setContas(mappingService.getContasBancarias());
    setSelectedContas([]);
    setBulkEditDialog(false);
    setBulkBanco('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Mapeamento</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => navigate('/importar-nasajon')}
          >
            Importar do Nasajon
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            component="label"
          >
            Importar
            <input type="file" hidden accept=".json" onChange={handleImport} />
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Exportar
          </Button>
        </Stack>
      </Box>

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="De-Para" />
            <Tab label="Contas Bancárias" />
            <Tab label="Plano de Contas" />
          </Tabs>

          {tabValue === 0 && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddClassificacao}
                sx={{ mb: 2 }}
              >
                Adicionar Classificação
              </Button>

              {classificacoes.length === 0 ? (
                <Alert severity="info">
                  Nenhuma classificação cadastrada. Adicione classificações para mapear
                  os lançamentos financeiros.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Classificação Financeira</TableCell>
                        <TableCell>Classificação Contábil</TableCell>
                        <TableCell>Descrição</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {classificacoes.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.classificacaoFinanceira}</TableCell>
                          <TableCell>{item.classificacaoContabil}</TableCell>
                          <TableCell>{item.descricao || '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(item, 'classificacao')}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(item.id, 'classificacao')}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {tabValue === 1 && (
            <Box sx={{ mt: 3 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddConta}
                >
                  Adicionar Conta Bancária
                </Button>
                {selectedContas.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={handleOpenBulkEdit}
                  >
                    Editar em Massa ({selectedContas.length})
                  </Button>
                )}
              </Stack>

              {contas.length === 0 ? (
                <Alert severity="info">
                  Nenhuma conta bancária cadastrada. Adicione contas para processar
                  os lançamentos.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedContas.length === contas.length && contas.length > 0}
                            indeterminate={selectedContas.length > 0 && selectedContas.length < contas.length}
                            onChange={handleSelectAllContas}
                          />
                        </TableCell>
                        <TableCell>Banco</TableCell>
                        <TableCell>Número da Conta</TableCell>
                        <TableCell>Código Contábil</TableCell>
                        <TableCell>Tipo Aplicação</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell>Descrição</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contas.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedContas.includes(item.id)}
                              onChange={() => handleSelectConta(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <BankIcon banco={item.banco} size={24} />
                          </TableCell>
                          <TableCell>{formatAccountNumber(item.numeroConta)}</TableCell>
                          <TableCell>{item.codigoContabil}</TableCell>
                          <TableCell>{item.tipoAplicacao || '-'}</TableCell>
                          <TableCell>
                            {item.categoria === 'ADMINISTRACAO' && 'Administração'}
                            {item.categoria === 'PROJETOS' && 'Projetos'}
                            {item.categoria === 'GRANTS' && 'Grants'}
                            {item.categoria === 'TERMOS_PARCERIAS' && 'Termos e Parcerias'}
                            {item.categoria === 'IMPORTACAO' && 'Importação'}
                            {!item.categoria && '-'}
                          </TableCell>
                          <TableCell>{item.descricao || '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(item, 'conta')}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(item.id, 'conta')}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {tabValue === 2 && (
            <PlanoContasView
              planoContas={planoContas}
              onAdd={handleAddPlanoContas}
              onEdit={(item) => handleEdit(item, 'plano')}
              onDelete={(id) => handleDelete(id, 'plano')}
            />
          )}
        </CardContent>
      </Card>

      <MappingDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSave={handleSave}
        type={dialogType}
        editingItem={editingItem}
      />

      <Dialog open={bulkEditDialog} onClose={() => setBulkEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Banco em Massa</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="info">
              {selectedContas.length} conta(s) selecionada(s)
            </Alert>
            <FormControl fullWidth>
              <InputLabel>Banco</InputLabel>
              <Select
                value={bulkBanco}
                label="Banco"
                onChange={(e) => setBulkBanco(e.target.value as 'BB' | 'ITAU' | '')}
              >
                <MenuItem value="BB">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BankIcon banco="BB" size={20} />
                    Banco do Brasil
                  </Box>
                </MenuItem>
                <MenuItem value="ITAU">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BankIcon banco="ITAU" size={20} />
                    Itaú
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleBulkEdit} variant="contained">
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PlanoContasView({
  planoContas,
  onAdd,
  onEdit,
  onDelete,
}: {
  planoContas: PlanoContasItem[];
  onAdd: () => void;
  onEdit: (item: PlanoContasItem) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (codigo: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo);
    } else {
      newExpanded.add(codigo);
    }
    setExpandedNodes(newExpanded);
  };

  // Organizar em hierarquia
  const buildHierarchy = () => {
    const sorted = [...planoContas].sort((a, b) => a.codigo.localeCompare(b.codigo));
    return sorted;
  };

  const hierarchy = buildHierarchy();

  return (
    <Box sx={{ mt: 3 }}>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={onAdd}
        sx={{ mb: 2 }}
      >
        Adicionar Conta
      </Button>

      {planoContas.length === 0 ? (
        <Alert severity="info">
          Nenhuma conta no plano de contas. Importe o plano de contas ou adicione manualmente.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell width="200">Código</TableCell>
                <TableCell>Nome da Conta</TableCell>
                <TableCell width="100" align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hierarchy.map((item) => {
                const hasChildren = hierarchy.some(
                  (c) => c.codigo.startsWith(item.codigo) && c.codigo !== item.codigo && c.codigo.length === item.codigo.length + 2
                );
                const isExpanded = expandedNodes.has(item.codigo);
                const indent = (item.nivel - 1) * 20;

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', pl: `${indent}px` }}>
                        {hasChildren && (
                          <IconButton
                            size="small"
                            onClick={() => toggleNode(item.codigo)}
                            sx={{ mr: 1 }}
                          >
                            {isExpanded ? <ExpandMore /> : <ChevronRight />}
                          </IconButton>
                        )}
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: item.nivel <= 2 ? 600 : 400 }}
                        >
                          {item.codigo}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: item.nivel <= 2 ? 600 : 400 }}
                      >
                        {item.nome}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onEdit(item)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onDelete(item.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function MappingDialog({
  open,
  onClose,
  onSave,
  type,
  editingItem,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  type: 'classificacao' | 'conta' | 'plano';
  editingItem: any;
}) {
  const [formData, setFormData] = useState<any>(editingItem || {});

  React.useEffect(() => {
    setFormData(editingItem || {});
  }, [editingItem, open]);

  const handleSubmit = () => {
    onSave(formData);
    setFormData({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingItem ? 'Editar' : 'Adicionar'}{' '}
        {type === 'classificacao' ? 'Classificação' : type === 'conta' ? 'Conta Bancária' : 'Conta do Plano'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {type === 'classificacao' ? (
            <>
              <TextField
                label="Classificação Financeira"
                fullWidth
                value={formData.classificacaoFinanceira || ''}
                onChange={(e) =>
                  setFormData({ ...formData, classificacaoFinanceira: e.target.value })
                }
              />
              <TextField
                label="Classificação Contábil"
                fullWidth
                value={formData.classificacaoContabil || ''}
                onChange={(e) =>
                  setFormData({ ...formData, classificacaoContabil: e.target.value })
                }
              />
              <TextField
                label="Descrição (opcional)"
                fullWidth
                value={formData.descricao || ''}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
              />
            </>
          ) : type === 'conta' ? (
            <>
              <TextField
                label="Número da Conta"
                fullWidth
                value={formData.numeroConta || ''}
                onChange={(e) =>
                  setFormData({ ...formData, numeroConta: e.target.value })
                }
              />
              <TextField
                label="Código Contábil"
                fullWidth
                value={formData.codigoContabil || ''}
                onChange={(e) =>
                  setFormData({ ...formData, codigoContabil: e.target.value })
                }
              />
              <FormControl fullWidth>
                <InputLabel>Banco</InputLabel>
                <Select
                  value={formData.banco || ''}
                  label="Banco"
                  onChange={(e) =>
                    setFormData({ ...formData, banco: e.target.value })
                  }
                >
                  <MenuItem value="">
                    <em>Nenhum</em>
                  </MenuItem>
                  <MenuItem value="BB">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BankIcon banco="BB" size={20} />
                      Banco do Brasil
                    </Box>
                  </MenuItem>
                  <MenuItem value="ITAU">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BankIcon banco="ITAU" size={20} />
                      Itaú
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Tipo Aplicação (A, A2, A3)"
                fullWidth
                value={formData.tipoAplicacao || ''}
                onChange={(e) =>
                  setFormData({ ...formData, tipoAplicacao: e.target.value })
                }
              />
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.categoria || ''}
                  label="Categoria"
                  onChange={(e) =>
                    setFormData({ ...formData, categoria: e.target.value })
                  }
                >
                  <MenuItem value="">
                    <em>Nenhuma</em>
                  </MenuItem>
                  <MenuItem value="ADMINISTRACAO">Administração</MenuItem>
                  <MenuItem value="PROJETOS">Projetos</MenuItem>
                  <MenuItem value="GRANTS">Grants</MenuItem>
                  <MenuItem value="TERMOS_PARCERIAS">Termos e Parcerias</MenuItem>
                  <MenuItem value="IMPORTACAO">Importação</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Descrição (opcional)"
                fullWidth
                value={formData.descricao || ''}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
              />
            </>
          ) : (
            <>
              <TextField
                label="Código"
                fullWidth
                value={formData.codigo || ''}
                onChange={(e) =>
                  setFormData({ ...formData, codigo: e.target.value })
                }
              />
              <TextField
                label="Nome da Conta"
                fullWidth
                value={formData.nome || ''}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
              <TextField
                label="Nível Hierárquico"
                fullWidth
                type="number"
                value={formData.nivel || 1}
                onChange={(e) =>
                  setFormData({ ...formData, nivel: parseInt(e.target.value) })
                }
              />
              <TextField
                label="ID Interno (opcional)"
                fullWidth
                value={formData.idInterno || ''}
                onChange={(e) =>
                  setFormData({ ...formData, idInterno: e.target.value })
                }
              />
            </>
          )}
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
