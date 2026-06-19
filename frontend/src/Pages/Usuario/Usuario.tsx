import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Box,
  MenuItem,
  IconButton,
  Tooltip,
  Typography,
  CardHeader,
  CardContent,
  CircularProgress,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Pencil, Trash2, Eye, EyeOff, Copy, KeyRound } from "lucide-react";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import { MobileCard } from "../../components/MobileCard";
import { InfoItem } from "../../components/InfoItem/InfoItem";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import usuarioApi from "../../services/usuario-api";
import { Perfil } from "../../enums/perfil";
import { useNotificacao } from "../../components/Notificacao/NotificationProvider";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";

export default function Usuarios() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const { notificar } = useNotificacao();
  const theme = useTheme();
  const telaPequena = useMediaQuery(theme.breakpoints.down("sm"));

  const [usuarioForm, setUsuarioForm] = useState({
    id: "",
    nome: "",
    email: "",
    senha: "",
    tipo_usuario: Perfil.ALUNO,
    aluno_id: "",
    professor_id: "",
  });

  // Alunos/professores sem login, para os seletores de vínculo no cadastro de usuário.
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<any[]>([]);
  const [professoresDisponiveis, setProfessoresDisponiveis] = useState<any[]>([]);

  // Vínculo atual ao editar (não vem na lista de "disponíveis", pois já tem login).
  const [vinculoAtual, setVinculoAtual] = useState({
    aluno_id: "",
    aluno_nome: "",
    aluno_cpf: "",
    professor_id: "",
    professor_nome: "",
    professor_cpf: "",
  });

  const storedUser = localStorage.getItem("@UniEduca:user");
  const usuarioLogado = storedUser ? JSON.parse(storedUser) : null;

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await usuarioApi.get("/usuarios");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarAlunosDisponiveis = async () => {
    try {
      const response = await usuarioApi.get("/alunos-disponiveis");
      setAlunosDisponiveis(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erro ao carregar alunos disponíveis:", error);
      setAlunosDisponiveis([]);
    }
  };

  const carregarProfessoresDisponiveis = async () => {
    try {
      const response = await usuarioApi.get("/professores-disponiveis");
      setProfessoresDisponiveis(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erro ao carregar professores disponíveis:", error);
      setProfessoresDisponiveis([]);
    }
  };

  const carregarVinculos = () => {
    carregarAlunosDisponiveis();
    carregarProfessoresDisponiveis();
  };

  // Secretaria e Administrador têm acesso total à gestão de usuários.
  const podeGerenciarUsuarios =
    usuarioLogado?.tipo_usuario === Perfil.SECRETARIA ||
    usuarioLogado?.tipo_usuario === Perfil.ADMINISTRADOR;

  useEffect(() => {
    if (podeGerenciarUsuarios) {
      carregarUsuarios();
      carregarVinculos();
    } else {
      setLoading(false);
    }
  }, []);

  const handleOpenCadastro = () => {
    setUsuarioForm({
      id: "",
      nome: "",
      email: "",
      senha: "",
      tipo_usuario: Perfil.ALUNO,
      aluno_id: "",
      professor_id: "",
    });
    setMostrarSenha(false);
    carregarVinculos();
    setIsEditing(false);
    setOpen(true);
  };

  const handleEditar = (usuario: any) => {
    setUsuarioForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      tipo_usuario: usuario.tipo_usuario,
      aluno_id: usuario.aluno_id || "",
      professor_id: usuario.professor_id || "",
    });
    setVinculoAtual({
      aluno_id: usuario.aluno_id || "",
      aluno_nome: usuario.aluno_nome || "",
      aluno_cpf: usuario.aluno_cpf || "",
      professor_id: usuario.professor_id || "",
      professor_nome: usuario.professor_nome || "",
      professor_cpf: usuario.professor_cpf || "",
    });
    setMostrarSenha(false);
    carregarVinculos();
    setIsEditing(true);
    setOpen(true);
  };

  const handleExcluir = (id: string) => {
    setIdParaExcluir(id);
  };

  const confirmarExclusao = async () => {
    if (!idParaExcluir) return;
    try {
      await usuarioApi.delete(`/usuarios/${idParaExcluir}`);
      notificar("Usuário removido com sucesso!", "success");
      carregarUsuarios();
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      notificar(
        error.response?.data?.error || "Erro ao excluir usuário.",
        "error"
      );
    } finally {
      setIdParaExcluir(null);
    }
  };

  // Gera uma senha forte aleatória com ao menos uma letra maiúscula,
  // minúscula, número e símbolo. Evita caracteres ambíguos (O/0, l/1).
  const gerarSenha = () => {
    const maiusculas = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const minusculas = "abcdefghijkmnpqrstuvwxyz";
    const numeros = "23456789";
    const simbolos = "!@#$%&*?";
    const todos = maiusculas + minusculas + numeros + simbolos;

    const sortear = (conjunto: string) =>
      conjunto[Math.floor(Math.random() * conjunto.length)];

    const caracteres = [
      sortear(maiusculas),
      sortear(minusculas),
      sortear(numeros),
      sortear(simbolos),
    ];
    for (let i = caracteres.length; i < 12; i++) {
      caracteres.push(sortear(todos));
    }
    const novaSenha = caracteres.sort(() => Math.random() - 0.5).join("");

    setUsuarioForm((prev) => ({ ...prev, senha: novaSenha }));
    setMostrarSenha(true);
  };

  const copiarSenha = async () => {
    if (!usuarioForm.senha) return;
    try {
      await navigator.clipboard.writeText(usuarioForm.senha);
      notificar("Senha copiada para a área de transferência.", "success");
    } catch {
      notificar("Não foi possível copiar a senha.", "error");
    }
  };

  const handleSalvar = async () => {
    if (!usuarioForm.nome || !usuarioForm.email) {
      notificar("Preencha os campos obrigatórios.", "warning");
      return;
    }

    if (!isEditing && !usuarioForm.senha) {
      notificar('Defina uma senha ou clique em "Gerar senha".', "warning");
      return;
    }

    try {
      if (isEditing) {
        const { id, nome, email, senha, tipo_usuario, aluno_id, professor_id } =
          usuarioForm;

        const payload: any = {
          nome,
          email,
          tipo_usuario,
          // Envia o vínculo conforme o tipo; vazio significa "desvincular".
          aluno_id: tipo_usuario === Perfil.ALUNO ? aluno_id : "",
          professor_id: tipo_usuario === Perfil.PROFESSOR ? professor_id : "",
        };

        if (senha) payload.senha = senha;

        await usuarioApi.put(`/usuarios/${id}`, payload);
        notificar("Usuário atualizado com sucesso!", "success");
      } else {
        await usuarioApi.post("/cadastro", usuarioForm);
        notificar("Usuário cadastrado com sucesso!", "success");
      }

      setOpen(false);
      carregarUsuarios();
      carregarVinculos();
    } catch (error: any) {
      console.error("Erro ao realizar a operação:", error);
      notificar(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Erro ao realizar a operação.",
        "error"
      );
    }
  };

  // Inclui o vínculo atual nas opções.
  const opcoesAlunos = [...alunosDisponiveis];
  if (
    vinculoAtual.aluno_id &&
    !opcoesAlunos.some((a) => a.id === vinculoAtual.aluno_id)
  ) {
    opcoesAlunos.unshift({
      id: vinculoAtual.aluno_id,
      nome: vinculoAtual.aluno_nome,
      cpf: vinculoAtual.aluno_cpf,
    });
  }

  const opcoesProfessores = [...professoresDisponiveis];
  if (
    vinculoAtual.professor_id &&
    !opcoesProfessores.some((p) => p.id === vinculoAtual.professor_id)
  ) {
    opcoesProfessores.unshift({
      id: vinculoAtual.professor_id,
      nome: vinculoAtual.professor_nome,
      cpf: vinculoAtual.professor_cpf,
    });
  }

  const rowsFiltradas = rows.filter(
    (row) =>
      row.nome.toLowerCase().includes(search.toLowerCase()) ||
      row.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns: any[] = [
    { field: "nome", headerName: "Nome", flex: 1, minWidth: 160 },
    { field: "email", headerName: "E-mail", flex: 1, minWidth: 200 },
    { field: "tipo_usuario", headerName: "Perfil", width: 150 },
    {
      field: "acoes",
      headerName: "Ações",
      width: 120,
      align: "center",
      renderCell: (params: any) => (
        <Box display="flex" gap={1}>
          <Tooltip title="Editar">
            <IconButton color="primary" onClick={() => handleEditar(params.row)}>
              <Pencil size={18} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Excluir">
            <IconButton color="error" onClick={() => handleExcluir(params.row.id)}>
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  if (!usuarioLogado) {
    return <Navigate to="/login" replace />;
  }

  if (!podeGerenciarUsuarios) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container>
      <SearchTextField
        buttonOnClick={handleOpenCadastro}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar por nome ou e-mail..."
        showFilters={false}
      >
        Usuários
      </SearchTextField>

      {telaPequena ? (
        loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : rowsFiltradas.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Nenhum usuário encontrado.
          </Typography>
        ) : (
          rowsFiltradas.map((usuario) => (
            <MobileCard.Root key={usuario.id}>
              <CardHeader
                sx={(theme) => ({
                  backgroundColor: theme.palette.grey[50],
                  borderBottom: `1px solid ${theme.palette.grey[200]}`,
                  py: 1,
                  px: 2,
                })}
                title={
                  <Typography fontWeight="bold" fontSize={16}>
                    {usuario.nome}
                  </Typography>
                }
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Editar">
                      <IconButton
                        color="primary"
                        onClick={() => handleEditar(usuario)}
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        color="error"
                        onClick={() => handleExcluir(usuario.id)}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />
              <CardContent sx={{ py: 2, px: 2 }}>
                <Stack spacing={1}>
                  <InfoItem label="E-mail">{usuario.email}</InfoItem>
                  <InfoItem label="Perfil">{usuario.tipo_usuario}</InfoItem>
                </Stack>
              </CardContent>
            </MobileCard.Root>
          ))
        )
      ) : (
        <DataTable columns={columns} rows={rowsFiltradas} loading={loading} />
      )}

      <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="sm"
          fullScreen={telaPequena}
          slotProps={{ paper: { sx: { backgroundColor: "background.default" } } }}
        >
          <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nome"
                fullWidth
                required
                value={usuarioForm.nome}
                onChange={(e) =>
                  setUsuarioForm({ ...usuarioForm, nome: e.target.value })
                }
              />

              <TextField
                label="E-mail"
                fullWidth
                required
                type="email"
                value={usuarioForm.email}
                onChange={(e) =>
                  setUsuarioForm({ ...usuarioForm, email: e.target.value })
                }
              />

              <TextField
                select
                label="Perfil"
                fullWidth
                value={usuarioForm.tipo_usuario}
                onChange={(e) =>
                  setUsuarioForm({
                    ...usuarioForm,
                    tipo_usuario: e.target.value as Perfil,
                    aluno_id: "",
                    professor_id: "",
                  })
                }
              >
                <MenuItem value={Perfil.ALUNO}>Aluno</MenuItem>
                <MenuItem value={Perfil.PROFESSOR}>Professor</MenuItem>
                <MenuItem value={Perfil.SECRETARIA}>Secretaria</MenuItem>
                <MenuItem value={Perfil.ADMINISTRADOR}>Administrador</MenuItem>
              </TextField>

              {usuarioForm.tipo_usuario === Perfil.ALUNO && (
                <TextField
                  select
                  label="Vincular ao aluno (opcional)"
                  fullWidth
                  value={usuarioForm.aluno_id}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, aluno_id: e.target.value })
                  }
                  helperText={
                    opcoesAlunos.length === 0
                      ? "Nenhum aluno sem login disponível no momento."
                      : "O login será ligado a este aluno, e o perfil mostrará os dados dele."
                  }
                >
                  <MenuItem value="">
                    <em>Não vincular</em>
                  </MenuItem>
                  {opcoesAlunos.map((aluno) => (
                    <MenuItem key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                      {aluno.cpf ? ` — ${aluno.cpf}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {usuarioForm.tipo_usuario === Perfil.PROFESSOR && (
                <TextField
                  select
                  label="Vincular ao professor (opcional)"
                  fullWidth
                  value={usuarioForm.professor_id}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, professor_id: e.target.value })
                  }
                  helperText={
                    opcoesProfessores.length === 0
                      ? "Nenhum professor sem login disponível no momento."
                      : "O login será ligado a este professor, e o perfil mostrará os dados dele."
                  }
                >
                  <MenuItem value="">
                    <em>Não vincular</em>
                  </MenuItem>
                  {opcoesProfessores.map((professor) => (
                    <MenuItem key={professor.id} value={professor.id}>
                      {professor.nome}
                      {professor.cpf ? ` — ${professor.cpf}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                label={isEditing ? "Nova Senha (opcional)" : "Senha"}
                required={!isEditing}
                type={mostrarSenha ? "text" : "password"}
                fullWidth
                helperText={
                  isEditing
                    ? "Deixe em branco para não alterar"
                    : 'Defina uma senha ou clique em "Gerar senha".'
                }
                value={usuarioForm.senha}
                onChange={(e) =>
                  setUsuarioForm({ ...usuarioForm, senha: e.target.value })
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={mostrarSenha ? "Ocultar" : "Mostrar"}>
                          <IconButton
                            edge="end"
                            onClick={() => setMostrarSenha((v) => !v)}
                          >
                            {mostrarSenha ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copiar senha">
                          <span>
                            <IconButton
                              edge="end"
                              onClick={copiarSenha}
                              disabled={!usuarioForm.senha}
                            >
                              <Copy size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                variant="outlined"
                startIcon={<KeyRound size={18} />}
                onClick={gerarSenha}
                sx={{ width: "100%", height: "auto", py: 1, whiteSpace: "nowrap" }}
              >
                Gerar senha
              </Button>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpen(false)} sx={{ color: "text.secondary" }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              variant="contained"
              color="primary"
              sx={{ width: { xs: "auto", sm: "30%" }, whiteSpace: "nowrap" }}
            >
              {isEditing ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={idParaExcluir !== null}
          titulo="Excluir usuário"
          mensagem="Deseja realmente excluir este usuário? Esta ação não pode ser desfeita."
          textoConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setIdParaExcluir(null)}
        />
    </Container>
  );
}