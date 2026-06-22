import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
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
  Users,
  UserStar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  expandido: boolean;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  podeVer: boolean;
}

export default function Sidebar({ expandido }: SidebarProps) {
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

  const itens: MenuItem[] = [
    {
      label: "Tarefas",
      href: "/tarefas/lista",
      icon: ClipboardList,
      podeVer: ehAdmin,
    },
    {
      label: "Períodos Letivos",
      href: "/periodos-letivos/lista",
      icon: Layers,
      podeVer: ehAdmin,
    },
    {
      label: "Status",
      href: "/statusLista",
      icon: Info,
      podeVer: ehAdmin,
    },
    {
      label: "Disciplinas",
      href: "/disciplinas/lista",
      icon: NotebookPen,
      podeVer: ehAdmin,
    },
    {
      label: "Cursos",
      href: "/cursos/lista",
      icon: GraduationCap,
      podeVer: ehAdmin,
    },
    {
      label: "Professores",
      href: "/professores/lista",
      icon: UserStar,
      podeVer: ehAdmin,
    },
    {
      label: "Turmas",
      href: "/turmas/lista",
      icon: Users,
      podeVer: ehAdmin,
    },
    {
      label: "Matrícula",
      href: "/matricula/nova",
      icon: ClipboardCheck,
      podeVer: ehAdmin || ehAluno,
    },
    {
      label: "Documentos",
      href: "/documentos/envio",
      icon: FileText,
      podeVer: ehAdmin,
    },
    {
      label: "Alunos",
      href: "/alunos/lista",
      icon: Users,
      podeVer: ehAdmin,
    },
    {
      label: "Usuários",
      href: "/usuarios/lista",
      icon: Users,
      podeVer: ehAdmin,
    },
    {
      label: "Avaliações",
      href: "/avaliacoes/lista",
      icon: ClipboardCheck,
      podeVer: ehAdmin || ehProfessor,
    },
    {
      label: "Frequência",
      href: "/frequencias/lista",
      icon: CalendarCheck,
      podeVer: ehAdmin || ehProfessor,
    },
    {
      label: "Minha Frequência",
      href: "/minha-frequencia",
      icon: CalendarCheck,
      podeVer: ehAluno,
    },
    {
      label: "Lançamento de Notas",
      href: "/notas/lancamento",
      icon: ClipboardPen,
      podeVer: ehAdmin || ehProfessor,
    },
    {
      label: "Minhas Notas",
      href: "/minhas-notas",
      icon: ClipboardPen,
      podeVer: ehAluno,
    },
    {
      label: "Relatórios",
      href: "/relatorios/lista",
      icon: FileBarChart,
      podeVer: ehAdmin || ehProfessor || ehAluno,
    },
  ];

  return (
    <List component="nav">
      {itens
        .filter((item) => item.podeVer)
        .map(({ label, href, icon: Icon }) => (
          <ListItemButton
            key={href}
            href={href}
            sx={{ justifyContent: expandido ? "initial" : "center" }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: expandido ? 2 : "auto",
                justifyContent: "center",
              }}
            >
              <Icon size={17} />
            </ListItemIcon>

            <ListItemText
              primary={label}
              sx={{
                opacity: expandido ? 1 : 0,
                transition: "opacity 0.2s",
              }}
              primaryTypographyProps={{ fontSize: 14, noWrap: true }}
            />
          </ListItemButton>
        ))}
    </List>
  );
}
