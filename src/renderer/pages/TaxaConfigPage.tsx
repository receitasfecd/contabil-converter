import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
  Grid,
} from '@mui/material';
import { Save as SaveIcon, RestartAlt as ResetIcon } from '@mui/icons-material';
import { loadTaxaConfig, saveTaxaConfig, resetTaxaConfig } from '../services/taxaConfigService';
import { TaxaAdministracaoConfig } from '../types/TaxaAdministracaoConfig';

export default function TaxaConfigPage() {
  const [config, setConfig] = useState<TaxaAdministracaoConfig>(loadTaxaConfig());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveTaxaConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Deseja realmente restaurar as configurações padrão?')) {
      resetTaxaConfig();
      setConfig(loadTaxaConfig());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          Configurações de Taxas de Administração
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleReset}
          >
            Restaurar Padrão
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Salvar
          </Button>
        </Stack>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configurações salvas com sucesso!
        </Alert>
      )}

      {/* Configurações de Despesa */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lançamentos de Despesa (Saída do Dinheiro)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configurações para quando o dinheiro sai da conta do projeto/grant/termo/importação
          </Typography>

          <Stack spacing={3}>
            {/* Projetos */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Projetos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Débito"
                    value={config.despesa.PROJETOS.debito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        PROJETOS: { ...config.despesa.PROJETOS, debito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.despesa.PROJETOS.descricaoDebito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        PROJETOS: { ...config.despesa.PROJETOS, descricaoDebito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Crédito: Rubrica do banco onde o dinheiro está saindo (automático)
              </Typography>
            </Box>

            <Divider />

            {/* Grants */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Grants
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Débito"
                    value={config.despesa.GRANTS.debito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        GRANTS: { ...config.despesa.GRANTS, debito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.despesa.GRANTS.descricaoDebito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        GRANTS: { ...config.despesa.GRANTS, descricaoDebito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Crédito: Rubrica do banco onde o dinheiro está saindo (automático)
              </Typography>
            </Box>

            <Divider />

            {/* Termos e Parcerias */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Termos e Parcerias
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Débito"
                    value={config.despesa.TERMOS_PARCERIAS.debito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        TERMOS_PARCERIAS: { ...config.despesa.TERMOS_PARCERIAS, debito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.despesa.TERMOS_PARCERIAS.descricaoDebito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        TERMOS_PARCERIAS: { ...config.despesa.TERMOS_PARCERIAS, descricaoDebito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Crédito: Rubrica do banco onde o dinheiro está saindo (automático)
              </Typography>
            </Box>

            <Divider />

            {/* Importação */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Importação
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Débito"
                    value={config.despesa.IMPORTACAO.debito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        IMPORTACAO: { ...config.despesa.IMPORTACAO, debito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição Débito"
                    value={config.despesa.IMPORTACAO.descricaoDebito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        IMPORTACAO: { ...config.despesa.IMPORTACAO, descricaoDebito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Crédito"
                    value={config.despesa.IMPORTACAO.credito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        IMPORTACAO: { ...config.despesa.IMPORTACAO, credito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição Crédito"
                    value={config.despesa.IMPORTACAO.descricaoCredito}
                    onChange={(e) => setConfig({
                      ...config,
                      despesa: {
                        ...config.despesa,
                        IMPORTACAO: { ...config.despesa.IMPORTACAO, descricaoCredito: e.target.value }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Importação tem crédito fixo (não usa a rubrica do banco)
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Configurações de Receita */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lançamentos de Receita (Entrada na Administração)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configurações para quando o dinheiro entra na conta de administração
          </Typography>

          <Stack spacing={3}>
            {/* Conta Débito Fixa */}
            <Box>
              <Typography variant="subtitle1" color="secondary" gutterBottom>
                Conta Débito (Fixa para todas as categorias)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Débito"
                    value={config.receita.contaDebito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: { ...config.receita, contaDebito: e.target.value }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.receita.descricaoDebito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: { ...config.receita, descricaoDebito: e.target.value }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Projetos */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Projetos - Conta Crédito
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Crédito"
                    value={config.receita.categorias.PROJETOS.credito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          PROJETOS: { ...config.receita.categorias.PROJETOS, credito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.receita.categorias.PROJETOS.descricaoCredito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          PROJETOS: { ...config.receita.categorias.PROJETOS, descricaoCredito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Grants */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Grants - Conta Crédito
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Crédito"
                    value={config.receita.categorias.GRANTS.credito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          GRANTS: { ...config.receita.categorias.GRANTS, credito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.receita.categorias.GRANTS.descricaoCredito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          GRANTS: { ...config.receita.categorias.GRANTS, descricaoCredito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Termos e Parcerias */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Termos e Parcerias - Conta Crédito
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Crédito"
                    value={config.receita.categorias.TERMOS_PARCERIAS.credito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          TERMOS_PARCERIAS: { ...config.receita.categorias.TERMOS_PARCERIAS, credito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.receita.categorias.TERMOS_PARCERIAS.descricaoCredito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          TERMOS_PARCERIAS: { ...config.receita.categorias.TERMOS_PARCERIAS, descricaoCredito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Importação */}
            <Box>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Importação - Conta Crédito
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Conta Crédito"
                    value={config.receita.categorias.IMPORTACAO.credito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          IMPORTACAO: { ...config.receita.categorias.IMPORTACAO, credito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Descrição"
                    value={config.receita.categorias.IMPORTACAO.descricaoCredito}
                    onChange={(e) => setConfig({
                      ...config,
                      receita: {
                        ...config.receita,
                        categorias: {
                          ...config.receita.categorias,
                          IMPORTACAO: { ...config.receita.categorias.IMPORTACAO, descricaoCredito: e.target.value }
                        }
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
