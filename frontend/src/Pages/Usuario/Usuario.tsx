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
  Typography,
  Box,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Search, Pencil, Trash2 } from "lucide-react";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import usuarioApi from "../../services/usuario-api";
import { Perfil } from "../../enums/perfil";

export default function Usuarios() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [usuarioForm, setUsuarioForm] = useState({
    id: "",
    nome: "",
    email: "",
    senha: "",
    tipo_usuario: Perfil.ALUNO,
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

  useEffect(() => {
    if (usuarioLogado?.tipo_usuario === Perfil.SECRETARIA) {
      carregarUsuarios();
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
    });
    setIsEditing(false);
    setOpen(true);
  };

  const handleEditar = (usuario: any) => {
    setUsuarioForm({ ...usuario, senha: "" });
    setIsEditing(true);
    setOpen(true);
  };

  const handleExcluir = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este usuário?")) {
      try {
        await usuarioApi.delete(`/usuarios/${id}`);
        alert("Usuário removido com sucesso!");
        carregarUsuarios();
      } catch (error) {
        alert("Erro ao excluir usuário.");
      }
    }
  };

  const handleSalvar = async () => {
    if (!usuarioForm.nome || !usuarioForm.email) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    try {
      if (isEditing) {
        const { id, nome, email, senha, tipo_usuario } = usuarioForm;

        const payload = senha
          ? { nome, email, senha, tipo_usuario }
          : { nome, email, tipo_usuario };

        await usuarioApi.put(`/usuarios/${id}`, payload);
        alert("Usuário atualizado!");
      } else {
        await usuarioApi.post("/cadastro", usuarioForm);
        alert("Usuário cadastrado com sucesso!");
      }

      setOpen(false);
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao realizar a operação:", error);
      alert("Erro ao realizar a operação.");
    }
  };

  const rowsFiltradas = rows.filter(
    (row) =>
      row.nome.toLowerCase().includes(search.toLowerCase()) ||
      row.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns: any[] = [
    { field: "nome", headerName: "Nome", flex: 1 },
    { field: "email", headerName: "E-mail", flex: 1 },
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
      <Box
        sx={{
          height: "620px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={3}
          sx={{
            mb: 4,
            mt: 2,
            width: "100%",
            flexShrink: 0,
          }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ whiteSpace: "nowrap" }}
          >
            Usuários
          </Typography>

          <TextField
            size="small"
            placeholder="Pesquisar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, color: "text.secondary", display: "flex" }}>
                  <Search size={18} />
                </Box>
              ),
            }}
            sx={{
              flex: 1,
              backgroundColor: "white",
              "& .MuiOutlinedInput-root": {
                borderRadius: "20px",
              },
            }}
          />

          <Button
            variant="contained"
            onClick={handleOpenCadastro}
            sx={{
              backgroundColor: "#00B4D8",
              fontWeight: "bold",
              minWidth: "130px",
              borderRadius: "20px",
              height: "40px",
              whiteSpace: "nowrap",
            }}
          >
            Adicionar
          </Button>
        </Box>

        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            sx={{ flex: 1 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <DataTable columns={columns} rows={rowsFiltradas} />
          </Box>
        )}

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: "bold" }}>
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
                  })
                }
              >
                <MenuItem value={Perfil.ALUNO}>Aluno</MenuItem>
                <MenuItem value={Perfil.PROFESSOR}>Professor</MenuItem>
                <MenuItem value={Perfil.SECRETARIA}>Secretaria</MenuItem>
              </TextField>

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
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              variant="contained"
              sx={{ backgroundColor: "#00B4D8", width: "30%" }}
            >
              {isEditing ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}