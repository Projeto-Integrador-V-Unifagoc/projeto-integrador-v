import { useEffect, useState } from "react";
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Archive,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Info,
  Layers,
  NotebookPen,
  Users,
  UserStar,
} from "lucide-react";

interface SidebarProps {
  abrirSidebar: boolean;
}

export default function Sidebar({ abrirSidebar }: SidebarProps) {
  const [abrirCadastros, setAbrirCadastros] = useState(true);
  const [tipoUsuario, setTipoUsuario] = useState<string>("");

  useEffect(() => {
    const usuarioStorage = localStorage.getItem("@UniEduca:user");

    if (usuarioStorage) {
      try {
        const usuario = JSON.parse(usuarioStorage);
        const tipoNormalizado = String(usuario?.tipo_usuario || "")
          .trim()
          .toLowerCase();

        setTipoUsuario(tipoNormalizado);
      } catch (error) {
        setTipoUsuario("");
      }
    }
  }, []);

  const ehSecretaria = tipoUsuario === "secretaria";
  const ehProfessor = tipoUsuario === "professor";
  const ehAluno = tipoUsuario === "aluno";

  const podeVerCadastros = ehSecretaria || ehProfessor || ehAluno;

  return (
    <Box
      sx={(theme) => ({
        borderRight: `1px solid ${theme.palette.grey[200]}`,
        width: abrirSidebar ? "260px" : "70px",
        height: "100vh",
        backgroundColor: "white",
        transition: "all 0.3s ease",
        overflowX: "hidden",
        position: "fixed",
        paddingTop: 7,
        paddingLeft: 1,
      })}
    >
      <List component="nav">
        <ListItemButton
          href="/tarefas/lista"
          sx={{ justifyContent: abrirSidebar ? "initial" : "center" }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: abrirSidebar ? 2 : "auto",
              justifyContent: "center",
            }}
          >
            <ClipboardList size={17} />
          </ListItemIcon>

          <ListItemText
            primary="Tarefas"
            sx={{
              opacity: abrirSidebar ? 1 : 0,
              transition: "opacity 0.2s",
            }}
            primaryTypographyProps={{ fontSize: 14 }}
          />
        </ListItemButton>

        {(ehSecretaria || ehProfessor) && (
          <ListItemButton
            href="/frequencias/lista"
            sx={{ justifyContent: abrirSidebar ? "initial" : "center" }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: abrirSidebar ? 2 : "auto",
                justifyContent: "center",
              }}
            >
              <CalendarCheck size={17} />
            </ListItemIcon>

            <ListItemText
              primary="Frequência"
              sx={{
                opacity: abrirSidebar ? 1 : 0,
                transition: "opacity 0.2s",
              }}
              primaryTypographyProps={{ fontSize: 14 }}
            />
          </ListItemButton>
        )}

        {podeVerCadastros && (
          <>
            <ListItemButton
              onClick={() => setAbrirCadastros(!abrirCadastros)}
              sx={(theme) => ({
                borderRadius: "3px",
                justifyContent: abrirSidebar ? "initial" : "center",
                "&:focus": {
                  border: `1px solid ${theme.palette.primary.main}`,
                  backgroundColor: theme.palette.primary.light,
                },
              })}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: abrirSidebar ? 2 : "auto",
                  justifyContent: "center",
                }}
              >
                <Archive size={17} />
              </ListItemIcon>

              <ListItemText
                primary="Cadastros"
                sx={{
                  opacity: abrirSidebar ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
                primaryTypographyProps={{ fontSize: 14 }}
              />

              {abrirSidebar &&
                (abrirCadastros ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                ))}
            </ListItemButton>

            <Collapse
              in={abrirCadastros && abrirSidebar}
              timeout="auto"
              unmountOnExit
            >
              <List component="div" disablePadding>
                {ehSecretaria && (
                  <ListItemButton sx={{ pl: 4 }} href="/usuarios/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Users size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Usuários"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {ehSecretaria && (
                  <ListItemButton sx={{ pl: 4 }} href="/professores/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <UserStar size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Professores"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor) && (
                  <ListItemButton sx={{ pl: 4 }} href="/alunos/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Users size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Alunos"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {ehSecretaria && (
                  <ListItemButton sx={{ pl: 4 }} href="/matricula/nova">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ClipboardCheck size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Matrícula"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor || ehAluno) && (
                  <ListItemButton sx={{ pl: 4 }} href="/documentos/envio">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <FileText size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Documentos"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor || ehAluno) && (
                  <ListItemButton sx={{ pl: 4 }} href="/avaliacoes/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ClipboardCheck size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Avaliações"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor || ehAluno) && (
                  <ListItemButton sx={{ pl: 4 }} href="/notas/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ClipboardList size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Notas"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor || ehAluno) && (
                  <ListItemButton sx={{ pl: 4 }} href="/cursos/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <GraduationCap size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Cursos"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor || ehAluno) && (
                  <ListItemButton sx={{ pl: 4 }} href="/disciplinas/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <NotebookPen size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Disciplinas"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {(ehSecretaria || ehProfessor || ehAluno) && (
                  <ListItemButton sx={{ pl: 4 }} href="/status">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Info size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Status"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {ehSecretaria && (
                  <ListItemButton sx={{ pl: 4 }} href="/periodos-letivos/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Layers size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Períodos Letivos"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}

                {ehSecretaria && (
                  <ListItemButton sx={{ pl: 4 }} href="/turmas/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Users size={17} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Turmas"
                      primaryTypographyProps={{ fontSize: 14 }}
                    />
                  </ListItemButton>
                )}
              </List>
            </Collapse>
          </>
        )}
      </List>
    </Box>
  );
}
