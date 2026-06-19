import { useEffect, useState } from "react";

import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { UserRound } from "lucide-react";
import { useNotificacao } from "../../components/Notificacao/NotificationProvider";

interface Pessoa {
  nome: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  estado: string | null;
  cep: string | null;
}

interface Academico {
  curso?: string | null;
  curso_codigo?: string | null;
  periodo?: string | null;
  faculdade?: string | null;
}

interface PerfilData {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
  pessoa: Pessoa | null;
  academico: Academico | null;
}

const ROTULO_PERFIL: Record<string, string> = {
  aluno: "Aluno",
  professor: "Professor",
  secretaria: "Secretaria",
  administrador: "Administrador",
};

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function formatarData(data: string | null): string {
  if (!data) return "—";
  const d = new Date(data);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function Perfil() {
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const { notificar } = useNotificacao();

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const token = localStorage.getItem("@UniEduca:token");

        const resposta = await fetch("http://localhost:3000/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar os dados do perfil.");
        }

        const dados = await resposta.json();
        setPerfil(dados.data);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        notificar("Erro ao carregar os dados do perfil.", "error");
      } finally {
        setLoading(false);
      }
    }

    carregarPerfil();
  }, [notificar]);

  // Campo de exibição (somente leitura) com rótulo e valor.
  const Campo = ({ label, valor }: { label: string; valor?: string | null }) => (
    <Box>
      <Typography color="text.secondary" fontSize={14} mb={0.5}>
        {label}
      </Typography>
      <Box
        sx={{
          minHeight: 42,
          bgcolor: "#f5f5f5",
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1,
          fontSize: 16,
          color: "#555",
          wordBreak: "break-word",
        }}
      >
        {valor || "—"}
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

  if (!perfil) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography color="text.secondary">
          Não foi possível carregar o perfil.
        </Typography>
      </Box>
    );
  }

  const { pessoa, academico } = perfil;
  const nomeExibicao = pessoa?.nome || perfil.nome;
  const rotuloPerfil = ROTULO_PERFIL[perfil.tipo_usuario] ?? perfil.tipo_usuario;
  const temEndereco = !!pessoa && !!(pessoa.logradouro || pessoa.bairro || pessoa.cep);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={2}
        mb={4}
      >
        <Typography
          sx={{
            fontSize: { xs: "1.8rem", sm: "2.3rem", md: "2.8rem" },
            fontWeight: 300,
            color: "#5f6670",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {nomeExibicao}
        </Typography>

        <Chip
          label={rotuloPerfil}
          sx={{
            px: 3,
            py: 2,
            fontWeight: "bold",
            color: "primary.main",
            bgcolor: "#e9ecef",
            borderRadius: 10,
          }}
        />
      </Stack>

      <Paper
        elevation={0}
        sx={{
          bgcolor: "#eeeeee",
          p: { xs: 2, sm: 3, md: 4 },
          mb: 4,
          borderRadius: 2,
          minHeight: 200,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          alignItems="center"
          textAlign={{ xs: "center", sm: "left" }}
        >
          <Avatar
            sx={{
              width: { xs: 110, sm: 150 },
              height: { xs: 110, sm: 150 },
              fontSize: { xs: 44, sm: 60 },
              bgcolor: "#8a8a96",
              border: "4px solid white",
            }}
          >
            {pessoa?.nome ? iniciais(pessoa.nome) : <UserRound size={60} />}
          </Avatar>

          <Box>
            <Typography color="primary.main" fontSize={16}>
              E-mail
            </Typography>
            <Typography mb={2} fontSize={18}>
              {perfil.email}
            </Typography>

            {academico?.curso && (
              <>
                <Typography color="primary.main" fontSize={16}>
                  Curso
                </Typography>
                <Typography mb={2} fontSize={18}>
                  {academico.curso}
                </Typography>
              </>
            )}

            {perfil.tipo_usuario === "aluno" && academico?.periodo && (
              <>
                <Typography color="primary.main" fontSize={16}>
                  Período
                </Typography>
                <Typography fontSize={18}>{academico.periodo}º período</Typography>
              </>
            )}

            {perfil.tipo_usuario === "professor" && academico?.faculdade && (
              <>
                <Typography color="primary.main" fontSize={16}>
                  Faculdade
                </Typography>
                <Typography fontSize={18}>{academico.faculdade}</Typography>
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Secretaria (ou aluno/professor sem vínculo) não possui registro de pessoa. */}
      {!pessoa ? (
        <Typography color="text.secondary">
          Este perfil não possui dados pessoais ou acadêmicos vinculados.
        </Typography>
      ) : (
        <>
          <Typography variant="h6" color="primary.main" fontWeight="bold" mb={1}>
            Dados pessoais
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
              gap: 2,
              mb: 4,
            }}
          >
            <Campo label="Nome" valor={pessoa.nome} />
            <Campo label="E-mail" valor={perfil.email} />
            <Campo label="CPF" valor={pessoa.cpf} />
            <Campo label="Data de nascimento" valor={formatarData(pessoa.data_nascimento)} />
          </Box>

          {temEndereco && (
            <>
              <Typography variant="h6" color="primary.main" fontWeight="bold" mb={1}>
                Endereço
              </Typography>

              <Divider sx={{ mb: 3 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 2fr 1fr" },
                  gap: 2,
                }}
              >
                <Campo label="CEP" valor={pessoa.cep} />
                <Campo label="Logradouro" valor={pessoa.logradouro} />
                <Campo label="Número" valor={pessoa.numero} />
                <Campo label="Bairro" valor={pessoa.bairro} />
                <Campo label="Estado" valor={pessoa.estado} />
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
}
