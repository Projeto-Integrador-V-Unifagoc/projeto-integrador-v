import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { GraduationCap, RefreshCw, Search, User } from "lucide-react";

import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import matriculaApi, { baseURL } from "../../services/matricula-api";

// ── Tipos que espelham as interfaces do backend ────────────────────────────────

type AlunoInfo = {
  id: string;
  matricula: string;
  periodo: string;
  curso_id: string;
  curso_nome: string;
  nome: string;
  cpf: string;
  email: string;
};

type TurmaDisponivel = {
  id: string;
  semestre: string;
  capacidade_alunos: number;
  vagas_disponiveis: number;
  disciplina_nome: string;
  disciplina_codigo: string;
  carga_horaria: number;
  pre_requisito: string | null;
  professor_nome: string;
  curso_nome: string;
};

type MatriculaDetalhada = {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_matricula: string;
  aluno_cpf: string;
  aluno_email: string;
  aluno_periodo: string;
  turma_id: string;
  semestre: string;
  disciplina_nome: string;
  disciplina_codigo: string;
  carga_horaria: number;
  professor_nome: string | null;
  curso_nome: string;
  status: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cor: string }> = {
  MATRICULADO: { label: "Matriculado", cor: "#1976d2" },
  CURSANDO:    { label: "Cursando",    cor: "#2e7d32" },
  TRANCADO:    { label: "Trancado",    cor: "#ed6c02" },
  CANCELADO:   { label: "Cancelado",   cor: "#d32f2f" },
  CONCLUIDO:   { label: "Concluído",   cor: "#00695c" },
};

function StatusChip({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? { label: status ?? "—", cor: "#757575" };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ backgroundColor: cfg.cor, color: "#fff", fontWeight: 600 }}
    />
  );
}

