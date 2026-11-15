import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Paper, Select, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip, Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  AlertTriangle, BookOpenCheck, CalendarClock, ChevronRight, ClipboardCheck, FileBarChart,
  GraduationCap, Layers, RefreshCw, Target, UsersRound,
} from "lucide-react";
import Container from "../../components/Container";
import type { ClassificacaoCoordenacao, DashboardCoordenacao, DetalheCursoCoordenacao } from "../../models/home-coordenacao-model";
import { homeCoordenacaoApi } from "../../services/home-coordenacao-api";
import CursoCoordenacaoDialog from "./CursoCoordenacaoDialog";

const percentual = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const rotuloClassificacao = (valor: ClassificacaoCoordenacao) => ({ DADOS_INSUFICIENTES: "Dados insuficientes", DIFICULDADE: "Dificuldade", ATENCAO: "Atenção", ADEQUADO: "Adequado" })[valor];
const corClassificacao = (valor: ClassificacaoCoordenacao): "default" | "error" | "warning" | "success" => valor === "DIFICULDADE" ? "error" : valor === "ATENCAO" ? "warning" : valor === "ADEQUADO" ? "success" : "default";
const mensagemErro = (erro: unknown) => axios.isAxiosError(erro) && typeof erro.response?.data?.error === "string" ? erro.response.data.error : "Não foi possível carregar o dashboard da coordenação.";

function CartaoIndicador({ titulo, valor, apoio, Icone, cor }: { titulo: string; valor: string; apoio: string; Icone: typeof Layers; cor: string }) {
  return <Paper variant="outlined" sx={{ p: 2.25, height: "100%", borderRadius: 3 }}><Stack direction="row" justifyContent="space-between" gap={2}><Box minWidth={0}><Typography variant="body2" color="text.secondary" fontWeight={650}>{titulo}</Typography><Typography fontSize={29} fontWeight={850}>{valor}</Typography><Typography variant="caption" color="text.secondary">{apoio}</Typography></Box><Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: alpha(cor, .12), color: cor }}><Icone size={21} /></Box></Stack></Paper>;
}

function Carregando() {
  return <Stack gap={2.5}><Skeleton variant="rounded" height={138} /><Grid container spacing={2}>{[1, 2, 3, 4].map((item) => <Grid key={item} size={{ xs: 12, sm: 6, lg: 3 }}><Skeleton variant="rounded" height={125} /></Grid>)}</Grid><Skeleton variant="rounded" height={340} /></Stack>;
}

