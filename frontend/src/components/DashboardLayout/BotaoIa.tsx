import { Button, IconButton, Tooltip } from "@mui/material";
import { Sparkles } from "lucide-react";
import { CORES_DASHBOARD, sxBotaoSecundario } from "./dashboard-estilos";

export interface BotaoIaProps {
  rotulo: string;
  /** Sem ação (assistente desativado ou não configurado), o botão fica visível com o aviso de indisponível. */
  onClick?: () => void;
  /** Só o ícone, com o rótulo no tooltip: para listas em que o botão se repete a cada linha. */
  compacto?: boolean;
}

// Contornado e neutro como as demais ações secundárias; só o ícone leva o acento para identificar a IA.
export default function BotaoIa({ rotulo, onClick, compacto = false }: BotaoIaProps) {
  const disponivel = Boolean(onClick);
  const estado = { opacity: disponivel ? 1 : 0.6, cursor: disponivel ? "pointer" : "default" };
  return (
    <Tooltip title={disponivel ? rotulo : `${rotulo} · assistente indisponível no momento`}>
      <span>
        {compacto ? (
          <IconButton
            size="small"
            aria-label={rotulo}
            aria-disabled={!disponivel}
            onClick={disponivel ? onClick : undefined}
            sx={{ ...sxBotaoSecundario, ...estado, width: 30, px: 0, color: CORES_DASHBOARD.acento }}
          >
            <Sparkles size={15} />
          </IconButton>
        ) : (
          <Button
            size="small"
            aria-disabled={!disponivel}
            onClick={disponivel ? onClick : undefined}
            startIcon={<Sparkles size={14} color={CORES_DASHBOARD.acento} />}
            sx={{ ...sxBotaoSecundario, ...estado }}
          >
            {rotulo}
          </Button>
        )}
      </span>
    </Tooltip>
  );
}
