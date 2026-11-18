import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { ClipboardCheck, FileText, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import axios from "axios";
import { ValidationError } from "yup";
import Button from "../../components/Button";
import { Calculator } from "lucide-react";
import {
  CORES_DASHBOARD,
  DashboardPainel,
  IconeTipoAvaliacao,
  IndicadorCard,
  PaginaCabecalho,
  PaginaPadrao,
  sxBotaoPrimario,
  sxCartaoDashboard,
  sxTabelaDados,
} from "../../components/DashboardLayout";
import type { IndicadorDashboard } from "../../components/DashboardLayout";
import DataTable from "../../components/DataTable/DataTable";
import { Dialog } from "../../components/Dialog";
import TextField from "../../components/TextField";
import type { AtribuicaoAvaliacao, Avaliacao, CriarAvaliacaoDTO, TipoAvaliacao } from "../../models/avaliacao-model";
import { avaliacaoApi } from "../../services/avaliacao-api";
import { formatarDataPtBr, formatarPontos, ROTULO_TIPO_AVALIACAO, type TipoAvaliacaoVisual } from "../../utils/avaliacao";
import { avaliacaoSchema } from "../../validators/avaliacao-schema";

const tipos: TipoAvaliacao[] = ["PROVA", "TPI", "TRABALHO"];
type FormState = { turma_disciplina_id: string; tipo_avaliacao: TipoAvaliacao; descricao_avaliacao: string; valor: number | ""; data_lancamento: string; data_devolucao: string };
type FormErrors = Partial<Record<keyof FormState, string>>;
const formInicial: FormState = { turma_disciplina_id: "", tipo_avaliacao: "PROVA", descricao_avaliacao: "", valor: 20, data_lancamento: "", data_devolucao: "" };

const mensagemErro = (erro: unknown, fallback: string) => axios.isAxiosError(erro) && typeof erro.response?.data?.mensagem === "string" ? erro.response.data.mensagem : erro instanceof Error ? erro.message : fallback;
const nomeAtribuicao = (item: AtribuicaoAvaliacao) => `${item.turma_sigla || item.turma_descricao} - ${item.disciplina_nome}`;
const campoSx = { "& .MuiFormHelperText-root": { minHeight: 20, m: 0, mt: 0.5 } };
const formatarNumeroIndicador = (valor: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor);
// Tipo como ícone pequeno + nome (sem moldura de chip); editar em cinza, excluir no vermelho do tema.
const sxChipTipo = { height: "auto", bgcolor: "transparent", gap: 0.75, "& .MuiChip-icon": { m: 0 }, "& .MuiChip-label": { p: 0, fontSize: 14 } } as const;
const sxTabelaAvaliacoes = { ...sxTabelaDados, "& .MuiDataGrid-cell[data-field='acoes'] .MuiIconButton-colorPrimary": { color: CORES_DASHBOARD.textoSuave } } as const;

export default function Avaliacoes() {
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoAvaliacao[]>([]);
  const [contextoId, setContextoId] = useState("");
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loadingAtribuicoes, setLoadingAtribuicoes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormState>(formInicial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [excluir, setExcluir] = useState<Avaliacao | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregarAtribuicoes = useCallback(async () => {
    setLoadingAtribuicoes(true); setErro(null);
    try {
      const dados = await avaliacaoApi.listarAtribuicoes();
      setAtribuicoes(dados);
      setContextoId((atual) => dados.some((item) => item.id === atual) ? atual : dados[0]?.id ?? "");
    } catch (e) { setErro(mensagemErro(e, "Não foi possível carregar as atribuições.")); }
    finally { setLoadingAtribuicoes(false); }
  }, []);

  const carregarAvaliacoes = useCallback(async (id: string) => {
    if (!id) { setAvaliacoes([]); return; }
    setLoading(true); setErro(null);
    try { setAvaliacoes(await avaliacaoApi.listar(id)); }
    catch (e) { setAvaliacoes([]); setErro(mensagemErro(e, "Não foi possível carregar as avaliações.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void carregarAtribuicoes(); }, [carregarAtribuicoes]);
  useEffect(() => { void carregarAvaliacoes(contextoId); }, [carregarAvaliacoes, contextoId]);

  // Recupera\u00e7\u00e3o \u00e9 avalia\u00e7\u00e3o substitutiva: n\u00e3o comp\u00f5e o somat\u00f3rio nem a listagem dos 100 pontos regulares.
  const avaliacoesRegulares = useMemo(() => avaliacoes.filter((a) => (a.tipo_avaliacao as TipoAvaliacaoVisual) !== "RECUPERACAO"), [avaliacoes]);
  const provas = useMemo(() => avaliacoes.filter((a) => a.tipo_avaliacao === "PROVA"), [avaliacoes]);
  const tpis = useMemo(() => avaliacoes.filter((a) => a.tipo_avaliacao === "TPI"), [avaliacoes]);
  const pontosProvas = useMemo(() => provas.reduce((s, a) => s + Number(a.valor), 0), [provas]);
  const pontosTrabalhos = useMemo(() => avaliacoes.filter((a) => a.tipo_avaliacao === "TRABALHO").reduce((s, a) => s + Number(a.valor), 0), [avaliacoes]);
  const total = useMemo(() => avaliacoesRegulares.reduce((s, a) => s + Number(a.valor), 0), [avaliacoesRegulares]);
  const rows = useMemo(() => {
    const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return avaliacoesRegulares.filter((a) => [a.tipo_avaliacao, a.descricao_avaliacao ?? "", a.valor, formatarDataPtBr(a.data_lancamento), formatarDataPtBr(a.data_devolucao)].some((v) => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(termo)));
  }, [avaliacoesRegulares, busca]);

  const abrirCadastro = () => { setEditingId(null); setForm({ ...formInicial, turma_disciplina_id: contextoId }); setFormErro(null); setFormErrors({}); setDialogOpen(true); };
  const abrirEdicao = (a: Avaliacao) => { setEditingId(a.id); setForm({ turma_disciplina_id: a.turma_disciplina_id, tipo_avaliacao: a.tipo_avaliacao, descricao_avaliacao: a.descricao_avaliacao ?? "", valor: Number(a.valor), data_lancamento: a.data_lancamento.slice(0, 10), data_devolucao: a.data_devolucao?.slice(0, 10) ?? "" }); setFormErro(null); setFormErrors({}); setDialogOpen(true); };

  function alterarForm(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    if (name === "tipo_avaliacao") {
      const tipo = value as TipoAvaliacao;
      setForm((f) => ({ ...f, tipo_avaliacao: tipo, valor: tipo === "PROVA" ? 20 : tipo === "TPI" ? 5 : f.tipo_avaliacao === "TRABALHO" ? f.valor : "" }));
    } else setForm((f) => ({ ...f, [name]: name === "valor" ? value === "" ? "" : Number(value) : value }));
    setFormErrors((erros) => ({ ...erros, [name]: undefined, ...(name === "tipo_avaliacao" ? { valor: undefined } : {}) }));
    setFormErro(null);
  }

  async function salvar() {
    if (saving) return;
    setSaving(true); setFormErro(null);
    try {
      await avaliacaoSchema.validate(form, { abortEarly: false });
      setFormErrors({});
      const payload: CriarAvaliacaoDTO = { ...form, valor: Number(form.valor), descricao_avaliacao: form.descricao_avaliacao.trim(), data_devolucao: form.data_devolucao || null };
      if (editingId) await avaliacaoApi.atualizar(editingId, payload); else await avaliacaoApi.criar(payload);
      setContextoId(payload.turma_disciplina_id);
      await carregarAvaliacoes(payload.turma_disciplina_id);
      setDialogOpen(false); setSucesso(editingId ? "Avaliação atualizada com sucesso." : "Avaliação cadastrada com sucesso.");
    } catch (e) {
      if (e instanceof ValidationError) {
        const erros: FormErrors = {};
        e.inner.forEach((item) => { if (item.path && !erros[item.path as keyof FormState]) erros[item.path as keyof FormState] = item.message; });
        setFormErrors(erros);
      } else setFormErro(mensagemErro(e, "Não foi possível salvar a avaliação."));
    }
    finally { setSaving(false); }
  }

  async function confirmarExclusao() {
    if (!excluir || deleting) return;
    setDeleting(true); setErro(null);
    try { await avaliacaoApi.deletar(excluir.id); await carregarAvaliacoes(contextoId); setExcluir(null); setSucesso("Avaliação excluída com sucesso."); }
    catch (e) { setErro(mensagemErro(e, "Não foi possível excluir a avaliação.")); }
    finally { setDeleting(false); }
  }

  const columns: GridColDef[] = [
    {
      field: "tipo_avaliacao",
      headerName: "Tipo",
      width: 130,
      renderCell: ({ value }) => {
        return (
          <Chip
            size="small"
            sx={sxChipTipo}
            label={ROTULO_TIPO_AVALIACAO[value as TipoAvaliacao]}
            icon={<IconeTipoAvaliacao tipo={String(value)} />}
          />
        );
      },
    },
    { field: "descricao_avaliacao", headerName: "Descrição", flex: 1, minWidth: 220, valueGetter: (_, row) => row.descricao_avaliacao || "Sem descrição" },
    { field: "valor", headerName: "Valor", width: 110, valueFormatter: (v) => formatarPontos(Number(v)) },
    { field: "data_lancamento", headerName: "Lançamento", width: 130, valueFormatter: (v) => formatarDataPtBr(String(v)) },
    { field: "data_devolucao", headerName: "Devolução", width: 125, valueFormatter: (v) => formatarDataPtBr(v ? String(v) : null) },
    { field: "acoes", headerName: "Ações", width: 112, sortable: false, filterable: false, renderCell: ({ row }) => <Stack direction="row" spacing={0.5}><Tooltip title="Editar"><IconButton aria-label={`Editar avaliação ${row.descricao_avaliacao || ROTULO_TIPO_AVALIACAO[row.tipo_avaliacao as TipoAvaliacao]}`} size="small" color="primary" onClick={() => abrirEdicao(row)}><Pencil size={16} aria-hidden="true" /></IconButton></Tooltip><Tooltip title="Excluir"><IconButton aria-label={`Excluir avaliação ${row.descricao_avaliacao || ROTULO_TIPO_AVALIACAO[row.tipo_avaliacao as TipoAvaliacao]}`} size="small" color="error" onClick={() => setExcluir(row)}><Trash2 size={16} aria-hidden="true" /></IconButton></Tooltip></Stack> },
  ];

  // Os mesmos números de antes, no indicador do dashboard; todos neutros (colorir seria regra nova).
  const indicadores: IndicadorDashboard[] = [
    { id: "provas", titulo: "Provas", icone: ClipboardCheck, valor: `${provas.length}/3`, complemento: `${formatarNumeroIndicador(pontosProvas)}/60 pts` },
    { id: "tpi", titulo: "TPI", icone: ShieldCheck, valor: tpis.length ? "5/5 pts" : "0/5 pts" },
    { id: "trabalhos", titulo: "Trabalhos", icone: FileText, valor: `${formatarNumeroIndicador(pontosTrabalhos)}/35 pts` },
    { id: "total", titulo: "Total", icone: Calculator, valor: `${formatarNumeroIndicador(total)}/100 pts` },
  ];

  return <PaginaPadrao>
    <PaginaCabecalho
      titulo="Gestão de avaliações"
      subtitulo="Planeje as atividades por turma e disciplina: 3 provas, 1 TPI e até 35 pontos em trabalhos."
      icone={ClipboardCheck}
    />

    <Box sx={{ ...sxCartaoDashboard, p: 2 }}>
      {loadingAtribuicoes ? <Stack minHeight={56} direction="row" alignItems="center" justifyContent="center" gap={1}><CircularProgress size={20} /><Typography sx={{ fontSize: 14 }}>Carregando atribuições...</Typography></Stack> : atribuicoes.length === 0 ? <Alert severity="info">Nenhuma atribuição ativa está disponível para o seu usuário.</Alert> : <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-start" }} gap={1.5}>
        <TextField select label="Turma e disciplina" value={contextoId} onChange={(e) => setContextoId(e.target.value)} sx={{ minWidth: { md: 320 }, flex: { md: 1 } }}>{atribuicoes.map((a) => <MenuItem key={a.id} value={a.id}>{nomeAtribuicao(a)}</MenuItem>)}</TextField>
        <TextField aria-label="Pesquisar avaliações" placeholder="Pesquisar avaliações" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ flex: { md: 1 } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} aria-hidden="true" /></InputAdornment> }} />
        <Button onClick={abrirCadastro} disabled={!contextoId} startIcon={<Plus size={16} aria-hidden="true" />} sx={{ ...sxBotaoPrimario, height: 36, minWidth: 120, width: { xs: "100%", md: "auto" } }}>Adicionar</Button>
      </Stack>}
    </Box>

    {(erro || sucesso) && <Alert severity={erro ? "error" : "success"} onClose={() => { setErro(null); setSucesso(null); }}>{erro || sucesso}</Alert>}

    {contextoId && <>
      <Grid container spacing={2}>{indicadores.map(({ id, ...indicador }) => <Grid key={id} size={{ xs: 12, sm: 6, md: 3 }}><IndicadorCard {...indicador} /></Grid>)}</Grid>
      <DashboardPainel titulo="Avaliações do contexto selecionado" contador={rows.length || undefined}>
        <DataTable rows={rows} columns={columns} loading={loading} emptyTitle="Nenhuma avaliação encontrada" emptyDescription={avaliacoesRegulares.length === 0 ? "Adicione uma avaliação para começar." : "Revise o termo informado na pesquisa."} sx={sxTabelaAvaliacoes} />
      </DashboardPainel>
    </>}

  <Dialog.Root open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" aria-labelledby="dialog-avaliacao-title"><Dialog.Header><Dialog.Title><span id="dialog-avaliacao-title">{editingId ? "Editar avaliação" : "Nova avaliação"}</span></Dialog.Title><Dialog.ActionClose onClose={() => !saving && setDialogOpen(false)} /></Dialog.Header><Dialog.Content><Stack gap={2}>
    {formErro && <Alert severity="error">{formErro}</Alert>}
    <Alert severity="info">Provas valem 20 pontos, o TPI vale 5 e trabalhos devem somar no máximo 35.</Alert>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Tipo" name="tipo_avaliacao" value={form.tipo_avaliacao} onChange={alterarForm} error={Boolean(formErrors.tipo_avaliacao)} helperText={formErrors.tipo_avaliacao || " "} sx={campoSx}>{tipos.map((t) => <MenuItem key={t} value={t}>{ROTULO_TIPO_AVALIACAO[t]}</MenuItem>)}</TextField></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Valor" name="valor" type="number" value={form.valor} onChange={alterarForm} disabled={form.tipo_avaliacao !== "TRABALHO"} error={Boolean(formErrors.valor)} inputProps={{ min: 0.01, step: 0.01 }} helperText={formErrors.valor || (form.tipo_avaliacao === "TRABALHO" ? "Informe os pontos do trabalho." : "Valor definido pelo tipo de avaliação.")} sx={campoSx} /></Grid>
      <Grid size={12}><TextField label="Descrição" name="descricao_avaliacao" value={form.descricao_avaliacao} onChange={alterarForm} error={Boolean(formErrors.descricao_avaliacao)} helperText={formErrors.descricao_avaliacao || " "} sx={campoSx} /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Data de lançamento" name="data_lancamento" type="date" value={form.data_lancamento} onChange={alterarForm} error={Boolean(formErrors.data_lancamento)} InputLabelProps={{ shrink: true }} helperText={formErrors.data_lancamento || " "} sx={campoSx} /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Data de devolução" name="data_devolucao" type="date" value={form.data_devolucao} onChange={alterarForm} error={Boolean(formErrors.data_devolucao)} inputProps={{ min: form.data_lancamento }} InputLabelProps={{ shrink: true }} helperText={formErrors.data_devolucao || " "} sx={campoSx} /></Grid>
    </Grid>
  </Stack></Dialog.Content><Dialog.Footer><Button variant="outlined" disabled={saving} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" disabled={saving} isLoading={saving} onClick={salvar}>Salvar</Button></Dialog.Footer></Dialog.Root>

  <Dialog.Root open={Boolean(excluir)} onClose={() => !deleting && setExcluir(null)} maxWidth="xs" aria-labelledby="dialog-exclusao-title"><Dialog.Header><Dialog.Title><span id="dialog-exclusao-title">Confirmar exclusão</span></Dialog.Title><Dialog.ActionClose onClose={() => !deleting && setExcluir(null)} /></Dialog.Header><Dialog.Content><Typography>Tem certeza que deseja excluir <strong>{excluir?.descricao_avaliacao || "esta avaliação"}</strong>? Esta ação não pode ser desfeita.</Typography></Dialog.Content><Dialog.Footer><Button variant="outlined" disabled={deleting} onClick={() => setExcluir(null)}>Cancelar</Button><Button variant="contained" color="error" disabled={deleting} isLoading={deleting} onClick={confirmarExclusao}>Excluir</Button></Dialog.Footer></Dialog.Root>
  </PaginaPadrao>;
}
