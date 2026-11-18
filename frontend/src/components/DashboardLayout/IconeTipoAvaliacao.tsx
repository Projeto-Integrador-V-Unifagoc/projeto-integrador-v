import { Box } from "@mui/material";
import { ClipboardList, FileText, Puzzle, RotateCcw, type LucideIcon } from "lucide-react";
import { CORES_TIPO_AVALIACAO, sxIconeQuadrado } from "./dashboard-estilos";

type TipoComIcone = keyof typeof CORES_TIPO_AVALIACAO;

const ICONE_TIPO: Record<TipoComIcone, LucideIcon> = { PROVA: ClipboardList, TRABALHO: FileText, TPI: Puzzle, RECUPERACAO: RotateCcw };

/**
 * Quadrado pequeno com o ícone e a cor do tipo de avaliação (prova, trabalho, TPI, recuperação).
 * Um só lugar para agenda, boletim e gestão de avaliações. Tipo desconhecido cai no visual de prova.
 */
export default function IconeTipoAvaliacao({ tipo, tamanho = 20, className }: { tipo: string; tamanho?: number; className?: string }) {
  const chave: TipoComIcone = tipo in ICONE_TIPO ? (tipo as TipoComIcone) : "PROVA";
  const Icone = ICONE_TIPO[chave];
  const cores = CORES_TIPO_AVALIACAO[chave];
  // className: o Chip do MUI injeta "MuiChip-icon" quando o ícone é usado como `icon` de um Chip.
  return (
    <Box aria-hidden="true" className={className} sx={sxIconeQuadrado(cores, tamanho)}>
      <Icone size={Math.round(tamanho * 0.6)} color={cores.texto} />
    </Box>
  );
}
