import { Popover, type PopoverProps } from "@mui/material";
import type { ReactNode } from "react";
import { theme } from "../../theme";

interface RootProps extends Omit<PopoverProps, "children"> {
  children: ReactNode;
}

export default function Root({
  children,
  ...rest
}: RootProps) {
  return (
    <Popover
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      PaperProps={{
        sx: {
          width: 370,
          pt: 3,
          
          borderRadius: 2,
          mt: 0.5,
          backgroundColor: `${theme.palette.background.default}`,
          boxShadow: 'none',
          border: `1px solid ${theme.palette.grey[200]}`
        },
      }}
      {...rest}
    >
      {children}
    </Popover>
  );
}