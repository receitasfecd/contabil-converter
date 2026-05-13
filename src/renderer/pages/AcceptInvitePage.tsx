import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<any>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token de convite inválido');
      setLoading(false);
      return;
    }

    loadInviteInfo();
  }, [token]);

  const loadInviteInfo = async () => {
    try {
      // Buscar informações do convite
      const { data, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*, organizations(name)')
        .eq('token', token)
        .single();

      if (inviteError) throw new Error('Convite não encontrado');

      if (data.status !== 'pending') {
        throw new Error('Este convite já foi usado ou expirado');
      }

      if (new Date(data.expires_at) < new Date()) {
        throw new Error('Este convite expirou');
      }

      setInviteInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirecionar para login com redirect de volta
        navigate(`/?redirect=/aceitar-convite?token=${token}`);
        return;
      }

      // Verificar se email do usuário corresponde ao convite
      if (user.email !== inviteInfo.email) {
        throw new Error(`Este convite é para ${inviteInfo.email}. Você está logado como ${user.email}.`);
      }

      // Aceitar convite
      const { data, error: acceptError } = await supabase.rpc('accept_invite', {
        invite_token: token
      });

      if (acceptError) throw acceptError;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Erro ao aceitar convite');
      }

      setSuccess(true);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/');
        window.location.reload(); // Recarregar para atualizar contexto
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 2,
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Convite Aceito!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Você agora faz parte da organização <strong>{inviteInfo.organizations.name}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Redirecionando...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 2,
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Error sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Erro ao Aceitar Convite
            </Typography>
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ mt: 3 }}
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ py: 4 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Convite para Organização
          </Typography>

          <Box sx={{ my: 3 }}>
            <Typography variant="body1" gutterBottom>
              Você foi convidado para fazer parte da organização:
            </Typography>
            <Typography variant="h6" color="primary" gutterBottom>
              {inviteInfo?.organizations?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: {inviteInfo?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {inviteInfo?.role === 'admin' ? 'Administrador' : 'Membro'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleAccept}
          >
            Aceitar Convite
          </Button>

          <Button
            variant="text"
            fullWidth
            onClick={() => navigate('/')}
            sx={{ mt: 1 }}
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
