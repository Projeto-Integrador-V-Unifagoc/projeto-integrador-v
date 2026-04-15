import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
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
import { GraduationCap, RefreshCw } from "lucide-react";

import Container from "../../components/Container";
import TextField from "../../components/TextField";
import Button from "../../components/Button";
import { Cursos } from "../../enums/cursos";
import matriculaApi, { baseURL } from "../../services/matricula-api";

type DisciplinaSelecionada = {
  nome: string;
  dia: "Segunda" | "Terca" | "Quarta" | "Quinta" | "Sexta";
  horario: string;
};

const horarios = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
];

const diasSemana: Array<DisciplinaSelecionada["dia"]> = [
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
];

const disciplinasSelecionadas: DisciplinaSelecionada[] = [
  { nome: "Programacao Orientada a Objetos", dia: "Terca", horario: "10:00" },
  { nome: "Banco de Dados", dia: "Terca", horario: "12:00" },
  { nome: "Engenharia de Software", dia: "Quinta", horario: "10:00" },
  { nome: "Redes de Computadores", dia: "Quinta", horario: "12:00" },
  { nome: "Sistemas Operacionais", dia: "Sexta", horario: "08:00" },
  { nome: "Inteligencia Artificial", dia: "Sexta", horario: "12:00" },
];

type MatriculaResposta = {
  id: number;
  alunoId: number;
  alunoNome?: string | null;
  periodoLetivo: string;
  disciplinas: string[];
  situacao: string;
  createdAt: string;
  statusMatriculaLabel: string;
  statusMatriculaCor: string;
};

