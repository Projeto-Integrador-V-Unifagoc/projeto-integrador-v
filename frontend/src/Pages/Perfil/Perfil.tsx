import { useEffect, useState } from "react";

import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
 TableRow,
  Tabs,
  Typography,
} from "@mui/material";

import { Edit, Save, UserRound } from "lucide-react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
}

export default function Perfil() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState(0);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const token = localStorage.getItem("@UniEduca:token");

        const resposta = await fetch("http://localhost:3000/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const dados = await resposta.json();
        setUsuario(dados.data);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarPerfil();
  }, []);

  const Campo = ({ label, valor }: { label: string; valor: string }) => (
    <Box>
      <Typography color="text.secondary" fontSize={14} mb={0.5}>
        {label}
      </Typography>

      <Box sx={{ display: "flex" }}>
        <Box
          sx={{
            height: 42,
            flex: 1,
            bgcolor: "#eeeeee",
            border: "1px solid #d0d0d0",
            display: "flex",
            alignItems: "center",
            px: 2,
            fontSize: 16,
            color: "#555",
          }}
        >
          {valor}
        </Box>

        <Box
          sx={{
            width: 48,
            height: 42,
            bgcolor: "#8ab5ab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <Edit size={18} />
        </Box>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography
        sx={{
          fontSize: "3rem",
          fontWeight: 300,
          color: "#5f6670",
          letterSpacing: 1,
          mb: 4,
          textTransform: "uppercase",
        }}
      >
        LUIZ
      </Typography>

      <Stack direction="row" justifyContent="flex-end" mb={4}>
        <Chip
          label="Matriculado"
          sx={{
            px: 3,
            py: 2,
            fontWeight: "bold",
            color: "#0b7285",
            bgcolor: "#e9ecef",
            borderRadius: 10,
          }}
        />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          bgcolor: "#eeeeee",
          p: 4,
          mb: 4,
          borderRadius: 0,
          minHeight: 260,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            sx={{
              width: 200,
              height: 200,
              fontSize: 80,
              bgcolor: "#8a8a96",
              border: "4px solid white",
            }}
          >
            LZ
          </Avatar>

          <Box>
            <Typography color="#2c7a7b" fontSize={18}>
              Registro acadêmico
            </Typography>

            <Typography mb={3} fontSize={18}>
              202601847
            </Typography>

            <Typography color="#2c7a7b" fontSize={18}>
              Curso
            </Typography>

            <Typography mb={3} fontSize={18}>
              CIÊNCIA DA COMPUTAÇÃO
            </Typography>

            <Typography color="#2c7a7b" fontSize={18}>
              Habilitação
            </Typography>

            <Typography mb={3} fontSize={18}>
              CIÊNCIA DA COMPUTAÇÃO
            </Typography>

            <Typography color="#2c7a7b" fontSize={18}>
              Turno
            </Typography>

            <Typography fontSize={18}>NOTURNO</Typography>
          </Box>
        </Stack>
      </Paper>

      <Tabs
        value={aba}
        onChange={(_, novoValor) => setAba(novoValor)}
        sx={{
          borderBottom: "1px solid #ddd",
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: "bold",
            color: "#216869",
          },
          "& .Mui-selected": {
            color: "#216869 !important",
          },
          "& .MuiTabs-indicator": {
            bgcolor: "#216869",
          },
        }}
      >
        <Tab label="Dados pessoais" />
        <Tab label="Responsáveis" />
      </Tabs>

      {aba === 0 && (
        <Box>
          <Typography variant="h6" color="#216869" fontWeight="bold" mb={1}>
            Filiação
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#6f7f80" }}>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Nome
                </TableCell>

                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Tipo de relacionamento
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              <TableRow>
                <TableCell>ANA CLARA </TableCell>
                <TableCell>MÃE</TableCell>
              </TableRow>

              <TableRow sx={{ bgcolor: "#f2f2f2" }}>
                <TableCell>ROBERTO HENRIQUE </TableCell>
                <TableCell>PAI</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Typography variant="h6" color="#216869" fontWeight="bold" mb={1}>
            Contato
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 2,
              mb: 3,
            }}
          >
            <Campo label="E-mail" valor="aluno.teste@email.com" />
            <Campo label="Celular" valor="" />
            <Campo label="Telefone Fixo" valor="(32) 3333-4455" />

            <Campo label="Outro Telefone" valor="" />
            <Campo label="Fax" valor="" />
            <Campo label="Telefone corporativo" valor="" />
          </Box>

          <Typography variant="h6" color="#216869" fontWeight="bold" mb={1}>
            Endereço
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 1fr",
              gap: 2,
            }}
          >
            <Campo label="CEP" valor="36500-000" />
            <Campo label="Logradouro" valor="RUA DAS FLORES" />
            <Campo label="Número" valor="123" />

            <Campo label="Complemento" valor="CASA" />
            <Campo label="Bairro" valor="CENTRO" />
            <Campo label="Cidade" valor="Ubá" />

            <Campo label="Estado" valor="Minas Gerais" />
            <Campo label="País" valor="Brasil" />
          </Box>
        </Box>
      )}

      {aba === 1 && (
        <Box>
          <Typography variant="h6" color="#216869" fontWeight="bold" mb={1}>
            Responsável Financeiro
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1.1fr",
              gap: 8,
            }}
          >
            <Stack direction="row" spacing={2}>
              <Paper
                sx={{
                  width: 125,
                  height: 125,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserRound size={90} color="#334a5f" />
              </Paper>

              <Box>
                <Typography color="text.secondary">Nome</Typography>
                <Typography mb={4}>LUIZ</Typography>

                <Typography color="text.secondary">Parentesco</Typography>
                <Typography mb={4}>Outros</Typography>

                <Typography color="text.secondary">Responsável</Typography>
                <Typography mb={4}>Financeiro</Typography>

                <Typography color="text.secondary">Status</Typography>
                <Typography>Ativo</Typography>
              </Box>
            </Stack>

            <Box sx={{ display: "grid", gap: 2 }}>
              <Campo label="E-mail" valor="responsavel.teste@email.com" />
              <Campo label="Telefone" valor="" />
              <Campo label="Celular" valor="(32) 98888-7777" />
              <Campo label="Telefone comercial" valor="" />
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            sx={{
              mt: 6,
              px: 3,
              py: 1.2,
              bgcolor: "#4b8f80",
              textTransform: "none",
              fontWeight: "bold",
              borderRadius: 1,
              minWidth: 220,
              whiteSpace: "nowrap",
              "&:hover": {
                bgcolor: "#3f7d70",
              },
            }}
          >
            Atualizar informações
          </Button>
        </Box>
      )}
    </Box>
  );
}