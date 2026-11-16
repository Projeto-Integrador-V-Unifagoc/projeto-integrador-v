import { Box, Stack, Typography } from "@mui/material";
import { ChevronRight, ClipboardList, FileText, Puzzle, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CORES_DASHBOARD,
  CORES_TIPO_AVALIACAO,
  DashboardPainel,
  ESTADOS,
  LinhaPainel,
  ListaPainel,
  PESO,
  TIPO_DASHBOARD,
  sxIconeQuadrado,
} from "../../../components/DashboardLayout";
import type { TipoAvaliacaoNota } from "../../../models/nota-model";
import { formatarDataPtBr } from "../../../utils/avaliacao";
import type { AvaliacaoPainel } from "./regras-dashboard-aluno";

const ICONE_TIPO: Record<TipoAvaliacaoNota, LucideIcon> = { PROVA: ClipboardList, TRABALHO: FileText, TPI: Puzzle, RECUPERACAO: RotateCcw };
const MAX_ITENS = 4;

interface AvaliacoesCadastradasPainelProps {
  avaliacoes: AvaliacaoPainel[];
  resumo: { total: number; lancadas: number; aguardando: number; vencidas: unknown[] };
  /** "Ver agenda" no cabeçalho do painel. */
  onConsultar: () => void;
  /** Clique na linha: abre o detalhe da disciplina da avaliação, com as avaliações dela. */
  onAbrirDisciplina: (turmaDisciplinaId: string) => void;
}

/** "Nota lançada · 13/11", "Devolução vencida · 08/11", "Nota não lançada · devolução em 2 dias". */
function situacao(avaliacao: AvaliacaoPainel) {
  const data = avaliacao.dataDevolucao ? formatarDataPtBr(avaliacao.dataDevolucao).slice(0, 5) : null;
  if (avaliacao.lancada) return data ? `Nota lançada · ${data}` : "Nota lançada";
  if (avaliacao.devolucaoVencida) return `Devolução vencida · ${data}`;
  if (avaliacao.diasParaDevolucao === 0) return "Nota não lançada · devolução hoje";
  if (avaliacao.diasParaDevolucao !== null && avaliacao.diasParaDevolucao > 0) {
    return `Nota não lançada · devolução em ${avaliacao.diasParaDevolucao} ${avaliacao.diasParaDevolucao === 1 ? "dia" : "dias"}`;
  }
  return data ? `Nota não lançada · devolução ${data}` : "Nota não lançada";
}

export default function AvaliacoesCadastradasPainel({ avaliacoes, resumo, onConsultar, onAbrirDisciplina }: AvaliacoesCadastradasPainelProps) {
  const visiveis = avaliacoes.slice(0, MAX_ITENS);
  return (
    <DashboardPainel titulo="Avaliações" contador={resumo.total || undefined} acao={{ rotulo: "Ver agenda", onClick: onConsultar }} semPadding>
      {visiveis.length ? (
        <ListaPainel rotulo="Avaliações mais próximas">
          {visiveis.map((avaliacao) => {
            const Icone = ICONE_TIPO[avaliacao.tipo] ?? ClipboardList;
            const titulo = `${avaliacao.titulo} · ${avaliacao.disciplinaNome}`;
            return (
              <LinhaPainel key={avaliacao.id} rotulo={`Abrir ${titulo}`} onClick={() => onAbrirDisciplina(avaliacao.turmaDisciplinaId)}>
                <Box aria-hidden="true" sx={sxIconeQuadrado(CORES_TIPO_AVALIACAO[avaliacao.tipo] ?? CORES_TIPO_AVALIACAO.PROVA)}>
                  <Icone size={15} />
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography noWrap title={titulo} sx={{ fontSize: TIPO_DASHBOARD.corpo, fontWeight: PESO.forte }}>
                    {titulo}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: TIPO_DASHBOARD.legenda, color: avaliacao.devolucaoVencida ? ESTADOS.atencao.texto : CORES_DASHBOARD.textoApagado }}>
                    {situacao(avaliacao)}
                  </Typography>
                </Box>
                <ChevronRight size={16} color={CORES_DASHBOARD.iconeApagado} aria-hidden="true" style={{ flexShrink: 0 }} />
              </LinhaPainel>
            );
          })}
        </ListaPainel>
      ) : (
        <Typography sx={{ px: 2, py: 1.5, fontSize: TIPO_DASHBOARD.corpo, color: CORES_DASHBOARD.textoApagado }}>Nenhuma avaliação cadastrada no período.</Typography>
      )}
      <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mt: "auto", px: 2, py: 1.25, borderTop: `1px solid ${CORES_DASHBOARD.divisoria}`, fontSize: TIPO_DASHBOARD.legenda, color: CORES_DASHBOARD.textoApagado }}>
        <span>{visiveis.length < resumo.total ? `${visiveis.length} mais próximas` : "Todas do período"}</span>
        <span>
          {resumo.lancadas} lançadas
          {resumo.vencidas.length > 0 && ` · ${resumo.vencidas.length} ${resumo.vencidas.length === 1 ? "atrasada" : "atrasadas"}`}
          {` · ${resumo.aguardando} a lançar`}
        </span>
      </Stack>
    </DashboardPainel>
  );
}
