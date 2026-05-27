import { useEffect, useRef, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import {
  Alert,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import { useFrequencia } from "../../hooks/use-frequencia";
import type {
  AlunoChamada,
  ConsolidadoFrequencia,
  HistoricoFrequenciaAluno,
  StatusFrequencia,
  TurmaFrequencia,
} from "../../models/frequencia-model";

const hoje = new Date().toISOString().slice(0, 10);

function rotuloSituacao(situacao: string) {
  if (situacao === "RISCO_REPROVACAO") return "Risco de reprovacao";
  if (situacao === "ALERTA") return "Alerta 80%";
  return "Regular";
}

function corSituacao(situacao: string): "success" | "warning" | "error" {
  if (situacao === "RISCO_REPROVACAO") return "error";
  if (situacao === "ALERTA") return "warning";
  return "success";
}

function getMensagemErro(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { error?: string; mensagem?: string } } };
  return apiError.response?.data?.error || apiError.response?.data?.mensagem || fallback;
}

export default function Frequencia() {
  const [aba, setAba] = useState(0);
  const [turmas, setTurmas] = useState<TurmaFrequencia[]>([]);
  const [turmaDisciplinaId, setTurmaDisciplinaId] = useState("");
  const [dataAula, setDataAula] = useState(hoje);
  const [alunos, setAlunos] = useState<AlunoChamada[]>([]);
  const [alunoConsultaId, setAlunoConsultaId] = useState("");
  const [historicoAluno, setHistoricoAluno] = useState<HistoricoFrequenciaAluno[]>([]);
  const [consolidadoAluno, setConsolidadoAluno] = useState<ConsolidadoFrequencia[]>([]);
  const [relatorio, setRelatorio] = useState<ConsolidadoFrequencia[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error" | "info"; mensagem: string } | null>(null);
  const [justificativaAberta, setJustificativaAberta] = useState<{ frequenciaId: string; texto: string } | null>(null);
  const justificativaInputRef = useRef<HTMLTextAreaElement | null>(null);
  const frequencia = useFrequencia();

  useEffect(() => {
    void carregarOpcoes();
  }, []);

  useEffect(() => {
    if (turmaDisciplinaId && dataAula) void carregarChamada();
  }, [turmaDisciplinaId, dataAula]);

  async function carregarOpcoes() {
    try {
      const response = await frequencia.listarOpcoes();
      const turmasResponse = response.turmas || [];
      setTurmas(turmasResponse);
      if (turmasResponse[0]) setTurmaDisciplinaId(turmasResponse[0].id);
      if (!turmasResponse.length) {
        setAlerta({ tipo: "info", mensagem: "Nenhuma turma/disciplina disponivel para chamada." });
      }
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: getMensagemErro(error, "Nao foi possivel carregar as opcoes de frequencia.") });
    }
  }

  async function carregarChamada() {
    try {
      const response = await frequencia.obterChamada({ turmaDisciplinaId, data: dataAula });
      const alunosChamada = response.alunos || [];
      setAlunos(alunosChamada);
      setAlunoConsultaId((atual) => atual || alunosChamada[0]?.id || "");
      setAlerta(
        response.jaRegistrada
          ? { tipo: "info", mensagem: "Esta aula ja possui lancamento. As alteracoes serao salvas como edicao." }
          : null,
      );
    } catch (error) {
      setAlunos([]);
      setRelatorio([]);
      setAlerta({ tipo: "error", mensagem: getMensagemErro(error, "Nao foi possivel carregar a chamada.") });
    }
  }

  function atualizarStatus(alunoId: string, status: StatusFrequencia) {
    setAlunos((prev) => prev.map((aluno) => (aluno.id === alunoId ? { ...aluno, status } : aluno)));
  }

  async function salvarFrequencia() {
    try {
      const existentes = alunos.filter((aluno) => aluno.frequenciaId);
      if (existentes.length > 0) {
        await Promise.all(existentes.map((aluno) => frequencia.editarFrequencia(aluno.frequenciaId!, aluno.status)));
      } else {
        await frequencia.registrarFrequencia({
          turmaDisciplinaId,
          data: dataAula,
          registros: alunos.map((aluno) => ({ alunoId: aluno.id, status: aluno.status })),
        });
      }
      setAlerta({ tipo: "success", mensagem: "Frequencia salva com sucesso!" });
      await carregarChamada();
      await gerarRelatorio();
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: getMensagemErro(error, "Nao foi possivel salvar a frequencia.") });
    }
  }

  async function consultarAluno() {
    if (!alunoConsultaId) {
      setAlerta({ tipo: "error", mensagem: "Selecione um aluno para consultar." });
      return;
    }

    try {
      const response = await frequencia.consultarAluno(alunoConsultaId);
      const consolidado = response.consolidado || [];
      const historico = response.historico || [];
      setConsolidadoAluno(consolidado);
      setHistoricoAluno(historico);
      setAlerta(
        consolidado.length || historico.length
          ? { tipo: "success", mensagem: "Consulta do aluno carregada com sucesso." }
          : { tipo: "info", mensagem: "Este aluno ainda nao possui lancamentos de frequencia." },
      );
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: getMensagemErro(error, "Nao foi possivel consultar o aluno.") });
    }
  }

  async function gerarRelatorio() {
    if (!turmaDisciplinaId) return;
    try {
      const response = await frequencia.gerarRelatorio({ turmaDisciplinaId, dataInicio, dataFim });
      setRelatorio(response.alunos || []);
    } catch (error) {
      setRelatorio([]);
      setAlerta({ tipo: "error", mensagem: getMensagemErro(error, "Nao foi possivel gerar o relatorio.") });
    }
  }

  async function salvarJustificativa() {
    if (!justificativaAberta) return;
    try {
      const justificativa = justificativaInputRef.current?.value || "";
      await frequencia.registrarJustificativa(justificativaAberta.frequenciaId, justificativa);
      setJustificativaAberta(null);
      setAlerta({ tipo: "success", mensagem: "Justificativa registrada com sucesso!" });
      await carregarChamada();
    } catch (error) {
      setAlerta({ tipo: "error", mensagem: getMensagemErro(error, "Nao foi possivel registrar a justificativa.") });
    }
  }

  const colunasChamada: GridColDef[] = [
    { field: "matricula", headerName: "Matricula", width: 110 },
    { field: "nome", headerName: "Aluno", flex: 1, minWidth: 220 },
    {
      field: "status",
      headerName: "Presenca",
      width: 150,
      renderCell: (params) => (
        <TextField select value={params.row.status} onChange={(event) => atualizarStatus(params.row.id, event.target.value as StatusFrequencia)}>
          <MenuItem value="PRESENTE">Presente</MenuItem>
          <MenuItem value="AUSENTE">Ausente</MenuItem>
        </TextField>
      ),
    },
    {
      field: "percentualAtual",
      headerName: "Freq. atual",
      width: 120,
      renderCell: (params) => `${Number(params.row.percentualAtual || 100).toFixed(2)}%`,
    },
    {
      field: "justificativa",
      headerName: "Justificativa",
      width: 150,
      renderCell: (params) => (
        <Button
          variant="outlined"
          disabled={!params.row.frequenciaId || params.row.status !== "AUSENTE"}
          onClick={() => setJustificativaAberta({ frequenciaId: params.row.frequenciaId, texto: params.row.justificativa || "" })}
          sx={{ width: 110 }}
        >
          Justificar
        </Button>
      ),
    },
  ];

  const colunasRelatorio: GridColDef[] = [
    { field: "alunoNome", headerName: "Aluno", flex: 1, minWidth: 220 },
    { field: "disciplinaNome", headerName: "Disciplina", flex: 1, minWidth: 180 },
    { field: "totalAulas", headerName: "Aulas", width: 90 },
    { field: "presencas", headerName: "Presencas", width: 110 },
    { field: "faltas", headerName: "Faltas", width: 90 },
    { field: "percentual", headerName: "Frequencia", width: 120, renderCell: (params) => `${params.row.percentual}%` },
    { field: "situacao", headerName: "Situacao", width: 180, renderCell: (params) => <Chip size="small" color={corSituacao(params.row.situacao)} label={rotuloSituacao(params.row.situacao)} /> },
  ];

  const alunosEmRisco = relatorio.filter((item) => item.situacao === "RISCO_REPROVACAO").length;
  const alunosEmAlerta = relatorio.filter((item) => item.situacao === "ALERTA").length;

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <SearchTextField showFilters={false}>Frequencia</SearchTextField>
        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        <Card.Root>
          <Card.Content>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField select label="Turma / Disciplina" value={turmaDisciplinaId} onChange={(event) => setTurmaDisciplinaId(event.target.value)}>
                  {turmas.map((turma) => (
                    <MenuItem key={turma.id} value={turma.id}>
                      {turma.sigla} - {turma.disciplina.nome} - {turma.semestre}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Data da aula" type="date" value={dataAula} onChange={(event) => setDataAula(event.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button variant="contained" sx={{ width: "100%", height: 36 }} onClick={carregarChamada} isLoading={frequencia.carregando}>
                  Carregar
                </Button>
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Stack direction={{ xs: "column", md: "row" }} gap={2}>
          <Alert severity="info" sx={{ flex: 1 }}>
            Alerta em 80%: {alunosEmAlerta} aluno(s)
          </Alert>
          <Alert severity="warning" sx={{ flex: 1 }}>
            Risco abaixo de 75%: {alunosEmRisco} aluno(s)
          </Alert>
        </Stack>

        <Tabs value={aba} onChange={(_, value) => setAba(value)}>
          <Tab label="Registro" />
          <Tab label="Aluno" />
          <Tab label="Relatorio" />
        </Tabs>

        {aba === 0 && (
          <Stack gap={2}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="flex-end">
              <Button variant="outlined" sx={{ width: 170 }} onClick={() => setAlunos((prev) => prev.map((aluno) => ({ ...aluno, status: "PRESENTE" })))}>
                Marcar todos
              </Button>
              <Button variant="contained" sx={{ width: 160 }} onClick={salvarFrequencia} isLoading={frequencia.carregando} disabled={!alunos.length}>
                Salvar
              </Button>
            </Stack>
            <DataTable rows={alunos} columns={colunasChamada} loading={frequencia.carregando} />
          </Stack>
        )}

        {aba === 1 && (
          <Stack gap={2}>
            <Card.Root>
              <Card.Content>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      select
                      label="Aluno"
                      value={alunoConsultaId}
                      onChange={(event) => {
                        setAlunoConsultaId(event.target.value);
                        setConsolidadoAluno([]);
                        setHistoricoAluno([]);
                      }}
                    >
                      {alunos.map((aluno) => (
                        <MenuItem key={aluno.id} value={aluno.id}>
                          {aluno.nome} - Matricula {aluno.matricula}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Button variant="contained" sx={{ width: "100%", height: 36 }} onClick={consultarAluno}>
                      Consultar aluno
                    </Button>
                  </Grid>
                </Grid>
              </Card.Content>
            </Card.Root>
            <Typography fontWeight={700}>Consolidado do aluno</Typography>
            <DataTable rows={consolidadoAluno.map((item) => ({ ...item, id: item.turmaDisciplinaId, alunoNome: "Aluno selecionado" }))} columns={colunasRelatorio} />
            <Typography fontWeight={700}>Historico aula a aula</Typography>
            <DataTable rows={historicoAluno} columns={[{ field: "data", headerName: "Data", width: 130 }, { field: "disciplinaNome", headerName: "Disciplina", flex: 1 }, { field: "status", headerName: "Status", width: 120 }, { field: "justificativa", headerName: "Justificativa", flex: 1 }]} />
          </Stack>
        )}

        {aba === 2 && (
          <Stack gap={2}>
            <Card.Root>
              <Card.Content>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField label="Data inicio" type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField label="Data fim" type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Button variant="contained" sx={{ width: "100%", height: 36 }} onClick={gerarRelatorio}>
                      Gerar relatorio
                    </Button>
                  </Grid>
                </Grid>
              </Card.Content>
            </Card.Root>
            <DataTable rows={relatorio.map((item) => ({ ...item, id: item.alunoId }))} columns={colunasRelatorio} loading={frequencia.carregando} />
          </Stack>
        )}
      </Stack>

      <Dialog open={Boolean(justificativaAberta)} onClose={() => setJustificativaAberta(null)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar justificativa de falta</DialogTitle>
        <DialogContent>
          <textarea
            key={justificativaAberta?.frequenciaId}
            ref={justificativaInputRef}
            autoFocus
            aria-label="Justificativa"
            placeholder="Justificativa"
            defaultValue={justificativaAberta?.texto || ""}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              minHeight: 110,
              padding: "12px 14px",
              border: "1px solid #c4c4c4",
              borderRadius: 4,
              font: "inherit",
              resize: "vertical",
              outlineColor: "#00a9ce",
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" sx={{ width: 100 }} onClick={() => setJustificativaAberta(null)}>
            Cancelar
          </Button>
          <Button variant="contained" sx={{ width: 100 }} onClick={salvarJustificativa}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
