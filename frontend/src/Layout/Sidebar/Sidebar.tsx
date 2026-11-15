import { useState } from "react";
import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ClipboardPen,
  FileBarChart,
  FileText,
  GraduationCap,
  Info,
  Layers,
  NotebookPen,
  Settings,
  Target,
  Users,
  UserStar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "react-router-dom";

interface SidebarProps {
  expandido: boolean;
  onNavigate?: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  podeVer: boolean;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  itens: MenuItem[];
}

function rotaAtiva(pathname: string, href: string) {
  if (pathname === href) return true;
  const segmentoBase = href.split("/").filter(Boolean)[0];
  return Boolean(segmentoBase && pathname.startsWith(`/${segmentoBase}/`));
}

export default function Sidebar({ expandido, onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const tipoUsuario = (() => {
    const usuarioStorage = localStorage.getItem("@UniEduca:user");
    if (usuarioStorage) {
      try {
        const usuario = JSON.parse(usuarioStorage);
        return String(usuario?.tipo_usuario || "")
          .trim()
          .toLowerCase();
      } catch { return ""; }
    }
    return "";
  })();

  const ehSecretaria = tipoUsuario === "secretaria";
  const ehProfessor = tipoUsuario === "professor";
  const ehAluno = tipoUsuario === "aluno";
  const ehAdministrador = tipoUsuario === "administrador";

  // Secretaria e Administrador têm acesso total.
  const ehAdmin = ehSecretaria || ehAdministrador;

  const itens = {
    tarefas: { label: "Tarefas", href: "/tarefas/lista", icon: ClipboardList, podeVer: ehAdmin },
    periodos: { label: "Períodos Letivos", href: "/periodos-letivos/lista", icon: Layers, podeVer: ehAdmin },
    status: { label: "Status", href: "/statusLista", icon: Info, podeVer: ehAdmin },
    disciplinas: { label: "Disciplinas", href: "/disciplinas/lista", icon: NotebookPen, podeVer: ehAdmin },
    competencias: { label: "Competências", href: "/competencias/lista", icon: Target, podeVer: ehAdmin },
    cursos: { label: "Cursos", href: "/cursos/lista", icon: GraduationCap, podeVer: ehAdmin },
    professores: { label: "Professores", href: "/professores/lista", icon: UserStar, podeVer: ehAdmin },
    turmas: { label: "Turmas", href: "/turmas/lista", icon: Users, podeVer: ehAdmin },
    matricula: { label: "Matrícula", href: "/matricula/lista", icon: ClipboardCheck, podeVer: ehAdmin },
    documentos: { label: "Documentos", href: "/documentos/envio", icon: FileText, podeVer: ehAdmin },
    alunos: { label: "Alunos", href: "/alunos/lista", icon: Users, podeVer: ehAdmin },
    usuarios: { label: "Usuários", href: "/usuarios/lista", icon: Users, podeVer: ehAdmin },
    avaliacoes: { label: "Avaliações", href: "/avaliacoes/lista", icon: ClipboardCheck, podeVer: ehAdmin || ehProfessor },
    frequencia: { label: "Frequência", href: "/frequencias/lista", icon: CalendarCheck, podeVer: ehAdmin || ehProfessor },
    minhaAgenda: { label: "Minha Agenda", href: "/minha-agenda", icon: CalendarDays, podeVer: ehAluno },
    minhaFrequencia: { label: "Minha Frequência", href: "/minha-frequencia", icon: CalendarCheck, podeVer: ehAluno },
    lancamentoNotas: { label: "Lançamento de Notas", href: "/notas/lancamento", icon: ClipboardPen, podeVer: ehAdmin || ehProfessor },
    minhasNotas: { label: "Minhas Notas", href: "/minhas-notas", icon: ClipboardPen, podeVer: ehAluno },
    relatorios: { label: "Relatórios", href: "/relatorios/lista", icon: FileBarChart, podeVer: ehAdmin || ehProfessor || ehAluno },
  } satisfies Record<string, MenuItem>;

  const grupos: MenuGroup[] = [
    {
      id: "academico",
      label: "Estrutura acadêmica",
      icon: BookOpen,
      itens: [itens.cursos, itens.disciplinas, itens.competencias, itens.periodos, itens.turmas],
    },
    {
      id: "pessoas",
      label: "Pessoas e vínculos",
      icon: Users,
      itens: [itens.alunos, itens.professores, itens.matricula, itens.documentos],
    },
    {
      id: "ensino",
      label: "Ensino",
      icon: ClipboardPen,
      itens: [itens.avaliacoes, itens.frequencia, itens.lancamentoNotas],
    },
    {
      id: "administracao",
      label: "Administração",
      icon: Settings,
      itens: [itens.tarefas, itens.status, itens.usuarios],
    },
    {
      id: "vida-academica",
      label: "Minha vida acadêmica",
      icon: GraduationCap,
      itens: [itens.minhaAgenda, itens.minhaFrequencia, itens.minhasNotas],
    },
    {
      id: "analises",
      label: "Análises e relatórios",
      icon: FileBarChart,
      itens: [itens.relatorios],
    },
  ].map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => item.podeVer) }))
    .filter((grupo) => grupo.itens.length > 0);

  const grupoAtivo = grupos.find((grupo) => grupo.itens.some((item) => rotaAtiva(pathname, item.href)))?.id;
  const grupoInicial = grupoAtivo ?? grupos[0]?.id;
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(
    () => grupoInicial ? { [grupoInicial]: true } : {},
  );

  const alternarGrupo = (id: string) => {
    setGruposAbertos((atuais) => atuais[id] ? {} : { [id]: true });
  };

  return (
    <List component="nav" aria-label="Menu principal" sx={{ px: 0.5, py: 1 }}>
      {grupos.map(({ id, label, icon: GroupIcon, itens: itensGrupo }) => {
        const aberto = Boolean(gruposAbertos[id]);
        const contemPaginaAtual = id === grupoAtivo;
        return (
          <li key={id}>
            <Tooltip title={expandido ? "" : label} placement="right" disableHoverListener={expandido}>
              <ListItemButton
                aria-expanded={aberto}
                aria-controls={`menu-grupo-${id}`}
                onClick={() => alternarGrupo(id)}
                sx={{
                  minHeight: 42,
                  mx: 0.5,
                  mb: 0.25,
                  px: expandido ? 1.5 : 1,
                  borderRadius: 2,
                  justifyContent: expandido ? "initial" : "center",
                  bgcolor: aberto ? "action.hover" : "transparent",
                  color: contemPaginaAtual ? "primary.main" : "text.primary",
                  "& .MuiListItemIcon-root": {
                    color: contemPaginaAtual ? "primary.main" : "inherit",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: expandido ? 1.5 : "auto", justifyContent: "center" }}>
                  <GroupIcon size={18} />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  sx={{ opacity: expandido ? 1 : 0, transition: "opacity 0.2s" }}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 750, noWrap: true }}
                />
                {expandido && (aberto ? <ChevronDown size={17} /> : <ChevronRight size={17} />)}
              </ListItemButton>
            </Tooltip>

            <Collapse in={aberto} timeout="auto" unmountOnExit>
              <List id={`menu-grupo-${id}`} component="div" disablePadding>
                {itensGrupo.map(({ label: itemLabel, href, icon: Icon }) => (
                  <Tooltip
                    key={href}
                    title={expandido ? "" : itemLabel}
                    placement="right"
                    disableHoverListener={expandido}
                  >
                    <ListItemButton
                      href={href}
                      selected={rotaAtiva(pathname, href)}
                      onClick={onNavigate}
                      sx={{
                        minHeight: 40,
                        mx: 0.5,
                        mb: 0.25,
                        pl: expandido ? 3 : 1,
                        pr: expandido ? 1.5 : 1,
                        borderRadius: 2,
                        justifyContent: expandido ? "initial" : "center",
                        transition: "background-color .15s ease, color .15s ease, box-shadow .15s ease",
                        "&.Mui-selected": {
                          bgcolor: "primary.main",
                          color: "grey.900",
                          boxShadow: "0 3px 10px rgba(5, 181, 230, .32)",
                          "& .MuiListItemIcon-root": { color: "grey.900" },
                          "& .MuiListItemText-primary": { fontWeight: 800 },
                          "&:hover": { bgcolor: "primary.light" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, mr: expandido ? 1.5 : "auto", justifyContent: "center" }}>
                        <Icon size={17} />
                      </ListItemIcon>
                      <ListItemText
                        primary={itemLabel}
                        sx={{ opacity: expandido ? 1 : 0, transition: "opacity 0.2s" }}
                        primaryTypographyProps={{ fontSize: 14, noWrap: true }}
                      />
                    </ListItemButton>
                  </Tooltip>
                ))}
              </List>
            </Collapse>
          </li>
        );
      })}
    </List>
  );
}
