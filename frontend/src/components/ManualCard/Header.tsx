import { Box } from "@mui/material";
import type { ReactNode } from "react";


interface HeaderProps {
  children: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <Box>
      {children}
    </Box>
  );
}