import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import UserMenu from "./UserMenu";

import { 
    AppBar, 
    Box, 
    IconButton, 
    Stack, 
    Toolbar, 
    Typography 
} from "@mui/material";

import { Menu } from "lucide-react";

// 1. Definição da Interface
interface HeaderProps {
    clicarMenu: () => void;
}

export default function Header({ clicarMenu }: HeaderProps) {
    const navegar = useNavigate();
    const [userName, setUserName] = useState('Usuário');

    // 2. Lógica para buscar o nome do usuário logado
    useEffect(() => {
        const storedUser = localStorage.getItem('@UniEduca:user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                // Se o campo 'nome' existir no seu banco/localStorage, ele aparecerá aqui
                if (user.nome) {
                    setUserName(user.nome);
                }
            } catch (error) {
                console.error("Erro ao ler dados do usuário", error);
            }
        }
    }, []);

    function navegarParaHome(){
        navegar("/");
    }

    // 3. Lógica de Logout
    function handleLogout() {
        localStorage.removeItem('@UniEduca:token');
        localStorage.removeItem('@UniEduca:user');
        navegar("/login");
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar
                position="fixed"
                sx={(theme) => ({
                    backgroundColor: theme.palette.background.default,
                    boxShadow: 'none',
                    borderBottom: `1px solid ${theme.palette.grey[200]}`,
                    height: 49,
                    display: 'flex',
                    justifyContent: 'center'
                })}
            >
                <Toolbar>
                    <IconButton
                        size="small"
                        edge='start'
                        aria-label="menu"
                        sx={{ mr: 2 }}
                        onClick={clicarMenu}
                    >
                        <Menu size={19} />
                    </IconButton>

                    <Typography
                        component='div'
                        sx={(theme) => ({
                            color: theme.palette.primary.main,
                            flexGrow: 1,
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        })}
                        onClick={navegarParaHome}
                    >
                        UniEduca
                    </Typography>

                    <Stack flexDirection='row' alignItems='center'>
                       <Button sx={{ width: 'auto' }} onClick={() => navegar("/perfil")}>
                            <UserMenu />
                            <Box component="span" sx={{ ml: 1 }}>
                                {userName}
                            </Box>
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>
        </Box>
    );
}