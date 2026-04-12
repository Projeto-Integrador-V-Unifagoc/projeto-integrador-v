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
    ClipboardList, 
    GraduationCap, 
    NotebookPen, 
    Users, 
    UserStar,
    Settings // Adicionei este para diferenciar Usuários de Alunos
} from "lucide-react";

export default function Sidebar() {
    const [abrirMenu, setAbrirMenu] = useState(true);

    const clicarMenu = () => {
        setAbrirMenu(!abrirMenu);
    };

    return (
        <Box
            sx={(theme) => ({
                borderRight: `1px solid ${theme.palette.grey[200]}`,
                width: '260px',
                height: '100vh',
                backgroundColor: 'white', // Garante o fundo branco
            })}
            paddingTop={7}
            paddingLeft={1}            
            position='fixed'
        >
            <List component='nav'>
                {/* Menu Tarefas */}
                <ListItemButton href="/tarefas/lista">
                    <ListItemIcon sx={{ minWidth: 28 }}>
                        <ClipboardList size={17} />
                    </ListItemIcon>
                    <ListItemText 
                        primary='Tarefas' 
                        primaryTypographyProps={{ fontSize: 14 }} 
                    />
                </ListItemButton>

                {/* Menu Colapsável Cadastros */}
                <ListItemButton 
                    onClick={clicarMenu} 
                    sx={(theme) => ({
                        borderRadius: '3px',
                        "&:focus": {
                            border: `1px solid ${theme.palette.primary.main}`,
                            backgroundColor: theme.palette.primary.light
                        }
                    })}
                >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                        <Archive size={17} />
                    </ListItemIcon>
                    <ListItemText 
                        primary='Cadastros' 
                        primaryTypographyProps={{ fontSize: 14 }} 
                    />
                    {abrirMenu ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </ListItemButton>

                <Collapse in={abrirMenu} timeout='auto' unmountOnExit>
                    <List component='div' disablePadding>

                        <ListItemButton 
                            href="/usuarios/lista"
                            sx={{ pl: 4 }}
                        >
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <Users size={17} />
                            </ListItemIcon>
                            <ListItemText 
                                primary='Usuários' 
                                primaryTypographyProps={{ fontSize: 14 }} 
                            />
                        </ListItemButton>

                        <ListItemButton sx={{ pl: 4 }} href="/professores/lista">
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <UserStar size={17} />
                            </ListItemIcon>
                            <ListItemText 
                                primary='Professores' 
                                primaryTypographyProps={{ fontSize: 14 }} 
                            />
                        </ListItemButton>

                        <ListItemButton sx={{ pl: 4 }} href="/alunos/lista">
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <Users size={17} />
                            </ListItemIcon>
                            <ListItemText 
                                primary='Alunos' 
                                primaryTypographyProps={{ fontSize: 14 }} 
                            />
                        </ListItemButton>

                        <ListItemButton sx={{ pl: 4 }} href="/cursos/lista">
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <GraduationCap size={17} />
                            </ListItemIcon>
                            <ListItemText 
                                primary='Cursos' 
                                primaryTypographyProps={{ fontSize: 14 }} 
                            />
                        </ListItemButton>

                        <ListItemButton sx={{ pl: 4 }} href="/disciplinas/lista">
                            <ListItemIcon sx={{ minWidth: 28 }}>
                                <NotebookPen size={17} />
                            </ListItemIcon>
                            <ListItemText 
                                primary='Disciplinas' 
                                primaryTypographyProps={{ fontSize: 14 }} 
                            />
                        </ListItemButton>

                    </List>
                </Collapse>
            </List>
        </Box>
    );
}