import { useEffect, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Alert, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, Tab, Tabs, Typography } from "@mui/material";

import Container from "../../components/Container";
import DataTable from "../../components/DataTable/DataTable";
import SearchTextField from "../../components/SearchTextField/SearchTextField";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import { useFrequencia } from "../../hooks/use-frequencia";
import type { AlunoChamada, ConsolidadoFrequencia, HistoricoFrequenciaAluno, StatusFrequencia, TurmaFrequencia } from "../../models/frequencia-model";

const hoje = new Date().toISOString().slice(0, 10);

const turmaMock: TurmaFrequencia = {
  id: "mock-turma-frequencia",
  semestre: "2026/1",
  disciplina: {
    id: "mock-disciplina-frequencia",
    codigo: "PI5-FREQ",
    nome: "Projeto Integrador V",
  },
  curso: {
    id: "mock-curso-ads",
    nome: "Análise e Desenvolvimento de Sistemas",
  },
};

const alunosMock: AlunoChamada[] = [
  {
    id: "mock-aluno-ana",
    matricula: 1001,
    nome: "Ana Paula Frequência",
    statusMatricula: "ATIVO",
    percentualAtual: 100,
    status: "PRESENTE",
  },
  {
    id: "mock-aluno-bruno",
    matricula: 1002,
    nome: "Bruno Lima Frequência",
    statusMatricula: "ATIVO",
    percentualAtual: 80,
    status: "AUSENTE",
  },
  {
    id: "mock-aluno-carla",
    matricula: 1003,
    nome: "Carla Souza Frequência",
    statusMatricula: "ATIVO",
    percentualAtual: 74,
    status: "AUSENTE",
  },
];

const relatorioMock: ConsolidadoFrequencia[] = [
  {
    alunoId: "mock-aluno-ana",
    alunoNome: "Ana Paula Frequência",
    turmaId: turmaMock.id,
    disciplinaId: turmaMock.disciplina.id,
    disciplinaNome: turmaMock.disciplina.nome,
    totalAulas: 5,
    presencas: 5,
    faltas: 0,
    percentual: 100,
    situacao: "REGULAR",
  },
  {
    alunoId: "mock-aluno-bruno",
    alunoNome: "Bruno Lima Frequência",
    turmaId: turmaMock.id,
    disciplinaId: turmaMock.disciplina.id,
    disciplinaNome: turmaMock.disciplina.nome,
    totalAulas: 5,
    presencas: 4,
    faltas: 1,
    percentual: 80,
    situacao: "ALERTA",
  },
  {
    alunoId: "mock-aluno-carla",
    alunoNome: "Carla Souza Frequência",
    turmaId: turmaMock.id,
    disciplinaId: turmaMock.disciplina.id,
    disciplinaNome: turmaMock.disciplina.nome,
    totalAulas: 5,
    presencas: 3,
    faltas: 2,
    percentual: 60,
    situacao: "RISCO_REPROVACAO",
  },
];

function rotuloSituacao(situacao: string) {
  if (situacao === "RISCO_REPROVACAO") return "Risco de reprovação";
  if (situacao === "ALERTA") return "Alerta 80%";
  return "Regular";
}

function corSituacao(situacao: string): "success" | "warning" | "error" {
  if (situacao === "RISCO_REPROVACAO") return "error";
  if (situacao === "ALERTA") return "warning";
  return "success";
}

