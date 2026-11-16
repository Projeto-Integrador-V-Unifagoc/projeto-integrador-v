import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ClipboardList, FileText, Puzzle, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CORES_DASHBOARD, DashboardPainel } from "../../../components/DashboardLayout";
import type { TipoAvaliacaoNota } from "../../../models/nota-model";
import { formatarDataPtBr, formatarPontos } from "../../../utils/avaliacao";
import type { AvaliacaoPainel } from "./regras-dashboard-aluno";

const ICONE_TIPO: Record<TipoAvaliacaoNota, LucideIcon> = { PROVA: ClipboardList, TRABALHO: FileText, TPI: Puzzle, RECUPERACAO: RotateCcw };
const MAX_ITENS = 4;

interface AvaliacoesCadastradasPainelProps {
  avaliacoes: AvaliacaoPainel[];
  resumo: { total: number; lancadas: number; pendentes: number };
  onConsultar: () => void;
}

function StatusAvaliacao({ avaliacao }: { avaliacao: AvaliacaoPainel }) {
  const tom = avaliacao.lancada ? "success" : avaliacao.devolucaoVencida ? "warning" : null;
  return (
    <Chip
      size="small"
      label={avaliacao.lancada ? "Nota lançada" : "Nota não lançada"}
      sx={(theme) => ({
        fontWeight: 700,
        flexShrink: 0,
        bgcolor: tom ? alpha(theme.palette[tom].main, 0.12) : theme.palette.grey[100],
        color: tom ? theme.palette[tom].dark : "text.secondary",
      })}
    />
  );
}

function textoDevolucao(avaliacao: AvaliacaoPainel) {
  if (!avaliacao.dataDevolucao) return "sem data de devolução";
  const data = formatarDataPtBr(avaliacao.dataDevolucao).slice(0, 5);
  if (avaliacao.devolucaoVencida) return `devolução ${data} (passou)`;
  if (!avaliacao.lancada && avaliacao.diasParaDevolucao === 0) return "devolução hoje";
  if (!avaliacao.lancada && avaliacao.diasParaDevolucao !== null && avaliacao.diasParaDevolucao > 0) {
    return `devolução ${data} (em ${avaliacao.diasParaDevolucao} ${avaliacao.diasParaDevolucao === 1 ? "dia" : "dias"})`;
  }
  return `devolução ${data}`;
}

export default function AvaliacoesCadastradasPainel({ avaliacoes, resumo, onConsultar }: AvaliacoesCadastradasPainelProps) {
  const visiveis = avaliacoes.slice(0, MAX_ITENS);
  return (
    <DashboardPainel titulo="Avaliações cadastradas" contador={resumo.total || undefined} acao={{ rotulo: "Consultar avaliações", onClick: onConsultar }}>
      {visiveis.length ? (
        <Stack gap={1.25} flex={1}>
          {visiveis.map((avaliacao) => {
            const Icone = ICONE_TIPO[avaliacao.tipo] ?? ClipboardList;
            return (
              <Box
                key={avaliacao.id}
                component="article"
                aria-label={`${avaliacao.titulo} — ${avaliacao.disciplinaNome}`}
                sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${avaliacao.devolucaoVencida ? "#F2D48A" : CORES_DASHBOARD.borda}`, display: "flex", gap: 1.25, alignItems: "flex-start" }}
              >
                <Box aria-hidden="true" sx={{ width: 34, height: 34, borderRadius: 2, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: "#E6F6FB", color: CORES_DASHBOARD.acento }}>
                  <Icone size={17} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Typography variant="body2" fontWeight={700} noWrap title={`${avaliacao.titulo} — ${avaliacao.disciplinaNome}`}>
                      {avaliacao.titulo} — {avaliacao.disciplinaNome}
                    </Typography>
                    <StatusAvaliacao avaliacao={avaliacao} />
                  </Stack>
                  <Typography variant="caption" display="block" sx={{ color: avaliacao.devolucaoVencida ? "warning.dark" : CORES_DASHBOARD.textoApagado }}>
                    {formatarPontos(avaliacao.valorMaximo)} · {textoDevolucao(avaliacao)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: CORES_DASHBOARD.textoApagado }}>Nenhuma avaliação cadastrada no período.</Typography>
      )}
      {/* O total já está no contador do título; o rodapé mostra só a divisão. */}
      <Stack direction="row" justifyContent="space-between" gap={1} mt={1.5} pt={1.25} sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }}>
        <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
          {visiveis.length < resumo.total ? `${visiveis.length} mais próximas` : "Todas do período"}
        </Typography>
        <Typography variant="caption" fontWeight={600} sx={{ color: CORES_DASHBOARD.textoSuave }}>
          {resumo.lancadas} lançadas · {resumo.pendentes} pendentes
        </Typography>
      </Stack>
    </DashboardPainel>
  );
}
