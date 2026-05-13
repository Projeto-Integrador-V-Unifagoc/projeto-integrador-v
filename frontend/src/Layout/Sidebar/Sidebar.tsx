import { useState } from "react";

import {
    Box,
    Collapse,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText
} from "@mui/material";
import {
    Archive,
    ChevronDown,
    ChevronUp,
    ClipboardCheck,
    ClipboardList,
    FileText,
    GraduationCap,
    NotebookPen,
    Users,
    UserStar
} from "lucide-react";

interface SidebarProps {
    abrirSidebar: boolean;
}

export default function Sidebar({ abrirSidebar }: SidebarProps) {
    const [abrirMenu, setAbrirMenu] = useState(true)

    const clicarMenu = () => {
        setAbrirMenu(!abrirMenu)
    }

    return (
        <>
            <Box
                sx={(theme) => ({
                    borderRight: `1px solid ${theme.palette.grey[200]}`,
                    width: abrirSidebar ? '260px' : '70px',
                    height: '100vh',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                })}
                paddingTop={7}
                paddingLeft={1}
                position='fixed'
            >
                <List component='nav'>

                    <ListItemButton
                        href="/tarefas/lista"
                        sx={{
                            justifyContent: abrirSidebar ? 'initial' : 'center'
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: abrirSidebar ? 2 : 'auto',
                                justifyContent: 'center'
                            }}
                        >
                            <ClipboardList size={17} />
                        </ListItemIcon>
                        <ListItemText
                            primary='Tarefas'
                            sx={{
                                opacity: abrirSidebar ? 1 : 0,
                                transition: 'opacity 0.2s',
                            }}
                            primaryTypographyProps={{
                                fontSize: 14
                            }}
                        />
                    </ListItemButton>


                    <ListItemButton
                        onClick={clicarMenu}
                        sx={(theme) => ({
                            borderRadius: '3px',
                            justifyContent: abrirSidebar ? 'initial' : 'center',
                            "&:focus": {
                                border: `1px solid ${theme.palette.primary.main}`,
                                backgroundColor: theme.palette.primary.light
                            }
                        })}
                    >
                        <ListItemIcon
                            sx={{
                                minWidth: 0,
                                mr: abrirSidebar ? 2 : 'auto',
                                justifyContent: 'center'
                            }}
                        >
                            <Archive size={17} />
                        </ListItemIcon>

                        <ListItemText
                            primary='Cadastros'
                            sx={{
                                opacity: abrirSidebar ? 1 : 0,
                                transition: 'opacity 0.2s',
                            }}
                            primaryTypographyProps={{
                                fontSize: 14
                            }}
                        />

                        {abrirMenu ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </ListItemButton>

                    <Collapse in={abrirMenu} timeout='auto' unmountOnExit >
                        <List component='div' disablePadding >

                            <ListItemButton
                                sx={{
                                    pl: abrirSidebar ? 4 : 2,
                                    justifyContent: abrirSidebar ? 'initial' : 'center',
                                }}
                                href="/professores/lista"
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: abrirSidebar ? 2 : 'auto',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <UserStar size={17} />
                                </ListItemIcon>
                                <ListItemText
                                    primary='Professores'
                                    sx={{
                                        opacity: abrirSidebar ? 1 : 0,
                                        transition: 'opacity 0.2s',
                                    }}
                                    primaryTypographyProps={{
                                        fontSize: 14,
                                    }}
                                />
                            </ListItemButton>

                            <ListItemButton
                                href="/alunos/lista"
                                sx={{
                                    pl: abrirSidebar ? 4 : 2,
                                    justifyContent: abrirSidebar ? 'initial' : 'center',
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: abrirSidebar ? 2 : 'auto',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Users size={17} />
                                </ListItemIcon>
                                <ListItemText
                                    primary='Alunos'
                                    sx={{
                                        opacity: abrirSidebar ? 1 : 0,
                                        transition: 'opacity 0.2s',
                                    }}
                                    primaryTypographyProps={{
                                        fontSize: 14
                                    }}
                                />
                            </ListItemButton>

                            <ListItemButton
                                href="/matricula/nova"
                                sx={{ pl: abrirSidebar ? 4 : 2, justifyContent: abrirSidebar ? 'initial' : 'center' }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, mr: abrirSidebar ? 2 : 'auto', justifyContent: 'center' }}>
                                    <ClipboardCheck size={17} />
                                </ListItemIcon>
                                <ListItemText primary='Matrícula' sx={{ opacity: abrirSidebar ? 1 : 0, transition: 'opacity 0.2s' }} primaryTypographyProps={{ fontSize: 14 }} />
                            </ListItemButton>

                            <ListItemButton
                                href="/documentos/envio"
                                sx={{ pl: abrirSidebar ? 4 : 2, justifyContent: abrirSidebar ? 'initial' : 'center' }}
                            >
                                <ListItemIcon sx={{ minWidth: 0, mr: abrirSidebar ? 2 : 'auto', justifyContent: 'center' }}>
                                    <FileText size={17} />
                                </ListItemIcon>
                                <ListItemText primary='Documentos' sx={{ opacity: abrirSidebar ? 1 : 0, transition: 'opacity 0.2s' }} primaryTypographyProps={{ fontSize: 14 }} />
                            </ListItemButton>

                            <ListItemButton
                                href="/avaliacoes/lista"
                                sx={{
                                    pl: abrirSidebar ? 4 : 2,
                                    justifyContent: abrirSidebar ? 'initial' : 'center',
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: abrirSidebar ? 2 : 'auto',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <ClipboardCheck size={17} />
                                </ListItemIcon>
                                <ListItemText
                                    primary='Avaliacoes'
                                    sx={{
                                        opacity: abrirSidebar ? 1 : 0,
                                        transition: 'opacity 0.2s',
                                    }}
                                    primaryTypographyProps={{
                                        fontSize: 14
                                    }}
                                />
                            </ListItemButton>

                            <ListItemButton
                                sx={{
                                    pl: abrirSidebar ? 4 : 2,
                                    justifyContent: abrirSidebar ? 'initial' : 'center',
                                }}
                                href="/cursos/lista"
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: abrirSidebar ? 2 : 'auto',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <GraduationCap size={17} />
                                </ListItemIcon>
                                <ListItemText
                                    primary='Cursos'
                                    sx={{
                                        opacity: abrirSidebar ? 1 : 0,
                                        transition: 'opacity 0.2s',
                                    }}
                                    primaryTypographyProps={{
                                        fontSize: 14
                                    }}
                                />
                            </ListItemButton>

                            <ListItemButton
                                sx={{
                                    pl: abrirSidebar ? 4 : 2,
                                    justifyContent: abrirSidebar ? 'initial' : 'center',
                                }}
                                href="/disciplinas/lista"
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: abrirSidebar ? 2 : 'auto',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <NotebookPen size={17} />
                                </ListItemIcon>
                                <ListItemText
                                    primary='Disciplinas'
                                    sx={{
                                        opacity: abrirSidebar ? 1 : 0,
                                        transition: 'opacity 0.2s',
                                    }}
                                    primaryTypographyProps={{
                                        fontSize: 14
                                    }}
                                />
                            </ListItemButton>

                        </List>
                    </Collapse>
                </List>

            </Box>
        </>
    )
}
