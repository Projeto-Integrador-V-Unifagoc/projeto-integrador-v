import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  IconButton, MenuItem, Paper, Stack, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CirclePause, CirclePlay, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
import type { CompetenciaResponse, TipoCompetencia } from "../../models/disciplina-model";
import { competenciaApi, type CriarCompetenciaRequest } from "../../services/competencia-api";
import { filtrarCompetencias, type SituacaoCompetencia } from "./competencia-filters";

const TIPOS: Array<{ valor: TipoCompetencia; rotulo: string }> = [
  { valor: "GERAL", rotulo: "Geral" },
  { valor: "TECNICA", rotulo: "Técnica" },
  { valor: "SOCIOEMOCIONAL", rotulo: "Socioemocional" },
];
const vazio: CriarCompetenciaRequest = { codigo: "", nome: "", descricao: "", tipo: "TECNICA" };
const rotuloTipo = (tipo: TipoCompetencia) => TIPOS.find((item) => item.valor === tipo)?.rotulo ?? tipo;
const mensagemErro = (erro: unknown, fallback: string) => {
  if (axios.isAxiosError(erro)) {
    const mensagem = erro.response?.data?.error ?? erro.response?.data?.mensagem;
    if (typeof mensagem === "string") return mensagem;
  }
  return erro instanceof Error ? erro.message : fallback;
};

