import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import { CORES_DASHBOARD } from "./dashboard-estilos";

export interface DashboardRodapeProps {
  status?: string;
  /** Quando informado, exibe o botão "Atualizar dados". */
  onAtualizar?: () => void;
  atualizando?: boolean;
}

export default function DashboardRodape({ status = "Dados atualizados agora", onAtualizar, atualizando = false }: DashboardRodapeProps) {
  return (
    <Stack component="footer" direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={0.5} sx={{ color: CORES_DASHBOARD.textoApagado }}>
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Box aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
        <Typography variant="caption">{status}</Typography>
        {onAtualizar && (
          <Button
            size="small"
            onClick={onAtualizar}
            disabled={atualizando}
            startIcon={atualizando ? <CircularProgress size={13} color="inherit" /> : <RefreshCw size={13} />}
            sx={{ width: "auto", height: 26, fontSize: 12, color: CORES_DASHBOARD.acento, whiteSpace: "nowrap" }}
          >
            Atualizar dados
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
