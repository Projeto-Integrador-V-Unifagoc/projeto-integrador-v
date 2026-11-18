import { Box } from "@mui/material";
import { sxSelo } from "../../components/DashboardLayout";
import type { SituacaoFrequencia, StatusFrequencia } from "../../models/frequencia-model";
import { rotuloSituacao, rotuloStatus, tomSituacaoFrequencia, tomStatusFrequencia } from "./frequencia-utils";

// Selos de frequência no padrão visual: texto + cor de estado (sem vermelho/verde preenchidos).
// Usados pela visão do aluno e pela visão operacional (professor e secretaria).

export function SeloSituacaoFrequencia({ situacao }: { situacao: SituacaoFrequencia }) {
  const tom = tomSituacaoFrequencia(situacao);
  return <Box component="span" sx={sxSelo(tom, { ponto: tom !== "neutro" })}>{rotuloSituacao(situacao)}</Box>;
}

export function SeloStatusFrequencia({ status }: { status: StatusFrequencia }) {
  const tom = tomStatusFrequencia(status);
  return <Box component="span" sx={sxSelo(tom, { ponto: tom !== "neutro" })}>{rotuloStatus(status)}</Box>;
}
