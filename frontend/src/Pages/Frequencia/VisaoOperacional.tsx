import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, MenuItem, Select, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { CheckCheck, RefreshCw, Save, Search } from "lucide-react";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import TextField from "../../components/TextField";
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
  type Aviso,
  corStatus,
  formatarPercentual,
  hojeSP,
  mensagemErro,
  perfilLocal,
  rotuloStatus,
} from "./frequencia-utils";

export default function VisaoOperacional() {
  const api = useFrequencia();
  const podeEditar = perfilLocal() === "professor";

  const [turmas, setTurmas] = useState<TurmaFrequencia[]>([]);
  const [locais, setLocais] = useState<LocalAula[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [localId, setLocalId] = useState("");
  const [data, setData] = useState(hojeSP());
  const [chamada, setChamada] = useState<AlunoChamada[]>([]);
  const [irregulares, setIrregulares] = useState(0);
  const [alterado, setAlterado] = useState(false);
  const [consolidado, setConsolidado] = useState<ConsolidadoFrequencia[]>([]);
  const [aba, setAba] = useState(0);
  const [aviso, setAviso] = useState<Aviso>();

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
        if (ativo) setAviso({ tipo: "error", texto: mensagemErro(e) });
      }
    })();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setIrregulares(r.matriculasIrregulares);
      setAlterado(false);
      setAviso(
        r.jaRegistrada && !r.chamadaCompleta
          ? { tipo: "warning", texto: "A chamada existente está incompleta; salve para regularizá-la." }
          : undefined,
      );
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  function mudarStatus(id: string, status: StatusFrequencia) {
    setChamada((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    setAlterado(true);
  }

  function todosPresentes() {
    if (!confirm("Marcar todos os alunos elegíveis como presentes?")) return;
    setChamada((xs) => xs.map((x) => ({ ...x, status: "PRESENTE" })));
    setAlterado(true);
  }

  async function salvar() {
    if (!chamada.length || chamada.some((a) => !a.status)) {
      setAviso({ tipo: "error", texto: "Marque presente ou ausente para todos os alunos." });
      return;
    }
    if (!localId && chamada.some((a) => !a.frequenciaId)) {
      setAviso({ tipo: "error", texto: "Selecione o local da aula." });
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
      setAviso({ tipo: "success", texto: "Chamada completa salva de forma atômica." });
      await carregar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
    }
  }

  async function relatorio() {
    try {
      const r = await api.gerarRelatorio({ turmaDisciplinaId: turmaId });
      setConsolidado(r.alunos);
      setIrregulares(r.matriculasIrregulares);
      if (r.alunos.length && !r.alunosEmRisco.length && !r.alunosEmAlerta.length)
        setAviso({ tipo: "info", texto: "Todos os alunos com frequência lançada estão regulares." });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensagemErro(e) });
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
        renderCell: ({ row }) =>
          podeEditar ? (
            <Select
              size="small"
              value={row.status || ""}
              displayEmpty
              onChange={(e) => mudarStatus(row.id, e.target.value as StatusFrequencia)}
              aria-label={`Frequência de ${row.nome}`}
              sx={{ height: 30, minWidth: 150 }}
            >
              <MenuItem value="" disabled>
                Selecione
              </MenuItem>
              <MenuItem value="PRESENTE">Presente</MenuItem>
              <MenuItem value="AUSENTE">Ausente</MenuItem>
            </Select>
          ) : row.status ? (
            <Chip size="small" variant="outlined" color={corStatus(row.status)} label={rotuloStatus(row.status)} />
          ) : (
            <Typography variant="body2" color="text.disabled">
              Não lançada
            </Typography>
          ),
      },
      { field: "percentualAtual", headerName: "% atual", width: 110, valueFormatter: (v) => formatarPercentual(v as number) },
    ],
    [podeEditar],
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

        {aviso && (
          <Alert severity={aviso.tipo} onClose={() => setAviso(undefined)}>
            {aviso.texto}
          </Alert>
        )}

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

        {irregulares > 0 && <Alert severity="info">{irregulares} matrícula(s) irregular(es) foram omitidas.</Alert>}

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
              {alterado && <Alert severity="warning">Existem alterações não salvas. Salve a chamada completa para registrá-las.</Alert>}
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
