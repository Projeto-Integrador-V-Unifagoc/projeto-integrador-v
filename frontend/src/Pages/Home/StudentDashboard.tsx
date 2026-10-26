import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  RefreshCw,
  Target,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import Container from "../../components/Container";
import type { MinhaFrequenciaAluno, SituacaoFrequencia } from "../../models/frequencia-model";
import type { DisciplinaAluno, TarefaAluno, TipoTarefa } from "../../models/home-aluno-model";
import type { BoletimAluno } from "../../models/nota-model";
import { authService } from "../../services/auth-services";
import { frequenciaApi } from "../../services/frequencia-api";
import { homeAlunoApi } from "../../services/home-aluno-api";
import { notaApi } from "../../services/nota-api";
import {
  COR_TIPO_AVALIACAO,
  formatarPontos,
  ROTULO_TIPO_AVALIACAO,
} from "../../utils/avaliacao";
import {
  corPrazo,
  filtrarTarefasPorJanela,
  prazoHumano,
  type JanelaAgenda,
} from "../Agenda/agenda-utils";
import DisciplinaDetalhesDrawer from "./DisciplinaDetalhesDrawer";

interface StudentDashboardProps { userName: string }

interface InformacaoAluno {
  matricula: string | number | null;
  curso: string | null;
  periodo: string | number | null;
}

interface RespostaMe {
  data?: { academico?: InformacaoAluno | null };
}

type NivelAtencao = "critico" | "atencao" | "regular" | "sem-dados";
type VisaoGrafico = "comparativo" | "nota" | "frequencia";

interface DisciplinaDashboard {
  turmaDisciplinaId: string;
  codigo: string;
  nome: string;
  professorNome: string;
  frequencia: number | null;
  situacaoFrequencia: SituacaoFrequencia | null;
  media: number | null;
  pontosObtidos: number;
  pontosMaximos: number;
  avaliacoesPublicadas: number;
  totalAvaliacoes: number;
  nivel: NivelAtencao;
  motivo: string;
}

const TRACO = "—";
const META_NOTA = 60;
const MINIMO_FREQUENCIA = 75;

