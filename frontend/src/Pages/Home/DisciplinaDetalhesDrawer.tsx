import { Box, Button, Chip, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import {
  AvisoDetalhe,
  CORES_DASHBOARD,
  MetricaDetalhe,
  PainelDetalhe,
  SecaoDetalhe,
  SeloRisco,
  ESTADOS,
  sxBotaoPrimario,
  sxBotaoSecundario,
  sxCartaoDashboard,
} from "../../components/DashboardLayout";
import type { GravidadeAviso } from "../../components/DashboardLayout";
import type { ConsolidadoFrequencia } from "../../models/frequencia-model";
import type { ClassificacaoCompetenciaAluno, DesempenhoCompetenciaAluno, DisciplinaAluno, TarefaAluno, TipoTarefa } from "../../models/home-aluno-model";
import { SITUACAO_LABEL, type DisciplinaBoletim } from "../../models/nota-model";
import { formatarDataPtBr, formatarPontos, ROTULO_TIPO_AVALIACAO } from "../../utils/avaliacao";
import { prazoHumano } from "../Agenda/agenda-utils";
import { corFrequencia, corMedia, corTexto } from "./aluno/estilos-risco";
import { classificarRiscoDisciplina, fmtPct } from "./aluno/regras-dashboard-aluno";
import {
  calcularProjecaoFrequencia,
  calcularProjecaoNota,
  FREQUENCIA_MINIMA,
  META_PONTOS,
} from "./disciplina-detalhes-utils";

interface DisciplinaDetalhesDrawerProps {
  aberto: boolean;
  disciplina: DisciplinaAluno | null;
  boletim: DisciplinaBoletim | null;
  frequencia: ConsolidadoFrequencia | null;
  tarefas: TarefaAluno[];
  competencias: DesempenhoCompetenciaAluno[];
  onFechar: () => void;
  onAbrirBoletim: () => void;
  onAbrirFrequencia: () => void;
}

const numero = (valor: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
const rotuloCompetencia = (valor: ClassificacaoCompetenciaAluno) => ({ DADOS_INSUFICIENTES: "Dados insuficientes", DIFICULDADE: "Dificuldade", ATENCAO: "Atenção", ADEQUADO: "Adequado" })[valor];
const corCompetencia = (valor: ClassificacaoCompetenciaAluno): "default" | "error" | "warning" | "success" => valor === "DIFICULDADE" ? "error" : valor === "ATENCAO" ? "warning" : valor === "ADEQUADO" ? "success" : "default";

function ProjecaoNota({ boletim }: { boletim: DisciplinaBoletim | null }) {
  const projecao = calcularProjecaoNota(boletim);
  if (!boletim || !projecao) return <AvisoDetalhe gravidade="info">A projeção aparece depois da publicação das avaliações.</AvisoDetalhe>;
  if (projecao.situacao === "plano-incompleto") {
    return <AvisoDetalhe gravidade="info">O plano tem {formatarPontos(projecao.totalPlanejado)} de 100 pontos configurados. A projeção aparece quando o plano estiver completo.</AvisoDetalhe>;
  }
  if (projecao.situacao === "meta-atingida") {
    return <AvisoDetalhe gravidade="ok">Você já soma {formatarPontos(boletim.pontosObtidos)} e alcançou a meta regular de {META_PONTOS} pontos.</AvisoDetalhe>;
  }
  if (projecao.situacao === "recuperacao") {
    return <AvisoDetalhe gravidade="media">Faltam {formatarPontos(projecao.pontosParaMeta)}, mas não há pontos regulares suficientes pendentes. Acompanhe a recuperação no boletim.</AvisoDetalhe>;
  }
  return (
    <AvisoDetalhe gravidade="info">
      Para chegar a {META_PONTOS} pontos, faltam {formatarPontos(projecao.pontosParaMeta)} dos {formatarPontos(projecao.pontosDisponiveis)} ainda pendentes (aproveitamento de {fmtPct(projecao.percentualNecessario, 1)}).
    </AvisoDetalhe>
  );
}

function ProjecaoFrequencia({ frequencia }: { frequencia: ConsolidadoFrequencia | null }) {
  const projecao = frequencia ? calcularProjecaoFrequencia(frequencia.presencas, frequencia.faltas) : null;
  if (!frequencia || !projecao) return <AvisoDetalhe gravidade="info">A projeção aparece depois das primeiras chamadas.</AvisoDetalhe>;
  if (projecao.presencasParaRecuperar > 0) {
    return <AvisoDetalhe gravidade="alta">São necessárias {projecao.presencasParaRecuperar} presenças seguidas para voltar a {FREQUENCIA_MINIMA}%, considerando os registros atuais.</AvisoDetalhe>;
  }
  if (projecao.margemFaltas === 0) {
    return <AvisoDetalhe gravidade="media">Uma nova falta deixa a frequência abaixo de 75%, considerando os registros atuais.</AvisoDetalhe>;
  }
  return <AvisoDetalhe gravidade="ok">Margem atual: {projecao.margemFaltas} {projecao.margemFaltas === 1 ? "falta" : "faltas"} sem ficar abaixo de 75%.</AvisoDetalhe>;
}

export default function DisciplinaDetalhesDrawer({
  aberto,
  disciplina,
  boletim,
  frequencia,
  tarefas,
  competencias,
  onFechar,
  onAbrirBoletim,
  onAbrirFrequencia,
}: DisciplinaDetalhesDrawerProps) {
  if (!disciplina) return null;

  const media = boletim?.mediaFinal ?? boletim?.mediaParcial ?? null;
  // Mesmo cálculo do dashboard: presenças ÷ (presenças + faltas).
  const registradas = (frequencia?.presencas ?? 0) + (frequencia?.faltas ?? 0);
  const percentualFrequencia = registradas > 0 ? Math.round(((frequencia?.presencas ?? 0) / registradas) * 1000) / 10 : null;
  const risco = classificarRiscoDisciplina(media, percentualFrequencia);
  const avaliacoesPublicadas = boletim?.avaliacoes.filter((item) => item.lancada).length ?? 0;
  const totalAvaliacoes = boletim?.avaliacoes.length ?? 0;
  const proximas = tarefas
    .filter((item) => item.turmaDisciplinaId === disciplina.turmaDisciplinaId)
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
    .slice(0, 3);

  const gravidadeSituacao: GravidadeAviso = risco.nivel === "alto" ? "alta" : risco.nivel === "medio" ? "media" : risco.nivel === "sem-dados" ? "info" : "ok";
  const mensagemSituacao =
    risco.nivel === "alto" ? "Frequência abaixo do mínimo de 75%. Priorize as próximas aulas e acompanhe os registros."
      : media !== null && media < META_PONTOS ? "Média parcial abaixo da referência de 60%. Confira os pontos restantes e as próximas avaliações."
        : risco.nivel === "medio" ? "Frequência próxima do mínimo de 75%. Evite novas faltas."
          : risco.nivel === "sem-dados" ? "Ainda não há lançamentos suficientes para avaliar esta disciplina."
            : "Os indicadores estão dentro das metas.";

  return (
    <PainelDetalhe
      aberto={aberto}
      onFechar={onFechar}
      icone={BookOpen}
      titulo={disciplina.nome}
      subtitulo={`${disciplina.codigo} · ${disciplina.turmaSigla}`}
      contexto={`Professor(a): ${disciplina.professorNome} · Carga horária: ${disciplina.cargaHoraria}h`}
      selo={<SeloRisco nivel={risco.nivel} titulo={risco.motivos.join(" · ")} />}
      rotuloFechar="Fechar detalhes da disciplina"
      acoes={(
        <>
          <Button endIcon={<ArrowRight size={15} />} onClick={onAbrirBoletim} sx={{ ...sxBotaoPrimario, height: 36, px: 2 }}>
            Abrir boletim completo
          </Button>
          <Button endIcon={<ArrowRight size={15} />} onClick={onAbrirFrequencia} sx={{ ...sxBotaoSecundario, height: 36, px: 2 }}>
            Ver frequência
          </Button>
        </>
      )}
    >
      <AvisoDetalhe gravidade={gravidadeSituacao}>{mensagemSituacao}</AvisoDetalhe>

      <Grid container spacing={1.25}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <MetricaDetalhe titulo="Média atual" valor={fmtPct(media, 1)} apoio="referência de 60%" cor={corTexto(corMedia(media))} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <MetricaDetalhe titulo="Frequência" valor={fmtPct(percentualFrequencia, 1)} apoio="mínimo de 75%" cor={corTexto(corFrequencia(percentualFrequencia))} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <MetricaDetalhe titulo="Notas lançadas" valor={totalAvaliacoes ? `${avaliacoesPublicadas}/${totalAvaliacoes}` : "—"} apoio="avaliações com nota" />
        </Grid>
      </Grid>

      <SecaoDetalhe titulo="Caminho até a média">
        <ProjecaoNota boletim={boletim} />
      </SecaoDetalhe>

      <SecaoDetalhe titulo="Desempenho por competência">
        {competencias.length ? (
          <Stack gap={1}>
            {competencias.map((competencia) => (
              <Box key={competencia.id} sx={{ ...sxCartaoDashboard, p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box minWidth={0}>
                    <Typography variant="body2" fontWeight={700}>{competencia.codigo} · {competencia.nome}</Typography>
                    <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>Nível esperado: {competencia.nivelEsperado.toLowerCase()}</Typography>
                  </Box>
                  <Chip size="small" color={corCompetencia(competencia.classificacao)} label={rotuloCompetencia(competencia.classificacao)} />
                </Stack>
                <Grid container spacing={1.5} mt={.25}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Aproveitamento</Typography><Typography variant="caption" fontWeight={700}>{fmtPct(competencia.media, 1)}</Typography></Stack>
                    <LinearProgress variant="determinate" value={competencia.media ?? 0} color={competencia.classificacao === "DIFICULDADE" ? "error" : competencia.classificacao === "ATENCAO" ? "warning" : "primary"} sx={{ mt: .5, height: 5, borderRadius: 5 }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Stack direction="row" justifyContent="space-between"><Typography variant="caption">Cobertura</Typography><Typography variant="caption" fontWeight={700}>{fmtPct(competencia.cobertura, 1)}</Typography></Stack>
                    <LinearProgress variant="determinate" value={competencia.cobertura} color={competencia.cobertura < 50 ? "warning" : "success"} sx={{ mt: .5, height: 5, borderRadius: 5 }} />
                  </Grid>
                </Grid>
                <Typography variant="caption" display="block" mt={1} sx={{ color: CORES_DASHBOARD.textoApagado }}>{competencia.fontes.length ? `${competencia.fontes.length} ${competencia.fontes.length === 1 ? "avaliação mapeada" : "avaliações mapeadas"}` : "Nenhuma avaliação mapeada"}</Typography>
              </Box>
            ))}
          </Stack>
        ) : <AvisoDetalhe gravidade="info">Nenhuma competência vinculada a esta disciplina.</AvisoDetalhe>}
      </SecaoDetalhe>

      <SecaoDetalhe
        titulo="Notas por avaliação"
        extra={boletim ? <Typography variant="caption" fontWeight={700} sx={{ color: CORES_DASHBOARD.textoSuave }}>{SITUACAO_LABEL[boletim.situacao]}</Typography> : undefined}
      >
        <Box sx={{ ...sxCartaoDashboard, overflow: "hidden" }}>
          {boletim?.avaliacoes.length ? (
            <Stack divider={<Box sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }} />}>
              {boletim.avaliacoes.map((avaliacao) => {
                const desempenho = avaliacao.valorObtido === null ? null : (avaliacao.valorObtido / avaliacao.valorMaximo) * 100;
                return (
                  <Box key={avaliacao.id} px={1.75} py={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                      <Box minWidth={0}>
                        <Typography variant="body2" fontWeight={700}>{avaliacao.descricao || ROTULO_TIPO_AVALIACAO[avaliacao.tipo]}</Typography>
                        <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
                          {ROTULO_TIPO_AVALIACAO[avaliacao.tipo]}{avaliacao.dataDevolucao ? ` · devolução ${formatarDataPtBr(avaliacao.dataDevolucao).slice(0, 5)}` : ""}
                        </Typography>
                      </Box>
                      <Box textAlign="right" flexShrink={0}>
                        <Typography variant="body2" fontWeight={700}>
                          {avaliacao.lancada ? `${numero(avaliacao.valorObtido ?? 0)} / ${numero(avaliacao.valorMaximo)}` : "Nota não lançada"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
                          {avaliacao.lancada ? `${fmtPct(desempenho, 1)} de aproveitamento` : `${formatarPontos(avaliacao.valorMaximo)} possíveis`}
                        </Typography>
                      </Box>
                    </Stack>
                    {desempenho !== null && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(desempenho, 100)}
                        aria-label={`Aproveitamento de ${avaliacao.descricao ?? avaliacao.tipo}`}
                        sx={{ mt: 1, height: 4, borderRadius: 4, bgcolor: ESTADOS.neutro.fundo, "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: desempenho < META_PONTOS ? ESTADOS.atencao.ponto : CORES_DASHBOARD.acento } }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2" p={2} sx={{ color: CORES_DASHBOARD.textoApagado }}>Nenhuma avaliação cadastrada.</Typography>
          )}
        </Box>
      </SecaoDetalhe>

      <SecaoDetalhe
        titulo="Frequência e margem atual"
        extra={frequencia ? (
          <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoSuave }}>
            {frequencia.presencas} presenças · {frequencia.faltas} faltas · {frequencia.totalAulas} aulas
          </Typography>
        ) : undefined}
      >
        <ProjecaoFrequencia frequencia={frequencia} />
        <Typography variant="caption" display="block" mt={0.75} sx={{ color: CORES_DASHBOARD.textoApagado }}>
          Estimativa com base nas aulas já registradas.
        </Typography>
      </SecaoDetalhe>

      <SecaoDetalhe titulo="Próximas avaliações">
        {proximas.length ? (
          <Box sx={{ ...sxCartaoDashboard, overflow: "hidden" }}>
            <Stack divider={<Box sx={{ borderTop: `1px solid ${CORES_DASHBOARD.borda}` }} />}>
              {proximas.map((tarefa) => (
                <Stack key={tarefa.avaliacaoId} direction="row" gap={1.25} alignItems="center" px={1.75} py={1.25}>
                  <Box aria-hidden="true" sx={{ width: 32, height: 32, borderRadius: 1.5, flexShrink: 0, display: "grid", placeItems: "center", bgcolor: CORES_DASHBOARD.acentoSuave, color: CORES_DASHBOARD.acento }}>
                    <CalendarDays size={16} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={700} noWrap>{tarefa.titulo}</Typography>
                    <Typography variant="caption" sx={{ color: CORES_DASHBOARD.textoApagado }}>
                      {ROTULO_TIPO_AVALIACAO[tarefa.tipo as TipoTarefa]} · {prazoHumano(tarefa.dataVencimento)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700} flexShrink={0}>{formatarPontos(tarefa.valor)}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : (
          <AvisoDetalhe gravidade="ok">Nenhuma avaliação futura publicada.</AvisoDetalhe>
        )}
      </SecaoDetalhe>
    </PainelDetalhe>
  );
}
