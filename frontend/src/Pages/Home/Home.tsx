import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
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
import { Card } from "../../components/Card";
import Container from "../../components/Container";
import StudentDashboard from "./StudentDashboard";

interface UsuarioLocal {
  nome?: string;
  email?: string;
  tipo_usuario?: string;
}

interface Atalho {
  label: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  podeVer: boolean;
}

const sxCartaoAcionavel = {
  cursor: "pointer",
  height: "100%",
  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: 3, borderColor: "primary.main" },
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

function IconeBadge({ children }: { children: ReactNode }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        width: 48,
        height: 48,
        borderRadius: 2,
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

export default function Home() {
  const navigate = useNavigate();
  const [user] = useState<UsuarioLocal | null>(() => {
    const stored = localStorage.getItem("@UniEduca:user");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as UsuarioLocal;
    } catch {
      return null;
    }
  });

  const userName = user?.nome?.trim() || "Usuário";
  const perfil = String(user?.tipo_usuario || "").trim().toLowerCase();
  const isAluno = perfil === "aluno";
  const ehAdmin = perfil === "secretaria" || perfil === "administrador";
  const ehProfessor = perfil === "professor";

  if (isAluno) return <StudentDashboard userName={userName} />;

  const atalhos: Atalho[] = [
    { label: "Tarefas", descricao: "Acompanhe atividades e pendências", href: "/tarefas/lista", icon: ClipboardList, podeVer: ehAdmin },
    { label: "Períodos Letivos", descricao: "Gerencie os períodos acadêmicos", href: "/periodos-letivos/lista", icon: Calendar, podeVer: ehAdmin },
    { label: "Status", descricao: "Configure status de matrícula", href: "/statusLista", icon: Info, podeVer: ehAdmin },
    { label: "Nova inscrição", descricao: "Cadastrar candidato pelo formulário público", href: "/inscricao", icon: ClipboardCheck, podeVer: ehAdmin },
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

  const IconeCabecalho = ehProfessor ? UserStar : Users;
  const subtitulo = ehAdmin
    ? "Acesse rapidamente as áreas administrativas do sistema."
    : ehProfessor
      ? "Acesse rapidamente suas turmas, avaliações e lançamentos."
      : "Bem-vindo de volta ao seu sistema acadêmico.";

  return (
    <Container sx={{ p: { xs: 2, md: 3 }, overflowY: "auto" }}>
      <Stack gap={3}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, bgcolor: "#fff" }}>
          <Stack direction="row" alignItems="center" gap={2}>
            <IconeBadge><IconeCabecalho size={24} /></IconeBadge>
            <Box>
              <Typography component="h1" variant="h5" fontWeight={700}>Olá, {userName}!</Typography>
              <Typography variant="body2" color="text.secondary">{subtitulo}</Typography>
            </Box>
          </Stack>
        </Paper>

        {atalhos.length > 0 && (
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>Acesso rápido</Typography>
            <Grid container spacing={2}>
              {atalhos.map((atalho) => {
                const Icone = atalho.icon;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={atalho.href}>
                    <Card.Root
                      variant="outlined"
                      elevation={0}
                      {...propsCartaoAcionavel(`Ir para ${atalho.label}`, () => navigate(atalho.href))}
                      sx={{ ...sxCartaoAcionavel, bgcolor: "#fff" }}
                    >
                      <Card.Content sx={{ height: "100%" }}>
                        <Stack direction="row" alignItems="center" gap={2}>
                          <IconeBadge><Icone size={22} /></IconeBadge>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={700}>{atalho.label}</Typography>
                            <Typography variant="body2" color="text.secondary">{atalho.descricao}</Typography>
                          </Box>
                          <ArrowRight size={18} aria-hidden="true" style={{ opacity: 0.5 }} />
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
