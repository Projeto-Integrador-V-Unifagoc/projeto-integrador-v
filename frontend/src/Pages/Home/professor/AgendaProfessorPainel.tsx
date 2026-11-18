import { Box, Stack, Typography } from "@mui/material";
import { CalendarClock } from "lucide-react";
import {
  CORES_DASHBOARD,
  DashboardPainel,
  LinhaPainel,
  ListaPainel,
  PESO,
  TIPO_DASHBOARD,
} from "../../../components/DashboardLayout";
import type { DashboardProfessor } from "../../../models/home-professor-model";
import { formatarDataPtBr } from "../../../utils/avaliacao";

interface Props {
  aulas: DashboardProfessor["proximasAulas"];
}

export default function AgendaProfessorPainel({ aulas }: Props) {
  const visiveis = aulas.slice(0, 4);
  return (
    <DashboardPainel titulo="Próximas aulas" contador={aulas.length || undefined} icone={CalendarClock} semPadding>
      {visiveis.length ? (
        <ListaPainel rotulo="Próximas aulas do professor">
          {visiveis.map((item) => (
            <LinhaPainel key={`${item.id}-${item.data}`} rotulo={`${item.disciplinaNome}, ${item.turmaSigla}`}>
              <Box flex={1} minWidth={0}>
                <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>{item.disciplinaCodigo} · {item.disciplinaNome}</Typography>
                <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>{item.turmaSigla}{item.local ? ` · ${item.local}` : ""}</Typography>
              </Box>
              <Stack alignItems="flex-end" flexShrink={0}>
                <Typography sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>{formatarDataPtBr(item.data).slice(0, 5)}</Typography>
                <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>{item.horaInicio}–{item.horaFim}</Typography>
              </Stack>
            </LinhaPainel>
          ))}
        </ListaPainel>
      ) : <Typography variant="body2" p={2} sx={{ color: CORES_DASHBOARD.textoApagado }}>Nenhuma próxima aula encontrada nos horários vigentes.</Typography>}
    </DashboardPainel>
  );
}
