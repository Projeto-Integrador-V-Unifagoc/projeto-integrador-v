import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    Box,
    IconButton,
    ListItemIcon,
    Menu,
    MenuItem,
    Stack,
    Typography
} from "@mui/material";

import { AccountCircle } from "@mui/icons-material";

import {
    CircleQuestionMark,
    CircleUserRound,
    LogOut,
    NotebookPen
} from "lucide-react";

import { theme } from "../../theme";

export default function UserMenu() {
    const navigate = useNavigate();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const storedUser = localStorage.getItem('@UniEduca:user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    function handleClick(event: React.MouseEvent<HTMLElement>) {
        setAnchorEl(event.currentTarget)
    }

    function handleClose() {
        setAnchorEl(null)
    }

    function handlePerfil() {
        handleClose();
        navigate("/perfil");
    }

    function handleLogout() {
        localStorage.removeItem('@UniEduca:token');
        localStorage.removeItem('@UniEduca:user');

        navigate("/login");
    }

    return (
        <>
            <IconButton
                onClick={handleClick}
                disableRipple
            >
                <AccountCircle />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: (theme) => ({
                        backgroundColor: theme.palette.background.default
                    })
                }}
                sx={(theme) => ({
                    backgroundColor: theme.palette.background.default,
                })}
            >
                <Box display='flex' alignItems='center' justifyContent='center' width='300px'>
                    <Stack>
                        <IconButton
                            size="large"
                            disableRipple
                            sx={{
                                "&:hover": {
                                    backgroundColor: 'transparent'
                                }
                            }}
                        >
                            <AccountCircle fontSize="large" />
                        </IconButton>

                        <Stack
                            display='flex'
                            justifyContent='center'
                            alignItems='center'
                        >
                            <Typography fontWeight='bold' variant="inherit">
                                Olá, {user?.nome || "Usuário"}!
                            </Typography>

                            <Typography sx={(theme) => ({ color: theme.palette.text.disabled })}>
                                {user?.email || ""}
                            </Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Box mt={2}>
                    <MenuItem
                        onClick={handlePerfil}
                        sx={{
                            borderTop: `1px solid ${theme.palette.grey[200]}`,
                        }}
                    >
                        <ListItemIcon
                            sx={(theme) => ({
                                color: theme.palette.text.primary
                            })}
                        >
                            <CircleUserRound size={18} />
                        </ListItemIcon>

                        Minha Conta
                    </MenuItem>

                    <MenuItem
                        onClick={handleClose}
                        sx={{
                            borderTop: `1px solid ${theme.palette.grey[200]}`
                        }}
                    >
                        <ListItemIcon
                            sx={(theme) => ({
                                color: theme.palette.text.primary
                            })}
                        >
                            <NotebookPen size={18} />
                        </ListItemIcon>

                        Matrícula
                    </MenuItem>

                    <MenuItem
                        onClick={handleClose}
                        sx={{
                            borderTop: `1px solid ${theme.palette.grey[200]}`
                        }}
                    >
                        <ListItemIcon
                            sx={(theme) => ({
                                color: theme.palette.text.primary
                            })}
                        >
                            <CircleQuestionMark size={18} />
                        </ListItemIcon>

                        Manual do Sistema
                    </MenuItem>

                    <MenuItem
                        onClick={handleLogout}
                        sx={{
                            borderTop: `1px solid ${theme.palette.grey[200]}`
                        }}
                    >
                        <ListItemIcon
                            sx={(theme) => ({
                                color: theme.palette.text.primary
                            })}
                        >
                            <LogOut size={18} />
                        </ListItemIcon>

                        Sair
                    </MenuItem>
                </Box>
            </Menu>
        </>
    )
}