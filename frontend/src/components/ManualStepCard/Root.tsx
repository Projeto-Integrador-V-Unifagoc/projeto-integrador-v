import { Paper, type PaperProps } from "@mui/material";

export default function Root({
  children,
  ...rest
}: PaperProps) {
  return (
    <Paper
      elevation={0}
      {...rest}
      sx={(theme) => ({
        p: 3,
        borderRadius: 2,
        backgroundColor: theme.palette.grey[100],
        border: `1px solid ${theme.palette.primary.main}`,

      })}
    >
      {children}
    </Paper>
  )
}