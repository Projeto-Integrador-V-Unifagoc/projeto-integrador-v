import { Outlet } from "react-router-dom";

import { Box, CssBaseline } from "@mui/material";

import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import { useState } from "react";


export default function MainLayout() {
  const [abirSidebar, setAbrirSidebar] = useState(false)
  
  const sidebarWidth = abirSidebar ? 260 : 70;
  const headerHeight = 49;


  const clicarSidebar = () => {
    setAbrirSidebar(!abirSidebar)
    }
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <Header clicarMenu={clicarSidebar}/>
      <Sidebar abrirSidebar={abirSidebar}/>

      <Box
        component="main"
        sx={{
          height: `calc(100vh - ${headerHeight}px)`,
          width: `calc(100vw - ${sidebarWidth}px)`,
          mt: `${headerHeight}px`,
          ml: `${sidebarWidth}px`,
          p: 3,
          transition: "all 0.3s ease",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}