import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Target,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { ConsolidadoFrequencia } from "../../models/frequencia-model";
import type { DisciplinaAluno, TarefaAluno, TipoTarefa } from "../../models/home-aluno-model";
import {
  SITUACAO_LABEL,
  situacaoCor,
  type DisciplinaBoletim,
} from "../../models/nota-model";
import {
  COR_TIPO_AVALIACAO,
  formatarDataPtBr,
  formatarPontos,
  ROTULO_TIPO_AVALIACAO,
} from "../../utils/avaliacao";
import { prazoHumano } from "../Agenda/agenda-utils";
import {
  calcularProjecaoFrequencia,
  calcularProjecaoNota,
  FREQUENCIA_MINIMA,
  META_PONTOS,
} from "./disciplina-detalhes-utils";

interface DisciplinaDetalhesDrawerProps {
  aberto: boolean;
  disciplina: DisciplinaAluno | null;
  boletim: DisciplinaBoletim | null;
  frequencia: ConsolidadoFrequencia | null;
  tarefas: TarefaAluno[];
  onFechar: () => void;
  onAbrirBoletim: () => void;
  onAbrirFrequencia: () => void;
}

const percentual = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? "—"
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;

const numero = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);

function Metrica({
  titulo,
  valor,
  apoio,
}: {
  titulo: string;
  valor: string;
  apoio: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, height: "100%" }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {titulo}
      </Typography>
      <Typography fontSize={23} fontWeight={850} lineHeight={1.25} mt={0.4}>
        {valor}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {apoio}
      </Typography>
    </Paper>
  );
}

function ProjecaoNotaCard({ boletim }: { boletim: DisciplinaBoletim | null }) {
  const projecao = calcularProjecaoNota(boletim);

  if (!boletim || !projecao) {
    return <Alert severity="info">A projeção será exibida após a publicação das avaliações.</Alert>;
  }

  if (projecao.situacao === "plano-incompleto") {
    return (
      <Alert severity="info">
        O plano possui {formatarPontos(projecao.totalPlanejado)} de 100 pontos configurados. A projeção até a média mínima será liberada quando o plano estiver completo.
      </Alert>
    );
  }

  if (projecao.situacao === "meta-atingida") {
    return (
      <Alert severity="success" icon={<CheckCircle2 size={20} />}>
        Você já soma {formatarPontos(boletim.pontosObtidos)} e alcançou a meta regular de {META_PONTOS} pontos.
      </Alert>
    );
  }

  if (projecao.situacao === "recuperacao") {
    return (
      <Alert severity="warning">
        Faltam {formatarPontos(projecao.pontosParaMeta)}, mas não há pontos regulares suficientes pendentes. Consulte o boletim para acompanhar a recuperação.
      </Alert>
    );
  }

  return (
    <Alert severity="info" icon={<Target size={20} />}>
      Para chegar a {META_PONTOS} pontos, você precisa obter {formatarPontos(projecao.pontosParaMeta)} dos {formatarPontos(projecao.pontosDisponiveis)} ainda pendentes — aproveitamento de {percentual(projecao.percentualNecessario)}.
    </Alert>
  );
}

function ProjecaoFrequenciaCard({ frequencia }: { frequencia: ConsolidadoFrequencia | null }) {
  const projecao = frequencia
    ? calcularProjecaoFrequencia(frequencia.presencas, frequencia.faltas)
    : null;

  if (!frequencia || !projecao) {
    return <Alert severity="info">A projeção será exibida após as primeiras chamadas.</Alert>;
  }

  if (projecao.presencasParaRecuperar > 0) {
    return (
      <Alert severity="error" icon={<UserRoundCheck size={20} />}>
        Considerando os registros atuais, são necessárias {projecao.presencasParaRecuperar} presenças consecutivas para voltar a {FREQUENCIA_MINIMA}%.
      </Alert>
    );
  }

  return (
    <Alert severity={projecao.margemFaltas === 0 ? "warning" : "success"} icon={<UserRoundCheck size={20} />}>
      {projecao.margemFaltas === 0
        ? "Uma nova falta reduziria sua frequência para menos de 75%, considerando os registros atuais."
        : `A margem atual é de ${projecao.margemFaltas} ${projecao.margemFaltas === 1 ? "falta" : "faltas"} sem ficar abaixo de 75%.`}
    </Alert>
  );
}