export default function Matricula() {
  const [aba, setAba] = useState(0);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [emailInstitucional, setEmailInstitucional] = useState("");
  const [curso, setCurso] = useState<Cursos | "">("");
  const [formaIngresso, setFormaIngresso] = useState("");
  const [periodoLetivo, setPeriodoLetivo] = useState("2026.1");
  const [alunoIdNumerico, setAlunoIdNumerico] = useState(1);

  const [isLoadingSalvar, setIsLoadingSalvar] = useState(false);
  const [erroRequisicao, setErroRequisicao] = useState("");
  const [sucessoRequisicao, setSucessoRequisicao] = useState("");
  const [statusMatricula, setStatusMatricula] = useState<{
    label: string;
    cor: string;
  } | null>(null);

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [listaMatriculas, setListaMatriculas] = useState<MatriculaResposta[]>(
    []
  );
  const [filtroAlunoId, setFiltroAlunoId] = useState("");

  const [snackbar, setSnackbar] = useState<{
    aberto: boolean;
    mensagem: string;
    severidade: "success" | "error" | "info" | "warning";
  }>({ aberto: false, mensagem: "", severidade: "info" });

  const totalCreditos = useMemo(
    () => disciplinasSelecionadas.length * 4,
    []
  );

  /** >= 3 caracteres (antes era > 3 e barrava nomes curtos como "Ana"). */
  const formularioValido =
    nome.trim().length >= 3 &&
    cpf.trim().length > 0 &&
    emailInstitucional.trim().length > 0 &&
    curso !== "" &&
    formaIngresso !== "" &&
    alunoIdNumerico > 0;

  const listaFiltrada = useMemo(() => {
    const id = Number(filtroAlunoId);
    if (!filtroAlunoId.trim() || Number.isNaN(id)) return listaMatriculas;
    return listaMatriculas.filter((m) => m.alunoId === id);
  }, [listaMatriculas, filtroAlunoId]);

  const abrirSnackbar = (
    mensagem: string,
    severidade: "success" | "error" | "info" | "warning"
  ) => {
    setSnackbar({ aberto: true, mensagem, severidade });
  };

  const verificarApi = useCallback(async () => {
    try {
      await matriculaApi.get("/health");
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  }, []);

  const carregarListaMatriculas = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const { data } = await matriculaApi.get<MatriculaResposta[]>("/matriculas");
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
    void verificarApi();
    void carregarListaMatriculas();
  }, [verificarApi, carregarListaMatriculas]);

  async function confirmarMatricula() {
    try {
      setIsLoadingSalvar(true);
      setErroRequisicao("");
      setSucessoRequisicao("");

      const payload = { alunoId: String(alunoIdNumerico) };

      await matriculaApi.post("/matriculas", payload);

      const response = await matriculaApi.get<MatriculaResposta[]>(
        `/matriculas/aluno/${payload.alunoId}`
      );
      const ultimaMatricula = response.data?.[0];

      setStatusMatricula(
        ultimaMatricula
          ? {
              label: ultimaMatricula.statusMatriculaLabel,
              cor: ultimaMatricula.statusMatriculaCor,
            }
          : null
      );

      const msgSucesso =
        "Matriculado com sucesso! Os dados foram gravados no banco de dados.";
      setSucessoRequisicao(msgSucesso);
      abrirSnackbar("Matriculado com sucesso!", "success");
      await carregarListaMatriculas();
      setAba(1);
    } catch (error: unknown) {
      let mensagem =
        "Nao foi possivel realizar a matricula. Verifique o backend e o PostgreSQL.";

      if (error instanceof Error && error.message.includes("Sem conexao")) {
        mensagem = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        mensagem = error.response.data.message;
      }

      setErroRequisicao(mensagem);
      abrirSnackbar(mensagem, "error");
    } finally {
      setIsLoadingSalvar(false);
    }
  }

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

  const gradeHoraria = (
    <Paper
      elevation={0}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.grey[100]}`,
        borderRadius: 2,
        p: 2,
        backgroundColor: theme.palette.background.default,
        width: "100%",
      })}
    >
      <Typography variant="h6" fontWeight={700} mb={1}>
        Grade horária (pré-visualização)
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        Estas disciplinas serão enviadas ao servidor ao confirmar a matrícula.
      </Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 720 }}>
          <Grid container>
            <Grid size={2} p={0.9}>
              <Typography variant="subtitle2">Horário</Typography>
            </Grid>
            {diasSemana.map((dia) => (
              <Grid key={dia} size={2} p={0.9}>
                <Typography variant="subtitle2">{dia}</Typography>
              </Grid>
            ))}
          </Grid>
          {horarios.map((horario) => (
            <Grid container key={horario} alignItems="center">
              <Grid size={2} p={0.8}>
                <Typography variant="body2" color="text.secondary">
                  {horario}
                </Typography>
              </Grid>
              {diasSemana.map((dia) => {
                const itemSelecionado = disciplinasSelecionadas.find(
                  (item) => item.dia === dia && item.horario === horario
                );
                return (
                  <Grid key={`${dia}-${horario}`} size={2} p={0.45}>
                    <Box
                      sx={(theme) => ({
                        minHeight: 32,
                        borderRadius: "4px",
                        border: itemSelecionado
                          ? `1px solid ${theme.palette.primary.main}`
                          : `1px solid ${theme.palette.grey[100]}`,
                        backgroundColor: itemSelecionado
                          ? theme.palette.primary.light
                          : theme.palette.background.default,
                        px: 0.75,
                        display: "flex",
                        alignItems: "center",
                      })}
                    >
                      <Typography
                        variant="caption"
                        noWrap
                        title={itemSelecionado?.nome}
                      >
                        {itemSelecionado?.nome ?? ""}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </Box>
      </Box>
    </Paper>
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
          onClick={() => {
            void carregarListaMatriculas();
            void verificarApi();
          }}
          disabled={carregandoLista}
        >
          <RefreshCw size={16} style={{ marginRight: 6 }} />
          Atualizar
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2}>
        <TextField
          label="Filtrar por ID do aluno"
          placeholder="Ex.: 1"
          value={filtroAlunoId}
          onChange={(e) => setFiltroAlunoId(e.target.value)}
          sx={{ maxWidth: 220 }}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="text"
          sx={{ width: "auto", alignSelf: { sm: "center" } }}
          onClick={() => setFiltroAlunoId("")}
        >
          Limpar filtro
        </Button>
      </Stack>

      {carregandoLista && <LinearProgress sx={{ mb: 1 }} />}

      {apiOnline === false && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          API offline ou inacessível em <strong>{baseURL}</strong>. Suba o
          backend e confira o PostgreSQL.
        </Alert>
      )}

      {sucessoRequisicao && aba === 1 && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSucessoRequisicao("")}>
          {sucessoRequisicao}
        </Alert>
      )}

      {apiOnline === true &&
        listaMatriculas.length === 0 &&
        !carregandoLista && (
          <Alert severity="info">
            Nenhuma matrícula cadastrada. Use a aba{" "}
            <strong>Nova matrícula</strong> para registrar a primeira.
          </Alert>
        )}

      {listaFiltrada.length === 0 &&
        listaMatriculas.length > 0 &&
        filtroAlunoId.trim() !== "" && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Nenhuma matrícula para o ID informado.
          </Alert>
        )}

      {listaFiltrada.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Aluno</TableCell>
              <TableCell>Período</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Disciplinas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listaFiltrada.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.id}</TableCell>
                <TableCell>
                  #{m.alunoId}
                  {m.alunoNome ? ` — ${m.alunoNome}` : ""}
                </TableCell>
                <TableCell>{m.periodoLetivo}</TableCell>
                <TableCell>
                  <Chip
                    label={m.statusMatriculaLabel}
                    size="small"
                    sx={{
                      backgroundColor: m.statusMatriculaCor,
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="caption" color="text.secondary">
                    {m.disciplinas.join(", ")}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );

  const painelNovaMatricula = (
    <Stack spacing={2.5} alignItems="center" width="100%">
      {apiOnline === false && (
        <Alert severity="warning" sx={{ width: "100%", maxWidth: 720 }}>
          Sem conexão com a API em {baseURL}. Não será possível salvar até o
          backend estar no ar.
        </Alert>
      )}

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
          {erroRequisicao && (
            <Alert severity="error" onClose={() => setErroRequisicao("")}>
              {erroRequisicao}
            </Alert>
          )}
          {sucessoRequisicao && aba === 0 && (
            <Alert severity="success" onClose={() => setSucessoRequisicao("")}>
              {sucessoRequisicao}
            </Alert>
          )}

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
              Preencha os dados, confira a grade e confirme uma única vez para
              gravar no banco.
            </Typography>
          </Stack>

          <TextField
            label="ID do aluno (teste) *"
            type="number"
            value={alunoIdNumerico}
            onChange={(event) =>
              setAlunoIdNumerico(Number(event.target.value) || 0)
            }
            helperText="Mesmo ID usado na consulta. Integração com cadastro de alunos virá depois."
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 1 }}
          />

          <TextField
            label="Nome completo *"
            placeholder="Digite seu nome completo"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="CPF *"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(event) => setCpf(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="E-mail institucional *"
            placeholder="seuemail@instituicao.edu.br"
            value={emailInstitucional}
            onChange={(event) => setEmailInstitucional(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Curso *"
            value={curso}
            select
            onChange={(event) => setCurso(event.target.value as Cursos)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">Selecione o curso</MenuItem>
            {Object.values(Cursos).map((itemCurso) => (
              <MenuItem key={itemCurso} value={itemCurso}>
                {itemCurso}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Forma de ingresso *"
            value={formaIngresso}
            select
            onChange={(event) => setFormaIngresso(event.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">Selecione</MenuItem>
            <MenuItem value="enem">ENEM</MenuItem>
            <MenuItem value="vestibular">Vestibular</MenuItem>
            <MenuItem value="transferencia">Transferência</MenuItem>
          </TextField>

          <Grid container alignItems="center" spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="subtitle2">Período letivo</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                select
                fullWidth
                value={periodoLetivo}
                onChange={(event) => setPeriodoLetivo(event.target.value)}
              >
                <MenuItem value="2025.1">2025.1</MenuItem>
                <MenuItem value="2025.2">2025.2</MenuItem>
                <MenuItem value="2026.1">2026.1</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {statusMatricula && (
            <Alert
              severity="info"
              icon={false}
              sx={{ border: `1px solid ${statusMatricula.cor}` }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">Status após última operação:</Typography>
                <Chip
                  label={statusMatricula.label}
                  size="small"
                  sx={{
                    backgroundColor: statusMatricula.cor,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
              </Stack>
            </Alert>
          )}
        </Stack>
      </Paper>

      <Box sx={{ width: "100%", maxWidth: 900 }}>{gradeHoraria}</Box>

      <Paper
        elevation={0}
        sx={(theme) => ({
          border: `1px solid ${theme.palette.grey[100]}`,
          borderRadius: 2,
          p: 2,
          backgroundColor: theme.palette.background.default,
          width: "100%",
          maxWidth: 900,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        })}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={`${disciplinasSelecionadas.length} disciplinas`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${totalCreditos} créditos`}
            color="primary"
            variant="outlined"
          />
        </Stack>
        <Button
          variant="contained"
          sx={{ width: "auto", minWidth: 220, height: 40, borderRadius: "6px" }}
          disabled={!formularioValido || apiOnline === false}
          isLoading={isLoadingSalvar}
          onClick={confirmarMatricula}
        >
          Confirmar matrícula e salvar
        </Button>
      </Paper>

      {!formularioValido && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Preencha todos os campos obrigatórios (nome com pelo menos 3 letras) para
          habilitar o botão.
        </Typography>
      )}
    </Stack>
  );

  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: "100%",
        backgroundColor: "#fff",
        py: 2,
        px: 2,
      }}
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
            onChange={(_, v) => setAba(v)}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            }}
          >
            <Tab label="Nova matrícula" />
            <Tab label="Consultar matrículas" />
          </Tabs>
        </Paper>

        <Box sx={{ width: "100%", maxWidth: 960, display: aba === 0 ? "block" : "none" }}>
          {painelNovaMatricula}
        </Box>
        <Box sx={{ width: "100%", maxWidth: 960, display: aba === 1 ? "block" : "none" }}>
          {painelConsulta}
        </Box>
      </Stack>
    </Container>
  );
}
