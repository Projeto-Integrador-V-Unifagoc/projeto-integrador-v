import { Box, Stack, Typography } from "@mui/material"
import buildingImage from "../../../public/assets/building.svg"

export default function BuildingPage() {
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
        src={buildingImage}
        alt="Página em Construção"
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
          Olá usuário, esta página ainda está em construção!
        </Typography>
        <Typography variant="body2" color="textDisabled">
          Por favor, retorne para a página anterior para que seja possível continuar com a utilização do sistema.
        </Typography>
      </Stack>
    </Box>
  )
}