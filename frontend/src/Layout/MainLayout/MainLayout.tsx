import { Outlet } from "react-router-dom";

import { Box, CssBaseline, Drawer, useMediaQuery, useTheme } from "@mui/material";

import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import { useState } from "react";

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [abrirSidebar, setAbrirSidebar] = useState(false);

  const sidebarWidthDesktop = abrirSidebar ? 260 : 70;
  const headerHeight = 49;

  const clicarSidebar = () => setAbrirSidebar((aberto) => !aberto);
  const fecharSidebar = () => setAbrirSidebar(false);

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <Header clicarMenu={clicarSidebar} />

      {isMobile ? (
        <Drawer
          variant="temporary"
          open={abrirSidebar}
          onClose={fecharSidebar}
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
          <Box onClick={fecharSidebar}>
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
          <Sidebar expandido={abrirSidebar} />
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
