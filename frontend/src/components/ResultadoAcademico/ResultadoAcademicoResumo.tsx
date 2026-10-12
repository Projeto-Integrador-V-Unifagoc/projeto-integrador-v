import type { ReactNode } from "react";
import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import { ROTULO_APROVACAO, ROTULO_MOTIVO, ROTULO_RESULTADO_NOTA, type ResultadoAcademico } from "../../models/resultado-academico-model";
import { formatarPontos } from "../../utils/pontos";

/** Corte REST com até três casas. Apenas apresentação textual, sem arredondar. */
function formatarCorte(valor: string | null): string {
  if (valor === null) return "-";
  const [parteInteira, parteDecimal] = valor.split(".");
  return `${parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${parteDecimal}`;
}
const percentual = (valor: number | null) => valor === null ? "-"
  : `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}%`;

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography component="dt" variant="caption" color="text.secondary">{rotulo}</Typography>
    <Typography component="dd" aria-label={rotulo} variant="body2" sx={{ m: 0, overflowWrap: "anywhere" }}>{children}</Typography>
  </Box>;
}

export function ResultadoAcademicoResumo({ resultado, compacto = false }: {
  resultado: ResultadoAcademico | null | undefined;
  compacto?: boolean;
}) {
  if (!resultado) return <Typography variant="body2" color="text.secondary">Resultado acadêmico indisponível</Typography>;
  const frequencia = resultado.frequencia;
  const situacaoFrequencia = { NAO_LANCADO: "Não lançada", RISCO_REPROVACAO: "Risco de reprovação", ALERTA: "Alerta", REGULAR: "Regular" }[frequencia.situacao];
  const corNota = resultado.resultadoPorNota === "SUFICIENTE" ? "success"
    : resultado.resultadoPorNota === "INSUFICIENTE" ? "error" : resultado.resultadoPorNota === "EM_RECUPERACAO" ? "warning" : "default";
  const corAprovacao = resultado.aprovacaoDisciplina === "APROVADA" ? "success" : resultado.aprovacaoDisciplina === "NAO_APROVADA" ? "error" : "default";
  return <Stack gap={compacto ? 0.75 : 1.5} sx={{ minWidth: 0, width: "100%", whiteSpace: "normal" }}>
    <Stack component="dl" direction="row" flexWrap="wrap" useFlexGap gap={compacto ? 1 : 2} sx={{ m: 0 }}>
      <Campo rotulo="Pontos regulares">{formatarPontos(resultado.pontosRegularesObtidos)}</Campo>
      <Campo rotulo="Total de pontos">{formatarPontos(resultado.totalPontos)}</Campo>
      <Campo rotulo="Corte">{formatarCorte(resultado.cortePontos)}</Campo>
      <Campo rotulo="Pontos efetivos">{formatarPontos(resultado.pontosEfetivos)}</Campo>
      <Campo rotulo="Percentual do resultado">{percentual(resultado.percentualResultado)}</Campo>
      <Campo rotulo="Recuperação">{formatarPontos(resultado.pontosRecuperacao)} / {formatarPontos(resultado.valorMaximoRecuperacao)}</Campo>
      <Campo rotulo="Indicador regular">
        {percentual(resultado.indicadorRegular.percentual)}{resultado.indicadorRegular.parcial ? " - Parcial" : ""}
        {resultado.indicadorRegular.parcial && <> · {formatarPontos(resultado.indicadorRegular.denominadorPontos)} pontos lançados</>}
      </Campo>
      <Campo rotulo="Resultado por nota"><Chip size="small" color={corNota} label={ROTULO_RESULTADO_NOTA[resultado.resultadoPorNota]} /></Campo>
      <Campo rotulo="Frequência">
        {frequencia.percentual === null ? situacaoFrequencia : `${percentual(frequencia.percentual)} - ${situacaoFrequencia}`}
        {frequencia.percentual !== null && <> · {frequencia.presencas} presença(s), {frequencia.faltas} falta(s)</>}
      </Campo>
      <Campo rotulo="Aprovação na disciplina"><Chip size="small" color={corAprovacao} label={ROTULO_APROVACAO[resultado.aprovacaoDisciplina]} /></Campo>
    </Stack>
    {resultado.elegivelRecuperacaoPorNota && <Typography variant="body2">Elegível para recuperação por nota</Typography>}
    {resultado.motivos.length > 0 && <Alert severity="info" sx={{ py: compacto ? 0 : 0.5 }}>
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
        {resultado.motivos.map((motivo) => <Typography key={motivo} component="span" variant="body2">{ROTULO_MOTIVO[motivo]}</Typography>)}
      </Stack>
    </Alert>}
  </Stack>;
}
