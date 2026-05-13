import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { supabase } from '../services/supabaseClient';

interface Organization {
  id: string;
  name: string;
  code: string;
}

export default function JoinOrgPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  useEffect(() => {
    loadOrganization();
  }, [code]);

  const loadOrganization = async () => {
    if (!code) {
      setError('Código de organização inválido');
      setLoading(false);
      return;
    }

    try {
      const { data, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, code')
        .eq('code', code.toUpperCase())
        .single();

      if (orgError || !data) {
        setError('Organização não encontrada');
        setLoading(false);
        return;
      }

      setOrganization(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');

    if (!loginEmail || !loginPassword) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) throw signInError;

      // Verificar se já é membro
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organization!.id)
        .single();

      if (memberData) {
        setSuccess('Você já é membro desta organização!');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // Adicionar à organização
      const { error: joinError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization!.id,
          role: 'member',
        });

      if (joinError) throw joinError;

      setSuccess('Bem-vindo à organização!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignup = async () => {
    setError('');
    setSuccess('');

    if (!signupEmail || !signupPassword || !signupConfirmPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (signupPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      // Criar conta
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (signUpError) throw signUpError;

      if (!signUpData.user) {
        throw new Error('Erro ao criar usuário');
      }

      console.log('✅ Conta criada:', signUpData.user.id);

      // Aguardar um pouco para garantir que a sessão foi estabelecida
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Tentar adicionar à organização com retry
      let attempts = 0;
      let success = false;
      let lastError = null;

      while (attempts < 3 && !success) {
        attempts++;
        console.log(`Tentativa ${attempts} de adicionar à organização...`);

        const { data: memberData, error: joinError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: organization!.id,
            user_id: signUpData.user.id,
            role: 'member',
          })
          .select();

        if (!joinError) {
          console.log('✅ Adicionado à organização:', memberData);
          success = true;
        } else {
          console.error(`❌ Tentativa ${attempts} falhou:`, joinError);
          lastError = joinError;

          // Aguardar antes de tentar novamente
          if (attempts < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!success) {
        console.error('❌ Falhou após 3 tentativas:', lastError);
        throw new Error('Conta criada, mas não foi possível adicionar à organização. Entre em contato com o administrador.');
      }

      setSuccess('Conta criada! Bem-vindo à organização!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      console.error('❌ Erro completo:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent>
            <Alert severity="error">{error || 'Organização não encontrada'}</Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 3 }}>
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">
            Entrar na Organização
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom align="center">
            {organization.name}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }}>
            <Tab label="Já tenho conta" />
            <Tab label="Criar conta" />
          </Tabs>

          {tabIndex === 0 && (
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <TextField
                label="Senha"
                type="password"
                fullWidth
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <Button variant="contained" fullWidth onClick={handleLogin}>
                Entrar
              </Button>
            </Stack>
          )}

          {tabIndex === 1 && (
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
              <TextField
                label="Senha"
                type="password"
                fullWidth
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
              <TextField
                label="Confirmar Senha"
                type="password"
                fullWidth
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
              />
              <Button variant="contained" fullWidth onClick={handleSignup}>
                Criar Conta e Entrar
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
