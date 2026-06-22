import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Chip, FormControlLabel, Grid, MenuItem, Stack, Switch, Tab, Tabs, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CheckCheck, RefreshCw, Save, Search } from "lucide-react";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
import { useNotificacao } from "../../components/Notificacao/NotificationProvider";
import { useFrequencia } from "../../hooks/use-frequencia";
import type {
  AlunoChamada,
  ConsolidadoFrequencia,
  LocalAula,
  StatusFrequencia,
  TurmaFrequencia,
} from "../../models/frequencia-model";
import { colunasConsolidado } from "./frequencia-columns";
import {
  corStatus,
  formatarPercentual,
  hojeSP,
  mensagemErro,
  perfilLocal,
  rotuloStatus,
} from "./frequencia-utils";

export default function VisaoOperacional() {
  const api = useFrequencia();
  const { notificar } = useNotificacao();
  const podeEditar = perfilLocal() === "professor";

  const [turmas, setTurmas] = useState<TurmaFrequencia[]>([]);
  const [locais, setLocais] = useState<LocalAula[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [localId, setLocalId] = useState("");
  const [data, setData] = useState(hojeSP());
  const [chamada, setChamada] = useState<AlunoChamada[]>([]);
  const [alterado, setAlterado] = useState(false);
  const [consolidado, setConsolidado] = useState<ConsolidadoFrequencia[]>([]);
  const [aba, setAba] = useState(0);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const r = await api.listarOpcoes();
        if (!ativo) return;
        setTurmas(r.turmas);
        setLocais(r.locais);
        setTurmaId(r.turmas[0]?.id || "");
        setLocalId(r.locais[0]?.id || "");
      } catch (e) {
        if (ativo) notificar(mensagemErro(e), "error");
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificar]);

  useEffect(() => {
    const sair = (e: BeforeUnloadEvent) => {
      if (alterado) e.preventDefault();
    };
    addEventListener("beforeunload", sair);
    return () => removeEventListener("beforeunload", sair);
  }, [alterado]);

  async function carregar() {
    if (!turmaId) return;
    if (alterado && !confirm("Descartar alterações ainda não salvas?")) return;
    try {
      const r = await api.obterChamada({ turmaDisciplinaId: turmaId, data });
      setChamada(r.alunos);
      if (r.matriculasIrregulares > 0) {
        notificar(`${r.matriculasIrregulares} matrícula(s) irregular(es) foram omitidas.`, "info");
      }
      setAlterado(false);
      if (r.jaRegistrada && !r.chamadaCompleta) {
        notificar("A chamada existente está incompleta; salve para regularizá-la.", "warning");
      }
    } catch (e) {
      notificar(mensagemErro(e), "error");
    }
  }

  const mudarStatus = useCallback((id: string, status: StatusFrequencia) => {
    setChamada((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    if (!alterado) notificar("Existem alterações não salvas na chamada.", "warning");
    setAlterado(true);
  }, [alterado, notificar]);

  function todosPresentes() {
    if (!confirm("Marcar todos os alunos elegíveis como presentes?")) return;
    setChamada((xs) => xs.map((x) => ({ ...x, status: "PRESENTE" })));
    notificar("Todos os alunos elegíveis foram marcados como presentes. Salve a chamada para confirmar.", "info");
    setAlterado(true);
  }

  async function salvar() {
    if (!chamada.length || chamada.some((a) => !a.status)) {
      notificar("Marque presente ou ausente para todos os alunos.", "error");
      return;
    }
    if (!localId && chamada.some((a) => !a.frequenciaId)) {
      notificar("Selecione o local da aula.", "error");
      return;
    }
    try {
      await api.salvarChamada({
        turmaDisciplinaId: turmaId,
        localId,
        data,
        registros: chamada.map((a) => ({ alunoId: a.id, status: a.status! })),
      });
      setAlterado(false);
      notificar("Chamada completa salva com sucesso.", "success");
      await carregar();
    } catch (e) {
      notificar(mensagemErro(e), "error");
    }
  }

  async function relatorio() {
    try {
      const r = await api.gerarRelatorio({ turmaDisciplinaId: turmaId });
      setConsolidado(r.alunos);
      if (r.matriculasIrregulares > 0) {
        notificar(`${r.matriculasIrregulares} matrícula(s) irregular(es) foram omitidas.`, "info");
      }
      if (r.alunos.length && !r.alunosEmRisco.length && !r.alunosEmAlerta.length)
        notificar("Todos os alunos com frequência lançada estão regulares.", "info");
    } catch (e) {
      notificar(mensagemErro(e), "error");
    }
  }

  const colunasChamada = useMemo<GridColDef[]>(
    () => [
      { field: "matricula", headerName: "Matrícula", width: 120 },
      { field: "nome", headerName: "Aluno", flex: 1, minWidth: 200 },
      {
        field: "status",
        headerName: "Frequência",
        width: 180,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
            {podeEditar ? (
              <FormControlLabel
                sx={{ m: 0, gap: 1 }}
                control={
                  <Switch
                    size="small"
                    color="success"
                    checked={row.status === "PRESENTE"}
                    onChange={(e) => mudarStatus(row.id, e.target.checked ? "PRESENTE" : "AUSENTE")}
                    inputProps={{ "aria-label": `Frequência de ${row.nome}` }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    color={
                      row.status === "PRESENTE"
                        ? "success.main"
                        : row.status === "AUSENTE"
                          ? "error.main"
                          : "text.disabled"
                    }
                  >
                    {row.status ? rotuloStatus(row.status) : "Não lançada"}
                  </Typography>
                }
              />
            ) : row.status ? (
              <Chip size="small" variant="outlined" color={corStatus(row.status)} label={rotuloStatus(row.status)} />
            ) : (
              <Typography variant="body2" color="text.disabled">
                Não lançada
              </Typography>
            )}
          </Box>
        ),
      },
      { field: "percentualAtual", headerName: "% atual", width: 110, valueFormatter: (v) => formatarPercentual(v as number) },
    ],
    [mudarStatus, podeEditar],
  );

  const colunasRelatorio = useMemo(() => colunasConsolidado(true), []);
  const linhasRelatorio = useMemo(() => consolidado.map((x) => ({ ...x, id: x.alunoId })), [consolidado]);

  const acoesProfessor = podeEditar && chamada.length > 0;

  return (
    <Container sx={{ p: { xs: 2, md: 3 } }}>
      <Stack gap={2}>
        <Typography component="h1" variant="h5" fontWeight={700}>
          Frequência
        </Typography>

        <Card.Root elevation={0} variant="outlined">
          <Card.Content>
            <Grid container spacing={1.5} alignItems="flex-start">
              <Grid size={{ xs: 12, md: podeEditar ? 5 : 7 }}>
                <TextField
                  select
                  label="Turma e disciplina"
                  value={turmaId}
                  onChange={(e) => setTurmaId(e.target.value)}
                >
                  {turmas.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.sigla} — {t.disciplina.nome} — {t.periodoLetivo.codigo}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Data da aula"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {podeEditar && (
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <TextField select label="Local" value={localId} onChange={(e) => setLocalId(e.target.value)}>
                    {locais.map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.codigo}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  variant="contained"
                  onClick={carregar}
                  disabled={!turmaId}
                  isLoading={api.operacoes.chamada}
                  startIcon={<Search size={16} aria-hidden="true" />}
                  sx={{ height: 36, width: "100%", minWidth: 120 }}
                >
                  Carregar
                </Button>
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={aba}
            onChange={(_, v) => setAba(v)}
            textColor="primary"
            indicatorColor="primary"
            aria-label="Visões de frequência da turma"
          >
            <Tab label="Chamada" id="frequencia-tab-chamada" aria-controls="frequencia-painel-chamada" />
            <Tab label="Relatório" id="frequencia-tab-relatorio" aria-controls="frequencia-painel-relatorio" />
          </Tabs>
        </Box>

        {aba === 0 && (
          <Box role="tabpanel" id="frequencia-painel-chamada" aria-labelledby="frequencia-tab-chamada">
            <Stack gap={2}>
              {acoesProfessor && (
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={todosPresentes}
                    startIcon={<CheckCheck size={16} aria-hidden="true" />}
                    sx={{ height: 36, width: { xs: "100%", sm: "auto" }, minWidth: 200 }}
                  >
                    Marcar todos presentes
                  </Button>
                  <Button
                    variant="contained"
                    onClick={salvar}
                    disabled={!alterado || api.operacoes.salvamento}
                    isLoading={api.operacoes.salvamento}
                    startIcon={<Save size={16} aria-hidden="true" />}
                    sx={{ height: 36, width: { xs: "100%", sm: "auto" }, minWidth: 200 }}
                  >
                    Salvar chamada completa
                  </Button>
                </Stack>
              )}
              <Card.Root elevation={0} variant="outlined">
                <Card.Content sx={{ minHeight: 480 }}>
                  <DataTable
                    rows={chamada}
                    columns={colunasChamada}
                    loading={api.operacoes.chamada}
                    emptyTitle="Nenhuma chamada encontrada para a data selecionada"
                    emptyDescription="Selecione a turma e a data e clique em Carregar."
                  />
                </Card.Content>
              </Card.Root>
            </Stack>
          </Box>
        )}

        {aba === 1 && (
          <Box role="tabpanel" id="frequencia-painel-relatorio" aria-labelledby="frequencia-tab-relatorio">
            <Stack gap={2}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={relatorio}
                  disabled={!turmaId}
                  isLoading={api.operacoes.relatorio}
                  startIcon={<RefreshCw size={16} aria-hidden="true" />}
                  sx={{ height: 36, width: { xs: "100%", sm: "auto" }, minWidth: 180 }}
                >
                  Atualizar relatório
                </Button>
              </Stack>
              <Card.Root elevation={0} variant="outlined">
                <Card.Content sx={{ minHeight: 480 }}>
                  <DataTable
                    rows={linhasRelatorio}
                    columns={colunasRelatorio}
                    loading={api.operacoes.relatorio}
                    emptyTitle="Nenhum registro de frequência encontrado"
                    emptyDescription="Atualize o relatório para visualizar a frequência consolidada da turma."
                  />
                </Card.Content>
              </Card.Root>
            </Stack>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
