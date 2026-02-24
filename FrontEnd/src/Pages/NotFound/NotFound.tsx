import { Box, Stack, Typography } from "@mui/material"
import notFounImae from "../../../public/assets/notfound.svg"

export default function NotFound() {
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2
      }}
    >
      <Box
        component="img"
        src={notFounImae}
        alt="Página não encontrada"
        sx={{
          width: 300,
          maxWidth: "90%"
        }}
      />

      <Stack
        display='flex'
        justifyContent='center'
        alignItems='center'
      >
        <Typography variant="body1" color="primary" fontWeight='bold'>
          Olá usuário, esta página não foi encontrada!
        </Typography>
        <Typography variant="body2" color="textDisabled">
          Por favor, retorne para a página anterior para que seja possível continuar com a utilização do sistema.
        </Typography>
        <Typography variant="body2" color="textDisabled">
          Caso esteja enfrentando problemas, não deixe de entrar em contato com a nossa equipe de suporte.
        </Typography>
      </Stack>
    </Box>
  )
}