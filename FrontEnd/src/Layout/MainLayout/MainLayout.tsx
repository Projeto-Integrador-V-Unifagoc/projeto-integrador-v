import { Outlet } from "react-router-dom";

import { Box, CssBaseline } from "@mui/material";

import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";

const sidebarWidth = 260;
const headerHeight = 49;

export default function MainLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <Header />
      <Sidebar />

      <Box
        component="main"
        sx={{
          height: `calc(100vh - ${headerHeight}px)`,
          width: `calc(100vw - ${sidebarWidth}px)`,
          mt: `${headerHeight}px`,
          p: 3,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}