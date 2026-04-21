import { Box, Typography } from '@mui/material'

export default function Header() {
  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: '#2e7d6b',
        color: 'white'
      }}
    >
      <Typography variant="h5">
        Portal de Relatórios Acadêmicos
      </Typography>
    </Box>
  )
}