export default function DisciplinaDetalhesDrawer({
  aberto,
  disciplina,
  boletim,
  frequencia,
  tarefas,
  onFechar,
  onAbrirBoletim,
  onAbrirFrequencia,
}: DisciplinaDetalhesDrawerProps) {
  const theme = useTheme();
  if (!disciplina) return null;

  const media = boletim?.mediaFinal ?? boletim?.mediaParcial ?? null;
  const avaliacoesPublicadas = boletim?.avaliacoes.filter((item) => item.lancada).length ?? 0;
  const totalAvaliacoes = boletim?.avaliacoes.length ?? 0;
  const tarefasDaDisciplina = tarefas
    .filter((item) => item.turmaDisciplinaId === disciplina.turmaDisciplinaId)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  const possuiRiscoFrequencia = frequencia?.percentual !== null
    && frequencia?.percentual !== undefined
    && frequencia.percentual < FREQUENCIA_MINIMA;
  const possuiAlertaFrequencia = frequencia?.percentual !== null
    && frequencia?.percentual !== undefined
    && frequencia.percentual <= 80;
  const possuiAlertaNota = media !== null && media < META_PONTOS;
  const severidade = possuiRiscoFrequencia
    ? "error"
    : possuiAlertaNota || possuiAlertaFrequencia
      ? "warning"
      : media === null && frequencia?.percentual == null
        ? "info"
        : "success";
  const mensagemSituacao = possuiRiscoFrequencia
    ? "A frequência está abaixo do mínimo institucional. Priorize as próximas aulas e acompanhe os registros."
    : possuiAlertaNota
      ? "A média parcial está abaixo da meta. Confira os pontos restantes e as próximas avaliações."
      : possuiAlertaFrequencia
        ? "A frequência está próxima do limite mínimo de 75%. Evite novas faltas e acompanhe as próximas chamadas."
        : media === null && frequencia?.percentual == null
          ? "Ainda não há lançamentos suficientes para classificar esta disciplina."
          : "Os indicadores disponíveis estão dentro das metas atuais.";

  return (
    <Drawer
      anchor="right"
      open={aberto}
      onClose={onFechar}
      aria-labelledby="titulo-detalhes-disciplina"
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 600 },
            maxWidth: "100vw",
            bgcolor: "background.default",
          },
        },
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          color: "#fff",
          background: "linear-gradient(125deg, #078CAF 0%, #05B5E6 100%)",
          px: { xs: 2, sm: 3 },
          py: 2.5,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Stack direction="row" gap={1.5} minWidth={0}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2.25, bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <BookOpen size={23} />
            </Box>
            <Box minWidth={0}>
              <Typography id="titulo-detalhes-disciplina" component="h2" variant="h6" fontWeight={850}>
                {disciplina.nome}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {disciplina.codigo} · {disciplina.turmaSigla}
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Fechar detalhes da disciplina" onClick={onFechar} sx={{ color: "#fff", mt: -0.75, mr: -0.75 }}>
            <X size={22} />
          </IconButton>
        </Stack>
        <Typography variant="body2" mt={1.5} sx={{ opacity: 0.9 }}>
          Professor(a): {disciplina.professorNome} · Carga horária: {disciplina.cargaHoraria}h
        </Typography>
      </Box>

      <Stack gap={2.5} p={{ xs: 2, sm: 3 }}>
        <Alert severity={severidade}>{mensagemSituacao}</Alert>

        <Grid container spacing={1.25}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Metrica titulo="Média atual" valor={percentual(media)} apoio="meta de 60%" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <Metrica titulo="Frequência" valor={percentual(frequencia?.percentual)} apoio="mínimo de 75%" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metrica titulo="Notas publicadas" valor={totalAvaliacoes ? `${avaliacoesPublicadas}/${totalAvaliacoes}` : "—"} apoio="avaliações cadastradas" />
          </Grid>
        </Grid>

        <Box component="section" aria-labelledby="titulo-projecao-nota">
          <Typography id="titulo-projecao-nota" fontWeight={850} mb={1}>Caminho até a média</Typography>
          <ProjecaoNotaCard boletim={boletim} />
        </Box>

        <Box component="section" aria-labelledby="titulo-avaliacoes">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography id="titulo-avaliacoes" fontWeight={850}>Notas por avaliação</Typography>
            {boletim && <Chip size="small" color={situacaoCor(boletim.situacao)} label={SITUACAO_LABEL[boletim.situacao]} />}
          </Stack>
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
            {boletim?.avaliacoes.length ? (
              <Stack divider={<Divider flexItem />}>
                {boletim.avaliacoes.map((avaliacao) => {
                  const desempenho = avaliacao.valorObtido === null
                    ? null
                    : (avaliacao.valorObtido / avaliacao.valorMaximo) * 100;
                  return (
                    <Box key={avaliacao.id} p={1.75}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                        <Box minWidth={0}>
                          <Typography variant="body2" fontWeight={800}>
                            {avaliacao.descricao || ROTULO_TIPO_AVALIACAO[avaliacao.tipo]}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            color={COR_TIPO_AVALIACAO[avaliacao.tipo]}
                            label={ROTULO_TIPO_AVALIACAO[avaliacao.tipo]}
                            sx={{ mt: 0.75 }}
                          />
                        </Box>
                        <Box textAlign="right" flexShrink={0}>
                          <Typography fontWeight={850}>
                            {avaliacao.lancada ? `${numero(avaliacao.valorObtido ?? 0)} / ${numero(avaliacao.valorMaximo)}` : "Aguardando"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {avaliacao.lancada ? `${percentual(desempenho)} de aproveitamento` : `${formatarPontos(avaliacao.valorMaximo)} possíveis`}
                          </Typography>
                        </Box>
                      </Stack>
                      {desempenho !== null && (
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(desempenho, 100)}
                          color={desempenho < 60 ? "warning" : "primary"}
                          sx={{ mt: 1.25, height: 5, borderRadius: 5 }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" p={2}>Nenhuma avaliação cadastrada.</Typography>
            )}
          </Paper>
        </Box>

        <Box component="section" aria-labelledby="titulo-frequencia">
          <Typography id="titulo-frequencia" fontWeight={850} mb={1}>Frequência e margem atual</Typography>
          {frequencia && (
            <Stack direction="row" gap={1} mb={1} flexWrap="wrap">
              <Chip size="small" color="success" variant="outlined" label={`${frequencia.presencas} presenças`} />
              <Chip size="small" color={frequencia.faltas ? "warning" : "default"} variant="outlined" label={`${frequencia.faltas} faltas`} />
              <Chip size="small" variant="outlined" label={`${frequencia.totalAulas} aulas registradas`} />
            </Stack>
          )}
          <ProjecaoFrequenciaCard frequencia={frequencia} />
          <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
            Estimativa baseada apenas nas aulas já registradas; o calendário restante pode alterar essa margem.
          </Typography>
        </Box>

        <Box component="section" aria-labelledby="titulo-proximas-disciplina">
          <Typography id="titulo-proximas-disciplina" fontWeight={850} mb={1}>Próximas avaliações</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
            {tarefasDaDisciplina.length ? (
              <Stack divider={<Divider flexItem />}>
                {tarefasDaDisciplina.slice(0, 3).map((tarefa) => (
                  <Stack key={tarefa.avaliacaoId} direction="row" gap={1.5} alignItems="flex-start" p={1.75}>
                    <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <CalendarDays size={18} />
                    </Box>
                    <Box minWidth={0} flex={1}>
                      <Typography variant="body2" fontWeight={800}>{tarefa.titulo}</Typography>
                      <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" mt={0.6}>
                        <Chip size="small" variant="outlined" color={COR_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]} label={ROTULO_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]} />
                        <Chip size="small" icon={<Clock3 size={13} />} label={prazoHumano(tarefa.dataVencimento)} />
                      </Stack>
                    </Box>
                    <Box textAlign="right" flexShrink={0}>
                      <Typography variant="caption" fontWeight={800}>{formatarPontos(tarefa.valor)}</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">{formatarDataPtBr(tarefa.dataVencimento)}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Stack alignItems="center" textAlign="center" gap={0.75} py={3} px={2}>
                <CheckCircle2 size={26} color={theme.palette.success.main} />
                <Typography variant="body2" fontWeight={750}>Nenhuma avaliação futura publicada</Typography>
              </Stack>
            )}
          </Paper>
        </Box>

        <Divider />
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.25} pb={1}>
          <Button variant="contained" endIcon={<ArrowRight size={16} />} onClick={onAbrirBoletim}>Abrir boletim completo</Button>
          <Button variant="outlined" endIcon={<ArrowRight size={16} />} onClick={onAbrirFrequencia}>Ver frequência</Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