export default function Competencias() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [itens, setItens] = useState<CompetenciaResponse[]>([]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<TipoCompetencia | "TODOS">("TODOS");
  const [situacao, setSituacao] = useState<SituacaoCompetencia>("TODAS");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<CompetenciaResponse | null>(null);
  const [form, setForm] = useState<CriarCompetenciaRequest>(vazio);
  const [excluir, setExcluir] = useState<CompetenciaResponse | null>(null);
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error"; mensagem: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setItens(await competenciaApi.listar({}));
    } catch (erro) {
      setAlerta({ tipo: "error", mensagem: mensagemErro(erro, "Não foi possível carregar as competências.") });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const filtradas = useMemo(() => filtrarCompetencias(itens, { busca, tipo, situacao }), [busca, itens, situacao, tipo]);

  function abrirNova() {
    setEditando(null);
    setForm(vazio);
    setFormAberto(true);
  }

  function abrirEdicao(item: CompetenciaResponse) {
    setEditando(item);
    setForm({ codigo: item.codigo, nome: item.nome, descricao: item.descricao, tipo: item.tipo });
    setFormAberto(true);
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.nome.trim() || !form.descricao.trim()) {
      setAlerta({ tipo: "error", mensagem: "Preencha código, nome e descrição da competência." });
      return;
    }
    setSalvando(true);
    try {
      if (editando) await competenciaApi.atualizar(editando.id, form);
      else await competenciaApi.criar(form);
      setFormAberto(false);
      setAlerta({ tipo: "success", mensagem: editando ? "Competência atualizada." : "Competência cadastrada." });
      await carregar();
    } catch (erro) {
      setAlerta({ tipo: "error", mensagem: mensagemErro(erro, "Não foi possível salvar a competência.") });
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(item: CompetenciaResponse) {
    try {
      await competenciaApi.alterarStatus(item.id, !item.ativo);
      setAlerta({ tipo: "success", mensagem: item.ativo ? "Competência desativada." : "Competência reativada." });
      await carregar();
    } catch (erro) {
      setAlerta({ tipo: "error", mensagem: mensagemErro(erro, "Não foi possível alterar o status.") });
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    try {
      await competenciaApi.remover(excluir.id);
      setExcluir(null);
      setAlerta({ tipo: "success", mensagem: "Competência excluída." });
      await carregar();
    } catch (erro) {
      setExcluir(null);
      setAlerta({ tipo: "error", mensagem: mensagemErro(erro, "Não foi possível excluir a competência.") });
    }
  }

  const colunas: GridColDef<CompetenciaResponse>[] = [
    { field: "codigo", headerName: "Código", width: 145 },
    { field: "nome", headerName: "Competência", flex: 1, minWidth: 220 },
    { field: "tipo", headerName: "Tipo", width: 165, renderCell: ({ row }) => <Chip size="small" variant="outlined" label={rotuloTipo(row.tipo)} /> },
    { field: "ativo", headerName: "Situação", width: 120, renderCell: ({ row }) => <Chip size="small" color={row.ativo ? "success" : "default"} label={row.ativo ? "Ativa" : "Inativa"} /> },
    {
      field: "acoes", headerName: "Ações", width: 150, sortable: false, filterable: false,
      renderCell: ({ row }) => <Stack direction="row" alignItems="center" spacing={0.5}>
        <Tooltip title="Editar"><IconButton size="small" color="primary" aria-label={`Editar ${row.nome}`} onClick={() => abrirEdicao(row)}><Pencil size={17} /></IconButton></Tooltip>
        <Tooltip title={row.ativo ? "Desativar" : "Reativar"}><IconButton size="small" color={row.ativo ? "warning" : "success"} aria-label={`${row.ativo ? "Desativar" : "Reativar"} ${row.nome}`} onClick={() => void alternarStatus(row)}>{row.ativo ? <CirclePause size={17} /> : <CirclePlay size={17} />}</IconButton></Tooltip>
        <Tooltip title="Excluir"><IconButton size="small" color="error" aria-label={`Excluir ${row.nome}`} onClick={() => setExcluir(row)}><Trash2 size={17} /></IconButton></Tooltip>
      </Stack>,
    },
  ];

  return <Container><Stack gap={2} py={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2}>
      <Box><Typography component="h1" variant="h5" fontWeight={800}>Competências</Typography><Typography variant="body2" color="text.secondary">Catálogo reutilizável pelas disciplinas.</Typography></Box>
      <Button variant="contained" startIcon={<Plus size={18} />} onClick={abrirNova} sx={{ width: "auto", minWidth: 180, whiteSpace: "nowrap" }}>Nova competência</Button>
    </Stack>
    {alerta && <Alert severity={alerta.tipo} onClose={() => setAlerta(null)}>{alerta.mensagem}</Alert>}
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Pesquisar" placeholder="Código, nome ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField select fullWidth label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCompetencia | "TODOS")}><MenuItem value="TODOS">Todos</MenuItem>{TIPOS.map((item) => <MenuItem key={item.valor} value={item.valor}>{item.rotulo}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><TextField select fullWidth label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoCompetencia)}><MenuItem value="TODAS">Todas</MenuItem><MenuItem value="ATIVAS">Ativas</MenuItem><MenuItem value="INATIVAS">Inativas</MenuItem></TextField></Grid>
      </Grid>
    </Paper>
    {mobile ? <Stack gap={1.5}>{filtradas.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}><Stack gap={1.25}><Stack direction="row" justifyContent="space-between" gap={1}><Box minWidth={0}><Typography fontWeight={800}>{item.nome}</Typography><Typography variant="caption" color="text.secondary">{item.codigo}</Typography></Box><Chip size="small" color={item.ativo ? "success" : "default"} label={item.ativo ? "Ativa" : "Inativa"} /></Stack><Typography variant="body2">{item.descricao}</Typography><Stack direction="row" justifyContent="space-between" alignItems="center"><Chip size="small" variant="outlined" label={rotuloTipo(item.tipo)} /><Stack direction="row"><IconButton aria-label={`Editar ${item.nome}`} color="primary" onClick={() => abrirEdicao(item)}><Pencil size={18} /></IconButton><IconButton aria-label={`${item.ativo ? "Desativar" : "Reativar"} ${item.nome}`} color={item.ativo ? "warning" : "success"} onClick={() => void alternarStatus(item)}>{item.ativo ? <CirclePause size={18} /> : <CirclePlay size={18} />}</IconButton><IconButton aria-label={`Excluir ${item.nome}`} color="error" onClick={() => setExcluir(item)}><Trash2 size={18} /></IconButton></Stack></Stack></Stack></Paper>)}{!carregando && !filtradas.length && <Alert severity="info">Nenhuma competência encontrada com os filtros atuais.</Alert>}</Stack> : <DataTable columns={colunas} rows={filtradas} loading={carregando} emptyTitle="Nenhuma competência encontrada" emptyDescription={itens.length ? "Ajuste os filtros para ver outros resultados." : "Cadastre a primeira competência do catálogo."} />}
  </Stack>

  <Dialog open={formAberto} onClose={() => !salvando && setFormAberto(false)} fullWidth maxWidth="sm">
    <DialogTitle>{editando ? "Editar competência" : "Nova competência"}</DialogTitle>
    <DialogContent><Stack gap={2} mt={1}><TextField required label="Código" value={form.codigo} onChange={(e) => setForm((atual) => ({ ...atual, codigo: e.target.value }))} /><TextField required label="Nome" value={form.nome} onChange={(e) => setForm((atual) => ({ ...atual, nome: e.target.value }))} /><TextField required multiline minRows={3} label="Descrição" value={form.descricao} onChange={(e) => setForm((atual) => ({ ...atual, descricao: e.target.value }))} /><TextField select label="Tipo" value={form.tipo} onChange={(e) => setForm((atual) => ({ ...atual, tipo: e.target.value as TipoCompetencia }))}>{TIPOS.map((item) => <MenuItem key={item.valor} value={item.valor}>{item.rotulo}</MenuItem>)}</TextField></Stack></DialogContent>
    <DialogActions sx={{ "& > button": { width: "auto", minWidth: 110, whiteSpace: "nowrap" } }}><Button variant="outlined" disabled={salvando} onClick={() => setFormAberto(false)}>Cancelar</Button><Button variant="contained" isLoading={salvando} onClick={() => void salvar()}>{editando ? "Salvar alterações" : "Cadastrar"}</Button></DialogActions>
  </Dialog>

  <Dialog open={!!excluir} onClose={() => setExcluir(null)} maxWidth="xs" fullWidth>
    <DialogTitle>Excluir competência</DialogTitle><DialogContent><Typography>Deseja excluir <strong>{excluir?.nome}</strong>? Se ela já estiver vinculada a uma disciplina, o sistema orientará a desativação.</Typography></DialogContent><DialogActions sx={{ "& > button": { width: "auto", minWidth: 100 } }}><Button variant="outlined" onClick={() => setExcluir(null)}>Cancelar</Button><Button variant="contained" color="error" onClick={() => void confirmarExclusao()}>Excluir</Button></DialogActions>
  </Dialog>
  </Container>;
}
