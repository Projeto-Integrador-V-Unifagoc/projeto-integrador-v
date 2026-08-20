import { Box, Stack, Typography } from "@mui/material"
import notFoundImage from "../../../public/assets/notfound.svg"
import Container from "../../components/Container"

export default function NotFound() {
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

          <img src={notFoundImage} alt="Página não encontrada" width={230} />
        </Box>
        <Stack
          display='flex'
          justifyContent='center'
          alignItems='center'
          mt={1}
        >
          <Typography variant="body1" fontWeight='bold'>Oops, página não encontrada!</Typography>
          <Typography variant="body2" color="textDisabled">Parece que essa página não foi encontrada.</Typography>
          <Typography variant="body2" color="textDisabled">Caso o problema persista, não hesite em entrar em contato com o nosso suporte.</Typography>
        </Stack>

      </Box>
    </Container>
  )
}