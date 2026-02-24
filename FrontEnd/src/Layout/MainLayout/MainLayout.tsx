import { Box, CssBaseline } from "@mui/material";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";

const sidebarWidth = 260;

export default function MainLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <Header />
      <Sidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${sidebarWidth}px)`
        }}
      >

        <Outlet />
      </Box>
    </Box>
  );
}