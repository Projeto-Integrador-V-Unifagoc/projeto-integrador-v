import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Divider,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Skeleton, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { AlertTriangle, BookOpen, CalendarDays, ChevronRight, ClipboardCheck, RefreshCw, Target, UserRoundCheck, Users, X } from "lucide-react";
import Container from "../../components/Container";
import type { AtribuicaoProfessor, DashboardProfessor, DetalheAlunoAtencaoProfessor, DetalheAtribuicaoProfessor, NivelAtencaoProfessor } from "../../models/home-professor-model";
import { homeProfessorApi } from "../../services/home-professor-api";
import AlunoAtencaoDialog from "./AlunoAtencaoDialog";

const TRACO = "—";
const percentual = (valor: number | null) => valor === null ? TRACO : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const dataCurta = (valor: string) => new Intl.DateTimeFormat("pt-BR").format(new Date(`${valor}T12:00:00`));
const corNivel = (nivel: NivelAtencaoProfessor): "error" | "warning" | "success" | "default" => nivel === "CRITICO" ? "error" : nivel === "ATENCAO" ? "warning" : nivel === "REGULAR" ? "success" : "default";

function Cartao({ titulo, valor, apoio, icon: Icon, cor }: { titulo: string; valor: string; apoio: string; icon: typeof Target; cor: string }) {
  return <Paper variant="outlined" sx={{ p: 2.25, height: "100%", borderRadius: 3 }}><Stack direction="row" justifyContent="space-between" gap={2}><Box><Typography variant="body2" color="text.secondary" fontWeight={650}>{titulo}</Typography><Typography fontSize={29} fontWeight={850}>{valor}</Typography><Typography variant="caption" color="text.secondary">{apoio}</Typography></Box><Box sx={{ width: 42, height: 42, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: alpha(cor, .12), color: cor }}><Icon size={21} /></Box></Stack></Paper>;
}

function Carregando() {
  return <Stack gap={2.5}><Skeleton variant="rounded" height={130} /><Grid container spacing={2}>{[1, 2, 3, 4].map((item) => <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}><Skeleton variant="rounded" height={125} /></Grid>)}</Grid><Skeleton variant="rounded" height={390} /></Stack>;
}

