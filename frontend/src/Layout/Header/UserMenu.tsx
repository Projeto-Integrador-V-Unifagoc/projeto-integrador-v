import { useNavigate } from "react-router-dom";

import {
  Box,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";

import { AccountCircle } from "@mui/icons-material";

import {
  CircleQuestionMark,
  CircleUserRound,
  LogOut,
  NotebookPen,
} from "lucide-react";

import { theme } from "../../theme";

interface UserMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export default function UserMenu({ anchorEl, onClose }: UserMenuProps) {
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const storedUser = localStorage.getItem("@UniEduca:user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  function handlePerfil() {
    onClose();
    navigate("/perfil");
  }

  function handleManualDoSistema() {
    onClose()
    navigate("/manual-do-sistema")
  }

  function handleLogout() {
    localStorage.removeItem("@UniEduca:token");
    localStorage.removeItem("@UniEduca:user");
    navigate("/login");
  }

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      slotProps={{
        paper: {
          sx: (theme) => ({
            backgroundColor: theme.palette.background.default,
            width: 320,
            mt: 1,
            borderRadius: 2,
            boxShadow: 3,
          }),
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="center" py={3}>
        <Stack alignItems="center">
          <IconButton
            size="large"
            disableRipple
            sx={{
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            <AccountCircle fontSize="large" />
          </IconButton>

          <Stack justifyContent="center" alignItems="center">
            <Typography fontWeight="bold" variant="inherit">
              Olá, {user?.nome || "Usuário"}!
            </Typography>

            <Typography sx={(theme) => ({ color: theme.palette.text.disabled })}>
              {user?.email || ""}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Box>
        <MenuItem
          onClick={handlePerfil}
          sx={{
            borderTop: `1px solid ${theme.palette.grey[200]}`,
          }}
        >
          <ListItemIcon
            sx={(theme) => ({
              color: theme.palette.text.primary,
            })}
          >
            <CircleUserRound size={18} />
          </ListItemIcon>
          Minha Conta
        </MenuItem>

        <MenuItem
          onClick={onClose}
          sx={{
            borderTop: `1px solid ${theme.palette.grey[200]}`,
          }}
        >
          <ListItemIcon
            sx={(theme) => ({
              color: theme.palette.text.primary,
            })}
          >
            <NotebookPen size={18} />
          </ListItemIcon>
          Matrícula
        </MenuItem>

        <MenuItem
          onClick={handleManualDoSistema}
          sx={{
            borderTop: `1px solid ${theme.palette.grey[200]}`,
          }}
        >
          <ListItemIcon
            sx={(theme) => ({
              color: theme.palette.text.primary,
            })}
          >
            <CircleQuestionMark size={18} />
          </ListItemIcon>
          Manual do Sistema
        </MenuItem>

        <MenuItem
          onClick={handleLogout}
          sx={{
            borderTop: `1px solid ${theme.palette.grey[200]}`,
          }}
        >
          <ListItemIcon
            sx={(theme) => ({
              color: theme.palette.text.primary,
            })}
          >
            <LogOut size={18} />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Box>
    </Menu>
  );
}