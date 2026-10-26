import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import Container from "../../components/Container";
import type { TarefaAluno, TipoTarefa } from "../../models/home-aluno-model";
import { homeAlunoApi } from "../../services/home-aluno-api";
import {
  COR_TIPO_AVALIACAO,
  formatarDataPtBr,
  formatarPontos,
  ROTULO_TIPO_AVALIACAO,
} from "../../utils/avaliacao";
import {
  corPrazo,
  diasAte,
  filtrarTarefasPorJanela,
  prazoHumano,
  type JanelaAgenda,
} from "./agenda-utils";

function dataResumida(dataIso: string) {
  const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return {
    dia: String(dia).padStart(2, "0"),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
      .format(data)
      .replace(".", "")
      .toUpperCase(),
  };
}

function ItemAgenda({ tarefa }: { tarefa: TarefaAluno }) {
  const data = dataResumida(tarefa.dataVencimento);
  const dias = diasAte(tarefa.dataVencimento);

  return (
    <Stack direction="row" gap={{ xs: 1.5, sm: 2 }} py={2} alignItems="flex-start">
      <Box
        aria-hidden="true"
        sx={(theme) => ({
          width: 54,
          minWidth: 54,
          borderRadius: 2,
          overflow: "hidden",
          textAlign: "center",
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: "#fff",
        })}
      >
        <Typography display="block" variant="caption" fontWeight={800} color="primary.contrastText" bgcolor="primary.main" py={0.25}>
          {data.mes}
        </Typography>
        <Typography display="block" fontSize={21} lineHeight={1.7} fontWeight={800}>{data.dia}</Typography>
      </Box>

      <Box flex={1} minWidth={0}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
          <Box minWidth={0}>
            <Typography fontWeight={800}>{tarefa.titulo}</Typography>
            <Typography variant="body2" color="text.secondary">{tarefa.disciplinaNome}</Typography>
          </Box>
          <Typography fontWeight={800} whiteSpace="nowrap">{formatarPontos(tarefa.valor)}</Typography>
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1} mt={1.25} alignItems="center">
          <Chip
            size="small"
            variant="outlined"
            color={COR_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]}
            label={ROTULO_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]}
          />
          <Chip
            size="small"
            color={corPrazo(tarefa.dataVencimento)}
            icon={<Clock3 size={14} />}
            label={prazoHumano(tarefa.dataVencimento)}
            variant={dias <= 3 ? "filled" : "outlined"}
          />
          <Typography variant="caption" color="text.secondary">Data: {formatarDataPtBr(tarefa.dataVencimento)}</Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

export default function MinhaAgenda() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [tarefas, setTarefas] = useState<TarefaAluno[]>([]);
  const [janela, setJanela] = useState<JanelaAgenda>("todas");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    setErro(undefined);
    try {
      setTarefas(await homeAlunoApi.minhasTarefas());
    } catch {
      setErro("Não foi possível carregar sua agenda acadêmica.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const tarefasVisiveis = useMemo(
    () => filtrarTarefasPorJanela(tarefas, janela),
    [tarefas, janela],
  );
  const totalSeteDias = filtrarTarefasPorJanela(tarefas, 7).length;
  const totalTrintaDias = filtrarTarefasPorJanela(tarefas, 30).length;

  return (
    <Container sx={{ p: 0, border: 0, overflowY: "auto" }}>
      <Stack gap={2.5}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            color: "#fff",
            background: "linear-gradient(125deg, #078CAF 0%, #05B5E6 70%, #47CCE9 100%)",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
            <Stack direction="row" alignItems="center" gap={2}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}>
                <CalendarDays size={25} aria-hidden="true" />
              </Box>
              <Box>
                <Typography component="h1" variant="h5" fontWeight={800}>Minha agenda</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Avaliações futuras organizadas por prazo.</Typography>
              </Box>
            </Stack>
            <Button color="inherit" startIcon={<ArrowLeft size={17} />} onClick={() => navigate("/home")} sx={{ width: "auto" }}>Voltar ao dashboard</Button>
          </Stack>
        </Paper>

        {erro && (
          <Alert severity="error" action={<Button color="inherit" onClick={() => void carregar()} startIcon={<RefreshCw size={15} />} sx={{ width: "auto" }}>Tentar novamente</Button>}>
            {erro}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: "#fff" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={2} mb={2}>
            <Box>
              <Typography component="h2" variant="h6" fontWeight={800}>Avaliações programadas</Typography>
              <Typography variant="body2" color="text.secondary">
                {totalSeteDias} nos próximos 7 dias · {totalTrintaDias} nos próximos 30 dias
              </Typography>
            </Box>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={janela}
              onChange={(_evento, valor: JanelaAgenda | null) => valor && setJanela(valor)}
              aria-label="Período da agenda"
              sx={{ "& .MuiToggleButton-root": { flex: { xs: 1, md: "initial" }, minWidth: { md: 88 }, height: 34, fontWeight: 700 } }}
            >
              <ToggleButton value={7} aria-label="Avaliações dos próximos 7 dias">7 dias</ToggleButton>
              <ToggleButton value={30} aria-label="Avaliações dos próximos 30 dias">30 dias</ToggleButton>
              <ToggleButton value="todas" aria-label="Todas as avaliações futuras">Todas</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {carregando ? (
            <Stack minHeight={280} alignItems="center" justifyContent="center" gap={1.5}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">Carregando agenda...</Typography>
            </Stack>
          ) : tarefasVisiveis.length ? (
            <Stack divider={<Divider flexItem />}>
              {tarefasVisiveis.map((tarefa) => <ItemAgenda key={tarefa.avaliacaoId} tarefa={tarefa} />)}
            </Stack>
          ) : (
            <Stack minHeight={280} alignItems="center" justifyContent="center" textAlign="center" gap={1.25}>
              <Box sx={{ width: 54, height: 54, borderRadius: "50%", bgcolor: alpha(theme.palette.success.main, 0.1), color: "success.main", display: "grid", placeItems: "center" }}>
                <CheckCircle2 size={29} />
              </Box>
              <Typography fontWeight={800}>Nenhuma avaliação neste período</Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={420}>
                {janela === "todas" ? "Novas avaliações aparecerão aqui quando forem publicadas." : `Não há avaliações previstas para os próximos ${janela} dias.`}
              </Typography>
              {janela !== "todas" && <Button variant="outlined" onClick={() => setJanela("todas")} sx={{ width: "auto" }}>Ver todas as futuras</Button>}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
