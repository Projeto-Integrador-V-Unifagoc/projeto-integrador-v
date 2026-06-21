import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Container from "../../components/Container";
import { useFrequencia } from "../../hooks/use-frequencia";
import { frequenciaApi } from "../../services/frequencia-api";
import type { AlunoChamada, ConsolidadoFrequencia, HistoricoFrequenciaAluno, LocalAula, StatusFrequencia, TurmaFrequencia } from "../../models/frequencia-model";

const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const mensagemErro = (erro: unknown) => {
  const e = erro as { response?: { data?: { mensagem?: string } }; message?: string };
  return e.response?.data?.mensagem || e.message || "Não foi possível concluir a operação.";
};
const perfilLocal = () => { try { return String(JSON.parse(localStorage.getItem("@UniEduca:user") || "{}").tipo_usuario || "").toLowerCase(); } catch { return ""; } };
const cor = (s: string): "success" | "warning" | "error" | "default" => s === "REGULAR" ? "success" : s === "ALERTA" ? "warning" : s === "RISCO_REPROVACAO" ? "error" : "default";
const rotulo = (s: string) => ({ REGULAR: "Regular", ALERTA: "Alerta", RISCO_REPROVACAO: "Risco de reprovação", NAO_LANCADO: "Não lançado" }[s] || s);

