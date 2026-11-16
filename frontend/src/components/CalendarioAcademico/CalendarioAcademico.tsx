import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Chip, FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack, Switch, Typography } from "@mui/material";
import { CalendarDays, Pencil, Play, Plus, Trash2 } from "lucide-react";
import Button from "../Button";
import { Card } from "../Card";
import { Dialog } from "../Dialog";
import TextField from "../TextField";
import type { EventoAcademico, GeracaoAulasResumo, TipoEventoAcademico } from "../../models/periodo-letivo-model";
import { periodoLetivoApi } from "../../services/periodo-letivo-api";

const TIPOS: Array<{ id: TipoEventoAcademico; nome: string }> = [
  { id: "FERIADO", nome: "Feriado" }, { id: "RECESSO", nome: "Recesso" },
  { id: "SUSPENSAO", nome: "Suspensão de aulas" }, { id: "EVENTO", nome: "Evento acadêmico" },
];
type FormEvento = { tipo: TipoEventoAcademico; titulo: string; descricao: string; dataInicio: string; dataFim: string; bloqueiaAulas: boolean };
const vazio = (inicio: string): FormEvento => ({ tipo: "FERIADO", titulo: "", descricao: "", dataInicio: inicio, dataFim: inicio, bloqueiaAulas: true });
const iso = (valor: string) => String(valor).slice(0, 10);
const erro = (e: unknown) => axios.isAxiosError(e) ? e.response?.data?.error ?? "Não foi possível concluir a operação." : "Não foi possível concluir a operação.";

