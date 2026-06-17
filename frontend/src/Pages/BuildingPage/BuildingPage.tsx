import { Box, Stack, Typography } from "@mui/material"
import buildingImage from "../../../public/assets/building.svg"
import Container from "../../components/Container"

function obterNomeUsuario(): string {
  const usuarioStorage = localStorage.getItem("@UniEduca:user")

  if (!usuarioStorage) return "usuário"

  try {
    const usuario = JSON.parse(usuarioStorage)
    const nome = String(usuario?.nome || "").trim()
    // Usa apenas o primeiro nome para a saudação.
    return nome ? nome.split(" ")[0] : "usuário"
  } catch {
    return "usuário"
  }
}

export default function BuildingPage() {
  const nomeUsuario = obterNomeUsuario()

  return (
    <Container
      maxWidth={false}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: '8px',
        height: '100%',
        backgroundColor: '#F4F4F4',
      })}
    >
      <Box
        component='div'
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={(theme) => ({
            backgroundColor: theme.palette.background.default,
            width: 260,
            height: 260,
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          })}
        >

          <img src={buildingImage} alt="Página em construção" width={230} />
        </Box>
        <Stack
          display='flex'
          justifyContent='center'
          alignItems='center'
          mt={1}
        >
          <Typography variant="body1" fontWeight='bold'>Olá {nomeUsuario}, esta página ainda está em construção!</Typography>
          <Typography variant="body2" color="textDisabled">Por favor, retorne para a página anterior para que seja possível continuar com a utilização do sistema.</Typography>
        </Stack>

      </Box>
    </Container>
  )
}