export default function Frequencia() {
  const [aba, setAba] = useState(0);
  const [turmas, setTurmas] = useState<TurmaFrequencia[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [dataAula, setDataAula] = useState(hoje);
  const [alunos, setAlunos] = useState<AlunoChamada[]>([]);
  const [alunoConsultaId, setAlunoConsultaId] = useState("");
  const [historicoAluno, setHistoricoAluno] = useState<HistoricoFrequenciaAluno[]>([]);
  const [consolidadoAluno, setConsolidadoAluno] = useState<any[]>([]);
  const [relatorio, setRelatorio] = useState<ConsolidadoFrequencia[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [alerta, setAlerta] = useState<{ tipo: "success" | "error" | "info"; mensagem: string } | null>(null);
  const [justificativaAberta, setJustificativaAberta] = useState<{ frequenciaId: string; texto: string } | null>(null);
  const frequencia = useFrequencia();

  useEffect(() => {
    frequencia.listarOpcoes().then((response) => {
      setTurmas(response.turmas);
      if (response.turmas?.[0]) setTurmaId(response.turmas[0].id);
    }).catch(() => {
      setTurmas([turmaMock]);
      setTurmaId(turmaMock.id);
      setAlunos(alunosMock);
      setRelatorio(relatorioMock);
      setAlerta({ tipo: "info", mensagem: "Backend indisponível. Usando turma mock para teste visual." });
    });
  }, []);

  useEffect(() => {
    if (turmaId && dataAula) carregarChamada();
  }, [turmaId, dataAula]);

  async function carregarChamada() {
    try {
      const response = await frequencia.obterChamada({ turmaId, data: dataAula });
      setAlunos(response.alunos);
      setAlerta(response.jaRegistrada ? { tipo: "info", mensagem: "Esta aula já possui lançamento. As alterações serão salvas como edição." } : null);
    } catch (error: any) {
      setAlunos(alunosMock);
      setRelatorio(relatorioMock);
      setAlerta({ tipo: "info", mensagem: "Não foi possível carregar a chamada real. Exibindo chamada mock para teste visual." });
    }
  }

  function atualizarStatus(alunoId: string, status: StatusFrequencia) {
    setAlunos((prev) => prev.map((aluno) => aluno.id === alunoId ? { ...aluno, status } : aluno));
  }

  async function salvarFrequencia() {
    try {
      const existentes = alunos.filter((aluno) => aluno.frequenciaId);
      if (existentes.length > 0) {
        await Promise.all(existentes.map((aluno) => frequencia.editarFrequencia(aluno.frequenciaId!, aluno.status)));
      } else {
        await frequencia.registrarFrequencia({ turmaId, data: dataAula, registros: alunos.map((aluno) => ({ alunoId: aluno.id, status: aluno.status })) });
      }
      setAlerta({ tipo: "success", mensagem: "Frequência salva com sucesso!" });
      await carregarChamada();
      await gerarRelatorio();
    } catch (error: any) {
      setAlerta({ tipo: "error", mensagem: error?.response?.data?.error || "Não foi possível salvar a frequência." });
    }
  }

  async function consultarAluno() {
    try {
      const response = await frequencia.consultarAluno(alunoConsultaId);
      setConsolidadoAluno(response.consolidado);
      setHistoricoAluno(response.historico);
    } catch (error: any) {
      setAlerta({ tipo: "error", mensagem: error?.response?.data?.error || "Não foi possível consultar o aluno." });
    }
  }

  async function gerarRelatorio() {
    if (!turmaId) return;
    try {
      const response = await frequencia.gerarRelatorio({ turmaId, dataInicio, dataFim });
      setRelatorio(response.alunos);
    } catch (error: any) {
      setRelatorio(relatorioMock);
      setAlerta({ tipo: "info", mensagem: "Não foi possível gerar o relatório real. Exibindo relatório mock." });
    }
  }

  async function salvarJustificativa() {
    if (!justificativaAberta) return;
    try {
      await frequencia.registrarJustificativa(justificativaAberta.frequenciaId, justificativaAberta.texto);
      setJustificativaAberta(null);
      setAlerta({ tipo: "success", mensagem: "Justificativa registrada com sucesso!" });
      await carregarChamada();
    } catch (error: any) {
      setAlerta({ tipo: "error", mensagem: error?.response?.data?.error || "Não foi possível registrar a justificativa." });
    }
  }

  const colunasChamada: GridColDef[] = [
    { field: "matricula", headerName: "Matrícula", width: 110 },
    { field: "nome", headerName: "Aluno", flex: 1, minWidth: 220 },
    { field: "status", headerName: "Presença", width: 150, renderCell: (params) => (
      <TextField select value={params.row.status} onChange={(event) => atualizarStatus(params.row.id, event.target.value as StatusFrequencia)}>
        <MenuItem value="PRESENTE">Presente</MenuItem>
        <MenuItem value="AUSENTE">Ausente</MenuItem>
      </TextField>
    ) },
    { field: "percentualAtual", headerName: "Freq. atual", width: 120, renderCell: (params) => `${Number(params.row.percentualAtual || 100).toFixed(2)}%` },
    { field: "justificativa", headerName: "Justificativa", width: 150, renderCell: (params) => (
      <Button variant="outlined" disabled={!params.row.frequenciaId || params.row.status !== "AUSENTE"} onClick={() => setJustificativaAberta({ frequenciaId: params.row.frequenciaId, texto: params.row.justificativa || "" })} sx={{ width: 110 }}>Justificar</Button>
    ) },
  ];

  const colunasRelatorio: GridColDef[] = [
    { field: "alunoNome", headerName: "Aluno", flex: 1, minWidth: 220 },
    { field: "disciplinaNome", headerName: "Disciplina", flex: 1, minWidth: 180 },
    { field: "totalAulas", headerName: "Aulas", width: 90 },
    { field: "presencas", headerName: "Presenças", width: 110 },
    { field: "faltas", headerName: "Faltas", width: 90 },
    { field: "percentual", headerName: "Frequência", width: 120, renderCell: (params) => `${params.row.percentual}%` },
    { field: "situacao", headerName: "Situação", width: 180, renderCell: (params) => <Chip size="small" color={corSituacao(params.row.situacao)} label={rotuloSituacao(params.row.situacao)} /> },
  ];

  const alunosEmRisco = relatorio.filter((item) => item.situacao === "RISCO_REPROVACAO").length;
  const alunosEmAlerta = relatorio.filter((item) => item.situacao === "ALERTA").length;

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <SearchTextField>Frequência</SearchTextField>
        {alerta && <Alert severity={alerta.tipo}>{alerta.mensagem}</Alert>}

        <Card.Root>
          <Card.Content>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextField select label="Turma / Disciplina" value={turmaId} onChange={(event) => setTurmaId(event.target.value)}>
                  {turmas.map((turma) => <MenuItem key={turma.id} value={turma.id}>{turma.disciplina.nome} - {turma.semestre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Data da aula" type="date" value={dataAula} onChange={(event) => setDataAula(event.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button variant="contained" sx={{ width: "100%", height: 36 }} onClick={carregarChamada} isLoading={frequencia.carregando}>Carregar</Button>
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Stack direction={{ xs: "column", md: "row" }} gap={2}>
          <Alert severity="info" sx={{ flex: 1 }}>Alerta em 80%: {alunosEmAlerta} aluno(s)</Alert>
          <Alert severity="warning" sx={{ flex: 1 }}>Risco abaixo de 75%: {alunosEmRisco} aluno(s)</Alert>
        </Stack>

        <Tabs value={aba} onChange={(_, value) => setAba(value)}>
          <Tab label="Registro" />
          <Tab label="Aluno" />
          <Tab label="Relatório" />
        </Tabs>

        {aba === 0 && (
          <Stack gap={2}>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="flex-end">
              <Button variant="outlined" sx={{ width: 170 }} onClick={() => setAlunos((prev) => prev.map((aluno) => ({ ...aluno, status: "PRESENTE" })))}>Marcar todos</Button>
              <Button variant="contained" sx={{ width: 160 }} onClick={salvarFrequencia} isLoading={frequencia.carregando}>Salvar</Button>
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
                    <TextField label="ID do aluno" value={alunoConsultaId} onChange={(event) => setAlunoConsultaId(event.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Button variant="contained" sx={{ width: "100%", height: 36 }} onClick={consultarAluno}>Consultar aluno</Button>
                  </Grid>
                </Grid>
              </Card.Content>
            </Card.Root>
            <Typography fontWeight={700}>Consolidado do aluno</Typography>
            <DataTable rows={consolidadoAluno.map((item) => ({ ...item, id: item.turmaId, alunoNome: "Aluno selecionado" }))} columns={colunasRelatorio} />
            <Typography fontWeight={700}>Histórico aula a aula</Typography>
            <DataTable rows={historicoAluno} columns={[{ field: "data", headerName: "Data", width: 130 }, { field: "disciplinaNome", headerName: "Disciplina", flex: 1 }, { field: "status", headerName: "Status", width: 120 }, { field: "justificativa", headerName: "Justificativa", flex: 1 }]} />
          </Stack>
        )}

        {aba === 2 && (
          <Stack gap={2}>
            <Card.Root>
              <Card.Content>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}><TextField label="Data início" type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid size={{ xs: 12, md: 4 }}><TextField label="Data fim" type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid size={{ xs: 12, md: 4 }}><Button variant="contained" sx={{ width: "100%", height: 36 }} onClick={gerarRelatorio}>Gerar relatório</Button></Grid>
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
          <TextField multiline minRows={4} label="Justificativa" value={justificativaAberta?.texto || ""} onChange={(event) => setJustificativaAberta((prev) => prev ? { ...prev, texto: event.target.value } : prev)} />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" sx={{ width: 100 }} onClick={() => setJustificativaAberta(null)}>Cancelar</Button>
          <Button variant="contained" sx={{ width: 100 }} onClick={salvarJustificativa}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
