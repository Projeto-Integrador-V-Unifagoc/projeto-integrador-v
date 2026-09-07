import { Outlet } from "react-router-dom";

import { Box, CssBaseline, Drawer, useMediaQuery, useTheme } from "@mui/material";

import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import { useEffect, useState } from "react";

const CHAVE_MENU_EXPANDIDO = "@UniEduca:menuExpandido";

function lerMenuExpandido(): boolean {
  try {
    const salvo = localStorage.getItem(CHAVE_MENU_EXPANDIDO);
    return salvo === null ? true : salvo === "true";
  } catch {
    return true;
  }
}

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [menuExpandido, setMenuExpandido] = useState(lerMenuExpandido);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_MENU_EXPANDIDO, String(menuExpandido));
    } catch {
      return;
    }
  }, [menuExpandido]);

  const sidebarWidthDesktop = menuExpandido ? 260 : 70;
  const headerHeight = 49;

  const alternarMenu = () => {
    if (isMobile) setMenuMobileAberto((aberto) => !aberto);
    else setMenuExpandido((expandido) => !expandido);
  };

  const fecharMenuMobile = () => setMenuMobileAberto(false);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <Header clicarMenu={alternarMenu} />

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={menuMobileAberto}
          onClose={fecharMenuMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: 260,
              boxSizing: "border-box",
              pt: `${headerHeight}px`,
              backgroundColor: "white",
            },
          }}
        >
          <Box onClick={fecharMenuMobile}>
            <Sidebar expandido />
          </Box>
        </Drawer>
      ) : (
        <Box
          sx={(theme) => ({
            borderRight: `1px solid ${theme.palette.grey[200]}`,
            width: sidebarWidthDesktop,
            height: "100vh",
            backgroundColor: "white",
            transition: "all 0.3s ease",
            overflowX: "hidden",
            position: "fixed",
            paddingTop: 7,
            paddingLeft: 1,
          })}
        >
          <Sidebar expandido={menuExpandido} />
        </Box>
      )}

      <Box
        component="main"
        sx={{
          height: `calc(100vh - ${headerHeight}px)`,
          width: isMobile ? "100%" : `calc(100vw - ${sidebarWidthDesktop}px)`,
          mt: `${headerHeight}px`,
          ml: isMobile ? 0 : `${sidebarWidthDesktop}px`,
          p: { xs: 2, sm: 3 },
          overflowX: "hidden",
          transition: "all 0.3s ease",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
