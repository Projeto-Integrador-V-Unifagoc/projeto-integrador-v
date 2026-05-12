import { useEffect, useState } from "react";
import Container from "../../components/Container";
import Aluno from "../../../public/assets/aluno.svg";
import { Box, Stack, Typography } from "@mui/material";

export default function Home() {
  const [userName, setUserName] = useState("Usuário");

  useEffect(() => {
    const storedUser = localStorage.getItem("@UniEduca:user");

    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserName(user.nome);
    }
  }, []);

  return (
    <Container
      maxWidth={false}
      sx={(theme) => ({
        border: `1px solid ${theme.palette.grey[200]}`,
        borderRadius: "8px",
        height: "100%",
        backgroundColor: "#F4F4F4",
      })}
    >
      <Box
        component="div"
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <Box
          sx={(theme) => ({
            backgroundColor: theme.palette.background.default,
            width: 260,
            height: 260,
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          })}
        >
          <img src={Aluno} alt="Aluno se formando" width={230} />
        </Box>

        <Stack display="flex" justifyContent="center" alignItems="center" mt={1}>
          <Typography variant="body1" fontWeight="bold">
            Olá, {userName}!
          </Typography>
          <Typography variant="body2" color="textDisabled">
            Bem vindo de volta ao seu sistema acadêmico.
          </Typography>
          <Typography variant="body2" color="textDisabled">
            Acesse os menus desejados e fique por dentro de todas as suas estatísticas.
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}