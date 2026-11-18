import { useMemo, useState } from "react";
import { Alert, Box, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import { History, TrendingDown, TrendingUp } from "lucide-react";
import type { ClassificacaoCompetenciaAluno, HistoricoCompetenciasAluno } from "../../models/home-aluno-model";

interface Props { dados: HistoricoCompetenciasAluno | null }

const percentual = (valor: number | null) => valor === null
  ? "—"
  : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;

function cor(classificacao: ClassificacaoCompetenciaAluno): "error" | "warning" | "success" | "default" {
  if (classificacao === "DIFICULDADE") return "error";
  if (classificacao === "ATENCAO") return "warning";
  if (classificacao === "ADEQUADO") return "success";
  return "default";
}

function rotulo(classificacao: ClassificacaoCompetenciaAluno) {
  if (classificacao === "DIFICULDADE") return "Dificuldade";
  if (classificacao === "ATENCAO") return "Atenção";
  if (classificacao === "ADEQUADO") return "Adequado";
  return "Dados insuficientes";
}

export default function CompetenciaHistoricoPanel({ dados }: Props) {
  const theme = useTheme();
  const [competenciaId, setCompetenciaId] = useState("");
  const serie = dados?.series.find((item) => item.id === competenciaId) ?? dados?.series[0] ?? null;
  const pontosPorPeriodo = useMemo(
    () => new Map((serie?.pontos ?? []).map((ponto) => [ponto.periodoId, ponto])),
    [serie],
  );
  if (!dados) return null;

  const periodos = dados.periodos.map((periodo) => periodo.codigo);
  const medias = dados.periodos.map((periodo) => pontosPorPeriodo.get(periodo.id)?.media ?? null);
  const coberturas = dados.periodos.map((periodo) => pontosPorPeriodo.get(periodo.id)?.cobertura ?? null);
  const pontosComMedia = serie?.pontos.filter((ponto) => ponto.media !== null) ?? [];
  const variacao = pontosComMedia.length >= 2
    ? Number((Number(pontosComMedia.at(-1)!.media) - Number(pontosComMedia[0].media)).toFixed(1))
    : null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: "#fff" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1}><History size={20} /><Typography component="h2" variant="h6" fontWeight={800}>Evolução das competências</Typography></Stack>
          <Typography variant="body2" color="text.secondary">Compare aproveitamento e cobertura ao longo dos períodos em que a competência foi trabalhada.</Typography>
        </Box>
        {dados.series.length > 0 && (
          <TextField select size="small" label="Competência" value={serie?.id ?? ""} onChange={(evento) => setCompetenciaId(evento.target.value)} sx={{ minWidth: { xs: "100%", md: 300 } }}>
            {dados.series.map((item) => <MenuItem key={item.id} value={item.id}>{item.codigo} · {item.nome}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      {!dados.series.length ? (
        <Alert severity="info">O histórico será formado quando houver competências avaliadas nas disciplinas do aluno.</Alert>
      ) : serie && (
        <Stack gap={2}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip size="small" variant="outlined" label={`${dados.resumo.totalPeriodos} ${dados.resumo.totalPeriodos === 1 ? "período" : "períodos"}`} />
            <Chip size="small" variant="outlined" label={`${serie.pontos.length} ${serie.pontos.length === 1 ? "registro" : "registros"} da competência`} />
            {variacao !== null && (
              <Chip
                size="small"
                color={variacao > 0 ? "success" : variacao < 0 ? "warning" : "default"}
                icon={variacao >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                label={`${variacao > 0 ? "+" : ""}${percentual(variacao)} desde o primeiro resultado`}
              />
            )}
          </Stack>

          {dados.periodos.length < 2 && <Alert severity="info">Este é o primeiro período com dados para comparação. A linha de evolução será formada nos próximos períodos letivos.</Alert>}

          <Box sx={{ width: "100%", minHeight: 310 }}>
            <LineChart
              height={310}
              xAxis={[{ scaleType: "point", data: periodos, label: "Período letivo" }]}
              yAxis={[{ min: 0, max: 100, valueFormatter: (valor: number) => `${valor}%` }]}
              series={[
                { id: "aproveitamento", data: medias, label: "Aproveitamento", color: theme.palette.primary.main, connectNulls: false, valueFormatter: (valor) => percentual(valor) },
                { id: "cobertura", data: coberturas, label: "Cobertura", color: theme.palette.success.main, connectNulls: false, valueFormatter: (valor) => percentual(valor) },
              ]}
              grid={{ horizontal: true }}
              margin={{ left: 10, right: 20, top: 20, bottom: 10 }}
            />
          </Box>

          <Grid container spacing={1.25}>
            {serie.pontos.map((ponto) => (
              <Grid key={ponto.periodoId} size={{ xs: 12, sm: 6, lg: 4 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" gap={1}><Typography fontWeight={800}>{ponto.periodoCodigo}</Typography><Chip size="small" color={cor(ponto.classificacao)} label={rotulo(ponto.classificacao)} /></Stack>
                  <Stack direction="row" gap={2} mt={1}><Typography variant="body2"><strong>{percentual(ponto.media)}</strong> aproveitamento</Typography><Typography variant="body2"><strong>{percentual(ponto.cobertura)}</strong> cobertura</Typography></Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>{ponto.disciplinas.map((disciplina) => `${disciplina.codigo} · ${disciplina.nome}`).join("; ")}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary">A comparação utiliza os pontos avaliados em cada período. Mudanças de disciplina, peso ou cobertura permanecem visíveis e não são tratadas como equivalentes silenciosamente.</Typography>
        </Stack>
      )}
    </Paper>
  );
}
