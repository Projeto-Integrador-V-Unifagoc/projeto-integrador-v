import {
  Box,
  Stack,
  Typography,
} from "@mui/material";

import type { ReactNode } from "react";

interface ContentProps {
  step: number;
  title: string;
  description: string;
  icon?: ReactNode;
}

export default function Content({
  step,
  title,
  description,
  icon,
}: ContentProps) {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="flex-start"
    >
      {icon && (
        <Box
          sx={{
            color: "primary.main",
            mt: 0.5,
          }}
        >
          {icon}
        </Box>
      )}

      <Box>
        <Typography
          variant="h6"
          fontWeight="bold"
        >
          Passo {step}: {title}
        </Typography>

        <Typography color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  )
}