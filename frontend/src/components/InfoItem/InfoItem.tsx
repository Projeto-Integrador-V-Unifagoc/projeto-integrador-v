import { Typography, Box } from "@mui/material";

interface InfoItemProps {
  label: string
  children: React.ReactNode
}

export function InfoItem({ label, children }: InfoItemProps) {
  return (
    <Typography fontSize={13}>
      <Box component="span" fontWeight="bold" color="text.secondary">
        {label}:
      </Box>{' '}
      {children}
    </Typography>
  )
}