import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import { CORES_DASHBOARD, TIPO_DASHBOARD, sxBotaoTexto } from "./dashboard-estilos";

export interface DashboardRodapeProps {
  /** Ex.: "Atualizado às 14:32". */
  status?: string;
  /** Quando informado, exibe o botão "Atualizar dados". */
  onAtualizar?: () => void;
  atualizando?: boolean;
}

export default function DashboardRodape({ status = "Dados atualizados agora", onAtualizar, atualizando = false }: DashboardRodapeProps) {
  return (
    <Stack component="footer" direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ color: CORES_DASHBOARD.textoApagado }}>
      <Typography sx={{ fontSize: TIPO_DASHBOARD.legenda }}>{status}</Typography>
      {onAtualizar && (
        <Button
          size="small"
          onClick={onAtualizar}
          disabled={atualizando}
          startIcon={atualizando ? <CircularProgress size={12} color="inherit" /> : <RefreshCw size={12} />}
          sx={{ ...sxBotaoTexto, height: 26, fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoSuave }}
        >
          Atualizar dados
        </Button>
      )}
    </Stack>
  );
}
