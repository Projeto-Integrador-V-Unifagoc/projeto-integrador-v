import { CardContent, Stack, Typography, Box } from "@mui/material";
import type { ReactNode } from "react";


interface ContentProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function Content({
  title,
  description,
  icon,
}: ContentProps) {
  return (
    <CardContent>
      <Stack spacing={2}>
        
        {icon && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: "primary.main",
            }}
          >
            {icon}
          </Box>
        )}

        <Typography
          variant="h6"
          fontWeight="bold"
          color="textPrimary"
        >
          {title}
        </Typography>

        <Typography color="textDisabled">
          {description}
        </Typography>

      </Stack>
    </CardContent>
  );
}