export default function CoordinationDashboard({ userName }: { userName: string }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [dados, setDados] = useState<DashboardCoordenacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [cursoAberto, setCursoAberto] = useState(false);
  const [detalheCurso, setDetalheCurso] = useState<DetalheCursoCoordenacao | null>(null);
  const [carregandoCurso, setCarregandoCurso] = useState(false);
  const [erroCurso, setErroCurso] = useState("");

  const carregar = useCallback(async (periodoId?: string, atualizacao = false) => {
    if (atualizacao) setRecarregando(true); else setCarregando(true);
    try { setDados(await homeCoordenacaoApi.dashboard(periodoId)); setErro(""); }
    catch (e) { setErro(mensagemErro(e)); }
    finally { setCarregando(false); setRecarregando(false); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function abrirCurso(cursoId: string) {
    if (!dados?.periodoSelecionado) return;
    setCursoAberto(true);
    setDetalheCurso(null);
    setErroCurso("");
    setCarregandoCurso(true);
    try { setDetalheCurso(await homeCoordenacaoApi.detalheCurso(cursoId, dados.periodoSelecionado.id)); }
    catch (e) { setErroCurso(mensagemErro(e)); }
    finally { setCarregandoCurso(false); }
  }

  const competenciasGrafico = useMemo(() => dados?.competencias.filter((item) => item.media !== null).slice(0, 8) ?? [], [dados]);
  const competenciasAtencao = useMemo(() => dados?.competencias.filter((item) => item.classificacao === "DIFICULDADE" || item.classificacao === "ATENCAO").slice(0, 6) ?? [], [dados]);
  if (carregando) return <Container sx={{ p: 0, border: 0 }}><Carregando /></Container>;
  if (!dados) return <Container sx={{ p: 0, border: 0 }}><Alert severity="error" action={<Button color="inherit" onClick={() => void carregar()} sx={{ width: "auto", whiteSpace: "nowrap" }}>Tentar novamente</Button>}>{erro}</Alert></Container>;

  return <Container sx={{ p: 0, pb: 3, border: 0, overflowY: "auto" }}><Stack gap={2.5}>
    <Paper component="header" elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, color: "#fff", background: "linear-gradient(125deg, #075D78 0%, #078CAF 52%, #05B5E6 100%)", position: "relative", overflow: "hidden", "&::after": { content: '\"\"', position: "absolute", width: 260, height: 260, borderRadius: "50%", bgcolor: "rgba(255,255,255,.1)", right: -65, top: -125 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={2} position="relative" zIndex={1}>
        <Stack direction="row" gap={2} alignItems="center"><Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><FileBarChart size={27} /></Box><Box><Typography component="h1" variant="h5" fontWeight={800}>Olá, {userName}!</Typography><Typography variant="body2" sx={{ opacity: .9 }}>Visão consolidada da estrutura e do desempenho acadêmico.</Typography></Box></Stack>
        <Stack direction="row" gap={1.25} alignItems="center"><FormControl size="small" sx={{ minWidth: 155, bgcolor: "rgba(255,255,255,.96)", borderRadius: 1 }}><InputLabel>Período</InputLabel><Select label="Período" value={dados.periodoSelecionado?.id ?? ""} onChange={(e) => void carregar(String(e.target.value))}>{dados.periodosDisponiveis.map((item) => <MenuItem key={item.id} value={item.id}>{item.codigo}</MenuItem>)}</Select></FormControl><Tooltip title="Atualizar"><span><IconButton disabled={recarregando} onClick={() => void carregar(dados.periodoSelecionado?.id, true)} sx={{ color: "#fff" }}>{recarregando ? <CircularProgress size={20} color="inherit" /> : <RefreshCw size={20} />}</IconButton></span></Tooltip></Stack>
      </Stack>
    </Paper>

    {erro && <Alert severity="warning">{erro}</Alert>}
    {!dados.periodoSelecionado && <Alert severity="info">Cadastre um período letivo para habilitar os indicadores acadêmicos.</Alert>}

    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoIndicador titulo="Alunos ativos" valor={String(dados.resumo.alunosAtivos)} apoio={`${dados.resumo.turmasAtivas} turmas no período`} Icone={UsersRound} cor={theme.palette.primary.main} /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoIndicador titulo="Ofertas ativas" valor={String(dados.resumo.ofertasAtivas)} apoio="disciplinas ofertadas nas turmas" Icone={BookOpenCheck} cor={theme.palette.info.main} /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoIndicador titulo="Cobertura de horários" valor={percentual(dados.resumo.coberturaHorarios)} apoio={`${dados.resumo.ofertasComHorario} de ${dados.resumo.ofertasAtivas} ofertas`} Icone={CalendarClock} cor={dados.resumo.coberturaHorarios < 100 ? theme.palette.warning.main : theme.palette.success.main} /></Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}><CartaoIndicador titulo="Avaliações mapeadas" valor={percentual(dados.resumo.coberturaCompetencias)} apoio={`${dados.resumo.avaliacoesMapeadas} de ${dados.resumo.avaliacoes} avaliações`} Icone={Target} cor={dados.resumo.coberturaCompetencias < 75 ? theme.palette.warning.main : theme.palette.success.main} /></Grid>
    </Grid>

    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 8 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Stack direction="row" alignItems="center" gap={1}><Target size={20} /><Typography variant="h6" fontWeight={800}>Desempenho por competência</Typography></Stack><Typography variant="body2" color="text.secondary" mb={2}>Aproveitamento consolidado apenas com notas disponíveis; cobertura inferior a {dados.criteriosCompetencia.coberturaMinima}% não gera diagnóstico.</Typography>{competenciasGrafico.length ? <BarChart height={Math.max(300, competenciasGrafico.length * 48)} layout="horizontal" yAxis={[{ scaleType: "band", data: competenciasGrafico.map((item) => item.codigo) }]} xAxis={[{ min: 0, max: 100 }]} series={[{ data: competenciasGrafico.map((item) => item.media), label: "Aproveitamento", color: theme.palette.primary.main }, { data: competenciasGrafico.map((item) => item.cobertura), label: "Cobertura", color: theme.palette.info.light }]} /> : <Alert severity="info">O gráfico aparecerá quando houver avaliações mapeadas e notas lançadas.</Alert>}</Paper></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: "100%" }}><Stack direction="row" alignItems="center" gap={1}><AlertTriangle size={20} color={theme.palette.warning.main} /><Typography variant="h6" fontWeight={800}>Competências em atenção</Typography></Stack><Typography variant="body2" color="text.secondary" mb={1.5}>Indicadores agregados, sem ranking de professores.</Typography><Stack divider={<Divider flexItem />}>{competenciasAtencao.length ? competenciasAtencao.map((item) => <Box key={item.id} py={1.2}><Stack direction="row" justifyContent="space-between" gap={1}><Box minWidth={0}><Typography fontWeight={750}>{item.codigo} · {item.nome}</Typography><Typography variant="caption" color="text.secondary">{item.totalOfertas} ofertas · {item.totalCursos} cursos</Typography></Box><Chip size="small" color={corClassificacao(item.classificacao)} label={rotuloClassificacao(item.classificacao)} /></Stack><Typography variant="caption">{item.media === null ? "Sem média" : `${percentual(item.media)} aproveitamento`} · {percentual(item.cobertura)} cobertura</Typography></Box>) : <Alert severity="success">Nenhuma competência com cobertura suficiente está em atenção.</Alert>}</Stack></Paper></Grid>
    </Grid>

    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} mb={2}><Box><Typography variant="h6" fontWeight={800}>Panorama por curso</Typography><Typography variant="body2" color="text.secondary">Turmas, alunos e cobertura da grade semanal no período selecionado. Abra um curso para consultar a origem dos indicadores.</Typography></Box><Stack direction="row" gap={1} flexWrap="wrap"><Chip color="success" label={`${dados.matrizes.vigentes} matrizes vigentes`} /><Chip color="info" label={`${dados.matrizes.rascunhos} rascunhos`} /><Chip label={`${dados.matrizes.encerradas} encerradas`} /></Stack></Stack><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Curso</TableCell><TableCell align="right">Turmas</TableCell><TableCell align="right">Ofertas</TableCell><TableCell align="right">Alunos</TableCell><TableCell align="right">Ofertas com horário</TableCell><TableCell align="right">Cobertura</TableCell><TableCell align="right">Ação</TableCell></TableRow></TableHead><TableBody>{dados.panoramaCursos.length ? dados.panoramaCursos.map((item) => <TableRow hover key={item.id}><TableCell><Typography variant="body2" fontWeight={750}>{item.codigo} · {item.nome}</Typography></TableCell><TableCell align="right">{item.turmasAtivas}</TableCell><TableCell align="right">{item.ofertasAtivas}</TableCell><TableCell align="right">{item.alunosAtivos}</TableCell><TableCell align="right">{item.ofertasComHorario}</TableCell><TableCell align="right"><Chip size="small" color={item.coberturaHorarios === 100 ? "success" : item.coberturaHorarios > 0 ? "warning" : "default"} label={percentual(item.coberturaHorarios)} /></TableCell><TableCell align="right"><Button size="small" variant="text" endIcon={<ChevronRight size={16} />} onClick={() => void abrirCurso(item.id)} sx={{ width: "auto", whiteSpace: "nowrap" }}>Ver detalhes</Button></TableCell></TableRow>) : <TableRow><TableCell colSpan={7}><Alert severity="info">Nenhum curso possui turma ativa neste período.</Alert></TableCell></TableRow>}</TableBody></Table></TableContainer></Paper>

    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Typography variant="h6" fontWeight={800}>Qualidade dos dados acadêmicos</Typography><Typography variant="body2" color="text.secondary" mb={2}>Pendências que reduzem a confiabilidade dos relatórios e dashboards.</Typography><Grid container spacing={1.5}>{dados.qualidade.map((item) => <Grid key={item.id} size={{ xs: 12, md: 6, lg: 4 }}><Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, height: "100%" }}><Stack height="100%" gap={1}><Stack direction="row" justifyContent="space-between" gap={1}><Typography fontWeight={750}>{item.titulo}</Typography><Chip size="small" color={item.quantidade === 0 ? "success" : item.severidade === "CRITICO" ? "error" : item.severidade === "ATENCAO" ? "warning" : "info"} label={String(item.quantidade)} /></Stack><Typography variant="body2" color="text.secondary">{item.descricao}</Typography><Button variant="text" endIcon={<ChevronRight size={16} />} onClick={() => navigate(item.rota)} sx={{ alignSelf: "flex-start", width: "auto", px: 0, mt: "auto" }}>Revisar cadastros</Button></Stack></Paper></Grid>)}</Grid></Paper>

    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}><Typography variant="h6" fontWeight={800} mb={1.5}>Ações rápidas</Typography><Stack direction="row" gap={1} flexWrap="wrap"><Button variant="outlined" startIcon={<GraduationCap size={17} />} onClick={() => navigate("/cursos/lista")} sx={{ width: "auto" }}>Cursos e matrizes</Button><Button variant="outlined" startIcon={<Layers size={17} />} onClick={() => navigate("/turmas/lista")} sx={{ width: "auto" }}>Turmas e horários</Button><Button variant="outlined" startIcon={<Target size={17} />} onClick={() => navigate("/competencias/lista")} sx={{ width: "auto" }}>Competências</Button><Button variant="outlined" startIcon={<ClipboardCheck size={17} />} onClick={() => navigate("/relatorios/lista")} sx={{ width: "auto" }}>Relatórios</Button></Stack></Paper>
    <CursoCoordenacaoDialog open={cursoAberto} carregando={carregandoCurso} erro={erroCurso} detalhe={detalheCurso} onClose={() => setCursoAberto(false)} />
  </Stack></Container>;
}

