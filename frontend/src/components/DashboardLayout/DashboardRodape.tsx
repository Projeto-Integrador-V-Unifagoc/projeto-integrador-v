import { Box, Button, CircularProgress, Link, Stack, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import { CORES_DASHBOARD } from "./dashboard-estilos";

export interface LinkRodape {
  rotulo: string;
  onClick: () => void;
}

export interface DashboardRodapeProps {
  status?: string;
  /** Texto opcional à direita. Por padrão o canto direito fica vazio, como nas demais páginas do sistema. */
  assinatura?: string;
  /** Quando informado, exibe o botão "Atualizar dados". */
  onAtualizar?: () => void;
  atualizando?: boolean;
  /** Links opcionais à direita, no lugar da assinatura. */
  links?: LinkRodape[];
}

export default function DashboardRodape({ status = "Dados atualizados agora", assinatura, onAtualizar, atualizando = false, links }: DashboardRodapeProps) {
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
      {links?.length ? (
        <Stack direction="row" gap={2} flexWrap="wrap">
          {links.map((link) => (
            <Link key={link.rotulo} component="button" type="button" variant="caption" underline="hover" onClick={link.onClick} sx={{ color: CORES_DASHBOARD.textoSuave }}>
              {link.rotulo}
            </Link>
          ))}
        </Stack>
      ) : assinatura ? (
        <Typography variant="caption">{assinatura}</Typography>
      ) : null}
    </Stack>
  );
}