const fmtPercentual = (valor: number | null, casas = 0) =>
  valor === null
    ? TRACO
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor)}%`;

function avaliarNivel(
  frequencia: number | null,
  media: number | null,
): { nivel: NivelAtencao; motivo: string } {
  if (frequencia !== null && frequencia < MINIMO_FREQUENCIA) {
    return { nivel: "critico", motivo: "Frequência abaixo do mínimo de 75%" };
  }
  if (media !== null && media < META_NOTA) {
    return { nivel: "atencao", motivo: "Média parcial abaixo da meta de 60%" };
  }
  if (frequencia !== null && frequencia <= 80) {
    return { nivel: "atencao", motivo: "Frequência próxima do limite mínimo" };
  }
  if (frequencia === null && media === null) {
    return { nivel: "sem-dados", motivo: "Aguardando lançamentos" };
  }
  return { nivel: "regular", motivo: "Desempenho dentro das metas" };
}

function montarDisciplinas(
  disciplinas: DisciplinaAluno[],
  frequencia: MinhaFrequenciaAluno | null,
  boletim: BoletimAluno | null,
): DisciplinaDashboard[] {
  const frequencias = new Map(
    (frequencia?.consolidado ?? []).map((item) => [item.turmaDisciplinaId, item]),
  );
  const notas = new Map(
    (boletim?.disciplinas ?? []).map((item) => [item.turmaDisciplinaId, item]),
  );

  return disciplinas.map((disciplina) => {
    const itemFrequencia = frequencias.get(disciplina.turmaDisciplinaId);
    const itemNota = notas.get(disciplina.turmaDisciplinaId);
    const frequenciaAtual = itemFrequencia?.percentual ?? null;
    const media = itemNota?.mediaFinal ?? itemNota?.mediaParcial ?? null;
    const avaliadas = itemNota?.avaliacoes.filter((avaliacao) => avaliacao.lancada).length ?? 0;
    const classificacao = avaliarNivel(frequenciaAtual, media);

    return {
      turmaDisciplinaId: disciplina.turmaDisciplinaId,
      codigo: disciplina.codigo,
      nome: disciplina.nome,
      professorNome: disciplina.professorNome,
      frequencia: frequenciaAtual,
      situacaoFrequencia: itemFrequencia?.situacao ?? null,
      media,
      pontosObtidos: itemNota?.pontosObtidos ?? 0,
      pontosMaximos: itemNota?.pontosMaximos ?? 0,
      avaliacoesPublicadas: avaliadas,
      totalAvaliacoes: itemNota?.avaliacoes.length ?? 0,
      ...classificacao,
    };
  });
}

function corNivel(nivel: NivelAtencao): "error" | "warning" | "success" | "default" {
  if (nivel === "critico") return "error";
  if (nivel === "atencao") return "warning";
  if (nivel === "regular") return "success";
  return "default";
}

function rotuloNivel(nivel: NivelAtencao) {
  if (nivel === "critico") return "Risco por frequência";
  if (nivel === "atencao") return "Atenção";
  if (nivel === "regular") return "Dentro da meta";
  return "Sem dados";
}

function abreviarDisciplina(nome: string, limite = 24) {
  if (nome.length <= limite) return nome;
  return `${nome.slice(0, limite - 1).trimEnd()}…`;
}

function SecaoTitulo({ titulo, subtitulo, acao }: { titulo: string; subtitulo: string; acao?: React.ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "flex-start" }} justifyContent="space-between" gap={2} mb={2}>
      <Box>
        <Typography component="h2" variant="h6" fontWeight={800}>{titulo}</Typography>
        <Typography variant="body2" color="text.secondary">{subtitulo}</Typography>
      </Box>
      {acao}
    </Stack>
  );
}

function CartaoMetrica({
  titulo,
  valor,
  apoio,
  icon: Icon,
  cor = "#05b5e6",
}: {
  titulo: string;
  valor: string;
  apoio: string;
  icon: typeof Target;
  cor?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, height: "100%", borderRadius: 3, bgcolor: "#fff" }}>
      <Stack direction="row" justifyContent="space-between" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>{titulo}</Typography>
          <Typography fontSize={{ xs: 26, xl: 30 }} lineHeight={1.15} fontWeight={800} mt={0.75} letterSpacing={-0.6}>{valor}</Typography>
          <Typography variant="caption" color="text.secondary">{apoio}</Typography>
        </Box>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: alpha(cor, 0.12), color: cor, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon size={21} aria-hidden="true" />
        </Box>
      </Stack>
    </Paper>
  );
}

function DashboardSkeleton() {
  return (
    <Stack gap={2.5} aria-label="Carregando dashboard">
      <Skeleton variant="rounded" height={130} />
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((item) => <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}><Skeleton variant="rounded" height={130} /></Grid>)}
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}><Skeleton variant="rounded" height={380} /></Grid>
        <Grid size={{ xs: 12, lg: 4 }}><Skeleton variant="rounded" height={380} /></Grid>
      </Grid>
    </Stack>
  );
}

function DisciplinaEmAtencao({ item, onAbrir }: { item: DisciplinaDashboard; onAbrir: () => void }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={750} noWrap>{item.nome}</Typography>
          <Typography variant="caption" color="text.secondary">{item.motivo}</Typography>
        </Box>
        <Chip size="small" color={corNivel(item.nivel)} label={rotuloNivel(item.nivel)} sx={{ flexShrink: 0, fontWeight: 700 }} />
      </Stack>
      <Stack direction="row" gap={2} mt={1.25}>
        <Box flex={1}>
          <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Nota</Typography><Typography variant="caption" fontWeight={700}>{fmtPercentual(item.media, 1)}</Typography></Stack>
          <LinearProgress variant="determinate" value={item.media ?? 0} color={item.media !== null && item.media < 60 ? "warning" : "primary"} sx={{ mt: 0.5, height: 6, borderRadius: 9 }} />
        </Box>
        <Box flex={1}>
          <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Frequência</Typography><Typography variant="caption" fontWeight={700}>{fmtPercentual(item.frequencia, 1)}</Typography></Stack>
          <LinearProgress variant="determinate" value={item.frequencia ?? 0} color={item.frequencia !== null && item.frequencia < 75 ? "error" : item.frequencia !== null && item.frequencia <= 80 ? "warning" : "success"} sx={{ mt: 0.5, height: 6, borderRadius: 9 }} />
        </Box>
      </Stack>
      <Button size="small" onClick={onAbrir} endIcon={<ArrowRight size={15} />} sx={{ mt: 1, px: 0, width: "auto" }}>Ver detalhes</Button>
    </Box>
  );
}

export default function StudentDashboard({ userName }: StudentDashboardProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const ehMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [studentInfo, setStudentInfo] = useState<InformacaoAluno | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaAluno[]>([]);
  const [tarefas, setTarefas] = useState<TarefaAluno[]>([]);
  const [frequencia, setFrequencia] = useState<MinhaFrequenciaAluno | null>(null);
  const [boletim, setBoletim] = useState<BoletimAluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [visaoGrafico, setVisaoGrafico] = useState<VisaoGrafico>("comparativo");
  const [janelaAgenda, setJanelaAgenda] = useState<Exclude<JanelaAgenda, "todas">>(7);
  const [disciplinaSelecionadaId, setDisciplinaSelecionadaId] = useState<string | null>(null);

  const carregar = useCallback(async (atualizacao = false) => {
    if (atualizacao) setRecarregando(true);
    const token = localStorage.getItem("@UniEduca:token") ?? "";
    const resultados = await Promise.allSettled([
      authService.getMe(token) as Promise<RespostaMe>,
      homeAlunoApi.minhasDisciplinas(),
      homeAlunoApi.minhasTarefas(),
      frequenciaApi.minhaFrequencia(),
      notaApi.meuBoletim(),
    ]);
    const [me, listaDisciplinas, listaTarefas, dadosFrequencia, dadosBoletim] = resultados;
    const falhas: string[] = [];

    if (me.status === "fulfilled") setStudentInfo(me.value.data?.academico ?? null); else falhas.push("dados do curso");
    if (listaDisciplinas.status === "fulfilled") setDisciplinas(listaDisciplinas.value); else falhas.push("disciplinas");
    if (listaTarefas.status === "fulfilled") setTarefas(listaTarefas.value); else falhas.push("agenda");
    if (dadosFrequencia.status === "fulfilled") setFrequencia(dadosFrequencia.value); else falhas.push("frequência");
    if (dadosBoletim.status === "fulfilled") setBoletim(dadosBoletim.value); else falhas.push("notas");

    setErros(falhas);
    setCarregando(false);
    setRecarregando(false);
  }, []);

  useEffect(() => {
    // O carregamento sincroniza a tela com cinco fontes externas; as respostas
    // atualizam os estados somente depois que as requisições são concluídas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  const disciplinasDashboard = useMemo(
    () => montarDisciplinas(disciplinas, frequencia, boletim),
    [disciplinas, frequencia, boletim],
  );
  const disciplinasAtencao = disciplinasDashboard.filter((item) => item.nivel === "critico" || item.nivel === "atencao");
  const mediasDisponiveis = disciplinasDashboard.map((item) => item.media).filter((item): item is number => item !== null);
  const mediaGeral = mediasDisponiveis.length ? mediasDisponiveis.reduce((soma, valor) => soma + valor, 0) / mediasDisponiveis.length : null;
  const presencas = frequencia?.consolidado.reduce((soma, item) => soma + item.presencas, 0) ?? 0;
  const faltas = frequencia?.consolidado.reduce((soma, item) => soma + item.faltas, 0) ?? 0;
  const frequenciaGeral = presencas + faltas > 0 ? (presencas / (presencas + faltas)) * 100 : null;
  const avaliacoesPublicadas = disciplinasDashboard.reduce((soma, item) => soma + item.avaliacoesPublicadas, 0);
  const totalAvaliacoes = disciplinasDashboard.reduce((soma, item) => soma + item.totalAvaliacoes, 0);
  const tarefasNoPrazo = filtrarTarefasPorJanela(tarefas, janelaAgenda);
  const tarefasProximas = tarefasNoPrazo.slice(0, 5);
  const disciplinaSelecionada = disciplinas.find(
    (item) => item.turmaDisciplinaId === disciplinaSelecionadaId,
  ) ?? null;
  const boletimSelecionado = boletim?.disciplinas.find(
    (item) => item.turmaDisciplinaId === disciplinaSelecionadaId,
  ) ?? null;
  const frequenciaSelecionada = frequencia?.consolidado.find(
    (item) => item.turmaDisciplinaId === disciplinaSelecionadaId,
  ) ?? null;

  const dadosGrafico = disciplinasDashboard.filter((item) => item.media !== null || item.frequencia !== null);
  const nomesGrafico = dadosGrafico.map((item) => item.nome);
  const possuiIndicadores = dadosGrafico.length > 0;
  const alturaGrafico = Math.max(280, dadosGrafico.length * 58 + 115);
  const seriesGrafico = [
    ...(visaoGrafico !== "frequencia" ? [{ id: "media", data: dadosGrafico.map((item) => item.media), label: "Média", color: theme.palette.primary.main, valueFormatter: (valor: number | null) => fmtPercentual(valor, 1) }] : []),
    ...(visaoGrafico !== "nota" ? [{ id: "frequencia", data: dadosGrafico.map((item) => item.frequencia), label: "Frequência", color: theme.palette.success.main, valueFormatter: (valor: number | null) => fmtPercentual(valor, 1) }] : []),
  ];

  if (carregando) return <Container sx={{ p: 0, border: 0 }}><DashboardSkeleton /></Container>;

  return (
    <Container sx={{ p: 0, pb: 3, border: 0, overflowY: "auto" }}>
      <Stack gap={2.5}>
        <Paper
          component="header"
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            color: "#fff",
            background: "linear-gradient(125deg, #078CAF 0%, #05B5E6 58%, #47CCE9 100%)",
            position: "relative",
            overflow: "hidden",
            "&::after": { content: '""', position: "absolute", width: 240, height: 240, borderRadius: "50%", bgcolor: "rgba(255,255,255,.1)", right: -55, top: -115 },
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} gap={2} position="relative" zIndex={1}>
            <Stack direction="row" gap={2} alignItems="center">
              <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><GraduationCap size={27} /></Box>
              <Box>
                <Typography component="h1" variant="h5" fontWeight={800}>Olá, {userName}!</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Aqui está o resumo do seu período atual.</Typography>
              </Box>
            </Stack>
            <Stack direction="row" gap={{ xs: 2, sm: 4 }} flexWrap="wrap">
              <Box><Typography variant="overline" sx={{ opacity: 0.75 }}>Matrícula</Typography><Typography fontWeight={800}>{studentInfo?.matricula ?? TRACO}</Typography></Box>
              <Box sx={{ maxWidth: 300 }}><Typography variant="overline" sx={{ opacity: 0.75 }}>Curso</Typography><Typography fontWeight={800}>{studentInfo?.curso ?? TRACO}</Typography></Box>
              <Box><Typography variant="overline" sx={{ opacity: 0.75 }}>Período</Typography><Typography fontWeight={800}>{studentInfo?.periodo ? `${studentInfo.periodo}º` : TRACO}</Typography></Box>
              <Tooltip title="Atualizar dados"><span><IconButton aria-label="Atualizar dashboard" onClick={() => void carregar(true)} disabled={recarregando} sx={{ color: "#fff" }}>{recarregando ? <CircularProgress color="inherit" size={20} /> : <RefreshCw size={20} />}</IconButton></span></Tooltip>
            </Stack>
          </Stack>
        </Paper>

        {erros.length > 0 && <Alert severity="warning">Alguns dados não puderam ser atualizados: {erros.join(", ")}. Os demais indicadores continuam disponíveis.</Alert>}

        {disciplinasAtencao.length > 0 ? (
          <Alert
            severity={disciplinasAtencao.some((item) => item.nivel === "critico") ? "error" : "warning"}
            icon={<AlertTriangle size={22} />}
            action={<Button color="inherit" onClick={() => setDisciplinaSelecionadaId(disciplinasAtencao[0].turmaDisciplinaId)} sx={{ width: "auto" }}>Entender alerta</Button>}
            sx={{ borderRadius: 2.5, alignItems: "center" }}
          >
            <strong>{disciplinasAtencao.length} {disciplinasAtencao.length === 1 ? "disciplina precisa" : "disciplinas precisam"} da sua atenção.</strong> Confira os indicadores antes das próximas avaliações.
          </Alert>
        ) : disciplinasDashboard.length > 0 && possuiIndicadores ? (
          <Alert severity="success" icon={<CheckCircle2 size={22} />} sx={{ borderRadius: 2.5 }}><strong>Você está dentro das metas atuais.</strong> Continue acompanhando os novos lançamentos.</Alert>
        ) : disciplinasDashboard.length > 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2.5 }}><strong>Seu período já está configurado.</strong> Os indicadores serão avaliados após os primeiros lançamentos de notas e frequência.</Alert>
        ) : null}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoMetrica titulo="Situação acadêmica" valor={disciplinasAtencao.length ? `${disciplinasAtencao.length} em atenção` : possuiIndicadores ? "Tudo certo" : "Aguardando dados"} apoio={`de ${disciplinasDashboard.length} disciplinas ativas`} icon={Target} cor={disciplinasAtencao.length ? theme.palette.warning.main : possuiIndicadores ? theme.palette.success.main : theme.palette.primary.main} /></Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoMetrica titulo="Média do período" valor={fmtPercentual(mediaGeral, 1)} apoio="média simples das disciplinas com nota" icon={TrendingUp} cor={mediaGeral !== null && mediaGeral < 60 ? theme.palette.warning.main : theme.palette.primary.main} /></Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoMetrica titulo="Frequência geral" valor={fmtPercentual(frequenciaGeral, 1)} apoio={`${presencas} presenças · ${faltas} faltas`} icon={UserRoundCheck} cor={frequenciaGeral !== null && frequenciaGeral < 75 ? theme.palette.error.main : theme.palette.success.main} /></Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoMetrica titulo="Resultados publicados" valor={totalAvaliacoes ? `${avaliacoesPublicadas}/${totalAvaliacoes}` : TRACO} apoio="avaliações com nota lançada" icon={ClipboardCheck} /></Grid>
        </Grid>

        <Grid container spacing={2.5} alignItems="stretch">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: "#fff", height: "100%" }}>
              <SecaoTitulo
                titulo="Desempenho por disciplina"
                subtitulo="Metas: nota 60% e frequência 75%. Passe o cursor para ver os valores e o nome completo."
                acao={dadosGrafico.length ? (
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={visaoGrafico}
                    onChange={(_evento, novaVisao: VisaoGrafico | null) => novaVisao && setVisaoGrafico(novaVisao)}
                    aria-label="Indicador exibido no gráfico"
                    sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, "& .MuiToggleButton-root": { flex: { xs: 1, sm: "initial" }, px: { xs: 1, sm: 1.5 }, height: 32, fontWeight: 700 } }}
                  >
                    <ToggleButton value="comparativo" aria-label="Comparar nota e frequência">Comparativo</ToggleButton>
                    <ToggleButton value="nota" aria-label="Exibir somente nota">Nota</ToggleButton>
                    <ToggleButton value="frequencia" aria-label="Exibir somente frequência">Frequência</ToggleButton>
                  </ToggleButtonGroup>
                ) : undefined}
              />
              {dadosGrafico.length ? (
                <Box sx={{ width: "100%", height: alturaGrafico }}>
                  <BarChart
                    layout="horizontal"
                    xAxis={[{ min: 0, max: 100, tickNumber: ehMobile ? 3 : 6, valueFormatter: (valor: number) => `${valor}%` }]}
                    yAxis={[{
                      scaleType: "band",
                      data: nomesGrafico,
                      width: ehMobile ? 96 : 168,
                      valueFormatter: (valor: string, contexto) => {
                        if (contexto.location !== "tick") return valor;
                        const item = dadosGrafico[nomesGrafico.indexOf(valor)];
                        return ehMobile ? item?.codigo || abreviarDisciplina(valor, 14) : abreviarDisciplina(valor);
                      },
                      tickLabelStyle: { fontSize: ehMobile ? 11 : 12 },
                    }]}
                    series={seriesGrafico}
                    height={alturaGrafico}
                    margin={{ left: 10, right: ehMobile ? 28 : 34, top: 10, bottom: 10 }}
                    grid={{ vertical: true }}
                    borderRadius={5}
                  >
                    {visaoGrafico !== "frequencia" && (
                      <ChartsReferenceLine
                        x={META_NOTA}
                        label={ehMobile ? undefined : "Meta de nota · 60%"}
                        labelAlign="end"
                        lineStyle={{ stroke: theme.palette.warning.main, strokeDasharray: "5 4", strokeWidth: 2 }}
                        labelStyle={{ fill: theme.palette.warning.dark, fontSize: 11, fontWeight: 700 }}
                      />
                    )}
                    {visaoGrafico !== "nota" && (
                      <ChartsReferenceLine
                        x={MINIMO_FREQUENCIA}
                        label={ehMobile ? undefined : "Frequência mínima · 75%"}
                        labelAlign="start"
                        lineStyle={{ stroke: theme.palette.error.main, strokeDasharray: "5 4", strokeWidth: 2 }}
                        labelStyle={{ fill: theme.palette.error.main, fontSize: 11, fontWeight: 700 }}
                      />
                    )}
                  </BarChart>
                </Box>
              ) : (
                <Box minHeight={280} display="grid" sx={{ placeItems: "center" }}><Typography color="text.secondary">As comparações aparecerão após os primeiros lançamentos.</Typography></Box>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: "#fff", height: "100%" }}>
              <SecaoTitulo
                titulo="Próximas avaliações"
                subtitulo={tarefasNoPrazo.length ? `${tarefasNoPrazo.length} nos próximos ${janelaAgenda} dias` : `Nenhuma vence nos próximos ${janelaAgenda} dias`}
                acao={<Button size="small" endIcon={<ArrowRight size={15} />} onClick={() => navigate("/minha-agenda")} sx={{ width: "auto", flexShrink: 0 }}>Ver todas</Button>}
              />
              <ToggleButtonGroup
                fullWidth
                exclusive
                size="small"
                value={janelaAgenda}
                onChange={(_evento, valor: 7 | 30 | null) => valor && setJanelaAgenda(valor)}
                aria-label="Período das próximas avaliações"
                sx={{ mb: 1.25, "& .MuiToggleButton-root": { height: 32, fontWeight: 700 } }}
              >
                <ToggleButton value={7} aria-label="Avaliações dos próximos 7 dias">Próximos 7 dias</ToggleButton>
                <ToggleButton value={30} aria-label="Avaliações dos próximos 30 dias">Próximos 30 dias</ToggleButton>
              </ToggleButtonGroup>
              {tarefasProximas.length ? (
                <Stack divider={<Divider flexItem />}>
                  {tarefasProximas.map((tarefa) => (
                    <Stack key={tarefa.avaliacaoId} direction="row" gap={1.5} py={1.35} alignItems="flex-start">
                      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}><CalendarDays size={18} /></Box>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={750} noWrap>{tarefa.titulo}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">{tarefa.disciplinaNome}</Typography>
                        <Stack direction="row" gap={0.75} mt={0.7} alignItems="center" flexWrap="wrap">
                          <Chip size="small" variant="outlined" color={COR_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]} label={ROTULO_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]} />
                          <Chip size="small" variant="outlined" color={corPrazo(tarefa.dataVencimento)} label={prazoHumano(tarefa.dataVencimento)} />
                        </Stack>
                      </Box>
                      <Typography variant="caption" fontWeight={800} whiteSpace="nowrap">{formatarPontos(tarefa.valor)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Stack minHeight={270} alignItems="center" justifyContent="center" textAlign="center" gap={1}>
                  <CheckCircle2 color={theme.palette.success.main} size={34} />
                  <Typography fontWeight={700}>Nada previsto para {janelaAgenda} dias</Typography>
                  <Typography variant="body2" color="text.secondary">Você não possui avaliações dentro deste intervalo.</Typography>
                  {janelaAgenda === 7 && <Button size="small" variant="outlined" onClick={() => setJanelaAgenda(30)} sx={{ width: "auto" }}>Ver próximos 30 dias</Button>}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: "#fff" }}>
          <SecaoTitulo titulo="Minhas disciplinas" subtitulo="Prioridade baseada na frequência e na média parcial disponíveis." acao={<Button size="small" variant="outlined" onClick={() => navigate("/minhas-notas")} sx={{ width: "auto" }}>Abrir boletim</Button>} />
          {disciplinasDashboard.length ? (
            <Grid container spacing={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, overflow: "hidden" }}>
              {[...disciplinasDashboard]
                .sort((a, b) => ["critico", "atencao", "sem-dados", "regular"].indexOf(a.nivel) - ["critico", "atencao", "sem-dados", "regular"].indexOf(b.nivel))
                .map((item, indice) => (
                  <Grid key={item.turmaDisciplinaId} size={{ xs: 12, md: 6 }} sx={{ p: 2, borderBottom: indice < disciplinasDashboard.length - (disciplinasDashboard.length % 2 || 2) ? "1px solid" : { xs: "1px solid", md: 0 }, borderRight: { md: indice % 2 === 0 ? "1px solid" : 0 }, borderColor: "divider !important" }}>
                    <DisciplinaEmAtencao item={item} onAbrir={() => setDisciplinaSelecionadaId(item.turmaDisciplinaId)} />
                  </Grid>
                ))}
            </Grid>
          ) : (
            <Stack minHeight={140} alignItems="center" justifyContent="center" gap={1}><BookOpen size={30} /><Typography color="text.secondary">Nenhuma disciplina ativa no período atual.</Typography></Stack>
          )}
        </Paper>

        <Typography variant="caption" color="text.secondary" textAlign="center">Os indicadores refletem somente notas e frequências já lançadas. Uma média parcial abaixo de 60% é um alerta de acompanhamento, não uma reprovação definitiva.</Typography>
      </Stack>
      <DisciplinaDetalhesDrawer
        aberto={disciplinaSelecionada !== null}
        disciplina={disciplinaSelecionada}
        boletim={boletimSelecionado}
        frequencia={frequenciaSelecionada}
        tarefas={tarefas}
        onFechar={() => setDisciplinaSelecionadaId(null)}
        onAbrirBoletim={() => navigate("/minhas-notas")}
        onAbrirFrequencia={() => navigate("/minha-frequencia")}
      />
    </Container>
  );
}
