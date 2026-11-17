import { Box, Chip, Stack, Typography } from "@mui/material";
import { CheckCircle2, Target } from "lucide-react";
import {
  CORES_DASHBOARD,
  DashboardPainel,
  ESTADOS,
  LinhaPainel,
  ListaPainel,
  PESO,
  TIPO_DASHBOARD,
} from "../../../components/DashboardLayout";
import type { DashboardProfessor } from "../../../models/home-professor-model";
import { fmtPct } from "../aluno/regras-dashboard-aluno";

type CompetenciaAtencao = DashboardProfessor["competenciasEmDificuldade"][number];

interface Props {
  competencias: CompetenciaAtencao[];
  onAbrir: (turmaDisciplinaId: string) => void;
}

const VISIVEIS = 4;

export default function CompetenciasAtencaoPainel({ competencias, onAbrir }: Props) {
  const visiveis = competencias.slice(0, VISIVEIS);
  return (
    <DashboardPainel titulo="Competências em atenção" contador={competencias.length || undefined} icone={Target} semPadding>
      {visiveis.length ? (
        <ListaPainel rotulo="Competências que exigem atenção">
          {visiveis.map((item) => (
            <LinhaPainel key={`${item.turmaDisciplinaId}-${item.id}`} onClick={() => onAbrir(item.turmaDisciplinaId)} rotulo={`Abrir ${item.codigo} em ${item.disciplinaNome}`}>
              <Box flex={1} minWidth={0}>
                <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>{item.codigo} · {item.nome}</Typography>
                <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>{item.disciplinaNome} · {item.turmaSigla} · {fmtPct(item.media, 1)} de aproveitamento</Typography>
              </Box>
              <Chip size="small" color={item.classificacao === "DIFICULDADE" ? "error" : "warning"} label={item.classificacao === "DIFICULDADE" ? "Dificuldade" : "Atenção"} />
            </LinhaPainel>
          ))}
        </ListaPainel>
      ) : (
        <Stack minHeight={110} alignItems="center" justifyContent="center" textAlign="center" gap={.75} px={2}>
          <CheckCircle2 size={23} color={ESTADOS.ok.ponto} />
          <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>Nenhuma competência em atenção</Typography>
          <Typography sx={{ fontSize: TIPO_DASHBOARD.secundario, color: CORES_DASHBOARD.textoApagado }}>Somente resultados com cobertura suficiente são classificados.</Typography>
        </Stack>
      )}
    </DashboardPainel>
  );
}
