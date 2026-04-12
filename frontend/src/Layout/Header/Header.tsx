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

export default function Header() {
    const navegar = useNavigate();
    const [userName, setUserName] = useState('Usuário');

    useEffect(() => {
        const storedUser = localStorage.getItem('@UniEduca:user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setUserName(user.nome); //
        }
    }, []);

    function navegarParaHome(){
        navegar("/home");
    }

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
                        <Button sx={{ width: 'auto' }} onClick={handleLogout}>
                            <UserMenu />
                            {userName}
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>
        </Box>
    );
}