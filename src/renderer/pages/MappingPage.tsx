import React, { useState } from 'react';
import Papa from 'papaparse';
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
  InputAdornment,
} from '@mui/material';
import { Add, Edit, Delete, Upload, Download, ExpandMore, ChevronRight, CloudUpload, Search, Clear } from '@mui/icons-material';
import { hybridMappingService } from '../services/hybridMappingService';
import { mappingService } from '../services/mappingService';
import { ClassificacaoMapping, ContaBancariaMapping, PlanoContasItem } from '../types/Mapping';
import BankIcon from '../components/BankIcon';
import { formatAccountNumber } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function MappingPage() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [classificacoes, setClassificacoes] = useState<ClassificacaoMapping[]>([]);
  const [contas, setContas] = useState<ContaBancariaMapping[]>([]);
  const [planoContas, setPlanoContas] = useState<PlanoContasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchClassificacao, setSearchClassificacao] = useState('');
  const [searchConta, setSearchConta] = useState('');

  // Carregar dados ao montar o componente
  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedClassificacoes, loadedContas, loadedPlano] = await Promise.all([
        hybridMappingService.getClassificacoes(),
        hybridMappingService.getContasBancarias(),
        Promise.resolve(hybridMappingService.getPlanoContas())
      ]);
      setClassificacoes(loadedClassificacoes);
      setContas(loadedContas);
      setPlanoContas(loadedPlano);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };
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

  const handleDelete = async (id: string, type: 'classificacao' | 'conta' | 'plano') => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        if (type === 'classificacao') {
          await hybridMappingService.deleteClassificacao(id);
          setClassificacoes(await hybridMappingService.getClassificacoes());
        } else if (type === 'conta') {
          await hybridMappingService.deleteContaBancaria(id);
          setContas(await hybridMappingService.getContasBancarias());
        } else {
          hybridMappingService.deletePlanoContasItem(id);
          setPlanoContas(hybridMappingService.getPlanoContas());
        }
      } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir item');
      }
    }
  };

  const handleSave = async (formData: any) => {
    try {
      if (dialogType === 'classificacao') {
        if (editingItem) {
          await hybridMappingService.updateClassificacao(editingItem.id, formData);
        } else {
          await hybridMappingService.addClassificacao(formData);
        }
        setClassificacoes(await hybridMappingService.getClassificacoes());
      } else if (dialogType === 'conta') {
        if (editingItem) {
          await hybridMappingService.updateContaBancaria(editingItem.id, formData);
        } else {
          await hybridMappingService.addContaBancaria(formData);
        }
        setContas(await hybridMappingService.getContasBancarias());
      } else {
        if (editingItem) {
          hybridMappingService.updatePlanoContasItem(editingItem.id, formData);
        } else {
          hybridMappingService.addPlanoContasItem(formData);
        }
        setPlanoContas(hybridMappingService.getPlanoContas());
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar item');
    }
  };

  const handleExport = async () => {
    try {
      const data = await hybridMappingService.exportMappings();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mapeamentos-completo.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar dados');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string;
          await hybridMappingService.importMappings(data);
          await loadData();
          alert('Dados importados com sucesso!');
        } catch (error: any) {
          console.error('Erro ao importar:', error);
          alert(`Erro ao importar arquivo: ${error?.message || error}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSelectAllContas = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContas(filteredContas.map(c => c.id));
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

  const handleExportCSV = () => {
    try {
      let csvContent = '';
      let filename = '';

      if (tabValue === 0) {
        // De-Para (Classificações)
        const headers = ['Código', 'Descrição', 'Conta Contábil'];
        const rows = classificacoes.map(item => [
          item.classificacaoFinanceira,
          item.descricao || '',
          item.classificacaoContabil
        ]);
        csvContent = Papa.unparse({ fields: headers, data: rows }, { delimiter: ';' });
        filename = 'mapeamentos-depara.csv';
      } else if (tabValue === 1) {
        // Contas Bancárias
        const headers = ['Banco', 'Número da Conta', 'Código Contábil', 'Tipo Aplicação', 'Categoria', 'Descrição'];
        const rows = contas.map(item => [
          item.banco,
          item.numeroConta,
          item.codigoContabil,
          item.tipoAplicacao || '',
          item.categoria || '',
          item.descricao || ''
        ]);
        csvContent = Papa.unparse({ fields: headers, data: rows }, { delimiter: ';' });
        filename = 'mapeamentos-contas-bancarias.csv';
      } else {
        // Plano de Contas
        const headers = ['Código', 'Nome da Conta', 'Tipo'];
        const rows = planoContas.map(item => [
          item.codigo,
          item.nome,
          item.tipo || 'PLANO_CONTAS'
        ]);
        csvContent = Papa.unparse({ fields: headers, data: rows }, { delimiter: ';' });
        filename = 'mapeamentos-plano-contas.csv';
      }

      // Adicionar BOM UTF-8 para garantir acentos corretos no Excel brasileiro
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar arquivo CSV');
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const data = results.data;
            if (data.length === 0) {
              alert('Nenhum dado encontrado no arquivo CSV.');
              return;
            }

            if (tabValue === 0) {
              // De-Para (Classificações)
              const novas = data.map((row: any, idx: number) => {
                const financial = row['Código'] || row['Cdigo'] || row['Classificação Financeira'] || row['classificacaoFinanceira'] || row['codigo'] || row['Código Financeiro'] || '';
                const accounting = row['Conta Contábil'] || row['Conta Contbil'] || row['Classificação Contábil'] || row['classificacaoContabil'] || row['conta'] || row['Conta Contabil'] || '';
                const desc = row['Descrição'] || row['Descrio'] || row['descricao'] || row['Descrição da Classificação'] || '';

                if (financial && accounting) {
                  return {
                    id: `import-csv-${idx}-${Date.now()}`,
                    tipo: 'CLASSIFICACAO',
                    classificacaoFinanceira: String(financial).trim(),
                    classificacaoContabil: String(accounting).trim(),
                    descricao: String(desc).trim()
                  };
                }
                return null;
              }).filter(Boolean) as ClassificacaoMapping[];

              if (novas.length === 0) {
                alert('Nenhuma classificação De-Para válida foi encontrada no CSV. Verifique se as colunas estão corretas (Código, Descrição, Conta Contábil).');
                return;
              }

              const replaceOption = window.confirm(
                `Foram encontradas ${novas.length} classificações no CSV.\n\nDeseja SUBSTITUIR todas as classificações atuais por estas novas do CSV?\n\n- OK: Substituir tudo\n- Cancelar: Mesclar com as existentes (preservando o que já tem e adicionando/atualizando novos)`
              );

              let listaFinal: ClassificacaoMapping[] = [];

              if (replaceOption) {
                listaFinal = novas;
              } else {
                // Mesclar inteligente (remover duplicados pelo código financeiro)
                const mapFinanceiro = new Map<string, ClassificacaoMapping>();
                
                // Primeiro adiciona as existentes
                classificacoes.forEach(c => mapFinanceiro.set(c.classificacaoFinanceira, c));
                // Depois adiciona/sobrescreve com as novas
                novas.forEach(c => mapFinanceiro.set(c.classificacaoFinanceira, c));
                
                listaFinal = Array.from(mapFinanceiro.values());
              }

              // Salvar no banco/localStorage
              await hybridMappingService.importMappings(JSON.stringify({ classificacoes: listaFinal }));
              await loadData();
              alert(`Importação concluída! Total de classificações ativas: ${listaFinal.length}`);

            } else if (tabValue === 1) {
              // Contas Bancárias
              const novas = data.map((row: any, idx: number) => {
                const banco = row['Banco'] || row['banco'] || row['Instituição'] || '';
                const numero = row['Número da Conta'] || row['Numero da Conta'] || row['Conta'] || row['numeroConta'] || '';
                const codigo = row['Código Contábil'] || row['Codigo Contabil'] || row['codigoContabil'] || row['codigo_contabil'] || '';
                const tipo = row['Tipo Aplicação'] || row['Tipo Aplicacao'] || row['tipoAplicacao'] || '';
                const cat = row['Categoria'] || row['categoria'] || '';
                const desc = row['Descrição'] || row['Descrio'] || row['descricao'] || '';

                if (numero && codigo) {
                  return {
                    id: `import-csv-${idx}-${Date.now()}`,
                    banco: String(banco).trim() as 'BB' | 'ITAU',
                    numeroConta: String(numero).trim(),
                    codigoContabil: String(codigo).trim(),
                    tipoAplicacao: tipo ? String(tipo).trim() : undefined,
                    categoria: cat ? String(cat).trim() as any : undefined,
                    descricao: String(desc).trim()
                  };
                }
                return null;
              }).filter(Boolean) as ContaBancariaMapping[];

              if (novas.length === 0) {
                alert('Nenhuma conta bancária válida foi encontrada no CSV. Verifique se as colunas estão corretas (Banco, Número da Conta, Código Contábil).');
                return;
              }

              const replaceOption = window.confirm(
                `Foram encontradas ${novas.length} contas bancárias no CSV.\n\nDeseja SUBSTITUIR todas as contas atuais por estas novas do CSV?\n\n- OK: Substituir tudo\n- Cancelar: Mesclar com as existentes`
              );

              let listaFinal: ContaBancariaMapping[] = [];

              if (replaceOption) {
                listaFinal = novas;
              } else {
                const mapContas = new Map<string, ContaBancariaMapping>();
                contas.forEach(c => mapContas.set(`${c.numeroConta}-${c.tipoAplicacao || 'C/C'}`, c));
                novas.forEach(c => mapContas.set(`${c.numeroConta}-${c.tipoAplicacao || 'C/C'}`, c));
                listaFinal = Array.from(mapContas.values());
              }

              await hybridMappingService.importMappings(JSON.stringify({ contasBancarias: listaFinal }));
              await loadData();
              alert(`Importação concluída! Total de contas bancárias ativas: ${listaFinal.length}`);

            } else {
              // Plano de Contas
              const novas = data.map((row: any, idx: number) => {
                const codigo = row['Código'] || row['Codigo'] || row['codigo'] || '';
                const nome = row['Nome da Conta'] || row['Nome'] || row['Descrição'] || row['Descrio'] || row['descricao'] || '';
                const tipo = row['Tipo'] || row['tipo'] || 'PLANO_CONTAS';

                if (codigo && nome) {
                  return {
                    id: `import-csv-${idx}-${Date.now()}`,
                    codigo: String(codigo).trim(),
                    nome: String(nome).trim(),
                    tipo: String(tipo).trim()
                  };
                }
                return null;
              }).filter(Boolean) as PlanoContasItem[];

              if (novas.length === 0) {
                alert('Nenhuma conta do plano de contas válida foi encontrada no CSV. Verifique se as colunas estão corretas (Código, Nome da Conta).');
                return;
              }

              const replaceOption = window.confirm(
                `Foram encontradas ${novas.length} contas do plano no CSV.\n\nDeseja SUBSTITUIR todo o plano de contas atual por este novo do CSV?\n\n- OK: Substituir tudo\n- Cancelar: Mesclar com as existentes`
              );

              let listaFinal: PlanoContasItem[] = [];

              if (replaceOption) {
                listaFinal = novas;
              } else {
                const mapPlano = new Map<string, PlanoContasItem>();
                planoContas.forEach(p => mapPlano.set(p.codigo, p));
                novas.forEach(p => mapPlano.set(p.codigo, p));
                listaFinal = Array.from(mapPlano.values());
              }

              await hybridMappingService.importMappings(JSON.stringify({ planoContas: listaFinal }));
              await loadData();
              alert(`Importação concluída! Total de contas no plano: ${listaFinal.length}`);
            }
          },
          error: (err) => {
            console.error('Erro no parser do CSV:', err);
            alert('Falha ao processar arquivo CSV.');
          }
        });
      } catch (err: any) {
        console.error('Erro na leitura do CSV:', err);
        alert(`Erro de leitura: ${err?.message || err}`);
      }
    };
    reader.readAsText(file, 'latin1');
  };

  const filteredClassificacoes = classificacoes.filter(item => {
    const term = searchClassificacao.toLowerCase();
    return (
      item.classificacaoFinanceira.toLowerCase().includes(term) ||
      item.classificacaoContabil.toLowerCase().includes(term) ||
      (item.descricao && item.descricao.toLowerCase().includes(term))
    );
  });

  const filteredContas = contas.filter(item => {
    const term = searchConta.toLowerCase();
    return (
      item.numeroConta.toLowerCase().includes(term) ||
      item.codigoContabil.toLowerCase().includes(term) ||
      (item.descricao && item.descricao.toLowerCase().includes(term)) ||
      (item.banco && item.banco.toLowerCase().includes(term)) ||
      (item.tipoAplicacao && item.tipoAplicacao.toLowerCase().includes(term))
    );
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Mapeamento</Typography>
        <Stack direction="row" spacing={1.5}>
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
            title="Importar mapeamentos completos em formato JSON"
          >
            Importar JSON
            <input type="file" hidden accept=".json" onChange={handleImport} />
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            title="Exportar mapeamentos completos em formato JSON"
          >
            Exportar JSON
          </Button>
          
          <Button
            variant="outlined"
            color="success"
            startIcon={<Upload />}
            component="label"
            title={`Importar CSV para a aba ativa (${tabValue === 0 ? 'De-Para' : tabValue === 1 ? 'Contas Bancárias' : 'Plano de Contas'})`}
          >
            Importar CSV
            <input type="file" hidden accept=".csv" onChange={handleImportCSV} />
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<Download />}
            onClick={handleExportCSV}
            title="Exportar dados da aba ativa em formato CSV"
          >
            Exportar CSV
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddClassificacao}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Adicionar Classificação
                </Button>
                <TextField
                  placeholder="Pesquisar por financeiro, contábil ou descrição..."
                  variant="outlined"
                  size="small"
                  value={searchClassificacao}
                  onChange={(e) => setSearchClassificacao(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 380 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchClassificacao && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchClassificacao('')}>
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              {classificacoes.length === 0 ? (
                <Alert severity="info">
                  Nenhuma classificação cadastrada. Adicione classificações para mapear
                  os lançamentos financeiros.
                </Alert>
              ) : filteredClassificacoes.length === 0 ? (
                <Alert severity="warning">
                  Nenhum resultado encontrado para a busca "{searchClassificacao}".
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
                      {filteredClassificacoes.map((item) => (
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddConta}
                    sx={{ whiteSpace: 'nowrap' }}
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
                <TextField
                  placeholder="Pesquisar por número, código, banco, aplicação..."
                  variant="outlined"
                  size="small"
                  value={searchConta}
                  onChange={(e) => setSearchConta(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 380 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchConta && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchConta('')}>
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Stack>

              {contas.length === 0 ? (
                <Alert severity="info">
                  Nenhuma conta bancária cadastrada. Adicione contas para processar
                  os lançamentos.
                </Alert>
              ) : filteredContas.length === 0 ? (
                <Alert severity="warning">
                  Nenhum resultado encontrado para a busca "{searchConta}".
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedContas.length === filteredContas.length && filteredContas.length > 0}
                            indeterminate={selectedContas.length > 0 && selectedContas.length < filteredContas.length}
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
                      {filteredContas.map((item) => (
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
  const [searchTerm, setSearchTerm] = useState('');

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
    let list = [...planoContas];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      
      // Encontrar todas as contas que correspondem diretamente à busca
      const matchingItems = list.filter(
        item => item.codigo.toLowerCase().includes(term) || item.nome.toLowerCase().includes(term)
      );
      
      // Coletar todos os códigos correspondentes e seus ancestrais (pais)
      const codesToShow = new Set<string>();
      matchingItems.forEach(item => {
        codesToShow.add(item.codigo);
        
        // Obter os pais/ancestrais.
        list.forEach(p => {
          if (item.codigo.startsWith(p.codigo) && p.codigo !== item.codigo) {
            codesToShow.add(p.codigo);
          }
        });
      });
      
      list = list.filter(item => codesToShow.has(item.codigo));
    }

    const sorted = list.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return sorted;
  };

  const hierarchy = buildHierarchy();

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Adicionar Conta
        </Button>
        <TextField
          placeholder="Pesquisar por código ou nome da conta..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: { xs: '100%', sm: 380 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Stack>

      {planoContas.length === 0 ? (
        <Alert severity="info">
          Nenhuma conta no plano de contas. Importe o plano de contas ou adicione manualmente.
        </Alert>
      ) : hierarchy.length === 0 ? (
        <Alert severity="warning">
          Nenhum resultado encontrado para a busca "{searchTerm}".
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
