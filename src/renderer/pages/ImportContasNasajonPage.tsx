import React, { useState, useEffect } from 'react';
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
  TextField,
  Chip,
  Alert,
  Stack,
  LinearProgress,
} from '@mui/material';
import { Upload, Save, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { mappingService } from '../services/mappingService';
import BankIcon from '../components/BankIcon';
import { formatAccountNumber } from '../utils/formatters';

interface ContaNasajon {
  numeroConta: string;
  codigoContabil: string;
  descricao: string;
  tipoAplicacao: string | null;
  banco: 'BB' | 'ITAU' | null;
  agencia: string | null;
  contaOriginal: string;
}

export default function ImportContasNasajonPage() {
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaNasajon[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    // Carregar arquivo JSON gerado
    fetch('/contas-nasajon-processadas.json')
      .then(res => res.json())
      .then(data => setContas(data))
      .catch(err => console.error('Erro ao carregar contas:', err));
  }, []);

  const handleCodigoChange = (index: number, newCodigo: string) => {
    const updated = [...contas];
    updated[index].codigoContabil = newCodigo;
    setContas(updated);
  };

  const handleImportAll = () => {
    setLoading(true);

    try {
      // Obter contas já cadastradas
      const existingContas = mappingService.getContasBancarias();
      const existingMap = new Map(
        existingContas.map(c => [c.numeroConta, c])
      );

      let added = 0;
      let updated = 0;
      let skipped = 0;

      contas.forEach(conta => {
        const existing = existingMap.get(conta.numeroConta);

        if (existing) {
          // Atualizar se houver mudanças
          if (
            existing.banco !== conta.banco ||
            existing.descricao !== conta.descricao ||
            existing.codigoContabil !== conta.codigoContabil
          ) {
            mappingService.updateContaBancaria(existing.id, {
              banco: conta.banco,
              descricao: conta.descricao,
              codigoContabil: conta.codigoContabil,
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Adicionar nova conta
          mappingService.addContaBancaria({
            numeroConta: conta.numeroConta,
            codigoContabil: conta.codigoContabil,
            descricao: conta.descricao,
            tipoAplicacao: conta.tipoAplicacao as any,
            banco: conta.banco,
          });
          added++;
        }
      });

      setImported(true);
      alert(`✅ Importação concluída!\n\nAdicionadas: ${added}\nAtualizadas: ${updated}\nIgnoradas: ${skipped}`);
    } catch (error) {
      alert('❌ Erro ao importar contas: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const contasCorrentes = contas.filter(c => !c.tipoAplicacao);
  const aplicacoes = contas.filter(c => c.tipoAplicacao);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Importar Contas do Nasajon</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/mapeamento')}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleImportAll}
            disabled={loading || imported || contas.length === 0}
          >
            {imported ? 'Importado' : 'Importar Todas'}
          </Button>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {imported && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Contas importadas com sucesso! Vá para Mapeamento para visualizar.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo
          </Typography>
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total de Contas
              </Typography>
              <Typography variant="h5">{contas.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Contas Correntes
              </Typography>
              <Typography variant="h5">{contasCorrentes.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Aplicações
              </Typography>
              <Typography variant="h5">{aplicacoes.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Banco do Brasil
              </Typography>
              <Typography variant="h5">{contas.filter(c => c.banco === 'BB').length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Itaú
              </Typography>
              <Typography variant="h5">{contas.filter(c => c.banco === 'ITAU').length}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mb: 2 }}>
        Revise os códigos contábeis antes de importar. Os códigos são apenas sugestões e podem precisar de ajuste.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Contas a Importar
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Banco</TableCell>
                  <TableCell>Número da Conta</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Código Contábil</TableCell>
                  <TableCell>Descrição</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contas.map((conta, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <BankIcon banco={conta.banco} size={24} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatAccountNumber(conta.numeroConta)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={conta.tipoAplicacao || 'CC'}
                        color={conta.tipoAplicacao ? 'secondary' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={conta.codigoContabil}
                        onChange={(e) => handleCodigoChange(index, e.target.value)}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                        {conta.descricao}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
