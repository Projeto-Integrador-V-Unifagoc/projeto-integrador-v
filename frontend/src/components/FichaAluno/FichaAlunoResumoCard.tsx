import type { ReactNode } from "react";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CalendarDays, Mail, ShieldUser } from "lucide-react";

import Button from "../Button";
import type { AlunoFicha } from "./types";

function LinhaInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 0.25, sm: 1 }}
      flexWrap="wrap"
    >
      <Typography
        variant="body2"
        color="text.secondary"
        minWidth={{ xs: "auto", sm: 110 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={600}
        color="primary"
        sx={{ wordBreak: "break-word" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function BlocoContato({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="flex-start"
      sx={{ width: "100%" }}
    >
      <Box
        color="primary.main"
        display="flex"
        sx={{ mt: 0.25, flexShrink: 0 }}
      >
        {icon}
      </Box>
      <Stack minWidth={0}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="body2"
          color="primary"
          fontWeight={500}
          sx={{ wordBreak: "break-word" }}
        >
          {value}
        </Typography>
      </Stack>
    </Stack>
  );
}

interface FichaAlunoResumoCardProps {
  aluno: AlunoFicha;
}

export function FichaAlunoResumoCard({ aluno }: FichaAlunoResumoCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const iniciais = aluno.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        p: { xs: 2, md: 3 },
        bgcolor: `${theme.palette.background.default}`
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box minWidth={0}>
            <Typography
              variant="h5"
              fontWeight={700}
              color="textSecondary"
              sx={{
                fontSize: { xs: "1.35rem", md: "1.5rem" },
                wordBreak: "break-word",
              }}
            >
              {aluno.nome}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" fontWeight={600}>
              RA: {aluno.ra}
            </Typography>
          </Box>

          <Chip
            label={aluno.status}
            color="success"
            variant="outlined"
            sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
          />
        </Stack>

        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={3}
          divider={
            <Divider
              orientation={isMobile ? "horizontal" : "vertical"}
              flexItem
            />
          }
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} flex={1}>
            <Avatar
              variant="rounded"
              sx={{
                width: { xs: 96, sm: 120 },
                height: { xs: 112, sm: 140 },
                bgcolor: "primary.light",
                color: "primary.dark",
                fontSize: { xs: 32, sm: 40 },
                fontWeight: 700,
                alignSelf: { xs: "center", sm: "flex-start" },
              }}
            >
              {iniciais || "AL"}
            </Avatar>

            <Stack spacing={1.1} minWidth={0}>
              <LinhaInfo label="Unidade:" value={aluno.unidade} />
              <LinhaInfo label="Curso:" value={aluno.curso} />
              <LinhaInfo label="Campus/Polo:" value={aluno.campusPolo} />
              <LinhaInfo label="Periodo:" value={aluno.periodo} />
              <LinhaInfo label="Turno:" value={aluno.turno} />
              <LinhaInfo label="Turma:" value={aluno.turma} />
              <LinhaInfo label="Status:" value={aluno.status} />
            </Stack>
          </Stack>

          <Stack spacing={2} flex={1} justifyContent="center">
            <BlocoContato
              icon={<CalendarDays size={20} />}
              label="Nascimento"
              value={`${aluno.nascimento} (${aluno.idade})`}
            />
            <Divider />
            <BlocoContato
              icon={<ShieldUser size={20} />}
              label="Resp. Fin."
              value={aluno.responsavelFinanceiro}
            />
            <Divider />
            <BlocoContato
              icon={<Mail size={20} />}
              label="E-mail"
              value={aluno.email}
            />
          </Stack>
        </Stack>

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            sx={{
              width: { xs: "100%", sm: 160 },
              minWidth: { xs: 0, sm: 160 },
              height: 40,
              alignSelf: "flex-end",
            }}
          >
            Mais detalhes
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
