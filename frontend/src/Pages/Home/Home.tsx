import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/Container";
import Aluno from "../../../public/assets/aluno.svg";
import { Card } from "../../components/Card";
import {
  Box,
  Stack,
  Typography,
  Tabs,
  Tab,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import {
  BookOpen,
  Calendar,
  Clock,
  ClipboardList,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { frequenciaApi } from "../../services/frequencia-api";
import { notaApi } from "../../services/nota-api";
import { authService } from "../../services/auth-services";
import { homeAlunoApi } from "../../services/home-aluno-api";
import type {
  DisciplinaAluno,
  TarefaAluno,
  TipoTarefa,
} from "../../models/home-aluno-model";

interface UsuarioLocal {
  nome?: string;
  email?: string;
  tipo_usuario?: string;
}

interface InformacaoAluno {
  matricula: string | number | null;
  curso: string | null;
  periodo: string | number | null;
}

// Resposta de GET /me — apenas os campos usados no cabeçalho do aluno.
interface RespostaMe {
  data?: {
    academico?: {
      matricula?: string | number | null;
      curso?: string | null;
      periodo?: string | number | null;
    } | null;
  };
}

// Cor do Chip por tipo de avaliação exibido na aba "A Fazer".
const corDoTipo = (
  tipo: TipoTarefa
): "error" | "info" | "warning" | "secondary" => {
  if (tipo === "PROVA") return "error";
  if (tipo === "TRABALHO") return "info";
  if (tipo === "RECUPERACAO") return "secondary";
  return "warning"; // TPI
};

// Formata "AAAA-MM-DD" em pt-BR sem sofrer deslocamento de fuso horário.
const formatarVencimento = (iso: string): string => {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
};

export default function Home() {
  const navigate = useNavigate();

  // Inicializa o usuário de forma síncrona para evitar flash visual
  const [user] = useState<UsuarioLocal | null>(() => {
    const stored = localStorage.getItem("@UniEduca:user");
    if (stored) {
      try {
        return JSON.parse(stored) as UsuarioLocal;
      } catch {
        return null;
      }
    }
    return null;
  });

  const userName = useMemo(() => user?.nome || "Usuário", [user]);

  const isAluno = useMemo(() => {
    return (
      user &&
      String(user.tipo_usuario || "")
        .trim()
        .toLowerCase() === "aluno"
    );
  }, [user]);

  // Cabeçalho do aluno (derivado do JWT via GET /me)
  const [studentInfo, setStudentInfo] = useState<InformacaoAluno | null>(null);

  // Aba Disciplinas
  const [disciplinas, setDisciplinas] = useState<DisciplinaAluno[]>([]);
  const [carregandoDisciplinas, setCarregandoDisciplinas] = useState(false);
  const [erroDisciplinas, setErroDisciplinas] = useState<string | null>(null);

  // Aba A Fazer
  const [tarefas, setTarefas] = useState<TarefaAluno[]>([]);
  const [carregandoTarefas, setCarregandoTarefas] = useState(false);
  const [erroTarefas, setErroTarefas] = useState<string | null>(null);

  const [tabValue, setTabValue] = useState(0);
  const [alertaFrequencia, setAlertaFrequencia] = useState(false);
  const [alertaNotas, setAlertaNotas] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (!isAluno || !user) return;

    const token = localStorage.getItem("@UniEduca:token") ?? "";

    // Cabeçalho via JWT (GET /me) — sem busca por CPF/e-mail no cliente.
    const carregarCabecalho = async () => {
      try {
        const resposta: RespostaMe = await authService.getMe(token);
        const academico = resposta?.data?.academico ?? null;
        setStudentInfo({
          matricula: academico?.matricula ?? null,
          curso: academico?.curso ?? null,
          periodo: academico?.periodo ?? null,
        });
      } catch {
        setStudentInfo(null);
      }
    };

    // Aba Disciplinas — disciplinas do período corrente (GET /me/disciplinas).
    const carregarDisciplinas = async () => {
      setCarregandoDisciplinas(true);
      setErroDisciplinas(null);
      try {
        setDisciplinas(await homeAlunoApi.minhasDisciplinas());
      } catch {
        setErroDisciplinas(
          "Não foi possível carregar suas disciplinas. Tente novamente mais tarde."
        );
      } finally {
        setCarregandoDisciplinas(false);
      }
    };

    // Aba A Fazer — avaliações a vencer (GET /me/tarefas).
    const carregarTarefas = async () => {
      setCarregandoTarefas(true);
      setErroTarefas(null);
      try {
        setTarefas(await homeAlunoApi.minhasTarefas());
      } catch {
        setErroTarefas(
          "Não foi possível carregar suas tarefas. Tente novamente mais tarde."
        );
      } finally {
        setCarregandoTarefas(false);
      }
    };

    // Alertas no topo (integração já existente).
    const carregarAlertas = async () => {
      try {
        const dados = await frequenciaApi.minhaFrequencia();
        setAlertaFrequencia(Boolean(dados.possuiAlerta));
      } catch {
        setAlertaFrequencia(false);
      }
      try {
        const dados = await notaApi.meuResumo();
        setAlertaNotas(Boolean(dados.possuiAlerta));
      } catch {
        setAlertaNotas(false);
      }
    };

    void carregarCabecalho();
    void carregarDisciplinas();
    void carregarTarefas();
    void carregarAlertas();
  }, [isAluno, user]);

  // Card de disciplina -> destino somente-leitura acessível ao aluno.
  const renderDisciplinaCard = (disc: DisciplinaAluno) => {
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={disc.turmaDisciplinaId}>
        <Card.Root
          onClick={() => navigate("/minhas-notas")}
          sx={{
            cursor: "pointer",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
            },
          }}
        >
          <Card.Header>
            <Card.Title>{disc.nome}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <strong>Código:</strong> {disc.codigo}
            </Typography>
            <Typography variant="body2">
              <strong>Professor:</strong> {disc.professorNome}
            </Typography>
            <Typography variant="body2">
              <strong>Turma/Semestre:</strong> {disc.turmaSigla}
            </Typography>
            <Typography variant="body2">
              <strong>Carga Horária:</strong> {disc.cargaHoraria}h
            </Typography>
          </Card.Content>
        </Card.Root>
      </Grid>
    );
  };

  // Se NÃO for aluno, renderiza a Home padrão atual (boas-vindas + imagem do formando)
  if (!isAluno) {
    return (
      <Container
        maxWidth={false}
        sx={(theme) => ({
          border: `1px solid ${theme.palette.grey[200]}`,
          borderRadius: "8px",
          height: "100%",
          backgroundColor: "#F4F4F4",
        })}
      >
        <Box
          component="div"
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <Box
            sx={(theme) => ({
              backgroundColor: theme.palette.background.default,
              width: 260,
              height: 260,
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <img src={Aluno} alt="Aluno se formando" width={230} />
          </Box>

          <Stack display="flex" justifyContent="center" alignItems="center" mt={1}>
            <Typography variant="body1" fontWeight="bold">
              Olá, {userName}!
            </Typography>
            <Typography variant="body2" color="textDisabled">
              Bem vindo de volta ao seu sistema acadêmico.
            </Typography>
            <Typography variant="body2" color="textDisabled">
              Acesse os menus desejados e fique por dentro de todas as suas estatísticas.
            </Typography>
          </Stack>
        </Box>
      </Container>
    );
  }

  // Renderiza a Home específica do Aluno com abas (Disciplinas / A Fazer)
  return (
    <Container
      maxWidth={false}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: "8px",
        height: "100%",
        backgroundColor: "#F4F4F4",
        overflowY: "auto",
        p: { xs: 2, md: 3 },
      })}
    >
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
        {alertaFrequencia && (
          <Alert severity="warning" onClick={() => navigate("/minha-frequencia")} sx={{ cursor: "pointer" }}>
            Sua frequência está em 80% ou menos em pelo menos uma disciplina. Consulte “Minha Frequência”.
          </Alert>
        )}
        {alertaNotas && (
          <Alert severity="warning" onClick={() => navigate("/minhas-notas")} sx={{ cursor: "pointer" }}>
            Você possui ao menos uma disciplina com média parcial abaixo de 60%. Consulte “Minhas Notas”.
          </Alert>
        )}
        {/* Cabeçalho do Aluno */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "grey.200",
            background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
            color: "white",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
          >
            <Stack spacing={0.5}>
              <Typography variant="h5" fontWeight="bold">
                Olá, {userName}!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Bem-vindo de volta ao seu portal acadêmico. Acompanhe suas disciplinas e tarefas.
              </Typography>
            </Stack>
            {studentInfo && (
              <Stack
                direction="row"
                spacing={2}
                divider={
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ borderColor: "rgba(255,255,255,0.3)" }}
                  />
                }
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  p: 1.5,
                  borderRadius: "8px",
                  backdropFilter: "blur(4px)",
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }} display="block">
                    MATRÍCULA
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {studentInfo.matricula ?? "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }} display="block">
                    CURSO
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {studentInfo.curso ?? "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }} display="block">
                    PERÍODO
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {studentInfo.periodo ? `${studentInfo.periodo}º` : "—"}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Box>
        </Paper>

        {/* Abas */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            aria-label="Abas da Página Inicial"
          >
            <Tab
              icon={<BookOpen size={18} />}
              iconPosition="start"
              label="Disciplinas"
              id="student-tab-disciplinas"
            />
            <Tab
              icon={<ClipboardList size={18} />}
              iconPosition="start"
              label="A Fazer"
              id="student-tab-afazer"
            />
          </Tabs>
        </Box>

        {/* Conteúdo Aba Disciplinas */}
        {tabValue === 0 && (
          <Box mt={1}>
            {carregandoDisciplinas ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={200}
                flexDirection="column"
                gap={2}
              >
                <CircularProgress color="primary" />
                <Typography variant="body2" color="textSecondary">
                  Carregando suas disciplinas...
                </Typography>
              </Box>
            ) : erroDisciplinas ? (
              <Alert severity="error">{erroDisciplinas}</Alert>
            ) : disciplinas.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: "center",
                  border: "1px dashed",
                  borderColor: "grey.300",
                  borderRadius: "12px",
                  backgroundColor: "background.default",
                }}
              >
                <GraduationCap size={48} color="#9E9E9E" style={{ marginBottom: 16 }} />
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Sem disciplinas matriculadas no período corrente.
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Caso considere que isto é um erro, entre em contato com a secretaria acadêmica.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {disciplinas.map((disc) => renderDisciplinaCard(disc))}
              </Grid>
            )}
          </Box>
        )}

        {/* Conteúdo Aba A Fazer */}
        {tabValue === 1 && (
          <Box mt={1}>
            {carregandoTarefas ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={200}
                flexDirection="column"
                gap={2}
              >
                <CircularProgress color="primary" />
                <Typography variant="body2" color="textSecondary">
                  Carregando suas tarefas...
                </Typography>
              </Box>
            ) : erroTarefas ? (
              <Alert severity="error">{erroTarefas}</Alert>
            ) : tarefas.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: "center",
                  border: "1px dashed",
                  borderColor: "grey.300",
                  borderRadius: "12px",
                  backgroundColor: "background.default",
                }}
              >
                <CheckCircle2 size={48} color="#2E7D32" style={{ marginBottom: 16 }} />
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Nenhuma tarefa pendente.
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Parabéns! Você concluiu todas as suas atividades acadêmicas.
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {tarefas.map((task) => (
                  <Grid size={12} key={task.avaliacaoId}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: "grey.200",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 2,
                        transition: "all 0.2s",
                        "&:hover": {
                          boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
                          borderColor: "grey.300",
                        },
                      }}
                    >
                      <Stack spacing={0.5} sx={{ maxWidth: "75%" }}>
                        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                          <Typography variant="subtitle1" fontWeight="bold">
                            {task.titulo}
                          </Typography>
                          <Chip
                            label={task.tipo}
                            size="small"
                            color={corDoTipo(task.tipo)}
                            variant="filled"
                            sx={{ height: 20, fontSize: "10px", fontWeight: "bold" }}
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          Disciplina: <strong>{task.disciplinaNome}</strong>
                        </Typography>
                        {task.valor !== null && (
                          <Typography variant="body2" color="textSecondary">
                            Valor: <strong>{task.valor} pts</strong>
                          </Typography>
                        )}
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={3}>
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                            <Calendar size={14} />
                            <Typography variant="body2" fontSize="13px">
                              Vencimento: {formatarVencimento(task.dataVencimento)}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5} color="warning.main">
                            <Clock size={14} />
                            <Typography variant="caption" fontWeight="bold">
                              Pendente
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
}
