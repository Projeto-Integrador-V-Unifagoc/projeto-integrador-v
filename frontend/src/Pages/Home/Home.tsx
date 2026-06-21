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

interface DisciplinaEstudante {
  id: string;
  codigo: string;
  nome: string;
  cargaHoraria: number;
  professor: string;
  turma: string;
}

interface UsuarioLocal {
  nome?: string;
  email?: string;
  tipo_usuario?: string;
}

interface PerfilAcademico {
  curso?: string;
  periodo?: string | number;
}

interface AlunoBanco {
  id?: string;
  matricula?: string | number;
  curso_nome?: string;
  periodo?: string | number;
  usuario?: { email?: string };
}

interface MatriculaAluno {
  id: string;
  status: string;
  disciplina_nome: string;
  professor_nome?: string;
  semestre?: string;
}

interface DisciplinaApi {
  id: string;
  codigo?: string;
  nome: string;
  carga_horaria?: number;
}

interface InformacaoAluno {
  id?: string;
  matricula: string | number;
  curso: string;
  periodo: string | number;
}

interface TarefaMock {
  id: string;
  titulo: string;
  disciplina: string;
  tipo: "PROVA" | "TPI" | "TRABALHO";
  dataVencimento: Date;
  status: string;
}

const MOCK_DISCIPLINAS: DisciplinaEstudante[] = [
  {
    id: "mock-1",
    codigo: "PI5A",
    nome: "Projeto Integrador V",
    cargaHoraria: 80,
    professor: "Evandro de Paula Marques",
    turma: "2026/1",
  },
  {
    id: "mock-2",
    codigo: "BD2B",
    nome: "Banco de Dados II",
    cargaHoraria: 60,
    professor: "Marcos Antônio dos Santos",
    turma: "2026/1",
  },
  {
    id: "mock-3",
    codigo: "ES3C",
    nome: "Engenharia de Software",
    cargaHoraria: 60,
    professor: "Felipe José de Souza",
    turma: "2026/1",
  },
];

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

  // Estados específicos para o fluxo do Aluno
  const [studentInfo, setStudentInfo] = useState<InformacaoAluno | null>(null);
  const [disciplinas, setDisciplinas] = useState<DisciplinaEstudante[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [alertaFrequencia, setAlertaFrequencia] = useState(false);
  const [alertaNotas, setAlertaNotas] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Carrega dados acadêmicos do aluno
  const carregarDadosDoAluno = async (currentUser: UsuarioLocal) => {
    setCarregando(true);
    setErro(null);
    try {
      const token = localStorage.getItem("@UniEduca:token");
      const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

      // 1. Obter informações detalhadas do perfil (/me) para recuperar o CPF
      let cpf = "";
      let academicProfile: PerfilAcademico | null = null;
      try {
        const meResponse = await fetch(`${baseUrl}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (meResponse.ok) {
          const meData = (await meResponse.json()) as {
            success?: boolean;
            data?: { pessoa?: { cpf?: string }; academico?: PerfilAcademico };
          };
          if (meData.success && meData.data) {
            cpf = meData.data.pessoa?.cpf || "";
            academicProfile = meData.data.academico ?? null;
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados do perfil em /me:", error);
      }

      // 2. Buscar o aluno correspondente no banco pelo CPF para obter o ID acadêmico e matrícula
      let studentDb: AlunoBanco | null = null;
      if (cpf) {
        try {
          const searchResponse = await fetch(`${baseUrl}/alunos/buscar?q=${cpf}`);
          if (searchResponse.ok) {
            const searchData = (await searchResponse.json()) as AlunoBanco[];
            if (Array.isArray(searchData) && searchData.length > 0) {
              studentDb = searchData[0];
            }
          }
        } catch (error) {
          console.error("Erro ao localizar aluno por CPF:", error);
        }
      }

      // Fallback: se não achar por CPF, tenta listar todos e filtar por e-mail
      if (!studentDb) {
        try {
          const listResponse = await fetch(`${baseUrl}/alunos`);
          if (listResponse.ok) {
            const listData = (await listResponse.json()) as AlunoBanco[];
            if (Array.isArray(listData)) {
              studentDb = listData.find((a) => a.usuario?.email === currentUser.email) ?? null;
            }
          }
        } catch (error) {
          console.error("Erro no fallback de listagem de alunos:", error);
        }
      }

      setStudentInfo({
        matricula: studentDb?.matricula || "—",
        curso: studentDb?.curso_nome || academicProfile?.curso || "Não informado",
        periodo: studentDb?.periodo || academicProfile?.periodo || "—",
        id: studentDb?.id,
      });

      // 3. Buscar as matrículas do aluno em turmas
      let matriculas: MatriculaAluno[] = [];
      if (studentDb?.id) {
        try {
          const matResponse = await fetch(`${baseUrl}/matriculas/aluno/${studentDb.id}`);
          if (matResponse.ok) {
            matriculas = (await matResponse.json()) as MatriculaAluno[];
          }
        } catch (error) {
          console.error("Erro ao buscar matrículas:", error);
        }
      }

      // 4. Buscar a lista geral de disciplinas do sistema para correlacionar ID e Carga Horária
      let todasDisciplinas: DisciplinaApi[] = [];
      try {
        const discResponse = await fetch(`${baseUrl}/disciplinas`);
        if (discResponse.ok) {
          todasDisciplinas = (await discResponse.json()) as DisciplinaApi[];
        }
      } catch (error) {
        console.error("Erro ao buscar lista de disciplinas:", error);
      }

      // 5. Cruzar as informações de matrícula e disciplinas
      const matriculasAtivas = matriculas.filter(
        (m) => m.status !== "CANCELADO" && m.status !== "INATIVO"
      );

      const discMapeadas: DisciplinaEstudante[] = matriculasAtivas.map((mat) => {
        const matched = todasDisciplinas.find(
          (d) =>
            d.nome.trim().toLowerCase() === mat.disciplina_nome.trim().toLowerCase()
        );
        return {
          id: matched?.id || mat.id, // Se não achar disciplina global, navega pelo ID da matrícula
          codigo: matched?.codigo || "—",
          nome: mat.disciplina_nome,
          cargaHoraria: matched?.carga_horaria || 0,
          professor: mat.professor_nome || "A definir",
          turma: mat.semestre || "—",
        };
      });

      // Ordenar por nome em ordem alfabética
      discMapeadas.sort((a, b) => a.nome.localeCompare(b.nome));

      setDisciplinas(discMapeadas);
    } catch (e: unknown) {
      console.error("Erro geral ao carregar dados do aluno:", e);
      setErro("Houve uma falha ao conectar com o servidor acadêmico. Dados provisórios exibidos.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (isAluno && user) {
      carregarDadosDoAluno(user);
      frequenciaApi.minhaFrequencia()
        .then((dados) => setAlertaFrequencia(Boolean(dados.possuiAlerta)))
        .catch(() => setAlertaFrequencia(false));
      notaApi.meuResumo()
        .then((dados) => setAlertaNotas(Boolean(dados.possuiAlerta)))
        .catch(() => setAlertaNotas(false));
    }
  }, [isAluno, user]);

  // Lista dinâmica de tarefas baseada nas disciplinas reais ou mocks
  const mockTasks = useMemo(() => {
    const nomesDisciplinas =
      disciplinas.length > 0
        ? disciplinas.map((d) => d.nome)
        : MOCK_DISCIPLINAS.map((d) => d.nome);

    const d1 = nomesDisciplinas[0] || "Projeto Integrador V";
    const d2 = nomesDisciplinas[1] || "Banco de Dados II";
    const d3 = nomesDisciplinas[2] || "Engenharia de Software";

    const tasksList: TarefaMock[] = [
      {
        id: "task-1",
        titulo: "Entrega do Relatório Final - A1",
        disciplina: d1,
        tipo: "TRABALHO",
        dataVencimento: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 dias
        status: "Pendente",
      },
      {
        id: "task-2",
        titulo: "Prova Regular de Conteúdo - A2",
        disciplina: d2,
        tipo: "PROVA",
        dataVencimento: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 dias
        status: "Pendente",
      },
      {
        id: "task-3",
        titulo: "Trabalho de Pesquisa PI - Protótipo",
        disciplina: d1,
        tipo: "TPI",
        dataVencimento: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // 10 dias
        status: "Pendente",
      },
      {
        id: "task-4",
        titulo: "Exercícios Teóricos de Fixação",
        disciplina: d3,
        tipo: "TRABALHO",
        dataVencimento: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 dias
        status: "Pendente",
      },
    ];

    // Ordenação ascendente por data de vencimento
    return tasksList.sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
  }, [disciplinas]);

  // Renderizador de card de disciplinas
  const renderDisciplinaCard = (disc: DisciplinaEstudante) => {
    return (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={disc.id}>
        <Card.Root
          onClick={() => navigate(`/disciplinas/${disc.id}`)}
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
              <strong>Professor:</strong> {disc.professor}
            </Typography>
            <Typography variant="body2">
              <strong>Turma/Semestre:</strong> {disc.turma}
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
                    {studentInfo.matricula}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }} display="block">
                    CURSO
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {studentInfo.curso}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }} display="block">
                    PERÍODO
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {studentInfo.periodo}º
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
            {carregando ? (
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
            ) : erro ? (
              <Stack gap={2}>
                <Alert severity="warning">{erro}</Alert>
                <Grid container spacing={3}>
                  {MOCK_DISCIPLINAS.map((disc) => renderDisciplinaCard(disc))}
                </Grid>
              </Stack>
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
            {mockTasks.length === 0 ? (
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
                {mockTasks.map((task) => (
                  <Grid size={12} key={task.id}>
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
                            color={
                              task.tipo === "PROVA"
                                ? "error"
                                : task.tipo === "TRABALHO"
                                ? "info"
                                : "warning"
                            }
                            variant="filled"
                            sx={{ height: 20, fontSize: "10px", fontWeight: "bold" }}
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                          Disciplina: <strong>{task.disciplina}</strong>
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={3}>
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                            <Calendar size={14} />
                            <Typography variant="body2" fontSize="13px">
                              Vencimento: {task.dataVencimento.toLocaleDateString("pt-BR")}
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
