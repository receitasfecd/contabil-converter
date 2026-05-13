import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Delete, PersonAdd, ContentCopy, Edit } from '@mui/icons-material';
import { supabase } from '../services/supabaseClient';

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function OrganizationPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar organização e role do usuário
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role, organizations(id, name)')
        .limit(1);

      if (memberError) throw memberError;
      if (!memberData || memberData.length === 0) {
        throw new Error('Você não pertence a nenhuma organização');
      }

      const firstMember = memberData[0];
      setOrganization(firstMember.organizations as Organization);
      setCurrentUserRole(firstMember.role);

      // Carregar membros com emails
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members_with_email')
        .select('*')
        .eq('organization_id', firstMember.organization_id);

      if (membersError) throw membersError;

      setMembers(membersData || []);

      // Carregar convites
      const { data: invitesData, error: invitesError } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', firstMember.organization_id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    setError('');
    setSuccess('');

    if (!inviteEmail) {
      setError('Digite um email válido');
      return;
    }

    try {
      // Gerar token
      const { data: tokenData } = await supabase.rpc('generate_invite_token');
      const token = tokenData;

      // Criar convite
      const { error: inviteError } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization?.id,
          email: inviteEmail,
          role: inviteRole,
          token: token,
        });

      if (inviteError) throw inviteError;

      setSuccess('Convite enviado com sucesso!');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      loadData();
    } catch (err: any) {
      console.error('Erro ao enviar convite:', err);
      setError(err.message);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este convite?')) return;

    try {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setSuccess('Convite cancelado');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Membro removido');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Role atualizado');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/aceitar-convite?token=${token}`;
    navigator.clipboard.writeText(link);
    setSuccess('Link copiado para a área de transferência!');
  };

  const handleEditOrgName = () => {
    setNewOrgName(organization?.name || '');
    setEditOrgDialogOpen(true);
  };

  const handleSaveOrgName = async () => {
    if (!newOrgName.trim()) {
      setError('Nome da organização não pode estar vazio');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ name: newOrgName })
        .eq('id', organization?.id);

      if (updateError) throw updateError;

      setSuccess('Nome da organização atualizado!');
      setEditOrgDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      default: return 'Membro';
    }
  };

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canDeleteMembers = currentUserRole === 'owner';

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Organização
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Informações da Organização */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" gutterBottom>
                {organization?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sua role: <Chip label={getRoleLabel(currentUserRole)} color={getRoleColor(currentUserRole)} size="small" />
              </Typography>
            </Box>
            {currentUserRole === 'owner' && (
              <IconButton onClick={handleEditOrgName} color="primary">
                <Edit />
              </IconButton>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Membros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Membros ({members.length})
            </Typography>
            {canManageMembers && (
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setInviteDialogOpen(true)}
              >
                Convidar Membro
              </Button>
            )}
          </Stack>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Membro desde</TableCell>
                  {canDeleteMembers && <TableCell>Ações</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {canDeleteMembers && member.role !== 'owner' ? (
                        <Select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          size="small"
                        >
                          <MenuItem value="member">Membro</MenuItem>
                          <MenuItem value="admin">Administrador</MenuItem>
                        </Select>
                      ) : (
                        <Chip label={getRoleLabel(member.role)} color={getRoleColor(member.role)} size="small" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                    {canDeleteMembers && (
                      <TableCell>
                        {member.role !== 'owner' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMember(member.id)}
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Convites Pendentes */}
      {canManageMembers && invites.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Convites Pendentes ({invites.filter(i => i.status === 'pending').length})
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Expira em</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Chip label={getRoleLabel(invite.role)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invite.status === 'pending' ? 'Pendente' : invite.status === 'accepted' ? 'Aceito' : 'Expirado'}
                          color={invite.status === 'pending' ? 'warning' : invite.status === 'accepted' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {invite.status === 'pending' && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => copyInviteLink(invite.token)}
                                title="Copiar link do convite"
                              >
                                <ContentCopy />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteInvite(invite.id)}
                              >
                                <Delete />
                              </IconButton>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Convite */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
        <DialogTitle>Convidar Membro</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteRole}
              label="Role"
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
            >
              <MenuItem value="member">Membro</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleInvite} variant="contained">
            Enviar Convite
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Edição do Nome da Organização */}
      <Dialog open={editOrgDialogOpen} onClose={() => setEditOrgDialogOpen(false)}>
        <DialogTitle>Editar Nome da Organização</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome da Organização"
            type="text"
            fullWidth
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOrgDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveOrgName} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
