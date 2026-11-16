import { Button, IconButton, Tooltip } from "@mui/material";
import { Sparkles } from "lucide-react";
import { CORES_DASHBOARD } from "./dashboard-estilos";

export interface BotaoIaProps {
  rotulo: string;
  /** Sem ação (assistente desativado ou não configurado), o botão fica visível com o aviso de indisponível. */
  onClick?: () => void;
  /** Só o ícone, com o rótulo no tooltip: para listas em que o botão se repete a cada linha. */
  compacto?: boolean;
}

export default function BotaoIa({ rotulo, onClick, compacto = false }: BotaoIaProps) {
  const disponivel = Boolean(onClick);
  const estilo = {
    bgcolor: CORES_DASHBOARD.acentoSuave,
    color: CORES_DASHBOARD.acento,
    opacity: disponivel ? 1 : 0.7,
    cursor: disponivel ? "pointer" : "default",
    "&:hover": { bgcolor: disponivel ? CORES_DASHBOARD.acentoSuaveHover : CORES_DASHBOARD.acentoSuave },
  };
  return (
    <Tooltip title={disponivel ? rotulo : `${rotulo} · assistente indisponível no momento`}>
      <span>
        {compacto ? (
          <IconButton size="small" aria-label={rotulo} aria-disabled={!disponivel} onClick={disponivel ? onClick : undefined} sx={{ width: 32, height: 32, borderRadius: 1.5, ...estilo }}>
            <Sparkles size={16} />
          </IconButton>
        ) : (
          <Button
            size="small"
            aria-disabled={!disponivel}
            onClick={disponivel ? onClick : undefined}
            startIcon={<Sparkles size={15} />}
            sx={{ width: "auto", height: 32, px: 1.25, whiteSpace: "nowrap", ...estilo }}
          >
            {rotulo}
          </Button>
        )}
      </span>
    </Tooltip>
  );
}
