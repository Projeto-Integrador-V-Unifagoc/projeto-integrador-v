import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";

import {
  AppBar,
  Box,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import { AccountCircle } from "@mui/icons-material";
import { Menu } from "lucide-react";

interface HeaderProps {
  clicarMenu: () => void;
}

export default function Header({ clicarMenu }: HeaderProps) {
  const navegar = useNavigate();
  const [userName, setUserName] = useState("Usuário");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("@UniEduca:user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.nome) {
          setUserName(user.nome);
        }
      } catch (error) {
        console.error("Erro ao ler dados do usuário", error);
      }
    }
  }, []);

  function navegarParaHome() {
    navegar("/");
  }

  function handleOpenUserMenu(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleCloseUserMenu() {
    setAnchorEl(null);
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={(theme) => ({
          backgroundColor: theme.palette.background.default,
          boxShadow: "none",
          borderBottom: `1px solid ${theme.palette.grey[200]}`,
          height: 49,
          display: "flex",
          justifyContent: "center",
        })}
      >
        <Toolbar>
          <IconButton
            size="small"
            edge="start"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={clicarMenu}
          >
            <Menu size={19} />
          </IconButton>

          <Typography
            component="div"
            sx={(theme) => ({
              color: theme.palette.primary.main,
              flexGrow: 1,
              fontWeight: "bold",
              cursor: "pointer",
            })}
            onClick={navegarParaHome}
          >
            UniEduca
          </Typography>

          <Stack flexDirection="row" alignItems="center">
            <Box
              onClick={handleOpenUserMenu}
              sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                color: theme.palette.primary.main,
                fontWeight: "bold",
              })}
            >
              <AccountCircle />
              <Box component="span">{userName}</Box>
            </Box>

            <UserMenu anchorEl={anchorEl} onClose={handleCloseUserMenu} />
          </Stack>
        </Toolbar>
      </AppBar>
    </Box>
  );
}