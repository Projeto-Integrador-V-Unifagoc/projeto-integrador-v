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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
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

  useEffect(() => {
    if (usuarioLogado?.tipo_usuario === Perfil.SECRETARIA) {
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
      senha: "Mudar@123",
      tipo_usuario: Perfil.ALUNO,
      aluno_id: "",
      professor_id: "",
    });
    carregarVinculos();
    setIsEditing(false);
    setOpen(true);
  };

  const handleEditar = (usuario: any) => {
    setUsuarioForm({ ...usuario, senha: "", aluno_id: "", professor_id: "" });
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

  const handleSalvar = async () => {
    if (!usuarioForm.nome || !usuarioForm.email) {
      notificar("Preencha os campos obrigatórios.", "warning");
      return;
    }

    try {
      if (isEditing) {
        const { id, nome, email, senha, tipo_usuario } = usuarioForm;

        const payload = senha
          ? { nome, email, senha, tipo_usuario }
          : { nome, email, tipo_usuario };

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

  if (usuarioLogado.tipo_usuario !== Perfil.SECRETARIA) {
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

      <DataTable columns={columns} rows={rowsFiltradas} loading={loading} />

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
              </TextField>

              {!isEditing && usuarioForm.tipo_usuario === Perfil.ALUNO && (
                <TextField
                  select
                  label="Vincular ao aluno (opcional)"
                  fullWidth
                  value={usuarioForm.aluno_id}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, aluno_id: e.target.value })
                  }
                  helperText={
                    alunosDisponiveis.length === 0
                      ? "Nenhum aluno sem login disponível no momento."
                      : "O login será ligado a este aluno, e o perfil mostrará os dados dele."
                  }
                >
                  <MenuItem value="">
                    <em>Não vincular</em>
                  </MenuItem>
                  {alunosDisponiveis.map((aluno) => (
                    <MenuItem key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                      {aluno.cpf ? ` — ${aluno.cpf}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {!isEditing && usuarioForm.tipo_usuario === Perfil.PROFESSOR && (
                <TextField
                  select
                  label="Vincular ao professor (opcional)"
                  fullWidth
                  value={usuarioForm.professor_id}
                  onChange={(e) =>
                    setUsuarioForm({ ...usuarioForm, professor_id: e.target.value })
                  }
                  helperText={
                    professoresDisponiveis.length === 0
                      ? "Nenhum professor sem login disponível no momento."
                      : "O login será ligado a este professor, e o perfil mostrará os dados dele."
                  }
                >
                  <MenuItem value="">
                    <em>Não vincular</em>
                  </MenuItem>
                  {professoresDisponiveis.map((professor) => (
                    <MenuItem key={professor.id} value={professor.id}>
                      {professor.nome}
                      {professor.cpf ? ` — ${professor.cpf}` : ""}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                label={isEditing ? "Nova Senha (opcional)" : "Senha"}
                type="password"
                fullWidth
                helperText={
                  isEditing
                    ? "Deixe em branco para não alterar"
                    : "Senha inicial do usuário"
                }
                value={usuarioForm.senha}
                onChange={(e) =>
                  setUsuarioForm({ ...usuarioForm, senha: e.target.value })
                }
              />
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