export function CalendarioAcademico({ periodoId, inicio, fim }: { periodoId: string; inicio: string; fim: string }) {
  const [eventos, setEventos] = useState<EventoAcademico[]>([]);
  const [dialogo, setDialogo] = useState(false);
  const [edicao, setEdicao] = useState<EventoAcademico | null>(null);
  const [exclusao, setExclusao] = useState<EventoAcademico | null>(null);
  const [form, setForm] = useState<FormEvento>(vazio(inicio));
  const [intervalo, setIntervalo] = useState({ dataInicio: inicio, dataFim: fim });
  const [simulacao, setSimulacao] = useState<GeracaoAulasResumo | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "success" | "error" | "info"; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() { setEventos((await periodoLetivoApi.buscarCalendario(periodoId)).eventos); }
  useEffect(() => { void carregar(); }, [periodoId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setIntervalo({ dataInicio: inicio, dataFim: fim }); }, [inicio, fim]);

  function novo() { setEdicao(null); setForm(vazio(inicio)); setMensagem(null); setDialogo(true); }
  function editar(item: EventoAcademico) {
    setEdicao(item); setForm({ tipo: item.tipo, titulo: item.titulo, descricao: item.descricao ?? "", dataInicio: iso(item.data_inicio), dataFim: iso(item.data_fim), bloqueiaAulas: item.bloqueia_aulas }); setMensagem(null); setDialogo(true);
  }
  async function salvar() {
    if (!form.titulo.trim() || !form.dataInicio || !form.dataFim) { setMensagem({ tipo: "error", texto: "Informe título e período do evento." }); return; }
    setOcupado(true);
    try {
      if (edicao) await periodoLetivoApi.atualizarEvento(edicao.id, form); else await periodoLetivoApi.criarEvento(periodoId, form);
      setDialogo(false); setSimulacao(null); setMensagem({ tipo: "success", texto: edicao ? "Evento atualizado. Simule novamente as aulas." : "Evento adicionado. Simule a geração das aulas." }); await carregar();
    } catch (e) { setMensagem({ tipo: "error", texto: erro(e) }); } finally { setOcupado(false); }
  }
  async function remover() {
    if (!exclusao) return; setOcupado(true);
    try { await periodoLetivoApi.removerEvento(exclusao.id); setExclusao(null); setSimulacao(null); setMensagem({ tipo: "success", texto: "Evento removido. Simule novamente as aulas." }); await carregar(); }
    catch (e) { setMensagem({ tipo: "error", texto: erro(e) }); } finally { setOcupado(false); }
  }
  async function gerar(simular: boolean) {
    setOcupado(true);
    try {
      const resultado = await periodoLetivoApi.gerarAulas(periodoId, { ...intervalo, simular }); setSimulacao(resultado);
      setMensagem({ tipo: "success", texto: simular ? "Simulação concluída. Revise os números antes de confirmar." : "Ocorrências de aula sincronizadas com sucesso." });
    } catch (e) { setMensagem({ tipo: "error", texto: erro(e) }); } finally { setOcupado(false); }
  }

  return <>
    <Card.Root>
      <Card.Header><Card.Title>Calendário acadêmico e ocorrências de aula</Card.Title></Card.Header>
      <Card.Content><Stack gap={2}>
        {mensagem && <Alert severity={mensagem.tipo}>{mensagem.texto}</Alert>}
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={1}><Box><Typography variant="body2" color="text.secondary">Cadastre feriados, recessos e suspensões antes de gerar as aulas dos horários recorrentes.</Typography><Typography variant="caption" color="text.secondary">Período: {inicio || "—"} a {fim || "—"}</Typography></Box><Button variant="outlined" startIcon={<Plus size={16} />} onClick={novo} sx={{ width: "auto", minWidth: 150 }}>Adicionar evento</Button></Stack>
        {!eventos.length ? <Alert severity="info">Nenhuma exceção cadastrada. Todos os dias compatíveis com a grade serão considerados letivos.</Alert> : <Grid container spacing={1.25}>{eventos.map((item) => <Grid key={item.id} size={{ xs: 12, md: 6 }}><Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}><Stack direction="row" justifyContent="space-between" gap={1}><Box><Stack direction="row" gap={1} alignItems="center"><CalendarDays size={17} /><Typography fontWeight={800}>{item.titulo}</Typography></Stack><Typography variant="body2" color="text.secondary">{iso(item.data_inicio)}{iso(item.data_fim) !== iso(item.data_inicio) ? ` a ${iso(item.data_fim)}` : ""}</Typography><Stack direction="row" gap={0.75} mt={0.75}><Chip size="small" label={TIPOS.find((tipo) => tipo.id === item.tipo)?.nome ?? item.tipo} /><Chip size="small" color={item.bloqueia_aulas ? "warning" : "default"} variant="outlined" label={item.bloqueia_aulas ? "Suspende aulas" : "Informativo"} /></Stack></Box><Stack direction="row"><IconButton aria-label="Editar evento" onClick={() => editar(item)}><Pencil size={16} /></IconButton><IconButton aria-label="Excluir evento" color="error" onClick={() => setExclusao(item)}><Trash2 size={16} /></IconButton></Stack></Stack></Paper></Grid>)}</Grid>}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "action.hover" }}><Stack gap={1.5}><Typography fontWeight={850}>Gerar ocorrências a partir da grade semanal</Typography><Grid container spacing={1.5}><Grid size={{ xs: 12, sm: 4 }}><TextField label="Início" type="date" value={intervalo.dataInicio} onChange={(e) => { setIntervalo((a) => ({ ...a, dataInicio: e.target.value })); setSimulacao(null); }} InputLabelProps={{ shrink: true }} /></Grid><Grid size={{ xs: 12, sm: 4 }}><TextField label="Fim" type="date" value={intervalo.dataFim} onChange={(e) => { setIntervalo((a) => ({ ...a, dataFim: e.target.value })); setSimulacao(null); }} InputLabelProps={{ shrink: true }} /></Grid><Grid size={{ xs: 12, sm: 4 }}><Button variant="outlined" startIcon={<Play size={16} />} isLoading={ocupado} onClick={() => void gerar(true)} sx={{ width: "100%" }}>Simular geração</Button></Grid></Grid>
          {simulacao && <Alert severity={simulacao.horariosAtivos ? "info" : "warning"}><strong>{simulacao.ocorrenciasPrevistas}</strong> ocorrências previstas · <strong>{simulacao.novas}</strong> novas · <strong>{simulacao.existentes}</strong> já existentes · <strong>{simulacao.excluidasPorCalendario}</strong> excluídas pelo calendário.{simulacao.simulado && <Button color="inherit" disabled={ocupado} onClick={() => void gerar(false)} sx={{ ml: 1, width: "auto" }}>Confirmar geração</Button>}</Alert>}
          <Typography variant="caption" color="text.secondary">A operação é idempotente. Ocorrências com chamada realizada são preservadas; mudanças no calendário cancelam apenas aulas planejadas sem frequência.</Typography>
        </Stack></Paper>
      </Stack></Card.Content>
    </Card.Root>

    <Dialog.Root open={dialogo} onClose={() => setDialogo(false)} maxWidth="sm"><Dialog.Header><Dialog.Title>{edicao ? "Editar evento" : "Adicionar evento"}</Dialog.Title><Dialog.ActionClose onClose={() => setDialogo(false)} /></Dialog.Header><Dialog.Content><Grid container spacing={2}>{mensagem?.tipo === "error" && <Grid size={12}><Alert severity="error">{mensagem.texto}</Alert></Grid>}<Grid size={{ xs: 12, sm: 5 }}><TextField select label="Tipo" value={form.tipo} onChange={(e) => setForm((a) => ({ ...a, tipo: e.target.value as TipoEventoAcademico }))}>{TIPOS.map((tipo) => <MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>)}</TextField></Grid><Grid size={{ xs: 12, sm: 7 }}><TextField label="Título" value={form.titulo} onChange={(e) => setForm((a) => ({ ...a, titulo: e.target.value }))} /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField label="Data inicial" type="date" value={form.dataInicio} onChange={(e) => setForm((a) => ({ ...a, dataInicio: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid><Grid size={{ xs: 12, sm: 6 }}><TextField label="Data final" type="date" value={form.dataFim} onChange={(e) => setForm((a) => ({ ...a, dataFim: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid><Grid size={12}><TextField label="Descrição" multiline minRows={2} value={form.descricao} onChange={(e) => setForm((a) => ({ ...a, descricao: e.target.value }))} /></Grid><Grid size={12}><FormControlLabel control={<Switch checked={form.bloqueiaAulas} onChange={(e) => setForm((a) => ({ ...a, bloqueiaAulas: e.target.checked }))} />} label="Suspender geração de aulas neste intervalo" /></Grid></Grid></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={() => setDialogo(false)}>Cancelar</Button><Button variant="contained" isLoading={ocupado} onClick={() => void salvar()}>Salvar evento</Button></Dialog.Footer></Dialog.Root>
    <Dialog.Root open={!!exclusao} onClose={() => setExclusao(null)} maxWidth="xs"><Dialog.Header><Dialog.Title>Excluir evento</Dialog.Title><Dialog.ActionClose onClose={() => setExclusao(null)} /></Dialog.Header><Dialog.Content><Typography>Excluir “{exclusao?.titulo}”? Depois será necessário sincronizar novamente as ocorrências.</Typography></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={() => setExclusao(null)}>Cancelar</Button><Button variant="contained" color="error" isLoading={ocupado} onClick={() => void remover()}>Excluir</Button></Dialog.Footer></Dialog.Root>
  </>;
}