export default function Frequencia() {
  const api = useFrequencia(); const perfil = perfilLocal(); const aluno = perfil === "aluno";
  const podeEditar = perfil === "professor";
  const [turmas, setTurmas] = useState<TurmaFrequencia[]>([]); const [locais, setLocais] = useState<LocalAula[]>([]);
  const [turmaId, setTurmaId] = useState(""); const [localId, setLocalId] = useState(""); const [data, setData] = useState(hojeSP());
  const [chamada, setChamada] = useState<AlunoChamada[]>([]); const [irregulares, setIrregulares] = useState(0); const [alterado, setAlterado] = useState(false);
  const [consolidado, setConsolidado] = useState<ConsolidadoFrequencia[]>([]); const [historico, setHistorico] = useState<HistoricoFrequenciaAluno[]>([]);
  const [aba, setAba] = useState(0); const [aviso, setAviso] = useState<{ tipo: "success" | "error" | "info" | "warning"; texto: string }>();
  const [justificar, setJustificar] = useState<HistoricoFrequenciaAluno | null>(null); const [motivo, setMotivo] = useState(""); const [observacao, setObservacao] = useState("");

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        if (aluno) {
          const r = await frequenciaApi.minhaFrequencia();
          if (!ativo) return;
          setConsolidado(r.consolidado); setHistorico(r.historico);
          if (r.possuiAlerta) setAviso({ tipo: "warning", texto: "Atenção: sua frequência está em 80% ou menos em pelo menos uma disciplina." });
        } else {
          const r = await frequenciaApi.listarOpcoes();
          if (!ativo) return;
          setTurmas(r.turmas); setLocais(r.locais); setTurmaId(r.turmas[0]?.id || ""); setLocalId(r.locais[0]?.id || "");
        }
      } catch (e) { if (ativo) setAviso({ tipo: "error", texto: mensagemErro(e) }); }
    })();
    return () => { ativo = false; };
  }, [aluno]);
  useEffect(() => { const sair = (e: BeforeUnloadEvent) => { if (alterado) e.preventDefault(); }; addEventListener("beforeunload", sair); return () => removeEventListener("beforeunload", sair); }, [alterado]);
  async function carregar() { if (!turmaId) return; if (alterado && !confirm("Descartar alterações ainda não salvas?")) return; try { const r = await api.obterChamada({ turmaDisciplinaId: turmaId, data }); setChamada(r.alunos); setIrregulares(r.matriculasIrregulares); setAlterado(false); setAviso(r.jaRegistrada && !r.chamadaCompleta ? { tipo: "warning", texto: "A chamada existente está incompleta; salve para regularizá-la." } : undefined); } catch (e) { setAviso({ tipo: "error", texto: mensagemErro(e) }); } }
  function mudarStatus(id: string, status: StatusFrequencia) { setChamada((xs) => xs.map((x) => x.id === id ? { ...x, status } : x)); setAlterado(true); }
  function todosPresentes() { if (!confirm("Marcar todos os alunos elegíveis como presentes?")) return; setChamada((xs) => xs.map((x) => ({ ...x, status: "PRESENTE" }))); setAlterado(true); }
  async function salvar() { if (!chamada.length || chamada.some((a) => !a.status)) return setAviso({ tipo: "error", texto: "Marque presente ou ausente para todos os alunos." }); if (!localId && chamada.some((a) => !a.frequenciaId)) return setAviso({ tipo: "error", texto: "Selecione o local da aula." }); try { await api.salvarChamada({ turmaDisciplinaId: turmaId, localId, data, registros: chamada.map((a) => ({ alunoId: a.id, status: a.status! })) }); setAlterado(false); setAviso({ tipo: "success", texto: "Chamada completa salva de forma atômica." }); await carregar(); } catch (e) { setAviso({ tipo: "error", texto: mensagemErro(e) }); } }
  async function relatorio() { try { const r = await api.gerarRelatorio({ turmaDisciplinaId: turmaId }); setConsolidado(r.alunos); setIrregulares(r.matriculasIrregulares); setAba(1); if (r.alunos.length && !r.alunosEmRisco.length && !r.alunosEmAlerta.length) setAviso({ tipo: "info", texto: "Todos os alunos com frequência lançada estão regulares." }); } catch (e) { setAviso({ tipo: "error", texto: mensagemErro(e) }); } }
  async function salvarJustificativa() { if (!justificar) return; try { await api.justificar(justificar.id, { motivo, observacao, confirmarSubstituicao: Boolean(justificar.motivoJustificativa) }); setJustificar(null); setAviso({ tipo: "success", texto: "Justificativa salva. A falta continua no cálculo da frequência." }); const r = await api.minhaFrequencia(); setConsolidado(r.consolidado); setHistorico(r.historico); } catch (e) { setAviso({ tipo: "error", texto: mensagemErro(e) }); } }

  const colunasConsolidado = useMemo<GridColDef[]>(() => [
    { field: "disciplinaNome", headerName: "Disciplina", flex: 1, minWidth: 180 }, { field: "alunoNome", headerName: "Aluno", flex: 1, minWidth: 180 },
    { field: "totalAulas", headerName: "Aulas", width: 80 }, { field: "presencas", headerName: "Presenças", width: 100 }, { field: "faltas", headerName: "Faltas", width: 80 },
    { field: "naoLancadas", headerName: "Não lançadas", width: 115 }, { field: "percentual", headerName: "Frequência", width: 110, valueFormatter: (v) => v == null ? "—" : `${v}%` },
    { field: "situacao", headerName: "Situação", width: 170, renderCell: ({ value }) => <Chip size="small" color={cor(value)} label={rotulo(value)} /> },
  ], []);
  const colunasChamada: GridColDef[] = [
    { field: "matricula", headerName: "Matrícula", width: 110 }, { field: "nome", headerName: "Aluno", flex: 1, minWidth: 200 },
    { field: "status", headerName: "Frequência", width: 160, renderCell: ({ row }) => <Select size="small" disabled={!podeEditar} value={row.status || ""} displayEmpty onChange={(e) => mudarStatus(row.id, e.target.value as StatusFrequencia)}><MenuItem value="" disabled>Selecione</MenuItem><MenuItem value="PRESENTE">Presente</MenuItem><MenuItem value="AUSENTE">Ausente</MenuItem></Select> },
    { field: "percentualAtual", headerName: "% atual", width: 100, valueFormatter: (v) => `${v}%` },
  ];

  if (aluno) return <Container><Stack gap={2} mt={2}><Typography variant="h5" fontWeight={700}>Minha Frequência</Typography>{aviso && <Alert severity={aviso.tipo}>{aviso.texto}</Alert>}<Paper sx={{ height: 360 }}><DataGrid rows={consolidado.map((x) => ({ ...x, id: x.turmaDisciplinaId }))} columns={colunasConsolidado.filter((c) => c.field !== "alunoNome")} loading={api.operacoes.consulta} disableRowSelectionOnClick /></Paper><Typography variant="h6">Histórico aula a aula</Typography><Paper sx={{ height: 360 }}><DataGrid rows={historico} columns={[{ field: "data", headerName: "Data", width: 120 }, { field: "disciplinaNome", headerName: "Disciplina", flex: 1 }, { field: "status", headerName: "Status", width: 110 }, { field: "motivoJustificativa", headerName: "Justificativa", flex: 1, valueFormatter: (v) => v || "—" }, { field: "acao", headerName: "Ação", width: 120, renderCell: ({ row }) => row.status === "AUSENTE" ? <Button onClick={() => { setJustificar(row); setMotivo(row.motivoJustificativa || ""); setObservacao(row.observacaoJustificativa || ""); }}>Justificar</Button> : null }]} disableRowSelectionOnClick /></Paper><Dialog open={Boolean(justificar)} onClose={() => setJustificar(null)} fullWidth><DialogTitle>{justificar?.motivoJustificativa ? "Substituir justificativa" : "Justificar ausência"}</DialogTitle><DialogContent><Stack gap={2} mt={1}><TextField label="Motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} inputProps={{ maxLength: 200 }} /><TextField label="Observação (opcional)" multiline minRows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} inputProps={{ maxLength: 1000 }} />{justificar?.motivoJustificativa && <Alert severity="warning">Ao salvar, a justificativa anterior será substituída e permanecerá na auditoria.</Alert>}</Stack></DialogContent><DialogActions><Button onClick={() => setJustificar(null)}>Cancelar</Button><Button variant="contained" onClick={salvarJustificativa}>Salvar</Button></DialogActions></Dialog></Stack></Container>;

  return <Container><Stack gap={2} mt={2}><Typography variant="h5" fontWeight={700}>Frequência</Typography>{aviso && <Alert severity={aviso.tipo}>{aviso.texto}</Alert>}<Paper sx={{ p: 2 }}><Stack direction={{ xs: "column", md: "row" }} gap={2}><FormControl fullWidth><InputLabel>Turma / disciplina</InputLabel><Select label="Turma / disciplina" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>{turmas.map((t) => <MenuItem key={t.id} value={t.id}>{t.sigla} — {t.disciplina.nome} — {t.periodoLetivo.codigo}</MenuItem>)}</Select></FormControl><TextField label="Data da aula" type="date" value={data} onChange={(e) => setData(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />{podeEditar && <FormControl sx={{ minWidth: 180 }}><InputLabel>Local</InputLabel><Select label="Local" value={localId} onChange={(e) => setLocalId(e.target.value)}>{locais.map((l) => <MenuItem key={l.id} value={l.id}>{l.codigo}</MenuItem>)}</Select></FormControl>}<Button variant="contained" onClick={carregar} disabled={!turmaId}>Carregar</Button></Stack></Paper>{irregulares > 0 && <Alert severity="info">{irregulares} matrícula(s) irregular(es) foram omitidas.</Alert>}<Tabs value={aba} onChange={(_, v) => setAba(v)}><Tab label="Chamada" /><Tab label="Relatório" /></Tabs>{aba === 0 ? <>{podeEditar && <Stack direction="row" justifyContent="flex-end" gap={1}><Button onClick={todosPresentes}>Marcar todos presentes</Button><Button variant="contained" onClick={salvar} disabled={!alterado || api.operacoes.salvamento}>Salvar chamada completa</Button></Stack>}{alterado && <Alert severity="warning">Existem alterações não salvas.</Alert>}<Paper sx={{ height: 480 }}><DataGrid rows={chamada} columns={colunasChamada} loading={api.operacoes.chamada} disableRowSelectionOnClick /></Paper></> : <><Box><Button variant="contained" onClick={relatorio}>Atualizar relatório</Button></Box><Paper sx={{ height: 480 }}><DataGrid rows={consolidado.map((x) => ({ ...x, id: x.alunoId }))} columns={colunasConsolidado} loading={api.operacoes.relatorio} disableRowSelectionOnClick /></Paper></>}</Stack></Container>;
}
