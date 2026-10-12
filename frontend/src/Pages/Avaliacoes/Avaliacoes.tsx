import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Grid, IconButton, InputAdornment, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import axios from "axios";
import { ValidationError } from "yup";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import { Dialog } from "../../components/Dialog";
import TextField from "../../components/TextField";
import type { AtribuicaoAvaliacao, Avaliacao, ErroAvaliacao, PlanoAvaliacao, SubgrupoPlanoAvaliacao, TipoAvaliacao } from "../../models/avaliacao-model";
import { avaliacaoApi } from "../../services/avaliacao-api";
import { COR_TIPO_AVALIACAO, formatarDataPtBr, ROTULO_TIPO_AVALIACAO } from "../../utils/avaliacao";
import { compararPontosApi, formatarPontos, pontosParaApi, somarPontosApi } from "../../utils/pontos";
import { avaliacaoSchema } from "../../validators/avaliacao-schema";

type FormState = {
  turma_disciplina_id: string; subgrupo_id: string; tipo_avaliacao: TipoAvaliacao;
  descricao_avaliacao: string; valor: string; data_lancamento: string; data_devolucao: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;
const vazio = (oferta: string): FormState => ({ turma_disciplina_id: oferta, subgrupo_id: "", tipo_avaliacao: "REGULAR", descricao_avaliacao: "", valor: "", data_lancamento: "", data_devolucao: "" });
const nomeAtribuicao = (item: AtribuicaoAvaliacao) => `${item.turma_sigla || item.turma_descricao} - ${item.disciplina_nome}`;
const rotuloTipo = (tipo: TipoAvaliacao) => tipo === "REGULAR" ? "Regular" : ROTULO_TIPO_AVALIACAO[tipo];
const corTipo = (tipo: TipoAvaliacao) => tipo === "REGULAR" ? "info" : COR_TIPO_AVALIACAO[tipo];
const campoSx = { "& .MuiFormHelperText-root": { minHeight: 20, m: 0, mt: 0.5 } };
const mensagemErro = (erro: unknown, fallback: string) => axios.isAxiosError<ErroAvaliacao>(erro)
  ? erro.response?.data?.mensagem ?? fallback : erro instanceof Error ? erro.message : fallback;

export default function Avaliacoes() {
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoAvaliacao[]>([]);
  const [contextoId, setContextoId] = useState("");
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [planos, setPlanos] = useState<Record<string, PlanoAvaliacao>>({});
  const [lendoPlanos, setLendoPlanos] = useState<Record<string, boolean>>({});
  const [errosPlano, setErrosPlano] = useState<Record<string, string | undefined>>({});
  const [loadingAtribuicoes, setLoadingAtribuicoes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormState>(() => vazio(""));
  const [original, setOriginal] = useState<Avaliacao | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflito, setConflito] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const [incertoRecarregado, setIncertoRecarregado] = useState(false);
  const [recarregandoForm, setRecarregandoForm] = useState(false);
  const [excluir, setExcluir] = useState<Avaliacao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const consultaLista = useRef(0);
  const consultasPlano = useRef<Record<string, number>>({});
  const enviando = useRef(false);
  const campos = useRef<Partial<Record<keyof FormState, { focus(): void } | null>>>({});

  const carregarPlano = useCallback(async (id: string) => {
    if (!id) return false;
    const consulta = (consultasPlano.current[id] ?? 0) + 1;
    consultasPlano.current[id] = consulta;
    setLendoPlanos((p) => ({ ...p, [id]: true }));
    setErrosPlano((p) => ({ ...p, [id]: undefined }));
    try {
      const resposta = await avaliacaoApi.buscarPlano(id);
      if (consultasPlano.current[id] !== consulta) return false;
      setPlanos((p) => ({ ...p, [id]: resposta }));
      return true;
    } catch (e) {
      if (consultasPlano.current[id] === consulta) setErrosPlano((p) => ({ ...p, [id]: mensagemErro(e, "Não foi possível carregar o plano.") }));
      return false;
    } finally {
      if (consultasPlano.current[id] === consulta) setLendoPlanos((p) => ({ ...p, [id]: false }));
    }
  }, []);
  const carregarAvaliacoes = useCallback(async (id: string) => {
    const consulta = ++consultaLista.current;
    if (!id) { setAvaliacoes([]); return; }
    setLoading(true); setErro(null);
    try {
      const resposta = await avaliacaoApi.listar(id);
      if (consulta === consultaLista.current) setAvaliacoes(resposta);
    } catch (e) {
      if (consulta === consultaLista.current) { setAvaliacoes([]); setErro(mensagemErro(e, "Não foi possível carregar as avaliações.")); }
    } finally { if (consulta === consultaLista.current) setLoading(false); }
  }, []);
  useEffect(() => {
    let ativo = true;
    void avaliacaoApi.listarAtribuicoes().then((dados) => {
      if (ativo) { setAtribuicoes(dados); setContextoId(dados[0]?.id ?? ""); }
    }).catch((e) => { if (ativo) setErro(mensagemErro(e, "Não foi possível carregar as atribuições.")); })
      .finally(() => { if (ativo) setLoadingAtribuicoes(false); });
    return () => { ativo = false; consultaLista.current += 1; };
  }, []);
  useEffect(() => { void carregarAvaliacoes(contextoId); void carregarPlano(contextoId); }, [carregarAvaliacoes, carregarPlano, contextoId]);

  const plano = planos[contextoId];
  const planoForm = planos[form.turma_disciplina_id];
  const preservada = original?.primeiraNotaEm != null;
  const periodoFechado = planoForm?.motivosBloqueio.includes("PERIODO_FECHADO") ?? false;
  const formOcupado = saving || recarregandoForm || Boolean(lendoPlanos[form.turma_disciplina_id]);
  const podeAdicionar = Boolean(plano?.podeCriarRegular) && !lendoPlanos[contextoId] && !errosPlano[contextoId];
  const rows = useMemo(() => {
    const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return avaliacoes.filter((a) => a.tipo_avaliacao !== "RECUPERACAO").filter((a) =>
      [a.tipo_avaliacao, a.descricao_avaliacao ?? "", a.valor, formatarDataPtBr(a.data_lancamento), formatarDataPtBr(a.data_devolucao)]
        .some((v) => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(termo)));
  }, [avaliacoes, busca]);

  function limiteGrupo(grupo: SubgrupoPlanoAvaliacao) {
    const conserva = original?.turma_disciplina_id === form.turma_disciplina_id && original.subgrupo_id === grupo.id;
    return {
      saldo: conserva ? somarPontosApi([grupo.saldoPontos, original.valor]) : grupo.saldoPontos,
      quantidade: grupo.quantidadeDisponivel == null ? null : grupo.quantidadeDisponivel + (conserva ? 1 : 0),
    };
  }
  function abrirCadastro() {
    if (!podeAdicionar) return;
    setOriginal(null); setForm(vazio(contextoId)); setFormErro(null); setFormErrors({}); setConflito(false); setIncerto(false); setIncertoRecarregado(false); setDialogOpen(true);
  }
  function abrirEdicao(a: Avaliacao) {
    setOriginal(a);
    setForm({ turma_disciplina_id: a.turma_disciplina_id, subgrupo_id: a.subgrupo_id ?? "", tipo_avaliacao: a.tipo_avaliacao, descricao_avaliacao: a.descricao_avaliacao ?? "", valor: a.valor.replace(".", ","), data_lancamento: a.data_lancamento.slice(0, 10), data_devolucao: a.data_devolucao?.slice(0, 10) ?? "" });
    setFormErro(null); setFormErrors({}); setConflito(false); setIncerto(false); setIncertoRecarregado(false); setDialogOpen(true);
  }
  function alterarForm(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((f) => ({ ...f, [name]: value, ...(name === "turma_disciplina_id" ? { subgrupo_id: "" } : {}) }));
    setFormErrors((e) => ({ ...e, [name]: undefined }));
    if (!conflito && !incerto) setFormErro(null);
    if (name === "turma_disciplina_id") void carregarPlano(value);
  }
  function mostrarErros(erros: FormErrors) {
    setFormErrors(erros);
    const ordem: (keyof FormState)[] = ["turma_disciplina_id", "subgrupo_id", "valor", "descricao_avaliacao", "data_lancamento", "data_devolucao"];
    const primeiro = ordem.find((campo) => erros[campo]);
    if (primeiro) campos.current[primeiro]?.focus();
  }
  async function recarregarForm() {
    if (recarregandoForm || saving) return;
    setRecarregandoForm(true);
    try {
      const atualizada = original ? await avaliacaoApi.buscarPorId(original.id) : null;
      const destino = atualizada?.primeiraNotaEm != null ? atualizada.turma_disciplina_id : form.turma_disciplina_id;
      const lista = await avaliacaoApi.listar(contextoId);
      if (!(await carregarPlano(destino))) return;
      setAvaliacoes(lista);
      if (atualizada) {
        setOriginal(atualizada);
        if (atualizada.primeiraNotaEm != null) setForm((rascunho) => ({ ...rascunho,
          turma_disciplina_id: atualizada.turma_disciplina_id, subgrupo_id: atualizada.subgrupo_id ?? "",
          tipo_avaliacao: atualizada.tipo_avaliacao, valor: atualizada.valor.replace(".", ","),
        }));
        setIncerto(false);
      } else if (incerto) setIncertoRecarregado(true);
      setConflito(false); setFormErro(null); setFormErrors({});
    } catch (e) { setFormErro(mensagemErro(e, "Não foi possível recarregar as avaliações.")); }
    finally { setRecarregandoForm(false); }
  }
  async function salvar() {
    if (enviando.current || formOcupado || conflito || incerto || periodoFechado || !planoForm || errosPlano[form.turma_disciplina_id]) return;
    const erros: FormErrors = {};
    let valor = "";
    try { valor = pontosParaApi(form.valor, { positivo: true }); }
    catch (e) { erros.valor = e instanceof Error ? e.message : "Informe pontos válidos."; }
    const payload = { ...form, valor, descricao_avaliacao: form.descricao_avaliacao.trim(), data_devolucao: form.data_devolucao || null };
    try { await avaliacaoSchema.validate(payload, { abortEarly: false }); }
    catch (e) { if (e instanceof ValidationError) for (const item of e.inner) if (item.path) erros[item.path as keyof FormState] ??= item.message; }
    const grupo = planoForm.subgrupos.find((s) => s.id === form.subgrupo_id);
    if (!grupo) erros.subgrupo_id = "Selecione o subgrupo da avaliação.";
    else if (!preservada) {
      const limite = limiteGrupo(grupo);
      if (limite.quantidade !== null && limite.quantidade <= 0) erros.subgrupo_id = "A quantidade deste subgrupo está esgotada.";
      if (!erros.valor && compararPontosApi(valor, limite.saldo) > 0) erros.valor = `Saldo disponível: ${formatarPontos(limite.saldo)} pontos.`;
    }
    if (Object.keys(erros).length) { mostrarErros(erros); return; }
    enviando.current = true; setSaving(true); setFormErro(null); setFormErrors({}); setSucesso(null);
    try {
      if (original) await avaliacaoApi.atualizar(original.id, preservada
        ? { descricao_avaliacao: payload.descricao_avaliacao, data_lancamento: payload.data_lancamento, data_devolucao: payload.data_devolucao }
        : payload);
      else await avaliacaoApi.criar({ ...payload, tipo_avaliacao: "REGULAR" });
      const origem = original?.turma_disciplina_id ?? form.turma_disciplina_id;
      await Promise.all([carregarAvaliacoes(form.turma_disciplina_id), ...[...new Set([origem, form.turma_disciplina_id])].map(carregarPlano)]);
      setContextoId(form.turma_disciplina_id); setDialogOpen(false);
      setSucesso(original ? "Avaliação atualizada com sucesso." : "Avaliação cadastrada com sucesso.");
    } catch (e) {
      const resposta = axios.isAxiosError<ErroAvaliacao>(e) ? e.response : undefined;
      const errosServidor: FormErrors = {};
      for (const item of resposta?.data?.campos ?? []) if (item.campo in form) errosServidor[item.campo as keyof FormState] = item.mensagem;
      mostrarErros(errosServidor); setConflito(resposta?.status === 409);
      setIncerto(!resposta || resposta.status >= 500); setIncertoRecarregado(false);
      setFormErro(mensagemErro(e, "Não foi possível salvar a avaliação."));
    } finally { enviando.current = false; setSaving(false); }
  }
  async function confirmarExclusao() {
    if (!excluir || deleting || excluir.primeiraNotaEm != null) return;
    setDeleting(true); setErro(null); setSucesso(null);
    try {
      await avaliacaoApi.deletar(excluir.id);
      await Promise.all([carregarAvaliacoes(contextoId), carregarPlano(excluir.turma_disciplina_id)]);
      setExcluir(null); setSucesso("Avaliação excluída com sucesso.");
    } catch (e) { setErro(mensagemErro(e, "Não foi possível excluir a avaliação.")); }
    finally { setDeleting(false); }
  }

  const columns: GridColDef<Avaliacao>[] = [
    { field: "tipo_avaliacao", headerName: "Tipo", width: 120, renderCell: ({ row }) => <Chip size="small" color={corTipo(row.tipo_avaliacao)} variant="outlined" label={rotuloTipo(row.tipo_avaliacao)} /> },
    { field: "descricao_avaliacao", headerName: "Descrição", flex: 1, minWidth: 220, valueGetter: (_, row) => row.descricao_avaliacao || "Sem descrição" },
    { field: "subgrupo_id", headerName: "Subgrupo", width: 180, valueGetter: (_, row) => plano?.subgrupos.find((s) => s.id === row.subgrupo_id)?.nome ?? "-" },
    { field: "valor", headerName: "Valor", width: 110, valueFormatter: (v: string) => formatarPontos(v) },
    { field: "data_lancamento", headerName: "Lançamento", width: 130, valueFormatter: (v: string) => formatarDataPtBr(v) },
    { field: "data_devolucao", headerName: "Devolução", width: 125, valueFormatter: (v: string | null) => formatarDataPtBr(v) },
    { field: "acoes", headerName: "Ações", width: 112, sortable: false, filterable: false, renderCell: ({ row }) => <Stack direction="row" spacing={0.5}>
      <Tooltip title="Editar"><IconButton aria-label={`Editar avaliação ${row.descricao_avaliacao || rotuloTipo(row.tipo_avaliacao)}`} size="small" color="primary" onClick={() => abrirEdicao(row)}><Pencil size={16} aria-hidden="true" /></IconButton></Tooltip>
      <Tooltip title={row.primeiraNotaEm != null ? "Estrutura preservada após a primeira nota" : "Excluir"}><span><IconButton aria-label={`Excluir avaliação ${row.descricao_avaliacao || rotuloTipo(row.tipo_avaliacao)}`} disabled={row.primeiraNotaEm != null || plano?.motivosBloqueio.includes("PERIODO_FECHADO")} size="small" color="error" onClick={() => setExcluir(row)}><Trash2 size={16} aria-hidden="true" /></IconButton></span></Tooltip>
    </Stack> },
  ];

  return <Container><Stack gap={2} py={2}>
    <Box><Typography component="h1" variant="h5" fontWeight={700}>Gestão de avaliações</Typography><Typography color="text.secondary">Distribua as avaliações conforme a regra aplicada à turma e disciplina.</Typography></Box>
    <Card.Root elevation={0} variant="outlined"><Card.Content>
      {loadingAtribuicoes ? <Stack minHeight={56} direction="row" alignItems="center" justifyContent="center" gap={1}><CircularProgress size={20} /><Typography>Carregando atribuições...</Typography></Stack>
        : atribuicoes.length === 0 ? <Alert severity="info">Nenhuma atribuição ativa está disponível para o seu usuário.</Alert>
          : <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "flex-start" }} gap={1.5}>
            <TextField select id="avaliacoes-contexto" label="Turma e disciplina" SelectProps={{ SelectDisplayProps: { "aria-labelledby": "avaliacoes-contexto-label" } }} value={contextoId} onChange={(e) => setContextoId(e.target.value)} sx={{ minWidth: { md: 320 }, flex: { md: 1 } }}>{atribuicoes.map((a) => <MenuItem key={a.id} value={a.id}>{nomeAtribuicao(a)}</MenuItem>)}</TextField>
            <TextField aria-label="Pesquisar avaliações" placeholder="Pesquisar avaliações" value={busca} onChange={(e) => setBusca(e.target.value)} sx={{ flex: { md: 1 } }} InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} aria-hidden="true" /></InputAdornment> }} />
            <Button variant="contained" onClick={abrirCadastro} disabled={!podeAdicionar} startIcon={<Plus size={16} aria-hidden="true" />} sx={{ height: 36, minWidth: 120, width: { xs: "100%", md: "auto" } }}>Adicionar</Button>
          </Stack>}
    </Card.Content></Card.Root>
    {(erro || sucesso) && <Alert severity={erro ? "error" : "success"} onClose={() => { setErro(null); setSucesso(null); }}>{erro || sucesso}</Alert>}
    {contextoId && <>
      {lendoPlanos[contextoId] && <Stack role="status" direction="row" gap={1}><CircularProgress size={20} /><Typography>Carregando plano de avaliações...</Typography></Stack>}
      {errosPlano[contextoId] && <Alert severity="error" action={<Button onClick={() => void carregarPlano(contextoId)} sx={{ width: "auto" }}>Recarregar plano</Button>}>{errosPlano[contextoId]}</Alert>}
      {plano && !errosPlano[contextoId] && <>
        {plano.totalPontos == null ? <Alert severity="info">Regra de pontuação não configurada. Solicite a configuração à secretaria antes de cadastrar avaliações.</Alert> : <>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }}><Typography variant="h6">Total da regra: {formatarPontos(plano.totalPontos)} pontos</Typography><Chip size="small" variant="outlined" color={plano.planoCompleto ? "success" : "warning"} label={plano.planoCompleto ? "Plano completo" : "Plano incompleto"} /></Stack>
          <Grid container spacing={2}>{plano.subgrupos.map((s) => <Grid key={s.id} size={{ xs: 12, sm: 6, lg: 4 }}><Card.Root role="group" aria-label={s.nome} elevation={0} variant="outlined" sx={{ height: "100%" }}><Card.Content><Stack gap={0.5}>
            <Typography variant="subtitle1" fontWeight={700}>{s.nome}</Typography>
            <Typography>Orçamento: {formatarPontos(s.orcamentoPontos)} pontos</Typography><Typography>Distribuídos: {formatarPontos(s.pontosDistribuidos)} pontos</Typography><Typography fontWeight={700}>Saldo: {formatarPontos(s.saldoPontos)} pontos</Typography>
            <Typography>{s.modoQuantidade === "SEM_LIMITE" ? `Quantidade: ${s.quantidadeAtual} · Sem limite` : `Quantidade: ${s.quantidadeAtual}/${s.quantidadeFixa} · Disponível: ${s.quantidadeDisponivel}`}</Typography>
            <Chip size="small" sx={{ alignSelf: "flex-start" }} variant="outlined" label={s.completo ? "Subgrupo completo" : "Distribuição pendente"} color={s.completo ? "success" : "warning"} />
          </Stack></Card.Content></Card.Root></Grid>)}</Grid>
        </>}
        {plano.motivosBloqueio.includes("PERIODO_FECHADO") && <Alert severity="info">Período letivo encerrado: avaliações em modo somente leitura.</Alert>}
        {plano.motivosBloqueio.includes("OFERTA_INATIVA") && <Alert severity="info">A turma ou a oferta está inativa. O cadastro de avaliações está bloqueado.</Alert>}
      </>}
      <Card.Root elevation={0} variant="outlined"><Card.Header><Card.Title>Avaliações do contexto selecionado</Card.Title></Card.Header><Card.Content sx={{ minHeight: 480 }}><DataTable rows={rows} columns={columns} loading={loading} emptyTitle="Nenhuma avaliação encontrada" emptyDescription={busca ? "Revise o termo informado na pesquisa." : "As avaliações cadastradas aparecerão aqui."} /></Card.Content></Card.Root>
    </>}
  </Stack>
    <Dialog.Root open={dialogOpen} onClose={() => !formOcupado && setDialogOpen(false)} maxWidth="md" aria-labelledby="dialog-avaliacao-title"><Box component="form" noValidate onSubmit={(evento) => { evento.preventDefault(); void salvar(); }} sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}><Dialog.Header><Dialog.Title><span id="dialog-avaliacao-title">{original ? "Editar avaliação" : "Nova avaliação"}</span></Dialog.Title><Dialog.ActionClose onClose={() => !formOcupado && setDialogOpen(false)} /></Dialog.Header><Dialog.Content><Stack gap={2}>
      {formErro && <Alert severity="error">{formErro}</Alert>}
      {(conflito || incerto) && <Stack gap={1}><Typography>{incerto ? incertoRecarregado
        ? "As avaliações foram atualizadas. O rascunho foi conservado. Use Cancelar para revisar a lista antes de decidir uma nova criação."
        : "Não foi possível confirmar o salvamento. O rascunho foi conservado; recarregue o plano e as avaliações antes de decidir o próximo passo."
        : "Recarregue o plano e revise o rascunho antes de tentar novamente."}</Typography><Button onClick={() => void recarregarForm()} disabled={formOcupado} sx={{ width: { xs: "100%", sm: "auto" }, alignSelf: "flex-start" }}>Recarregar plano</Button></Stack>}
      {errosPlano[form.turma_disciplina_id] && <Alert severity="error" action={<Button onClick={() => void recarregarForm()} sx={{ width: "auto" }}>Recarregar plano</Button>}>{errosPlano[form.turma_disciplina_id]}</Alert>}
      {preservada && <Typography color="text.secondary">Estrutura preservada após a primeira nota. Máximo, subgrupo e oferta não podem ser alterados.</Typography>}
      {periodoFechado && <Typography color="text.secondary">Período encerrado: edição bloqueada.</Typography>}
      <Grid container spacing={2}>
        <Grid size={12}><TextField select id="avaliacao-oferta" label="Turma e disciplina" SelectProps={{ SelectDisplayProps: { "aria-labelledby": "avaliacao-oferta-label" } }} name="turma_disciplina_id" value={form.turma_disciplina_id} onChange={alterarForm} disabled={preservada || formOcupado || periodoFechado} error={Boolean(formErrors.turma_disciplina_id)} helperText={formErrors.turma_disciplina_id || " "} inputRef={(e: HTMLInputElement | null) => { campos.current.turma_disciplina_id = e; }} sx={campoSx}>{atribuicoes.map((a) => <MenuItem key={a.id} value={a.id}>{nomeAtribuicao(a)}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField select id="avaliacao-subgrupo" label="Subgrupo" SelectProps={{ SelectDisplayProps: { "aria-labelledby": "avaliacao-subgrupo-label" } }} name="subgrupo_id" value={form.subgrupo_id} onChange={alterarForm} disabled={preservada || formOcupado || periodoFechado} error={Boolean(formErrors.subgrupo_id)} helperText={formErrors.subgrupo_id || "Selecione o subgrupo da regra desta oferta."} inputRef={(e: HTMLInputElement | null) => { campos.current.subgrupo_id = e; }} sx={campoSx}>{(planoForm?.subgrupos ?? []).map((s) => {
          const limite = limiteGrupo(s);
          return <MenuItem key={s.id} value={s.id} disabled={!preservada && (compararPontosApi(limite.saldo, "0") <= 0 || (limite.quantidade !== null && limite.quantidade <= 0))}>{s.nome}</MenuItem>;
        })}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField id="avaliacao-maximo" label="Valor máximo" name="valor" value={form.valor} onChange={alterarForm} disabled={preservada || formOcupado || periodoFechado} error={Boolean(formErrors.valor)} helperText={formErrors.valor || "Informe os pontos com até duas casas decimais."} inputProps={{ inputMode: "decimal" }} inputRef={(e: HTMLInputElement | null) => { campos.current.valor = e; }} sx={campoSx} /></Grid>
        <Grid size={12}><TextField id="avaliacao-descricao" label="Descrição" name="descricao_avaliacao" value={form.descricao_avaliacao} onChange={alterarForm} disabled={formOcupado || periodoFechado} error={Boolean(formErrors.descricao_avaliacao)} helperText={formErrors.descricao_avaliacao || " "} inputRef={(e: HTMLInputElement | null) => { campos.current.descricao_avaliacao = e; }} sx={campoSx} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField id="avaliacao-lancamento" label="Data de lançamento" name="data_lancamento" type="date" value={form.data_lancamento} onChange={alterarForm} disabled={formOcupado || periodoFechado} error={Boolean(formErrors.data_lancamento)} InputLabelProps={{ shrink: true }} helperText={formErrors.data_lancamento || " "} inputRef={(e: HTMLInputElement | null) => { campos.current.data_lancamento = e; }} sx={campoSx} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField id="avaliacao-devolucao" label="Data de devolução" name="data_devolucao" type="date" value={form.data_devolucao} onChange={alterarForm} disabled={formOcupado || periodoFechado} error={Boolean(formErrors.data_devolucao)} InputLabelProps={{ shrink: true }} helperText={formErrors.data_devolucao || " "} inputRef={(e: HTMLInputElement | null) => { campos.current.data_devolucao = e; }} sx={campoSx} /></Grid>
      </Grid>
    </Stack></Dialog.Content><Dialog.Footer><Button variant="outlined" disabled={formOcupado} onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" variant="contained" aria-label="Salvar" disabled={formOcupado || conflito || incerto || periodoFechado || !planoForm || Boolean(errosPlano[form.turma_disciplina_id])} isLoading={saving}>Salvar</Button></Dialog.Footer></Box></Dialog.Root>
    <Dialog.Root open={Boolean(excluir)} onClose={() => !deleting && setExcluir(null)} maxWidth="xs" aria-labelledby="dialog-exclusao-title"><Dialog.Header><Dialog.Title><span id="dialog-exclusao-title">Confirmar exclusão</span></Dialog.Title><Dialog.ActionClose onClose={() => !deleting && setExcluir(null)} /></Dialog.Header><Dialog.Content><Typography>Tem certeza que deseja excluir <strong>{excluir?.descricao_avaliacao || "esta avaliação"}</strong>? Esta ação não pode ser desfeita.</Typography></Dialog.Content><Dialog.Footer><Button variant="outlined" disabled={deleting} onClick={() => setExcluir(null)}>Cancelar</Button><Button variant="contained" color="error" aria-label="Excluir" disabled={deleting} isLoading={deleting} onClick={() => void confirmarExclusao()}>Excluir</Button></Dialog.Footer></Dialog.Root>
  </Container>;
}
