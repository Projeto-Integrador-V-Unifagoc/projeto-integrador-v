import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { RefreshCw } from "lucide-react";

import Container from "../../components/Container";
import Button from "../../components/Button";
import matriculaApi, { baseURL } from "../../services/matricula-api";

type MatriculaVinculo = {
  id: string;
  aluno_id: string;
  turma_id: string;
  professor_id: string | null;
  status: string | null;
  aprovacao: boolean | null;
  status_aprovado: string | null;
  frequencia: number | null;
};

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  MATRICULADO: { label: "Matriculado", cor: "#1976d2" },
  CURSANDO:    { label: "Cursando",    cor: "#2e7d32" },
  TRANCADO:    { label: "Trancado",    cor: "#ed6c02" },
  CANCELADO:   { label: "Cancelado",   cor: "#d32f2f" },
  CONCLUIDO:   { label: "Concluído",   cor: "#00695c" },
};

function StatusChip({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? { label: status ?? "—", cor: "#757575" };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ backgroundColor: cfg.cor, color: "#fff", fontWeight: 600 }}
    />
  );
}

export default function Matriculas() {
  const [matriculas, setMatriculas] = useState<MatriculaVinculo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await matriculaApi.get<MatriculaVinculo[]>("/matriculas");
      setMatriculas(Array.isArray(data) ? data : []);
      setApiOnline(true);
    } catch {
      setMatriculas([]);
      setApiOnline(false);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <Container
      maxWidth={false}
      sx={{ minHeight: "100%", backgroundColor: "#fff", py: 2, px: 2 }}
    >
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight={700}>
            Gerenciar Matrículas
          </Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ width: "auto", minWidth: 120 }}
            onClick={() => void carregar()}
            disabled={carregando}
          >
            <RefreshCw size={16} style={{ marginRight: 6 }} />
            Atualizar
          </Button>
        </Stack>

        {carregando && <LinearProgress />}

        {apiOnline === false && (
          <Alert severity="warning">
            API offline em <strong>{baseURL}</strong>. Suba o backend.
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.grey[100]}`,
            borderRadius: 2,
            overflow: "hidden",
          })}
        >
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={(theme) => ({ backgroundColor: theme.palette.grey[50] })}>
                  <TableCell>ID da Matrícula</TableCell>
                  <TableCell>ID do Aluno</TableCell>
                  <TableCell>ID da Turma</TableCell>
                  <TableCell>Frequência</TableCell>
                  <TableCell>Aprovação</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matriculas.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {m.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {m.aluno_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {m.turma_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {m.frequencia !== null ? `${m.frequencia}%` : "—"}
                    </TableCell>
                    <TableCell>
                      {m.aprovacao === null
                        ? "—"
                        : m.aprovacao
                        ? "Aprovado"
                        : "Reprovado"}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={m.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {!carregando && matriculas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma matrícula encontrada.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}
