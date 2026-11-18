import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Box, Chip, Grid, IconButton, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Card } from "../Card";
import Button from "../Button";
import { Dialog } from "../Dialog";
import TextField from "../TextField";
import { turmaApi } from "../../services/turma-api";
import type { HorarioOfertaRequest, HorarioOfertaResponse, TurmaDisciplinaResponse } from "../../models/turma-model";

const DIAS = [
  { id: 1, nome: "Segunda" }, { id: 2, nome: "Terça" }, { id: 3, nome: "Quarta" },
  { id: 4, nome: "Quinta" }, { id: 5, nome: "Sexta" }, { id: 6, nome: "Sábado" }, { id: 7, nome: "Domingo" },
];

type FormHorario = { ofertaId: string; diaSemana: string; horaInicio: string; horaFim: string; local: string; vigenciaInicio: string; vigenciaFim: string; ativo: boolean };
const inicial = (inicio: string, fim: string): FormHorario => ({ ofertaId: "", diaSemana: "1", horaInicio: "19:00", horaFim: "20:40", local: "", vigenciaInicio: inicio, vigenciaFim: fim, ativo: true });
const dataIso = (valor: string) => String(valor).slice(0, 10);
const hora = (valor: string) => String(valor).slice(0, 5);

export function HorariosTurma({ turmaId, ofertas, periodoInicio, periodoFim }: { turmaId: string; ofertas: TurmaDisciplinaResponse[]; periodoInicio: string; periodoFim: string }) {
  const [horarios, setHorarios] = useState<HorarioOfertaResponse[]>([]);
  const [dialogo, setDialogo] = useState(false);
  const [edicao, setEdicao] = useState<HorarioOfertaResponse | null>(null);
  const [exclusao, setExclusao] = useState<HorarioOfertaResponse | null>(null);
  const [form, setForm] = useState<FormHorario>(inicial(periodoInicio, periodoFim));
  const [mensagem, setMensagem] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setHorarios(await turmaApi.listarHorariosTurma(turmaId));
  }
  useEffect(() => { void carregar(); }, [turmaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const horariosPorDia = useMemo(() => new Map(DIAS.map((dia) => [dia.id, horarios.filter((item) => item.dia_semana === dia.id && item.ativo)])), [horarios]);

  function abrirNovo() {
    setEdicao(null);
    setForm({ ...inicial(periodoInicio, periodoFim), ofertaId: ofertas[0]?.id ?? "" });
    setMensagem(null);
    setDialogo(true);
  }
  function abrirEdicao(item: HorarioOfertaResponse) {
    setEdicao(item);
    setForm({ ofertaId: item.turma_disciplina_id, diaSemana: String(item.dia_semana), horaInicio: hora(item.hora_inicio), horaFim: hora(item.hora_fim), local: item.local ?? "", vigenciaInicio: dataIso(item.vigencia_inicio), vigenciaFim: dataIso(item.vigencia_fim), ativo: item.ativo });
    setMensagem(null);
    setDialogo(true);
  }

  async function salvar() {
    if (!form.ofertaId || !form.vigenciaInicio || !form.vigenciaFim) {
      setMensagem({ tipo: "error", texto: "Preencha oferta e vigência do horário." }); return;
    }
    const payload: HorarioOfertaRequest = { diaSemana: Number(form.diaSemana), horaInicio: form.horaInicio, horaFim: form.horaFim, local: form.local, vigenciaInicio: form.vigenciaInicio, vigenciaFim: form.vigenciaFim, ativo: form.ativo };
    setSalvando(true);
    try {
      if (edicao) await turmaApi.atualizarHorario(edicao.id, payload);
      else await turmaApi.criarHorario(form.ofertaId, payload);
      setDialogo(false);
      setMensagem({ tipo: "success", texto: edicao ? "Horário atualizado." : "Horário adicionado à grade." });
      await carregar();
    } catch (error) {
      setMensagem({ tipo: "error", texto: axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível salvar o horário." : "Não foi possível salvar o horário." });
    } finally { setSalvando(false); }
  }

  async function remover() {
    if (!exclusao) return;
    try { await turmaApi.removerHorario(exclusao.id); setExclusao(null); setMensagem({ tipo: "success", texto: "Horário removido." }); await carregar(); }
    catch { setMensagem({ tipo: "error", texto: "Não foi possível remover o horário." }); }
  }

  return <>
    <Card.Root>
      <Card.Header><Card.Title>Grade semanal</Card.Title></Card.Header>
      <Card.Content><Stack gap={2}>
        {mensagem && <Alert severity={mensagem.tipo}>{mensagem.texto}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} alignItems={{ sm: "center" }}><Box><Typography variant="body2" color="text.secondary">Horários recorrentes das ofertas desta turma. Conflitos de turma, professor e local são bloqueados automaticamente.</Typography><Typography variant="caption" color="text.secondary">Vigência do período: {periodoInicio || "—"} a {periodoFim || "—"}</Typography></Box><Button variant="contained" disabled={!ofertas.length} onClick={abrirNovo} sx={{ width: "auto", minWidth: 150, whiteSpace: "nowrap" }}>Adicionar horário</Button></Stack>
        {!horarios.length && <Alert severity="info">Nenhum horário cadastrado para esta turma.</Alert>}
        <Grid container spacing={1.5}>{DIAS.slice(0, 6).map((dia) => <Grid key={dia.id} size={{ xs: 12, sm: 6, lg: 4 }}><Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, minHeight: 120 }}><Stack direction="row" gap={1} alignItems="center" mb={1}><CalendarDays size={17} /><Typography fontWeight={800}>{dia.nome}</Typography></Stack><Stack gap={1}>{(horariosPorDia.get(dia.id) ?? []).map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 1.25, bgcolor: "action.hover" }}><Stack direction="row" justifyContent="space-between" gap={1}><Box minWidth={0}><Typography variant="body2" fontWeight={750}>{hora(item.hora_inicio)}–{hora(item.hora_fim)} · {item.disciplina_codigo}</Typography><Typography variant="caption" display="block" noWrap>{item.disciplina_nome}</Typography><Typography variant="caption" color="text.secondary">{item.professor_nome}{item.local ? ` · ${item.local}` : ""}</Typography></Box><Stack direction="row"><IconButton size="small" aria-label="Editar horário" onClick={() => abrirEdicao(item)}><Pencil size={15} /></IconButton><IconButton size="small" color="error" aria-label="Excluir horário" onClick={() => setExclusao(item)}><Trash2 size={15} /></IconButton></Stack></Stack></Paper>)}{!(horariosPorDia.get(dia.id) ?? []).length && <Typography variant="caption" color="text.secondary">Sem aulas planejadas</Typography>}</Stack></Paper></Grid>)}</Grid>
      </Stack></Card.Content>
    </Card.Root>

    <Dialog.Root open={dialogo} onClose={() => setDialogo(false)} maxWidth="sm"><Dialog.Header><Dialog.Title>{edicao ? "Editar horário" : "Adicionar horário"}</Dialog.Title><Dialog.ActionClose onClose={() => setDialogo(false)} /></Dialog.Header><Dialog.Content><Grid container spacing={2}>
      {mensagem?.tipo === "error" && <Grid size={12}><Alert severity="error">{mensagem.texto}</Alert></Grid>}
      <Grid size={12}><TextField label="Oferta" select required disabled={!!edicao} value={form.ofertaId} onChange={(e) => setForm((atual) => ({ ...atual, ofertaId: e.target.value }))}>{ofertas.map((item) => <MenuItem key={item.id} value={item.id}>{item.curso_disciplina.disciplina.codigo} · {item.curso_disciplina.disciplina.nome} · {item.professor.nome}</MenuItem>)}</TextField></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Dia da semana" select required value={form.diaSemana} onChange={(e) => setForm((atual) => ({ ...atual, diaSemana: e.target.value }))}>{DIAS.map((dia) => <MenuItem key={dia.id} value={String(dia.id)}>{dia.nome}</MenuItem>)}</TextField></Grid>
      <Grid size={{ xs: 6, sm: 3 }}><TextField label="Início" type="time" required value={form.horaInicio} onChange={(e) => setForm((atual) => ({ ...atual, horaInicio: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid size={{ xs: 6, sm: 3 }}><TextField label="Fim" type="time" required value={form.horaFim} onChange={(e) => setForm((atual) => ({ ...atual, horaFim: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid size={12}><TextField label="Local" value={form.local} onChange={(e) => setForm((atual) => ({ ...atual, local: e.target.value }))} placeholder="Ex.: Sala 204 ou Laboratório 2" /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Vigência inicial" type="date" required value={form.vigenciaInicio} onChange={(e) => setForm((atual) => ({ ...atual, vigenciaInicio: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid size={{ xs: 12, sm: 6 }}><TextField label="Vigência final" type="date" required value={form.vigenciaFim} onChange={(e) => setForm((atual) => ({ ...atual, vigenciaFim: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid size={12}><Chip color="info" label="A vigência deve permanecer dentro do período letivo" /></Grid>
    </Grid></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={() => setDialogo(false)}>Cancelar</Button><Button variant="contained" isLoading={salvando} onClick={() => void salvar()}>Salvar horário</Button></Dialog.Footer></Dialog.Root>

    <Dialog.Root open={!!exclusao} onClose={() => setExclusao(null)} maxWidth="xs"><Dialog.Header><Dialog.Title>Excluir horário</Dialog.Title><Dialog.ActionClose onClose={() => setExclusao(null)} /></Dialog.Header><Dialog.Content><Typography>Remover o bloco de {exclusao ? `${hora(exclusao.hora_inicio)} a ${hora(exclusao.hora_fim)}` : "horário"} de {exclusao?.disciplina_nome}?</Typography></Dialog.Content><Dialog.Footer><Button variant="outlined" onClick={() => setExclusao(null)}>Cancelar</Button><Button variant="contained" color="error" onClick={() => void remover()}>Excluir</Button></Dialog.Footer></Dialog.Root>
  </>;
}
