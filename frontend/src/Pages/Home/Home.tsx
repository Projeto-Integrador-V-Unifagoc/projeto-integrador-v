import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  Clock,
  FileBarChart,
  FileText,
  GraduationCap,
  Info,
  Layers,
  NotebookPen,
  UserCog,
  UserStar,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Button from "../../components/Button";
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import NoData from "../../components/DataTable/NoData";
import { frequenciaApi } from "../../services/frequencia-api";
import { notaApi } from "../../services/nota-api";
import { authService } from "../../services/auth-services";
import { homeAlunoApi } from "../../services/home-aluno-api";
import type {
  DisciplinaAluno,
  TarefaAluno,
  TipoTarefa,
} from "../../models/home-aluno-model";
import {
  COR_TIPO_AVALIACAO,
  formatarDataPtBr,
  formatarPontos,
  ROTULO_TIPO_AVALIACAO,
} from "../../utils/avaliacao";

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

interface Atalho {
  label: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  podeVer: boolean;
}

// Altura mínima reservada para os estados de carregando/erro/vazio, evitando salto de layout.
const MIN_ALTURA_CONTEUDO = 360;

const TRACO = "—";

// Estilo compartilhado dos cartões acionáveis (atalhos e disciplinas): cursor, hover,
// foco visível por teclado e respeito à preferência de redução de movimento.
const sxCartaoAcionavel = {
  cursor: "pointer",
  height: "100%",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: 3,
    borderColor: "primary.main",
  },
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: "2px",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    "&:hover": { transform: "none" },
  },
} as const;

// Props de acessibilidade para tornar um cartão operável por mouse e teclado.
function propsCartaoAcionavel(rotulo: string, acao: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": rotulo,
    onClick: acao,
    onKeyDown: (evento: React.KeyboardEvent) => {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        acao();
      }
    },
  };
}

function valorOuTraco(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return TRACO;
  return String(valor);
}

// Crachá circular com fundo levemente tingido pela cor primária, reaproveitado nos cabeçalhos e cartões.
function IconeBadge({ children, size = 48 }: { children: ReactNode; size?: number }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
        color: theme.palette.primary.main,
      })}
    >
      {children}
    </Box>
  );
}

// Item rótulo/valor do resumo do aluno (matrícula, curso e período).
function ItemResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {rotulo}
      </Typography>
      <Typography variant="body2" fontWeight={700} sx={{ wordBreak: "break-word" }}>
        {valor}
      </Typography>
    </Box>
  );
}

// Linha "rótulo: valor" usada nos cartões de disciplina.
function LinhaInfo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {rotulo}:{" "}
      <Typography component="span" variant="body2" color="text.primary" fontWeight={600}>
        {valor}
      </Typography>
    </Typography>
  );
}

function corFrequencia(valor: number | null): "success" | "warning" | "error" | "primary" {
  if (valor === null) return "primary";
  if (valor < 75) return "error";
  if (valor <= 80) return "warning";
  return "success";
}

function IndicadorPercentual({
  rotulo,
  valor,
  carregando,
  cor,
}: {
  rotulo: string;
  valor: number | null;
  carregando: boolean;
  cor: "primary" | "success" | "warning" | "error";
}) {
  const texto = valor === null
    ? TRACO
    : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;

  return (
    <Box sx={{ flex: 1, minWidth: 140 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} mb={0.5}>
        <Typography variant="caption" color="text.secondary">
          {rotulo}
        </Typography>
        {carregando ? (
          <Skeleton width={38} />
        ) : (
          <Typography variant="body2" fontWeight={700}>
            {texto}
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={carregando || valor === null ? 0 : Math.min(100, Math.max(0, valor))}
        color={cor}
        aria-label={`${rotulo}: ${carregando ? "carregando" : texto}`}
        sx={{ height: 6, borderRadius: 999, backgroundColor: "grey.100" }}
      />
    </Box>
  );
}

function EstadoCarregando({ texto }: { texto: string }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      minHeight={MIN_ALTURA_CONTEUDO}
    >
      <CircularProgress color="primary" />
      <Typography variant="body2" color="text.secondary">
        {texto}
      </Typography>
    </Box>
  );
}

function EstadoErro({ texto, onTentarNovamente }: { texto: string; onTentarNovamente: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onTentarNovamente} sx={{ width: "auto" }}>
          Tentar novamente
        </Button>
      }
    >
      {texto}
    </Alert>
  );
}

function EstadoVazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <Box minHeight={MIN_ALTURA_CONTEUDO} border="1px solid" borderColor="divider" borderRadius={2}>
      <NoData title={titulo} description={descricao} />
    </Box>
  );
}

export default function Home() {
  const navigate = useNavigate();

  // Inicializa o usuário de forma síncrona para evitar flash visual.
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

  const userName = user?.nome?.trim() || "Usuário";
  const perfil = String(user?.tipo_usuario || "")
    .trim()
    .toLowerCase();
  const isAluno = perfil === "aluno";
  const ehAdmin = perfil === "secretaria" || perfil === "administrador";
  const ehProfessor = perfil === "professor";

  // Cabeçalho do aluno (derivado do JWT via GET /me).
  const [studentInfo, setStudentInfo] = useState<InformacaoAluno | null>(null);

  // Aba Disciplinas.
  const [disciplinas, setDisciplinas] = useState<DisciplinaAluno[]>([]);
  const [carregandoDisciplinas, setCarregandoDisciplinas] = useState(isAluno);
  const [erroDisciplinas, setErroDisciplinas] = useState<string | null>(null);

  // Aba A Fazer.
  const [tarefas, setTarefas] = useState<TarefaAluno[]>([]);
  const [carregandoTarefas, setCarregandoTarefas] = useState(isAluno);
  const [erroTarefas, setErroTarefas] = useState<string | null>(null);

  const [tabValue, setTabValue] = useState(0);
  const [alertaFrequencia, setAlertaFrequencia] = useState(false);
  const [alertaNotas, setAlertaNotas] = useState(false);
  const [carregandoAlertas, setCarregandoAlertas] = useState(isAluno);
  const [erroAlertas, setErroAlertas] = useState<string | null>(null);
  const [frequenciaPorDisciplina, setFrequenciaPorDisciplina] = useState<Record<string, number | null>>({});
  const [notasPorDisciplina, setNotasPorDisciplina] = useState<Record<string, number | null>>({});

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Aba Disciplinas — disciplinas do período corrente (GET /me/disciplinas).
  const carregarDisciplinas = useCallback(async () => {
    setCarregandoDisciplinas(true);
    setErroDisciplinas(null);
    try {
      setDisciplinas(await homeAlunoApi.minhasDisciplinas());
    } catch {
      setErroDisciplinas("Não foi possível carregar suas disciplinas. Tente novamente.");
    } finally {
      setCarregandoDisciplinas(false);
    }
  }, []);

  // Aba A Fazer — avaliações a vencer (GET /me/tarefas).
  const carregarTarefas = useCallback(async () => {
    setCarregandoTarefas(true);
    setErroTarefas(null);
    try {
      setTarefas(await homeAlunoApi.minhasTarefas());
    } catch {
      setErroTarefas("Não foi possível carregar suas tarefas. Tente novamente.");
    } finally {
      setCarregandoTarefas(false);
    }
  }, []);

  const carregarAlertas = useCallback(async () => {
    setCarregandoAlertas(true);
    setErroAlertas(null);

    const [resultadoFrequencia, resultadoNotas] = await Promise.allSettled([
      frequenciaApi.minhaFrequencia(),
      notaApi.meuBoletim(),
    ]);

    if (resultadoFrequencia.status === "fulfilled") {
      setAlertaFrequencia(Boolean(resultadoFrequencia.value.possuiAlerta));
      setFrequenciaPorDisciplina(
        Object.fromEntries(
          resultadoFrequencia.value.consolidado.map((item) => [
            item.turmaDisciplinaId,
            item.percentual,
          ]),
        ),
      );
    }
    if (resultadoNotas.status === "fulfilled") {
      setAlertaNotas(Boolean(resultadoNotas.value.possuiAlerta));
      setNotasPorDisciplina(
        Object.fromEntries(
          resultadoNotas.value.disciplinas.map((item) => [
            item.turmaDisciplinaId,
            item.mediaParcial,
          ]),
        ),
      );
    }

    if (resultadoFrequencia.status === "rejected" || resultadoNotas.status === "rejected") {
      setErroAlertas("Não foi possível atualizar todos os alertas acadêmicos.");
    }

    setCarregandoAlertas(false);
  }, []);

  useEffect(() => {
    if (!isAluno) return;

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

    void carregarCabecalho();
    void carregarAlertas();
    void carregarDisciplinas();
    void carregarTarefas();
  }, [isAluno, carregarAlertas, carregarDisciplinas, carregarTarefas]);

  // Cabeçalho de boas-vindas com a mesma hierarquia para aluno e secretaria.
  const IconeCabecalho = isAluno ? GraduationCap : ehProfessor ? UserStar : Users;
  const subtituloCabecalho = isAluno
    ? "Acompanhe suas disciplinas, tarefas, frequência e notas."
    : ehAdmin
      ? "Acesse rapidamente as áreas administrativas do sistema."
      : ehProfessor
        ? "Acesse rapidamente suas turmas, avaliações e lançamentos."
        : "Bem-vindo de volta ao seu sistema acadêmico.";

  const cabecalho = (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, backgroundColor: "#FFF" }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        gap={2}
      >
        <Stack direction="row" alignItems="center" gap={2} sx={{ minWidth: 0 }}>
          <IconeBadge size={56}>
            <IconeCabecalho size={28} aria-hidden="true" />
          </IconeBadge>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h1" variant="h5" fontWeight={700}>
              Olá, {userName}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtituloCabecalho}
            </Typography>
          </Box>
        </Stack>

        {isAluno && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 3 }}
            divider={
              <Divider
                orientation="vertical"
                flexItem
                sx={{ display: { xs: "none", sm: "block" } }}
              />
            }
            sx={{ width: { xs: "100%", md: "auto" } }}
          >
            <ItemResumo rotulo="Matrícula" valor={valorOuTraco(studentInfo?.matricula)} />
            <ItemResumo rotulo="Curso" valor={valorOuTraco(studentInfo?.curso)} />
            <ItemResumo
              rotulo="Período"
              valor={studentInfo?.periodo ? `${studentInfo.periodo}º` : TRACO}
            />
          </Stack>
        )}
      </Stack>
    </Paper>
  );

  // Visão do aluno: alertas, cabeçalho e abas (Disciplinas / A Fazer).
  if (isAluno) {
    return (
      <Container sx={{ p: { xs: 2, md: 3 }, overflowY: "auto" }}>
        <Stack gap={3}>
          {cabecalho}

          <Stack gap={1.5} minHeight={carregandoAlertas ? 64 : 0}>
            {carregandoAlertas && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, backgroundColor: "#FFF" }}
              >
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <CircularProgress size={22} />
                  <Typography variant="body2" color="text.secondary">
                    Atualizando alertas acadêmicos...
                  </Typography>
                </Stack>
              </Paper>
            )}
            {!carregandoAlertas && erroAlertas && (
              <EstadoErro
                texto={erroAlertas}
                onTentarNovamente={() => void carregarAlertas()}
              />
            )}
            {alertaFrequencia && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate("/minha-frequencia")}
                    aria-label="Consultar minha frequência"
                    sx={{ width: "auto" }}
                  >
                    Consultar
                  </Button>
                }
              >
                Sua frequência está em 80% ou menos em pelo menos uma disciplina. Acompanhe seu
                desempenho.
              </Alert>
            )}
            {alertaNotas && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate("/minhas-notas")}
                    aria-label="Consultar minhas notas"
                    sx={{ width: "auto" }}
                  >
                    Consultar
                  </Button>
                }
              >
                Você possui ao menos uma disciplina com média parcial abaixo de 60%. Acompanhe seu
                desempenho.
              </Alert>
            )}
          </Stack>

          <Box>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                textColor="primary"
                indicatorColor="primary"
                aria-label="Conteúdo acadêmico"
              >
                <Tab
                  icon={<BookOpen size={18} aria-hidden="true" />}
                  iconPosition="start"
                  label="Disciplinas"
                  id="aba-disciplinas"
                  aria-controls="painel-disciplinas"
                />
                <Tab
                  icon={<ClipboardList size={18} aria-hidden="true" />}
                  iconPosition="start"
                  label="A Fazer"
                  id="aba-afazer"
                  aria-controls="painel-afazer"
                />
              </Tabs>
            </Box>

            <Box
              role="tabpanel"
              id="painel-disciplinas"
              aria-labelledby="aba-disciplinas"
              hidden={tabValue !== 0}
              sx={{ mt: 2 }}
            >
              {tabValue === 0 &&
                (carregandoDisciplinas ? (
                  <EstadoCarregando texto="Carregando suas disciplinas..." />
                ) : erroDisciplinas ? (
                  <EstadoErro texto={erroDisciplinas} onTentarNovamente={() => void carregarDisciplinas()} />
                ) : disciplinas.length === 0 ? (
                  <EstadoVazio
                    titulo="Nenhuma disciplina disponível no período atual"
                    descricao="Caso considere que isto é um erro, entre em contato com a secretaria acadêmica."
                  />
                ) : (
                  <Grid container spacing={2}>
                    {disciplinas.map((disc) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={disc.turmaDisciplinaId}>
                        <Paper
                          variant="outlined"
                          {...propsCartaoAcionavel(
                            `Ver notas de ${disc.nome}`,
                            () => navigate("/minhas-notas"),
                          )}
                          sx={{
                            ...sxCartaoAcionavel,
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: "#FFF",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                          }}
                        >
                          <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                            <IconeBadge>
                              <BookOpen size={22} aria-hidden="true" />
                            </IconeBadge>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography fontWeight={700} sx={{ wordBreak: "break-word" }}>
                                {disc.nome}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {disc.codigo}
                              </Typography>
                            </Box>
                          </Stack>
                          <Divider />
                          <Stack gap={0.5}>
                            <LinhaInfo rotulo="Professor" valor={disc.professorNome} />
                            <LinhaInfo rotulo="Turma/Semestre" valor={disc.turmaSigla} />
                            <LinhaInfo rotulo="Carga horária" valor={`${disc.cargaHoraria}h`} />
                          </Stack>
                          <Divider />
                          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} mt="auto">
                            <IndicadorPercentual
                              rotulo="Frequência atual"
                              valor={frequenciaPorDisciplina[disc.turmaDisciplinaId] ?? null}
                              carregando={carregandoAlertas}
                              cor={corFrequencia(
                                frequenciaPorDisciplina[disc.turmaDisciplinaId] ?? null,
                              )}
                            />
                            <IndicadorPercentual
                              rotulo="Porcentagem de notas"
                              valor={notasPorDisciplina[disc.turmaDisciplinaId] ?? null}
                              carregando={carregandoAlertas}
                              cor={
                                (notasPorDisciplina[disc.turmaDisciplinaId] ?? null) !== null &&
                                (notasPorDisciplina[disc.turmaDisciplinaId] ?? 0) < 60
                                  ? "error"
                                  : "primary"
                              }
                            />
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ))}
            </Box>

            <Box
              role="tabpanel"
              id="painel-afazer"
              aria-labelledby="aba-afazer"
              hidden={tabValue !== 1}
              sx={{ mt: 2 }}
            >
              {tabValue === 1 &&
                (carregandoTarefas ? (
                  <EstadoCarregando texto="Carregando suas tarefas..." />
                ) : erroTarefas ? (
                  <EstadoErro texto={erroTarefas} onTentarNovamente={() => void carregarTarefas()} />
                ) : tarefas.length === 0 ? (
                  <EstadoVazio
                    titulo="Nenhuma atividade pendente"
                    descricao="Novas atividades aparecerão aqui assim que forem publicadas."
                  />
                ) : (
                  <Grid container spacing={2}>
                    {tarefas.map((task) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={task.avaliacaoId}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: "#FFF",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box
                            display="flex"
                            alignItems="flex-start"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Typography fontWeight={700}>{task.titulo}</Typography>
                            <Chip
                              label={ROTULO_TIPO_AVALIACAO[task.tipo as TipoTarefa]}
                              size="small"
                              color={COR_TIPO_AVALIACAO[task.tipo as TipoTarefa]}
                              variant="outlined"
                              sx={{ fontWeight: 700, flexShrink: 0 }}
                            />
                          </Box>
                          <LinhaInfo rotulo="Disciplina" valor={task.disciplinaNome} />
                          <Box sx={{ mt: "auto", pt: 1 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              gap={1}
                            >
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={0.5}
                                color="text.secondary"
                              >
                                <Calendar size={14} aria-hidden="true" />
                                <Typography variant="body2">
                                  {formatarDataPtBr(task.dataVencimento)}
                                </Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={700}>
                                {formatarPontos(task.valor)}
                              </Typography>
                            </Stack>
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={0.5}
                              color="warning.main"
                              mt={0.5}
                            >
                              <Clock size={14} aria-hidden="true" />
                              <Typography variant="caption" fontWeight={700}>
                                Pendente
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ))}
            </Box>
          </Box>
        </Stack>
      </Container>
    );
  }

  // Visão da secretaria/administrador/professor: cabeçalho equivalente e atalhos autorizados.
  const atalhos: Atalho[] = [
    { label: "Tarefas", descricao: "Acompanhe atividades e pendências", href: "/tarefas/lista", icon: ClipboardList, podeVer: ehAdmin },
    { label: "Períodos Letivos", descricao: "Gerencie os períodos acadêmicos", href: "/periodos-letivos/lista", icon: Calendar, podeVer: ehAdmin },
    { label: "Status", descricao: "Configure status de matrícula", href: "/statusLista", icon: Info, podeVer: ehAdmin },
    { label: "Nova matrícula", descricao: "Matricular alunos em turmas", href: "/matricula/nova", icon: ClipboardCheck, podeVer: ehAdmin },
    { label: "Documentos", descricao: "Envio e consulta de documentos", href: "/documentos/envio", icon: FileText, podeVer: ehAdmin },
    { label: "Alunos", descricao: "Cadastro e consulta de alunos", href: "/alunos/lista", icon: Users, podeVer: ehAdmin },
    { label: "Usuários", descricao: "Gerencie os acessos ao sistema", href: "/usuarios/lista", icon: UserCog, podeVer: ehAdmin },
    { label: "Professores", descricao: "Gestão do corpo docente", href: "/professores/lista", icon: UserStar, podeVer: ehAdmin },
    { label: "Cursos", descricao: "Cursos e matrizes curriculares", href: "/cursos/lista", icon: GraduationCap, podeVer: ehAdmin },
    { label: "Disciplinas", descricao: "Catálogo de disciplinas", href: "/disciplinas/lista", icon: NotebookPen, podeVer: ehAdmin },
    { label: "Turmas", descricao: "Turmas e suas disciplinas", href: "/turmas/lista", icon: Layers, podeVer: ehAdmin },
    { label: "Avaliações", descricao: "Planeje provas e trabalhos", href: "/avaliacoes/lista", icon: ClipboardCheck, podeVer: ehAdmin || ehProfessor },
    { label: "Frequência", descricao: "Registre a chamada das turmas", href: "/frequencias/lista", icon: CalendarCheck, podeVer: ehAdmin || ehProfessor },
    { label: "Lançamento de Notas", descricao: "Lance e publique notas", href: "/notas/lancamento", icon: ClipboardPen, podeVer: ehAdmin || ehProfessor },
    { label: "Relatórios", descricao: "Indicadores e relatórios", href: "/relatorios/lista", icon: FileBarChart, podeVer: ehAdmin || ehProfessor },
  ].filter((atalho) => atalho.podeVer);

  return (
    <Container sx={{ p: { xs: 2, md: 3 }, overflowY: "auto" }}>
      <Stack gap={3}>
        {cabecalho}

        {atalhos.length > 0 && (
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Acesso rápido
            </Typography>
            <Grid container spacing={2}>
              {atalhos.map((atalho) => {
                const Icone = atalho.icon;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={atalho.href}>
                    <Card.Root
                      variant="outlined"
                      elevation={0}
                      {...propsCartaoAcionavel(
                        `Ir para ${atalho.label}`,
                        () => navigate(atalho.href),
                      )}
                      sx={{ ...sxCartaoAcionavel, backgroundColor: "#FFF" }}
                    >
                      <Card.Content sx={{ height: "100%" }}>
                        <Stack direction="row" alignItems="center" gap={2} sx={{ minWidth: 0 }}>
                          <IconeBadge>
                            <Icone size={22} aria-hidden="true" />
                          </IconeBadge>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={700}>
                              {atalho.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {atalho.descricao}
                            </Typography>
                          </Box>
                          <ArrowRight
                            size={18}
                            aria-hidden="true"
                            style={{ flexShrink: 0, opacity: 0.5 }}
                          />
                        </Stack>
                      </Card.Content>
                    </Card.Root>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
