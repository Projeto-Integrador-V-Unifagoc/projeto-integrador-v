import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
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
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  UserStar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  expandido: boolean;
  onAlternar?: () => void;
}

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  podeVer: boolean;
}

export default function Sidebar({ expandido, onAlternar }: SidebarProps) {
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
      href: ehAdmin ? "/matricula/lista" : "/matricula/nova",
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
    <>
      {onAlternar && (
        <Box
          sx={{
            display: "flex",
            justifyContent: expandido ? "flex-end" : "center",
            px: expandido ? 1.5 : 0,
            pb: 0.5,
          }}
        >
          <Tooltip title={expandido ? "Recolher menu" : "Expandir menu"} placement="right">
            <IconButton
              size="small"
              onClick={onAlternar}
              aria-label={expandido ? "Recolher menu" : "Expandir menu"}
              sx={(t) => ({
                border: `1px solid ${t.palette.grey[300]}`,
                borderRadius: 1.5,
                color: t.palette.text.secondary,
                "&:hover": {
                  borderColor: t.palette.primary.main,
                  color: t.palette.primary.main,
                },
              })}
            >
              {expandido ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <List component="nav">
        {itens
          .filter((item) => item.podeVer)
          .map(({ label, href, icon: Icon }) => (
            <Tooltip
              key={href}
              title={expandido ? "" : label}
              placement="right"
              disableHoverListener={expandido}
            >
              <ListItemButton
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
            </Tooltip>
          ))}
      </List>
    </>
  );
}
