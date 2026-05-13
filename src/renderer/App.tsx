import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { Upload, Settings, Preview, SwapHoriz, AccountBalance, UploadFile, AttachMoney } from '@mui/icons-material';
import { theme } from './theme';
import { AppProvider } from './AppContext';

// Lazy load das páginas para reduzir bundle inicial
const ImportPage = lazy(() => import('./pages/ImportPage'));
const BatchImportPage = lazy(() => import('./pages/BatchImportPage'));
const ImportContasNasajonPage = lazy(() => import('./pages/ImportContasNasajonPage'));
const MappingPage = lazy(() => import('./pages/MappingPage'));
const PreviewPage = lazy(() => import('./pages/PreviewPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));
const TaxasAdministracaoPage = lazy(() => import('./pages/TaxasAdministracaoPage'));
const TaxaConfigPage = lazy(() => import('./pages/TaxaConfigPage'));
const ImportedAccountsPage = lazy(() => import('./pages/ImportedAccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage'));
const BalancetePage = lazy(() => import('./pages/BalancetePage'));

const drawerWidth = 240;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Router>
          <Box sx={{ display: 'flex' }}>
            <AppBar
              position="fixed"
              sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
              <Toolbar>
                <Typography variant="h6" noWrap component="div">
                  Conversor Contábil Nasajon
                </Typography>
              </Toolbar>
            </AppBar>

            <Drawer
              variant="permanent"
              sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: drawerWidth,
                  boxSizing: 'border-box',
                },
              }}
            >
              <Toolbar />
              <Box sx={{ overflow: 'auto' }}>
                <List>
                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/">
                      <ListItemIcon>
                        <Upload />
                      </ListItemIcon>
                      <ListItemText primary="Importar" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/importacao-lote">
                      <ListItemIcon>
                        <UploadFile />
                      </ListItemIcon>
                      <ListItemText primary="Importação em Lote" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/contas">
                      <ListItemIcon>
                        <AccountBalance />
                      </ListItemIcon>
                      <ListItemText primary="Contas" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/mapeamento">
                      <ListItemIcon>
                        <Settings />
                      </ListItemIcon>
                      <ListItemText primary="Mapeamento" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/transferencias">
                      <ListItemIcon>
                        <SwapHoriz />
                      </ListItemIcon>
                      <ListItemText primary="Transferências" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/taxas-administracao">
                      <ListItemIcon>
                        <AttachMoney />
                      </ListItemIcon>
                      <ListItemText primary="Taxas de Administração" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/taxas-config">
                      <ListItemIcon>
                        <Settings />
                      </ListItemIcon>
                      <ListItemText primary="Config. Taxas" />
                    </ListItemButton>
                  </ListItem>

                  <ListItem disablePadding>
                    <ListItemButton component="a" href="/preview">
                      <ListItemIcon>
                        <Preview />
                      </ListItemIcon>
                      <ListItemText primary="Preview" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Box>
            </Drawer>

            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                backgroundColor: 'background.default',
                minHeight: '100vh',
              }}
            >
              <Toolbar />
              <Suspense fallback={
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                  <CircularProgress />
                </Box>
              }>
                <Routes>
                  <Route path="/" element={<ImportPage />} />
                  <Route path="/importacao-lote" element={<BatchImportPage />} />
                  <Route path="/importar-nasajon" element={<ImportContasNasajonPage />} />
                  <Route path="/contas" element={<ImportedAccountsPage />} />
                  <Route path="/contas/:accountId" element={<AccountDetailPage />} />
                  <Route path="/mapeamento" element={<MappingPage />} />
                  <Route path="/transferencias" element={<TransfersPage />} />
                  <Route path="/taxas-administracao" element={<TaxasAdministracaoPage />} />
                  <Route path="/taxas-config" element={<TaxaConfigPage />} />
                  <Route path="/preview" element={<PreviewPage />} />
                  <Route path="/balancete" element={<BalancetePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Box>
          </Box>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