function getMensagemErro(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.includes("Sem conexao")) return err.message;
  const axiosErr = err as { response?: { data?: { message?: string } } };
  if (axiosErr?.response?.data?.message) return axiosErr.response.data.message;
  return fallback;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function Matricula() {
  const [aba, setAba] = useState(0);

  // Busca de aluno
  const [query, setQuery] = useState("");
  const [buscandoAluno, setBuscandoAluno] = useState(false);
  const [alunoEncontrado, setAlunoEncontrado] = useState<AlunoInfo | null>(null);
  const [erroAluno, setErroAluno] = useState("");

  // Turmas
  const [turmas, setTurmas] = useState<TurmaDisponivel[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);
  const [turmaId, setTurmaId] = useState("");

  // Envio
  const [isLoadingSalvar, setIsLoadingSalvar] = useState(false);
  const [ultimaMatricula, setUltimaMatricula] = useState<MatriculaDetalhada | null>(null);

  // Lista / API
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [listaMatriculas, setListaMatriculas] = useState<MatriculaDetalhada[]>([]);
  const [filtroAluno, setFiltroAluno] = useState("");

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    aberto: boolean;
    mensagem: string;
    severidade: "success" | "error" | "info" | "warning";
  }>({ aberto: false, mensagem: "", severidade: "info" });

  const abrirSnackbar = (
    mensagem: string,
    severidade: "success" | "error" | "info" | "warning"
  ) => setSnackbar({ aberto: true, mensagem, severidade });

  // ── Carregar lista de matrículas ──────────────────────────────────

  const carregarListaMatriculas = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const { data } = await matriculaApi.get<MatriculaDetalhada[]>("/matriculas/detalhadas");
      setListaMatriculas(Array.isArray(data) ? data : []);
      setApiOnline(true);
    } catch {
      setListaMatriculas([]);
      setApiOnline(false);
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  useEffect(() => {
    void carregarListaMatriculas();
  }, [carregarListaMatriculas]);

  // ── Busca de aluno por CPF ou nº de matrícula ─────────────────────

  async function buscarAluno() {
    if (query.trim().length < 3) return;
    setBuscandoAluno(true);
    setErroAluno("");
    setAlunoEncontrado(null);
    setTurmas([]);
    setTurmaId("");
    setUltimaMatricula(null);
    try {
      const { data } = await matriculaApi.get<AlunoInfo[]>(
        `/alunos/buscar?q=${encodeURIComponent(query.trim())}`
      );
      if (!data || data.length === 0) {
        setErroAluno("Nenhum aluno encontrado com este CPF ou número de matrícula.");
        return;
      }
      const aluno = data[0];
      setAlunoEncontrado(aluno);
      setApiOnline(true);
      await carregarTurmas(aluno.curso_id);
    } catch (err: unknown) {
      setErroAluno(getMensagemErro(err, "Erro ao buscar aluno. Verifique o backend."));
      setApiOnline(false);
    } finally {
      setBuscandoAluno(false);
    }
  }

  // ── Turmas disponíveis para o curso ──────────────────────────────

  async function carregarTurmas(cursoId: string) {
    setCarregandoTurmas(true);
    try {
      const { data } = await matriculaApi.get<TurmaDisponivel[]>(
        `/turmas/disponiveis/${cursoId}`
      );
      setTurmas(Array.isArray(data) ? data : []);
    } catch {
      setTurmas([]);
    } finally {
      setCarregandoTurmas(false);
    }
  }

  function limparFormulario() {
    setQuery("");
    setAlunoEncontrado(null);
    setTurmas([]);
    setTurmaId("");
    setErroAluno("");
    setUltimaMatricula(null);
  }

  // ── Confirmar matrícula ───────────────────────────────────────────

  async function confirmarMatricula() {
    if (!alunoEncontrado || !turmaId) return;
    setIsLoadingSalvar(true);
    try {
      const { data } = await matriculaApi.post<MatriculaDetalhada>("/matriculas", {
        alunoId: alunoEncontrado.id,
        turmaId,
      });
      setUltimaMatricula(data);
      abrirSnackbar("Matrícula realizada com sucesso!", "success");
      await carregarListaMatriculas();
      setAba(1);
    } catch (err: unknown) {
      abrirSnackbar(getMensagemErro(err, "Erro ao realizar matrícula."), "error");
    } finally {
      setIsLoadingSalvar(false);
    }
  }

  // ── Lista filtrada ────────────────────────────────────────────────

  const listaFiltrada = filtroAluno.trim()
    ? listaMatriculas.filter(
        (m) =>
          m.aluno_nome?.toLowerCase().includes(filtroAluno.toLowerCase()) ||
          m.aluno_matricula?.includes(filtroAluno) ||
          m.aluno_cpf?.includes(filtroAluno)
      )
    : listaMatriculas;

  // ── Renderização ──────────────────────────────────────────────────

  const snackbarNode = (
    <Snackbar
      open={snackbar.aberto}
      autoHideDuration={7000}
      onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={snackbar.severidade}
        onClose={() => setSnackbar((s) => ({ ...s, aberto: false }))}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {snackbar.mensagem}
      </Alert>
    </Snackbar>
  );

  const painelNovaMatricula = (
    <Stack spacing={2.5} alignItems="center" width="100%">
      {apiOnline === false && (
        <Alert severity="warning" sx={{ width: "100%", maxWidth: 720 }}>
          Sem conexão com a API em <strong>{baseURL}</strong>. Suba o backend e
          confirme o PostgreSQL.
        </Alert>
      )}

      {/* Busca de aluno */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          width: "100%",
          maxWidth: 720,
          borderRadius: 2,
          border: `1px solid ${theme.palette.grey[100]}`,
          p: 3,
          backgroundColor: theme.palette.background.default,
        })}
      >
        <Stack spacing={2}>
          <Stack spacing={1} alignItems="center" textAlign="center">
            <Box
              sx={(theme) => ({
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: theme.palette.primary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <GraduationCap color="#fff" size={22} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              Nova matrícula
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Busque o aluno pelo CPF ou número de matrícula para iniciar.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <TextField
              label="CPF ou Nº de Matrícula *"
              placeholder="Ex.: 123.456.789-00 ou 2024001"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void buscarAluno();
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              sx={{ width: "auto", minWidth: 110, height: 56 }}
              onClick={() => void buscarAluno()}
              disabled={query.trim().length < 3}
              isLoading={buscandoAluno}
            >
              <Search size={16} style={{ marginRight: 6 }} />
              Buscar
            </Button>
          </Stack>

          {erroAluno && <Alert severity="error">{erroAluno}</Alert>}
        </Stack>
      </Paper>

      {/* Dados do aluno encontrado */}
      {alunoEncontrado && (
        <Paper
          elevation={0}
          sx={(theme) => ({
            width: "100%",
            maxWidth: 720,
            borderRadius: 2,
            border: `1px solid ${theme.palette.primary.light}`,
            p: 3,
            backgroundColor: theme.palette.background.default,
          })}
        >
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <User size={18} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Aluno identificado
                </Typography>
              </Stack>
              <Button
                variant="text"
                sx={{ width: "auto" }}
                onClick={limparFormulario}
              >
                Limpar
              </Button>
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Nome
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {alunoEncontrado.nome}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  CPF
                </Typography>
                <Typography variant="body2">{alunoEncontrado.cpf}</Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  E-mail
                </Typography>
                <Typography variant="body2">{alunoEncontrado.email}</Typography>
              </Box>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Nº de Matrícula
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {alunoEncontrado.matricula}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Curso
                </Typography>
                <Typography variant="body2">
                  {alunoEncontrado.curso_nome}
                </Typography>
              </Box>
              <Box flex={1}>
                <Typography variant="caption" color="text.secondary">
                  Período
                </Typography>
                <Typography variant="body2">
                  {alunoEncontrado.periodo}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Seleção de turma */}
      {alunoEncontrado && (
        <Paper
          elevation={0}
          sx={(theme) => ({
            width: "100%",
            maxWidth: 720,
            borderRadius: 2,
            border: `1px solid ${theme.palette.grey[100]}`,
            p: 3,
            backgroundColor: theme.palette.background.default,
          })}
        >
          <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
            Turmas disponíveis — {alunoEncontrado.curso_nome}
          </Typography>

          {carregandoTurmas && <LinearProgress sx={{ mb: 1 }} />}

          {!carregandoTurmas && turmas.length === 0 && (
            <Alert severity="warning">
              Não há turmas com vagas disponíveis para o curso deste aluno.
            </Alert>
          )}

          {turmas.length > 0 && (
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 1, fontSize: 14 }}>
                Selecione a disciplina / turma:
              </FormLabel>
              <RadioGroup
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
              >
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 580 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell>Disciplina</TableCell>
                        <TableCell>Código</TableCell>
                        <TableCell>Semestre</TableCell>
                        <TableCell>Professor</TableCell>
                        <TableCell>Vagas</TableCell>
                        <TableCell>C.H.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {turmas.map((turma) => (
                        <TableRow
                          key={turma.id}
                          hover
                          selected={turmaId === turma.id}
                          onClick={() => setTurmaId(turma.id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell padding="checkbox">
                            <Radio value={turma.id} size="small" />
                          </TableCell>
                          <TableCell>{turma.disciplina_nome}</TableCell>
                          <TableCell>{turma.disciplina_codigo}</TableCell>
                          <TableCell>{turma.semestre}</TableCell>
                          <TableCell>{turma.professor_nome}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${turma.vagas_disponiveis}/${turma.capacidade_alunos}`}
                              size="small"
                              color={
                                turma.vagas_disponiveis > 5 ? "success" : "warning"
                              }
                            />
                          </TableCell>
                          <TableCell>{turma.carga_horaria}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </RadioGroup>
            </FormControl>
          )}
        </Paper>
      )}

      {/* Botão confirmar */}
      {alunoEncontrado && (
        <Paper
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${theme.palette.grey[100]}`,
            borderRadius: 2,
            p: 2,
            backgroundColor: theme.palette.background.default,
            width: "100%",
            maxWidth: 720,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          })}
        >
          {ultimaMatricula ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">Status:</Typography>
              <StatusChip status={ultimaMatricula.status} />
              <Typography variant="caption" color="text.secondary">
                {ultimaMatricula.disciplina_nome} — {ultimaMatricula.semestre}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {turmaId
                ? "Turma selecionada. Clique para confirmar."
                : "Selecione uma turma acima para continuar."}
            </Typography>
          )}

          <Button
            variant="contained"
            sx={{ width: "auto", minWidth: 200, height: 40, borderRadius: "6px" }}
            disabled={!turmaId || apiOnline === false}
            isLoading={isLoadingSalvar}
            onClick={() => void confirmarMatricula()}
          >
            Confirmar matrícula
          </Button>
        </Paper>
      )}
    </Stack>
  );

  const painelConsulta = (
    <Paper
      elevation={0}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.grey[100]}`,
        borderRadius: 2,
        p: 2,
        backgroundColor: theme.palette.background.default,
        width: "100%",
        maxWidth: 960,
      })}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={1.5}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Consultar matrículas
        </Typography>
        <Button
          variant="outlined"
          size="small"
          sx={{ width: "auto", minWidth: 120 }}
          onClick={() => void carregarListaMatriculas()}
          disabled={carregandoLista}
        >
          <RefreshCw size={16} style={{ marginRight: 6 }} />
          Atualizar
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2}>
        <TextField
          label="Filtrar por nome, matrícula ou CPF"
          placeholder="Ex.: João ou 2024001"
          value={filtroAluno}
          onChange={(e) => setFiltroAluno(e.target.value)}
          sx={{ maxWidth: 340 }}
          InputLabelProps={{ shrink: true }}
        />
        {filtroAluno && (
          <Button
            variant="text"
            sx={{ width: "auto", alignSelf: { sm: "center" } }}
            onClick={() => setFiltroAluno("")}
          >
            Limpar
          </Button>
        )}
      </Stack>

      {carregandoLista && <LinearProgress sx={{ mb: 1 }} />}

      {apiOnline === false && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          API offline ou inacessível em <strong>{baseURL}</strong>.
        </Alert>
      )}

      {apiOnline === true && listaMatriculas.length === 0 && !carregandoLista && (
        <Alert severity="info">
          Nenhuma matrícula cadastrada. Use a aba{" "}
          <strong>Nova matrícula</strong>.
        </Alert>
      )}

      {listaFiltrada.length === 0 &&
        listaMatriculas.length > 0 &&
        filtroAluno.trim() !== "" && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Nenhuma matrícula para o filtro informado.
          </Alert>
        )}

      {listaFiltrada.length > 0 && (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Aluno</TableCell>
                <TableCell>Matrícula</TableCell>
                <TableCell>Curso</TableCell>
                <TableCell>Disciplina</TableCell>
                <TableCell>Semestre</TableCell>
                <TableCell>Professor</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listaFiltrada.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.aluno_nome}</TableCell>
                  <TableCell>{m.aluno_matricula}</TableCell>
                  <TableCell>{m.curso_nome}</TableCell>
                  <TableCell>{m.disciplina_nome}</TableCell>
                  <TableCell>{m.semestre}</TableCell>
                  <TableCell>{m.professor_nome ?? "—"}</TableCell>
                  <TableCell>
                    <StatusChip status={m.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );

  return (
    <Container
      maxWidth={false}
      sx={{ minHeight: "100%", backgroundColor: "#fff", py: 2, px: 2 }}
    >
      {snackbarNode}

      <Stack spacing={2} alignItems="center">
        <Paper
          elevation={0}
          sx={(theme) => ({
            width: "100%",
            maxWidth: 960,
            borderRadius: 2,
            border: `1px solid ${theme.palette.grey[100]}`,
            px: 1,
            pt: 1,
            backgroundColor: theme.palette.background.default,
          })}
        >
          <Tabs
            value={aba}
            onChange={(_, v: number) => setAba(v)}
            variant="fullWidth"
            sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600 } }}
          >
            <Tab label="Nova matrícula" />
            <Tab label="Consultar matrículas" />
          </Tabs>
        </Paper>

        <Box
          sx={{
            width: "100%",
            maxWidth: 960,
            display: aba === 0 ? "block" : "none",
          }}
        >
          {painelNovaMatricula}
        </Box>
        <Box
          sx={{
            width: "100%",
            maxWidth: 960,
            display: aba === 1 ? "block" : "none",
          }}
        >
          {painelConsulta}
        </Box>
      </Stack>
    </Container>
  );
}