export default function ProfessorDashboard({ userName }: { userName: string }) {
  const theme = useTheme();
  const [dados, setDados] = useState<DashboardProfessor | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [detalhe, setDetalhe] = useState<DetalheAtribuicaoProfessor | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [alunoAberto, setAlunoAberto] = useState(false);
  const [detalheAluno, setDetalheAluno] = useState<DetalheAlunoAtencaoProfessor | null>(null);
  const [carregandoAluno, setCarregandoAluno] = useState(false);
  const [erroAluno, setErroAluno] = useState("");

  const carregar = useCallback(async (periodoId?: string, atualizacao = false) => {
    if (atualizacao) setRecarregando(true); else setCarregando(true);
    try { setDados(await homeProfessorApi.dashboard(periodoId)); setErro(""); }
    catch { setErro("Não foi possível carregar o dashboard do professor."); }
    finally { setCarregando(false); setRecarregando(false); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function abrirDetalhe(item: AtribuicaoProfessor) {
    setCarregandoDetalhe(true);
    try { setDetalhe(await homeProfessorApi.detalhe(item.id)); }
    catch { setErro("Não foi possível carregar os detalhes da turma."); }
    finally { setCarregandoDetalhe(false); }
  }

  async function abrirAluno(turmaDisciplinaId: string, alunoId: string) {
    setAlunoAberto(true);
    setDetalheAluno(null);
    setErroAluno("");
    setCarregandoAluno(true);
    try { setDetalheAluno(await homeProfessorApi.detalheAluno(turmaDisciplinaId, alunoId)); }
    catch { setErroAluno("Não foi possível carregar o detalhamento deste aluno."); }
    finally { setCarregandoAluno(false); }
  }

  const grafico = useMemo(() => dados?.atribuicoes.filter((item) => item.mediaTurma !== null || item.frequenciaMedia !== null) ?? [], [dados]);
  if (carregando) return <Container sx={{ p: 0, border: 0 }}><Carregando /></Container>;
  if (!dados) return <Container sx={{ p: 0, border: 0 }}><Alert severity="error" action={<Button color="inherit" onClick={() => void carregar()} sx={{ width: "auto", minWidth: 124, whiteSpace: "nowrap" }}>Tentar novamente</Button>}>{erro}</Alert></Container>;

  return <Container sx={{ p: 0, pb: 3, border: 0, overflowY: "auto" }}><Stack gap={2.5}>
    <Paper component="header" elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, color: "#fff", background: "linear-gradient(125deg, #078CAF 0%, #05B5E6 58%, #47CCE9 100%)", position: "relative", overflow: "hidden", "&::after": { content: '""', position: "absolute", width: 240, height: 240, borderRadius: "50%", bgcolor: "rgba(255,255,255,.1)", right: -55, top: -115 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={2} position="relative" zIndex={1}>
        <Stack direction="row" gap={2} alignItems="center"><Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><BookOpen size={27} /></Box><Box><Typography component="h1" variant="h5" fontWeight={800}>Olá, {dados.professor.nome || userName}!</Typography><Typography variant="body2" sx={{ opacity: .9 }}>Acompanhe suas turmas e pendências acadêmicas.</Typography></Box></Stack>
        <Stack direction="row" gap={1.5} alignItems="center"><FormControl size="small" sx={{ minWidth: 150, bgcolor: "rgba(255,255,255,.96)", borderRadius: 1 }}><InputLabel>Período</InputLabel><Select label="Período" value={dados.periodoSelecionado?.id ?? ""} onChange={(e) => void carregar(e.target.value)}>{dados.periodosDisponiveis.map((item) => <MenuItem key={item.id} value={item.id}>{item.codigo}</MenuItem>)}</Select></FormControl><Tooltip title="Atualizar"><span><IconButton disabled={recarregando} onClick={() => void carregar(dados.periodoSelecionado?.id, true)} sx={{ color: "#fff" }}>{recarregando ? <CircularProgress size={20} color="inherit" /> : <RefreshCw size={20} />}</IconButton></span></Tooltip></Stack>
      </Stack>
    </Paper>
    {erro && <Alert severity="warning">{erro}</Alert>}
    {!dados.atribuicoes.length && <Alert severity="info">Você não possui turmas vinculadas ao período selecionado.</Alert>}
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Cartao titulo="Turmas ativas" valor={String(dados.resumo.turmasAtivas)} apoio="turmas distintas no período" icon={Users} cor={theme.palette.primary.main} /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Cartao titulo="Disciplinas" valor={String(dados.resumo.disciplinasDistintas)} apoio={`${dados.atribuicoes.length} ofertas vinculadas`} icon={BookOpen} cor={theme.palette.info.main} /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Cartao titulo="Alunos únicos" valor={String(dados.resumo.alunosUnicos)} apoio="com vínculo ativo" icon={UserRoundCheck} cor={theme.palette.success.main} /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Cartao titulo="Pendências" valor={String(dados.resumo.lancamentosPendentes)} apoio="avaliações com notas faltantes" icon={ClipboardCheck} cor={dados.resumo.lancamentosPendentes ? theme.palette.warning.main : theme.palette.success.main} /></Grid>
    </Grid>
    <Grid container spacing={2.5} alignItems="stretch">
      <Grid size={{ xs: 12, lg: 8 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Typography variant="h6" fontWeight={800}>Desempenho das turmas</Typography><Typography variant="body2" color="text.secondary" mb={2}>Média e frequência calculadas apenas com dados disponíveis.</Typography>{grafico.length ? <BarChart height={Math.max(300, grafico.length * 62)} yAxis={[{ scaleType: "band", data: grafico.map((item) => `${item.disciplina.codigo} · ${item.turma.sigla}`) }]} xAxis={[{ min: 0, max: 100 }]} layout="horizontal" series={[{ data: grafico.map((item) => item.mediaTurma), label: "Média", color: theme.palette.primary.main }, { data: grafico.map((item) => item.frequenciaMedia), label: "Frequência", color: theme.palette.success.main }]} /> : <Alert severity="info">Os gráficos aparecerão após os primeiros lançamentos.</Alert>}</Paper></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Stack direction="row" gap={1} alignItems="center"><AlertTriangle size={20} color={theme.palette.warning.main} /><Typography variant="h6" fontWeight={800}>Alunos em atenção</Typography></Stack><Typography variant="body2" color="text.secondary" mb={2}>Selecione um aluno para consultar os motivos e o desempenho detalhado.</Typography><Stack divider={<Divider flexItem />} gap={0.5}>{dados.alunosEmAtencao.length ? dados.alunosEmAtencao.slice(0, 6).map((item) => <Box key={`${item.turmaDisciplinaId}-${item.id}`} role="button" tabIndex={0} aria-label={`Ver detalhes de ${item.nome}`} onClick={() => void abrirAluno(item.turmaDisciplinaId, item.id)} onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); void abrirAluno(item.turmaDisciplinaId, item.id); } }} sx={{ py: 1, px: 1, mx: -1, borderRadius: 1.5, cursor: "pointer", transition: "background-color .15s ease", "&:hover, &:focus-visible": { bgcolor: "action.hover", outline: "none" } }}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Box minWidth={0} flex={1}><Typography fontWeight={700} noWrap>{item.nome}</Typography><Typography variant="caption" color="text.secondary">{item.disciplinaNome} · {item.turmaSigla}</Typography><Typography variant="caption" display="block">{item.motivo}</Typography></Box><Stack direction="row" alignItems="center" gap={0.5}><Chip size="small" color={corNivel(item.nivel)} label={item.nivel === "CRITICO" ? "Crítico" : "Atenção"} /><ChevronRight size={17} aria-hidden="true" /></Stack></Stack></Box>) : <Typography variant="body2" color="text.secondary">Nenhum aluno em atenção com os dados atuais.</Typography>}</Stack></Paper></Grid>
    </Grid>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Typography variant="h6" fontWeight={800}>Minhas turmas e disciplinas</Typography><Typography variant="body2" color="text.secondary" mb={2}>Abra uma oferta para consultar alunos, competências e cobertura dos lançamentos.</Typography><Grid container spacing={2}>{dados.atribuicoes.map((item) => <Grid key={item.id} size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: "100%" }}><Stack gap={1.5} height="100%"><Box><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontWeight={800}>{item.disciplina.nome}</Typography>{item.alunosEmAtencao > 0 && <Chip size="small" color="warning" label={`${item.alunosEmAtencao} em atenção`} />}</Stack><Typography variant="body2" color="text.secondary">{item.disciplina.codigo} · {item.turma.sigla} · {item.curso.nome}</Typography></Box><Stack direction="row" gap={{ xs: 1.5, sm: 3 }} flexWrap="wrap"><Box><Typography variant="caption" color="text.secondary">Alunos</Typography><Typography fontWeight={750}>{item.totalAlunos}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Média</Typography><Typography fontWeight={750}>{percentual(item.mediaTurma)}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Frequência</Typography><Typography fontWeight={750}>{percentual(item.frequenciaMedia)}</Typography></Box><Box><Typography variant="caption" color="text.secondary">Pendências</Typography><Typography fontWeight={750}>{item.lancamentosPendentes}</Typography></Box></Stack><Button variant="outlined" onClick={() => void abrirDetalhe(item)} disabled={carregandoDetalhe} sx={{ alignSelf: "flex-start", width: "auto", minWidth: 110, height: 36, whiteSpace: "nowrap", mt: "auto" }}>Ver turma</Button></Stack></Paper></Grid>)}</Grid></Paper>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Stack direction="row" gap={1} alignItems="center"><CalendarDays size={20} /><Typography variant="h6" fontWeight={800}>Próximas avaliações</Typography></Stack><Stack divider={<Divider flexItem />} mt={1}>{dados.avaliacoesProximas.length ? dados.avaliacoesProximas.map((item) => <Stack key={item.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} py={1.5}><Box><Typography fontWeight={700}>{item.titulo}</Typography><Typography variant="caption" color="text.secondary">{item.disciplinaNome} · {item.turmaSigla}</Typography></Box><Box textAlign={{ sm: "right" }}><Typography fontWeight={700}>{dataCurta(item.data)}</Typography><Typography variant="caption" color="text.secondary">{item.notasLancadas}/{item.notasEsperadas} notas lançadas</Typography></Box></Stack>) : <Typography variant="body2" color="text.secondary" py={2}>Nenhuma avaliação futura cadastrada.</Typography>}</Stack></Paper>
    <Dialog open={!!detalhe} onClose={() => setDetalhe(null)} fullWidth maxWidth="lg"><DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h6" fontWeight={800}>{detalhe?.disciplina.nome}</Typography><Typography variant="body2" color="text.secondary">{detalhe?.turma.sigla} · {detalhe?.curso.nome}</Typography></Box><IconButton onClick={() => setDetalhe(null)}><X /></IconButton></Stack></DialogTitle><DialogContent dividers>{detalhe && <Stack gap={2.5}><Box><Typography fontWeight={750} mb={1}>Competências planejadas</Typography><Stack direction="row" gap={1} flexWrap="wrap">{detalhe.competencias.length ? detalhe.competencias.map((item) => <Chip key={item.id} label={`${item.codigo} · ${item.nome} (${item.nivel_esperado.toLowerCase()})`} />) : <Typography variant="body2" color="text.secondary">Nenhuma competência vinculada.</Typography>}</Stack></Box><TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Aluno</TableCell><TableCell>Matrícula</TableCell><TableCell align="right">Média</TableCell><TableCell align="right">Frequência</TableCell><TableCell>Situação</TableCell></TableRow></TableHead><TableBody>{detalhe.alunos.map((aluno) => <TableRow hover key={aluno.id} tabIndex={0} onClick={() => { setDetalhe(null); void abrirAluno(detalhe.id, aluno.id); }} onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); setDetalhe(null); void abrirAluno(detalhe.id, aluno.id); } }} sx={{ cursor: "pointer" }}><TableCell>{aluno.nome}</TableCell><TableCell>{aluno.matricula}</TableCell><TableCell align="right">{percentual(aluno.media)}</TableCell><TableCell align="right">{percentual(aluno.frequencia)}</TableCell><TableCell><Tooltip title={aluno.motivo}><Chip size="small" color={corNivel(aluno.nivel)} label={aluno.nivel.replace("_", " ")} /></Tooltip></TableCell></TableRow>)}</TableBody></Table></TableContainer></Stack>}</DialogContent></Dialog>
    <AlunoAtencaoDialog open={alunoAberto} carregando={carregandoAluno} erro={erroAluno} detalhe={detalheAluno} onClose={() => setAlunoAberto(false)} />
  </Stack></Container>;
}
